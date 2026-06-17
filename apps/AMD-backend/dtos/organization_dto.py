from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: int
    org_id: str
    name: str
    status: bool
    created_at: datetime

    class Config:
        from_attributes = True