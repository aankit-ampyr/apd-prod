from datetime import datetime, timezone
from typing import Optional
import json

from sqlalchemy.ext.asyncio import AsyncSession

from db.db_config import SessionUser
from models import AuditLog


async def audit_logs(
    user_id: str,
    user_role: int,
    module: int,
    action: int,
    before: str | dict | None,
    after: str | dict | None,
    resource_id: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    **kwargs,
):
    own_session = db is None

    if own_session:
        db = SessionUser()

    try:
        if isinstance(before, dict):
            before = json.dumps(before)

        if isinstance(after, dict):
            after = json.dumps(after)

        audit_log = AuditLog(
            user_id=str(user_id),
            role=user_role,
            module=module,
            action=action,
            before=before,
            after=after,
            resource_id=resource_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(audit_log)
        if own_session:
            await db.commit()
            await db.refresh(audit_log)
        return audit_log
    except Exception:
        if own_session:
            await db.rollback()
        raise
    finally:
        if own_session:
            await db.close()


# async def log_logout_async(user_role, user_name, user_id, user_scope, db, request, session_id=None):
#     module_id = AccessModule.PATIENT_DASHBOARD.value

#     if user_role == UserRole.SPECIALIST.value:
#         module_id = AccessModule.SPECIALIST_DASHBOARD.value

#     if user_role == UserRole.SUPER_ADMIN.value:
#         module_id = AccessModule.USER_MANAGEMENT.value

#     if user_role == UserRole.HOSPITAL_POC.value:
#         module_id = AccessModule.HOSPITAL_POC_DASHBOARD.value

#     if user_role == UserRole.ADMIN.value and user_scope == AdminRoleEnum.FINANCE_ADMIN:
#         module_id = AccessModule.PROCESS_PATIENT_PAYMENTS.value

#     if user_role == UserRole.ADMIN.value and user_scope == AdminRoleEnum.PATIENT_ADMIN:
#         module_id = AccessModule.MANAGE_PATIENT_CONSULTATIONS.value

#     if user_role == UserRole.ADMIN.value and user_scope == AdminRoleEnum.SPECIALIST_ADMIN:
#         module_id = AccessModule.MANAGE_SPECIALIST_CONSULTATIONS.value

#     if user_role == UserRole.ADMIN.value and user_scope == AdminRoleEnum.HOSPITAL_ADMIN:
#         module_id = AccessModule.HOSPITAL_ADMIN_DASHBOARD.value

#     if user_role == UserRole.ADMIN.value and user_scope == AdminRoleEnum.SUPPORT_ADMIN:
#         module_id = AccessModule.MANAGE_SUPPORT_TICKETS.value

#     await audit_logs_async(
#         access_id=module_id,
#         action_type=ActionType.LOGOUT.value,
#         old_value=None,
#         new_value="User logout",
#         request=request,
#         resource_id=user_id,
#         resource_type=ResourceType.USER.value,
#         status=True,
#         user_id=user_id,
#         user_name=user_name,
#         user_role=user_role,
#         db=db,
#     )
#     await db.commit()
# await websocket_manager.send_personal_message(
#     SocketEvent(
#         action_id=ActionType.LOGOUT.value,
#         resource_type=ResourceType.USER.value,
#         resource_id=user_id,
#         data={"session_id": session_id},
#     ).model_dump(),
#     user_id
# )

