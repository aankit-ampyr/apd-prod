from sqlalchemy import Column, Integer, String, Boolean, DateTime, Computed
from db.db_config import AMDBase as Base
from datetime import datetime, timezone


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, Computed(" 'ORG-' || lpad(id::text, 3, '0')",persisted=True), index=True)
    name = Column(String, unique=True, nullable=False)
    status = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

class UserOrganization(Base):
    __tablename__ = "user_organization"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    organization_id = Column(Integer, nullable=False)
    assigned_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )