from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models import Organization
from utils.response_utils import Res
from utils import audit_logs, build_sectioned_audit_payload
from redis.asyncio import Redis
from python_common.dto.common_dto import LogParams
from dtos import OrganizationCreate, OrganizationUpdate
from constants.enums import Platform, APDAuditLogScenario as AuditLogScenario, APDAuditLogModules as AuditLogModules
from models.organization_model import UserOrganization
from models import User
from typing import Union, List
from datetime import datetime, timezone

class OrganizationService:
    ORGANIZATION_DETAILS_AUDIT_SECTION = "ORGANIZATION DETAILS"

    async def get_organization_users(
        self, 
        db: AsyncSession, 
        user_db: AsyncSession, 
        org_id: Union[int, List[int]], 
        page=1, 
        limit=10, 
        search=None, 
        role=None, 
        status=None, 
        sort=None
    ):
        org_ids = [org_id] if isinstance(org_id, int) else org_id

        org_query = select(UserOrganization.user_id).where(UserOrganization.organization_id.in_(org_ids))
        org_result = await db.execute(org_query)
        user_ids = [row[0] for row in org_result.fetchall()]

        if not user_ids:
            return Res.success('S-10005', data={
                "users": [],
                "total_pages": 0,
                "current_page": page,
                "next_page": None,
                "total_results": 0
            })

        query = select(User).where(User.id.in_(user_ids), User.is_deleted == False)
        filter_applied = False

        if search:
            query = query.where(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.user_id.ilike(f"%{search}%")
                )
            )
            filter_applied = True

        if role is not None:
            query = query.where(User.role == role)
            filter_applied = True

        if status is not None:
            if isinstance(status, str):
                status = status.lower() == "true"
            query = query.where(User.status == status)
            filter_applied = True

        if sort == "asc":
            query = query.order_by(User.last_activity.asc())
        elif sort == "desc":
            query = query.order_by(User.last_activity.desc())
        else:
            query = query.order_by(User.created_at.desc())

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await user_db.execute(count_query)
        total_results = count_result.scalar() or 0
        
        if total_results == 0:
            if filter_applied:
                return Res.error('E-10015', message="No records match applied filters", http_status_code=404)
            return Res.error('E-10014', message="No records match filter", http_status_code=404)
        
        if limit == -1:
            result = await user_db.execute(query)
            users = result.scalars().all()
            total_pages, current_page, next_page = 1, 1, None
        else:
            offset = (page - 1) * limit
            result = await user_db.execute(query.offset(offset).limit(limit))
            users = result.scalars().all()
            total_pages = (total_results + limit - 1) // limit
            current_page = page
            next_page = page + 1 if page < total_pages else None

        data = []
        for user in users:
            data.append({
                "id": user.id,
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "platform": user.platform,
                "status": user.status,
                "last_activity": user.last_activity.isoformat() if user.last_activity else None
            })

        return Res.success('S-10005', data={
            "users": data,
            "total_pages": total_pages,
            "current_page": current_page,
            "next_page": next_page,
            "total_results": total_results
        })

    async def create_organization(self, db: AsyncSession, redis: Redis, org: OrganizationCreate, current_user: dict):
        try:
            if Platform.AMD.value not in current_user['platform']:
                return Res.error('E-10013', message="Only AMD admin can access this API", http_status_code=403)
            
            if not org.name or not org.name.strip():
                return Res.error('E-10002', message="Organization name cannot be blank", http_status_code=422)

            result = await db.execute(
                select(Organization).where(
                    func.lower(Organization.name) == org.name.strip().lower()
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                return Res.error('E-10019', message="Organization already exists", http_status_code=409)
            
            result = await db.execute(select(func.count(Organization.id)))
            count = result.scalar() or 0

            utc_now = datetime.now(timezone.utc)

            new_org = Organization(
                name=org.name.strip(),
                status=True,
                created_at=utc_now 
            )
            db.add(new_org)
            await db.flush() 

            await audit_logs(
                module=AuditLogModules.ORGANIZATION_MANAGEMENT_AMD,
                action=AuditLogScenario.ORG_CREATED,
                user_id=current_user['user_id'],
                user_role=current_user['role'],
                before=None,
                after=f"Org: {new_org.name}",
                db=db,
                redis=redis,
                resource_id=new_org.org_id
            )

            await db.commit()
            await db.refresh(new_org)

            data = {
                "id": new_org.id,
                "org_id": new_org.org_id,
                "name": new_org.name,
                "status": new_org.status,
                "created_at": new_org.created_at.isoformat()
            }

            return Res.success('S-10007', data=data, http_status_code=201)

        except Exception as e:
            await db.rollback()
            import traceback
            traceback.print_exc()
            return Res.error('E-10001', message=str(e))
        
    
    async def update_organization(self, db: AsyncSession, redis: Redis, current_user: dict, org_id: int, org_data: OrganizationUpdate):
        if Platform.AMD.value not in current_user['platform']:
            return Res.error('E-10013', message="Only AMD admin can access this API", http_status_code=403)
        
        result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )

        org = result.scalar_one_or_none()

        if not org:
            return Res.error('E-10014', message="Organization not found", http_status_code=404)

        # check duplicate name if updating
        if org_data.name:
            result = await db.execute(
                select(Organization).where(
                    func.lower(Organization.name) == org_data.name.lower(),
                    Organization.id != org_id
                )
            )
            existing = result.scalars().first()

            if existing:
                return Res.error('E-10019', message="Organization already exists", http_status_code=409)

        # Capture old name before updating for audit log
        old_name = org.name

        if (org_data.name is not None):
            org.name = org_data.name.strip()
        if (org_data.status is not None):
            org.status = org_data.status


        log_params = LogParams(
            module=AuditLogModules.ORGANIZATION_MANAGEMENT_AMD,
            action=AuditLogScenario.ORG_UPDATED,
            user_id=current_user['user_id'],
            user_role=current_user['role'],
            before=build_sectioned_audit_payload(
                self.ORGANIZATION_DETAILS_AUDIT_SECTION,
                {"Name": old_name},
            ) if org_data.name else None,
            after=build_sectioned_audit_payload(
                self.ORGANIZATION_DETAILS_AUDIT_SECTION,
                {"Name": org.name},
            ) if org_data.name else None,
            resource_id=org.org_id,
            db=db,
        )

        only_org_date_passed = org_data.name is None and org_data.status is not None
        if org_data.status is not None and only_org_date_passed:
            if org_data.status is False:
                log_params = LogParams(
                    module=AuditLogModules.ORGANIZATION_MANAGEMENT_AMD,
                    action=AuditLogScenario.ORG_INACTIVATED,
                    user_id=current_user['user_id'],
                    user_role=current_user['role'],
                    before="Status: Active",
                    after="Status: Inactive",
                    resource_id=org.org_id,
                    db=db,
                )
            elif org_data.status is True:
                log_params = LogParams(
                    module=AuditLogModules.ORGANIZATION_MANAGEMENT_AMD,
                    action=AuditLogScenario.ORG_ENABLED,
                    user_id=current_user['user_id'],
                    user_role=current_user['role'],
                    before="Status: Inactive",
                    after="Status: Active",
                    resource_id=org.org_id,
                    db=db,
                )

        await audit_logs(**log_params.model_dump(), redis=redis)

        await db.commit()
        await db.refresh(org)

        data = {
            "id": org.id,
            "org_id": org.org_id,
            "name": org.name,
            "status": org.status,
            "created_at": org.created_at.isoformat() if org.created_at else None
        }

        # status-specific responses
        if org_data.status is not None and only_org_date_passed:

            if org_data.status is False:
                return Res.success('S-10009', data=data)

            if org_data.status is True:
                return Res.success('S-10010', data=data)

        return Res.success('S-10008', data=data)

    async def get_organizations(
        self,
        db: AsyncSession,
        current_user: dict,
        page=1,
        limit=10,
        search=None,
        status=None,
        sort=None,
    ):
        if Platform.AMD.value not in current_user['platform']:
            return Res.error('E-10013', message="Only AMD admin can access this API", http_status_code=403)

        query = select(Organization)
        filter_applied = False

        # search filter
        if search:
            query = query.where(
                or_(
                    Organization.name.ilike(f"%{search}%"),
                    Organization.org_id.ilike(f"%{search}%"),
                )
            )
            filter_applied = True

        # status filter
        if status is not None:
            query = query.where(
                Organization.status == status
            )
            filter_applied = True

        # total count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_query)
        total_results = count_result.scalar()

        if total_results == 0:
            if not filter_applied:
                return Res.error('E-10014', message="No organizations found", http_status_code=404)
            return Res.error('E-10015', message="No organizations found", http_status_code=404)

        # pagination
        if limit != -1:
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

        if sort == "asc":
            query = query.order_by(Organization.created_at.asc())
        elif sort == "desc":
            query = query.order_by(Organization.created_at.desc())
        else:
            query=query.order_by(Organization.created_at.desc())

        result = await db.execute(query)
        orgs = result.scalars().all()

        data = [
            {
                "id": o.id,
                "org_id": o.org_id,
                "name": o.name,
                "status": o.status,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in orgs
        ]

        total_pages = (total_results + limit - 1) // limit if limit != -1 else 1

        return Res.success(
            'S-10006',
            data={
                "organizations": data,
                "total_pages": total_pages,
                "current_page": page,
                "next_page": page + 1 if page < total_pages else None,
                "total_results": total_results
            }
        )


    async def get_multiple_organization_users(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        org_ids: List[int],
        current_user: dict,
        search: str,
    ):
        # Get all user_ids for the given org_ids
        org_query = select(UserOrganization.user_id).where(UserOrganization.organization_id.in_(org_ids))
        org_result = await db.execute(org_query)
        user_ids = [row[0] for row in org_result.fetchall()]

        if not user_ids:
            return Res.success('S-10005', data={"users": []})

        query = select(User).where(User.id.in_(user_ids), User.is_deleted == False, User.status == True)

        if search:
            query = query.where(
                or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
            )

        result = await user_db.execute(query)
        users = result.scalars().all()

        data = []
        for user in users:
            data.append({
                "id": user.id,
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "platform": user.platform,
                "status": user.status,
                "last_activity": user.last_activity.isoformat() if user.last_activity else None
            })

        return Res.success('S-10005', data={"users": data})
