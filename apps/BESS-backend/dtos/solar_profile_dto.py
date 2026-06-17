"""DTOs for Solar Profile APIs."""

from typing import Literal
from pydantic import BaseModel, Field


SolarProfileSourceType = Literal["static", "file"]


class SolarProfileComputeRequest(BaseModel):
    type: SolarProfileSourceType = Field(..., alias="type")
    source_id: int

