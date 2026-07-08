import io
import csv
import pandas as pd
import numpy as np
import calendar
from fastapi import status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncResult, AsyncSession

from constants.enums import (
    SimulationJobStatus,
    SimulationSetupProgress,
    SimulationStatus,
    PSPAuditLogScenario,
)

from dtos.simulation_dto import (
    BaseSimulationProgress,
    GreenResult,
    MonthlySimulationMetrics,
)
from models.simulation_model import (
    DetailGreenSimulationJob,
    DetailedGreenSimulationResult,
    GreenSimulationHourlyResult,
    Simulation,
)
from simulation_engine import detailed_green_simulation
from utils.log_utils import audit_logs
from utils.response_utils import Res
from python_common.utils.common_utils import paginate  # type: ignore


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

    async def __aggregate_monthly_data(
        self, result: AsyncResult
    ) -> tuple[list[MonthlySimulationMetrics], int]:
        """
        Consumes an async SQLAlchemy stream, loads it into a Pandas DataFrame,
        calculates monthly KPIs, and returns a list of MonthlySimulationMetrics models.
        """

        data = []
        year: int = 1990

        async for row in result.scalars():
            data.append(
                {
                    "timestamp": row.timestamp,
                    "is_dg_running": row.is_dg_running,
                    "solar_to_load": row.solar_to_load,
                    "bess_to_load": row.bess_to_load,
                    "dg_to_load": row.dg_to_load,
                    "load_mw": row.load_mw,
                    "solar_curtailed": row.solar_curtailed,
                    "solar_mw": row.solar_mw,
                    "delivery": row.delivery,
                }
            )

        # Load into DataFrame
        df = pd.DataFrame(data)

        # Handle empty results gracefully
        if df.empty:
            return [], year

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["month_int"] = df["timestamp"].dt.month
        year = int(df["timestamp"].dt.year.iloc[0])

        # Booleans for fast counting
        df["load_active"] = (df["load_mw"] > 0).astype(int)
        df["delivery_int"] = df["delivery"].astype(int)
        df["dg_running_int"] = df["is_dg_running"].astype(int)
        df["delivery_dg_off"] = (df["delivery"] & ~df["is_dg_running"]).astype(int)

        # MWh condition: solar + bess to load ONLY when DG is off
        df["green_energy_mwh"] = np.where(
            ~df["is_dg_running"], df["solar_to_load"] + df["bess_to_load"], 0.0
        )

        grouped = (
            df.groupby("month_int")
            .agg(
                hours_fully_served=("delivery_int", "sum"),
                total_load_hours=("load_active", "sum"),
                green_delivery_hours=("delivery_dg_off", "sum"),
                generator_hours=("dg_running_int", "sum"),
                sum_solar_mw=("solar_mw", "sum"),
                green_energy_to_load_mwh=("green_energy_mwh", "sum"),
                dg_to_load_mwh=("dg_to_load", "sum"),
                curtailed_mwh=("solar_curtailed", "sum"),
            )
            .reset_index()
        )

        # 4. Perform final percentage calculations (with safe division to prevent divide-by-zero errors)
        grouped["load_met_pct"] = np.where(
            grouped["total_load_hours"] > 0,
            (grouped["hours_fully_served"] / grouped["total_load_hours"]) * 100,
            0.0,
        )

        grouped["green_energy_pct"] = np.where(
            grouped["hours_fully_served"] > 0,
            (grouped["green_delivery_hours"] / grouped["hours_fully_served"]) * 100,
            0.0,
        )

        grouped["wastage_energy_pct"] = np.where(
            grouped["sum_solar_mw"] > 0,
            (grouped["curtailed_mwh"] / grouped["sum_solar_mw"]) * 100,
            0.0,
        )

        grouped["month"] = grouped["month_int"].apply(lambda x: calendar.month_name[x])

        metrics_list = []

        for row in grouped.itertuples(index=False):
            metric = MonthlySimulationMetrics(
                month=row.month,  # type: ignore
                load_met_pct=row.load_met_pct,  # type: ignore
                green_energy_pct=row.green_energy_pct,  # type: ignore
                wastage_energy_pct=row.wastage_energy_pct,  # type: ignore
                hours_fully_served=int(row.hours_fully_served),  # type: ignore
                total_load_hours=int(row.total_load_hours),  # type: ignore
                generator_hours=int(row.generator_hours),  # type: ignore
                green_energy_to_load_mwh=row.green_energy_to_load_mwh,  # type: ignore
                dg_to_load_mwh=row.dg_to_load_mwh,  # type: ignore
                curtailed_mwh=row.curtailed_mwh,  # type: ignore
                month_int=row.month_int,  # type: ignore
            )
            metrics_list.append(metric)

        return metrics_list, year

    async def _generate_monthly_result_csv(
        self,
        simulation_job_id: int,
        bess_db: AsyncSession,
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

        stmt = select(GreenSimulationHourlyResult).where(
            GreenSimulationHourlyResult.job_id == simulation_job_id,
        )

        # Stream results to keep aggregation memory-efficient
        hourly_result = await bess_db.stream(stmt)
        hourly_data, _ = await self.__aggregate_monthly_data(result=hourly_result)

        for metric in hourly_data:
            writer.writerow(
                [
                    metric.month,
                    metric.load_met_pct,
                    metric.green_energy_pct,
                    metric.wastage_energy_pct,
                    metric.hours_fully_served,
                    metric.total_load_hours,
                    metric.generator_hours,
                    metric.green_energy_to_load_mwh,
                    metric.dg_to_load_mwh,
                    metric.curtailed_mwh,
                ]
            )

        yield output.getvalue()

    async def run_simulation(
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

        if simulation.step < SimulationSetupProgress.GREEN_ENERGY_DETAILED_CONFIG:
            return Res.error(
                status_code="E-20062", message="Incomplete Simulation configuration."
            )

        sim_job_result = await bess_db.execute(
            select(DetailGreenSimulationJob).where(
                DetailGreenSimulationJob.simulation_id == simulation.id,
            )
        )

        detailed_sim_job = sim_job_result.scalar_one_or_none()

        before_config = None
        log_action = PSPAuditLogScenario.CUSTOM_CONF_SIMULATION_RUN.value

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

            log_action = PSPAuditLogScenario.CUSTOM_CONF_SIMULATION_RERUN.value
            before_config = f"Simulation Status : {SimulationJobStatus(detailed_sim_job.status).name}"

            await bess_db.delete(detailed_sim_job)
            await bess_db.flush()

        new_simulation_job = DetailGreenSimulationJob(
            simulation_id=simulation.id, status=SimulationJobStatus.INITIATED
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        # await audit_logs(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),  # type: ignore
        #     module=PSPAuditLogModules.SIMULATION.value,
        #     action=log_action,
        #     resource_id=resource_id,
        #     before=before_config,
        #     after=f"Simulation Status: {SimulationJobStatus.IN_PROGRESS.name}",
        # )

        await bess_db.commit()
        await bess_db.refresh(new_simulation_job)

        await detailed_green_simulation.kiq(
            simulation.id, job_id=new_simulation_job.job_id
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

        # await audit_logs(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),  # type: ignore
        #     module=PSPAuditLogModules.SIMULATION.value,
        #     action=PSPAuditLogScenario.CUSTOM_CONF_HOURLY_EXPORTED.value,
        #     resource_id=resource_id,
        #     before=None,
        #     after="Action: Custom Configuration Hourly Performance Exported",
        # )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_hourly_result_csv(
                job_id=simulation_job.job_id,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="bess_hourly_{simulation_id}.csv"'
            },
        )

    async def export_monthly_simulation_results(
        self,
        simulation_id: int,
        current_user: dict,
        resource_id: str,
        bess_db: AsyncSession,
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

        # await audit_logs(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),  # type: ignore
        #     module=PSPAuditLogModules.SIMULATION.value,
        #     action=PSPAuditLogScenario.CUSTOM_CONF_MONTHLY_EXPORTED.value,
        #     resource_id=resource_id,
        #     before=None,
        #     after="Action: Custom Configuration Monthly Performance Exported",
        # )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_monthly_result_csv(
                simulation_job_id=simulation_job.job_id,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="bess_monthly_{simulation_id}.csv"'
            },
        )
