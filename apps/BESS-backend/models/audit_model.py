from db.db_config import BessBase
from python_common.models import AuditLogMixin


class AuditLog(AuditLogMixin, BessBase):
    __tablename__ = "audit_logs"
    LOG_PREFIX: str = "BESS-LOG-"
