import io
import csv
from typing import List, Optional
from fastapi import status
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from constants.enums import (
    PSPAuditLogModules,
    PSPAuditLogScenario,
    SimulationJobStatus,
    SimulationSetupProgress,
    SimulationStatus,
)

from dtos.simulation_dto import (
    SimulationProgress,
    GreenResult,
    GreenResultResponse,
)
from models.simulation_model import (
    GreenEnergyAnalysisConfiguration,
    GreenSizingSimulationJob,
    Simulation,
    GreenEnergySizingSimulationResult,
)
from simulation_engine.tasks import green_year_sizing_simulation
from simulation_engine.utils import stop_simulation as stop_sim_util
from utils.log_utils import audit_logs
from utils.response_utils import Res
from python_common.utils.common_utils import paginate  # type: ignore


class RunGreenEnergySimulationService:
    async def _generate_sim_result_csv(
        self,
        simulation_id: int,
        simulation_job_id: int,
        bess_db: AsyncSession,
        yield_per: int = 1000,
        solar_capacity: Optional[List[float]] = None,
        dg_capacity: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        viable_only: bool = False,
        delivery_100_only: bool = False,
        zero_dg_hours_only: bool = False,
        sort: Optional[List[str]] = None,
    ):
        """
        Fetches DB rows in chunks and yields them as CSV strings.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Solar (MWp)",
            "BESS (MWh)",
            "Duration (hr)",
            "Power (MW)",
            "Containers",
            "DG (MW)",
            "Delivery %",
            "Green Hours %",
            "Green Energy %",
            "Green Hours (Mar-Oct) %",
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
                GreenEnergySizingSimulationResult.solar_mwp,
                GreenEnergySizingSimulationResult.bess_mwh,
                GreenEnergySizingSimulationResult.duration_hr,
                GreenEnergySizingSimulationResult.power_mw,
                GreenEnergySizingSimulationResult.containers,
                GreenEnergySizingSimulationResult.dg_mw,
                GreenEnergySizingSimulationResult.delivery_pct,
                GreenEnergySizingSimulationResult.green_pct,
                GreenEnergySizingSimulationResult.green_energy_pct,
                GreenEnergySizingSimulationResult.green_hours_mar_oct_pct,
                GreenEnergySizingSimulationResult.wastage_pct,
                GreenEnergySizingSimulationResult.delivery_hours,
                GreenEnergySizingSimulationResult.load_hours,
                GreenEnergySizingSimulationResult.green_hours,
                GreenEnergySizingSimulationResult.dg_hours,
                GreenEnergySizingSimulationResult.dg_starts,
                GreenEnergySizingSimulationResult.bess_cycles,
                GreenEnergySizingSimulationResult.unserved_mwh,
                GreenEnergySizingSimulationResult.fuel_consumption_l,
            )
            .where(GreenEnergySizingSimulationResult.job_id == simulation_job_id)
            .execution_options(yield_per=yield_per)
        )

        # Filters
        if solar_capacity is not None:
            stmt = stmt.where(
                GreenEnergySizingSimulationResult.solar_mwp.in_(solar_capacity)
            )
        if dg_capacity is not None:
            stmt = stmt.where(GreenEnergySizingSimulationResult.dg_mw.in_(dg_capacity))
        if bess_capacity is not None:
            stmt = stmt.where(
                GreenEnergySizingSimulationResult.bess_mwh.in_(bess_capacity)
            )
        if duration_hr is not None:
            stmt = stmt.where(
                GreenEnergySizingSimulationResult.duration_hr.in_(duration_hr)
            )
        if delivery_100_only:
            stmt = stmt.where(GreenEnergySizingSimulationResult.delivery_pct == 100)
        if zero_dg_hours_only:
            stmt = stmt.where(GreenEnergySizingSimulationResult.dg_hours == 0)

        if viable_only:
            config_result = await bess_db.execute(
                select(GreenEnergyAnalysisConfiguration).where(
                    GreenEnergyAnalysisConfiguration.simulation_id == simulation_id
                )
            )
            green_config = config_result.scalar_one_or_none()
            if green_config:
                stmt = stmt.where(
                    GreenEnergySizingSimulationResult.green_energy_pct
                    >= green_config.min_green_energy
                )
                if green_config.max_wastage:
                    stmt = stmt.where(
                        GreenEnergySizingSimulationResult.wastage_pct
                        <= green_config.max_wastage
                    )

        # Sorting
        sort_map = {
            "solar_mwp": GreenEnergySizingSimulationResult.solar_mwp,
            "bess_mwh": GreenEnergySizingSimulationResult.bess_mwh,
            "duration_hr": GreenEnergySizingSimulationResult.duration_hr,
            "power_mw": GreenEnergySizingSimulationResult.power_mw,
            "containers": GreenEnergySizingSimulationResult.containers,
            "dg_mw": GreenEnergySizingSimulationResult.dg_mw,
            "delivery_percentage": GreenEnergySizingSimulationResult.delivery_pct,
            "green_percentage": GreenEnergySizingSimulationResult.green_pct,
            "green_energy_percentage": GreenEnergySizingSimulationResult.green_energy_pct,
            "green_hours_mar_oct_percentage": GreenEnergySizingSimulationResult.green_hours_mar_oct_pct,
            "wastage_percentage": GreenEnergySizingSimulationResult.wastage_pct,
            "delivery_hrs": GreenEnergySizingSimulationResult.delivery_hours,
            "load_hrs": GreenEnergySizingSimulationResult.load_hours,
            "green_hrs": GreenEnergySizingSimulationResult.green_hours,
            "dg_hrs": GreenEnergySizingSimulationResult.dg_hours,
            "dg_starts": GreenEnergySizingSimulationResult.dg_starts,
            "bess_cycles": GreenEnergySizingSimulationResult.bess_cycles,
            "unserved_mwh": GreenEnergySizingSimulationResult.unserved_mwh,
            "fuel_l": GreenEnergySizingSimulationResult.fuel_consumption_l,
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
        result = await bess_db.execute(
            select(Simulation).where(Simulation.id == simulation_id).with_for_update()
        )
        simulation = result.scalar_one_or_none()

        if not simulation:
            return Res.error(
                status_code="E-20043",
                message="Simulation not found",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        if simulation.step < SimulationSetupProgress.MULTI_YEAR_PROJECTION_CONFIG:
            return Res.error(
                message="Incomplete Simulation",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        green_sim_result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation.id,
            )
        )

        green_sim_job = green_sim_result.scalar_one_or_none()

        before_config = None
        log_action = PSPAuditLogScenario.GREEN_ENERGY_SIMULATION_RUN.value

        if green_sim_job:
            if green_sim_job.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-20058",
                    message="Results for this configuration are already available.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if (
                green_sim_job.status == SimulationJobStatus.INITIATED
                or green_sim_job.status == SimulationJobStatus.IN_PROGRESS
            ):
                return Res.error(
                    status_code="E-20058",
                    message="Simulation is already running.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            await bess_db.delete(green_sim_job)
            await bess_db.flush()

            log_action = PSPAuditLogScenario.GREEN_ENERGY_SIMULATION_RERUN.value
            before_config = (
                f"Simulation Status: {SimulationJobStatus(green_sim_job.status).name}"
            )

        new_simulation_job = GreenSizingSimulationJob(
            simulation_id=simulation.id,
        )

        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        print("logging run green simulaton")
        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=log_action,
            resource_id=resource_id,
            before=before_config,
            after=f"Simulation Status: {SimulationJobStatus.IN_PROGRESS.name}",
        )

        await bess_db.commit()
        await bess_db.refresh(new_simulation_job)

        await green_year_sizing_simulation.kiq(
            simulation_id=simulation.id, job_id=new_simulation_job.job_id
        )

        return Res.success(
            status_code="S-20048",
            data={"simulation_job_id": new_simulation_job.job_id},
            http_status_code=status.HTTP_200_OK,
        )

    async def stop_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        redis: Redis,
        current_user: dict,
        resource_id: str,
    ):
        result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20047",
                message="Simulation job not found",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        if simulation_job.status not in [
            SimulationJobStatus.INITIATED,
            SimulationJobStatus.IN_PROGRESS,
        ]:
            return Res.error(
                status_code="E-20048",
                message="Simulation is not in a running state.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        await stop_sim_util(job_id=simulation_job.job_id, redis_client=redis)

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.GREEN_ENERGY_SIMULATION_STOP.value,
            resource_id=resource_id,
            before=f"Simulation Status: {SimulationJobStatus(simulation_job.status).name}",
            after=f"Simulation Status: {SimulationJobStatus.TERMINATED.name}",
        )
        await bess_db.commit()

        return Res.success(
            status_code="S-20049",
            data={"simulation_job_id": simulation_job.job_id},
            http_status_code=status.HTTP_200_OK,
        )

    async def get_simulation_progress(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20047",
                message="Simulation job not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

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

        return Res.success(
            status_code="S-20034",
            data=data.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        page: int = 1,
        limit: int = 100,
        solar_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        dg_capacity: Optional[List[float]] = None,
        viable_only: bool = False,
        delivery_100_only: bool = False,
        zero_dg_hours_only: bool = False,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation_id,
                GreenSizingSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20046",
                message="Green energy simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        result = await bess_db.execute(
            select(GreenEnergyAnalysisConfiguration).where(
                GreenEnergyAnalysisConfiguration.simulation_id == simulation_id
            )
        )
        green_config = result.scalar_one_or_none()
        if not green_config:
            return Res.error(
                status_code="E-20055",
                message="Green energy analysis configuration not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        query = select(GreenEnergySizingSimulationResult).where(
            GreenEnergySizingSimulationResult.job_id == simulation_job.id
        )

        # Filters
        if solar_capacity is not None:
            query = query.where(
                GreenEnergySizingSimulationResult.solar_mwp.in_(solar_capacity)
            )
        if dg_capacity is not None:
            query = query.where(
                GreenEnergySizingSimulationResult.dg_mw.in_(dg_capacity)
            )
        if bess_capacity is not None:
            query = query.where(
                GreenEnergySizingSimulationResult.bess_mwh.in_(bess_capacity)
            )
        if duration_hr is not None:
            query = query.where(
                GreenEnergySizingSimulationResult.duration_hr.in_(duration_hr)
            )
        if delivery_100_only:
            query = query.where(GreenEnergySizingSimulationResult.delivery_pct == 100)
        if zero_dg_hours_only:
            query = query.where(GreenEnergySizingSimulationResult.dg_hours == 0)

        if viable_only:
            query = query.where(
                GreenEnergySizingSimulationResult.green_pct
                >= green_config.min_green_energy
            )
            if green_config.max_wastage:
                query = query.where(
                    GreenEnergySizingSimulationResult.wastage_pct
                    <= green_config.max_wastage
                )

        # Sorting
        order_by = []
        sort_map = {
            "solar_mwp": GreenEnergySizingSimulationResult.solar_mwp,
            "bess_mwh": GreenEnergySizingSimulationResult.bess_mwh,
            "duration_hr": GreenEnergySizingSimulationResult.duration_hr,
            "power_mw": GreenEnergySizingSimulationResult.power_mw,
            "containers": GreenEnergySizingSimulationResult.containers,
            "dg_mw": GreenEnergySizingSimulationResult.dg_mw,
            "delivery_pct": GreenEnergySizingSimulationResult.delivery_pct,
            "green_pct": GreenEnergySizingSimulationResult.green_pct,
            "green_energy_pct": GreenEnergySizingSimulationResult.green_energy_pct,
            "green_hours_mar_oct_pct": GreenEnergySizingSimulationResult.green_hours_mar_oct_pct,
            "wastage_pct": GreenEnergySizingSimulationResult.wastage_pct,
            "delivery_hours": GreenEnergySizingSimulationResult.delivery_hours,
            "load_hours": GreenEnergySizingSimulationResult.load_hours,
            "green_hours": GreenEnergySizingSimulationResult.green_hours,
            "dg_hours": GreenEnergySizingSimulationResult.dg_hours,
            "dg_starts": GreenEnergySizingSimulationResult.dg_starts,
            "bess_cycles": GreenEnergySizingSimulationResult.bess_cycles,
            "unserved_mwh": GreenEnergySizingSimulationResult.unserved_mwh,
            "fuel_l": GreenEnergySizingSimulationResult.fuel_consumption_l,
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
                module=PSPAuditLogModules.SIMULATION.value,
                action=PSPAuditLogScenario.GREEN_ENERGY_RESULT_VIEWED.value,
                resource_id=resource_id,
                before=None,
                after="Green Energy Analysis - Detailed View Opened",
            )

            await bess_db.commit()

        results = [GreenResult.model_validate(row) for row in pagination.records]

        data = GreenResultResponse(
            simulation_id=simulation_id,
            results=results,
            min_green_energy=green_config.min_green_energy,
            max_wastage=green_config.max_wastage,
            total_configs=pagination.total_results,
            total_pages=pagination.total_pages,
            current_page=pagination.current_page,
            next_page=pagination.next_page,
        )

        return Res.success(
            status_code="S-20050",
            data=data.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def export_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        solar_capacity: Optional[List[float]] = None,
        dg_capacity: Optional[List[float]] = None,
        bess_capacity: Optional[List[float]] = None,
        duration_hr: Optional[List[float]] = None,
        viable_only: bool = False,
        delivery_100_only: bool = False,
        zero_dg_hours_only: bool = False,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation_id,
                GreenSizingSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20046",
                message="Green energy simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.GREEN_ENERGY_RESULT_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after="Exported Green Energy Analysis Results",
        )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_sim_result_csv(
                simulation_id=simulation_id,
                simulation_job_id=simulation_job.id,
                bess_db=bess_db,
                solar_capacity=solar_capacity,
                dg_capacity=dg_capacity,
                bess_capacity=bess_capacity,
                duration_hr=duration_hr,
                viable_only=viable_only,
                delivery_100_only=delivery_100_only,
                zero_dg_hours_only=zero_dg_hours_only,
                sort=sort,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="green_sim_{simulation_id}.csv"'
            },
        )
