# ── services/pdf_invoice_service.py ──────────────────────────────────────────
import re
import traceback
from io import BytesIO, StringIO
import csv
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
import pdfplumber
from sqlalchemy import select, or_, exists
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from fastapi import BackgroundTasks
from decorators.analysis_function_meta import asset_analytics_db_cache
from models.invoice_model import PdfInvoice, Settlement, SummaryStatement
from constants.enums import (
    InvoiceType,
    UserRole,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
    AssetType,
    AssetStatus,
    AnalysisWidget,
    AnalysisSections,
    AnalysisModules,
)
from models.asset import Asset
from utils import audit_logs, FileStorageManager, paginate
from redis.asyncio import Redis
from python_common.utils.response_utils import Res
from python_common.constants.enums import Month
from pdf2image import convert_from_bytes
import pytesseract
from constants.defaults import UPLOAD_PATHS
from models.asset import Asset, AssetFile
import pandas as pd
from uuid import uuid4
import json
import calendar
from .asset_analysis_helper import AnalysisServiceHelper
from models.audit_log_model import AuditLog
from worker.tasks import asset_computation_task, asset_analytics_deletion_task
from constants.dependency_class import YearlyInvoiceSettlementRecords, YearlyPdfInvoicesRecords, YearlySummaryStatementRecords, YearlySummaryStatementDataFrame


INVOICE_TYPE_LABELS = {
    InvoiceType.HARTREE_PV.value: "Hartree PV",
    InvoiceType.HARTREE_BESS.value: "Hartree BESS",
    InvoiceType.EMR.value: "EMR",
    InvoiceType.GRIDBEYOND.value: "GridBeyond",
    InvoiceType.HARTREE_BESS_POWER.value: "Hartree BESS Power",
    InvoiceType.HARTREE_AUXILIARY.value: "Hartree Auxiliary",
    InvoiceType.HARTREE_SOLAR_POWER.value: "Hartree Solar Power",
    InvoiceType.HARTREE_OTHER.value: "Hartree Other",
}


class PdfInvoiceService:

    def _classify_invoice_type(self, filename: str) -> int:
        """Classify invoice type from filename. Returns InvoiceType enum value."""
        name = filename.upper()

        if "GRIDBEYOND" in name or "GRID BEYOND" in name:
            return InvoiceType.GRIDBEYOND.value

        has_hartree = "HARTREE" in name
        has_nwosfl = "NWOSFL" in name

        if "BESS" in name and (has_hartree or has_nwosfl):
            return InvoiceType.HARTREE_BESS.value

        if "PV" in name and (has_hartree or has_nwosfl):
            return InvoiceType.HARTREE_PV.value

        if "POW" in name and "SOLAR" in name:
            return InvoiceType.HARTREE_SOLAR_POWER.value

        if "POW" in name and "AUX" in name:
            return InvoiceType.HARTREE_AUXILIARY.value

        if "POW" in name:
            return InvoiceType.HARTREE_BESS_POWER.value

        if name.startswith("NORTHWO"):
            return InvoiceType.EMR.value

        if has_hartree or has_nwosfl:
            return InvoiceType.HARTREE_OTHER.value

        return InvoiceType.HARTREE_OTHER.value  # Unknown falls under Hartree Other

    def _get_audit_module(self, asset) -> int:
        if asset.status in [AssetStatus.ACTIVE.value, AssetStatus.INACTIVE.value]:
            return AuditLogModules.ASSET_MANAGEMENT_AMD.value
        return AuditLogModules.ASSET_ONBOARDING.value

    def _extract_text(self, file_bytes: bytes) -> str | None:
        """Hybrid extraction: PDF text -> OCR if text is poor."""
        # 1. Try standard extraction
        try:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                if len(text.strip()) > 50:  # If we got reasonable text, use it
                    return text
        except:
            pass

        # 2. Fallback to OCR
        try:
            images = convert_from_bytes(file_bytes)
            ocr_text = ""
            for img in images:
                ocr_text += pytesseract.image_to_string(img)
            return ocr_text
        except Exception as e:
            print(f"OCR Failed: {e}")
            return None

    def _extract_invoice_number(self, text: str) -> str | None:
        same_line_pattern = (
            r"Invoice\s+Number[:\.\s]+([A-Za-z0-9][A-Za-z0-9_\-\s]{2,29})"
        )
        match = re.search(same_line_pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip().split("\n")[0].strip()
            if candidate and not re.match(
                r"^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$", candidate
            ):
                return candidate
        lines = [l.strip() for l in text.split("\n")]
        label_idx = None
        for i, line in enumerate(lines):
            if re.search(r"Invoice\s+Number", line, re.IGNORECASE):
                label_idx = i
                break

        if label_idx is not None:
            for j in range(label_idx + 1, min(label_idx + 10, len(lines))):
                candidate = lines[j].strip()
                if not candidate:
                    continue
                if re.match(r"^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$", candidate):
                    continue
                if re.search(
                    r"(?:Date|Period|Days|Payment|Due|Total|Amount|VAT|Billing)",
                    candidate,
                    re.IGNORECASE,
                ):
                    continue
                if re.search(r"[A-Za-z].*\d|\d.*[A-Za-z]|[_\-]", candidate):
                    return candidate
        return None

    def _extract_invoice_date(self, text: str) -> str | None:
        cleaned_text = re.sub(r"(\d)\s+(\d{1,2}/\d{1,2}/\d{4})", r"\1\2", text)
        cleaned_text = re.sub(r"(\d)\s+(/\d{1,2}/\d{4})", r"\1\2", cleaned_text)

        label_pattern = (
            r"(?:Invoice\s+Date|Issue\s+Date)[:\s]+"
            r"(\d{1,2}\s+\w+\s+\d{4}"  # 10 December 2025
            r"|\d{1,2}/\d{1,2}/\d{4}"  # 10/12/2025
            r"|\d{4}-\d{2}-\d{2}"  # 2025-12-10
            r"|\d{1,2}-\w+-\d{4})"  # 10-Dec-2025
        )
        match = re.search(label_pattern, cleaned_text, re.IGNORECASE)
        if match:
            parsed = self._parse_date_string(match.group(1).strip())
            if parsed:
                return parsed

        date_pattern = r"(?<!\d)(\d{1,2}/\d{1,2}/\d{4})(?!\d)"
        matches = re.findall(date_pattern, cleaned_text)
        for raw in matches:
            parsed = self._parse_date_string(raw)
            if parsed:
                return parsed

        return None

    def _parse_date_string(self, raw: str) -> str | None:
        if not raw:
            return None
        raw = raw.strip()
        match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", raw)
        if match:
            day, month, year = (
                int(match.group(1)),
                int(match.group(2)),
                int(match.group(3)),
            )
            try:
                return datetime(year, month, day).strftime("%d %b %Y")
            except ValueError:
                pass

        # All other formats
        for fmt in [
            "%d %B %Y",  # 10 December 2025
            "%d %b %Y",  # 10 Dec 2025
            "%Y-%m-%d",  # 2025-12-10
            "%d-%b-%Y",  # 10-Dec-2025
            "%B %d, %Y",  # December 10, 2025
            "%d-%m-%Y",  # 10-12-2025
        ]:
            try:
                return datetime.strptime(raw, fmt).strftime("%d %b %Y")
            except ValueError:
                continue

        return None

    def _extract_invoice_amount(self, text: str) -> float | None:
        labeled_pattern = (
            r"(?:"
            r"Total\s+including\s+VAT"
            r"|Grand\s+Total\s*(?:\(£\))?\s*\+?\s*VAT?"
            r"|Grand\s+Total\s*(?:\(£\))?"
            r"|Amount\s+Due"
            r"|Balance\s+Due"
            r"|Net\s+Amount"
            r"|Total\s+Amount"
            r"|Total"
            r"|Net"
            r")"
            r"[:\s\(£\)]*£?\s*(-?[\d,]+\.?\d*)"
        )

        split = int(len(text) * 0.7)
        for search_area in [text[split:], text]:
            matches = re.findall(labeled_pattern, search_area, re.IGNORECASE)
            if matches:
                raw = matches[-1].replace(",", "").replace(" ", "").strip()
                try:
                    return float(raw)
                except ValueError:
                    continue

        all_amounts = re.findall(r"£\s*(-?[\d,]+\.?\d*)", text)
        if all_amounts:
            clean = []
            for amt in all_amounts:
                try:
                    clean.append(float(amt.replace(",", "").replace(" ", "")))
                except ValueError:
                    continue
            return max(clean, key=abs) if clean else None

        return None

    def _build_extraction_status(self, number, date, amount) -> str:
        extracted = sum([number is not None, date is not None, amount is not None])
        if extracted == 3:
            return "extracted"
        elif extracted > 0:
            return "partial"
        return "failed"

    def _extract_capacity_payment(self, text: str):
        pattern = r"Capacity\s+Payment\s+(?:for|[-–])\s+(\w+)\s+(\d{4})"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            month_str = match.group(1).strip()
            year_str = match.group(2).strip()
            try:
                month_dt = datetime.strptime(month_str, "%B")  # Full month name
                return month_dt.month, int(year_str)
            except ValueError:
                try:
                    month_dt = datetime.strptime(month_str, "%b")  # Abbreviated
                    return month_dt.month, int(year_str)
                except ValueError:
                    pass
        return None, None

    # ── upload (single file) ──────────────────────────────────────
    async def upload_report(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        month: int,
        year: int,
        file,
        background_tasks: BackgroundTasks,
        current_user: dict,
    ):
        try:
            file_bytes = await file.read()
            filename = file.filename

            # File type check
            if not filename.lower().endswith(".pdf"):
                return Res.error(
                    "E-10219",
                    message="Only PDF files are supported. Please upload a valid PDF invoice.",
                    http_status_code=415,
                )

            # File size check
            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error(
                    "E-10085",
                    message="PDF invoice file size should not exceed 100 MB.",
                    http_status_code=413,
                )

            # Duplicate check — one invoice per asset per reporting period
            existing = await db.execute(
                select(PdfInvoice).where(
                    PdfInvoice.asset_id == asset_id,
                    PdfInvoice.month == month,
                    PdfInvoice.year == year,
                    PdfInvoice.is_deleted == False,
                )
            )
            if existing.scalars().first():
                return Res.error(
                    "E-10219",
                    message=f'A file named "{filename}" already exists for this reporting period.',
                    http_status_code=409,
                )

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )
            if asset.status != AssetStatus.ACTIVE.value:
                return Res.error(
                    "E-10240",
                    message="Upload is only allowed for Active assets.",
                    http_status_code=409,
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", http_status_code=409)

            # Extract text from PDF
            raw_text = self._extract_text(file_bytes)
            if not raw_text:
                return Res.error(
                    "E-10220",
                    message="Invoice details could not be extracted. Please upload a valid invoice PDF.",
                    http_status_code=422,
                )

            # Extract fields
            invoice_number = self._extract_invoice_number(raw_text)
            invoice_date_str = self._extract_invoice_date(raw_text)
            invoice_amount = self._extract_invoice_amount(raw_text)
            capacity_payment_month, capacity_payment_year = (
                self._extract_capacity_payment(raw_text)
            )

            # Reporting period validation
            if invoice_date_str:
                extracted_date = datetime.strptime(invoice_date_str, "%d %b %Y").date()
                # Check if month and year match the reporting period
                if extracted_date.month != month or extracted_date.year != year:
                    return Res.error(
                        "E-10224",
                        message="The invoice date does not match the selected reporting period. Please upload the correct invoice for this period.",
                        http_status_code=422,
                    )
            else:
                # If no date extracted, check if any required fields are extracted
                if not any([invoice_number, invoice_amount]):
                    return Res.error(
                        "E-10220",
                        message="Invoice details could not be extracted. Please upload a valid invoice PDF.",
                        http_status_code=422,
                    )

            # Store file
            FileStorageManager.upload_file(
                file_bytes, filename, UPLOAD_PATHS["INVOICE_PATH"], is_encrypted=False
            )

            # Save to DB
            invoice_record = PdfInvoice(
                asset_id=asset_id,
                month=month,
                year=year,
                invoice_file_name=filename,
                invoice_number=invoice_number,
                invoice_amount=invoice_amount,
                type=self._classify_invoice_type(filename),
                size=len(file_bytes),
                invoice_date=(
                    datetime.strptime(invoice_date_str, "%d %b %Y").date()
                    if invoice_date_str
                    else None
                ),
                capacity_payment_month=capacity_payment_month,
                capacity_payment_year=capacity_payment_year,
                file_key=f"{UPLOAD_PATHS['INVOICE_PATH']}{filename}",
                storage_server=FileStorageManager.STORAGE_TYPE,
                is_deleted=False,
            )
            db.add(invoice_record)
            await db.flush()

            # ── Determine extraction status ──────────────────────────────────────────
            # Consider ALL 5 fields: number, date, amount, capacity_month, capacity_year
            extracted_count = sum(
                [
                    invoice_number is not None,
                    invoice_date_str is not None,
                    invoice_amount is not None,
                    capacity_payment_month is not None,
                    capacity_payment_year is not None,
                ]
            )

            if extracted_count == 5:
                extraction_status = "extracted"
            elif extracted_count > 0:
                extraction_status = "partial"
            else:
                extraction_status = "failed"

            # Audit log
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.INVOICE_UPLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Invoice PDF": "Not Uploaded",
                    "View Invoice Analysis CTA": "Disabled",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Invoice PDF": filename,
                    "File Size": len(file_bytes),
                    "Upload Status": "Successful",
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()


            background_tasks.add_task(
                asset_computation_task.kiq,
                asset_id=asset_id,
                month=month,
                year=year,
                dependencies=[
                    YearlyPdfInvoicesRecords.__name__,
                ],
            )
            return Res.success(
                "S-10087",
                data={
                    "id": invoice_record.id,
                    "invoice_file_name": invoice_record.invoice_file_name,
                    "invoice_file_size": invoice_record.size,
                    "type": invoice_record.type,
                    "invoice_number": invoice_record.invoice_number,
                    "invoice_date": (
                        invoice_record.invoice_date.strftime("%d %b %Y")
                        if invoice_record.invoice_date
                        else None
                    ),
                    "invoice_amount": invoice_record.invoice_amount,
                    "capacity_payment_month": invoice_record.capacity_payment_month,
                    "capacity_payment_year": invoice_record.capacity_payment_year,
                    "uploaded_on": (
                        invoice_record.uploaded_on.isoformat()
                        if invoice_record.uploaded_on
                        else None
                    ),
                    "extraction_status": extraction_status,
                    "month": month,
                    "year": year,
                    "message": "Invoice uploaded and extracted successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    async def get_pdf_invoices(
        self,
        db: AsyncSession,
        asset_id: int,
        current_user: dict,
        search: str | None = None,
        type: int | None = None,
        page: int = 1,
        limit: int = 10,
        sort: list | None = None,
        month: int | None = None,
        year: int | None = None,
    ):
        try:
            query = select(PdfInvoice).where(
                PdfInvoice.asset_id == asset_id,
                PdfInvoice.is_deleted == False,
            )

            if search:
                term = f"%{search.strip()}%"
                query = query.where(
                    or_(
                        PdfInvoice.invoice_file_name.ilike(term),
                        PdfInvoice.invoice_number.ilike(term),
                    )
                )

            if type is not None:
                query = query.where(PdfInvoice.type == type)

            if month is not None:
                query = query.where(PdfInvoice.month == month)

            if year is not None:
                query = query.where(PdfInvoice.year == year)

            # Only return PDFs that have a matching settlement file for the same (year, month)
            query = query.where(
                exists().where(
                    Settlement.asset_id == PdfInvoice.asset_id,
                    Settlement.month == PdfInvoice.month,
                    Settlement.year == PdfInvoice.year,
                    Settlement.is_deleted == False
                )
            )

            order_by_list = []
            if sort:
                for s in sort:
                    desc_order = s.startswith("-")
                    field_name = s.lstrip("-")
                    col = (
                        PdfInvoice.invoice_date
                        if field_name == "date"
                        else PdfInvoice.uploaded_on
                    )
                    order_by_list.append(col.desc() if desc_order else col.asc())
            else:
                order_by_list = [PdfInvoice.uploaded_on.desc()]

            result = await paginate(
                db=db,
                base_query=query,
                page=page,
                limit=limit,
                order_by=order_by_list,
                scalar=True,
            )

            invoices = []
            for r in result.records:
                extracted_count = sum(
                    [
                        r.invoice_number is not None,
                        r.invoice_date is not None,
                        r.invoice_amount is not None,
                    ]
                )
                status = (
                    "extracted"
                    if extracted_count == 3
                    else ("partial" if extracted_count > 0 else "failed")
                )

                invoices.append(
                    {
                        "id": r.id,
                        "invoice_file_name": r.invoice_file_name,
                        "invoice_file_size": r.size,
                        "type": r.type,  # no need to convert to label here; frontend accepts enum value only i.e. number values
                        "invoice_number": r.invoice_number,
                        "invoice_date": (
                            r.invoice_date.strftime("%d %b %Y")
                            if r.invoice_date
                            else None
                        ),
                        "invoice_amount": r.invoice_amount,
                        "capacity_payment_month": r.capacity_payment_month,
                        "capacity_payment_year": r.capacity_payment_year,
                        "uploaded_on": (
                            r.uploaded_on.isoformat() if r.uploaded_on else None
                        ),
                        "extraction_status": status,
                        "month": r.month,
                        "year": r.year,
                    }
                )

            return Res.success(
                "S-10087",
                data={
                    "current_page": result.current_page,
                    "next_page": result.next_page,
                    "total_pages": result.total_pages,
                    "total_files": result.total_results,
                    "invoices": invoices,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_invoice_summary(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        current_user: dict,
        month: List[int] | None = None,
        year: List[int] | None = None,
        source: str | None = None,
    ):
        try:
            query = select(PdfInvoice).where(
                PdfInvoice.asset_id == asset_id,
                PdfInvoice.is_deleted == False,
            )
            settlement_query = select(Settlement).where(
                Settlement.asset_id == asset_id,
                Settlement.is_deleted == False,
            )

            if month is not None:
                query = query.where(PdfInvoice.month.in_(month))
                settlement_query = settlement_query.where(Settlement.month.in_(month))
            if year is not None:
                query = query.where(PdfInvoice.year.in_(year))
                settlement_query = settlement_query.where(Settlement.year.in_(year))

            result = await db.execute(query)
            pdf_records = result.scalars().all()

            settlement_result = await db.execute(settlement_query)
            settlement_records = settlement_result.scalars().all()
            valid_settlement_periods = {(s.year, s.month) for s in settlement_records}

            all_records = [
                r for r in pdf_records if (r.year, r.month) in valid_settlement_periods
            ]

            total_files = len(all_records)
            asset = await db.get(Asset, asset_id)

            # ── Extraction quality for ALL 5 fields ──────────────────────────────────
            num_extracted = sum(1 for r in all_records if r.invoice_number is not None)
            date_extracted = sum(1 for r in all_records if r.invoice_date is not None)
            amt_extracted = sum(1 for r in all_records if r.invoice_amount is not None)
            capacity_month_extracted = sum(
                1 for r in all_records if r.capacity_payment_month is not None
            )
            capacity_year_extracted = sum(
                1 for r in all_records if r.capacity_payment_year is not None
            )

            def quality(extracted):
                return {
                    "extracted": extracted,
                    "total": total_files,
                    "missing": total_files - extracted,
                    "percentage": (
                        round((extracted / total_files * 100), 2)
                        if total_files
                        else 0.0
                    ),
                }

            category_map = {}
            for r in all_records:
                label = (
                    r.type
                )  # pass actual in enum from backend, let frontend handle it
                category_map[label] = category_map.get(label, 0) + 1

            if asset:
                selected_year = (
                    year if year else sorted({record.year for record in all_records})
                )
                selected_month = (
                    month if month else sorted({record.month for record in all_records})
                )

                if source == "asset_management":
                    module = AuditLogModules.ASSET_MANAGEMENT_AMD.value
                    before = {
                        "Asset ID": asset.asset_id,
                        "Asset Name": asset.name,
                        "Month": f"{selected_month}-{selected_year}",
                        "Invoice PDF": "Uploaded",
                        "Settlement CSV": "Uploaded",
                        "View Invoice Analysis CTA": "Enabled",
                    }
                    after = "User navigated to Invoice Analysis screen"

                else:
                    module = AuditLogModules.INVOICE_ANALYSIS.value
                    before = {
                        "Asset": asset.name,
                        "Year": selected_year,
                    }
                    if current_user.get("role") == UserRole.MANAGER.value:
                        after = "Management user viewed Invoice Analysis screen"
                    else:
                        after = "User viewed Invoice Analysis screen"

                resource_id = f"AM-{asset.id}_(Asset ID: {asset.asset_id})"
                recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=30)

                recent_log_query = await db.execute(
                    select(AuditLog).where(
                        AuditLog.user_id == current_user.get("user_id"),
                        AuditLog.action == AuditLogScenario.INVOICE_ANALYSIS_VIEWED.value,
                        AuditLog.resource_id == resource_id,
                        AuditLog.created_at >= recent_cutoff,
                    )
                )
                already_logged_recently = recent_log_query.scalars().first()

                
                if not already_logged_recently:
                    await audit_logs(
                        db=db,
                        redis=redis,
                        user_id=current_user.get("user_id"),
                        user_role=current_user.get("role"),
                        module=module,
                        action=AuditLogScenario.INVOICE_ANALYSIS_VIEWED.value,
                        before=before,
                        after=after,
                        resource_id=resource_id,
                    )
                    await db.commit()
                    
            return Res.success(
                "S-10087",
                data={
                    "total_files": total_files,
                    "extraction_quality": {
                        "invoice_number": quality(num_extracted),
                        "invoice_date": quality(date_extracted),
                        "invoice_amount": quality(amt_extracted),
                        "capacity_payment_month": quality(capacity_month_extracted),
                        "capacity_payment_year": quality(capacity_year_extracted),
                    },
                    "category_summary": [
                        {"type": k, "count": v} for k, v in category_map.items()
                    ],
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def delete_pdf_invoice(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int, 
        invoice_id: int,
        current_user: dict,
        background_tasks: BackgroundTasks,
    ):
        try:
            query = await db.execute(
                select(PdfInvoice).where(
                    PdfInvoice.id == invoice_id,
                    PdfInvoice.asset_id == asset_id,
                    PdfInvoice.is_deleted == False,
                )
            )
            record = query.scalars().first()

            if not record:
                return Res.error(
                    "E-10221", message="PDF invoice not found.", http_status_code=404
                )

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", http_status_code=409)

            invoice_file_name = record.invoice_file_name
            invoice_number = record.invoice_number
            record_invoice_id = record.invoice_id
            record_id = record.id
            record_month = record.month
            record_year = record.year

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.INVOICE_DELETED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Invoice PDF": invoice_file_name,
                    "Upload History": "Available",
                    "View Invoice Analysis CTA": "Enabled",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Invoice PDF": "Removed",
                    "Upload History": "Removed",
                    "View Invoice Analysis CTA": "Disabled",
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )

            # Soft delete
            record.is_deleted = True
            await db.commit()

            background_tasks.add_task(
                asset_analytics_deletion_task.kiq,
                asset_id=asset_id,
                month=record_month,
                year=record_year,
                dependencies=[
                    YearlyPdfInvoicesRecords.__name__,
                ],
            )

            return Res.success(
                "S-10088",
                data={
                    "invoice_id": record_id,
                    "asset_id": asset_id,
                    "message": "Invoice deleted successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    async def get_invoice_preview(
        self,
        db: AsyncSession,
        asset_id: int,
        invoice_id: int,
        current_user: dict,
    ):
        try:
            query = await db.execute(
                select(PdfInvoice).where(
                    PdfInvoice.id == invoice_id,
                    PdfInvoice.asset_id == asset_id,
                    PdfInvoice.is_deleted == False,
                )
            )

            invoice = query.scalars().first()

            if not invoice:
                return Res.error(
                    "E-10221", message="Invoice not found.", http_status_code=404
                )

            file_obj, _ = FileStorageManager.get_file_object(
                invoice.file_key, storage_type=invoice.storage_server
            )

            return StreamingResponse(
                BytesIO(file_obj),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{invoice.invoice_file_name}"'
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def download_invoice(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int, 
        invoice_id: int,
        current_user: dict,
        source: str | None = None,
    ):
        try:
            query = await db.execute(
                select(PdfInvoice).where(
                    PdfInvoice.id == invoice_id,
                    PdfInvoice.asset_id == asset_id,
                    PdfInvoice.is_deleted == False,
                )
            )

            invoice = query.scalars().first()

            if not invoice:
                return Res.error(
                    "E-10221", message="Invoice not found.", http_status_code=404
                )

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", http_status_code=409)

            if source == "preview":
                module = AuditLogModules.INVOICE_ANALYSIS.value
                action = AuditLogScenario.INVOICE_PREVIEW_DOWNLOADED.value
                after = "Invoice PDF downloaded from preview panel"

            else:  # upload_history
                module = AuditLogModules.ASSET_MANAGEMENT_AMD.value
                action = AuditLogScenario.INVOICE_FILE_DOWNLOADED.value
                after = "Invoice PDF downloaded by user"

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=module,
                action=action,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{invoice.month}-{invoice.year}",
                    "Invoice PDF": invoice.invoice_file_name,
                    "Download Status": "Not Started",
                },
                after=after,
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )

            await db.commit()

            file_obj, _ = FileStorageManager.get_file_object(
                invoice.file_key, storage_type=invoice.storage_server
            )

            return StreamingResponse(
                BytesIO(file_obj),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{invoice.invoice_file_name}"'
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_invoice_list(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,  # ← ADD THIS
        current_user: dict,
        search: str | None = None,
        type: int | None = None,
        page: int = 1,
        limit: int = 10,
        sort: List[str] | None = None,
        month: int | None = None,
        year: int | None = None,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            query = select(PdfInvoice).where(
                PdfInvoice.asset_id == asset_id, PdfInvoice.is_deleted == False
            )

            # ── Filters ─────────────────────────────────────────────────────────────
            if search:
                term = f"%{search.strip()}%"
                query = query.where(
                    or_(
                        PdfInvoice.invoice_file_name.ilike(term),
                        PdfInvoice.invoice_number.ilike(term),
                    )
                )

            if type is not None:
                query = query.where(PdfInvoice.type == type)

            if month is not None:
                query = query.where(PdfInvoice.month == month)

            if year is not None:
                query = query.where(PdfInvoice.year == year)

            # ── Sorting ─────────────────────────────────────────────────────────────
            order_by_list = []
            if sort:
                for s in sort:
                    desc_order = s.startswith("-")
                    field_name = s.lstrip("-")
                    col = (
                        PdfInvoice.invoice_date
                        if field_name == "date"
                        else PdfInvoice.uploaded_on
                    )
                    order_by_list.append(col.desc() if desc_order else col.asc())
            else:
                order_by_list = [PdfInvoice.uploaded_on.desc()]

            query = query.order_by(*order_by_list)

            # ── Pagination ──────────────────────────────────────────────────────────
            result = await paginate(
                db=db,
                base_query=query,
                page=page,
                limit=limit,
                order_by=order_by_list,
                scalar=True,
            )

            invoices = result.records

            output = StringIO()
            writer = csv.writer(output)

            writer.writerow(
                [
                    "File Name",
                    "Type",
                    "Invoice Number",
                    "Invoice Date",
                    "Invoice Amount",
                    "Uploaded On",
                    "Month",
                    "Year",
                ]
            )

            for invoice in invoices:
                writer.writerow(
                    [
                        invoice.invoice_file_name,
                        INVOICE_TYPE_LABELS.get(invoice.type, "Hartree Other"),
                        invoice.invoice_number if invoice.invoice_number else "",
                        (
                            invoice.invoice_date.strftime("%d %b %Y")
                            if invoice.invoice_date
                            else ""
                        ),
                        invoice.invoice_amount if invoice.invoice_amount else "",
                        (
                            invoice.uploaded_on.strftime("%d %b %Y %H:%M:%S")
                            if invoice.uploaded_on
                            else ""
                        ),
                        invoice.month if invoice.month else "",
                        invoice.year if invoice.year else "",
                    ]
                )

            output.seek(0)

            if asset:
                await audit_logs(
                    db=db,
                    redis=redis,
                    user_id=current_user.get("user_id"),
                    user_role=current_user.get("role"),
                    module=AuditLogModules.INVOICE_ANALYSIS.value,
                    action=AuditLogScenario.INVOICE_ANALYSIS_DATA_DOWNLOADED.value,
                    before={
                        "Asset ID": asset.asset_id,
                        "Asset Name": asset.name,
                        "Month": month if month is not None else "All",
                        "Year": year if year is not None else "All",
                        "Data Type": "Invoice Analysis table data",
                        "Download Status": "Not Started",
                    },
                    after="Invoice Analysis chart/table data downloaded by user",
                    resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
                )
                await db.commit()

            return StreamingResponse(
                BytesIO(output.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=pdf_invoice_list.csv"
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    # ── settlement upload ─────────────────────────────────────────────────────
    async def upload_settlement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        month: int,
        year: int,
        file,
        background_tasks: BackgroundTasks,
        current_user: dict,
    ):
        try:
            file_bytes = await file.read()
            filename = file.filename

            # File type check
            if not filename.lower().endswith(".csv"):
                return Res.error(
                    "E-10219",
                    message="Only CSV files are supported. Please upload a valid settlement CSV.",
                    http_status_code=415,
                )

            # Filename pattern validation — Settlement CSV file name must follow: NORTHWO_*.csv
            if not filename.lower().startswith("northwo_"):
                return Res.error(
                    "E-10219",
                    message="Settlement CSV file name must follow the pattern: NORTHWO_*.csv",
                    http_status_code=422,
                )

            # File size check
            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error(
                    "E-10085",
                    message="Settlement CSV file size should not exceed 100 MB.",
                    http_status_code=413,
                )

            # Duplicate check — one settlement per asset per reporting period
            existing_query = await db.execute(
                select(Settlement).where(
                    Settlement.asset_id == asset_id,
                    Settlement.month == month,
                    Settlement.year == year,
                    Settlement.is_deleted == False,
                )
            )
            if existing_query.scalars().first():
                return Res.error(
                    "E-10219",
                    message="A settlement CSV already exists for this reporting period. Delete the existing file before uploading a new one.",
                    http_status_code=409,
                )

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )
            if asset.status != AssetStatus.ACTIVE.value:
                return Res.error(
                    "E-10240",
                    message="Upload is only allowed for Active assets.",
                    http_status_code=409,
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", http_status_code=409)
            # Fetch the PDF invoice for this asset and reporting period
            invoice_query = await db.execute(
                select(PdfInvoice).where(
                    PdfInvoice.asset_id == asset_id,
                    PdfInvoice.month == month,
                    PdfInvoice.year == year,
                    PdfInvoice.is_deleted == False,
                )
            )
            invoice = invoice_query.scalars().first()
            if not invoice:
                return Res.error(
                    "E-10228",
                    message="No PDF invoice found for this reporting period. Upload the invoice PDF first.",
                    http_status_code=422,
                )

            # Parse CSV
            try:
                content = file_bytes.decode("utf-8-sig")
                reader = list(csv.reader(content.splitlines()))
            except Exception:
                return Res.error(
                    "E-10220",
                    message="Settlement CSV could not be read. Please upload a valid CSV file.",
                    http_status_code=422,
                )

            if len(reader) < 2:
                return Res.error(
                    "E-10220",
                    message="Settlement CSV header row is missing. Please upload a valid settlement CSV.",
                    http_status_code=422,
                )

            # Second row is the actual header
            headers = [h.strip() for h in reader[1]]

            # Required columns
            REQUIRED_COLS = [
                "EMR Party Id",
                "EMR Invoice Number",
                "EMR Invoice Date",
                "EMR Invoice Payment Date",
                "EMR Invoice Total",
                "MPID",
                "CM Month Id",
                "Total Amount Received From Suppliers",
                "Total Amount Payable To Capacity Providers",
                "CMU Id",
                "Capacity Payment Suspension Start Date",
                "Capacity Payment Suspension End Date",
                "Capacity Agreement",
                "Auction Acquired Capacity Obligation",
                "Auction Acquired Capacity Obligation Start Date",
                "Auction Acquired Capacity Obligation End Date",
                "Auction Acquired Capacity Obligation Effective Date",
                "Auction Identifier",
                "Capacity Price",
                "Capacity Cleared Price",
                "CM Base CPI",
                "CM CPI",
                "CM Monthly Weighting Factor",
                "Monthly Capacity Payment Due",
                "Monthly Capacity Payment Payable",
                "Capacity Payment Suspension Flag",
                "CMU Id PTCO",
                "Capacity Trade ID",
                "Physically Traded Capacity Obligation",
                "Physically Traded Capacity Obligation Start Date",
                "Physically Traded Capacity Obligation End Date",
                "Auction Identifier PTCO",
                "Capacity Price PTCO",
                "Capacity Cleared Price PTCO",
                "CM Base CPI PTCO",
                "CM CPI PTCO",
                "CM Monthly Weighting Factor PTCO",
                "Monthly Capacity Payment Due PTCO",
                "Monthly Capacity Payment Payable PTCO",
                "Capacity Payment Suspension Flag PTCO",
                "Relevant Expenditure",
                "Relevant Benefit",
                "Monthly Capacity Payment Payable Recovery",
                "Recovery Period Start Date",
                "Recovery Period End Date",
                "Relevant Expenditure Reinstated",
                "Relevant Benefit Reinstated",
            ]

            for col in REQUIRED_COLS:
                if col not in headers:
                    return Res.error(
                        "E-10223",
                        message=f"Settlement CSV is missing required column- {col}. Please upload a valid settlement file with the expected column format.",
                        http_status_code=422,
                    )

            # Data rows start from index 2
            if len(reader) < 3:
                return Res.error(
                    "E-10219",
                    message="Settlement CSV has no data rows.",
                    http_status_code=422,
                )

            data_row = dict(zip(headers, [v.strip() for v in reader[2]]))

            # Mandatory value validations
            emr_invoice_number = data_row.get("EMR Invoice Number", "").strip()
            emr_invoice_date = data_row.get("EMR Invoice Date", "").strip()
            emr_payment_date = data_row.get("EMR Invoice Payment Date", "").strip()

            if not emr_invoice_number:
                return Res.error(
                    "E-10223",
                    message="EMR Invoice Number is missing in the settlement CSV.",
                    http_status_code=422,
                )
            if not emr_invoice_date:
                return Res.error(
                    "E-10223",
                    message="EMR Invoice Date is missing in the settlement CSV.",
                    http_status_code=422,
                )
            if not emr_payment_date:
                return Res.error(
                    "E-10223",
                    message="EMR Invoice Payment Date is missing in the settlement CSV.",
                    http_status_code=422,
                )

            # Suspension flag validation
            suspension_flag = data_row.get(
                "Capacity Payment Suspension Flag", ""
            ).strip()
            if suspension_flag and suspension_flag not in ("T", "F"):
                return Res.error(
                    "E-10227",
                    message="Invalid Capacity Payment Suspension Flag. Allowed values are T or F.",
                    http_status_code=422,
                )

            # Invoice number matching — primary: invoice number, fallback: invoice date
            pdf_invoice_number = invoice.invoice_number
            if (
                pdf_invoice_number
                and emr_invoice_number != str(pdf_invoice_number).strip()
            ):
                # Fallback: check invoice date match
                try:
                    csv_invoice_date = datetime.strptime(
                        emr_invoice_date, "%Y%m%d"
                    ).date()
                    if (
                        invoice.invoice_date
                        and csv_invoice_date != invoice.invoice_date
                    ):
                        return Res.error(
                            "E-10226",
                            message="Settlement CSV date does not match the uploaded invoice PDF date. Please upload the settlement file for the same invoice.",
                            http_status_code=422,
                        )
                except ValueError:
                    return Res.error(
                        "E-10226",
                        message="Settlement CSV date  does not match the uploaded invoice PDF date. Please upload the settlement file for the same invoice.",
                        http_status_code=422,
                    )

            # Parse dates (YYYYMMDD → date)
            try:
                extracted_invoice_date = datetime.strptime(
                    emr_invoice_date, "%Y%m%d"
                ).date()
            except ValueError:
                return Res.error(
                    "E-10225",
                    message="invoice date format could not be read. Please upload a valid settlement CSV.",
                    http_status_code=422,
                )

            try:
                invoice_payment_date = datetime.strptime(
                    emr_payment_date, "%Y%m%d"
                ).date()
            except ValueError:
                return Res.error(
                    "E-10227",
                    message="Invoice payment date format could not be read. Please upload a valid settlement CSV.",
                    http_status_code=422,
                )

            # Store file
            stored_name = filename
            FileStorageManager.upload_file(
                file_bytes,
                stored_name,
                UPLOAD_PATHS["SETTLEMENT_PATH"],
                is_encrypted=False,
            )

            # Save to DB
            settlement = Settlement(
                asset_id=asset_id,
                month=month,
                year=year,
                file_name=filename,
                file_key=f"{UPLOAD_PATHS['SETTLEMENT_PATH']}{stored_name}",
                storage_server=FileStorageManager.STORAGE_TYPE,
                file_size=len(file_bytes),
                extracted_invoice_number=emr_invoice_number,
                extracted_invoice_date=extracted_invoice_date,
                invoice_payment_date=invoice_payment_date,
                uploaded_on=datetime.now(timezone.utc),
                is_deleted=False,
            )
            db.add(settlement)
            await db.flush()

            settlement_system_id = settlement.settlement_id
            settlement_id = settlement.id
            settlement_name = settlement.file_name

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SETTLEMENT_FILE_UPLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Settlement CSV": "Not Uploaded",
                    "View Invoice Analysis CTA": "Disabled",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Settlement CSV": filename,
                    "File Size": len(file_bytes),
                    "Upload Status": "Successful",
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()

            background_tasks.add_task(
                asset_computation_task.kiq,
                asset_id=asset_id,
                month=month,
                year=year,
                dependencies=[
                    YearlyInvoiceSettlementRecords.__name__,
                ],
            )

            return Res.success(
                "S-10089",
                data={
                    "id": settlement_id,
                    "settlement_file_name": settlement_name,
                    "settlement_file_size": len(file_bytes),
                    "extracted_invoice_number": emr_invoice_number,
                    "extracted_invoice_date": extracted_invoice_date.strftime(
                        "%d %b %Y"
                    ),
                    "invoice_payment_date": invoice_payment_date.strftime("%d %b %Y"),
                    "uploaded_on": settlement.uploaded_on.isoformat(),
                    "month": month,
                    "year": year,
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    # ── list settlements ──────────────────────────────────────────────────────
    async def get_settlements(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int | None,
        year: int | None,
        current_user: dict,
    ):
        try:
            query = select(Settlement).where(
                Settlement.asset_id == asset_id,
                Settlement.is_deleted == False,
            )
            if month is not None:
                query = query.where(Settlement.month == month)
            if year is not None:
                query = query.where(Settlement.year == year)

            query = query.order_by(Settlement.uploaded_on.desc())
            result = await db.execute(query)
            records = result.scalars().all()

            settlements = [
                {
                    "id": r.id,
                    "settlement_file_name": r.file_name,
                    "settlement_file_size": r.file_size,
                    "extracted_invoice_number": r.extracted_invoice_number,
                    "extracted_invoice_date": (
                        r.extracted_invoice_date.strftime("%d %b %Y")
                        if r.extracted_invoice_date
                        else None
                    ),
                    "invoice_payment_date": (
                        r.invoice_payment_date.strftime("%d %b %Y")
                        if r.invoice_payment_date
                        else None
                    ),
                    "uploaded_on": r.uploaded_on.isoformat() if r.uploaded_on else None,
                    "month": r.month,
                    "year": r.year,
                }
                for r in records
            ]

            return Res.success(
                "S-10091",
                data={
                    "total_files": len(settlements),
                    "settlement": settlements,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def delete_settlement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        settlement_id: int,
        current_user: dict,
        background_tasks: BackgroundTasks
    ):
        try:
            query = await db.execute(
                select(Settlement).where(
                    Settlement.id == settlement_id,
                    Settlement.asset_id == asset_id,
                )
            )
            record = query.scalars().first()

            # Idempotent — if already deleted or not found, return success
            if not record or record.is_deleted:
                return Res.success(
                    "S-10090",
                    data={
                        "invoice_settlement_id": record.id,
                        "asset_id": asset_id,
                        "message": "Settlement CSV deleted successfully.",
                    },
                )

            file_name = record.file_name
            settlement_sid = record.settlement_id
            settlement_id = record.id
            record_month = record.month
            record_year = record.year

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SETTLEMENT_FILE_DELETED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Settlement CSV": file_name,
                    "Upload History": "Available",
                    "View Invoice Analysis CTA": "Enabled",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Settlement CSV": "Removed",
                    "Upload History": "Removed",
                    "View Invoice Analysis CTA": "Disabled",
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )

            record.is_deleted = True
            await db.commit()

            background_tasks.add_task(
                asset_analytics_deletion_task.kiq,
                asset_id=asset_id,
                month=record_month,
                year=record_year,
                dependencies=[
                    YearlyInvoiceSettlementRecords.__name__,
                ],
            )

            return Res.success(
                "S-10090",
                data={
                    "invoice_settlement_id": settlement_id,
                    "asset_id": asset_id,
                    "message": "Settlement CSV deleted successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    async def export_settlement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        settlement_id: int,
        current_user: dict,
    ):
        query = await db.execute(
            select(Settlement).where(
                Settlement.id == settlement_id,
                Settlement.asset_id == asset_id,
                Settlement.is_deleted.is_(False),
            )
        )

        settlement = query.scalars().first()

        if not settlement:
            return Res.error("E-10228", http_status_code=404)

        asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
        asset = asset_result.scalar_one_or_none()
        if not asset:
            return Res.error(
                "E-10034", message="Asset not found.", http_status_code=404
            )
        if asset.type == AssetType.SOLAR.value:
            return Res.error("E-10120", http_status_code=409)

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=self._get_audit_module(asset),
            action=AuditLogScenario.SETTLEMENT_FILE_DOWNLOADED.value,
            before={
                "Asset ID": asset.asset_id,
                "Asset Name": asset.name,
                "Month": f"{settlement.month}-{settlement.year}",
                "Settlement CSV": settlement.file_name,
                "Download Status": "Not Started",
            },
            after="Settlement CSV downloaded by user",
            resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
        )

        await db.commit()

        file_obj, content_type = FileStorageManager.get_file_object(
            settlement.file_key, storage_type=settlement.storage_server
        )

        return StreamingResponse(
            BytesIO(file_obj),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{settlement.file_name}"'
            },
        )

    async def upload_summary_statement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        month: int,
        year: int,
        file,
        current_user: dict,
        background_tasks: BackgroundTasks
    ):
        try:
            file_bytes = await file.read()
            filename = file.filename

            # ── File type check ────────────────────────────────────────────────────
            if not filename.lower().endswith(".xlsx"):
                return Res.error(
                    "E-10084",
                    message="Invalid file format. Please upload a valid Excel file in .xlsx format.",
                    http_status_code=415,
                )

            # ── File size check ────────────────────────────────────────────────────
            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error(
                    "E-10249",
                    message="File size should not exceed 100 MB.",
                    http_status_code=413,
                )

            # ── Fetch asset ────────────────────────────────────────────────────────
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )

            if asset.status != AssetStatus.ACTIVE.value:
                return Res.error(
                    "E-10240",
                    message="Upload is only available for Active assets.",
                    http_status_code=409,
                )

            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10120",
                    message="Capacity Market analysis is not applicable for Solar assets.",
                    http_status_code=409,
                )

            # ── Duplicate check ────────────────────────────────────────────────────
            existing = await db.execute(
                select(SummaryStatement).where(
                    SummaryStatement.asset_id == asset_id,
                    SummaryStatement.month == month,
                    SummaryStatement.year == year,
                    SummaryStatement.is_deleted == False,
                )
            )
            if existing.scalars().first():
                return Res.error(
                    "E-10219",
                    message=f"A Summary Statement file already exists for this reporting period.",
                    http_status_code=409,
                )

            # ── File name validation ──────────────────────────────────────────────
            if not filename.lower().startswith("northwold"):
                return Res.error(
                    "E-10241",
                    message="Invalid file name. Summary Statement file name should start with Northwold.",
                    http_status_code=422,
                )

            # Check for hyphen after Northwold
            name_parts = filename.split("-", 1)
            if len(name_parts) < 2:
                return Res.error(
                    "E-10241",
                    message="Invalid file name format. Expected format: Northwold - <from> to <to>.xlsx.",
                    http_status_code=422,
                )

            # Check for 'to' in filename
            if "to" not in filename.lower():
                return Res.error(
                    "E-10241",
                    message="Invalid file name format. Expected format: Northwold - <from> to <to>.xlsx.",
                    http_status_code=422,
                )

            # ── Parse Excel file ────────────────────────────────────────────────────
            try:
                xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
                sheets = xl.sheet_names
            except Exception:
                return Res.error(
                    "E-10084",
                    message="Invalid Excel file format. Please upload a valid .xlsx file.",
                    http_status_code=422,
                )

            # ── Sheet validation ────────────────────────────────────────────────────
            if len(sheets) < 2:
                return Res.error(
                    "E-10242",
                    message="Invalid Summary Statement file. The file should contain both Summary and Detail sheets.",
                    http_status_code=422,
                )

            if "Summary" not in sheets:
                return Res.error(
                    "E-10242",
                    message="Invalid Summary Statement file. The Summary sheet is missing.",
                    http_status_code=422,
                )

            if "Detail" not in sheets:
                return Res.error(
                    "E-10243",
                    message="Invalid Summary Statement file. The Detail sheet is missing.",
                    http_status_code=422,
                )

            # ── Read Summary sheet ─────────────────────────────────────────────────
            summary_df = pd.read_excel(
                BytesIO(file_bytes), sheet_name="Summary", header=None
            )
            detail_df = pd.read_excel(BytesIO(file_bytes), sheet_name="Detail")

            # ── Reporting period validation ───────────────────────────────────────
            from_date = None
            to_date = None

            # Try to find From Date and To Date in Summary sheet
            for idx, row in summary_df.iterrows():
                for col in range(len(row)):
                    cell_val = str(row[col]).strip() if pd.notna(row[col]) else ""
                    if "from date" in cell_val.lower():
                        if col + 1 < len(row) and pd.notna(row[col + 1]):
                            try:
                                from_date = pd.to_datetime(row[col + 1]).date()
                            except:
                                pass
                    if "to date" in cell_val.lower():
                        if col + 1 < len(row) and pd.notna(row[col + 1]):
                            try:
                                to_date = pd.to_datetime(row[col + 1]).date()
                            except:
                                pass

            # If dates not found in Summary, derive from Detail timestamps
            if not from_date or not to_date:
                if "Timestamp" in detail_df.columns:
                    detail_df["Timestamp"] = pd.to_datetime(
                        detail_df["Timestamp"], errors="coerce"
                    )
                    valid_ts = detail_df["Timestamp"].dropna()
                    if not valid_ts.empty:
                        from_date = valid_ts.min().date()
                        to_date = valid_ts.max().date()

            if not from_date or not to_date:
                return Res.error(
                    "E-10244",
                    message="Unable to identify the reporting period from the Summary Statement file. Please upload a valid file.",
                    http_status_code=422,
                )

            # Validate reporting period
            if (
                from_date.month != month
                or from_date.year != year
                or to_date.month != month
                or to_date.year != year
            ):
                return Res.error(
                    "E-10244",
                    message="Uploaded Summary Statement file does not match the selected reporting period. Please upload the file for the selected month.",
                    http_status_code=422,
                )

            # ── Detail sheet mandatory columns validation ──────────────────────────
            REQUIRED_COLS = [
                "Timestamp",
                "Import",
                "Export",
                "Battery SoC",
                "SFFR Revenue",
                "DCL revenues",
                "DCH revenues",
                "DML revenues",
                "DMH revenues",
                "DRL revenues",
                "DRH revenues",
                "Imbalance Rev",
                "EPEX DAM Rev",
                "EPEX 30 DA Rev",
                "IDA1 Rev",
                "IDC Rev",
            ]

            detail_cols = [str(c).strip() for c in detail_df.columns]
            missing_cols = [col for col in REQUIRED_COLS if col not in detail_cols]
            if missing_cols:
                return Res.error(
                    "E-10245",
                    message=f"Mandatory column is missing in the Detail sheet: {missing_cols[0]}",
                    http_status_code=422,
                )

            # ── Timestamp validation ───────────────────────────────────────────────
            detail_df["Timestamp"] = pd.to_datetime(
                detail_df["Timestamp"], errors="coerce"
            )
            invalid_ts = detail_df[detail_df["Timestamp"].isna()]
            if not invalid_ts.empty:
                return Res.error(
                    "E-10246",
                    message="Invalid timestamp found in the Detail sheet.",
                    http_status_code=422,
                )

            if detail_df["Timestamp"].duplicated().any():
                return Res.error(
                    "E-10246",
                    message="Duplicate timestamp found in the Detail sheet.",
                    http_status_code=422,
                )

            sorted_ts = detail_df["Timestamp"].sort_values().reset_index(drop=True)
            for i in range(1, len(sorted_ts)):
                diff = (sorted_ts[i] - sorted_ts[i - 1]).total_seconds()
                if diff != 1800:
                    return Res.error(
                        "E-10246",
                        message="Missing timestamp interval found in the Detail sheet. Please upload the complete monthly file.",
                        http_status_code=422,
                    )

            min_ts = detail_df["Timestamp"].min()
            max_ts = detail_df["Timestamp"].max()
            if (
                min_ts.month != month
                or min_ts.year != year
                or max_ts.month != month
                or max_ts.year != year
            ):
                return Res.error(
                    "E-10246",
                    message="Timestamp values are outside the selected reporting period.",
                    http_status_code=422,
                )

            # ── Revenue calculation ─────────────────────────────────────────────────
            # Total Energy Revenue
            energy_cols = [
                "EPEX DAM Rev",
                "EPEX 30 DA Rev",
                "IDA1 Rev",
                "IDC Rev",
                "Imbalance Rev",
            ]
            total_energy = 0.0
            for col in energy_cols:
                if col in detail_df.columns:
                    detail_df[col] = pd.to_numeric(
                        detail_df[col], errors="coerce"
                    ).fillna(0)
                    total_energy += detail_df[col].sum()

            # Total Ancillary Revenue
            ancillary_cols = [
                "DCL revenues",
                "DCH revenues",
                "DRL revenues",
                "DRH revenues",
                "DML revenues",
                "DMH revenues",
                "SFFR Revenue",
            ]
            total_ancillary = 0.0
            for col in ancillary_cols:
                if col in detail_df.columns:
                    detail_df[col] = pd.to_numeric(
                        detail_df[col], errors="coerce"
                    ).fillna(0)
                    total_ancillary += detail_df[col].sum()

            # Apply 95% GridBeyond fee
            total_energy_net = total_energy * 0.95
            total_ancillary_net = total_ancillary * 0.95
            reported_net = total_energy_net + total_ancillary_net

            # ── Store file ──────────────────────────────────────────────────────────
            stored_name = f"summary_{uuid4().hex}_{filename}"
            FileStorageManager.upload_file(
                file_bytes,
                stored_name,
                UPLOAD_PATHS["SUMMARY_STATEMENT_PATH"],
                is_encrypted=False,
            )

            # ── Save to DB ──────────────────────────────────────────────────────────
            summary_record = SummaryStatement(
                asset_id=asset_id,
                month=month,
                year=year,
                file_name=filename,
                file_key=f"{UPLOAD_PATHS['SUMMARY_STATEMENT_PATH']}{stored_name}",
                storage_server=FileStorageManager.STORAGE_TYPE,
                file_size=len(file_bytes),
                total_energy_revenue=total_energy_net,
                total_ancillary_revenue=total_ancillary_net,
                reported_net_revenue=reported_net,
                is_deleted=False,
            )
            db.add(summary_record)
            await db.flush()

            # ── Audit log ────────────────────────────────────────────────────────────
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SUMMARY_STATEMENT_UPLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Summary Statement": "Not Uploaded",
                    "Revenue Metrics Extraction": "Not Started",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Summary Statement": filename,
                    "File Size": len(file_bytes),
                    "Upload Status": "Successful",
                    "Revenue Metrics Extraction Status": "Successful",
                    "Total Energy Revenue": round(total_energy_net, 2),
                    "Total Ancillary Revenue": round(total_ancillary_net, 2),
                    "Reported Net Revenue": round(reported_net, 2),
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()

            background_tasks.add_task(
                asset_computation_task.kiq,
                asset_id=asset_id,
                month=month,
                year=year,
                dependencies=[
                    YearlySummaryStatementRecords.__name__,
                    YearlySummaryStatementDataFrame.__name__,
                ],
            )

            return Res.success(
                "S-10096",
                data={
                    "id": summary_record.id,
                    "statement_id": summary_record.statement_id,  # Changed from summary_id
                    "file_name": filename,
                    "file_size": len(file_bytes),
                    "uploaded_on": summary_record.uploaded_on.isoformat(),
                    "revenue_values": {
                        "total_energy_revenue": round(total_energy_net, 2),
                        "total_ancillary_revenue": round(total_ancillary_net, 2),
                        "reported_net_revenue": round(reported_net, 2),
                    },
                    "month": month,
                    "year": year,
                    "message": "Summary Statement file uploaded and validated successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    # ── Summary Statement List ────────────────────────────────────────────────────

    async def list_summary_statements(
        self,
        db: AsyncSession,
        asset_id: int,
        month: Optional[int] = None,
        year: Optional[int] = None,
        current_user: dict = None,
    ):
        try:
            query = select(SummaryStatement).where(
                SummaryStatement.asset_id == asset_id,
                SummaryStatement.is_deleted == False,
            )

            if month is not None:
                query = query.where(SummaryStatement.month == month)
            if year is not None:
                query = query.where(SummaryStatement.year == year)

            query = query.order_by(SummaryStatement.uploaded_on.desc())
            result = await db.execute(query)
            records = result.scalars().all()

            summary_statements = []
            for r in records:
                summary_statements.append(
                    {
                        "id": r.id,
                        "statement_id": r.statement_id,  # Changed from summary_id
                        "file_name": r.file_name,
                        "file_size": r.file_size,
                        "uploaded_on": (
                            r.uploaded_on.isoformat() if r.uploaded_on else None
                        ),
                        "month": r.month,
                        "year": r.year,
                        "revenue_values": {
                            "total_energy_revenue": (
                                round(r.total_energy_revenue, 2)
                                if r.total_energy_revenue
                                else 0.0
                            ),
                            "total_ancillary_revenue": (
                                round(r.total_ancillary_revenue, 2)
                                if r.total_ancillary_revenue
                                else 0.0
                            ),
                            "reported_net_revenue": (
                                round(r.reported_net_revenue, 2)
                                if r.reported_net_revenue
                                else 0.0
                            ),
                        },
                    }
                )

            return Res.success(
                "S-10098",
                data={
                    "total_files": len(summary_statements),
                    "summary_statements": summary_statements,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    # ── Summary Statement Delete ───────────────────────────────────────────────────
    async def delete_summary_statement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        statement_id: int,
        current_user: dict,
        background_tasks: BackgroundTasks
    ):
        try:
            # ── Fetch asset ────────────────────────────────────────────────────────
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )

            # ── Fetch Summary Statement record by summary_id ─────────────────────
            query = await db.execute(
                select(SummaryStatement).where(
                    SummaryStatement.asset_id == asset_id,
                    SummaryStatement.id == statement_id,
                    SummaryStatement.is_deleted.is_(False),
                )
            )
            record = query.scalars().first()

            if not record:
                return Res.error(
                    "E-10248",
                    message="Summary Statement file not found for the selected asset.",
                    http_status_code=404,
                )

            file_name = record.file_name
            summary_resource_id = record.statement_id
            summary_id = record.id
            month = record.month
            year = record.year

            # ── Audit log ────────────────────────────────────────────────────────────
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SUMMARY_STATEMENT_DELETED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Summary Statement": file_name,
                    "Upload History": "Available",
                    "Revenue Metrics Extraction Status": "Successful",
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Summary Statement": "Removed",
                    "Upload History": "Removed",
                    "Extracted Revenue Metrics": "Removed",
                },
                resource_id=summary_resource_id,
            )

            # ── Soft delete ──────────────────────────────────────────────────────────
            record.is_deleted = True
            await db.commit()

            background_tasks.add_task(
                asset_analytics_deletion_task.kiq,
                asset_id=asset_id,
                month=month,
                year=year,
                dependencies=[
                    YearlySummaryStatementRecords.__name__,
                    YearlySummaryStatementDataFrame.__name__,
                ],
            )

            return Res.success(
                "S-10097",
                data={
                    "asset_id": asset_id,
                    "statement_id": summary_id,
                    "message": "Summary Statement file deleted successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    # ── Summary Statement Download ─────────────────────────────────────────────────

    async def download_summary_statement(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        statement_id: int,
        current_user: dict,
    ):
        try:
            # ── Fetch asset ────────────────────────────────────────────────────────
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )

            # ── Fetch Summary Statement record by summary_id ─────────────────────
            query = await db.execute(
                select(SummaryStatement).where(
                    SummaryStatement.asset_id == asset_id,
                    SummaryStatement.id == statement_id,
                    SummaryStatement.is_deleted.is_(False),
                )
            )
            record = query.scalars().first()

            if not record:
                return Res.error(
                    "E-10248",
                    message="Summary Statement file not found for the selected asset.",
                    http_status_code=404,
                )

            # ── Audit log ────────────────────────────────────────────────────────────
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SUMMARY_STATEMENT_DOWNLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Summary Statement": record.file_name,
                    "Download Status": "Not Started",
                },
                after="Summary Statement file downloaded by user",
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )

            await db.commit()

            # ── Get file from storage ──────────────────────────────────────────────
            file_obj, _ = FileStorageManager.get_file_object(
                record.file_key, storage_type=record.storage_server
            )

            return StreamingResponse(
                BytesIO(file_obj),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f'attachment; filename="{record.file_name}"'
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

class InvoiceAnalysisService:
    def __init__(self):
        self.helper = AnalysisServiceHelper()

    async def export_capacity_market(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        month: int | None = None,
        current_user: dict = None,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10120",
                    message="Capacity Market analysis is not applicable for Solar assets.",
                    http_status_code=409,
                )

            query = (
                select(Settlement, PdfInvoice)
                .join(
                    PdfInvoice,
                    (Settlement.asset_id == PdfInvoice.asset_id)
                    & (Settlement.year == PdfInvoice.year)
                    & (Settlement.month == PdfInvoice.month),
                )
                .where(
                    Settlement.asset_id == asset_id,
                    Settlement.year == year,
                    Settlement.is_deleted == False,
                    PdfInvoice.is_deleted == False,
                )
            )
            if month is not None:
                query = query.where(Settlement.month == month)

            query = query.order_by(Settlement.month.asc())
            result = await db.execute(query)
            records = result.all()

            if not records:
                return Res.error(
                    "E-10234",
                    message="No capacity market data available",
                    http_status_code=404,
                )

            output = StringIO()
            output.write("\ufeff")
            writer = csv.writer(output)

            writer.writerow(
                [
                    "Capacity Month",
                    "Capacity Year",
                    "Invoice ID",
                    "Invoice Number",
                    "Invoice Date",
                    "Payment Date",
                    "Amount (£)",
                    "Absolute Amount (£)",
                ]
            )

            for settlement, invoice in records:
                invoice_amount = (
                    invoice.invoice_amount if invoice.invoice_amount else 0.0
                )
                month_name = Month(settlement.month).name.capitalize()
                writer.writerow(
                    [
                        month_name,
                        settlement.year,
                        invoice.id,
                        invoice.invoice_number,
                        (
                            invoice.invoice_date.strftime("%d %b %Y")
                            if invoice.invoice_date
                            else ""
                        ),
                        (
                            settlement.invoice_payment_date.strftime("%d %b %Y")
                            if settlement.invoice_payment_date
                            else ""
                        ),
                        f"{invoice_amount:.2f}",
                        f"{abs(invoice_amount):.2f}",
                    ]
                )

            output.seek(0)

            safe_asset_name = re.sub(r"[^A-Za-z0-9_-]", "_", asset.name)
            filename = f"capacity_market_payments_{safe_asset_name}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    # async def get_revenue_reconciliation(
    #     self,
    #     db: AsyncSession,
    #     asset_id: int,
    #     year: int,
    #     months: List[int] | None = None,
    #     current_user: dict = None,
    # ):
    #     try:
    #         # ── Fetch Asset ──────────────────────────────────────────────────────────
    #         asset = await db.get(Asset, asset_id)
    #         if not asset:
    #             return Res.error(
    #                 "E-10034", message="Asset not found.", http_status_code=404
    #             )

    #         if asset.status != AssetStatus.ACTIVE.value:
    #             return Res.error(
    #                 "E-10240",
    #                 message="Revenue Reconciliation is only available for Active assets.",
    #                 http_status_code=409,
    #             )

    #         if asset.type == AssetType.SOLAR.value:
    #             return Res.error(
    #                 "E-10120",
    #                 message="Revenue Reconciliation is not applicable for Solar assets.",
    #                 http_status_code=409,
    #             )

    #         # ── Fetch Merged Dataset ────────────────────────────────────────────────
    #         merged_query = select(AssetFile).where(
    #             AssetFile.asset_id == asset_id,
    #             AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
    #             AssetFile.year == year,
    #             AssetFile.is_active == True,
    #         )
    #         if months:
    #             merged_query = merged_query.where(AssetFile.month.in_(months))

    #         merged_result = await db.execute(merged_query)
    #         merged_files = merged_result.scalars().all()

    #         if not merged_files:
    #             return Res.error(
    #                 "E-10100",
    #                 message="Merged dataset not available",
    #                 http_status_code=422,
    #             )

    #         # ── Fetch available months ──────────────────────────────────────────────
    #         available_months = sorted(set([f.month for f in merged_files]))
    #         selected_months = months if months else available_months

    #         # ── Fetch Summary Statement data ────────────────────────────────────────
    #         summary_query = select(SummaryStatement).where(
    #             SummaryStatement.asset_id == asset_id,
    #             SummaryStatement.year == year,
    #             SummaryStatement.is_deleted == False,
    #         )
    #         if months:
    #             summary_query = summary_query.where(SummaryStatement.month.in_(months))

    #         summary_result = await db.execute(summary_query)
    #         summary_records = {s.month: s for s in summary_result.scalars().all()}

    #         # ── Calculate KPIs and Stream Data ──────────────────────────────────────
    #         gross_revenue = 0.0
    #         stream_data = {}
    #         reported_net_total = 0.0

    #         stream_mapping = {
    #             "EPEX DAM 30": "EPEX 30 DA Revenue",
    #             "EPEX DAM 60": "EPEX DA Revenues",
    #             "IDA1": "IDA1 Revenue",
    #             "IDC": "IDC Revenue",
    #             "Imbalance": "Imbalance Revenue",
    #             "SFFR": "SFFR revenues",
    #             "DC": ["DCL revenues", "DCH revenues"],
    #             "DR": ["DRL revenuues", "DRH revenues"],
    #             "DM": ["DML revenes", "DMH revenues"],
    #         }

    #         for merged_file in merged_files:
    #             file_obj, _ = FileStorageManager.get_file_object(
    #                 merged_file.key, storage_type=merged_file.storage_server
    #             )
    #             df = pd.read_excel(BytesIO(file_obj))

    #             for stream_name, col in stream_mapping.items():
    #                 if isinstance(col, list):
    #                     stream_sum = sum(
    #                         float(df[c].sum()) for c in col if c in df.columns
    #                     )
    #                 else:
    #                     stream_sum = float(df[col].sum()) if col in df.columns else 0.0

    #                 if stream_name not in stream_data:
    #                     stream_data[stream_name] = {
    #                         "gross_revenue": 0.0,
    #                         "expected_net": 0.0,
    #                         "reported_net": 0.0,
    #                         "monthly_breakdown": [],
    #                     }

    #                 stream_data[stream_name]["gross_revenue"] += stream_sum
    #                 stream_data[stream_name]["monthly_breakdown"].append(
    #                     {
    #                         "month": merged_file.month,
    #                         "gross_revenue": round(stream_sum, 2),
    #                     }
    #                 )
    #                 gross_revenue += stream_sum

    #         # ── Calculate KPIs ──────────────────────────────────────────────────────
    #         gridbeyond_fee = gross_revenue * 0.05
    #         expected_net = gross_revenue * 0.95

    #         for month in selected_months:
    #             summary = summary_records.get(month)
    #             if summary and summary.reported_net_revenue:
    #                 reported_net_total += summary.reported_net_revenue

    #         variance = reported_net_total - expected_net

    #         # ── Build Stream Data ────────────────────────────────────────────────────
    #         revenue_by_stream = []
    #         per_stream_comparison = []

    #         for stream_name, data in stream_data.items():
    #             gross = data["gross_revenue"]
    #             expected = gross * 0.95

    #             if gross_revenue != 0:
    #                 reported = (
    #                     (gross / gross_revenue) * reported_net_total
    #                     if reported_net_total > 0
    #                     else 0.0
    #                 )
    #             else:
    #                 reported = 0.0

    #             variance_stream = reported - expected
    #             variance_pct = (
    #                 (variance_stream / expected * 100) if expected != 0 else 0.0
    #             )

    #             abs_variance = abs(variance_stream)
    #             if abs_variance < 1:
    #                 status = "success"
    #             elif abs_variance < 100:
    #                 status = "warning"
    #             else:
    #                 status = "error"

    #             per_stream_monthly_breakdown = data["monthly_breakdown"]
    #             computed_per_stream_monthly_breakdown = []
    #             for monthly_data in per_stream_monthly_breakdown:

    #                 monthly_gross = monthly_data["gross_revenue"]
    #                 monthly_expected = monthly_gross * 0.95
    #                 if gross_revenue != 0:
    #                     monthly_reported = (
    #                         (monthly_gross / gross_revenue) * reported_net_total
    #                         if reported_net_total > 0
    #                         else 0.0
    #                     )
    #                 else:
    #                     monthly_reported = 0.0
    #                 monthly_variance_stream = monthly_reported - monthly_expected
    #                 monthly_variance_pct = (
    #                     (monthly_variance_stream / monthly_expected * 100)
    #                     if monthly_expected != 0
    #                     else 0.0
    #                 )

    #                 computed_per_stream_monthly_breakdown.append(
    #                     {
    #                         "month": monthly_data["month"],
    #                         "gross_revenue": round(monthly_data["gross_revenue"], 2),
    #                         # these are computed for each month
    #                         "expected_net": round(monthly_expected, 2),
    #                         "reported_net": round(monthly_reported, 2),
    #                         "variance": round(monthly_variance_stream, 2),
    #                         "variance_percentage": round(monthly_variance_pct, 2),
    #                     }
    #                 )

    #             revenue_by_stream.append(
    #                 {
    #                     "stream": stream_name,
    #                     "gross_revenue": round(gross, 2),
    #                     "expected_net": round(expected, 2),
    #                     "reported_net": round(reported, 2),
    #                 }
    #             )

    #             per_stream_comparison.append(
    #                 {
    #                     "stream": stream_name,
    #                     "gross_revenue": round(gross, 2),
    #                     "expected_net": round(expected, 2),
    #                     "reported_net": round(reported, 2),
    #                     "variance": round(variance_stream, 2),
    #                     "variance_percentage": round(variance_pct, 2),
    #                     "status": status,
    #                     "monthly_breakdown": computed_per_stream_monthly_breakdown,
    #                 }
    #             )

    #             # total revenue by stream
    #             total_stream_comparision = {
    #                 "gross_revenue": 0,
    #                 "expected_net": 0,
    #                 "reported_net": 0,
    #                 "variance": 0,
    #                 "variance_percentage": 0,
    #             }

    #             for stream in per_stream_comparison:
    #                 total_stream_comparision["gross_revenue"] += stream["gross_revenue"]
    #                 total_stream_comparision["expected_net"] += stream["expected_net"]
    #                 total_stream_comparision["reported_net"] += stream["reported_net"]
    #                 total_stream_comparision["variance"] += stream["variance"]

    #             total_stream_comparision["variance_percentage"] = (
    #                 (
    #                     total_stream_comparision["variance"]
    #                     / total_stream_comparision["expected_net"]
    #                     * 100
    #                 )
    #                 if total_stream_comparision["expected_net"] != 0
    #                 else 0.0
    #             )

    #         return Res.success(
    #             "S-10095",
    #             data={
    #                 "asset_id": asset_id,
    #                 "asset_name": asset.name,
    #                 "year": year,
    #                 "months": selected_months,
    #                 "available_months": available_months,
    #                 "has_data": True,
    #                 "kpis": {
    #                     "gross_revenue": round(gross_revenue, 2),
    #                     "gridbeyond_fee": round(gridbeyond_fee, 2),
    #                     "expected_net": round(expected_net, 2),
    #                     "reported_net": round(reported_net_total, 2),
    #                     "variance": round(variance, 2),
    #                 },
    #                 "revenue_by_stream": revenue_by_stream,
    #                 "per_stream_comparison": per_stream_comparison,
    #                 "per_stream_comparision_total": total_stream_comparision,
    #             },
    #         )

    #     except Exception:
    #         traceback.print_exc()
    #         return Res.error("E-10001")

    async def export_revenue_reconciliation(
        self,
        db: AsyncSession,
        asset_id: int,
        asset: Asset,
        year: int,
        months: List[int] | None = None,
        current_user: dict = None,
    ):
        try:
            result = await self.get_per_stream_comparison(
                db=db,
                asset_id=asset_id,
                asset=asset,
                year=year,
                months=months,
                current_user=current_user,
            )

            res_body = (
                json.loads(result.body.decode()) if hasattr(result, "body") else result
            )

            if res_body.get("status") == "error":
                return result

            data = res_body.get("data", {})
            per_stream_comparison = data.get("per_stream_comparison", [])
            total_stream_comparision = data.get("total_stream_data", {})

            if not per_stream_comparison:
                return Res.error(
                    "E-10236",
                    message="No revenue reconciliation data available for export",
                    http_status_code=422,
                )

            output = StringIO()
            output.write("\ufeff")
            writer = csv.writer(output)

            writer.writerow(
                [
                    "Stream",
                    "Month",
                    "Gross Revenue (£)",
                    "Expected Net (£)",
                    "Reported Net (£)",
                    "Variance (£)",
                    "Variance (%)",
                ]
            )

            for row in per_stream_comparison:
                for monthly_breakdown in row.get("monthly_breakdown", []):
                    writer.writerow(
                        [
                            row.get("stream", ""),
                            calendar.month_abbr[monthly_breakdown.get("month", 0)],
                            f"{monthly_breakdown.get('gross_revenue', 0):.2f}",
                            f"{monthly_breakdown.get('expected_net', 0):.2f}",
                            f"{monthly_breakdown.get('reported_net', 0):.2f}",
                            f"{monthly_breakdown.get('variance', 0):.2f}",
                            f"{monthly_breakdown.get('variance_percentage', 0):.2f}",
                        ]
                    )

            writer.writerow(
                [
                    "Total",
                    "All months",
                    f"{total_stream_comparision.get('gross_revenue', 0):.2f}",
                    f"{total_stream_comparision.get('expected_net', 0):.2f}",
                    f"{total_stream_comparision.get('reported_net', 0):.2f}",
                    f"{total_stream_comparision.get('variance', 0):.2f}",
                    f"{total_stream_comparision.get('variance_percentage', 0):.2f}",
                ]
            )

            output.seek(0)

            safe_asset_name = re.sub(
                r"[^A-Za-z0-9_-]", "_", data.get("asset_name", str(asset_id))
            )
            filename = f"revenue_reconciliation_{safe_asset_name}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")


    @asset_analytics_db_cache(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.REVENUE_RECONCILIATION,
        widget=AnalysisWidget.REVENUE_RECONCILIATION_PER_STREAM_COMPARISON,
        index=['asset_id', 'year'],
        # persist_after_compute=False,
    )
    async def get_per_stream_comparison(
        self,
        db: AsyncSession,
        asset: Asset,
        asset_id: int,
        year: int,
        current_user: dict,
        months: List[int] | None = None,
        **kwargs,
    ):
        def filter_data_by_months(data: list[dict], months: List[int]) -> list[dict]:
            if not months:
                return data
            
            filtered_data = {}
            data_months = list(map(str, sorted(data.keys())))
            for month in months:
                if str(month) in data_months:
                    filtered_data[month] = data[str(month)]

            return filtered_data    
            
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:
            # Load dependencies
            yearly_merged_df = await self.helper.load_yearly_merged_df(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            yearly_summary_statement_files = await self.helper.load_yearly_summary_statement_files(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            # Compute per stream comparison
            analytics_data = self.helper.get_revenue_reconciliation_per_stream_comparison(
                yearly_merged_df=yearly_merged_df,
                yearly_summary_statement_df=yearly_summary_statement_files,
            )
            compute_context['result'] = analytics_data

        # tranform data into aggrgated result as per api response
        analytics_data = filter_data_by_months(analytics_data, months)
        analytics_data = self.helper._transform_per_stream_data(analytics_data)

        # Implement the logic for per stream comparison here
        data = {
            "asset_id": asset.id,
            "asset_name": asset.name,
            "year": year,
            **analytics_data,
        }
        return Res.success(data=data)


    @asset_analytics_db_cache(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.REVENUE_RECONCILIATION,
        widget=AnalysisWidget.REVENUE_RECONCILIATION_SUMMARY,
        index=['asset_id', 'year'],
    )
    async def get_revenue_reconciliation_summary(
        self,
        db: AsyncSession,
        asset: Asset,
        year: int,
        asset_id: int,
        current_user: dict,
        months: List[int] | None = None,
        **kwargs,
    ):
        def transform_data(data: dict[int, dict[str, float]]) -> dict[str, float]:
            months = sorted(data.keys())
            if len(months) == 0:
                return {
                    "has_data": False,
                }
            
            agg_data = {}
            for month in months:
                for kpi_key in data[month]:
                    kpi_data = data[month][kpi_key]
                    # insert the data if data is not prsent, else add the data to existing data to aggregate it
                    if agg_data.get(kpi_key) is None:
                        agg_data[kpi_key] = kpi_data
                    else:
                        agg_data[kpi_key] += kpi_data

            agg_data["has_data"] = True
            return agg_data
        
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:
            # ==================== Load dependencies ============================
            yearly_merged_df = await self.helper.load_yearly_merged_df(
                db=db,
                asset_id=asset.id,
                year=year,
            )
            yearly_summary_statements = await self.helper.load_yearly_summary_statement_records(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            # ===================== Compute revenue reconciliation summary =========================
            analytics_data = self.helper.get_revenue_reconciliation_summary(
                yearly_merged_df=yearly_merged_df,
                yearly_summary_statement_record=yearly_summary_statements,
            )
            compute_context['result'] = analytics_data

        # tranform data into aggrgated result as per api response
        analytics_data = self.helper._filter_yearly_data_by_months(analytics_data, months)
        analytics_data = transform_data(analytics_data)

        # Implement the logic for per stream comparison here
        data = {
            "asset_id": asset_id,
            "asset_name": asset.name,
            "year": year,
            **analytics_data,
        }
        return Res.success(data=data)

    @asset_analytics_db_cache(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_SUMMARY,
        index=['asset_id', 'year'],
    )
    async def get_capacity_market_summary_analysis(
        self,
        asset: Asset,
        year: int,
        month: int | None,
        db: AsyncSession,
        asset_id: int,  # do not remove this parameter, it is used for caching and indexing by the decorator
        current_user: dict,
        **kwargs,
    ):
        def transform_data(data):
            
            months = sorted(data.keys())
            if len(months) == 0:
                return {
                    "has_data": False,
                }
            
            agg_data = {}
            for month in months:
                for kpi_key in data[month]:
                    kpi_data = data[month][kpi_key]
                    # insert the data if data is not prsent, else add the data to existing data to aggregate it
                    if agg_data.get(kpi_key) is None:
                        agg_data[kpi_key] = kpi_data
                    else:
                        agg_data[kpi_key] += kpi_data

            agg_data['average_monthly_payment'] = agg_data['capacity_payments'] / agg_data['emr_invoices']
            return {"kpis": agg_data, "has_data": True}


        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:
            # Load dependencies
            yearly_invoice_records = await self.helper.load_yearly_pdf_invoices(
                db=db,
                asset_id=asset.id,
                year=year,
            )
            yearly_settlement_records = await self.helper.load_yearly_settlement_records(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            # compute results
            analytics_data = self.helper.get_invoice_capacity_market_summary(
                yearly_pdf_invoices_records=yearly_invoice_records,
                yearly_invoice_settlement_records=yearly_settlement_records
            )

            # store the data in cache
            compute_context['result'] = analytics_data

        analytics_data = self.helper._filter_yearly_data_by_months(analytics_data, [month] if month else None)
        analytics_data = transform_data(analytics_data)

        return Res.success(
            "S-10093",
            data={
                "asset_id": asset.id,
                "asset_name": asset.name,
                "year": year,
                "month": month,
                **analytics_data,
            }
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_PAYMENTS,
        index=['asset_id', 'year'],
    )
    async def get_capacity_market_payments(
        self,
        asset: Asset,
        year: int,
        month: int | None,
        db: AsyncSession,
        asset_id: int, # do not remove this parameter, it is used for caching and indexing by the decorator
        current_user: dict,
        **kwargs,
    ):
        def filter_yearly_data_by_months(data, month: int | None):
            root_key = 'capacity_market_payments'
            if month is None:
                data['has_data'] = data[root_key] is not None and len(data[root_key]) > 0
                return data
            
            data_arr = data[root_key]
            filtered_data = {}
            for d in data_arr:
                if d['capacity_month'] == month:
                    filtered_data.setdefault(root_key, []).append(d)

            if len(filtered_data.get(root_key, [])) == 0:
                filtered_data['has_data'] = False
            else:
                filtered_data['has_data'] = True
            return filtered_data

        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:
            # load dependencies
            yearly_invoice_records = await self.helper.load_yearly_pdf_invoices(
                db=db,
                asset_id=asset.id,
                year=year,
            )
            yearly_settlement_records = await self.helper.load_yearly_settlement_records(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            # compute results
            yearly_settlement_records = await self.helper.load_yearly_settlement_records(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            analytics_data = self.helper.get_capacity_market_payments(
                yearly_pdf_invoices_records=yearly_invoice_records,
                yearly_invoice_settlement_records=yearly_settlement_records,
            )
            compute_context['result'] = analytics_data

        analytics_data = filter_yearly_data_by_months(analytics_data, month)

        return Res.success(
            "S-10093",
            data={
                "asset_id": asset.id,
                "asset_name": asset.name,
                "year": year,
                "month": month,
                **analytics_data,
            }
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_PAYMENT_TREND,
        index=['asset_id', 'year'],
    )
    async def get_capacity_market_payment_trend(
        self,
        asset: Asset,
        year: int,
        month: int | None,
        db: AsyncSession,
        asset_id: int, # do not remove this parameter, it is used for caching and indexing by the decorator
        current_user: dict,
        **kwargs,
    ):
        def filter_yearly_data_by_months(data, month: int | None):
            root_key = 'payment_trend'
            if month is None:
                data['has_data'] = data[root_key] is not None and len(data[root_key]) > 0
                return data

            data_arr = data[root_key]

            filtered_data = {}
    
            for d in data_arr:
                if d['month'] == month:
                    monthly_payment_data = {
                        'month': d['month'],
                        'monthly_payment': d['monthly_payment'],
                        'cumulative_payment': d['monthly_payment'], # since we are filtering by a single month, the cumulative payment is the same as the monthly payment
                    }
                    filtered_data.setdefault(root_key, []).append(monthly_payment_data)

            print(json.dumps(filtered_data, indent=4))
            if len(filtered_data.get(root_key, [])) == 0:
                filtered_data['has_data'] = False
            else:
                filtered_data['has_data'] = True

            return filtered_data

        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:
            yearly_invoice_records = await self.helper.load_yearly_pdf_invoices(
                db=db,
                asset_id=asset.id,
                year=year,
            )
            yearly_settlement_records = await self.helper.load_yearly_settlement_records(
                db=db,
                asset_id=asset.id,
                year=year,
            )

            analytics_data = self.helper.get_capacity_market_payment_trend(
                yearly_pdf_invoices_records=yearly_invoice_records,
                yearly_invoice_settlement_records=yearly_settlement_records
            )
            compute_context['result'] = analytics_data

        analytics_data = filter_yearly_data_by_months(analytics_data, month)

        return Res.success(
            "S-10093",
            data={
                "asset_id": asset.id,
                "asset_name": asset.name,
                "year": year,
                "month": month,
                **analytics_data,
            }
        )