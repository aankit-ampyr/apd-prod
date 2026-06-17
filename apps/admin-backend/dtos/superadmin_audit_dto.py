from pydantic import BaseModel
from typing import List, Optional
from constants.enums import UserRole


class SuperAdminAuditLogResponse(BaseModel):
    log_id: int
    user_id: str
    role: UserRole
    module: str
    action: str
    before: Optional[str]
    after: Optional[str]
    created_at: str 

class SuperAdminAuditLogListResponse(BaseModel):
    logs: List[SuperAdminAuditLogResponse]
    next_page: Optional[int]
    total_pages: int
    current_page: int
    total_results: int