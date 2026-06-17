from fastapi import APIRouter
from controller.audit_controller import AuditController

class AuditRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/audit-logs"
        self.controller = AuditController()
        self.tags = ["BESS Audit Logs"]

        self.router.get("/")(self.controller.get_audit_logs)