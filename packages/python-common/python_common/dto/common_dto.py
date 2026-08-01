import re
from typing import List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, ValidationInfo
from python_common.exceptions import EmptyEmailField, InvalidEmail


class Mail(BaseModel):
    subject: str
    html: str
    to: list[EmailStr]


class OTPRequestPayload(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str, info: ValidationInfo):
        if not v or v.strip() == "":
            raise EmptyEmailField(message="email field is empty")

        try:
            # We use a temporary model to leverage Pydantic's internal EmailStr logic
            class EmailModel(BaseModel):
                e: EmailStr

            EmailModel(e=v)
        except Exception:
            raise InvalidEmail(message="email format is invalid")

        return v


class OTPLoginPayload(OTPRequestPayload):
    otp: str

    @field_validator("otp", mode="before")
    @classmethod
    def validate_otp_format(cls, v: str, info: ValidationInfo):
        # 1. Check if empty (E-10040)
        if not v or v.strip() == "":
            raise ValueError("E-10040")

        # 2. Check if it's exactly 6 digits (E-10041)
        # We use regex to ensure it is exactly 6 integers
        if not re.fullmatch(r"^\d{6}$", v):
            raise ValueError("E-10041")

        return v


class RefreshTokenPayload(BaseModel):
    refresh_token: str


class Pagination(BaseModel):
    records: List[Any] = []
    total_results: int
    total_pages: int
    current_page: int
    next_page: Optional[int] | None = None


class LogParams(BaseModel):
    user_id: str
    user_role: int
    module: int
    action: int
    before: Optional[Any] | None = None 
    after: Optional[Any] | None = None
    resource_id: Optional[str] | None = None
    db: Any


class AuditLogSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_id: str
    user_id: str
    resource_id: Optional[str]
    role: int
    module: int
    action: int
    before: Optional[str]
    after: Optional[str]
    created_at: datetime
