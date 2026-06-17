"""DTOs for Project Management API."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from constants.enums import ProjectStatus, UserRole


class ReassignProjectRequest(BaseModel):
    """Payload for PATCH /api/v1/projects/{project_id}/reassign"""

    user_id: int


class ProjectSearch(BaseModel):
    page: int = Field(default=1, gt=0)
    limit: int = Field(default=10, ge=-1, le=100)
    search: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectCreate(BaseModel):
    name: str
    description: str
    responsible_user_id: Optional[int] = None
    status: bool
    assigned_users: Optional[List[int]] = Field(default_factory=list)


class ProjectUserResponse(BaseModel):
    id: int
    name: str
    role: UserRole


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    responsible_user_id: Optional[int] = None
    status: Optional[bool] = None
    assigned_users: Optional[List[int]] = None


class ProjectResponse(BaseModel):
    id: int
    proj_id: str
    name: str
    description: Optional[str] = None
    owned_by: ProjectUserResponse
    created_by: ProjectUserResponse
    assigned_users: List[ProjectUserResponse]
    status: ProjectStatus
    created_date: datetime
    updated_date: datetime
