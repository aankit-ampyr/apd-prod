# ── controller/invoice_analysis_controller.py ── (updated with settlement methods)

from fastapi import Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Literal

from db.dependencies import get_db, allowed_roles
from services.invoice_service import PdfInvoiceService
from constants.enums import UserRole, Platform
from utils.response_utils import Res



class PdfInvoiceController:
    def __init__(self):
        self.service = PdfInvoiceService()

    # ── PDF Invoice endpoints ──────────────────────────────────────────────────
    async def upload_pdf_invoice(
        self,
        asset_id: int,
        month: int = Form(...),
        year: int = Form(...),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.upload_report(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
            file=file,
            current_user=current_user,
        )
    
    async def get_pdf_invoices(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value
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
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.get_pdf_invoices(
            db=db,
            asset_id=asset_id,
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
        asset_id: int,  
        invoice_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.delete_pdf_invoice(
            db=db,
            asset_id=asset_id,  
            invoice_id=invoice_id,
            current_user=current_user,
        )


    async def get_invoice_summary(
        self,
        asset_id: int,
        db: AsyncSession = Depends(get_db),
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
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.get_invoice_summary(
            db=db,
            asset_id = asset_id,
            current_user=current_user,
            month=month,
            year=year,
            source=source
        )

    async def get_invoice_preview(
        self,
        asset_id: int,  
        invoice_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.get_invoice_preview(
            db=db,
            asset_id=asset_id,  
            invoice_id=invoice_id,
            current_user=current_user
        )

    async def download_invoice(
        self,
        asset_id: int,  
        invoice_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
        source: Literal["preview", "upload_history"] | None = Query(None)
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.download_invoice(
            db=db,
            asset_id=asset_id,  
            invoice_id=invoice_id,
            current_user=current_user,
            source=source
        )

    async def export_invoice_list(
        self,
        asset_id: int, 
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
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
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        return await self.service.export_invoice_list(
            db=db,
            asset_id=asset_id, 
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
        asset_id: int,
        month: int = Form(...),
        year: int = Form(...),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        
        return await self.service.upload_settlement(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
            file=file,
            current_user=current_user,
        )

    async def get_settlements(
        self,
        asset_id: int,
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
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.get_settlements(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
            current_user=current_user,
        )

    async def delete_settlement(
        self,
        asset_id: int,
        settlement_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.delete_settlement(
            db=db,
            asset_id=asset_id,
            settlement_id=settlement_id,
            current_user=current_user,
        )

    async def export_settlement(
        self,
        asset_id: int,
        settlement_id: int,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")
        
        return await self.service.export_settlement(
            db=db,
            asset_id=asset_id,
            settlement_id=settlement_id,
            current_user=current_user,
        )
        
   
class InvoiceAnalysisController:
    def __init__(self, pdf_invoice_controller: PdfInvoiceController):
        # reusing the same controller/service instance 
        self.controller = pdf_invoice_controller

    async def get_capacity_market_analysis(
        self,
        asset_id: int,
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.controller.service.get_capacity_market_analysis(
            db=db,
            asset_id=asset_id,
            year=year,
            month=month,
            current_user=current_user,
        )

    async def export_capacity_market(
        self,
        asset_id: int,
        year: int = Query(...),
        month: int | None = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.ANALYST.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.controller.service.export_capacity_market(
            db=db,
            asset_id=asset_id,
            year=year,
            month=month,
            current_user=current_user,
        )