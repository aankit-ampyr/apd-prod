# ── controller/invoice_analysis_controller.py ── (updated with settlement methods)

from fastapi import Depends, Query, UploadFile, File, Form,Path, Body, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Literal,Optional
from db.dependencies import get_db, allowed_roles, verify_asset_access
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from models.asset import Asset
from services.invoice_service import InvoiceAnalysisService, PdfInvoiceService
from constants.enums import UserRole, Platform
from utils.response_utils import Res



class PdfInvoiceController:
    def __init__(self):
        self.service = PdfInvoiceService()

    # ── PDF Invoice endpoints ──────────────────────────────────────────────────
    async def upload_pdf_invoice(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        month: int = Form(...),
        year: int = Form(...),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.upload_report(
            db=db,
            redis=redis,
            asset_id=asset.id,
            month=month,
            year=year,
            file=file,
            current_user=current_user,
            background_tasks=background_tasks,
        )
    
    async def get_pdf_invoices(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
        search: str | None = Query(None),
        type: int | None = Query(None),
        page: int = Query(1),
        limit: int = Query(10),
        sort: List[str] = Query(None),
        month: int | None = Query(None),
        year: int | None = Query(None),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_pdf_invoices(
            db=db,
            asset_id=asset.id,
            current_user=current_user,
            search=search,
            type=type,
            page=page,
            limit=limit,
            sort=sort,
            month=month,
            year=year,
        )

    async def delete_pdf_invoice(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),  
        invoice_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.delete_pdf_invoice(
            db=db,
            redis=redis,  
            asset_id=asset.id,  
            invoice_id=invoice_id,
            current_user=current_user,
            background_tasks=background_tasks
        )

    async def get_invoice_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
        month: List[int] | None = Query(None),
        year: List[int] | None = Query(None),
        source: Literal["asset_management", "left_navigation"] | None = Query(None)
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_invoice_summary(
            db=db,
            redis=redis,
            asset_id=asset.id,
            current_user=current_user,
            month=month,
            year=year,
            source=source
        )

    async def get_invoice_preview(
        self,
        asset: Asset = Depends(verify_asset_access),  
        invoice_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)
        return await self.service.get_invoice_preview(
            db=db,
            asset_id=asset.id,  
            invoice_id=invoice_id,
            current_user=current_user
        )

    async def download_invoice(
        self,
        asset: Asset = Depends(verify_asset_access),  
        invoice_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
        source: Literal["preview", "upload_history"] | None = Query(None)
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)
        return await self.service.download_invoice(
            db=db,
            redis=redis,
            asset_id=asset.id,  
            invoice_id=invoice_id,
            current_user=current_user,
            source=source
        )

    async def export_invoice_list(
        self,
        asset: Asset = Depends(verify_asset_access), 
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
        search: str | None = Query(None),
        type: int | None = Query(None),
        page: int = Query(1),
        limit: int = Query(10),
        sort: List[str] = Query(None),
        month: int | None = Query(None),
        year: int | None = Query(None),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)
        return await self.service.export_invoice_list(
            db=db,
            redis=redis,
            asset_id=asset.id, 
            current_user=current_user,
            search=search,
            type=type,
            page=page,
            limit=limit,
            sort=sort,
            month=month,
            year=year,
        )
    # ── Settlement endpoints ──────────────────────────────────────────────────

    async def upload_settlement(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        month: int = Form(...),
        year: int = Form(...),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)
        
        return await self.service.upload_settlement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            month=month,
            year=year,
            file=file,
            background_tasks=background_tasks,
            current_user=current_user,
        )

    async def get_settlements(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
        month: int | None = Query(None),
        year: int | None = Query(None),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_settlements(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            current_user=current_user,
        )

    async def delete_settlement(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        settlement_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.delete_settlement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            settlement_id=settlement_id,
            current_user=current_user,
            background_tasks=background_tasks
        )

    async def export_settlement(
        self,
        asset: Asset = Depends(verify_asset_access),
        settlement_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)
        
        return await self.service.export_settlement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            settlement_id=settlement_id,
            current_user=current_user,
        )
    
    async def upload_summary_statement(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        month: int = Form(...),
        year: int = Form(...),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.upload_summary_statement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            month=month,
            year=year,
            file=file,
            current_user=current_user,
            background_tasks=background_tasks
        )
    
    async def list_summary_statements(
        self,
        asset: Asset = Depends(verify_asset_access),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value
            )
        ),
        month: Optional[int] = Query(None),
        year: Optional[int] = Query(None),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.list_summary_statements(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            current_user=current_user,
        )


    async def delete_summary_statement(
        self,
        background_tasks: BackgroundTasks,
        asset: Asset = Depends(verify_asset_access),
        statement_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.delete_summary_statement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            statement_id=statement_id,
            current_user=current_user,
            background_tasks=background_tasks
        )
    
    async def download_summary_statement(
        self,
        asset: Asset = Depends(verify_asset_access),
        statement_id: int = Path(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.download_summary_statement(
            db=db,
            redis=redis,
            asset_id=asset.id,
            statement_id=statement_id,
            current_user=current_user,
        )
            
        
   
class InvoiceAnalysisController:
    def __init__(self):
        # reusing the same controller/service instance 
        self.service = InvoiceAnalysisService()

    async def export_capacity_market(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.export_capacity_market(
            db=db,
            asset_id=asset.id,
            year=year,
            month=month,
            current_user=current_user,
        )
    
    # async def get_revenue_reconciliation(
    #     self,
    #     asset: Asset = Depends(verify_asset_access),
    #     year: int = Query(...),
    #     months: List[int] | None = Query(None),
    #     db: AsyncSession = Depends(get_db),
    #     current_user: dict = Depends(
    #         allowed_roles(
    #             UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
    #         )
    #     ),
    # ):
    #     if Platform.AMD.value not in current_user.get("platform", []):
    #         return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

    #     return await self.service.get_revenue_reconciliation(
    #         db=db,
    #         asset_id=asset.id,
    #         year=year,
    #         months=months,
    #         current_user=current_user,
    #     )

    async def export_revenue_reconciliation(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        months: List[int] | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.export_revenue_reconciliation(
            db=db,
            asset_id=asset.id,
            asset=asset,
            year=year,
            months=months,
            current_user=current_user,
        )

    async def get_per_stream_comparison(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        months: List[int] | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_per_stream_comparison(
            db=db,
            asset=asset,
            asset_id=asset.id,
            year=year,
            months=months,
            current_user=current_user,
        )


    async def get_revenue_reconciliation_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        months: List[int] | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_revenue_reconciliation_summary(
            db=db,
            asset=asset,
            asset_id=asset.id,
            year=year,
            months=months,
            current_user=current_user,
        )
    
    async def get_capacity_market_summary_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_capacity_market_summary_analysis(
            db=db,
            asset=asset,
            asset_id=asset.id,
            year=year,
            month=month,
            current_user=current_user,
        )
    
    async def get_capacity_market_payments(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_capacity_market_payments(
            db=db,
            asset=asset,
            asset_id=asset.id,
            year=year,
            month=month,
            current_user=current_user,
        )
    
    async def get_capacity_market_payment_trend(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required", http_status_code=403)

        return await self.service.get_capacity_market_payment_trend(
            db=db,
            asset=asset,
            asset_id=asset.id,
            year=year,
            month=month,
            current_user=current_user,
        )
    