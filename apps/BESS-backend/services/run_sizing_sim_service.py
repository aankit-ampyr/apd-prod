import io
import csv
from typing import List, Optional
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy import desc, not_, select
from sqlalchemy.ext.asyncio import AsyncSession

from constants.enums import SimulationJobStatus, SimulationStatus

from dtos.simulation_dto import (
    SimulationProgress,
    SimulationResult as SimulationResultDTO,
    SizingSimulationResponse,
)
from models.simulation_model import (
    Simulation,
    SimulationJob,
    SimulationResult,
    SimulationDebug,
)
from simulation_engine.utils import stop_simulation as stop_sim_util
from utils.log_utils import audit_logs
from utils.response_utils import Res
from python_common.utils.common_utils import paginate  # type: ignore
from python_common.constants.enums import AuditLogModules, AuditLogScenario  # type: ignore
from simulation_engine import bess_sizing_sim_task
from .service_support import ensure_simulation_write_access


class RunSizingSimulationService:
    async def _generate_sim_result_csv(
        self,
        simulation_job_id: int,
        bess_db: AsyncSession,
        yield_per: int = 1000,
        dg_capacity: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        delivery_percentage: Optional[float] = None,
        dg_runtime_hours: Optional[float] = None,
        sort: Optional[List[str]] = None,
    ):
        """
        Fetches DB rows in chunks and yields them as CSV strings.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "BESS (MWh)",
            "Duration (hr)",
            "Power (MW)",
            "Containers",
            "DG (MW)",
            "Delivery %",
            "Green %",
            "Wastage %",
            "Delivery Hrs",
            "Load Hrs",
            "Green Hrs",
            "DG Hrs",
            "DG Starts",
            "BESS Cycles",
            "Unserved (MWh)",
            "Fuel (L)",
        ]
        writer.writerow(headers)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        stmt = (
            select(
                SimulationResult.bess_mwh,
                SimulationResult.duration_hr,
                SimulationResult.power_mw,
                SimulationResult.containers,
                SimulationResult.dg_mw,
                SimulationResult.delivery_pct,
                SimulationResult.green_pct,
                SimulationResult.wastage_pct,
                SimulationResult.delivery_hours,
                SimulationResult.load_hours,
                SimulationResult.green_hours,
                SimulationResult.dg_hours,
                SimulationResult.dg_starts,
                SimulationResult.bess_cycles,
                SimulationResult.unserved_mwh,
                SimulationResult.fuel_consumption_l,
            )
            .where(SimulationResult.job_id == simulation_job_id)
            .execution_options(yield_per=yield_per)
        )

        # Filters
        if dg_capacity is not None:
            stmt = stmt.where(SimulationResult.dg_mw.in_(dg_capacity))
        if bess_capacity is not None:
            stmt = stmt.where(SimulationResult.bess_mwh.in_(bess_capacity))
        if duration_hr is not None:
            stmt = stmt.where(SimulationResult.duration_hr.in_(duration_hr))
        if delivery_percentage is not None:
            stmt = stmt.where(SimulationResult.delivery_pct == delivery_percentage)
        if dg_runtime_hours is not None:
            stmt = stmt.where(SimulationResult.dg_hours == dg_runtime_hours)

        # Sorting
        sort_map = {
            "bess_mwh": SimulationResult.bess_mwh,
            "duration_hr": SimulationResult.duration_hr,
            "power_mw": SimulationResult.power_mw,
            "containers": SimulationResult.containers,
            "dg_mw": SimulationResult.dg_mw,
            "delivery_percentage": SimulationResult.delivery_pct,
            "green_percentage": SimulationResult.green_pct,
            "wastage_percentage": SimulationResult.wastage_pct,
            "delivery_hrs": SimulationResult.delivery_hours,
            "load_hrs": SimulationResult.load_hours,
            "green_hrs": SimulationResult.green_hours,
            "dg_hrs": SimulationResult.dg_hours,
            "dg_starts": SimulationResult.dg_starts,
            "bess_cycles": SimulationResult.bess_cycles,
            "unserved_mwh": SimulationResult.unserved_mwh,
            "fuel_l": SimulationResult.fuel_consumption_l,
        }

        if sort:
            order_by = []
            for s in sort:
                if s.startswith("-"):
                    field = s[1:]
                    direction = "desc"
                else:
                    field = s
                    direction = "asc"

                if field in sort_map:
                    col = sort_map[field]
                    order_by.append(col.desc() if direction == "desc" else col.asc())
            if order_by:
                stmt = stmt.order_by(*order_by)

        result = await bess_db.stream(stmt)

        async for db_batch in result.partitions():
            for row in db_batch:
                writer.writerow(row)

            # Yield the chunk of CSV text to FastAPI
            yield output.getvalue()

            output.seek(0)
            output.truncate(0)

    async def run_sizing_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
    ):
        simulation, auth_error = await ensure_simulation_write_access(
            db=bess_db, simulation_id=simulation_id, current_user=current_user
        )
        if auth_error:
            return auth_error

        result = await bess_db.execute(
            select(Simulation).where(Simulation.id == simulation_id).with_for_update()
        )
        simulation = result.scalar_one_or_none()
        
        if not simulation:
            return Res.error(status_code="E-20043", message="Simulation not found")

        # WARNING: Uncomment it once the progress status update is implemented after step 3.
        # if simulation.step < SimulationSetupProgress.BESS_DG_CONFIG:
        #     return Res.error()

        sim_job_result = await bess_db.execute(
            select(SimulationJob).where(
                SimulationJob.simulation_id == simulation.id,
            )
        )

        all_jobs = sim_job_result.scalars().all()

        active_job = next((j for j in all_jobs if not j.is_fallback), None)
        deprecated_jobs = [j for j in all_jobs if j.is_fallback]

        before_config = None
        log_action = AuditLogScenario.SIZING_SIMULATION_RAN.value

        if active_job:
            if active_job.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-20047",
                    message="Results for this configuration are already available.",
                )
            before_config = (
                f"Simulation Status : {SimulationJobStatus(active_job.status).name}"
            )

            active_job.is_fallback = True

        for old_job in deprecated_jobs:
            await bess_db.delete(old_job)

        if active_job or deprecated_jobs:
            log_action = AuditLogScenario.SIZING_SIMULATION_RERAN.value
            await bess_db.flush()

        new_simulation_job = SimulationJob(
            simulation_id=simulation.id,
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=AuditLogModules.SIMULATION.value,
            action=log_action,
            resource_id=resource_id,
            before=before_config,
            after=f"Simulation Status: {SimulationJobStatus.IN_PROGRESS.name}",
        )

        await bess_db.commit()
        await bess_db.refresh(new_simulation_job)

        await bess_sizing_sim_task.kiq(simulation.id, job_id=new_simulation_job.job_id)

        return Res.success(
            status_code="S-20033", data={"simulation_job_id": new_simulation_job.job_id}
        )

    async def stop_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        redis: Redis,
        current_user: dict,
        resource_id: str,
    ):
        simulation, auth_error = await ensure_simulation_write_access(
            db=bess_db, simulation_id=simulation_id, current_user=current_user
        )
        if auth_error:
            return auth_error


        result = await bess_db.execute(
            select(SimulationJob)
            .where(
                SimulationJob.simulation_id == simulation_id,
                not_(SimulationJob.is_fallback),
            )
            .order_by(desc(SimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(status_code="E-20047", message="Simulation job not found")

        if simulation_job.status not in [
            SimulationJobStatus.INITIATED,
            SimulationJobStatus.IN_PROGRESS,
        ]:
            return Res.error(
                status_code="E-20048", message="Simulation is not in a running state."
            )

        await stop_sim_util(job_id=simulation_job.job_id, redis_client=redis)

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=AuditLogModules.SIMULATION.value,
            action=AuditLogScenario.SIZING_SIMULATION_STOPED.value,
            resource_id=resource_id,
            before=f"Simulation Status: {SimulationJobStatus(simulation_job.status).name}",
            after=f"Simulation Status: {SimulationJobStatus.TERMINATED.name}",
        )

        await bess_db.commit()

        return Res.success(
            status_code="S-20035", data={"simulation_job_id": simulation_job.job_id}
        )

    async def get_simulation_progress(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(SimulationJob)
            .where(
                SimulationJob.simulation_id == simulation_id,
                not_(SimulationJob.is_fallback),
            )
            .order_by(desc(SimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(status_code="E-20047", message="Simulation job not found.")

        progress_percentage = 0.0
        if simulation_job.max_iterations:
            progress_percentage = (
                simulation_job.completed_iterations / simulation_job.max_iterations
            ) * 100

        data = SimulationProgress(
            simulation_job_id=simulation_job.job_id,
            current_config=simulation_job.completed_iterations,
            total_config=simulation_job.max_iterations,
            progress_percentage=progress_percentage,
            status=SimulationJobStatus(simulation_job.status),
        )

        return Res.success(status_code="S-20034", data=data.model_dump(mode="json"))

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        page: int = 1,
        limit: int = 100,
        dg_capacity: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        delivery_percentage: Optional[float] = None,
        dg_runtime_hours: Optional[float] = None,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(SimulationJob)
            .where(
                SimulationJob.simulation_id == simulation_id,
                not_(SimulationJob.is_fallback),
                SimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(SimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20046", message="Sizing simulation result not found."
            )

        query = select(SimulationResult).where(
            SimulationResult.job_id == simulation_job.id
        )

        # Filters
        if dg_capacity is not None:
            query = query.where(SimulationResult.dg_mw.in_(dg_capacity))
        if bess_capacity is not None:
            query = query.where(SimulationResult.bess_mwh.in_(bess_capacity))
        if duration_hr is not None:
            query = query.where(SimulationResult.duration_hr.in_(duration_hr))
        if delivery_percentage is not None:
            query = query.where(SimulationResult.delivery_pct == delivery_percentage)
        if dg_runtime_hours is not None:
            query = query.where(SimulationResult.dg_hours == dg_runtime_hours)

        # Sorting
        order_by = []
        sort_map = {
            "bess_mwh": SimulationResult.bess_mwh,
            "duration_hr": SimulationResult.duration_hr,
            "power_mw": SimulationResult.power_mw,
            "containers": SimulationResult.containers,
            "dg_mw": SimulationResult.dg_mw,
            "delivery_percentage": SimulationResult.delivery_pct,
            "green_percentage": SimulationResult.green_pct,
            "wastage_percentage": SimulationResult.wastage_pct,
            "delivery_hrs": SimulationResult.delivery_hours,
            "load_hrs": SimulationResult.load_hours,
            "green_hrs": SimulationResult.green_hours,
            "dg_hrs": SimulationResult.dg_hours,
            "dg_starts": SimulationResult.dg_starts,
            "bess_cycles": SimulationResult.bess_cycles,
            "unserved_mwh": SimulationResult.unserved_mwh,
            "fuel_l": SimulationResult.fuel_consumption_l,
        }

        if sort:
            for s in sort:
                if s.startswith("-"):
                    field = s[1:]
                    direction = "desc"
                else:
                    field = s
                    direction = "asc"

                if field in sort_map:
                    col = sort_map[field]
                    order_by.append(col.desc() if direction == "desc" else col.asc())

        # Paginate
        pagination = await paginate(
            db=bess_db, base_query=query, page=page, limit=limit, order_by=order_by
        )

        if page == 1:
            await audit_logs(
                db=bess_db,
                user_id=f"USER-{current_user.get('id')}",
                user_role=current_user.get("role"),  # type: ignore
                module=AuditLogModules.SIMULATION.value,
                action=AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED.value,
                resource_id=resource_id,
                before=None,
                after="Action: Results Viewed",
            )

            await bess_db.commit()

        results = [
            SimulationResultDTO(
                bess_mwh=row.bess_mwh,
                duration_hr=row.duration_hr,
                power_mw=row.power_mw,
                containers=row.containers,
                dg_mw=row.dg_mw,
                delivery_percentage=row.delivery_pct,
                green_percentage=row.green_pct,
                wastage_percentage=row.wastage_pct,
                delivery_hrs=row.delivery_hours,
                load_hrs=row.load_hours,
                green_hrs=row.green_hours,
                dg_hrs=row.dg_hours,
                dg_starts=row.dg_starts,
                bess_cycles=row.bess_cycles,
                unserved_mwh=row.unserved_mwh,
                fuel_l=row.fuel_consumption_l,
            )
            for row in pagination.records
        ]

        data = SizingSimulationResponse(
            simulation_id=simulation_id,
            results=results,
            total_configs=pagination.total_results,
            total_pages=pagination.total_pages,
            current_page=pagination.current_page,
            next_page=pagination.next_page,
        )

        return Res.success(status_code="S-20032", data=data.model_dump(mode="json"))

    async def export_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        dg_capacity: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        delivery_percentage: Optional[float] = None,
        dg_runtime_hours: Optional[float] = None,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(SimulationJob)
            .where(
                SimulationJob.simulation_id == simulation_id,
                not_(SimulationJob.is_fallback),
                SimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(SimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20046", message="Sizing simulation result not found."
            )

        return StreamingResponse(
            self._generate_sim_result_csv(
                simulation_job_id=simulation_job.id,
                bess_db=bess_db,
                dg_capacity=dg_capacity,
                bess_capacity=bess_capacity,
                duration_hr=duration_hr,
                delivery_percentage=delivery_percentage,
                dg_runtime_hours=dg_runtime_hours,
                sort=sort,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="bess_sim_{simulation_id}.csv"'
            },
        )

    async def _generate_simulation_debug_csv(
        self,
        simulation_job_id: int,
        bess_db: AsyncSession,
        yield_per: int = 1000,
    ):
        """
        Generates CSV for Simulation Debug logs.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Day",
            "Daily Cycles",
            "Hourly Cycle",
            "BESS Disabled",
            "Current SOC",
            "Total Discharge (MWh)",
            "DG Running",
            "DG Starts",
            "Unserved (MWh)",
            "Load (MWh)",
            "Solar (MWh)",
            "Fuel Consumption (L)",
            "DG Generation (MW)",
        ]
        writer.writerow(headers)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        stmt = (
            select(
                SimulationDebug.current_day,
                SimulationDebug.daily_cycles,
                SimulationDebug.hourly_cycle,
                SimulationDebug.bess_disabled,
                SimulationDebug.current_soc,
                SimulationDebug.total_bess_discharge_mwh,
                SimulationDebug.is_dg_running,
                SimulationDebug.dg_start_count,
                SimulationDebug.unserved_mwh,
                SimulationDebug.load,
                SimulationDebug.solar_generation,
                SimulationDebug.fuel_consumption_l,
                SimulationDebug.dg_generation_mw,
            )
            .where(SimulationDebug.job_id == simulation_job_id)
            .order_by(SimulationDebug.id.asc())
            .execution_options(yield_per=yield_per)
        )

        result = await bess_db.stream(stmt)

        async for db_batch in result.partitions():
            for row in db_batch:
                writer.writerow(row)

            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    async def export_simulation_debug(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
    ):
        result = await bess_db.execute(
            select(SimulationJob)
            .where(
                SimulationJob.simulation_id == simulation_id,
                not_(SimulationJob.is_fallback),
                SimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(SimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20046", message="Sizing simulation result not found."
            )

        return StreamingResponse(
            self._generate_simulation_debug_csv(
                simulation_job_id=simulation_job.job_id,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="sim_debug_sim_{simulation_id}.csv"'
            },
        )
