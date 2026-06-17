from pydantic import BaseModel, Field, field_validator
from typing import List
from typing import Optional
from constants.enums import DigestScope, DigestFrequency, DigestResource
from constants.enums import DigestScope, DigestFrequency

class DigestCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    scope: int 
    frequency: DigestFrequency
    time: str
    weekday: Optional[int] = None
    day_of_month: Optional[int] = None
    recipients: List[int]
    resource_id: Optional[List[Optional[int]]] = None

class DigestUpdateRequest(DigestCreateRequest):
    status: int

class DigestResponse(BaseModel):
    digest_id: str
    name: str
    scope: DigestScope
    frequency: DigestFrequency
    time: str
    weekday: int = None
    day_of_month: int = None
    recipients: List[int]
    status: int
    resource: Optional[dict] = None

    class Config:
        from_attributes = True