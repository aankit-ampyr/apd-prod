from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from fastapi.encoders import jsonable_encoder
from constants.enums import (
    SimulationJobStatus,
    SimulationLogStep,
    SimulationSetupProgress,
)
from dtos.simulation_dto import DetailGreenResponse, DetailGreenConfigPayload
from models.simulation_model import (
    DetailGreenSimulationConfiguration,
    GreenSizingSimulationJob,
)

from constants.enums import PSPAuditLogModules, PSPAuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    progress_simulation_setup,
)


class DetailGreenConfigService:
    async def create_or_update_detail_green_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: DetailGreenConfigPayload,
        current_user: dict,
        resource_id: str,
    ):

        job_result = await bess_db.execute(
            select(GreenSizingSimulationJob).where(
                GreenSizingSimulationJob.simulation_id == simulation_id
            )
        )
        green_sizing_job = job_result.scalar_one_or_none()

        # WARNING: Need to take care of change request when simulation is running.
        if (
            not green_sizing_job
            or green_sizing_job.status != SimulationJobStatus.COMPLETED
        ):
            return Res.error(
                status_code="E-20059",
                message="Green Sizing simulation not completed",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        query = select(DetailGreenSimulationConfiguration).where(
            DetailGreenSimulationConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        detail_green_config = result.scalar_one_or_none()
        before_config = {}

        if detail_green_config:
            before_config = jsonable_encoder(detail_green_config)
            for key, value in payload.model_dump().items():
                setattr(detail_green_config, key, value)
            after_config = jsonable_encoder(detail_green_config)
            status_code = "S-20052"
        else:
            detail_green_config = DetailGreenSimulationConfiguration(
                simulation_id=simulation_id,
                solar_peak=payload.solar_peak,
                duration_class=payload.duration_class.value,
                bess_capacity=payload.bess_capacity,
                dg_capacity=payload.dg_capacity,
            )
            bess_db.add(detail_green_config)
            after_config = jsonable_encoder(detail_green_config)
            status_code = "S-20051"

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.GREEN_ENERGY_DETAILED_CONFIG,
            db=bess_db,
        )

        await depreciate_simulation_job(
            simulation_id=simulation_id,
            db=bess_db,
            include_sizing_job=False,
            include_custom_job=False,
            include_multi_job=False,
            include_detailed_green_job=True,
        )
        # await compare_and_log(
        #     db=bess_db,
        #     user_id=f"USER-{current_user.get('id')}",
        #     user_role=current_user.get("role"),  # type: ignore
        #     module=PSPAuditLogModules.SIMULATION.value,
        #     action=PSPAuditLogScenario.CUSTOM_CONF_EDITED.value,
        #     resource_id=resource_id,
        #     before=before_config,
        #     after=after_config,
        #     remove_id=True,
        #     sim_module_type=SimulationLogStep.CUSTOM_CONFIGURATION,
        # )

        await bess_db.commit()
        await bess_db.refresh(detail_green_config)

        data = DetailGreenResponse.model_validate(detail_green_config)

        return Res.success(status_code=status_code, data=data.model_dump(mode="json"))

    async def get_detail_green_config(self, bess_db: AsyncSession, simulation_id: int):
        query = select(DetailGreenSimulationConfiguration).where(
            DetailGreenSimulationConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(
                status_code="E-20061",
                message="Detailed green configuration not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        data = DetailGreenResponse.model_validate(config)
        return Res.success(status_code="S-20053", data=data.model_dump(mode="json"))
