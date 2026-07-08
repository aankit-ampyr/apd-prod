from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Computed
from db.db_config import AMDBase as Base
from datetime import datetime, timezone
from constants.enums import AssetStatus, AssetSteps,AssetFileType
from sqlalchemy.orm import relationship

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    asset_id = Column(String, Computed(" 'AST-' || lpad(id::text, 3, '0')", persisted=True), index=True)
    name = Column(String)

    type = Column(Integer)  # 1 solar, 2 battery, 3 solar+battery
    capacity = Column(Float)

    organization_id = Column(Integer, ForeignKey("organizations.id"))
    country_id = Column(Integer)

    state = Column(String)

    status = Column(Integer, default=AssetStatus.DRAFT.value)
    current_step = Column(Integer, default=AssetSteps.BASIC_INFORMATION.value) 

    active_month = Column(Integer, index=True, nullable=True) # adding server default for backward compatiblity
    active_year = Column(Integer, index=True, nullable=True) # adding server default for backward compatiblity
    active_invoice_month = Column(Integer, nullable=True, index=True)
    active_invoice_year = Column(Integer, nullable=True, index=True)
    
    created_by = Column(Integer, nullable=True)
    submitted_by = Column(Integer, nullable=True)
    activated_by = Column(Integer, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    files = relationship(
        "AssetFile",
        back_populates="asset",
        cascade="all, delete-orphan"
    )
    invoices = relationship(
        'PdfInvoice',
        back_populates="asset",
        cascade="all, delete-orphan"
    )


class AssetOptimizationParameter(Base):
    __tablename__ = "asset_optimization_parameters"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), index=True, nullable=False, unique=True)
    
    max_charging_rate_mw = Column(Float, nullable=False)
    max_discharging_rate_mw = Column(Float, nullable=False)
    power_asymmetry_ratio = Column(Float, nullable=False) # (discharge / charge) * 100
    usable_capacity_mwh = Column(Float, nullable=False)
    soc_min_pct = Column(Integer, nullable=False)
    soc_max_pct = Column(Integer, nullable=False)
    round_trip_efficiency_pct = Column(Float, nullable=False)
    max_daily_cycles = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AssetFile(Base):
    __tablename__ = "asset_files"
    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    type = Column(Integer, nullable=False, default=AssetFileType.AGGREGATOR_REPORT.value) # 1: Aggregator Report, 2: SCADA
    name = Column(String, nullable=False)
    key = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    row = Column(Integer, nullable=True)
    projection_start_date = Column(DateTime(timezone=True), nullable=True)
    projection_end_date = Column(DateTime(timezone=True), nullable=True)

    is_active = Column(Boolean, default=False)
    storage_server = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.now)
    month = Column(Integer, nullable=True) 
    year = Column(Integer, nullable=True)

    asset = relationship(
        "Asset",
        back_populates="files"
    )
