import io
import csv
from typing import Optional
from fastapi.responses import StreamingResponse
from fastapi import status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis


from constants.enums import (
    PSPAuditLogModules,
    PSPAuditLogScenario,
    SimulationJobStatus,
    SimulationSetupProgress,
    SimulationStatus,
)

from dtos.simulation_dto import (
    EnergyInMetrics,
    EnergyOutMetrics,
    MultiYearProjectionResponse,
    MultiYearProjectionResult,
    MultiYearSimulationProgress,
    MultiYearSummary,
)
from models.simulation_model import (
    BESSContainerConfiguration,
    MultiYearSimulationJob,
    MultiYearSimulationResult,
    Simulation,
)
from utils.log_utils import audit_logs
from utils.response_utils import Res
from simulation_engine import multi_year_projection_sim_task
from simulation_engine.utils import stop_simulation as stop_sim_util


class RunMultiYearSimulationService:
    async def __aggregate_summary_data(
        self,
        data: list[MultiYearProjectionResult],
        bess_db: AsyncSession,
    ) -> Optional[MultiYearSummary]:
        if not data:
            return None

        # Sort the data by year to ensure correct chronological sequence
        sorted_data = sorted(data, key=lambda x: x.year)
        no_of_years = len(sorted_data)

        # Get BESS configuration to retrieve initial SOC
        simulation_id = sorted_data[0].simulation_id
        result = await bess_db.execute(
            select(BESSContainerConfiguration).where(
                BESSContainerConfiguration.simulation_id == simulation_id
            )
        )
        bess_config = result.scalar_one_or_none()
        bess_initial_soc = bess_config.bess_initial_soc if bess_config else 0.0

        # Calculations for EnergyInMetrics
        solar_total = round(sum(x.solar_generation for x in sorted_data), 2)
        solar_avg = round(solar_total / no_of_years, 2) if no_of_years > 0 else 0.0

        dg_total = round(sum(x.dg_generation for x in sorted_data), 2)
        dg_avg = round(dg_total / no_of_years, 2) if no_of_years > 0 else 0.0

        initial_capacity = round(sorted_data[0].bess_mwh, 2)
        initial_bess_energy = round(initial_capacity * (bess_initial_soc / 100.0), 2)

        # Fetch output-side variables for input calculation
        total_bess_to_load = round(sum(x.bess_to_load for x in sorted_data), 2)
        charging_loss_mwh = round(sum(x.charging_loss for x in sorted_data), 2)
        discharging_loss_mwh = round(sum(x.discharging_loss for x in sorted_data), 2)
        degradation_loss_mwh = sum(x.degradation_loss for x in sorted_data)

        # INFO: Temporary fix(require change in multi year simulaton).
        degradation_loss_mwh -= sorted_data[-1].degradation_loss

        final_bess_soc = round(sorted_data[-1].final_soc_pct, 2)
        final_bess_capacity = sorted_data[-1].bess_mwh
        final_bess_energy = round(final_bess_capacity * (final_bess_soc / 100.0), 2)

        # total_bess_energy in EnergyInMetrics (energy charged into the battery)
        total_bess_energy_in = round(
            max(
                0.0,
                total_bess_to_load
                + charging_loss_mwh
                + discharging_loss_mwh
                + final_bess_energy
                - initial_bess_energy,
            ),
            2,
        )

        total_energy_in = round(solar_total + dg_total + initial_bess_energy, 2)

        energy_in = EnergyInMetrics(
            solar_avg=solar_avg,
            solar_total=solar_total,
            dg_avg=dg_avg,
            dg_total=dg_total,
            initial_capacity=initial_capacity,
            initial_bess_soc=bess_initial_soc,
            initial_bess_energy=initial_bess_energy,
            total_bess_energy=total_bess_energy_in,
            total_energy=total_energy_in,
        )

        # Calculations for EnergyOutMetrics
        total_solar_to_load = round(sum(x.solar_to_load for x in sorted_data), 2)
        total_dg_to_load = round(sum(x.dg_to_load for x in sorted_data), 2)
        total_energy_to_load = round(sum(x.energy_to_load for x in sorted_data), 2)

        solar_curtailed_mwh = round(sum(x.solar_curtailed for x in sorted_data), 2)
        solar_curtailed_pct = (
            round((solar_curtailed_mwh / solar_total) * 100.0, 2)
            if solar_total > 0
            else 0.0
        )

        dg_curtailed_mwh = round(sum(x.dg_curtailed for x in sorted_data), 2)
        dg_curtailed_pct = (
            round((dg_curtailed_mwh / dg_total) * 100.0, 2) if dg_total > 0 else 0.0
        )

        cycle_loss = round(
            charging_loss_mwh + discharging_loss_mwh + degradation_loss_mwh, 2
        )

        total_energy_out = round(
            total_energy_to_load
            + solar_curtailed_mwh
            + dg_curtailed_mwh
            + charging_loss_mwh
            + discharging_loss_mwh
            + degradation_loss_mwh
            + final_bess_energy,
            2,
        )

        energy_out = EnergyOutMetrics(
            total_solar_to_load=total_solar_to_load,
            total_bess_to_load=total_bess_to_load,
            total_dg_to_load=total_dg_to_load,
            total_energy_to_load=total_energy_to_load,
            solar_curtailed_pct=solar_curtailed_pct,
            solar_curtailed_mwh=solar_curtailed_mwh,
            dg_curtailed_pct=dg_curtailed_pct,
            dg_curtailed_mwh=dg_curtailed_mwh,
            charging_loss_mwh=charging_loss_mwh,
            discharging_loss_mwh=discharging_loss_mwh,
            degradation_loss_mwh=degradation_loss_mwh,
            cycle_loss=cycle_loss,
            final_bess_soc=final_bess_soc,
            final_bess_energy=final_bess_energy,
            total_bess_energy=final_bess_capacity,
            total_energy=total_energy_out,
        )

        balance = round(total_energy_in - total_energy_out, 2)

        return MultiYearSummary(
            no_of_years=no_of_years,
            balance=balance,
            energy_in=energy_in,
            energy_out=energy_out,
        )

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

        if simulation.edit_step < SimulationSetupProgress.MULTI_YEAR_PROJECTION_CONFIG:
            return Res.error(
                status_code="E-20062",
                message="Incomplete Simulation configuration.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        sim_job_result = await bess_db.execute(
            select(MultiYearSimulationJob)
            .where(
                MultiYearSimulationJob.simulation_id == simulation.id,
            )
            .with_for_update()
        )

        single_sim_jobs = sim_job_result.scalar_one_or_none()

        before_config = None
        log_action = PSPAuditLogScenario.MULTI_YEAR_SIMULATION_RUN.value

        if single_sim_jobs:
            if single_sim_jobs.status == SimulationJobStatus.COMPLETED:
                return Res.error(
                    status_code="E-20058",
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

            log_action = PSPAuditLogScenario.MULTI_YEAR_SIMULATION_RERUN.value
            before_config = (
                f"Simulation Status: {SimulationJobStatus(single_sim_jobs.status).name}"
            )
            await bess_db.delete(single_sim_jobs)
            await bess_db.flush()

        new_simulation_job = MultiYearSimulationJob(
            simulation_id=simulation.id,
        )
        bess_db.add(new_simulation_job)
        simulation.status = SimulationStatus.IN_PROGRESS

        await bess_db.flush()

        try:
            await multi_year_projection_sim_task.kiq(
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
            status_code="S-20043",
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
            select(MultiYearSimulationJob).where(
                MultiYearSimulationJob.simulation_id == simulation_id,
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
            action=PSPAuditLogScenario.MULTI_YEAR_SIMULATION_STOP.value,
            resource_id=resource_id,
            before=f"Simulation Status: {SimulationJobStatus(simulation_job.status).name}",
            after=f"Simulation Status: {SimulationJobStatus.TERMINATED.name}",
            redis=redis,
        )

        await bess_db.commit()

        return Res.success(
            status_code="S-20045",
            data={"simulation_job_id": simulation_job.job_id},
            http_status_code=status.HTTP_200_OK,
        )

    async def get_simulation_progress(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(MultiYearSimulationJob).where(
                MultiYearSimulationJob.simulation_id == simulation_id,
            )
        )
        simulation_job = result.scalar_one_or_none()

        if not simulation_job:
            return Res.error(
                status_code="E-20047",
                message="Simulation job not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = MultiYearSimulationProgress(
            simulation_job_id=simulation_job.job_id,
            status=SimulationJobStatus(simulation_job.status),
        )

        return Res.success(
            status_code="S-20046",
            data=data.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        redis: Redis,
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
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        custom_order = False

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
            "unserved_mwh": MultiYearSimulationResult.unserved_mwh,
            "solar_gen_during_load": MultiYearSimulationResult.solar_gen_during_load,
            "solar_curtailed_during_load": MultiYearSimulationResult.solar_curtailed_during_load,
            "solar_curtailed": MultiYearSimulationResult.solar_curtailed,
        }

        if sort:
            custom_order = True
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
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        if until_year == 20 and not custom_order:
            await audit_logs(
                db=bess_db,
                user_id=f"USER-{current_user.get('id')}",
                user_role=current_user.get("role"),  # type: ignore
                module=PSPAuditLogModules.SIMULATION.value,
                action=PSPAuditLogScenario.MULTI_YEAR_RESULT_VIEWED.value,
                resource_id=resource_id,
                before=None,
                after="Action: Multi-Year Projection Detailed Analysis Page Opened",
                redis=redis,
            )

        await bess_db.commit()
        results = [
            MultiYearProjectionResult.model_validate(r) for r in simulation_results
        ]
        summary = await self.__aggregate_summary_data(data=results, bess_db=bess_db)

        data = MultiYearProjectionResponse(
            simulation_id=simulation_id, summary=summary, results=results
        )

        return Res.success(
            status_code="S-20044",
            data=data.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

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
            "Unserved (MWh)",
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
            "unserved_mwh": MultiYearSimulationResult.unserved_mwh,
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
                MultiYearSimulationResult.unserved_mwh,
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
        current_user: dict,
        resource_id: str,
        redis: Redis,
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
                status_code="E-20052",
                message="Simulation result not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=PSPAuditLogScenario.MULTI_YEAR_RESULT_EXPORTED.value,
            resource_id=resource_id,
            before=None,
            after="Action: Multi-Year Projection Results Exported",
            redis=redis,
        )

        await bess_db.commit()

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
