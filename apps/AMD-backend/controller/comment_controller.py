# ── controller/comment_controller.py ──

from fastapi import Depends, Query, Body, Path, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from db.dependencies import get_db, get_user_db, allowed_roles, verify_asset_access
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from models.asset import Asset
from services.comment_service import CommentService
from constants.enums import UserRole, Platform
from utils.response_utils import Res


class CommentController:
    def __init__(self):
        self.service = CommentService()

    async def create_comment(
        self,
        background_task: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        payload: Dict[str, Any] = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value),
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.create_comment(
            db=db,
            redis=redis,
            user_db=user_db,
            asset_id=asset.id,
            payload=payload,
            current_user=current_user,
            background_task=background_task
        )

    async def list_comments(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
        context_module: Optional[str] = Query(None),
        context_tab: Optional[str] = Query(None),
        context_type: int | None = Query(None),
        context_widget: Optional[str] = Query(None),
        context_data_point: Optional[str] = Query(None),
        context_year: Optional[int] = Query(None),
        context_month: Optional[int] = Query(None),
        search: Optional[str] = Query(None),
        owner_id: Optional[int] = Query(None),
        unread_only: bool = Query(False),
        page: int = Query(1, ge=1),
        limit: int = Query(500, ge=1, le=500),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.list_comments(
            db=db,
            user_db=user_db,
            asset_id=asset.id,
            current_user=current_user,
            context_module=context_module,
            context_tab=context_tab,
            context_type=context_type,
            context_widget=context_widget,
            context_data_point=context_data_point,
            context_year=context_year,
            context_month=context_month,
            search=search,
            owner_id=owner_id,
            unread_only=unread_only,
            page=page,
            limit=limit,
        )

    async def update_comment(
        self,
        background_task: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        comment_id: int = Path(...),
        payload: Dict[str, Any] = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.update_comment(
            db=db,
            redis=redis,
            user_db=user_db,
            asset_id=asset.id,
            comment_id=comment_id,
            payload=payload,
            current_user=current_user,
            background_task=background_task,
        )
    
    async def delete_comment(
        self,
        asset: Asset = Depends(verify_asset_access),
        comment_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.delete_comment(
            db=db,
            redis=redis,
            asset_id=asset.id,
            comment_id=comment_id,
            current_user=current_user,
        )

    async def reply_to_comment(
        self,
        background_task: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        comment_id: int = Path(...),
        payload: Dict[str, Any] = Body(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.reply_to_comment(
            db=db,
            redis=redis,
            user_db=user_db,
            asset_id=asset.id,
            comment_id=comment_id,
            payload=payload,
            current_user=current_user,
            background_task=background_task,
        )


    
    async def get_taggable_users(
        self,
        asset: Asset = Depends(verify_asset_access),
        context_module: str = Query(None, description="The context module (e.g. ExecutiveAnalysis)"),
        search: Optional[str] = Query(None),
        db: AsyncSession = Depends(get_db),
        user_db: AsyncSession = Depends(get_user_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_taggable_users(
            db=db,
            user_db=user_db,
            asset_id=asset.id,
            current_user=current_user,
            context_module=context_module,
            search=search,
        )

    async def mark_comment_read(
        self,
        asset: Asset = Depends(verify_asset_access),
        comment_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.mark_comment_read(
            db=db,
            asset_id=asset.id,
            comment_id=comment_id,
            current_user=current_user,
        )

    async def get_comment_status(
        self,
        asset: Asset = Depends(verify_asset_access),
        comment_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.get_comment_status(
            db=db,
            asset_id=asset.id,
            comment_id=comment_id,
            current_user=current_user,
        )
