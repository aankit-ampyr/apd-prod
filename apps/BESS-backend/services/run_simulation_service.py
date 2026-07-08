import io
import csv
import pandas as pd
import numpy as np
import calendar
from fastapi import status
from typing import List, Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, extract, select
from sqlalchemy.ext.asyncio import AsyncResult, AsyncSession

from constants.enums import (
    SimulationJobStatus,
    SimulationStatus,
    Month,
    PSPAuditLogScenario,
    PSPAuditLogModules,
)

from dtos.simulation_dto import (
    HourlyResult as HourlyResultDTO,
    MonthlySimulationMetrics,
    MonthlySimulationResponse,
    SingleSimResultResponse,
    SimulationResponse,
    SimulationHourlyChartResponse,
    HourlyChartDataPoint,
)
from models.simulation_model import (
    CustomSimulationJob,
    DispatchRuleConfiguration,
    SimulationHourlyResult,
    Simulation,
    SingularConfSimulationResult,
)
from utils.log_utils import audit_logs
from utils.response_utils import Res
from python_common.utils.common_utils import paginate  # type: ignore
from simulation_engine import bess_single_sim_task


class RunSingleSimulationService:
    async def _generate_hourly_result_csv(
        self,
        custom_job_id: int,
        bess_db: AsyncSession,
        yield_per: int = 1000,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        sort: Optional[List[str]] = None,
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
            "Solar to Load",
            "Solar to BESS",
            "BESS to Load",
            "BESS (MW)",
            "BESS State",
            "DG Output (MW)",
            "Is DG Running",
            "DG to Load",
            "DG to BESS",
            "DG Curtailed",
            "SoC (MWh)",
            "SoC %",
            "Charging Loss (MW)",
            "Discharging Loss (MW)",
            "Unmet (MW)",
            "Delivery",
            "Solar Curtailed",
            "Daily Cycles",
            "Green Energy to Load (MWh)",
        ]
        writer.writerow(headers)

        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        stmt = select(
            SimulationHourlyResult.timestamp,
            SimulationHourlyResult.hour,
            SimulationHourlyResult.day,
            SimulationHourlyResult.hour_of_day,
            SimulationHourlyResult.load_mw,
            SimulationHourlyResult.solar_mw,
            SimulationHourlyResult.solar_to_load,
            SimulationHourlyResult.solar_to_bess,
            SimulationHourlyResult.bess_to_load,
            SimulationHourlyResult.bess_power_mw,
            SimulationHourlyResult.bess_state,
            SimulationHourlyResult.dg_output_mw,
            SimulationHourlyResult.is_dg_running,
            SimulationHourlyResult.dg_to_load,
            SimulationHourlyResult.dg_to_bess,
            SimulationHourlyResult.dg_curtailed,
            SimulationHourlyResult.soc_mwh,
            SimulationHourlyResult.soc_percent,
            SimulationHourlyResult.charging_loss,
            SimulationHourlyResult.discharging_loss,
            SimulationHourlyResult.unmet_mw,
            SimulationHourlyResult.delivery,
            SimulationHourlyResult.solar_curtailed,
            SimulationHourlyResult.daily_cycles,
            SimulationHourlyResult.green_energy_to_load_mwh,
        ).where(SimulationHourlyResult.custom_job_id == custom_job_id)

        # Filters
        if start_time is not None:
            stmt = stmt.where(SimulationHourlyResult.timestamp >= start_time)
        if end_time is not None:
            stmt = stmt.where(SimulationHourlyResult.timestamp <= end_time)

        # Sorting
        sort_map = {
            "timestamp": SimulationHourlyResult.timestamp,
            "hour": SimulationHourlyResult.hour,
            "day": SimulationHourlyResult.day,
            "hour_of_day": SimulationHourlyResult.hour_of_day,
            "load_mw": SimulationHourlyResult.load_mw,
            "solar_mw": SimulationHourlyResult.solar_mw,
            "solar_to_load": SimulationHourlyResult.solar_to_load,
            "solar_to_bess": SimulationHourlyResult.solar_to_bess,
            "bess_to_load": SimulationHourlyResult.bess_to_load,
            "bess_power_mw": SimulationHourlyResult.bess_power_mw,
            "bess_state": SimulationHourlyResult.bess_state,
            "dg_output_mw": SimulationHourlyResult.dg_output_mw,
            "is_dg_running": SimulationHourlyResult.is_dg_running,
            "dg_to_load": SimulationHourlyResult.dg_to_load,
            "dg_to_bess": SimulationHourlyResult.dg_to_bess,
            "dg_curtailed": SimulationHourlyResult.dg_curtailed,
            "soc_mwh": SimulationHourlyResult.soc_mwh,
            "soc_percent": SimulationHourlyResult.soc_percent,
            "charging_loss": SimulationHourlyResult.charging_loss,
            "discharging_loss": SimulationHourlyResult.discharging_loss,
            "unmet_mw": SimulationHourlyResult.unmet_mw,
            "delivery": SimulationHourlyResult.delivery,
            "solar_curtailed": SimulationHourlyResult.solar_curtailed,
            "daily_cycles": SimulationHourlyResult.daily_cycles,
            "green_energy_to_load_mwh": SimulationHourlyResult.green_energy_to_load_mwh,
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
        else:
            stmt = stmt.order_by(SimulationHourlyResult.timestamp.asc())

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
                    "dg_to_load": row.dg_to_load,
                    "load_mw": row.load_mw,
                    "solar_curtailed": row.solar_curtailed,
                    "solar_mw": row.solar_mw,
                    "delivery": row.delivery,
                    "green_energy_to_load_mwh": row.green_energy_to_load_mwh,
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

        grouped = (
            df.groupby("month_int")
            .agg(
                hours_fully_served=("delivery_int", "sum"),
                total_load_hours=("load_active", "sum"),
                green_delivery_hours=("delivery_dg_off", "sum"),
                generator_hours=("dg_running_int", "sum"),
                sum_solar_mw=("solar_mw", "sum"),
                green_energy_to_load_mwh=("green_energy_to_load_mwh", "sum"),
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
        months: Optional[list[Month]],
        sort: Optional[str],
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

        stmt = select(SimulationHourlyResult).where(
            SimulationHourlyResult.custom_job_id == simulation_job_id,
        )

        if months:
            stmt = stmt.where(
                extract(
                    "month", SimulationHourlyResult.timestamp.op("AT TIME ZONE")("UTC")
                ).in_(months)
            )

        # Stream results to keep aggregation memory-efficient
        hourly_result = await bess_db.stream(stmt)
        hourly_data, _ = await self.__aggregate_monthly_data(result=hourly_result)

        if sort in ("month", "-month"):
            descending = sort.startswith("-")
            hourly_data.sort(
                key=lambda metric: metric.month_int,
                reverse=descending,
            )

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

        # WARNING: Uncomment it once the progress status update is implemented after step 3.
        # if simulation.step < SimulationSetupProgress.BESS_DG_CONFIG:
        #     return Res.error()

        sim_job_result = await bess_db.execute(
            select(CustomSimulationJob).where(
                CustomSimulationJob.simulation_id == simulation.id,
            )
        )

        single_sim_jobs = sim_job_result.scalar_one_or_none()

        before_config = None
        log_action = PSPAuditLogScenario.CUSTOM_CONF_SIMULATION_RUN.value

        if single_sim_jobs:
            if single_sim_jobs.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-20047",
                    message="Results for this configuration are already available.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )
            if (
                single_sim_jobs.status == SimulationJobStatus.INITIATED
                or single_sim_jobs.status == SimulationJobStatus.IN_PROGRESS
            ):
                return Res.error(
                    status_code="E-20058",
                    message="Simulation is already running.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            log_action = PSPAuditLogScenario.CUSTOM_CONF_SIMULATION_RERUN.value
            before_config = f"Simulation Status : {SimulationJobStatus(single_sim_jobs.status).name}"

            await bess_db.delete(single_sim_jobs)
            await bess_db.flush()

        new_simulation_job = CustomSimulationJob(
            simulation_id=simulation.id,
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

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

        await bess_single_sim_task.kiq(simulation.id, job_id=new_simulation_job.job_id)

        return Res.success(
            status_code="S-20037", data={"simulation_job_id": new_simulation_job.job_id}
        )

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
    ):

        result = await bess_db.execute(
            select(CustomSimulationJob)
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        result = await bess_db.execute(
            select(SingularConfSimulationResult).where(
                SingularConfSimulationResult.simulation_id == simulation_id
            )
        )
        simulation_result = result.scalar_one_or_none()

        if not simulation_result:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = SingleSimResultResponse.model_validate(simulation_result)

        return Res.success(status_code="S-20038", data=data.model_dump(mode="json"))

    async def get_simulation_hourly_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        page: int = 1,
        limit: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(CustomSimulationJob)
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        query = select(SimulationHourlyResult).where(
            SimulationHourlyResult.custom_job_id == simulation_job.job_id
        )

        # Filters
        if start_time is not None:
            query = query.where(SimulationHourlyResult.timestamp >= start_time)

        if end_time is not None:
            query = query.where(SimulationHourlyResult.timestamp <= end_time)

        # Sorting
        order_by = []
        sort_map = {
            "timestamp": SimulationHourlyResult.timestamp,
            "hour": SimulationHourlyResult.hour,
            "day": SimulationHourlyResult.day,
            "hour_of_day": SimulationHourlyResult.hour_of_day,
            "load_mw": SimulationHourlyResult.load_mw,
            "solar_mw": SimulationHourlyResult.solar_mw,
            "solar_to_load": SimulationHourlyResult.solar_to_load,
            "solar_to_bess": SimulationHourlyResult.solar_to_bess,
            "bess_to_load": SimulationHourlyResult.bess_to_load,
            "bess_power_mw": SimulationHourlyResult.bess_power_mw,
            "bess_state": SimulationHourlyResult.bess_state,
            "dg_output_mw": SimulationHourlyResult.dg_output_mw,
            "is_dg_running": SimulationHourlyResult.is_dg_running,
            "dg_to_load": SimulationHourlyResult.dg_to_load,
            "dg_to_bess": SimulationHourlyResult.dg_to_bess,
            "dg_curtailed": SimulationHourlyResult.dg_curtailed,
            "soc_mwh": SimulationHourlyResult.soc_mwh,
            "soc_percent": SimulationHourlyResult.soc_percent,
            "charging_loss": SimulationHourlyResult.charging_loss,
            "discharging_loss": SimulationHourlyResult.discharging_loss,
            "unmet_mw": SimulationHourlyResult.unmet_mw,
            "delivery": SimulationHourlyResult.delivery,
            "solar_curtailed": SimulationHourlyResult.solar_curtailed,
            "daily_cycles": SimulationHourlyResult.daily_cycles,
            "green_energy_to_load_mwh": SimulationHourlyResult.green_energy_to_load_mwh,
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
            order_by.append(SimulationHourlyResult.hour.asc())

        # Paginate
        pagination = await paginate(
            db=bess_db, base_query=query, page=page, limit=limit, order_by=order_by
        )

        # if page == 1:
        #     await audit_logs(
        #         db=bess_db,
        #         user_id=f"USER-{current_user.get('id')}",
        #         user_role=current_user.get("role"),
        #         module=AuditLogModules.SIMULATION.value,
        #         action=AuditLogScenario.SIZING_SIMULATION_RESULT_VIEWED.value,
        #         resource_id=resource_id,
        #         before=None,
        #         after="Action: Results Viewed",
        #     )
        #
        #     await bess_db.commit()

        results = [HourlyResultDTO.model_validate(row) for row in pagination.records]

        data = SimulationResponse(
            simulation_id=simulation_id,
            year=results[0].timestamp.year,
            results=results,
            total_configs=pagination.total_results,
            total_pages=pagination.total_pages,
            current_page=pagination.current_page,
            next_page=pagination.next_page,
        )

        return Res.success(status_code="S-20039", data=data.model_dump(mode="json"))

    async def get_simulation_hourly_chart_results(
        self,
        simulation_id: int,
        start_timestamp: Optional[datetime],
        end_timestamp: Optional[datetime],
        bess_db: AsyncSession,
    ):
        result = await bess_db.execute(
            select(CustomSimulationJob, DispatchRuleConfiguration)
            .join(
                DispatchRuleConfiguration,
                CustomSimulationJob.simulation_id
                == DispatchRuleConfiguration.simulation_id,
            )
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )

        row = result.first()

        if row:
            simulation_job, dispatch_config = row
        else:
            simulation_job, dispatch_config = None, None

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        query = select(SimulationHourlyResult).where(
            SimulationHourlyResult.custom_job_id == simulation_job.job_id
        )

        if start_timestamp is None:
            # Default to January if no start time is provided
            query = query.where(extract("month", SimulationHourlyResult.timestamp) == 1)
        else:
            # Search by start and end timestamp if provided
            query = query.where(SimulationHourlyResult.timestamp >= start_timestamp)
            if end_timestamp is not None:
                query = query.where(SimulationHourlyResult.timestamp <= end_timestamp)
            else:
                query = query.where(
                    SimulationHourlyResult.timestamp
                    <= start_timestamp + relativedelta(months=1)
                )

        query = query.order_by(SimulationHourlyResult.timestamp.asc())

        result = await bess_db.execute(query)
        hourly_results = result.scalars().all()

        if not hourly_results:
            data = SimulationHourlyChartResponse(
                simulation_id=simulation_id,
                hourly_data=[],
                curtailed_mwh=0.0,
                curtailed_pct=0.0,
                avg_soc_pct=0.0,
                total_delivery_hours=0,
                total_dg_hours=0,
                dg_on_pct=0.0,
                dg_off_pct=0.0,
            )
            return Res.success(
                status_code="S-20041", data=data.model_dump(mode="json", by_alias=True)
            )

        hourly_data = []
        total_delivery_hours = 0
        total_dg_hours = 0
        total_curtailed_mwh = 0.0
        total_generated_mw = 0.0
        total_soc_pct = 0.0

        for row in hourly_results:
            hourly_data.append(HourlyChartDataPoint.model_validate(row))
            if row.delivery:
                total_delivery_hours += 1
            if row.is_dg_running:
                total_dg_hours += 1

            total_curtailed_mwh += row.solar_curtailed + row.dg_curtailed
            total_generated_mw += row.solar_mw + row.dg_output_mw
            total_soc_pct += row.soc_percent

        count = len(hourly_results)
        avg_soc_pct = round(total_soc_pct / count, 2) if count > 0 else 0.0
        curtailed_pct = (
            round((total_curtailed_mwh / total_generated_mw) * 100, 2)
            if total_generated_mw > 0
            else 0.0
        )
        dg_on_pct = None
        dg_off_pct = None

        if dispatch_config:
            dg_on_pct = dispatch_config.dg_soc_on_threshold
            dg_off_pct = dispatch_config.dg_soc_off_threshold

        data = SimulationHourlyChartResponse(
            simulation_id=simulation_id,
            hourly_data=hourly_data,
            curtailed_mwh=round(total_curtailed_mwh, 2),
            curtailed_pct=curtailed_pct,
            avg_soc_pct=avg_soc_pct,
            total_delivery_hours=total_delivery_hours,
            total_dg_hours=total_dg_hours,
            dg_on_pct=dg_on_pct,
            dg_off_pct=dg_off_pct,
        )

        return Res.success(
            status_code="S-20041", data=data.model_dump(mode="json", by_alias=True)
        )

    async def export_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        sort: Optional[List[str]] = None,
    ):
        result = await bess_db.execute(
            select(CustomSimulationJob)
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.CUSTOM_CONF_HOURLY_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after="Action: Custom Configuration Hourly Performance Exported",
        )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_hourly_result_csv(
                custom_job_id=simulation_job.job_id,
                bess_db=bess_db,
                start_time=start_time,
                end_time=end_time,
                sort=sort,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="bess_hourly_{simulation_id}.csv"'
            },
        )

    async def get_monthly_simulation_result(
        self,
        simulation_id: int,
        months: Optional[list[Month]],
        sort: Optional[str],
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        yield_per: int = 1000,
    ):
        result = await bess_db.execute(
            select(CustomSimulationJob)
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        stmt = select(SimulationHourlyResult).where(
            SimulationHourlyResult.custom_job_id == simulation_job.job_id,
        )

        if months:
            stmt = stmt.where(
                extract(
                    "month", SimulationHourlyResult.timestamp.op("AT TIME ZONE")("UTC")
                ).in_(months)
            )

        stmt = stmt.execution_options(yield_per=yield_per)
        hourly_result = await bess_db.stream(stmt)

        hourly_data, year = await self.__aggregate_monthly_data(result=hourly_result)

        data = MonthlySimulationResponse(
            simulation_id=simulation_id, year=year, result=hourly_data
        )

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.CUSTOM_CONF_RESULT_VIEWED.value,
            resource_id=resource_id,
            before=None,
            after="Action: Detailed Analysis Page Opened",
        )

        await bess_db.commit()

        if sort in ("month", "-month"):
            descending = sort.startswith("-")
            data.result.sort(
                key=lambda metric: metric.month_int,
                reverse=descending,
            )

        return Res.success(status_code="S-20040", data=data.model_dump(mode="json"))

    async def export_monthly_simulation_results(
        self,
        simulation_id: int,
        months: Optional[list[Month]],
        sort: Optional[str],
        current_user: dict,
        resource_id: str,
        bess_db: AsyncSession,
    ):
        result = await bess_db.execute(
            select(CustomSimulationJob)
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.status == SimulationJobStatus.COMPLETED,
            )
            .order_by(desc(CustomSimulationJob.created_at))
        )
        simulation_job = result.scalars().first()

        if not simulation_job:
            return Res.error(
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.CUSTOM_CONF_MONTHLY_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after="Action: Custom Configuration Monthly Performance Exported",
        )

        await bess_db.commit()

        return StreamingResponse(
            self._generate_monthly_result_csv(
                simulation_job_id=simulation_job.job_id,
                months=months,
                sort=sort,
                bess_db=bess_db,
            ),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="bess_monthly_{simulation_id}.csv"'
            },
        )
