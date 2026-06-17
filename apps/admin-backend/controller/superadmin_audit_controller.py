from fastapi import Depends, Query
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_user_db, allowed_roles
from services import SuperAdminAuditService
from constants.enums import UserRole
from utils import Res
from datetime import datetime, timedelta

class SuperAdminAuditController:
    def __init__(self):
        self.service = SuperAdminAuditService()

    async def get_scenarios(self, request: Request):
        return await self.service.get_audit_scenarios()

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
        db: AsyncSession = Depends(get_user_db),
        # Role Validation: Only Super Admin allowed
        current_user = Depends(allowed_roles(UserRole.SUPER_ADMIN.value))
    ):
        # 1. Date Range Validation + parse to datetime for DB filtering
        #    - Allow filtering with only start_date or only end_date.
        #    - Make end_date inclusive (end of day) for expected UX.
        parsed_start = None
        parsed_end = None
        try:
            if start_date:
                parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
            if end_date:
                end_day = datetime.strptime(end_date, "%Y-%m-%d")
                parsed_end = end_day + timedelta(days=1) - timedelta(microseconds=1)
        except ValueError:
            return Res.error("E-10026", message="Invalid date format. Use YYYY-MM-DD")

        if parsed_start and parsed_end and parsed_start > parsed_end:
            return Res.error("E-10026", message="Invalid date range")

        # 2. Call Service
        return await self.service.get_audit_logs(
            db_user=db,  
            page=page,
            limit=limit,
            user_id=user_id,
            log_id=log_id,
            role=role,
            module=module,
            action=action,
            start_date=parsed_start,
            end_date=parsed_end,
            search=search,
        )