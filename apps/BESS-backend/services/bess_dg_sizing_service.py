from typing import Optional
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import status
from fastapi.encoders import jsonable_encoder
from constants.enums import SimulationLogStep, SimulationSetupProgress
from models import BessDgSizingConfiguration, Simulation
from dtos import BessDgSizingPayload, BessDgSizingResponse
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import depreciate_simulation_job, progress_simulation_setup


class BessDGService:
    async def create_or_update_bess_dg_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: BessDgSizingPayload,
        current_user: dict,
        resource_id: str,
        redis: Redis,
    ):
        stmt = (
            select(Simulation)
            .options(joinedload(Simulation.dg_config))
            .where(Simulation.id == simulation_id)
        )
        result = await bess_db.execute(stmt)
        simulation = result.scalar_one_or_none()

        if not simulation:
            return Res.error(
                status_code="E-20043",
                message="Simulation not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        dg = simulation.dg_config
        if not dg:
            return Res.error(
                status_code="E-20040",
                message="DG Config not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        if dg.is_included:
            if (
                payload.dg_max is None
                or payload.dg_min is None
                or payload.dg_step_size is None
            ):
                return Res.error(
                    status_code="E-20044",
                    message="Missing required parameters",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )

        query = select(BessDgSizingConfiguration).where(
            BessDgSizingConfiguration.simulation_id == simulation_id
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
            config = BessDgSizingConfiguration(
                simulation_id=simulation_id, **payload_dict
            )
            bess_db.add(config)
            after_config = jsonable_encoder(config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.BESS_DG_CONFIG,
            db=bess_db,
            commit=False,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id, db=bess_db, commit=False
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
            sim_module_type=SimulationLogStep.SIZING_CONFIGURATION,
            redis=redis,
        )

        await bess_db.commit()
        await bess_db.refresh(config)

        data = BessDgSizingResponse.model_validate(config)

        return Res.success(status_code="S-20025", data=data.model_dump(mode="json"))

    async def get_bess_dg_config(self, bess_db: AsyncSession, simulation_id: int):
        query = select(BessDgSizingConfiguration).where(
            BessDgSizingConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(
                status_code="E-20042",
                message="BESS & DG Sizing configuration not found",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = BessDgSizingResponse.model_validate(config)
        return Res.success(status_code="S-20026", data=data.model_dump(mode="json"))
