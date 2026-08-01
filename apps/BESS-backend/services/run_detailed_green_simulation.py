import io
import csv
import json
from fastapi import status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from constants.enums import (
    PSPAuditLogModules,
    SimulationJobStatus,
    SimulationSetupProgress,
    SimulationStatus,
    PSPAuditLogScenario,
)

from dtos.simulation_dto import (
    BaseSimulationProgress,
    GreenResult,
)
from models.simulation_model import (
    DetailGreenSimulationJob,
    DetailedGreenSimulationResult,
    GreenSimulationHourlyResult,
    GreenSimulationMonthlyResult,
    GreenSizingSimulationJob,
    Simulation,
)
from simulation_engine import detailed_green_simulation
from redis.asyncio import Redis
from utils.log_utils import audit_logs
from utils.response_utils import Res


class RunDetailedGreenSimulationService:
    async def _generate_hourly_result_csv(
        self,
        job_id: int,
        bess_db: AsyncSession,
        yield_per: int = 1000,
    ):
        """
        Fetches DB rows in chunks and yields them as CSV strings.
        """
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Timestamp",
            "Hour",
            "Day",
            "Hour of Day",
            "Load (MW)",
            "Solar (MW)",
            "Solar to Load (MW)",
            "Solar to BESS (MW)",
            "BESS to Load (MW)",
            "BESS (MW)",
            "BESS State",
            "DG Output (MW)",
            "Is DG Running",
            "DG to Load (MW)",
            "DG to BESS (MW)",
            "DG Curtailed (MW)",
            "SoC (MWh)",
            "SoC %",
            "Charging Loss (MW)",
            "Discharging Loss (MW)",
            "Unmet (MW)",
            "Delivery",
            "Solar Curtailed (MW)",
            "Daily Cycles",
            "Green Energy to Load (MW)",
        ]
        writer.writerow(headers)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        stmt = (
            select(
                GreenSimulationHourlyResult.timestamp,
                GreenSimulationHourlyResult.hour,
                GreenSimulationHourlyResult.day,
                GreenSimulationHourlyResult.hour_of_day,
                GreenSimulationHourlyResult.load_mw,
                GreenSimulationHourlyResult.solar_mw,
                GreenSimulationHourlyResult.solar_to_load,
                GreenSimulationHourlyResult.solar_to_bess,
                GreenSimulationHourlyResult.bess_to_load,
                GreenSimulationHourlyResult.bess_power_mw,
                GreenSimulationHourlyResult.bess_state,
                GreenSimulationHourlyResult.dg_output_mw,
                GreenSimulationHourlyResult.is_dg_running,
                GreenSimulationHourlyResult.dg_to_load,
                GreenSimulationHourlyResult.dg_to_bess,
                GreenSimulationHourlyResult.dg_curtailed,
                GreenSimulationHourlyResult.soc_mwh,
                GreenSimulationHourlyResult.soc_percent,
                GreenSimulationHourlyResult.charging_loss,
                GreenSimulationHourlyResult.discharging_loss,
                GreenSimulationHourlyResult.unmet_mw,
                GreenSimulationHourlyResult.delivery,
                GreenSimulationHourlyResult.solar_curtailed,
                GreenSimulationHourlyResult.daily_cycles,
                GreenSimulationHourlyResult.green_energy_to_load_mwh,
            )
            .where(GreenSimulationHourlyResult.job_id == job_id)
            .order_by(GreenSimulationHourlyResult.timestamp.asc())
        )

        stmt = stmt.execution_options(yield_per=yield_per)
        result = await bess_db.stream(stmt)

        async for db_batch in result.partitions():
            for row in db_batch:
                row_list = list(row)
                if row_list[0] and hasattr(row_list[0], "tzinfo"):
                    row_list[0] = row_list[0].replace(tzinfo=None)

                writer.writerow(row_list)

            # Yield the chunk of CSV text to FastAPI
            yield output.getvalue()

            output.seek(0)
            output.truncate(0)

    async def _generate_monthly_result_csv(
        self, simulation_job_id: int, bess_db: AsyncSession, yield_per: int = 100
    ):
        output = io.StringIO()
        writer = csv.writer(output)

        headers = [
            "Month",
            "Load Met (%)",
            "Green Energy (%)",
            "Wastage Energy (%)",
            "Hours Fully Served",
            "Total Load Hours",
            "Generator Hours",
            "Green Energy to Load (MWh)",
            "DG to Load (MWh)",
            "Curtailed (MWh)",
        ]
        writer.writerow(headers)

        stmt = select(
            GreenSimulationMonthlyResult.month,
            GreenSimulationMonthlyResult.load_met_pct,
            GreenSimulationMonthlyResult.green_energy_pct,
            GreenSimulationMonthlyResult.wastage_energy_pct,
            GreenSimulationMonthlyResult.hours_fully_served,
            GreenSimulationMonthlyResult.total_load_hours,
            GreenSimulationMonthlyResult.generator_hours,
            GreenSimulationMonthlyResult.green_energy_to_load_mwh,
            GreenSimulationMonthlyResult.dg_to_load_mwh,
            GreenSimulationMonthlyResult.curtailed_mwh,
        ).where(GreenSimulationMonthlyResult.job_id == simulation_job_id)

        stmt = stmt.execution_options(yield_per=yield_per)
        result = await bess_db.stream(stmt)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        async for db_batch in result.partitions():
            for row in db_batch:
                writer.writerow(row)

            # Yield the chunk of CSV text to FastAPI
            yield output.getvalue()

            output.seek(0)
            output.truncate(0)

    async def run_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        redis: Redis,
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

        if simulation.step < SimulationSetupProgress.GREEN_ENERGY_DETAILED_CONFIG:
            return Res.error(
                status_code="E-20062",
                message="Incomplete Simulation configuration.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        green_sim_job_result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation.id,
            )
        )

        sizing_sim_job = green_sim_job_result.scalar_one_or_none()
        if not sizing_sim_job or sizing_sim_job.status != SimulationJobStatus.COMPLETED:
            return Res.error(
                status_code="E-20059",
                message="Green Sizing simulation not completed.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        sim_job_result = await bess_db.execute(
            select(DetailGreenSimulationJob)
            .where(
                DetailGreenSimulationJob.simulation_id == simulation.id,
            )
            .with_for_update()
        )

        detailed_sim_job = sim_job_result.scalar_one_or_none()

        before_config = None
        log_action = PSPAuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RUN.value

        if detailed_sim_job:
            if detailed_sim_job.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-20047",
                    message="Results for this configuration are already available.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )
            if (
                detailed_sim_job.status == SimulationJobStatus.INITIATED
                or detailed_sim_job.status == SimulationJobStatus.IN_PROGRESS
            ):
                return Res.error(
                    status_code="E-20058",
                    message="Simulation is already running.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            log_action = (
                PSPAuditLogScenario.DETAILED_GREEN_ENERGY_SIMULATION_RERUN.value
            )
            before_config = f"Simulation Status : {SimulationJobStatus(detailed_sim_job.status).name}"

            await bess_db.delete(detailed_sim_job)
            await bess_db.flush()

        new_simulation_job = DetailGreenSimulationJob(
            simulation_id=simulation.id, status=SimulationJobStatus.INITIATED
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        await bess_db.flush()

        try:
            await detailed_green_simulation.kiq(
                simulation.id,
                job_id=new_simulation_job.job_id,
                run_by=current_user.get("name"),  # type: ignore
            )
            await bess_db.commit()

        except Exception:
            await bess_db.rollback()

            return Res.error(
                status_code="E-20065",
                message="Unable to run simulation.",
                http_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=log_action,
            resource_id=resource_id,
            before=before_config,
            after="Simulation Status: STARTED",
            redis=redis,
        )

        return Res.success(
            status_code="S-20054",
            message="Detailed green simulation started successfully.",
            data={"simulation_job_id": new_simulation_job.job_id},
        )

    async def get_simulation_progress(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(DetailGreenSimulationJob).where(
                DetailGreenSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20047",
                message="Simulation job not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = BaseSimulationProgress(
            simulation_job_id=simulation_job.job_id,
            status=SimulationJobStatus(simulation_job.status),
        )

        return Res.success(status_code="S-20056", data=data.model_dump(mode="json"))

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
    ):

        result = await bess_db.execute(
            select(DetailGreenSimulationJob).where(
                DetailGreenSimulationJob.simulation_id == simulation_id,
                DetailGreenSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20063",
                message="Detailed green simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        result = await bess_db.execute(
            select(DetailedGreenSimulationResult).where(
                DetailedGreenSimulationResult.simulation_id == simulation_id
            )
        )
        simulation_result = result.scalar_one_or_none()

        if not simulation_result:
            return Res.error(
                status_code="E-20063",
                message="Detailed green simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = GreenResult.model_validate(simulation_result)

        return Res.success(
            status_code="S-20055",
            message="Detailed green simulation results fetched successfully.",
            data=data.model_dump(mode="json"),
        )

    async def export_hourly_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        redis: Redis,
    ):
        result = await bess_db.execute(
            select(DetailGreenSimulationJob).where(
                DetailGreenSimulationJob.simulation_id == simulation_id,
                DetailGreenSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
        )

        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20063",
                message="Detailed green simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        after = {
            "DETAILED GREEN ANALYSIS...": {
                "Export Type": "Hourly Simulation Data",
                "File": f"SIM-{simulation_id}_Hourly_Performance_Report.csv",
            }
        }

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.DETAILED_GREEN_ENERGY_HOURLY_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after=str(json.dumps(after)),
            redis=redis,
        )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_hourly_result_csv(
                job_id=simulation_job.job_id,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="SIM-{simulation_id}_Hourly_Performance_Report.csv"'
            },
        )

    async def export_monthly_simulation_results(
        self,
        simulation_id: int,
        current_user: dict,
        resource_id: str,
        bess_db: AsyncSession,
        redis: Redis,
    ):
        result = await bess_db.execute(
            select(DetailGreenSimulationJob).where(
                DetailGreenSimulationJob.simulation_id == simulation_id,
                DetailGreenSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        after = {
            "DETAILED GREEN ANALYSIS...": {
                "Export Type": "Monthly Performance Report",
                "File": f"SIM-{simulation_id}_Monthly_Performance_Report.csv",
            }
        }

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.DETAILED_GREEN_ENERGY_MONTHLY_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after=str(json.dumps(after)),
            redis=redis,
        )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_monthly_result_csv(
                simulation_job_id=simulation_job.job_id,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="SIM-{simulation_id}_Monthly_Performance_Report.csv"'
            },
        )
