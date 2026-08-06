"""
Project Management controller for BESS platform.
Uses BESS DB for projects; User DB for auth.
"""

from typing import Optional

from fastapi import Depends, Request
from redis.asyncio import Redis
from context.dependency import get_redis_conn
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_user_db, get_bess_db, allowed_roles
from dtos.project_dto import ProjectCreate, ProjectUpdate
from services.project_service import ProjectService
from dtos import ReassignProjectRequest, ProjectSearch
from constants.enums import UserRole, SimulationStatus
from services.simulation_service import SimulationService


class ProjectController:
    def __init__(self):
        self.service = ProjectService()
        self.simulation_service = SimulationService()

    async def reassign_project(
        self,
        project_id: int,
        payload: ReassignProjectRequest,
        user_db: AsyncSession = Depends(get_user_db),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.reassign_project(
            bess_db=bess_db,
            user_db=user_db,
            project_id=project_id,
            new_user_id=payload.user_id,
            current_user=current_user,
            redis=redis,
        )

    async def list_project(
        self,
        request: Request,
        search_params: ProjectSearch = Depends(),
        user_db: AsyncSession = Depends(get_user_db),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
                UserRole.VIEWER,
            )
        ),
    ):
        return await self.service.list_project(
            params=search_params,
            user_db=user_db,
            bess_db=bess_db,
            current_admin=current_user,
        )

    async def create_project(
        self,
        payload: ProjectCreate,
        bess_db: AsyncSession = Depends(get_bess_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.create_project(
            payload=payload,
            bess_db=bess_db,
            user_db=user_db,
            current_user=current_user,
            redis=redis,
        )

    async def edit_project(
        self,
        project_id: int,
        payload: ProjectUpdate,
        bess_db: AsyncSession = Depends(get_bess_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST)
        ),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.edit_project(
            project_id=project_id,
            payload=payload,
            bess_db=bess_db,
            user_db=user_db,
            current_user=current_user,
            redis=redis,
        )

    async def delete_project(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.delete_project(
            project_id=project_id,
            bess_db=bess_db,
            current_user=current_user,
            redis=redis,
        )

    async def restore_project(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.restore_project(
            project_id=project_id,
            bess_db=bess_db,
            current_user=current_user,
            redis=redis,
        )

    async def archive_project(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.archive_project(
            project_id=project_id,
            bess_db=bess_db,
            current_user=current_user,
            redis=redis,
        )

    async def unarchive_project(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.unarchive_project(
            project_id=project_id,
            bess_db=bess_db,
            current_user=current_user,
            redis=redis,
        )

    async def initiate_or_fetch_simulation(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.simulation_service.initiate_or_fetch_simulation(
            bess_db=bess_db,
            project_id=project_id,
            user_id=current_user["id"],
            current_user=current_user,
            redis=redis,
        )

    async def list_simulations(
        self,
        project_id: int,
        page: int = 1,
        limit: int = 10,
        sort: str = "asc",
        search: Optional[str] = None,
        status: Optional[SimulationStatus] = None,  # Correct annotation
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGEMENT, UserRole.VIEWER
            )
        ),
    ):
        return await self.service.get_simulation_list(
            bess_db=bess_db,
            project_id=project_id,
            page=page,
            limit=limit,
            sort=sort,
            search=search,
            status=status,
            start_date=start_date,
            end_date=end_date,
            current_user=current_user,
        )

    async def initiate_simulation(
        self,
        project_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.service.initiate_simulation(
            bess_db=bess_db,
            project_id=project_id,
            current_user=current_user,
            redis=redis,
        )
