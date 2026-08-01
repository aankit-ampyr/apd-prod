from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import ARRAY
from datetime import datetime, timezone
from python_common.constants.defaults import CONSTRAINT_NAMES


class UserMixin:
    """
    Shared User model mixin. Each backend should create its own User class:

    Example:
        from db.db_config import BaseUser
        from python_common.models import UserMixin

        class User(UserMixin, BaseUser):
            __tablename__ = "users"
    """

    id = Column(Integer, primary_key=True, index=True)
    @hybrid_property
    def user_id(self):
        if self.id is None:
            return None
        return f"USER-{self.id:04d}"  # USER-0001, USER-1001 — no truncation

    @user_id.expression
    def user_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(invoice_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat("USER-", func.lpad(cast(cls.id, String), target_len, "0"))
    
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)

    role = Column(Integer, nullable=False, index=True)

    platform = Column(ARRAY(Integer), index=True, nullable=False)

    organization = Column(Integer, nullable=True, index=True)

    status = Column(Boolean, default=True)
    meta_data = Column(JSONB, nullable=True, default=dict)

    last_activity = Column(DateTime(timezone=True), nullable=True)
    blocked_expiry = Column(DateTime(timezone=True), nullable=True)

    is_deleted = Column(Boolean, default=False)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    table_args = (
        Index(
            CONSTRAINT_NAMES.get("UNIQUE_USER_EMAIL_CONSTRAINT", "uq_users_email"),
            "email",
            unique=True,
            postgresql_where=text("is_deleted = false"),
        ),
        Index("ix_users_platform_gin", "platform", postgresql_using="gin"),
    )

    @property
    def is_active(self) -> bool:
        now = datetime.now(timezone.utc)

        not_blocked = (
            self.blocked_expiry is None or self.blocked_expiry <= now
        )

        return self.status and not_blocked

    __table_args__ = tuple(table_args)

