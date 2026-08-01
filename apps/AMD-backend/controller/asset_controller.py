from fastapi import Depends, Query, BackgroundTasks, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db, get_user_db, allowed_roles, verify_asset_access
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from models.asset import Asset
from services.asset_service import AssetService
from dtos.asset_dto import (
    ActivateAssetPayload,
    AssetEdit,
    ReassignAsset,
    AssetCreate,
    AssetOptimizationUpdate,
    GenerateMergeFile,
    GenerateOptmizedFile,
    AssetGenerateAnalytics,
)
from constants.enums import UserRole, Platform
from typing import List
from utils.response_utils import Res
from decorators import response_cache
from constants.defaults import API_RESULT_CACHE_TTL
from fastapi.requests import Request
from fastapi import UploadFile, File, Form


class AssetController:
    def __init__(self):
        self.service = AssetService()

    async def start_analysis_computation(
        self,
        background_tasks: BackgroundTasks,
        data: AssetGenerateAnalytics = Body(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        return await self.service.start_analysis_computation(
            db=db,
            data=data,
            current_user=current_user,
            background_tasks=background_tasks,
        )

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
        asset: Asset = Depends(verify_asset_access),
        payload: ReassignAsset = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):

        return await self.service.reassign_asset(
            db,
            redis,
            asset.id,
            payload.organization_id,
            current_user,
        )

    async def assets_users(
        self,
        asset: Asset = Depends(verify_asset_access),
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
            asset_id=asset.id,
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
        request: Request,  # to capture the request for caching purposes
        skip_audit: bool = Query(False),
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        return await self.service.get_asset_details(
            db, redis, user_db, asset.id, current_user, skip_audit
        )

    async def onboard_asset(
        self,
        payload: AssetCreate,
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        return await self.service.onboard_new_asset(
            db=db, redis=redis, payload=payload, current_user=current_user
        )

    async def edit_asset(
        self,
        asset: Asset = Depends(verify_asset_access),
        payload: AssetEdit = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        return await self.service.edit_asset(
            asset_id=asset.id,
            db=db,
            redis=redis,
            payload=payload,
            current_user=current_user,
        )

    async def save_optimization_params(
        self,
        asset: Asset = Depends(verify_asset_access),
        payload: AssetOptimizationUpdate = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized", http_status_code=403)
        return await self.service.save_optimization_parameters(
            db, redis, asset.id, payload, current_user
        )

    async def upload_aggregator_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        month: int = Form(None),
        year: int = Form(None),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.upload_aggregator_report(
            db=db,
            redis=redis,
            asset_id=asset.id,
            file=file,
            validation_month=month,
            validation_year=year,
            current_user=current_user,
        )

    async def remove_aggregator_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)
        return await self.service.remove_aggregator_report(
            db, redis, asset.id, current_user
        )

    async def upload_scada_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        month: int = Form(None),
        year: int = Form(None),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)
        return await self.service.upload_scada_report(
            db=db,
            redis=redis,
            asset_id=asset.id,
            file=file,
            validation_month=month,
            validation_year=year,
            current_user=current_user,
        )

    async def merge_and_process_dataset(
        self,
        backgroundTask: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        payload: GenerateMergeFile = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)
        return await self.service.merge_and_process_dataset(
            db=db,
            asset_id=asset.id,
            payload=payload,
            current_user=current_user,
            backgroundTask=backgroundTask,
            redis=redis,
        )

    async def remove_scada_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)

        return await self.service.remove_scada_report(db, redis, asset.id, current_user)

    async def download_merged_dataset(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)
        return await self.service.download_merged_dataset(
            db=db, redis=redis, asset_id=asset.id, current_user=current_user
        )

    async def activate_asset(
        self,
        background_task: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        payload: ActivateAssetPayload = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.activate_asset(
            db=db,
            redis=redis,
            user_db=user_db,
            asset_id=asset.id,
            status=payload.status,
            current_user=current_user,
            background_task=background_task,
        )

    async def upload_iar_report(
        self,
        backgroundTask: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.upload_iar_report(
            db, redis, asset.id, file, current_user, backgroundTask
        )

    async def remove_iar_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.remove_iar_report(
            db=db, redis=redis, asset_id=asset.id, current_user=current_user
        )

    async def generate_optimized_dataset(
        self,
        backgroundTasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        payload: GenerateOptmizedFile = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)
        return await self.service.generate_optimized_dataset(
            db=db,
            redis=redis,
            payload=payload,
            asset_id=asset.id,
            current_user=current_user,
            backgroundTask=backgroundTasks,
        )

    async def delete_asset_file(
        self,
        backgroundTask: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        file_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        return await self.service.delete_asset_file(
            db=db,
            redis=redis,
            asset_id=asset.id,
            file_id=file_id,
            current_user=current_user,
            backgroundTask=backgroundTask,
        )

    async def get_file_history(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: List[int] = Query(None),
        year: List[int] = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        # Platform check
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized", http_status_code=403)
        return await self.service.get_file_history(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def download_file(
        self,
        file_id: int,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        # Platform check
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.download_file(
            db=db,
            redis=redis,
            asset_id=asset.id,
            file_id=file_id,
            current_user=current_user,
        )

    async def submit_asset_for_approval(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(allowed_roles(UserRole.ANALYST.value)),
    ):

        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.submit_asset_for_approval(
            db=db,
            redis=redis,
            user_db=user_db,
            asset_id=asset.id,
            current_user=current_user,
            background_task=background_tasks,
        )
