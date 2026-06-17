import json
import traceback
from sqlalchemy import select, or_
from models.audit_model import AuditLog
from constants.enums import UserRole
from datetime import datetime, timedelta
from python_common.utils import paginate
from python_common.constants.enums import AuditLogScenario, AuditLogModules
from utils.response_utils import Res, safe_json_load


class AuditService:
    async def get_audit_logs(self, db, page=1, limit=100, **filters):
        try:
            query = select(AuditLog)

            if filters.get("search"):
                search_term = f"%{filters['search']}%"
                query = query.where(
                    or_(
                        AuditLog.user_id.ilike(search_term),
                        AuditLog.log_id.ilike(search_term),
                        AuditLog.resource_id.ilike(search_term),
                    )
                )

            if filters.get("user_id"):
                query = query.where(AuditLog.user_id == filters["user_id"])

            if filters.get("log_id"):
                query = query.where(AuditLog.log_id == filters["log_id"])

            if filters.get("role"):
                query = query.where(AuditLog.role == filters["role"])

            if filters.get("module"):
                query = query.where(AuditLog.module == filters["module"])

            if filters.get("action"):
                query = query.where(AuditLog.action == filters["action"])

            if filters.get("start_date") and filters.get("end_date"):
                try:
                    start = datetime.strptime(filters["start_date"], "%Y-%m-%d")
                    end = datetime.strptime(filters["end_date"], "%Y-%m-%d")

                    if start > end:
                        return Res.error(
                            status_code="E-20051",
                            message="Invalid date range provided.",
                        )
                    end = end + timedelta(days=1)
                    query = query.where(
                        AuditLog.created_at >= start, AuditLog.created_at < end
                    )
                except ValueError:
                    return Res.error("E-20050", message="Invalid search parameter.")

            query = query.where(
                AuditLog.role != UserRole.ADMIN.value,
                AuditLog.module != AuditLogModules.AUTHENTICATION.value,
            )

            query = query.order_by(AuditLog.created_at.desc())

            paginated_data = await paginate(
                db=db,
                base_query=query,
                limit=limit,
                page=page,
            )

            logs = paginated_data.records

            formatted_logs = []
            for log in logs:
                formatted_logs.append(
                    {
                        "id": log.id,
                        "log_id": log.log_id,
                        "user_id": log.user_id,
                        "role": log.role,
                        "module": {
                            "id": log.module,
                            "name": f"{AuditLogModules(log.module).name}",
                        },
                        "action": {
                            "id": log.action,
                            "name": AuditLogScenario(log.action).name,
                        },
                        "resource_id": log.resource_id or "",
                        "before": safe_json_load(log.before),
                        "after": safe_json_load(log.after),
                        "timestamp": log.created_at.isoformat(),
                    }
                )

            return Res.success(
                status_code="S-20036",
                data={
                    "logs": formatted_logs,
                    "total_results": paginated_data.total_results,
                    "total_pages": paginated_data.total_pages,
                    "current_page": paginated_data.current_page,
                    "next_page": paginated_data.next_page,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-20001")
