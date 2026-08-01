import traceback
import pytz
from sqlalchemy import select, or_
from models.audit_log_model import AuditLog
from db.db_config import SessionBESS, SessionAMD
from datetime import timedelta, datetime
from python_common.constants.enums import AuditLogScenario, AuditLogModules, UserRole
from utils import Res, safe_json_load
import json


class SuperAdminAuditService:
    async def get_audit_scenarios(self):
        return {s.name: s.value for s in AuditLogScenario}

    async def get_audit_logs(self, db_user, page=1, limit=100, **filters):
        try:
            all_logs = []
            async with SessionBESS() as db_bess, SessionAMD() as db_amd:
                targets = [(db_amd, "AMD"), (db_bess, "BESS")]

                for session, env in targets:
                    query = select(AuditLog).where(
                        AuditLog.role == UserRole.ADMIN.value
                    )

                    # Search Filter
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

                    if filters.get("module"):
                        mod_val = filters["module"]
                        query = query.where(
                            AuditLog.module.in_(mod_val)
                            if isinstance(mod_val, list)
                            else AuditLog.module == mod_val
                        )

                    if filters.get("action"):
                        act_val = filters["action"]
                        query = query.where(
                            AuditLog.action.in_(act_val)
                            if isinstance(act_val, list)
                            else AuditLog.action == act_val
                        )

                    IST = pytz.timezone("Asia/Kolkata")
                    UTC = pytz.utc
                    if filters.get("start_date"):
                        start_date = filters["start_date"]
                        if isinstance(start_date, str):
                            start_date = datetime.strptime(start_date, "%Y-%m-%d")
                        start_date = start_date - timedelta(
                            hours=5, minutes=30
                        )  # Convert to UTC
                        start_date = start_date.replace(tzinfo=UTC)

                        query = query.where(AuditLog.created_at >= start_date)

                    if filters.get("end_date"):
                        end_date = filters["end_date"]
                        if isinstance(end_date, str):
                            end_date = datetime.strptime(end_date, "%Y-%m-%d")

                        end_date = end_date - timedelta(
                            hours=5, minutes=30
                        )  # Convert to UTC
                        end_date = end_date.replace(tzinfo=UTC)

                        query = query.where(AuditLog.created_at <= end_date)

                    result = await session.execute(query)
                    logs = result.scalars().all()

                    for log in logs:
                        before_val = log.before
                        after_val = log.after
                        if (
                            (not before_val or before_val == "")
                            and after_val
                            and "->" in after_val
                        ):
                            try:
                                before_parts = []
                                after_parts = []
                                changes = after_val.split(",")
                                for change in changes:
                                    if "->" in change and ":" in change:
                                        left, right = change.split("->")
                                        key, old_val = left.split(":", 1)
                                        before_parts.append(
                                            f"{key.strip()}: {old_val.strip()}"
                                        )
                                        after_parts.append(
                                            f"{key.strip()}: {right.strip()}"
                                        )

                                before_val = (
                                    ", ".join(before_parts)
                                    if before_parts
                                    else before_val
                                )
                                after_val = (
                                    ", ".join(after_parts) if after_parts else after_val
                                )
                            except Exception:
                                pass

                        all_logs.append(
                            {
                                "id": log.id,
                                "log_id": log.log_id,
                                "user_id": log.user_id,
                                "role": log.role,
                                "platform": env,
                                "module": {
                                    "id": log.module,
                                    "name": AuditLogModules(log.module).name
                                    if log.module in AuditLogModules._value2member_map_
                                    else "UNKNOWN",
                                },
                                "action": {
                                    "id": log.action,
                                    "name": AuditLogScenario(log.action).name
                                    if log.action in AuditLogScenario._value2member_map_
                                    else "UNKNOWN",
                                },
                                "resource_id": log.resource_id or "",
                                "before": safe_json_load(before_val) or "",
                                "after": safe_json_load(after_val) or "",
                                "timestamp": log.created_at.isoformat(),
                                "raw_date": log.created_at,
                            }
                        )

            all_logs.sort(
                key=lambda x: x["raw_date"], reverse=True
            )  # we are sorting by raw date because if you will sort by string it will have some confusion

            total_results = len(all_logs)
            total_pages = (total_results + limit - 1) // limit
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit

            paginated_logs = all_logs[start_idx:end_idx]

            # Clean up raw_date before returning
            for log in paginated_logs:
                log.pop("raw_date", None)

            return Res.success(
                "S-10014",
                data={
                    "logs": paginated_logs,
                    "total_results": total_results,
                    "total_pages": total_pages,
                    "current_page": page,
                    "next_page": page + 1 if page < total_pages else None,
                },
            )
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10001", message=str(e))

    async def get_audit_scenarios(self):
        try:
            scenarios = {s.name: s.value for s in AuditLogScenario}
            return Res.success("S-10000", data=scenarios)
        except Exception as e:
            return Res.error("E-10001", message=str(e))
