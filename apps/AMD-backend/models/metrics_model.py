from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func, Computed
from sqlalchemy.orm import relationship
from db.db_config import AMDBase
from datetime import datetime, timezone


class Metric(AMDBase):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(255), nullable=False) 
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    benchmark = relationship(
        "MetricIndustryConfiguration",
        back_populates="metric",
        uselist=False,
        cascade="all, delete-orphan"
    )

class MetricIndustryConfiguration(AMDBase):
    __tablename__ = "metric_industry_configurations"

    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(
        Integer,
        ForeignKey("metrics.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    industry_low = Column(Float, nullable=True)
    industry_mid = Column(Float, nullable=True)
    industry_high = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    metric = relationship("Metric", back_populates="benchmark")

class MonthlyHardcodedValue(AMDBase):
    __tablename__ = "monthly_hardcoded_values"

    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(
        Integer,
        ForeignKey("metrics.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    value = Column(Float, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)