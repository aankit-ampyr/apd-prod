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

        # ── Summary Statement Routes ────────────────────────────────────────────
        self.router.post("/summary-statement")(self.controller.upload_summary_statement)
        self.router.get("/summary-statement")(self.controller.list_summary_statements)
        self.router.delete("/summary-statement/{statement_id}")(self.controller.delete_summary_statement)
        self.router.get("/summary-statement/{statement_id}/export")(self.controller.download_summary_statement)


class InvoiceAnalysisRouter:

    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/assets/{asset_id}/invoice-analysis"
        self.tags = ["Invoice Analysis"]

        # reuse the controller passed in from PdfInvoiceRouter
        self.controller = InvoiceAnalysisController()

        # ── Capacity Market Routes ──────────────────────────────────────────────
        self.router.get("/capacity-market/export")(self.controller.export_capacity_market)

        # capacity market analysis route
        self.router.get("/capacity-market/summary")(self.controller.get_capacity_market_summary_analysis)
        self.router.get("/capacity-market/payments")(self.controller.get_capacity_market_payments)
        self.router.get("/capacity-market/payment-trend")(self.controller.get_capacity_market_payment_trend)

        # Revenue Reconciliation Routes
        self.router.get("/revenue-reconciliation/per-stream-comparison")(self.controller.get_per_stream_comparison)
        self.router.get("/revenue-reconciliation/summary")(self.controller.get_revenue_reconciliation_summary)
        self.router.get("/revenue-reconciliation/per-stream-comparison/export")(self.controller.export_revenue_reconciliation)
        