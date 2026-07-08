from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from fastapi.encoders import jsonable_encoder
from constants.enums import (
    PSPAuditLogModules,
    PSPAuditLogScenario,
    SimulationJobStatus,
    SimulationLogStep,
    SimulationSetupProgress,
)
from models.simulation_model import (
    GreenEnergyAnalysisConfiguration,
    GreenSizingSimulationJob,
)
from dtos.simulation_dto import (
    GreenEnergyConfig,
    GreenEnergyConfigResponse,
)
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    progress_simulation_setup,
)


class GreenEnergyConfigService:
    async def create_or_update_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: GreenEnergyConfig,
        current_user: dict,
        resource_id: str,
    ):

        if (
            payload.bess_min > payload.bess_max
            or payload.solar_min > payload.solar_max
            or payload.dg_min > payload.dg_max
            or (payload.solar_max - payload.solar_min) % payload.solar_step != 0
            or (payload.dg_max - payload.dg_min) % payload.dg_step_size != 0
        ):
            return Res.error(
                status_code="E-20056",
                message="Invalid parameter value.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = await bess_db.execute(
            select(GreenEnergyAnalysisConfiguration).where(
                GreenEnergyAnalysisConfiguration.simulation_id == simulation_id
            )
        )
        green_config = result.scalar_one_or_none()
        before_config = {}

        payload_dict = payload.model_dump()

        if green_config:
            before_config = jsonable_encoder(green_config)
            for key, value in payload_dict.items():
                setattr(green_config, key, value)
            status_code = "S-20046"
            action = PSPAuditLogScenario.GREEN_ENERGY_CONF_EDITED.value
            after_config = jsonable_encoder(green_config)
        else:
            green_config = GreenEnergyAnalysisConfiguration(
                simulation_id=simulation_id, **payload_dict
            )
            bess_db.add(green_config)
            status_code = "S-20045"
            action = PSPAuditLogScenario.GREEN_ENERGY_CONF_CREATED.value
            after_config = jsonable_encoder(green_config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.GREEN_ENERGY_CONFIG,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id,
            db=bess_db,
            include_sizing_job=False,
            include_custom_job=False,
            include_multi_job=False,
            include_green_job=True,
            include_detailed_green_job=True,
        )

        if before_config != after_config:
            await bess_db.execute(
                update(GreenSizingSimulationJob)
                .where(GreenSizingSimulationJob.simulation_id == simulation_id)
                .values(status=SimulationJobStatus.OUTDATED)
            )

        await compare_and_log(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),  # type: ignore
            module=PSPAuditLogModules.SIMULATION.value,
            action=action,
            resource_id=resource_id,
            before=before_config,
            after=after_config,
            remove_id=True,
            sim_module_type=SimulationLogStep.GREEN_ENERGY_CONFIGURATION,
        )

        await bess_db.commit()
        await bess_db.refresh(green_config)

        data = GreenEnergyConfigResponse.model_validate(green_config)

        return Res.success(status_code=status_code, data=data.model_dump(mode="json"))

    async def get_green_config(self, bess_db: AsyncSession, simulation_id: int):
        query = select(GreenEnergyAnalysisConfiguration).where(
            GreenEnergyAnalysisConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        green_config = result.scalar_one_or_none()

        if not green_config:
            return Res.error(
                status_code="E-20055",
                message="Green energy analysis configuration not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = GreenEnergyConfigResponse.model_validate(green_config)
        return Res.success(status_code="S-20047", data=data.model_dump(mode="json"))
