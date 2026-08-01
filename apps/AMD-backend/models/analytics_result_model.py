from db.db_config import AMDBase as Base
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    text,
    DateTime,
    String,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone


class AssetAnalyticsValues(Base):
    __tablename__ = "analytics_computed_results"

    id = Column(Integer, primary_key=True, index=True, unique=True, nullable=False)

    asset_id = Column(
        Integer,
        ForeignKey("assets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    month = Column(
        Integer,
        nullable=True,
    )

    year = Column(
        Integer,
        index=True,
        nullable=False,
    )
    module = Column(
        String,
        index=True,
        nullable=False,
    )

    section = Column(
        String,
        index=True,
        nullable=False,
    )

    widget = Column(
        String,
        index=True,
        nullable=False,
    )

    parameters = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    parameters_hash = Column(
        String(64),
        nullable=False,
        index=True,
    )
    result = Column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )

    generated_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index(
            "uq_analytics_result",
            "asset_id",
            "month",
            "year",
            "module",
            "section",
            "widget",
            "parameters",
            unique=True,
            postgresql_nulls_not_distinct=True,
        ),
    )
