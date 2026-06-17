from services import UserService
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession as Session
from fastapi import Depends
from db.dependencies import get_user_db, allowed_roles
from dtos import UserSearch
from constants.enums import UserRole


class UserController:
    def __init__(self):
        self.service = UserService()

    async def get_users(
        self,
        request: Request,
        search_params: UserSearch = Depends(),
        db: Session = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
    ):
        return await self.service.get_users(
            db=db, params=search_params, current_user=current_user
        )
