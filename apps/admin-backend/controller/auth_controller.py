from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_user_db, allowed_roles
from python_common.services import AuthService
from python_common.dto import OTPRequestPayload, OTPLoginPayload
from python_common.constants.enums import UserRole, Platform
from utils.log_utils import audit_logs
from utils.mail_utils import MailUtils
from models import User, EmailTemplate


class AuthController:
    def __init__(self):
        self.auth_service = AuthService(
            user_model=User,
            template_model=EmailTemplate,
            mail_function=MailUtils.send_365_async,
            allowed_roles=[UserRole.SUPER_ADMIN],
            allowed_platforms=None,
            log_func=audit_logs,
        )

    async def request_otp(
        self,
        payload: OTPRequestPayload,
        user_db: AsyncSession = Depends(get_user_db),
    ):
        return await self.auth_service.get_otp(data=payload, user_db=user_db)

    async def verify_otp(
        self,
        payload: OTPLoginPayload,
        user_db: AsyncSession = Depends(get_user_db),
    ):
        return await self.auth_service.verify_otp(data=payload, user_db=user_db)

    async def logout(
        self,
        user_db: AsyncSession = Depends(get_user_db),
        current_user=Depends(allowed_roles(UserRole.SUPER_ADMIN.value)),
    ):
        return await self.auth_service.logout(current_user=current_user, db=user_db)
