from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.hybrid import hybrid_property
from db.db_config import AMDBase as Base
from datetime import datetime, timezone
from sqlalchemy.orm import relationship


class PdfInvoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    @hybrid_property
    def invoice_id(self):
        if self.id is None:
            return None
        return f"INV-{self.id:04d}"  # INV-0001, INV-1001 — no truncation

    @invoice_id.expression
    def invoice_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(invoice_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat("INV-", func.lpad(cast(cls.id, String), target_len, "0"))

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True, index=True)

    month = Column(Integer, nullable=True, index=True)
    year = Column(Integer, nullable=True, index=True)

    invoice_file_name = Column(String, nullable=False)
    invoice_number = Column(String, nullable=True, index=True)    
    invoice_amount = Column(Float, nullable=True)
    type = Column(Integer, nullable=False, index=True)
    size = Column(Integer, nullable=False)
    invoice_date = Column(Date, nullable=True)
    capacity_payment_month = Column(Integer, nullable=True)
    capacity_payment_year = Column(Integer, nullable=True)
    uploaded_on = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    file_key = Column(String, nullable=False)
    storage_server = Column(String, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    asset = relationship(
        "Asset",
        back_populates="invoices"
    )

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)

    # settlement_id = Column(
    #     String,
    #     Computed("'SET-' || lpad(id::text, 4, '0')", persisted=True),
    #     index=True,
    #     unique=True
    # )

    @hybrid_property
    def settlement_id(self):
        if self.id is None:
            return None
        return f"SET-{self.id:04d}"  # SET-0001, SET-1001 — no truncation

    @settlement_id.expression
    def settlement_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(settlement_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat("SET-", func.lpad(cast(cls.id, String), target_len, "0"))

    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    month = Column(Integer, nullable=True, index=True)
    year = Column(Integer, nullable=True, index=True)
    file_name = Column(String, nullable=False)
    file_key = Column(String, nullable=False)
    storage_server = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    extracted_invoice_number = Column(String, nullable=False)
    extracted_invoice_date = Column(Date, nullable=False)
    invoice_payment_date = Column(Date, nullable=False)
    uploaded_on = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_deleted = Column(Boolean, default=False, nullable=False)
    is_deleted     = Column(Boolean, default=False, nullable=False)  # soft delete flag
