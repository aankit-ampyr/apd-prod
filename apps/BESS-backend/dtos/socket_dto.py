from typing import Optional, Union, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from constants.enums import ResourceType, ActionType
from python_common.dto.common_dto import AuditLogSchema


class BaseEvent(BaseModel):
    resource_type: ResourceType


class ConfigDetails(BaseModel):
    bess_size_mwh: int
    duration_hr: int
    dg_size_mw: int


class GreenConfigDetails(ConfigDetails):
    solar_mwp: int


class SimulationDataBase(BaseModel):
    simulation_id: int
    user_name: str


class StartedData(SimulationDataBase):
    status: Literal["started"] = "started"
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProgressData(SimulationDataBase):
    status: Literal["running"] = "running"
    current_config: int
    total_config: int
    progress_percentage: float
    current_config_details: ConfigDetails | GreenConfigDetails


class CompletedData(SimulationDataBase):
    status: Literal["completed"] = "completed"
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_config: int
    message: str = "Simulation completed successfully"


class FailedData(SimulationDataBase):
    status: Literal["failed"] = "failed"
    error_code: str
    error_message: str
    failed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StoppedData(SimulationDataBase):
    status: Literal["stopped"] = "stopped"
    stopped_by: int
    stopped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = "Simulation stopped by user"


class MultiYearProgressData(SimulationDataBase):
    status: Literal["running"] = "running"
    current_config: int
    total_config: int
    progress_percentage: float
    year: int


class UpdateData(SimulationDataBase):
    status_code: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str


# Union type for easy parsing of any simulation data format
SimulationData = Union[
    StartedData,
    ProgressData,
    CompletedData,
    FailedData,
    StoppedData,
    MultiYearProgressData,
    UpdateData,
    dict,
]


class SocketEvent(BaseEvent):
    resource_id: Union[int, str]
    action_id: ActionType
    data: Optional[SimulationData] = None
    status: Optional[Literal["success", "error"]] = None
    status_code: Optional[str] = None


class SocketLogEvent(BaseEvent):
    data: AuditLogSchema
