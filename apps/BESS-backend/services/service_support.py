from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from constants.enums import SimulationSetupProgress, SimulationJobStatus
from models.simulation_model import (
    CustomSimulationJob,
    DetailGreenSimulationJob,
    GreenSizingSimulationJob,
    MultiYearSimulationJob,
    Simulation,
    SimulationJob,
)
from utils.response_utils import Res


async def progress_simulation_setup(
    simulation_id: int,
    to: SimulationSetupProgress,
    db: AsyncSession,
    commit: bool = True,
):
    response = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    simulation = response.scalar_one_or_none()

    if not simulation:
        return Res.error(status_code="E-20043", message="Simulation not found", http_status_code=status.HTTP_404_NOT_FOUND)

    if simulation.step < to:
        simulation.step = to

    simulation.edit_step = to

    await db.flush()
    if commit:
        await db.commit()


async def depreciate_simulation_job(
    simulation_id: int,
    db: AsyncSession,
    include_sizing_job: bool = True,
    include_custom_job: bool = True,
    include_multi_job: bool = True,
    include_green_job: bool = False,
    include_detailed_green_job: bool = False,
    commit: bool = True,
):
    if include_sizing_job:
        await db.execute(
            update(SimulationJob)
            .where(SimulationJob.simulation_id == simulation_id)
            .values(status=SimulationJobStatus.OUTDATED)
        )

    if include_custom_job:
        await db.execute(
            update(CustomSimulationJob)
            .where(CustomSimulationJob.simulation_id == simulation_id)
            .values(status=SimulationJobStatus.OUTDATED)
        )

    if include_multi_job:
        await db.execute(
            update(MultiYearSimulationJob)
            .where(MultiYearSimulationJob.simulation_id == simulation_id)
            .values(status=SimulationJobStatus.OUTDATED)
        )

    if include_green_job:
        await db.execute(
            update(GreenSizingSimulationJob)
            .where(GreenSizingSimulationJob.simulation_id == simulation_id)
            .values(status=SimulationJobStatus.OUTDATED)
        )

    if include_detailed_green_job:
        await db.execute(
            update(DetailGreenSimulationJob)
            .where(DetailGreenSimulationJob.simulation_id == simulation_id)
            .values(status=SimulationJobStatus.OUTDATED)
        )

    await db.flush()
    if commit:
        await db.commit()


#
# async def ensure_simulation_write_access(
#     db: AsyncSession,
#     simulation_id: int,
#     current_user: dict,
# ) -> Tuple[Optional[Simulation], Optional[Res]]:
#     query = (
#         select(Simulation)
#         .options(selectinload(Simulation.project))
#         .where(Simulation.id == simulation_id)
#     )
#     result = await db.execute(query)
#     simulation = result.scalar_one_or_none()
#
#     if not simulation or not simulation.project or simulation.project.is_deleted:
#         return None, Res.error(status_code="E-20043", message="Simulation not found")
#
#     user_id = int(current_user.get("id"))
#     user_role = current_user.get("role")
#     project = simulation.project
#
#     is_authorized = (
#         user_role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
#         or project.created_by_user_id == user_id
#         or project.owned_by_user_id == user_id
#     )
#
#     if not is_authorized:
#         return simulation, Res.error(
#             status_code="E-20004",
#             message="Not authorized to perform the action.",
#         )
#
#     return simulation, None
