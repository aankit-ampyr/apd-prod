from services import UserService
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession as Session
from fastapi import Depends, Query
from db.dependencies import get_user_db, allowed_roles
from dtos import UserCreate, UserUpdate, UserResponse
from constants.enums import UserRole
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
        db: Session = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.SUPER_ADMIN.value))
    ):
        return await self.service.get_users(
            db=db,
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


    async def create_user(
        self,
        request: Request,
        user: UserCreate,
        db: Session = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.SUPER_ADMIN.value))
        ):
        return await self.service.create_user(db=db, user=user)

    async def update_user(
        self,
        request: Request,
        user_id: int,
        user: UserUpdate,
        db: Session = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.SUPER_ADMIN.value))
    ) -> UserResponse:
        return await self.service.update_user(db, user_id, user)

    async def delete_user(
        self,
        request: Request,
        user_id: int,
        db: Session = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.SUPER_ADMIN.value))
    ):
        return await self.service.delete_user(db, user_id)
    
