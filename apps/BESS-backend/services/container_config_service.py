from typing import Optional

from sqlalchemy import select
from models.simulation_model import (
    BESSContainerConfiguration,
    DispatchRuleConfiguration,
)
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from fastapi.encoders import jsonable_encoder
from dtos.simulation_dto import (
    BessConfigPayload,
    ContainerConfigResponse,
)
from constants.enums import (
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


class ContainerConfigService:
    async def enforce_dispatch_rules(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        min_soc_old: float,
        max_soc_old: float,
        min_soc_new: float,
        max_soc_new: float,
    ):
        # Do not touch this function if you don't understand.
        if min_soc_new == min_soc_old and max_soc_new == max_soc_old:
            print(min_soc_new, min_soc_old, max_soc_new, max_soc_old)
            return

        query = select(DispatchRuleConfiguration).where(
            DispatchRuleConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config: Optional[DispatchRuleConfiguration] = result.scalar_one_or_none()
        if (
            not config
            or config.dg_soc_off_threshold is None
            or config.dg_soc_on_threshold is None
        ):
            return

        modified = False

        if config.dg_soc_on_threshold < min_soc_new:
            config.dg_soc_on_threshold = max(int(min_soc_new), 30)
            modified = True
        if (
            config.dg_soc_off_threshold > max_soc_new
            or config.dg_soc_off_threshold < config.dg_soc_on_threshold + 10
        ):
            config.dg_soc_off_threshold = min(80, int(max_soc_new))
            modified = True

        on_soc_min = config.dg_soc_on_threshold + 20

        if config.stop_soc is not None and on_soc_min < max_soc_new:
            if config.stop_soc < on_soc_min or config.stop_soc > max_soc_new:
                config.stop_soc = min(80, int(max_soc_new))
                modified = True

        if modified:
            await bess_db.flush()

        return

    async def create_or_update_container_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: BessConfigPayload,
        current_user: dict,
        resource_id: str,
    ):
        """
        Creates or updates a BESSContainerConfiguration for a given simulation_id.
        """
        # Check if configuration already exists for the simulation
        query = select(BESSContainerConfiguration).where(
            BESSContainerConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()
        before_config = {}

        if config:
            before_config = jsonable_encoder(config)
            await self.enforce_dispatch_rules(
                bess_db=bess_db,
                simulation_id=simulation_id,
                min_soc_new=payload.bess_min_soc,
                min_soc_old=config.bess_min_soc,
                max_soc_new=payload.bess_max_soc,
                max_soc_old=config.bess_max_soc,
            )
            # Update existing configuration
            config.container_types = [size.value for size in payload.containers]
            config.bess_efficiency = payload.bess_efficiency
            config.bess_min_soc = payload.bess_min_soc
            config.bess_max_soc = payload.bess_max_soc
            config.bess_initial_soc = payload.bess_initial_soc
            config.bess_daily_cycle_limit = payload.bess_daily_cycle_limit

            after_config = jsonable_encoder(config)

        else:
            # Create new configuration
            config = BESSContainerConfiguration(
                simulation_id=simulation_id,
                container_types=[size.value for size in payload.containers],
                bess_efficiency=payload.bess_efficiency,
                bess_min_soc=payload.bess_min_soc,
                bess_max_soc=payload.bess_max_soc,
                bess_initial_soc=payload.bess_initial_soc,
                bess_daily_cycle_limit=payload.bess_daily_cycle_limit,
            )

            after_config = jsonable_encoder(config)

            bess_db.add(config)
            # Update the simulation setup progress

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.BESS_CONTAINER_CONFIG,
            db=bess_db,
        )
        await depreciate_simulation_job(
            simulation_id=simulation_id, db=bess_db, include_green_job=True
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
            remove_id=True,
            sim_module_type=SimulationLogStep.SYSTEM_SETUP,
        )

        await bess_db.commit()
        await bess_db.refresh(config)

        return Res.success(
            status_code="S-20011",
            data=ContainerConfigResponse.model_validate(config).model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )

    async def get_container_config(self, bess_db: AsyncSession, simulation_id: int):
        query = select(BESSContainerConfiguration).where(
            BESSContainerConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(
                status_code="E-20026",
                message="Simulation not found",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        return Res.success(
            status_code="S-20012",
            data=ContainerConfigResponse.model_validate(config).model_dump(mode="json"),
            http_status_code=status.HTTP_200_OK,
        )
