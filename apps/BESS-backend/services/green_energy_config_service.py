from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder
from constants.enums import SimulationLogStep, SimulationSetupProgress
from models.simulation_model import GreenEnergyAnalysisConfiguration
from dtos.simulation_dto import GreenEnergyConfig, GreenEnergyConfigResponse
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    ensure_simulation_write_access,
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
        simulation, auth_error = await ensure_simulation_write_access(
            db=bess_db, simulation_id=simulation_id, current_user=current_user
        )
        if auth_error:
            return auth_error

        if (
            payload.bess_min > payload.bess_max
            or payload.solar_min > payload.solar_max
            or payload.dg_min > payload.dg_max
            or (payload.solar_max - payload.solar_min) % payload.solar_step != 0
            or (payload.dg_max - payload.dg_min) % payload.dg_step != 0
        ):
            return Res.error(status_code="E-20056", message="Invalid parameter value.")

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
            after_config = jsonable_encoder(green_config)
        else:
            green_config = GreenEnergyAnalysisConfiguration(
                simulation_id=simulation_id, **payload_dict
            )
            bess_db.add(green_config)
            status_code = "S-20045"
            after_config = jsonable_encoder(green_config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.GREEN_ENERGY_CONFIG,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id, db=bess_db, include_sizing_job=False
        )
        # await compare_and_log(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),
        #     module=AuditLogModules.SIMULATION.value,
        #     action=AuditLogScenario.SIMULATION_EDITED.value,
        #     resource_id=resource_id,
        #     before=before_config,
        #     after=after_config,
        #     remove_id=True,
        #     sim_module_type=SimulationLogStep.CUSTOM_CONFIGURATION,
        # )

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
                http_status_code=404,
            )

        data = GreenEnergyConfigResponse.model_validate(green_config)
        return Res.success(status_code="S-20047", data=data.model_dump(mode="json"))
