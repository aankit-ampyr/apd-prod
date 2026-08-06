from fastapi import Request, Depends, Path
import redis.asyncio as redis
from sqlalchemy import select
from constants.enums import SimulationSetupProgress, UserRole
from sqlalchemy.orm import joinedload
from models.simulation_model import Simulation
from models.project_model import ProjectUserAssignment
from db.dependencies import get_bess_db
from exceptions import (
    PermissionDenied,
    SimulationNotFound,
    UserNotAuthorized,
    ProjectInactive,
    ProjectArchived,
)


async def get_redis_conn(request: Request) -> redis.Redis:
    return request.app.state.redis


async def validate_simulation_access(
    request: Request, simulation_id: int = Path(...), bess_db=Depends(get_bess_db)
):
    query = (
        select(Simulation)
        .options(joinedload(Simulation.project))
        .where(Simulation.id == simulation_id)
    )
    result = await bess_db.execute(query)
    simulation: Simulation = result.scalar_one_or_none()

    if not simulation:
        raise SimulationNotFound()

    if simulation.project.is_archived:
        raise ProjectArchived()

    if not simulation.project.is_active:
        raise ProjectInactive()

    # Store in request.state for accessibility across the router/controller
    request.state.sim_id = simulation.sim_id
    request.state.last_edited = simulation.edit_step
    request.state.project_id = simulation.project.proj_id

    user = getattr(request.state, "user", None)
    if not user:
        raise UserNotAuthorized("User not authenticated")

    user_id = user.get("id")
    user_role = user.get("role")

    is_authorized = (
        user_role == UserRole.ADMIN
        or simulation.project.created_by_user_id == user_id
        or simulation.project.owned_by_user_id == user_id
    )

    if is_authorized:
        return simulation.project.proj_id

    if "compute" == [segment for segment in request.url.path.split("/") if segment][-1]:
        return simulation.project.proj_id

    if request.method == "GET":
        assignment_result = await bess_db.execute(
            select(ProjectUserAssignment).where(
                ProjectUserAssignment.project_id == simulation.project.id,
                ProjectUserAssignment.user_id == user_id,
            )
        )
        if assignment_result.scalar_one_or_none():
            return simulation.project.proj_id

    raise PermissionDenied()


async def get_resource_id(request: Request):
    """Dependency to retrieve the project_id stored in request.state."""
    sim_id = getattr(request.state, "sim_id", None)
    proj_id = getattr(request.state, "project_id", None)

    return f"{proj_id} ≫ {sim_id}"


async def get_edited_step(request: Request) -> SimulationSetupProgress:
    """Dependency to retrieve the project_id stored in request.state."""
    last_edited = getattr(
        request.state, "last_edited", SimulationSetupProgress.INITIALIZED.value
    )

    return SimulationSetupProgress(last_edited)
