from fastapi import APIRouter
from controller.superadmin_audit_controller import SuperAdminAuditController

class SuperAdminAuditRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/audit-logs" 
        self.controller = SuperAdminAuditController()
        self.tags = ["Audit Logs"]

        self.router.get("/scenarios")(self.controller.get_scenarios)
        self.router.get("/")(self.controller.get_audit_logs)