# packages/python-common/python_common/middleware/auth_middleware.py
from constants.enums import Platform

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from jose import JWTError, ExpiredSignatureError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from python_common.constants.defaults import ACCESS_TOKEN_NAME
from python_common.utils.jwt_utils import verify_token
from python_common.exceptions import (
    UserSessionExpired,
    UserNotFound,
    UserDeleted,
    UserNotAuthenticated,
    UserTokenExpired,
    UserAccountBlocked,
)
from typing import Type, Set


class BaseAuthMiddleware(BaseHTTPMiddleware):
    """
    Reusable authentication middleware.

    Usage:
        from db.db_config import SessionUser
        from models import User

        app.add_middleware(
            AuthMiddleware,
            session_factory=SessionUser,
            user_model=User,
            public_endpoints={"/health", "/login"}
        )
    """

    def __init__(
        self,
        app,
        session_factory: async_sessionmaker[AsyncSession],
        user_model: Type,
        public_endpoints: Set[str] | None = None,
    ):
        super().__init__(app)
        self.session_factory = session_factory
        self.user_model = user_model
        self.public_endpoints = set(public_endpoints or [])

    async def dispatch(self, request: Request, call_next):
        request.state.user = None
        path = request.url.path

        # Skip authentication for public routes (exact match or prefix match)
        if path in self.public_endpoints:
            return await call_next(request)

        for endpoint in self.public_endpoints:
            if endpoint != "/" and path.startswith(endpoint):
                return await call_next(request)

        token = request.cookies.get(ACCESS_TOKEN_NAME)

        # Token not present
        if not token:
            raise UserNotAuthenticated("Authorization header missing or invalid")

        async with self.session_factory() as db:
            try:
                payload = verify_token(token)
                user_id = payload.get("id")

                result = await db.execute(
                    select(self.user_model).where(self.user_model.id == user_id)
                )
                user = result.scalar_one_or_none()

                if not user:
                    raise UserNotFound("User not found")
                if user.is_deleted:
                    raise UserDeleted("User not found")

                if not user.status:
                    raise UserAccountBlocked("User account is blocked")

                request.state.user = {
                    "id": payload.get("id"),
                    "user_id": user.user_id,
                    "email": payload.get("sub"),
                    "role": payload.get("role"),
                    "platform": payload.get("platform"),
                    "name": payload.get("name"),
                    "user": user,
                }

            except ExpiredSignatureError:
                try:
                    payload = verify_token(token, ignore_exp=True)
                    platforms = payload.get("platform", [])
                except:
                    platforms = []
                if Platform.AMD.value in platforms:
                    raise UserTokenExpired("Token expired", status_code="E-10012")
                elif Platform.BESS.value in platforms:
                    raise UserTokenExpired("Token expired", status_code="E-20003")
                else:
                    raise UserTokenExpired("Token expired")

            except JWTError:
                raise UserSessionExpired("Invalid token")

        response = await call_next(request)
        return response
