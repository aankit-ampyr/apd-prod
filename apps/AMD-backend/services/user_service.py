from fastapi import BackgroundTasks
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from utils.response_utils import Res
from models import User, Organization, UserOrganization
from constants.enums import (
    UserRole,
    Platform,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
)
from utils.log_utils import audit_logs
from python_common.utils import paginate
from utils.mail_utils import MailUtils
from utils.template_utils import template_utils


class UserService:

    async def _send_organization_assignment_email(
        self, db, user_email, user_name, organization_name, user_role
    ):
        template_ref = 5
        template = await template_utils.get_by_ref(db, template_ref)
        if template:
            subject = template_utils.get_subject(template)
            body = template_utils.get_message(
                template,
                name=user_name,
                organization_name=organization_name,
                role=user_role,
            )
            await MailUtils.send_365_async(
                recipient_list=[user_email],
                subject=subject,
                html_message=body,
            )

    async def _send_organization_re_assignment_email(
        self, db, user_email, user_name, prev_organization_name, new_organization_name
    ):
        template_ref = 6

        template = await template_utils.get_by_ref(db, template_ref)
        if template:
            subject = template_utils.get_subject(template)
            body = template_utils.get_message(
                template,
                name=user_name,
                prev_organization_name=prev_organization_name,
                new_organization_name=new_organization_name,
            )
            await MailUtils.send_365_async(
                recipient_list=[user_email],
                subject=subject,
                html_message=body,
            )

    async def get_users(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        current_user,
        page=1,
        limit=10,
        search=None,
        role=None,
        organization=None,
        platform=None,
        status=None,
        start_date=None,
        end_date=None,
        sort=None,
    ):
        from models.organization_model import UserOrganization

        current_user_platform = current_user.get("platform")
        query = select(User).where(
            User.is_deleted == False, User.role != UserRole.SUPER_ADMIN.value
        )
        filter_applied = False

        # add a query for non-super admins to only see users from their platform
        if current_user.get("role") == UserRole.ADMIN.value:
            if Platform.AMD not in current_user_platform:
                return Res.error(
                    "E-10013",
                    message="Admins must have access to at least AMD platform",
                )
            query = query.where(
                User.platform.overlap([Platform.AMD]), User.id != current_user.get("id")
            )

        # SEARCH
        if search:
            query = query.where(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.user_id.ilike(f"%{search}%"),
                )
            )
            filter_applied = True

        # ROLE FILTER
        if role is not None:
            query = query.where(User.role == role)
            filter_applied = True

        # ORGANIZATION FILTER (use UserOrganization mapping)
        user_ids_by_org = None
        if organization is not None:
            org_query = select(UserOrganization.user_id).where(
                UserOrganization.organization_id == organization
            )
            org_result = await db.execute(org_query)
            user_ids_by_org = [row[0] for row in org_result.fetchall()]
            query = query.where(User.id.in_(user_ids_by_org))
            filter_applied = True

        # STATUS FILTER
        if status is not None:
            if isinstance(status, str):
                status = status.lower() == "true"
            query = query.where(User.status == status)
            filter_applied = True

        # SORT
        if sort == "asc":
            query = query.order_by(User.last_activity.asc())
        elif sort == "desc":
            query = query.order_by(User.last_activity.desc())
        else:
            query = query.order_by(User.created_at.desc())

        # PAGINATION
        paginated = await paginate(db=user_db, base_query=query, page=page, limit=limit)

        users = paginated.records
        total_results = paginated.total_results
        total_pages = paginated.total_pages
        next_page = paginated.next_page
        current_page = paginated.current_page

        if total_results == 0:
            if filter_applied:
                return Res.error("E-10015", message="No records match applied filters")
            return Res.error("E-10014", message="No records match filter")

        # Fetch all UserOrganization mappings for these users
        user_ids = [user.id for user in users]
        org_map_query = select(UserOrganization).where(
            UserOrganization.user_id.in_(user_ids)
        )
        org_map_result = await db.execute(org_map_query)
        org_maps = org_map_result.scalars().all()
        org_map_dict = {uo.user_id: uo.organization_id for uo in org_maps}

        data = []
        for user in users:
            organization_data = None
            org_id = org_map_dict.get(user.id) or user.organization
            if org_id:
                org = await db.get(Organization, org_id)
                if org:
                    organization_data = {"id": org.id, "name": org.name}
            data.append(
                {
                    "id": user.id,
                    "user_id": user.user_id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "platform": user.platform,
                    "organization": organization_data,
                    "status": user.is_active,
                    "last_activity": (
                        user.last_activity.isoformat() if user.last_activity else None
                    ),
                }
            )

        total_pages = (total_results + limit - 1) // limit
        return Res.success(
            "S-10005",
            data={
                "users": data,
                "total_pages": total_pages,
                "current_page": current_page,
                "next_page": next_page,
                "total_results": total_results,
            },
        )

    async def assign_organization(
        self,
        db,
        current_user,
        user_db,
        user_id,
        payload,
        background_tasks: BackgroundTasks,
    ):
        # Find user
        result = await user_db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        user = result.scalar_one_or_none()
        if not user:
            return Res.error("E-10022", message="User not found")

        old_org = await db.execute(
            select(Organization)
            .join(UserOrganization, Organization.id == UserOrganization.organization_id)
            .where(UserOrganization.user_id == user_id)
        )
        old_org = old_org.scalar_one_or_none()

        # Check organization
        org = await db.get(Organization, payload.organization_id)
        if not org or not org.status:
            return Res.error("E-10021", message="Organization not active")

        # Check if mapping exists
        mapping_query = select(UserOrganization).where(
            UserOrganization.user_id == user_id
        )
        mapping_result = await db.execute(mapping_query)
        mapping = mapping_result.scalar_one_or_none()

        first_assignment = mapping is None

        # store values into variables before assignment for response message
        org_id = payload.organization_id
        org_name = org.name

        if first_assignment:
            # Create mapping
            new_mapping = UserOrganization(user_id=user_id, organization_id=org_id)
            db.add(new_mapping)

            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.USER_MANAGEMENT.value,
                action=AuditLogScenario.ORG_ASSIGNED.value,
                before=f"Organization: Not Assigned",
                after=f"Organization: {org_name}",
                resource_id=current_user.get("user_id"),
            )
        else:
            # Update mapping
            mapping.organization_id = org_id
            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.USER_MANAGEMENT.value,
                action=AuditLogScenario.ORG_REASSIGNED.value,
                before=f"Organization: {old_org.name if old_org else 'Not Assigned'}",
                after=f"Organization: {org_name}",
                resource_id=current_user.get("user_id"),
            )

        # For backward compatibility, update user.organization
        user.organization = org_id

        await db.commit()

        if first_assignment:
            background_tasks.add_task(
                self._send_organization_assignment_email,
                db=user_db,
                user_email=user.email,
                user_name=user.name,
                organization_name=org_name,
                user_role=UserRole(user.role).name.capitalize(),
            )

            return Res.success(
                "S-10012",
                data={
                    "user_id": user_id,
                    "organization": {"id": org_id, "name": org_name},
                },
            )

        background_tasks.add_task(
            self._send_organization_re_assignment_email,
            db=user_db,
            user_email=user.email,
            user_name=user.name,
            prev_organization_name=old_org.name if old_org else "Not Assigned",
            new_organization_name=org_name,
        )

        return Res.success(
            "S-10013",
            data={"user_id": user_id, "organization": {"id": org_id, "name": org_name}},
        )
