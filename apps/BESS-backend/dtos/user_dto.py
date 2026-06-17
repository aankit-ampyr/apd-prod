from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime
from typing import List
from pydantic.functional_serializers import field_serializer
from constants.enums import Platform, UserRole, Order


class UserBase(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    role: UserRole
    platform: List[Platform]
    status: bool = True
    last_activity: Optional[datetime] = None


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

    @field_serializer("last_activity")
    def serialize_date(self, value: Optional[datetime]):
        if value:
            # Formats to: "10-Mar-2026, 10:25 AM"
            return value.isoformat()
        return value


class UserSearch(BaseModel):
    page: int = Field(default=1, gt=0)
    limit: int = Field(default=10, ge=-1, le=100)
    search: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sort: Optional[Order] = None
