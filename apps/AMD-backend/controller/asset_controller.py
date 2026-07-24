from fastapi import Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db, get_user_db, allowed_roles
from services.asset_service import AssetService
from dtos.asset_dto import (
    ActivateAssetPayload,
    AssetEdit,
    ReassignAsset,
    AssetCreate,
    AssetOptimizationUpdate,
    GenerateMergeFile,
    GenerateOptmizedFile,
)
from constants.enums import UserRole, Platform
from typing import List, Literal
from utils.response_utils import Res
from fastapi import Depends, UploadFile, File, Form
from python_common.constants.enums import Month


class AssetController:
    def __init__(self):
        self.service = AssetService()

    async def get_assets(
        self,
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
        page: int = Query(1),
        limit: int = Query(10),
        search: str | None = Query(None),
        type: int | None = Query(None),
        organization: int | None = Query(None),
        country: int | None = Query(None),
        status: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
    ):

        return await self.service.get_assets(
            db, current_user, page, limit, search, type, organization, country, status
        )

    async def reassign_asset(
        self,
        asset_id: int,
        payload: ReassignAsset,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):

        return await self.service.reassign_asset(
            db,
            asset_id,
            payload.organization_id,
            current_user,
        )

    async def assets_users(
        self,
        asset_id: int,
        limit: int = Query(10),
        page: int = Query(1),
        search: str | None = Query(None),
        role: int | None = Query(None),
        status: bool | None = Query(None),
        sort: str | None = Query(None),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
    ):
        return await self.service.assets_users(
            db=db,
            user_db=user_db,
            asset_id=asset_id,
            limit=limit,
            page=page,
            search=search,
            role=role,
            status=status,
            sort=sort,
        )

    async def multiple_assets_users(
        self,
        asset_ids: List[int] = Query(...),
        search: str | None = Query(None),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        return await self.service.multiple_assets_users(
            db=db,
            user_db=user_db,
            assets_id=asset_ids,
            search=search,
            current_user=current_user,
        )

    async def get_asset_details(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        return await self.service.get_asset_details(db, user_db, asset_id, current_user)

    async def onboard_asset(
        self,
        payload: AssetCreate,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        return await self.service.onboard_new_asset(
            db=db, payload=payload, current_user=current_user
        )

    async def edit_asset(
        self,
        asset_id: int,
        payload: AssetEdit,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        return await self.service.edit_asset(
            asset_id=asset_id,
            db=db,
            payload=payload,
            current_user=current_user,
        )

    async def save_optimization_params(
        self,
        asset_id: int,
        payload: AssetOptimizationUpdate,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized")
        return await self.service.save_optimization_parameters(
            db, asset_id, payload, current_user
        )

    async def upload_aggregator_report(
        self,
        asset_id: int,
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        month: int = Form(None),
        year: int = Form(None),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.upload_aggregator_report(
            db=db,
            asset_id=asset_id,
            file=file,
            validation_month=month,
            validation_year=year,
            current_user=current_user,
        )

    async def remove_aggregator_report(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.remove_aggregator_report(db, asset_id, current_user)

    async def upload_scada_report(
        self,
        asset_id: int,
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        month: int = Form(None),
        year: int = Form(None),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.upload_scada_report(
            db=db,
            asset_id=asset_id,
            file=file,
            validation_month=month,
            validation_year=year,
            current_user=current_user,
        )

    async def upload_solar_report(
        self,
        asset_id: int,
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        month: int = Form(None),
        year: int = Form(None),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.upload_solar_report(
            db=db,
            asset_id=asset_id,
            file=file,
            validation_month=month,
            validation_year=year,
            current_user=current_user,
        )

    async def merge_and_process_dataset(
        self,
        asset_id: int,
        payload: GenerateMergeFile,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.merge_and_process_dataset(
            db, asset_id, payload, current_user
        )

    async def remove_scada_report(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")

        return await self.service.remove_scada_report(db, asset_id, current_user)

    async def download_merged_dataset(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.download_merged_dataset(db, asset_id, current_user)

    async def activate_asset(
        self,
        asset_id: int,
        background_task: BackgroundTasks,
        payload: ActivateAssetPayload,
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.activate_asset(
            db, user_db, asset_id, payload.status, current_user, background_task
        )

    async def upload_iar_report(
        self,
        asset_id: int,
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.upload_iar_report(db, asset_id, file, current_user)

    async def remove_iar_report(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.remove_iar_report(
            db=db, asset_id=asset_id, current_user=current_user
        )

    async def generate_optimized_dataset(
        self,
        asset_id: int,
        payload: GenerateOptmizedFile,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013")
        return await self.service.generate_optimized_dataset(
            db=db, payload=payload, asset_id=asset_id, current_user=current_user
        )

    async def delete_asset_file(
        self,
        asset_id: int,
        file_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        return await self.service.delete_asset_file(
            db=db, asset_id=asset_id, file_id=file_id, current_user=current_user
        )

    async def get_file_history(
        self,
        asset_id: int,
        month: List[int] = Query(None),
        year: List[int] = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        # Platform check
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized")
        return await self.service.get_file_history(
            db=db, asset_id=asset_id, month=month, year=year, current_user=current_user
        )

    async def download_file(
        self,
        file_id: int,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        # Platform check
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.download_file(
            db=db, asset_id=asset_id, file_id=file_id, current_user=current_user
        )

    async def submit_asset_for_approval(
        self,
        asset_id: int,
        background_tasks: BackgroundTasks,
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ANALYST.value)),
    ):

        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.submit_asset_for_approval(
            db=db,
            user_db=user_db,
            asset_id=asset_id,
            current_user=current_user,
            background_task=background_tasks,
        )
