from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.dependencies import get_user_db, allowed_roles, get_bess_db
from utils.log_utils import audit_logs
from python_common.services import AuthService
from python_common.dto import OTPRequestPayload, OTPLoginPayload, RefreshTokenPayload
from python_common.constants.enums import UserRole, Platform
from utils.mail_utils import MailUtils
from models import User, EmailTemplate
from python_common.constants.defaults import JWT_EXPIRY


class AuthController:
    def __init__(self):
        self.auth_service = AuthService(
            user_model=User,
            template_model=EmailTemplate,
            jwt_life_seconds=JWT_EXPIRY,
            allowed_roles=[
                UserRole.ADMIN,
                UserRole.ANALYST,
                UserRole.MANAGER,
                UserRole.VIEWER,
            ],
            allowed_platforms=[Platform.BESS],
            log_func=audit_logs,
            mail_function=MailUtils.send_365_async,
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
    
    async def refresh_token(
            self, 
            payload: RefreshTokenPayload
    ):
        return await self.auth_service.refresh_token(payload.refresh_token)
    
    async def logout(
        self,
        db: AsyncSession = Depends(get_bess_db),
        current_user=Depends(allowed_roles()),
    ):
        return await self.auth_service.logout(current_user=current_user, db=db)

