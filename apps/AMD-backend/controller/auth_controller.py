from typing import Optional
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_db, get_user_db, allowed_roles
from utils.mail_utils import MailUtils
from utils.log_utils import audit_logs
from python_common.services import AuthService
from python_common.dependencies import get_refresh_token
from python_common.dto import OTPRequestPayload, OTPLoginPayload, RefreshTokenPayload
from python_common.constants.enums import UserRole, Platform
from python_common.constants.defaults import JWT_EXPIRY
from models import User, EmailTemplate
from context.dependencies import get_redis_conn
from redis.asyncio import Redis


class AuthController:
    def __init__(self):
        self.auth_service = AuthService(
            user_model=User,
            template_model=EmailTemplate,
            jwt_life_seconds=JWT_EXPIRY,
            mail_function=MailUtils.send_365_async,
            allowed_roles=[UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGER],
            allowed_platforms=[Platform.AMD],
            log_func=audit_logs,
        )

    async def request_otp(
        self,
        payload: OTPRequestPayload,
        user_db: AsyncSession = Depends(get_user_db),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.auth_service.get_otp(
            data=payload, user_db=user_db, redis=redis
        )

    async def verify_otp(
        self,
        payload: OTPLoginPayload,
        user_db: AsyncSession = Depends(get_user_db),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.auth_service.verify_otp(
            data=payload, user_db=user_db, redis=redis
        )

    async def refresh_token(
        self,
        refresh_token: Optional[str] = Depends(get_refresh_token),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.auth_service.refresh_token(refresh_token=refresh_token)

    async def logout(
        self,
        db: AsyncSession = Depends(get_db),
        current_user=Depends(allowed_roles()),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.auth_service.logout(current_user=current_user, db=db, redis=redis)
