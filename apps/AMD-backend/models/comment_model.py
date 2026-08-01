# ── models/comment_model.py ──

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, ARRAY
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import cast, func
from sqlalchemy.dialects.postgresql import JSONB
from db.db_config import AMDBase as Base
from datetime import datetime, timezone


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)

    @hybrid_property
    def comment_id(self):
        if self.id is None:
            return None
        return f"COM-{self.id:04d}"

    @comment_id.expression
    def comment_id(cls):
        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target = func.greatest(id_len, 4)
        return func.concat("COM-", func.lpad(cast(cls.id, String), target, "0"))

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    owner_id = Column(Integer, nullable=False, index=True)
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True, index=True)

    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)

    context_type = Column(Integer, nullable=False)
    context_module = Column(String, nullable=True)
    context_tab = Column(String, nullable=True)
    context_widget = Column(String, nullable=True)
    context_data_point = Column(JSONB, nullable=True)
    context_year = Column(Integer, nullable=True)
    context_month = Column(Integer, nullable=True)

    tagged_users = Column(ARRAY(Integer), nullable=True)

    is_read = Column(Boolean, default=False, nullable=False)
    read_by = Column(ARRAY(Integer), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=True)

    is_deleted = Column(Boolean, default=False, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    @hybrid_property
    def notification_id(self):
        if self.id is None:
            return None
        return f"NOT-{self.id:04d}"

    @notification_id.expression
    def notification_id(cls):
        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target = func.greatest(id_len, 4)
        return func.concat("NOT-", func.lpad(cast(cls.id, String), target, "0"))

    user_id = Column(Integer, nullable=False, index=True)

    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    meta = Column(JSONB, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False) 

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=True)