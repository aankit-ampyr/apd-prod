from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
import json
from constants.defaults import LOGS_STREAM_CHANEL
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from constants.enums import SocketEventType
from utils.response_utils import safe_json_load
from dtos.socket_dto import SocketLogEvent
from models import AuditLog
from db.db_config import SessionLocal
from datetime import timezone, datetime
from redis.asyncio import Redis


def build_sectioned_audit_payload(
    section: str, values: str | dict | None
) -> dict | None:
    if values is None:
        return None
    return {section: values}


def compare_and_build_sectioned_audit_payload(
    section: str,
    before: dict,
    after: dict,
    field_map: dict[str, str] | None = None,
    ignored_keys: set[str] | None = None,
) -> tuple[dict | None, dict | None]:
    diff_before = {}
    diff_after = {}

    field_map = field_map or {}
    ignored_keys = ignored_keys or set()

    for key in before.keys() | after.keys():
        if key in ignored_keys:
            continue

        before_value = before.get(key)
        after_value = after.get(key)

        if before_value == after_value:
            continue

        label = field_map.get(key, key)

        if key in before:
            diff_before[label] = before_value
        if key in after:
            diff_after[label] = after_value

    return (
        build_sectioned_audit_payload(section, diff_before) if diff_before else None,
        build_sectioned_audit_payload(section, diff_after) if diff_after else None,
    )


async def audit_logs(
    user_id: str,
    user_role: int,
    module: int,
    action: int,
    redis: Redis | None,
    before: str | dict | None,
    after: str | dict | None,
    resource_id: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    channel: str = LOGS_STREAM_CHANEL,
):

    own_session = db is None

    if own_session:
        db = SessionLocal()

    try:
        if isinstance(before, dict):
            before = json.dumps(before)

        if isinstance(after, dict):
            after = json.dumps(after)

        audit_log = AuditLog(
            user_id=user_id,
            role=user_role,
            module=module,
            action=action,
            before=before,
            after=after,
            resource_id=resource_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(audit_log)
        await db.flush()
        if own_session:
            await db.commit()
            await db.refresh(audit_log)

        audit_data = {
            "id": audit_log.id,
            "log_id": audit_log.log_id,
            "resource_id": audit_log.resource_id,
            "user_id": audit_log.user_id,
            "role": audit_log.role,
            "module": {
                "id": audit_log.module,
                "name": f"{AuditLogModules(audit_log.module).name} (AMD)" if audit_log.module in [m.value for m in AuditLogModules] else "",
            },
            "action": {
                "id": audit_log.action,
                "name": AuditLogScenario(audit_log.action).name if audit_log.action in [s.value for s in AuditLogScenario] else "",
            },
            "before": safe_json_load(audit_log.before),
            "after": safe_json_load(audit_log.after),
            "timestamp": audit_log.created_at.isoformat() if audit_log.created_at else None,
            "created_at": audit_log.created_at.isoformat() if audit_log.created_at else None,
        }

        complete_event = SocketLogEvent(
            type=SocketEventType.AUDIT_LOG, data=audit_data
        )
        if redis:
            await redis.publish(channel, complete_event.model_dump_json())

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
