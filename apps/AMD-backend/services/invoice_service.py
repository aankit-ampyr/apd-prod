# ── services/pdf_invoice_service.py ──────────────────────────────────────────
import re
import json
import math
import traceback
from io import BytesIO, StringIO
import csv
from datetime import datetime, timezone
from typing import List
import pdfplumber
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import StreamingResponse
from models.invoice_model import PdfInvoice,Settlement
from constants.enums import InvoiceType, UserRole, APDAuditLogScenario as AuditLogScenario,APDAuditLogModules as AuditLogModules, AssetType
from models.asset import Asset
from utils import audit_logs, FileStorageManager, paginate
from python_common.utils.response_utils import Res
from pdf2image import convert_from_bytes
import pytesseract
from constants.defaults import UPLOAD_PATHS
from models.asset import Asset




INVOICE_TYPE_LABELS = {
    InvoiceType.HARTREE_PV.value:          "Hartree PV",
    InvoiceType.HARTREE_BESS.value:        "Hartree BESS",
    InvoiceType.EMR.value:                 "EMR",
    InvoiceType.GRIDBEYOND.value:          "GridBeyond",
    InvoiceType.HARTREE_BESS_POWER.value:  "Hartree BESS Power",
    InvoiceType.HARTREE_AUXILIARY.value:   "Hartree Auxiliary",
    InvoiceType.HARTREE_SOLAR_POWER.value: "Hartree Solar Power",
    InvoiceType.HARTREE_OTHER.value:       "Hartree Other",
}


class PdfInvoiceService:
    def _classify_invoice_type(self, filename: str) -> int:
        """Classify invoice type from filename. Returns InvoiceType enum value."""
        name = filename.upper()

        if "GRIDBEYOND" in name or "GRID BEYOND" in name:
            return InvoiceType.GRIDBEYOND.value

        has_hartree = "HARTREE" in name
        has_nwosfl  = "NWOSFL" in name

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

    def _extract_text(self, file_bytes: bytes) -> str | None:
        """Hybrid extraction: PDF text -> OCR if text is poor."""
        # 1. Try standard extraction
        try:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                if len(text.strip()) > 50: # If we got reasonable text, use it
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
        same_line_pattern = r"Invoice\s+Number[:\.\s]+([A-Za-z0-9][A-Za-z0-9_\-\s]{2,29})"
        match = re.search(same_line_pattern, text, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip().split("\n")[0].strip()
            if candidate and not re.match(r"^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$", candidate):
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
                if re.search(r"(?:Date|Period|Days|Payment|Due|Total|Amount|VAT|Billing)", candidate, re.IGNORECASE):
                    continue
                if re.search(r"[A-Za-z].*\d|\d.*[A-Za-z]|[_\-]", candidate):
                    return candidate
        return None    
    
    def _extract_invoice_date(self, text: str) -> str | None:
        cleaned_text = re.sub(r"(\d)\s+(\d{1,2}/\d{1,2}/\d{4})", r"\1\2", text)
        cleaned_text = re.sub(r"(\d)\s+(/\d{1,2}/\d{4})", r"\1\2", cleaned_text)

        label_pattern = (
            r"(?:Invoice\s+Date|Issue\s+Date)[:\s]+"
            r"(\d{1,2}\s+\w+\s+\d{4}"        # 10 December 2025
            r"|\d{1,2}/\d{1,2}/\d{4}"        # 10/12/2025
            r"|\d{4}-\d{2}-\d{2}"            # 2025-12-10
            r"|\d{1,2}-\w+-\d{4})"           # 10-Dec-2025
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
            day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
            try:
                return datetime(year, month, day).strftime("%d %b %Y")
            except ValueError:
                pass

        # All other formats
        for fmt in [
            "%d %B %Y",    # 10 December 2025
            "%d %b %Y",    # 10 Dec 2025
            "%Y-%m-%d",    # 2025-12-10
            "%d-%b-%Y",    # 10-Dec-2025
            "%B %d, %Y",   # December 10, 2025
            "%d-%m-%Y",    # 10-12-2025
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
            year_str  = match.group(2).strip()
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
        asset_id: int,
        month: int,
        year: int,
        file,
        current_user: dict,
    ):
        try:
            file_bytes = await file.read()
            filename = file.filename

            # File type check
            if not filename.lower().endswith(".pdf"):
                return Res.error("E-10219", message="Only PDF files are supported. Please upload a valid PDF invoice.")

            # File size check
            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error("E-10085", message="PDF invoice file size should not exceed 100 MB.")

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
                return Res.error("E-10219", message=f"A file named \"{filename}\" already exists for this reporting period.")
            
            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error("E-10034", message="Asset not found.")
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120")
            
            # Extract text from PDF
            raw_text = self._extract_text(file_bytes)
            if not raw_text:
                return Res.error("E-10220", message="Invoice details could not be extracted. Please upload a valid invoice PDF.")

            # Extract fields
            invoice_number = self._extract_invoice_number(raw_text)
            invoice_date_str = self._extract_invoice_date(raw_text)
            invoice_amount = self._extract_invoice_amount(raw_text)
            capacity_payment_month, capacity_payment_year = self._extract_capacity_payment(raw_text)

            # Reporting period validation
            if invoice_date_str:
                extracted_date = datetime.strptime(invoice_date_str, "%d %b %Y").date()
                # Check if month and year match the reporting period
                if extracted_date.month != month or extracted_date.year != year:
                    return Res.error(
                        "E-10224",
                        message="The invoice date does not match the selected reporting period. Please upload the correct invoice for this period."
                    )
            else:
                # If no date extracted, check if any required fields are extracted
                if not any([invoice_number, invoice_amount]):
                    return Res.error("E-10220", message="Invoice details could not be extracted. Please upload a valid invoice PDF.")

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
                invoice_date=datetime.strptime(invoice_date_str, "%d %b %Y").date() if invoice_date_str else None,
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
            extracted_count = sum([
                invoice_number is not None,
                invoice_date_str is not None,
                invoice_amount is not None,
                capacity_payment_month is not None,
                capacity_payment_year is not None,
            ])
            
            if extracted_count == 5:
                extraction_status = "extracted"
            elif extracted_count > 0:
                extraction_status = "partial"
            else:
                extraction_status = "failed"

            # Audit log
            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.ASSET_MANAGEMENT_AMD.value,
                action=AuditLogScenario.INVOICE_UPLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Invoice PDF": "Not Uploaded",
                    "View Invoice Analysis CTA": "Disabled"
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Invoice PDF": filename,
                    "File Size": len(file_bytes),
                    "Upload Status": "Successful"
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()

            return Res.success(
                "S-10087",
                data={
                    "id": invoice_record.id,
                    "invoice_file_name": invoice_record.invoice_file_name,
                    "invoice_file_size": invoice_record.size,
                    "type": invoice_record.type,
                    "invoice_number": invoice_record.invoice_number,
                    "invoice_date": invoice_record.invoice_date.strftime("%d %b %Y") if invoice_record.invoice_date else None,
                    "invoice_amount": invoice_record.invoice_amount,
                    "capacity_payment_month": invoice_record.capacity_payment_month,
                    "capacity_payment_year": invoice_record.capacity_payment_year,
                    "uploaded_on": invoice_record.uploaded_on.isoformat() if invoice_record.uploaded_on else None,
                    "extraction_status": extraction_status,
                    "month": month,
                    "year": year,
                    "message": "Invoice uploaded and extracted successfully."
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

            order_by_list = []
            if sort:
                for s in sort:
                    desc_order = s.startswith("-")
                    field_name = s.lstrip("-")
                    col = PdfInvoice.invoice_date if field_name == "date" else PdfInvoice.uploaded_on
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
                extracted_count = sum([
                    r.invoice_number is not None,
                    r.invoice_date is not None,
                    r.invoice_amount is not None,
                ])
                status = "extracted" if extracted_count == 3 else ("partial" if extracted_count > 0 else "failed")

                invoices.append({
                    "id":                      r.id,
                    "invoice_file_name":       r.invoice_file_name,
                    "invoice_file_size":       r.size,
                    "type":                    r.type,  # no need to convert to label here; frontend accepts enum value only i.e. number values
                    "invoice_number":          r.invoice_number,
                    "invoice_date":            r.invoice_date.strftime("%d %b %Y") if r.invoice_date else None,
                    "invoice_amount":          r.invoice_amount,
                    "capacity_payment_month":  r.capacity_payment_month,
                    "capacity_payment_year":   r.capacity_payment_year,
                    "uploaded_on":             r.uploaded_on.isoformat() if r.uploaded_on else None,
                    "extraction_status":       status,
                    "month":                   r.month,
                    "year":                    r.year,
                })

            return Res.success(
                "S-10087",
                data={
                    "current_page": result.current_page,
                    "next_page":    result.next_page,
                    "total_pages":  result.total_pages,
                    "total_files":  result.total_results,
                    "invoices":     invoices,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")    

    async def get_invoice_summary(
        self,
        db: AsyncSession,
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
            if month is not None:
                query = query.where(PdfInvoice.month.in_(month))
            if year is not None:
                query = query.where(PdfInvoice.year.in_(year))

            result = await db.execute(query)
            all_records = result.scalars().all()
            total_files = len(all_records)
            asset = await db.get(Asset, asset_id)

            # ── Extraction quality for ALL 5 fields ──────────────────────────────────
            num_extracted = sum(1 for r in all_records if r.invoice_number is not None)
            date_extracted = sum(1 for r in all_records if r.invoice_date is not None)
            amt_extracted = sum(1 for r in all_records if r.invoice_amount is not None)
            capacity_month_extracted = sum(1 for r in all_records if r.capacity_payment_month is not None)
            capacity_year_extracted = sum(1 for r in all_records if r.capacity_payment_year is not None)

            def quality(extracted):
                return {
                    "extracted": extracted,
                    "total": total_files,
                    "missing": total_files - extracted,
                    "percentage": round((extracted / total_files * 100), 2) if total_files else 0.0,
                }

            category_map = {}
            for r in all_records:
                label = r.type # pass actual in enum from backend, let frontend handle it
                category_map[label] = category_map.get(label, 0) + 1
            
            if asset:
                selected_year = year if year else sorted({record.year for record in all_records})
                selected_month = month if month else sorted({record.month for record in all_records})
                
                if source == "asset_management":
                    before = {
                        "Asset ID": asset.asset_id,
                        "Asset Name": asset.name,
                        "Month": f"{selected_month}-{selected_year}",
                        "Invoice PDF": "Uploaded",
                        "Settlement CSV": "Uploaded",
                        "View Invoice Analysis CTA": "Enabled",
                    }
                    after = {
                        "Action": "User navigated to Invoice Analysis screen"
                    }

                elif source == "left_navigation":  # left_navigation
                    before = {
                        "Asset": asset.name,
                        "Year": selected_year,
                    }
                    if current_user.get("role") == UserRole.MANAGER.value:
                        after = {
                            "Action": "Management user viewed Invoice Analysis screen"
                        }
                    else:
                        after = {
                            "Action": "User viewed Invoice Analysis screen"
                        }
                else:
                    return Res.error("E-10001", message="Invalid source")

                await audit_logs(
                    db=db,
                    user_id=current_user.get("user_id"),
                    user_role=current_user.get("role"),
                    module=AuditLogModules.INVOICE_ANALYSIS.value,
                    action=AuditLogScenario.INVOICE_ANALYSIS_VIEWED.value,
                    before=before,
                    after=after,
                    resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
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
                    "category_summary": [{"type": k, "count": v} for k, v in category_map.items()],
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def delete_pdf_invoice(
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
            record = query.scalars().first()

            if not record:
                return Res.error("E-10221", message="PDF invoice not found.")
            
            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error("E-10034", message="Asset not found.")
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120")

            invoice_file_name = record.invoice_file_name
            invoice_number = record.invoice_number
            record_invoice_id = record.invoice_id
            record_id = record.id

            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.ASSET_MANAGEMENT_AMD.value,
                action=AuditLogScenario.INVOICE_DELETED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Invoice PDF": invoice_file_name,
                    "Upload History": "Available",
                    "View Invoice Analysis CTA": "Enabled"
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Invoice PDF": "Removed",
                    "Upload History": "Removed",
                    "View Invoice Analysis CTA": "Disabled"
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})"
            )

            # Soft delete
            record.is_deleted = True
            await db.commit()

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
                    PdfInvoice.is_deleted == False
                )
            )

            invoice = query.scalars().first()

            if not invoice:
                return Res.error("E-10221", message="Invoice not found.")

            file_obj, _ = FileStorageManager.get_file_object(
                invoice.file_key,
                storage_type=invoice.storage_server
            )

            return StreamingResponse(
                BytesIO(file_obj),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{invoice.invoice_file_name}"'
                }
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def download_invoice(
        self,
        db: AsyncSession,
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
                    PdfInvoice.is_deleted == False
                )
            )

            invoice = query.scalars().first()

            if not invoice:
                return Res.error("E-10221", message="Invoice not found.")
            
            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error("E-10034", message="Asset not found.")
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120")
            
            if source == "preview":
                module = AuditLogModules.INVOICE_ANALYSIS.value
                action = AuditLogScenario.INVOICE_PREVIEW_DOWNLOADED.value
                after = {
                    "Action": "Invoice PDF downloaded from preview panel"
                }

            elif source == "upload_history":  # upload_history
                module = AuditLogModules.ASSET_MANAGEMENT_AMD.value
                action = AuditLogScenario.INVOICE_FILE_DOWNLOADED.value
                after = {
                    "Action": "Invoice PDF downloaded by user"
                }
            else:
                return Res.error("E-10001", message="Invalid source")
            await audit_logs(
                db=db,
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
                invoice.file_key,
                storage_type=invoice.storage_server
            )

            return StreamingResponse(
                BytesIO(file_obj),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{invoice.invoice_file_name}"'
                }
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")
        
    async def export_invoice_list(
        self,
        db: AsyncSession,
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
                PdfInvoice.asset_id == asset_id,  
                PdfInvoice.is_deleted == False
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
                    col = PdfInvoice.invoice_date if field_name == "date" else PdfInvoice.uploaded_on
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

            writer.writerow([
                "File Name",
                "Type",
                "Invoice Number",
                "Invoice Date",
                "Invoice Amount",
                "Uploaded On",
                "Month",
                "Year",
            ])

            for invoice in invoices:
                writer.writerow([
                    invoice.invoice_file_name,
                    INVOICE_TYPE_LABELS.get(invoice.type, "Hartree Other"),
                    invoice.invoice_number if invoice.invoice_number else "",
                    invoice.invoice_date.strftime("%d %b %Y") if invoice.invoice_date else "",
                    invoice.invoice_amount if invoice.invoice_amount else "",
                    invoice.uploaded_on.strftime("%d %b %Y %H:%M:%S") if invoice.uploaded_on else "",
                    invoice.month if invoice.month else "",
                    invoice.year if invoice.year else "",
                ])

            output.seek(0)

            if asset:
                await audit_logs(
                    db=db,
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
                    after={
                        "Action": "Invoice Analysis chart/table data downloaded by user",
                    },
                    resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
                )
                await db.commit()

            return StreamingResponse(
                BytesIO(output.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=pdf_invoice_list.csv"
                }
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")
        
    # ── settlement upload ─────────────────────────────────────────────────────
    async def upload_settlement(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        file,
        current_user: dict,
    ):
        try:
            file_bytes = await file.read()
            filename   = file.filename

            # File type check
            if not filename.lower().endswith(".csv"):
                return Res.error("E-10219", message="Only CSV files are supported. Please upload a valid settlement CSV.")
            
            # Filename pattern validation — Settlement CSV file name must follow: NORTHWO_*.csv
            if not filename.lower().startswith("northwo_"):
                return Res.error("E-10219", message="Settlement CSV file name must follow the pattern: NORTHWO_*.csv")

            # File size check
            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error("E-10085", message="Settlement CSV file size should not exceed 100 MB.")

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
                return Res.error("E-10219", message="A settlement CSV already exists for this reporting period. Delete the existing file before uploading a new one.")
            
            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                return Res.error("E-10034", message="Asset not found.")
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120")
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
                return Res.error("E-10228", message="No PDF invoice found for this reporting period. Upload the invoice PDF first.")

            # Parse CSV
            try:
                content = file_bytes.decode("utf-8-sig")
                reader  = list(csv.reader(content.splitlines()))
            except Exception:
                return Res.error("E-10220", message="Settlement CSV could not be read. Please upload a valid CSV file.")

            if len(reader) < 2:
                return Res.error("E-10220", message="Settlement CSV header row is missing. Please upload a valid settlement CSV.")

            # Second row is the actual header
            headers = [h.strip() for h in reader[1]]

            # Required columns
            REQUIRED_COLS = [
                "EMR Party Id", "EMR Invoice Number", "EMR Invoice Date",
                "EMR Invoice Payment Date", "EMR Invoice Total", "MPID", "CM Month Id",
                "Total Amount Received From Suppliers", "Total Amount Payable To Capacity Providers",
                "CMU Id", "Capacity Payment Suspension Start Date", "Capacity Payment Suspension End Date",
                "Capacity Agreement", "Auction Acquired Capacity Obligation",
                "Auction Acquired Capacity Obligation Start Date",
                "Auction Acquired Capacity Obligation End Date",
                "Auction Acquired Capacity Obligation Effective Date",
                "Auction Identifier", "Capacity Price", "Capacity Cleared Price",
                "CM Base CPI", "CM CPI", "CM Monthly Weighting Factor",
                "Monthly Capacity Payment Due", "Monthly Capacity Payment Payable",
                "Capacity Payment Suspension Flag", "CMU Id PTCO", "Capacity Trade ID",
                "Physically Traded Capacity Obligation",
                "Physically Traded Capacity Obligation Start Date",
                "Physically Traded Capacity Obligation End Date",
                "Auction Identifier PTCO", "Capacity Price PTCO", "Capacity Cleared Price PTCO",
                "CM Base CPI PTCO", "CM CPI PTCO", "CM Monthly Weighting Factor PTCO",
                "Monthly Capacity Payment Due PTCO", "Monthly Capacity Payment Payable PTCO",
                "Capacity Payment Suspension Flag PTCO", "Relevant Expenditure",
                "Relevant Benefit", "Monthly Capacity Payment Payable Recovery",
                "Recovery Period Start Date", "Recovery Period End Date",
                "Relevant Expenditure Reinstated", "Relevant Benefit Reinstated",
            ]

            for col in REQUIRED_COLS:
                if col not in headers:
                    return Res.error("E-10223", message=f"Settlement CSV is missing required column- {col}. Please upload a valid settlement file with the expected column format.")

            # Data rows start from index 2
            if len(reader) < 3:
                return Res.error("E-10219", message="Settlement CSV has no data rows.")

            data_row = dict(zip(headers, [v.strip() for v in reader[2]]))

            # Mandatory value validations
            emr_invoice_number = data_row.get("EMR Invoice Number", "").strip()
            emr_invoice_date   = data_row.get("EMR Invoice Date", "").strip()
            emr_payment_date   = data_row.get("EMR Invoice Payment Date", "").strip()

            if not emr_invoice_number:
                return Res.error("E-10223", message="EMR Invoice Number is missing in the settlement CSV.")
            if not emr_invoice_date:
                return Res.error("E-10223", message="EMR Invoice Date is missing in the settlement CSV.")
            if not emr_payment_date:
                return Res.error("E-10223", message="EMR Invoice Payment Date is missing in the settlement CSV.")

            # Suspension flag validation
            suspension_flag = data_row.get("Capacity Payment Suspension Flag", "").strip()
            if suspension_flag and suspension_flag not in ("T", "F"):
                return Res.error("E-10227", message="Invalid Capacity Payment Suspension Flag. Allowed values are T or F.")

            # Invoice number matching — primary: invoice number, fallback: invoice date
            pdf_invoice_number = invoice.invoice_number
            if pdf_invoice_number and emr_invoice_number != str(pdf_invoice_number).strip():
                # Fallback: check invoice date match
                try:
                    csv_invoice_date = datetime.strptime(emr_invoice_date, "%Y%m%d").date()
                    if invoice.invoice_date and csv_invoice_date != invoice.invoice_date:
                        return Res.error("E-10226", message="Settlement CSV date does not match the uploaded invoice PDF date. Please upload the settlement file for the same invoice.")
                except ValueError:
                    return Res.error("E-10226", message="Settlement CSV date  does not match the uploaded invoice PDF date. Please upload the settlement file for the same invoice.")

            # Parse dates (YYYYMMDD → date)
            try:
                extracted_invoice_date = datetime.strptime(emr_invoice_date, "%Y%m%d").date()
            except ValueError:
                return Res.error("E-10225", message="invoice date format could not be read. Please upload a valid settlement CSV.")

            try:
                invoice_payment_date = datetime.strptime(emr_payment_date, "%Y%m%d").date()
            except ValueError:
                return Res.error("E-10227", message="Invoice payment date format could not be read. Please upload a valid settlement CSV.")

            # Store file
            stored_name = filename
            FileStorageManager.upload_file(file_bytes, stored_name, UPLOAD_PATHS["SETTLEMENT_PATH"], is_encrypted=False)

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
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.ASSET_MANAGEMENT_AMD.value,
                action=AuditLogScenario.SETTLEMENT_FILE_UPLOADED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Settlement CSV": "Not Uploaded",
                    "View Invoice Analysis CTA": "Disabled"
                    },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{month}-{year}",
                    "Settlement CSV": filename,
                    "File Size": len(file_bytes),
                    "Upload Status": "Successful"
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )
            await db.commit()

            return Res.success(
                "S-10089",
                data={
                    "id":                       settlement_id,
                    "settlement_file_name":     settlement_name,
                    "settlement_file_size":     len(file_bytes),
                    "extracted_invoice_number": emr_invoice_number,
                    "extracted_invoice_date":   extracted_invoice_date.strftime("%d %b %Y"),
                    "invoice_payment_date":     invoice_payment_date.strftime("%d %b %Y"),
                    "uploaded_on":              settlement.uploaded_on.isoformat(),
                    "month":                    month,
                    "year":                     year,
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
                    "id":                       r.id,
                    "settlement_file_name":     r.file_name,
                    "settlement_file_size":     r.file_size,
                    "extracted_invoice_number": r.extracted_invoice_number,
                    "extracted_invoice_date":   r.extracted_invoice_date.strftime("%d %b %Y") if r.extracted_invoice_date else None,
                    "invoice_payment_date":     r.invoice_payment_date.strftime("%d %b %Y") if r.invoice_payment_date else None,
                    "uploaded_on":              r.uploaded_on.isoformat() if r.uploaded_on else None,
                    "month":                    r.month,
                    "year":                     r.year,
                }
                for r in records
            ]

            return Res.success(
                "S-10091",
                data={
                    "total_files":  len(settlements),
                    "settlement":   settlements,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def delete_settlement(
        self,
        db: AsyncSession,
        asset_id: int,
        settlement_id: int,
        current_user: dict,
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

            file_name     = record.file_name
            settlement_sid = record.settlement_id
            settlement_id = record.id

            asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
            asset = asset_result.scalar_one_or_none()
            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.ASSET_MANAGEMENT_AMD.value,
                action=AuditLogScenario.SETTLEMENT_FILE_DELETED.value,
                before={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Settlement CSV": file_name,
                    "Upload History": "Available",
                    "View Invoice Analysis CTA": "Enabled"
                },
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Month": f"{record.month}-{record.year}",
                    "Settlement CSV": "Removed",
                    "Upload History": "Removed",
                    "View Invoice Analysis CTA": "Disabled"
                },
                resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
            )

            record.is_deleted = True
            await db.commit()

            return Res.success(
                "S-10090",
                data={
                    "invoice_settlement_id": settlement_id,
                    "asset_id":              asset_id,
                    "message":              "Settlement CSV deleted successfully.",
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    async def export_settlement(
        self,
        db: AsyncSession,
        asset_id: int,
        settlement_id: int,
        current_user: dict,
    ):
        query = await db.execute(
            select(Settlement).where(
                Settlement.id == settlement_id,
                Settlement.asset_id == asset_id,  
                Settlement.is_deleted.is_(False)
            )
        )
        

        settlement = query.scalars().first()

        if not settlement:
            return Res.error("E-10228", http_status_code=404)
        
        asset_result = await db.execute(select(Asset).where(Asset.id == asset_id))
        asset = asset_result.scalar_one_or_none()
        if not asset:
            return Res.error("E-10034", message="Asset not found.")
        if asset.type == AssetType.SOLAR.value:
            return Res.error("E-10120")
        
        await audit_logs(
            db=db,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.ASSET_MANAGEMENT_AMD.value,
            action=AuditLogScenario.SETTLEMENT_FILE_DOWNLOADED.value,
            before={
                "Asset ID": asset.asset_id,
                "Asset Name": asset.name,
                "Month": f"{settlement.month}-{settlement.year}",
                "Settlement CSV": settlement.file_name,
                "Download Status": "Not Started",
            },
            after={
                "Action": "Settlement CSV downloaded by user"
            },
            resource_id=f"AM-{asset.id}_(Asset ID: {asset.asset_id})",
        )

        await db.commit()

        file_obj, content_type = FileStorageManager.get_file_object(
            settlement.file_key,
            storage_type=settlement.storage_server
        )

        return StreamingResponse(
                BytesIO(file_obj),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{settlement.file_name}"'
                }
            )

    async def get_capacity_market_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        month: int | None = None,
        current_user: dict = None,
    ):
        try:
            # ── Fetch Asset ──────────────────────────────────────────────────────────
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            # ── Check if Solar Asset ────────────────────────────────────────────────
            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10120",
                    message="Capacity Market analysis is not applicable for Solar assets."
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
                return Res.success(
                    "S-10093",
                    data={
                        "asset_id": asset_id,
                        "asset_name": asset.name,
                        "year": year,
                        "month": month,
                        "has_data": False,
                        "message": "No invoice analysis data available"
                    }
                )

            total_absolute_amount = 0.0
            payment_trend_data = []
            cumulative_sum = 0.0
            capacity_market_payments = []

            for settlement, invoice in records:
                invoice_amount = invoice.invoice_amount if invoice.invoice_amount is not None else 0.0
                absolute_amount = abs(invoice_amount)

                total_absolute_amount += absolute_amount

                cumulative_sum += absolute_amount
                payment_trend_data.append({
                    "month": settlement.month,
                    "monthly_payment": round(absolute_amount, 2),
                    "cumulative_payment": round(cumulative_sum, 2),
                })

                capacity_market_payments.append({
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "capacity_year": settlement.year,
                    "capacity_month": settlement.month,
                    "invoice_date": invoice.invoice_date.strftime("%d %b %Y") if invoice.invoice_date else None,
                    "payment_date": settlement.invoice_payment_date.strftime("%d %b %Y") if settlement.invoice_payment_date else None,
                    "amount": invoice_amount,
                    "absolute_amount": round(absolute_amount, 2),
                })

            emr_invoices = len(records)
            capacity_payments = round(total_absolute_amount, 2)
            average_monthly_payment = round(capacity_payments / emr_invoices, 2) if emr_invoices > 0 else 0.0

            return Res.success(
                "S-10093",
                data={
                    "asset_id": asset_id,
                    "asset_name": asset.name,
                    "year": year,
                    "month": month,
                    "has_data": True,
                    "kpis": {
                        "capacity_payments": capacity_payments,
                        "emr_invoices": emr_invoices,
                        "average_monthly_payment": average_monthly_payment,
                    },
                    "payment_trend": payment_trend_data,
                    "capacity_market_payments": capacity_market_payments,
                }
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")
            
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
                return Res.error("E-10034", message="Asset not found")

            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10120",
                    message="Capacity Market analysis is not applicable for Solar assets."
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
                return Res.error("E-10234", message="No capacity market data available")

            output = StringIO()
            output.write("\ufeff")
            writer = csv.writer(output)

            writer.writerow([
                "Capacity Month",
                "Capacity Year",
                "Invoice ID",
                "Invoice Number",
                "Invoice Date",
                "Payment Date",
                "Amount (£)",
                "Absolute Amount (£)",
            ])

            for settlement, invoice in records:
                invoice_amount = invoice.invoice_amount if invoice.invoice_amount else 0.0
                writer.writerow([
                    settlement.month,
                    settlement.year,
                    invoice.id, 
                    invoice.invoice_number,
                    invoice.invoice_date.strftime("%d %b %Y") if invoice.invoice_date else "",
                    settlement.invoice_payment_date.strftime("%d %b %Y") if settlement.invoice_payment_date else "",
                    f"{invoice_amount:.2f}",
                    f"{abs(invoice_amount):.2f}",
                ])

            output.seek(0)

            safe_asset_name = re.sub(r"[^A-Za-z0-9_-]", "_", asset.name)
            filename = f"capacity_market_payments_{safe_asset_name}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode("utf-8")),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")