from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timezone


class AuditLogMixin:
    LOG_PREFIX: str = "LOG-"

    id = Column(Integer, primary_key=True, index=True)

    @hybrid_property
    def log_id(self):
        if self.id is None:
            return None
        return f"{self.LOG_PREFIX}{self.id:04d}"  # LOG-0001, LOG-1001 — no truncation

    @log_id.expression
    def log_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(log_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat(
            cls.LOG_PREFIX, func.lpad(cast(cls.id, String), target_len, "0")
        )

    user_id = Column(String, index=True)
    resource_id = Column(String, index=True, nullable=True)
    role = Column(Integer, index=True)
    module = Column(Integer, index=True)  # Stores the Integer ID from AuditLogModules
    action = Column(Integer, index=True)  # Stores the Integer ID from AuditLogScenario
    before = Column(Text, nullable=True)
    after = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

