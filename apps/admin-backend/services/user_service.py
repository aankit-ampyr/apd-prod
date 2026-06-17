from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from utils import Res
from python_common.utils import paginate
from models import User
from dtos import UserCreate, UserUpdate
from constants.enums import UserRole, Platform
import traceback
import asyncio
from utils.template_utils import TemplateUtils
from utils.mail_utils import MailUtils
from config import AMD_FRONT_END_URL, BESS_FRONT_END_URL
from datetime import timedelta, timezone, datetime


class UserService:

    async def _send_invitation_email(self, email: str, name: str, role_name: str, platform_names: str, login_url: str, db: AsyncSession):
        """Sends the invitation email using Template ID 1."""
        try:
            template_service = TemplateUtils()
            template = await template_service.get_by_ref(db, 1)
            if template:
                asyncio.create_task(
                    MailUtils.send_365_async(
                        recipient_list=[email],
                        subject=template_service.get_subject(template, name=name),
                        html_message=template_service.get_message(
                            template, 
                            name=name, 
                            platform_name=platform_names, 
                            role=role_name,
                            login_url=login_url 
                        ),
                    )
                )
        except Exception:
            traceback.print_exc()

    async def _send_account_disabled_notification_email(self, email: str, name: str, db: AsyncSession):
        """Sends the account disabled notification email using Template ID 3."""
        try:
            template_service = TemplateUtils()
            template_ref = 3
            template = await template_service.get_by_ref(db, template_ref)
            if template:
                asyncio.create_task(
                    MailUtils.send_365_async(
                        recipient_list=[email],
                        subject=template_service.get_subject(template, name=name),
                        html_message=template_service.get_message(
                            template,
                            name=name,
                        ),
                    )
                )
        except Exception:
            traceback.print_exc()

    async def _send_account_enabled_notification_email(self, email: str, name: str, login_url: str, db: AsyncSession):
        """Sends the account enabled notification email using Template ID 2."""
        try:
            template_service = TemplateUtils()
            template_ref = 4
            template = await template_service.get_by_ref(db, template_ref)
            if template:
                asyncio.create_task(
                    MailUtils.send_365_async(
                        recipient_list=[email],
                        subject=template_service.get_subject(template, name=name),
                        html_message=template_service.get_message(
                            template,
                            name=name,
                            login_url=login_url
                        ),
                    )
                )
        except Exception:
            traceback.print_exc()

    async def get_users(
        self,
        db: AsyncSession,
        current_user,
        page=1,
        limit=10,
        search=None,
        role=None,
        organization=None,
        platform=None,
        start_date=None,
        end_date=None,
        status=None,
        sort=None
    ):
        current_user_platform = current_user.get('platform')
        query = select(User).where(User.is_deleted == False, User.role != UserRole.SUPER_ADMIN.value)

        filter_applied = False
        if current_user.get('role') == UserRole.ADMIN.value:
            if Platform.AMD not in current_user_platform:
                return Res.error('E-10013', message="Admins must have access to at least AMD platform")
            query = query.where(User.platform.overlap([Platform.AMD]), User.id != current_user.get('id'))

        # Sorting Logic
        if sort == "asc":
            query = query.order_by(User.last_activity.asc())
        elif sort == "desc":
            query = query.order_by(User.last_activity.desc())
        else:
            query = query.order_by(User.created_at.desc())

        if search:
            query = query.where(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"), User.user_id.ilike(f"%{search}%")))
            filter_applied = True
        if role is not None:
            query = query.where(User.role == role)
            filter_applied = True
        if platform:
            query = query.where(User.platform == platform)
            filter_applied = True
        if organization is not None:
            query = query.where(User.organization == organization)
            filter_applied = True
        if status is not None:
            if isinstance(status, str): status = status.lower() == "true"
            query = query.where(User.status == status)
            filter_applied = True
        
        paginated = await paginate(db=db, base_query=query, page=page, limit=limit)
        
        users = paginated.records
        total_results = paginated.total_results
        total_pages = paginated.total_pages
        next_page = paginated.next_page
        current_page = paginated.current_page

        data = []
        for user in users:
            data.append({
                "id": user.id,
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "platform": user.platform,
                "status": user.is_active,
                "last_activity": user.last_activity.isoformat() if user.last_activity else None
            })
        
        if total_results == 0:
            if filter_applied:
                return Res.error('E-10015', message="No data found")
            return Res.error('E-10014', message="No records match applied filters")

        return Res.success('S-10005', data={
            "users": data, 
            "total_pages": total_pages,
            "current_page": current_page,
            "next_page": next_page, 
            "total_results": total_results,
        })

    async def create_user(self, db: AsyncSession, user: UserCreate):
        try:
            # 1. Duplicate Email Check
            result = await db.execute(
                select(User).where(
                    User.email == user.email,
                    User.is_deleted == False
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                return Res.error('E-10009', message="Email already exists")

            # 2. Role & Platform Validation
            role_value = int(user.role)
            if role_value not in [role.value for role in UserRole]:
                return Res.error('E-10004', message="Invalid role")

            for p in user.platform:
                if p not in [Platform.AMD, Platform.BESS]:
                    return Res.error('E-10023', message="Invalid platform")

            if Platform.AMD.value in user.platform and role_value == UserRole.VIEWER.value:
                return Res.error('E-10024', message="Invalid role for platform")

            new_user = User(
                name=user.name.strip(),
                email=user.email.strip().lower(),
                role=role_value,
                platform=user.platform,
                status=user.status
            )
            db.add(new_user)
            await db.flush() 
            await db.commit() 
            await db.refresh(new_user)

            # 3. Trigger Individual Emails per Platform
            role_label = next((r.name for r in UserRole if r.value == role_value), "User")

            if Platform.AMD.value in user.platform:
                try:
                    await self._send_invitation_email(
                        email=new_user.email,
                        name=new_user.name,
                        role_name=role_label,
                        platform_names="APD",
                        login_url=f"{AMD_FRONT_END_URL}/login",
                        db=db
                    )
                except Exception as e:
                    print(f"APD Email failed: {e}")

            if Platform.BESS.value in user.platform:
                try:
                    await self._send_invitation_email(
                        email=new_user.email,
                        name=new_user.name,
                        role_name=role_label,
                        platform_names="PSP",
                        login_url=f"{BESS_FRONT_END_URL}/login",
                        db=db
                    )
                except Exception as e:
                    print(f"PSP Email failed: {e}")

            # 6. Final Response
            return Res.success('S-10001', data={
                "id": new_user.id,
                "user_id": new_user.user_id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "platform": new_user.platform,
                "status": new_user.status
            })

        except Exception as e:
            traceback.print_exc()
            return Res.error('E-10001', message=str(e))

    async def update_user(self, db: AsyncSession, user_id: int, user_data: UserUpdate):
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        db_user = result.scalar_one_or_none()

        if not db_user:
            return Res.error('E-10014', message="User not found")

        updated_fields = user_data.model_dump(exclude_unset=True)
        final_role = int(updated_fields.get("role", db_user.role))
        final_platforms = updated_fields.get("platform", db_user.platform)

        if "role" in updated_fields:
            if final_role not in [role.value for role in UserRole]:
                return Res.error('E-10004', message="Invalid role")

        if "email" in updated_fields:
            result = await db.execute(
                select(User).where(
                    User.email == updated_fields["email"],
                    User.id != user_id,
                    User.is_deleted == False
                )
            )
            if result.scalar_one_or_none():
                return Res.error('E-10009', message="Email already exists")
            
        if Platform.AMD.value in final_platforms and final_role == UserRole.VIEWER.value:
            return Res.error('E-10024', message="Invalid role for platform")
            
        if "platform" in updated_fields:
            db_user.organization = None

        status_updated = "status" in updated_fields and updated_fields["status"] != db_user.status
        
        for key, value in updated_fields.items():
            if (key == 'status'):

                if value is False:
                    db_user.blocked_expiry = datetime.now(timezone.utc) + timedelta(days=1)
                elif value is True:
                    db_user.blocked_expiry = None

            setattr(db_user, key, value)

        await db.commit()
        await db.refresh(db_user)

        organization_data = None

        data = {
            "id": db_user.id,
            "user_id": db_user.user_id,
            "name": db_user.name,
            "email": db_user.email,
            "role": db_user.role,
            "platform": db_user.platform,
            "organization": organization_data,
            "status": db_user.status,
            "last_activity": db_user.last_activity.isoformat() if db_user.last_activity else None
        }

        # ============= Send Email =============
        if updated_fields["status"] is False and status_updated:
            await self._send_account_disabled_notification_email(db=db, email=db_user.email, name=db_user.name)
        
        if updated_fields["status"] is True and status_updated:
            # Send account enabled notification email with platform-specific login URLs
            if Platform.AMD.value in db_user.platform:
                login_url = f"{AMD_FRONT_END_URL}/login"
                await self._send_account_enabled_notification_email(db=db, email=db_user.email, name=db_user.name, login_url=login_url)

            if Platform.BESS.value in db_user.platform:
                login_url = f"{BESS_FRONT_END_URL}/login"
                await self._send_account_enabled_notification_email(db=db, email=db_user.email, name=db_user.name, login_url=login_url)


        # if only status is updated, return specific messages for enable/disable actions
        if "status" in updated_fields and len(updated_fields) == 1:

            if updated_fields["status"] is False:
                return Res.success('S-10003', data=data)

            if updated_fields["status"] is True:
                return Res.success('S-10004', data=data)


        return Res.success('S-10002', data=data)

    async def delete_user(self, db: AsyncSession, user_id: int):

        result = await db.execute(
            select(User).where(
                User.id == user_id,
                User.is_deleted == False
            )
        )

        db_user = result.scalar_one_or_none()

        if not db_user:
            return Res.error('E-10022', message="User not found")

        deleted_user_id = db_user.id

        db_user.is_deleted = True

        await db.commit()

        return Res.success(
            'S-10011',
            data={"user_id": deleted_user_id}
        )
