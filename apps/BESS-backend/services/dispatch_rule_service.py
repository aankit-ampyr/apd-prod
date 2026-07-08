from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from fastapi.encoders import jsonable_encoder
from models import BESSContainerConfiguration, DispatchRuleConfiguration
from dtos.simulation_dto import DispatchRulePayload, DispatchRuleResponse
from constants.enums import (
    DGRunScheduleMode,
    DGTriggerType,
    SimulationLogStep,
    SimulationSetupProgress,
)
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    progress_simulation_setup,
)


class DispatchRuleService:
    async def _get_bess_soc_bounds(
        self, simulation_id: int, bess_db: AsyncSession
    ) -> tuple[int, int]:
        query = select(BESSContainerConfiguration).where(
            BESSContainerConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        bess_config = result.scalar_one_or_none()

        if not bess_config:
            return 0, 100

        min_soc = int(bess_config.bess_min_soc)
        max_soc = int(bess_config.bess_max_soc)

        # Safety guards (should already be enforced by DTO validators)
        min_soc = max(0, min(100, min_soc))
        max_soc = max(0, min(100, max_soc))
        if min_soc > max_soc:
            min_soc, max_soc = 0, 100

        return min_soc, max_soc

    def _normalize_payload(
        self, payload: DispatchRulePayload, *, bess_min_soc: int, bess_max_soc: int
    ) -> DispatchRulePayload:
        payload_dict = payload.model_dump()

        # If DG is disabled, clear all other fields
        if payload.dg_run_schedule_mode == DGRunScheduleMode.DISABLED:
            for key in payload_dict.keys():
                if key != "dg_run_schedule_mode":
                    payload_dict[key] = None
            return DispatchRulePayload(**payload_dict)

        # Clear SOC thresholds when trigger is not SOC based
        if payload.dg_trigger_type != DGTriggerType.SOC_THRESHOLD:
            payload_dict["dg_soc_on_threshold"] = None
            payload_dict["dg_soc_off_threshold"] = None

        if payload.dg_trigger_type == DGTriggerType.SOC_THRESHOLD:
            min_soc = bess_min_soc
            max_soc = bess_max_soc
            default_on = max(30, int(min_soc))
            current_on = payload_dict.get("dg_soc_on_threshold")
            # Reset if invalid or missing
            if (
                current_on is None
                or current_on < min_soc
                or current_on > (max_soc - 10)
            ):
                payload_dict["dg_soc_on_threshold"] = default_on
            else:
                payload_dict["dg_soc_on_threshold"] = current_on

            soc_on = payload_dict["dg_soc_on_threshold"]

            # OFF logic: keep a valid user value; otherwise default/clamp
            current_off = payload_dict.get("dg_soc_off_threshold")
            if current_off is None or current_off < soc_on or current_off > max_soc:
                if soc_on + 10 < 80 and 80 < max_soc:
                    payload_dict["dg_soc_off_threshold"] = 80
                else:
                    payload_dict["dg_soc_off_threshold"] = min(soc_on + 10, max_soc)

        # Clear cycle charging fields when disabled
        if payload.is_cycle_charging_enabled is not True:
            payload_dict["min_load"] = None
            payload_dict["stop_soc"] = None
        else:
            # Ensure stop_soc stays within valid bounds given BESS SOC range.
            # If user saved an out-of-range value previously (e.g. 80 when max is 60),
            # normalize it immediately so UI doesn't show an impossible default.
            on_threshold = payload_dict.get("dg_soc_on_threshold")
            stop_soc = payload_dict.get("stop_soc")
            if stop_soc is not None and stop_soc > bess_max_soc:
                payload_dict["stop_soc"] = min(80, bess_max_soc)
            elif on_threshold is not None and stop_soc is not None:
                min_stop = on_threshold + 20
                if stop_soc < min_stop:
                    payload_dict["stop_soc"] = min(80, bess_max_soc)

        return DispatchRulePayload(**payload_dict)

    def _validate_payload(
        self, payload: DispatchRulePayload, *, bess_min_soc: int, bess_max_soc: int
    ):
        # 1. If DG is disabled, no further validation is required
        if payload.dg_run_schedule_mode == DGRunScheduleMode.DISABLED:
            return None

        # 2. DG trigger type must be provided
        if payload.dg_trigger_type is None:
            return Res.error(
                status_code="E-20041",
                message="DG trigger type is required when DG is enabled.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Validate allowed trigger types based on schedule mode
        allowed_triggers = {
            DGRunScheduleMode.ANYTIME: {
                DGTriggerType.SOLAR_BATTERY_DEFICIT,
                DGTriggerType.SOC_THRESHOLD,
            },
            DGRunScheduleMode.DAY_ONLY: {
                DGTriggerType.SOC_THRESHOLD,
            },
            DGRunScheduleMode.NIGHT_ONLY: {
                DGTriggerType.SOC_THRESHOLD,
                DGTriggerType.PREEMPTIVE_NIGHT,
            },
            DGRunScheduleMode.CUSTOM_BLACKOUT: {
                DGTriggerType.SOLAR_BATTERY_DEFICIT,
                DGTriggerType.SOC_THRESHOLD,
            },
        }

        if payload.dg_trigger_type not in allowed_triggers.get(
            payload.dg_run_schedule_mode, set()
        ):
            return Res.error(
                status_code="E-20041",
                message="Invalid DG trigger type for the selected DG schedule mode.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        # 4. Validate start and end times when required
        if payload.dg_run_schedule_mode != DGRunScheduleMode.ANYTIME:
            if payload.dg_start_time is None or payload.dg_end_time is None:
                return Res.error(
                    status_code="E-20041",
                    message="Start and End times are required for the selected DG schedule.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if not (0 <= payload.dg_start_time <= 23) or not (
                0 <= payload.dg_end_time <= 23
            ):
                return Res.error(
                    status_code="E-20041",
                    message="Start and End times must be between 0 and 23.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if payload.dg_start_time == payload.dg_end_time:
                return Res.error(
                    status_code="E-20041",
                    message="Start and End times cannot be the same.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

        # 5. SOC threshold validation
        if payload.dg_trigger_type == DGTriggerType.SOC_THRESHOLD:
            if (
                payload.dg_soc_on_threshold is None
                or payload.dg_soc_off_threshold is None
            ):
                return Res.error(
                    status_code="E-20041",
                    message="SOC thresholds are required for SOC trigger.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if payload.dg_soc_off_threshold < payload.dg_soc_on_threshold:
                return Res.error(
                    status_code="E-20041",
                    message="Invalid parameter passed.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if payload.dg_soc_on_threshold < bess_min_soc:
                return Res.error(
                    status_code="E-20041",
                    message="dg_soc_on_threshold must be within configured BESS SOC bounds.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if payload.dg_soc_off_threshold > bess_max_soc:
                return Res.error(
                    status_code="E-20041",
                    message="dg_soc_off_threshold must be within configured BESS SOC bounds.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

        # 6. Cycle charging validation
        if payload.is_cycle_charging_enabled:
            if payload.min_load is None or payload.stop_soc is None:
                return Res.error(
                    status_code="E-20041",
                    message="min_load and stop_soc are required when cycle charging is enabled.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if not (50 <= payload.min_load <= 90):
                return Res.error(
                    status_code="E-20041",
                    message="min_load must be between 50% and 90%.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if not (0 <= payload.stop_soc <= 100):
                return Res.error(
                    status_code="E-20041",
                    message="stop_soc must be between 0% and 100%.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            # stop_soc should be at least 20% higher than dg_soc_on_threshold
            if (
                payload.dg_soc_on_threshold is not None
                and payload.stop_soc < payload.dg_soc_on_threshold + 20
            ):
                return Res.error(
                    status_code="E-20041",
                    message="stop_soc must be at least 20% higher than dg_soc_on_threshold.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

            if payload.stop_soc > bess_max_soc:
                return Res.error(
                    status_code="E-20041",
                    message="stop_soc must be within configured BESS SOC bounds.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

        return None

    async def upsert_dispatch_rule(
        self,
        simulation_id: int,
        payload: DispatchRulePayload,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
    ):
        bess_min_soc, bess_max_soc = await self._get_bess_soc_bounds(
            simulation_id=simulation_id, bess_db=bess_db
        )

        # Normalize payload
        payload = self._normalize_payload(
            payload, bess_min_soc=bess_min_soc, bess_max_soc=bess_max_soc
        )

        # Validate payload
        validation_error = self._validate_payload(
            payload, bess_min_soc=bess_min_soc, bess_max_soc=bess_max_soc
        )
        if validation_error:
            return validation_error

        query = select(DispatchRuleConfiguration).where(
            DispatchRuleConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()
        before_config = {}

        payload_dict = payload.model_dump()

        if config:
            before_config = jsonable_encoder(config)
            for key, value in payload_dict.items():
                setattr(config, key, value)
            after_config = jsonable_encoder(config)
        else:
            config = DispatchRuleConfiguration(
                simulation_id=simulation_id, **payload_dict
            )
            bess_db.add(config)
            after_config = jsonable_encoder(config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.DISPATCH_RULES,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id, db=bess_db, include_green_job=True
        )
        await compare_and_log(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),
            module=AuditLogModules.SIMULATION.value,
            action=AuditLogScenario.SIMULATION_EDITED.value,
            resource_id=resource_id,
            before=before_config,
            after=after_config,
            remove_id=True,
            sim_module_type=SimulationLogStep.DISPATCH_RULE,
        )

        await bess_db.commit()
        await bess_db.refresh(config)

        return Res.success(
            status_code="S-20023",
            data=DispatchRuleResponse.model_validate(config).model_dump(mode="json"),
        )

    async def get_dispatch_rule(self, simulation_id: int, bess_db: AsyncSession):
        query = select(DispatchRuleConfiguration).where(
            DispatchRuleConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(
                status_code="E-20041",
                message="Dispatch rule configuration not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        bess_min_soc, bess_max_soc = await self._get_bess_soc_bounds(
            simulation_id=simulation_id, bess_db=bess_db
        )
        normalized_payload = self._normalize_payload(
            DispatchRulePayload.model_validate(config, from_attributes=True),
            bess_min_soc=bess_min_soc,
            bess_max_soc=bess_max_soc,
        )
        normalized_response = DispatchRuleResponse(
            **normalized_payload.model_dump(),
            id=config.id,
            simulation_id=config.simulation_id,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )

        return Res.success(
            status_code="S-20024",
            data=normalized_response.model_dump(mode="json"),
        )
