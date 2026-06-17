from db.db_config import AMDBase
from python_common.models import AuditLogMixin

class AuditLog(AuditLogMixin, AMDBase):
    __tablename__ = "audit_logs"