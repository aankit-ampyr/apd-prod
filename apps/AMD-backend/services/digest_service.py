from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.digest_model import DigestConfiguration
from models.user_model import User
from models.asset import Asset
from models.organization_model import Organization
from utils import Res
from constants.enums import (
    DigestScope,
    DigestFrequency,
    Platform,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
)
from utils.log_utils import audit_logs, build_sectioned_audit_payload
from redis.asyncio import Redis
from python_common.utils import paginate
from fastapi import BackgroundTasks


class DigestService:
    DIGEST_CONFIGURATION_AUDIT_SECTION = "DIGEST CONFIGURATION"

    async def get_list(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        page: int,
        limit: int,
        current_user: dict,
        search: str = None,
        scope: int = None,
        frequency: int = None,
        status: int = None,
    ):
        query = select(DigestConfiguration)
        filter_applied = False
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    DigestConfiguration.name.ilike(search_term),
                    DigestConfiguration.digest_id.ilike(search_term),
                )
            )
            filter_applied = True

        if scope is not None:
            query = query.where(DigestConfiguration.scope == scope)
            filter_applied = True

        if frequency is not None:
            query = query.where(DigestConfiguration.frequency == frequency)
            filter_applied = True

        if status is not None:
            query = query.where(DigestConfiguration.status == status)
            filter_applied = True

        # put total count before pagination
        query = query.order_by(DigestConfiguration.created_at.desc())

        paginated = await paginate(
            db=db,
            base_query=query,
            page=page,
            limit=limit,
        )

        digests = paginated.records
        total_results = paginated.total_results
        total_pages = paginated.total_pages
        next_page = paginated.next_page
        current_page = paginated.current_page

        if total_results == 0:
            if filter_applied:
                return Res.error("E-10015", message="No digests found matching the provided filters", http_status_code=404)
            return Res.error("E-10014", message="No digests found.", http_status_code=404)

        data = []
        for digest in digests:
            # Fetch Recipient Details
            recipient_list = []
            if digest.recipients and len(digest.recipients) > 0:
                user_res = await user_db.execute(
                    select(User).where(User.id.in_(digest.recipients))
                )
                users = user_res.scalars().all()
                for u in users:
                    recipient_list.append(
                        {"id": u.id, "name": u.name, "email": u.email, "role": u.role}
                    )

            # Resource Mapping
            resource_data = []
            if digest.scope == DigestScope.PER_ASSET:
                if digest.applies_to:
                    # Handles multiple IDs stored in applies_to list
                    res = await db.execute(
                        select(Asset).where(Asset.id.in_(digest.applies_to))
                    )
                    resource_data = [
                        {"id": a.id, "name": a.name} for a in res.scalars().all()
                    ]
                else:
                    resource_data = [{"id": None, "name": "All Assets"}]

            elif digest.scope == DigestScope.PER_ORGANIZATION:
                if digest.applies_to:
                    res = await db.execute(
                        select(Organization).where(
                            Organization.id.in_(digest.applies_to)
                        )
                    )
                    resource_data = [
                        {"id": o.id, "name": o.name} for o in res.scalars().all()
                    ]
                else:
                    resource_data = [{"id": None, "name": "All Organizations"}]

            scope_choices = DigestScope.choices()
            freq_choices = DigestFrequency.choices()
            scope_label = next(
                (name for val, name in scope_choices if val == digest.scope), "unknown"
            )
            freq_label = next(
                (name for val, name in freq_choices if val == digest.frequency),
                "unknown",
            )

            data.append(
                {
                    "id": digest.id,
                    "digest_id": digest.digest_id,
                    "name": digest.name,
                    "scope": {"id": digest.scope, "label": scope_label.lower()},
                    "frequency": {"id": digest.frequency, "label": freq_label.lower()},
                    "schedule": {
                        "time": digest.time,
                        "weekday": getattr(digest, "weekday", None),
                        "day_of_month": getattr(digest, "day_of_month", None),
                    },
                    "recipients": recipient_list,
                    "status": True if digest.status == 1 else False,
                    "resources": resource_data,
                    "created_at": (
                        digest.created_at.strftime("%Y-%m-%d %H:%M:%S")
                        if digest.created_at
                        else None
                    ),
                    "updated_at": (
                        digest.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                        if digest.updated_at
                        else None
                    ),
                }
            )

        return Res.success(
            "S-10024",
            data={
                "digests": data,
                "total_pages": total_pages,
                "current_page": current_page,
                "total_results": total_results,
                "next_page": next_page,
            },
        )

    async def create(
        self,
        db: AsyncSession,
        redis: Redis,
        current_user: dict,
        data,
        background_tasks: BackgroundTasks,
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Only AMD admin can access this API", http_status_code=403)

        # Duplicate Check
        exist = await db.execute(
            select(DigestConfiguration).where(DigestConfiguration.name == data.name)
        )
        if exist.scalar():
            return Res.error("E-10048", message="Digest with this name already exists", http_status_code=409)

        # ID Generation
        last = await db.execute(
            select(DigestConfiguration).order_by(DigestConfiguration.id.desc()).limit(1)
        )
        last_rec = last.scalar()
        new_id_num = (
            (int(last_rec.digest_id.split("-")[1]) + 1)
            if last_rec and last_rec.digest_id
            else 1
        )
        digest_id = f"DIG-{str(new_id_num).zfill(3)}"

        # Schedule Validation
        freq, time, weekday, day_of_month = (
            data.frequency,
            data.time,
            data.weekday,
            data.day_of_month,
        )
        if freq == DigestFrequency.DAILY and not time:
            return Res.error("E-10050", message="Time is required for daily schedule", http_status_code=422)
        elif freq == DigestFrequency.WEEKLY and (not time or weekday is None):
            return Res.error(
                "E-10051", message="Time and weekday are required for weekly schedule", http_status_code=422
            )
        elif freq == DigestFrequency.MONTHLY and (not time or day_of_month is None):
            return Res.error(
                "E-10052",
                message="Time and day_of_month are required for monthly schedule", http_status_code=422
            )

        # Resources
        resource_ids = data.resource_id
        if resource_ids is not None and not isinstance(resource_ids, list):
            resource_ids = [resource_ids]

        if data.scope == DigestScope.PORTFOLIO_WIDE:
            resource_ids = None

        new_digest = DigestConfiguration(
            digest_id=digest_id,
            status=1,
            frequency=freq,
            time=time,
            weekday=weekday,
            day_of_month=day_of_month,
            name=data.name,
            scope=data.scope,
            recipients=data.recipients,
            applies_to=resource_ids,
        )
        db.add(new_digest)
        await db.flush()  # Flush to get the new_digest.id for audit log resource_id

        background_tasks.add_task(
            audit_logs,
            user_id=current_user["user_id"],
            user_role=current_user["role"],
            module=AuditLogModules.DIGEST_MANAGEMENT_AMD.value,
            action=AuditLogScenario.DIGEST_CREATED.value,
            redis=redis,
            before=None,
            after=f"Digest name: {data.name}",
            resource_id=new_digest.digest_id,
        )

        await db.commit()
        await db.refresh(new_digest)

        resource_data = []
        if new_digest.scope == DigestScope.PER_ASSET:
            if new_digest.applies_to:
                res = await db.execute(
                    select(Asset).where(Asset.id.in_(new_digest.applies_to))
                )
                resource_data = [
                    {"id": a.id, "name": a.name} for a in res.scalars().all()
                ]
            else:
                resource_data = [{"id": None, "name": "All Assets"}]
        elif new_digest.scope == DigestScope.PER_ORGANIZATION:
            if new_digest.applies_to:
                res = await db.execute(
                    select(Organization).where(
                        Organization.id.in_(new_digest.applies_to)
                    )
                )
                resource_data = [
                    {"id": o.id, "name": o.name} for o in res.scalars().all()
                ]
            else:
                resource_data = [{"id": None, "name": "All Organizations"}]

        return Res.success(
            "S-10020",
            data={
                "id": new_digest.id,
                "digest_id": new_digest.digest_id,
                "name": new_digest.name,
                "status": new_digest.status,
                "scope": new_digest.scope,
                "resources": resource_data,
            },
        )

    async def update_digest(
        self, db: AsyncSession, redis: Redis, current_user: dict, digest_id: str, data
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Only AMD admin can access this API", http_status_code=403)

        result = await db.execute(
            select(DigestConfiguration).where(DigestConfiguration.id == digest_id)
        )
        digest = result.scalar_one_or_none()
        if not digest:
            return Res.error("E-10022", message="Digest configuration not found", http_status_code=404)

        # Capture old values before updating for audit log
        old_name = digest.name
        old_status = digest.status
        old_frequency = digest.frequency
        old_recipients = digest.recipients or []
        old_recipients_count = len(old_recipients)

        update_data = data.model_dump(exclude_unset=True)
        if "resource_id" in update_data:
            r_ids = update_data.pop("resource_id")
            digest.applies_to = [r_ids] if isinstance(r_ids, int) else r_ids

        for key, value in update_data.items():
            setattr(digest, key, value)

        # Helper to get frequency label
        def get_frequency_label(freq):
            freq_map = {1: "Daily", 2: "Weekly", 3: "Monthly"}
            return freq_map.get(freq, str(freq))

        # Track if any config (non-status) changes were made
        config_before = {}
        config_after = {}

        # Check name change
        if data.name and data.name != old_name:
            config_before["Name"] = old_name
            config_after["Name"] = data.name

        # Check frequency change
        if data.frequency is not None and data.frequency != old_frequency:
            config_before["Frequency"] = get_frequency_label(old_frequency)
            config_after["Frequency"] = get_frequency_label(data.frequency)

        # Log configuration changes (name, frequency, etc.) - if any non-status config changed
        if config_before:
            await audit_logs(
                user_id=current_user["user_id"],
                user_role=current_user["role"],
                module=AuditLogModules.DIGEST_MANAGEMENT_AMD.value,
                action=AuditLogScenario.DIGEST_UPDATED.value,
                redis=redis,
                before=build_sectioned_audit_payload(
                    self.DIGEST_CONFIGURATION_AUDIT_SECTION, config_before
                ),
                after=build_sectioned_audit_payload(
                    self.DIGEST_CONFIGURATION_AUDIT_SECTION, config_after
                ),
                resource_id=digest.digest_id,
                db=db,
            )

        # Log status change separately with proper action type
        if data.status is not None and data.status != old_status:
            if data.status == 1:
                # Digest Activated
                await audit_logs(
                    user_id=current_user["user_id"],
                    user_role=current_user["role"],
                    module=AuditLogModules.DIGEST_MANAGEMENT_AMD.value,
                    action=AuditLogScenario.DIGEST_ACTIVATED.value,
                    redis=redis,
                    before="Status: Inactive",
                    after="Status: Active",
                    resource_id=digest.digest_id,
                    db=db,
                )
            else:
                # Digest Deactivated
                await audit_logs(
                    user_id=current_user["user_id"],
                    user_role=current_user["role"],
                    module=AuditLogModules.DIGEST_MANAGEMENT_AMD.value,
                    action=AuditLogScenario.DIGEST_DEACTIVATED.value,
                    redis=redis,
                    before="Status: Active",
                    after="Status: Inactive",
                    resource_id=digest.digest_id,
                    db=db,
                )

        # Log recipients change separately
        new_recipients = data.recipients if data.recipients else []
        new_recipients_count = len(new_recipients)
        if set(new_recipients) != set(old_recipients):
            await audit_logs(
                user_id=current_user["user_id"],
                user_role=current_user["role"],
                module=AuditLogModules.DIGEST_MANAGEMENT_AMD.value,
                action=AuditLogScenario.RECIPIENTS_UPDATED.value,
                redis=redis,
                before=f"Recipients: {old_recipients_count} Users",
                after=f"Recipients: {new_recipients_count} Users",
                resource_id=digest.digest_id,
                db=db,
            )

        await db.commit()
        await db.refresh(digest)
        return Res.success("S-10021")
