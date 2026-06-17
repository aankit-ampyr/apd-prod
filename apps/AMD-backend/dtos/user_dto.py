from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from constants.enums import UserRole
from typing import List

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    platform: List[int]
    organization: Optional[int] = None
    status: bool


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    platform: Optional[List[int]] = []
    status: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    user_id: str
    name: str
    email: EmailStr
    role: UserRole
    platform: List[int]
    organization: Optional[OrganizationResponse] = None
    status: bool
    last_activity: Optional[datetime] = None

    class Config:
        from_attributes = True

class AssignOrganization(BaseModel):
    organization_id: int