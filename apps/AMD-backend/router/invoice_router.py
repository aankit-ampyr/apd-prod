from fastapi import APIRouter
from controller.invoice_analysis_controller import PdfInvoiceController, InvoiceAnalysisController


class PdfInvoiceRouter:

    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/assets/{asset_id}/invoices"
        self.tags = ["PDF Invoices"]

        self.controller = PdfInvoiceController()

        # Upload (single file, non-streaming)
        self.router.post("/")(self.controller.upload_pdf_invoice)

        # List with search / filter / pagination
        self.router.get("/")(self.controller.get_pdf_invoices)

        self.router.delete("/{invoice_id}")(self.controller.delete_pdf_invoice)

        self.router.get("/summary")(self.controller.get_invoice_summary)

        self.router.get("/{invoice_id}/preview")(self.controller.get_invoice_preview)
        self.router.get("/{invoice_id}/export")(self.controller.download_invoice)
        self.router.get("/export")(self.controller.export_invoice_list)

        # ── Settlement endpoints ──────────────────────────────────────────────
        self.router.post("/settlement")(self.controller.upload_settlement)
        self.router.get("/settlement")(self.controller.get_settlements)
        self.router.delete("/settlement/{settlement_id}")(self.controller.delete_settlement)
        self.router.get("/settlement/{settlement_id}/export")(self.controller.export_settlement)


class InvoiceAnalysisRouter:

    def __init__(self, pdf_invoice_controller: PdfInvoiceController):
        self.router = APIRouter()
        self.endpoint = "/assets/{asset_id}/invoice-analysis"
        self.tags = ["Invoice Analysis"]

        # reuse the controller passed in from PdfInvoiceRouter
        self.controller = InvoiceAnalysisController(pdf_invoice_controller)

        # ── Capacity Market Routes ──────────────────────────────────────────────
        self.router.get("/capacity-market")(self.controller.get_capacity_market_analysis)
        self.router.get("/capacity-market/export")(self.controller.export_capacity_market)