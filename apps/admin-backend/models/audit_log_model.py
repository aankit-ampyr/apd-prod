from db.db_config import BaseUser
from python_common.models import AuditLogMixin

class AuditLog(AuditLogMixin, BaseUser):
    __tablename__ = "audit_logs"