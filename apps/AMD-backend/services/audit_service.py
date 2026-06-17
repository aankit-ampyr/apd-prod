import traceback
from sqlalchemy import select, or_
from models.audit_log_model import AuditLog
from constants.enums import (
    UserRole,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
)
from datetime import datetime, timedelta
from exceptions import PayloadValidation
import json
from python_common.utils import paginate
from utils import Res


class AuditService:

    async def get_audit_logs(self, db, page=1, limit=100, **filters):
        try:
            if page < 1:
                raise PayloadValidation("E-10030", "Invalid page number")
            if limit > 100:
                limit = 100
            query = select(AuditLog).where(AuditLog.role.in_([UserRole.ANALYST.value, UserRole.MANAGER.value]))

            search = filters.get("search")
            if search:
                search_term = f"%{str(search).strip()}%"
                query = query.where(
                    or_(
                        AuditLog.user_id.ilike(search_term),
                        AuditLog.log_id.ilike(search_term),
                        AuditLog.resource_id.ilike(search_term),
                    )
                )

            user_id = filters.get("user_id")
            if user_id:
                query = query.where(AuditLog.user_id == str(user_id).strip())

            log_id = filters.get("log_id")
            if log_id:
                query = query.where(AuditLog.log_id == str(log_id).strip())

            role = filters.get("role")
            if role is not None:
                role = int(role)
                if role not in {r.value for r in UserRole}:
                    raise PayloadValidation("E-10030", "Invalid role")
                query = query.where(AuditLog.role == role)

            module = filters.get("module")
            if module is not None:
                module = int(module)
                if module not in {m.value for m in AuditLogModules}:
                    raise PayloadValidation("E-10030", "Invalid module")
                query = query.where(AuditLog.module == module)

            action = filters.get("action")
            if action is not None:
                action = int(action)
                if action not in {a.value for a in AuditLogScenario}:
                    raise PayloadValidation("E-10030", "Invalid action")
                query = query.where(AuditLog.action == action)

            has_start = bool(filters.get("start_date"))
            has_end = bool(filters.get("end_date"))

            if has_start:
                try:
                    start = datetime.strptime(filters["start_date"], "%Y-%m-%d")
                    
                except ValueError as e:
                    raise PayloadValidation("E-10032", str(e))

                query = query.where(
                    AuditLog.created_at >= start,
                )
            
            if has_end:
                try:
                    end = datetime.strptime(filters["end_date"], "%Y-%m-%d")
                except ValueError as e:
                    raise PayloadValidation("E-10032", str(e))
                end += timedelta(days=1)
                query = query.where(
                    AuditLog.created_at < end
                )

            paginated_data = await paginate(
                db=db,
                base_query=query,
                limit=limit,
                page=page,
                order_by=[AuditLog.created_at.desc()],
            )

            formatted_logs = [
                {
                    "id": log.id,
                    "log_id": log.log_id,
                    "resource_id": log.resource_id,
                    "user_id": log.user_id,
                    "role": log.role,
                    "module": {
                        "id": log.module,
                        "name": f"{AuditLogModules(log.module).name} (AMD)",
                    },
                    "action": {
                        "id": log.action,
                        "name": AuditLogScenario(log.action).name,
                    },
                    "before": (
                        json.loads(log.before)
                        if log.before and str(log.before).strip().startswith(("{", "["))
                        else log.before
                    ),
                    "after": (
                        json.loads(log.after)
                        if log.after and str(log.after).strip().startswith(("{", "["))
                        else log.after
                    ),
                    "timestamp": (
                        log.created_at.isoformat() if log.created_at else None
                    ),
                }
                for log in paginated_data.records
            ]

            return Res.success(
                "S-10014",
                data={
                    "logs": formatted_logs,
                    "next_page": paginated_data.next_page,
                    "total_pages": paginated_data.total_pages,
                    "current_page": paginated_data.current_page,
                    "total_results": paginated_data.total_results,
                },
            )

        except PayloadValidation as e:
            return Res.error(e.status_code, message=e.message)
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10001", message=str(e))
