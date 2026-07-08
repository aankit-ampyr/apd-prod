from fastapi import Depends, Query
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_bess_db, allowed_roles
from services.audit_service import AuditService
from constants.enums import UserRole
from utils.response_utils import Res
from constants.enums import Platform


class AuditController:
    def __init__(self):
        self.service = AuditService()

    async def get_audit_logs(
        self,
        request: Request,
        page: int = Query(1, ge=1),
        search: str | None = Query(None),
        limit: int = Query(100, ge=1),
        user_id: str | None = Query(None),
        log_id: str | None = Query(None),
        role: int | None = Query(None),
        module: int | None = Query(None),
        action: int | None = Query(None),
        start_date: str | None = Query(None),
        end_date: str | None = Query(None),
        db: AsyncSession = Depends(get_bess_db),
        current_user=Depends(allowed_roles(UserRole.ADMIN.value)),
    ):

        if Platform.BESS not in current_user["platform"]:
            return Res.error("E-10013", message="Access denied")

        return await self.service.get_audit_logs(
            db=db,
            page=page,
            limit=limit,
            user_id=user_id,
            log_id=log_id,
            role=role,
            module=module,
            action=action,
            start_date=start_date,
            end_date=end_date,
            search=search,
        )

