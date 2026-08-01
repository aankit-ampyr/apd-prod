from services.user_service import UserService
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession as Session
from fastapi import Depends, Query, BackgroundTasks
from db.dependencies import get_user_db, get_db, allowed_roles
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from constants.enums import UserRole
from dtos.user_dto import AssignOrganization
from typing import List, Literal

class UserController:
    def __init__(self):
        self.service = UserService()

    async def get_users(
        self,
        request: Request,
        page: int = Query(1),
        limit: int = Query(10),
        search: str | None = Query(None),
        role: int | None = Query(None),
        organization: int | None = Query(None),
        platform: List[int] = Query([]),
        status: bool | None = Query(None),
        start_date: str | None = Query(None),
        end_date: str | None = Query(None),
        sort: Literal["asc", "desc"] | None = Query(None),
        user_db: Session = Depends(get_user_db),
        db: Session = Depends(get_db),
        current_user=Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.get_users(
            db=db,
            user_db=user_db,
            current_user=current_user,
            page=page,
            limit=limit,
            search=search,
            role=role,
            organization=organization,
            platform=platform,
            status=status,
            start_date=start_date,
            end_date=end_date,
            sort=sort
        )

    
    async def assign_organization(
            self,
            user_id: int,
            payload: AssignOrganization,
            user_db=Depends(get_user_db),
            db=Depends(get_db),
            redis: Redis = Depends(get_redis_conn),
            current_user=Depends(allowed_roles(UserRole.ADMIN.value)),
            background_tasks: BackgroundTasks = BackgroundTasks()
    ):
        return await self.service.assign_organization(db, redis, current_user, user_db, user_id, payload, background_tasks)