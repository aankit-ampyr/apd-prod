from datetime import date
from typing import Optional
from redis.asyncio import Redis

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from constants.enums import LoadPattern, SimulationLogStep, SimulationSetupProgress
from dtos import LoadProfilePayload, LoadProfileResponse, PatternInfo
from dtos.simulation_dto import CONFIG_MAP, DataPoint, LoadProfileOutput
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from models import LoadProfile
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from .service_support import (
    depreciate_simulation_job,
    progress_simulation_setup,
)


class LoadSimulationService:
    DAYS_A_YEAR = 365  # INFO: Days per year.
    HOURS_A_DAY = 24  # INFO: Hours per day.
    MONTHS_A_YEAR = 12  # INFO: Months per year.

    def _get_hours(self, start_time, end_time) -> int:
        if start_time == end_time:
            return 0
        else:
            return (end_time - start_time) % self.HOURS_A_DAY

    def _get_days(self, start_month, end_month) -> int:
        if start_month == end_month:
            return self.DAYS_A_YEAR
        else:
            start = date(2026, start_month, 1)
            year = 2026

            if end_month < start_month:
                year = 2027

            _end_month = end_month + 1

            if _end_month > 12:
                _end_month = 1
                year = 2027

            end = date(year, _end_month, 1)

            return (end - start).days

    def _get_data_list(self, start, load, hours) -> list[float]:
        daily_schedule = [0.0] * self.HOURS_A_DAY
        for i in range(hours):
            current_hour = (start + i) % self.HOURS_A_DAY
            daily_schedule[current_hour] = load

        return daily_schedule

    def _get_data_points(self, data_list: list[float]) -> list[DataPoint]:
        return [
            DataPoint(hour=i, value=round(data_list[i], 2))
            for i in range(self.HOURS_A_DAY)
        ]

    def _map_to_load_profile_response(
        self, load_profile: LoadProfile
    ) -> Optional[LoadProfileResponse]:
        pattern_enum = LoadPattern(load_profile.pattern)
        config_class = CONFIG_MAP.get(pattern_enum)

        if not config_class:
            return None

        output = LoadProfileOutput(
            peak_load=load_profile.peak_load,
            total_hours=load_profile.total_hours,
            total_energy=load_profile.total_energy,
            hour_percentage=load_profile.hour_percentage,
            graph_data_points=load_profile.graph_data_points,
        )

        return LoadProfileResponse(
            id=load_profile.id,
            pattern=PatternInfo(id=pattern_enum, label=pattern_enum.name),
            config=config_class(**load_profile.config),
            output=output,
            total_hours=load_profile.total_hours,
        )

    def _compute_load_profile(
        self, payload: LoadProfilePayload
    ) -> Optional[LoadProfileResponse]:
        if payload.pattern == LoadPattern.CONSTANT_LOAD:
            peak_load = payload.config.load_mw
            data_list = self._get_data_list(
                start=0, load=peak_load, hours=self.HOURS_A_DAY
            )
            total_energy = self.DAYS_A_YEAR * self.HOURS_A_DAY * payload.config.load_mw
            load_hours = self.DAYS_A_YEAR * self.HOURS_A_DAY
            hour_percentage = (load_hours / 8760) * 100

        elif (
            payload.pattern == LoadPattern.DAY_ONLY_LOAD
            or payload.pattern == LoadPattern.NIGHT_ONLY_LOAD
        ):
            hours = self._get_hours(payload.config.start_time, payload.config.end_time)
            peak_load = payload.config.load_mw
            data_list = self._get_data_list(
                payload.config.start_time, load=peak_load, hours=hours
            )
            total_energy = self.DAYS_A_YEAR * hours * payload.config.load_mw
            load_hours = self.DAYS_A_YEAR * hours
            hour_percentage = (load_hours / 8760) * 100

        elif payload.pattern == LoadPattern.SEASONAL_LOAD:
            hours = self._get_hours(payload.config.start_time, payload.config.end_time)
            days = self._get_days(payload.config.start_month, payload.config.end_month)

            peak_load = payload.config.load_mw
            data_list = self._get_data_list(
                start=payload.config.start_time, load=peak_load, hours=hours
            )
            total_energy = days * hours * payload.config.load_mw
            load_hours = days * hours
            hour_percentage = (load_hours / 8760) * 100

        elif payload.pattern == LoadPattern.CUSTOM_WINDOW_LOAD:
            daily_schedule = [0.0] * self.HOURS_A_DAY
            peak_load = 0.0

            for window in payload.config.windows:
                start = window.start_time
                end = window.end_time
                load = window.load_mw
                hours = self._get_hours(start, end)

                peak_load = max(peak_load, load)

                for i in range(hours):
                    current_hour = (start + i) % self.HOURS_A_DAY
                    daily_schedule[current_hour] = load

            data_list = daily_schedule
            total_energy = self.DAYS_A_YEAR * sum(daily_schedule)
            load_hours = self.DAYS_A_YEAR * sum(load > 0 for load in daily_schedule)
            hour_percentage = (load_hours / 8760) * 100

        else:
            return None

        output = LoadProfileOutput(
            peak_load=peak_load,
            total_hours=load_hours,
            total_energy=round(total_energy, 2),
            hour_percentage=round(hour_percentage, 2),
            graph_data_points=data_list,
        )
        return LoadProfileResponse(
            pattern=PatternInfo(id=payload.pattern, label=payload.pattern.name),
            config=payload.config,
            output=output,
            total_hours=load_hours,
        )

    async def compute_load_profile(self, payload: LoadProfilePayload):
        compute_result = self._compute_load_profile(payload=payload)

        if compute_result is None:
            return Res.error(
                status_code="E-20017",
                message="Load profile calculation failed. Please try again.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        return Res.success(
            status_code="S-20004",
            data=compute_result.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def compute_and_save_load_profile(
        self,
        simulation_id: int,
        payload: LoadProfilePayload,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
        redis: Redis,
    ):
        result = await bess_db.execute(
            select(LoadProfile).where(LoadProfile.simulation_id == simulation_id)
        )
        existing_load_profile = result.scalar_one_or_none()

        # when existing load config matches the incoming config
        if existing_load_profile:
            if (
                existing_load_profile.config == payload.config
                and existing_load_profile.pattern == payload.pattern
            ):
                data = LoadProfileResponse.model_validate(existing_load_profile)
                if data is None:
                    return Res.error(
                        status_code="E-20001",
                        message="Oops! Something went wrong",
                        http_status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
                return Res.success(
                    status_code="S-20004",
                    data=data.model_dump(mode="json"),
                    http_status_code=status.HTTP_200_OK,
                )

        computed_load = self._compute_load_profile(payload=payload)

        if not computed_load:
            return Res.error(
                status_code="E-20017",
                message="Load profile calculation failed. Please try again.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        before_config = {}

        # Update the existing load config
        if existing_load_profile:
            before_config = existing_load_profile.config
            before_config["pattern"] = existing_load_profile.pattern

            update_data = {
                "pattern": computed_load.pattern.id,
                "config": computed_load.config.model_dump(),
                "peak_load": computed_load.output.peak_load,
                "total_energy": computed_load.output.total_energy,
                "total_hours": computed_load.output.total_hours,
                "hour_percentage": computed_load.output.hour_percentage,
                "graph_data_points": [
                    dp.value
                    for dp in computed_load.output.data_points  # type: ignore
                ],
            }

            stmt = (
                update(LoadProfile)
                .where(LoadProfile.simulation_id == simulation_id)
                .values(**update_data)
                .returning(LoadProfile)
            )
            result = await bess_db.execute(stmt)
            updated_load_profile = result.scalar_one()

            after_config = updated_load_profile.config
            after_config["pattern"] = updated_load_profile.pattern

            computed_load.id = existing_load_profile.id

        # Write a new load config
        else:
            new_load_model = LoadProfile(
                simulation_id=simulation_id,
                pattern=computed_load.pattern.id,
                config=computed_load.config.model_dump(),
                peak_load=computed_load.output.peak_load,
                total_energy=computed_load.output.total_energy,
                total_hours=computed_load.output.total_hours,
                hour_percentage=computed_load.output.hour_percentage,
                graph_data_points=[
                    data_point.value
                    for data_point in computed_load.output.data_points  # type: ignore
                ],
            )

            after_config = new_load_model.config
            after_config["pattern"] = new_load_model.pattern

            bess_db.add(new_load_model)
            await bess_db.flush()

            computed_load.id = new_load_model.id

        # Update simulation progress
        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.LOAD_PROFILE,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id,
            db=bess_db,
            include_green_job=True,
            include_detailed_green_job=True,
        )
        await compare_and_log(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=AuditLogModules.SIMULATION.value,
            action=AuditLogScenario.SIMULATION_EDITED.value,
            resource_id=resource_id,
            before=before_config,
            after=after_config,
            sim_module_type=SimulationLogStep.SYSTEM_SETUP,
            redis=redis,
        )

        await bess_db.commit()

        return Res.success(
            status_code="S-20004",
            data=computed_load.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def get_load_profile(self, simulation_id: int, bess_db: AsyncSession):
        result = await bess_db.execute(
            select(LoadProfile).where(LoadProfile.simulation_id == simulation_id)
        )
        load_profile = result.scalar_one_or_none()

        if not load_profile:
            return Res.error(
                status_code="E-20026",
                message="Simulation not found",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        # data = self._map_to_load_profile_response(load_profile=load_profile)

        # if data is None:
        #     return Res.error(
        #         status_code="E-20001", message="Oops! Something went wrong"
        #     )
        data = LoadProfileResponse.model_validate(load_profile)

        return Res.success(
            status_code="S-20004",
            data=data.model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )
