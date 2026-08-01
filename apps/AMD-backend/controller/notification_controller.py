# ── controller/notification_controller.py ──

from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db, allowed_roles
from services.notification_service import NotificationService
from constants.enums import UserRole, Platform
from utils.response_utils import Res

class NotificationController:
    def __init__(self):
        self.service = NotificationService()

    async def get_active_notifications(
        self,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_active_notifications(
            db=db,
            current_user=current_user,
        )

    async def mark_notification_read(
        self,
        notification_id: str = Path(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.mark_notification_read(
            db=db,
            notification_id=notification_id,
            current_user=current_user,
        )
