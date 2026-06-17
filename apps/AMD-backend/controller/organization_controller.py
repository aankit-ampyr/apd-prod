from services import OrganizationService
from fastapi import Depends, Query
from fastapi.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db,get_user_db, allowed_roles
from dtos import OrganizationCreate, OrganizationUpdate
from constants.enums import UserRole
from typing import Literal, List



class OrganizationController:
    def __init__(self):
        self.service = OrganizationService()


    async def get_organization_users(
        self,
        org_id: int,
        page: int = Query(1),
        limit: int = Query(10),
        search: str | None = Query(None),
        role: int | None = Query(None),
        status: bool | None = Query(None),
        sort: Literal["asc", "desc"] | None = Query(None),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.get_organization_users(
            db=db,
            user_db=user_db,
            org_id=org_id,
            page=page,
            limit=limit,
            search=search,
            role=role,
            status=status,
            sort=sort
        )

    async def create_organization(
        self,
        request: Request,
        org: OrganizationCreate,
        db: AsyncSession = Depends(get_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.create_organization(db, org, current_user)

    async def update_organization(
        self,
        request: Request,
        org_id: int,
        org: OrganizationUpdate,
        db: AsyncSession = Depends(get_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.update_organization(db, current_user, org_id, org)

    async def get_organizations(
        self,
        request: Request,
        page: int = Query(1),
        limit: int = Query(10),
        search: str | None = Query(None),
        status: bool | None = Query(None),
        sort: Literal['asc', 'desc'] | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
  
        return await self.service.get_organizations(
            db=db,
            current_user=current_user,
            page=page,
            limit=limit,
            search=search,
            status=status,
            sort=sort,
        )


    async def get_multiple_organization_users(
        self,
        org_ids: List[int] = Query(..., description="List of organization IDs to fetch users for"),
        search: str | None = Query(None, description="Search term to filter users by name or email"),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        # Only search by email and name, no pagination, no limit

        return await self.service.get_multiple_organization_users(
            db=db,
            user_db=user_db,
            org_ids=org_ids,
            search=search,
            current_user=current_user
        )