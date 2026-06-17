from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder
from constants.enums import SimulationLogStep, SimulationSetupProgress
from dtos.simulation_dto import CustomSimulationConfigPayload
from models.simulation_model import CustomSimulationConfig, DieselGeneratorConfiguration
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    ensure_simulation_write_access,
    progress_simulation_setup,
)


class CustomSimConfigService:
    async def create_or_update_custom_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: CustomSimulationConfigPayload,
        current_user: dict,
        resource_id: str,
    ):
        simulation, auth_error = await ensure_simulation_write_access(
            db=bess_db, simulation_id=simulation_id, current_user=current_user
        )
        if auth_error:
            return auth_error

        result = await bess_db.execute(
            select(DieselGeneratorConfiguration).where(
                DieselGeneratorConfiguration.simulation_id == simulation_id
            )
        )
        dg = result.scalar_one_or_none()

        if not dg:
            return Res.error(
                status_code="E-20040",
                message="DG Config not found.",
                http_status_code=404,
            )

        if dg.is_included and payload.dg_capacity is None:
            return Res.error(
                status_code="E-20044",
                message="Missing required parameters",
                http_status_code=400,
            )

        query = select(CustomSimulationConfig).where(
            CustomSimulationConfig.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        custom_config = result.scalar_one_or_none()
        before_config = {}

        payload_dict = payload.model_dump(
            exclude_unset=True, exclude={"id", "simulation_id", "created_at"}
        )

        # WARNING: need to check if the selected bess size exint in BessContainerCongi
        if custom_config:
            before_config = jsonable_encoder(custom_config)
            for key, value in payload_dict.items():
                setattr(custom_config, key, value)
            after_config = jsonable_encoder(custom_config)
        else:
            custom_config = CustomSimulationConfig(
                simulation_id=simulation_id,
                duration_class=payload.duration_class,
                bess_capacity=payload.bess_capacity,
                dg_capacity=payload.dg_capacity,
            )
            bess_db.add(custom_config)
            after_config = jsonable_encoder(custom_config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.CUSTOM_CONFIGURATION,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id, db=bess_db, include_sizing_job=False
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
            sim_module_type=SimulationLogStep.CUSTOM_CONFIGURATION,
        )

        await bess_db.commit()
        await bess_db.refresh(custom_config)

        data = CustomSimulationConfigPayload.model_validate(custom_config)

        return Res.success(status_code="S-20025", data=data.model_dump(mode="json"))

    async def get_custom_config(self, bess_db: AsyncSession, simulation_id: int):
        query = select(CustomSimulationConfig).where(
            CustomSimulationConfig.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(
                status_code="E-20053",
                message="Custom configuratrion not found.",
                http_status_code=404,
            )

        data = CustomSimulationConfigPayload.model_validate(config)
        return Res.success(status_code="S-20026", data=data.model_dump(mode="json"))
