import io
import csv
from typing import Optional
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis


from constants.enums import (
    SimulationJobStatus,
    SimulationSetupProgress,
    SimulationStatus,
)

from dtos.simulation_dto import (
    MultiYearProjectionResponse,
    MultiYearProjectionResult,
    MultiYearSimulationProgress,
    SimulationProgress,
)
from models.simulation_model import (
    MultiYearSimulationJob,
    MultiYearSimulationResult,
    Simulation,
)
from utils.log_utils import audit_logs
from utils.response_utils import Res
from python_common.constants.enums import AuditLogModules, AuditLogScenario  # type: ignore
from simulation_engine import multi_year_projection_sim_task
from .service_support import ensure_simulation_write_access
from simulation_engine.utils import stop_simulation as stop_sim_util


class RunMultiYearSimulationService:
    async def run_simulation(
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

        if simulation.step < SimulationSetupProgress.MULTI_YEAR_PROJECTION_CONFIG:
            return Res.error(message="Incomplete Simulaton")

        sim_job_result = await bess_db.execute(
            select(MultiYearSimulationJob).where(
                MultiYearSimulationJob.simulation_id == simulation.id,
            )
        )

        single_sim_jobs = sim_job_result.scalar_one_or_none()

        if single_sim_jobs:
            if single_sim_jobs.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-200XX",
                    message="Results for this configuration are already available.",
                )

            await bess_db.delete(single_sim_jobs)
            await bess_db.flush()

        new_simulation_job = MultiYearSimulationJob(
            simulation_id=simulation.id,
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        # await audit_logs(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),
        #     module=AuditLogModules.SIMULATION.value,
        #     action=log_action,
        #     resource_id=resource_id,
        #     before=before_config,
        #     after=f"Simulation Status: {SimulationJobStatus.IN_PROGRESS.name}",
        # )

        await bess_db.commit()
        await bess_db.refresh(new_simulation_job)

        await multi_year_projection_sim_task.kiq(
            simulation.id, job_id=new_simulation_job.job_id
        )

        return Res.success(
            status_code="S-20043", data={"simulation_job_id": new_simulation_job.job_id}
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
            select(MultiYearSimulationJob).where(
                MultiYearSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()
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

        # await audit_logs(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),  # type: ignore
        #     module=AuditLogModules.SIMULATION.value,
        #     action=AuditLogScenario.SIZING_SIMULATION_STOPED.value,
        #     resource_id=resource_id,
        #     before=f"Simulation Status: {SimulationJobStatus(simulation_job.status).name}",
        #     after=f"Simulation Status: {SimulationJobStatus.TERMINATED.name}",
        # )

        await bess_db.commit()

        return Res.success(
            status_code="S-20045", data={"simulation_job_id": simulation_job.job_id}
        )

    async def get_simulation_progress(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(MultiYearSimulationJob).where(
                MultiYearSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(status_code="E-20047", message="Simulation job not found.")

        data = MultiYearSimulationProgress(
            simulation_job_id=simulation_job.job_id,
            status=SimulationJobStatus(simulation_job.status),
        )

        return Res.success(status_code="S-20046", data=data.model_dump(mode="json"))

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        sort: Optional[list[str]] = None,
        until_year: int = 20,
    ):
        result = await bess_db.execute(
            select(MultiYearSimulationJob)
            .where(
                MultiYearSimulationJob.simulation_id == simulation_id,
                MultiYearSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(MultiYearSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052", message="Simulation result not found."
            )

        order_by = []
        sort_map = {
            "year": MultiYearSimulationResult.year,
            "bess_mwh": MultiYearSimulationResult.bess_mwh,
            "capacity_percent": MultiYearSimulationResult.capacity_percent,
            "delivery_hours": MultiYearSimulationResult.delivery_hours,
            "load_hours": MultiYearSimulationResult.load_hours,
            "delivery_pct": MultiYearSimulationResult.delivery_pct,
            "dg_hours": MultiYearSimulationResult.dg_hours,
            "green_energy_to_load_mwh": MultiYearSimulationResult.green_energy_to_load_mwh,
            "bess_hrs": MultiYearSimulationResult.bess_hrs,
            "wastage_mw": MultiYearSimulationResult.wastage_mw,
            "wastage_pct": MultiYearSimulationResult.wastage_pct,
            "load_solar_wastage_pct": MultiYearSimulationResult.load_solar_wastage_pct,
            "bess_loss_mwh": MultiYearSimulationResult.bess_loss_mwh,
            "solar_generation": MultiYearSimulationResult.solar_generation,
            "solar_hrs": MultiYearSimulationResult.solar_hrs,
            "dg_generation": MultiYearSimulationResult.dg_generation,
            "solar_to_load": MultiYearSimulationResult.solar_to_load,
            "bess_to_load": MultiYearSimulationResult.bess_to_load,
            "dg_to_load": MultiYearSimulationResult.dg_to_load,
            "dg_curtailed": MultiYearSimulationResult.dg_curtailed,
            "energy_to_load": MultiYearSimulationResult.energy_to_load,
            "delivery_met_mwh": MultiYearSimulationResult.delivery_met_mwh,
            "charging_loss": MultiYearSimulationResult.charging_loss,
            "discharging_loss": MultiYearSimulationResult.discharging_loss,
            "final_soc_pct": MultiYearSimulationResult.final_soc_pct,
            "solar_gen_during_load": MultiYearSimulationResult.solar_gen_during_load,
            "solar_curtailed_during_load": MultiYearSimulationResult.solar_curtailed_during_load,
            "solar_curtailed": MultiYearSimulationResult.solar_curtailed,
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

        if not order_by:
            order_by.append(MultiYearSimulationResult.year.asc())

        result = await bess_db.execute(
            select(MultiYearSimulationResult)
            .where(
                MultiYearSimulationResult.job_id == simulation_job.id,
                MultiYearSimulationResult.year <= until_year,
            )
            .order_by(*order_by)
        )
        simulation_results = result.scalars().all()

        if not simulation_results:
            return Res.error(
                status_code="E-20052", message="Simulation result not found."
            )

        data = MultiYearProjectionResponse(
            simulation_id=simulation_id,
            results=[
                MultiYearProjectionResult.model_validate(r) for r in simulation_results
            ],
        )

        return Res.success(status_code="S-20044", data=data.model_dump(mode="json"))

    async def _generate_multi_year_result_csv(
        self,
        job_id: int,
        bess_db: AsyncSession,
        until_year: int,
        sort: Optional[list[str]] = None,
        yield_per: int = 100,
    ):
        """
        Fetches multi-year results and yields them as CSV strings.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Year",
            "Capacity %",
            "Delivery Hrs",
            "Load Hrs",
            "Delivery %",
            "DG Hrs",
            "Green Energy To Load (MWh)",
            "Solar Hrs",
            "BESS Hrs",
            "Curtailed (MWh)",
            "Total Wastage %",
            "Load Wastage %",
            "BESS Loss (MWh)",
            "Solar Gen",
            "DG Gen",
            "Solar To Load",
            "BESS To Load",
            "DG To Load",
            "DG Curtailed",
            "Energy To Load",
            "Delivery Met MWh",
            "Charging Loss",
            "Discharging Loss",
            "Final SOC Pct",
            "Capacity",
            "Load Solar",
            "Load Curtailed",
            "Solar Curtailed",
        ]
        writer.writerow(headers)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        order_by = []
        sort_map = {
            "year": MultiYearSimulationResult.year,
            "bess_mwh": MultiYearSimulationResult.bess_mwh,
            "capacity_percent": MultiYearSimulationResult.capacity_percent,
            "delivery_hours": MultiYearSimulationResult.delivery_hours,
            "load_hours": MultiYearSimulationResult.load_hours,
            "delivery_pct": MultiYearSimulationResult.delivery_pct,
            "dg_hours": MultiYearSimulationResult.dg_hours,
            "green_energy_to_load_mwh": MultiYearSimulationResult.green_energy_to_load_mwh,
            "bess_hrs": MultiYearSimulationResult.bess_hrs,
            "wastage_mw": MultiYearSimulationResult.wastage_mw,
            "wastage_pct": MultiYearSimulationResult.wastage_pct,
            "load_solar_wastage_pct": MultiYearSimulationResult.load_solar_wastage_pct,
            "bess_loss_mwh": MultiYearSimulationResult.bess_loss_mwh,
            "solar_generation": MultiYearSimulationResult.solar_generation,
            "solar_hrs": MultiYearSimulationResult.solar_hrs,
            "dg_generation": MultiYearSimulationResult.dg_generation,
            "solar_to_load": MultiYearSimulationResult.solar_to_load,
            "bess_to_load": MultiYearSimulationResult.bess_to_load,
            "dg_to_load": MultiYearSimulationResult.dg_to_load,
            "dg_curtailed": MultiYearSimulationResult.dg_curtailed,
            "energy_to_load": MultiYearSimulationResult.energy_to_load,
            "delivery_met_mwh": MultiYearSimulationResult.delivery_met_mwh,
            "charging_loss": MultiYearSimulationResult.charging_loss,
            "discharging_loss": MultiYearSimulationResult.discharging_loss,
            "final_soc_pct": MultiYearSimulationResult.final_soc_pct,
            "solar_gen_during_load": MultiYearSimulationResult.solar_gen_during_load,
            "solar_curtailed_during_load": MultiYearSimulationResult.solar_curtailed_during_load,
            "solar_curtailed": MultiYearSimulationResult.solar_curtailed,
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

        if not order_by:
            order_by.append(MultiYearSimulationResult.year.asc())

        stmt = (
            select(
                MultiYearSimulationResult.year,
                MultiYearSimulationResult.capacity_percent,
                MultiYearSimulationResult.delivery_hours,
                MultiYearSimulationResult.load_hours,
                MultiYearSimulationResult.delivery_pct,
                MultiYearSimulationResult.dg_hours,
                MultiYearSimulationResult.green_energy_to_load_mwh,
                MultiYearSimulationResult.solar_hrs,
                MultiYearSimulationResult.bess_hrs,
                MultiYearSimulationResult.wastage_mw,
                MultiYearSimulationResult.wastage_pct,
                MultiYearSimulationResult.load_solar_wastage_pct,
                MultiYearSimulationResult.bess_loss_mwh,
                MultiYearSimulationResult.solar_generation,
                MultiYearSimulationResult.dg_generation,
                MultiYearSimulationResult.solar_to_load,
                MultiYearSimulationResult.bess_to_load,
                MultiYearSimulationResult.dg_to_load,
                MultiYearSimulationResult.dg_curtailed,
                MultiYearSimulationResult.energy_to_load,
                MultiYearSimulationResult.delivery_met_mwh,
                MultiYearSimulationResult.charging_loss,
                MultiYearSimulationResult.discharging_loss,
                MultiYearSimulationResult.final_soc_pct,
                MultiYearSimulationResult.bess_mwh,
                MultiYearSimulationResult.solar_gen_during_load,
                MultiYearSimulationResult.solar_curtailed_during_load,
                MultiYearSimulationResult.solar_curtailed,
            )
            .where(
                MultiYearSimulationResult.job_id == job_id,
                MultiYearSimulationResult.year <= until_year,
            )
            .order_by(*order_by)
            .execution_options(yield_per=yield_per)
        )

        result = await bess_db.stream(stmt)

        async for db_batch in result.partitions():
            for row in db_batch:
                writer.writerow(row)

            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    async def export_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        until_year: int,
        sort: Optional[list[str]] = None,
    ):
        result = await bess_db.execute(
            select(MultiYearSimulationJob)
            .where(
                MultiYearSimulationJob.simulation_id == simulation_id,
                MultiYearSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(MultiYearSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052", message="Simulation result not found."
            )

        return StreamingResponse(
            self._generate_multi_year_result_csv(
                job_id=simulation_job.id,
                bess_db=bess_db,
                until_year=until_year,
                sort=sort,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="multi_year_results_{simulation_id}.csv"'
            },
        )
