from typing import List, Optional, Literal
from pydantic import BaseModel, Field, validator
import re
from constants.enums import AssetType


class ReassignAsset(BaseModel):
    organization_id: int

class AssetGenerateAnalytics(BaseModel):
    month: int | Literal['all']
    year: int | Literal['all']
    asset_id: int | Literal['all']
    dependencies: List[str]

class AssetCreate(BaseModel):
    name: str = Field(...)
    type: AssetType
    capacity: float
    location: str = Field(...)
    country_id: int
    organization_id: int

    @validator("type")
    def validate_type(cls, v):
        if v not in AssetType:
            raise ValueError("E-10061")
        return v

    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("E-10059")
        if len(v) < 2 or len(v) > 150:
            raise ValueError("E-10057")
        if not re.match(r"^[a-zA-Z0-9 ._()-]+$", v):
            raise ValueError("E-10058")
        return v.strip()

    @validator("capacity")
    def validate_capacity(cls, v):
        if round(v, 2) != v:
            raise ValueError("E-10065")
        return v

    @validator("location")
    def validate_location(cls, v):
        if not v:
            raise ValueError("E-10066")
        if len(v) < 2 or len(v) > 150:
            raise ValueError("E-10068")
        if not re.match(r"^[a-zA-Z0-9 ._,-]+$", v):
            raise ValueError("E-10067")
        return v


class AssetEdit(BaseModel):
    name: Optional[str] = None
    type: Optional[AssetType] = None
    capacity: Optional[float] = None
    location: Optional[str] = None
    country_id: Optional[int] = None
    organization_id: Optional[int] = None
    current_step: Optional[int] = None
    status: Optional[bool] = None
    active_month: Optional[int] = None
    active_year: Optional[int] = None
    active_invoice_month: Optional[int] = None
    active_invoice_year: Optional[int] = None

    @validator("type")
    def validate_type(cls, v):
        if v is not None:
            if v not in AssetType:
                raise ValueError("E-10061")
        return v

    @validator("name")
    def validate_name(cls, v):
        if v is not None:
            if not v or len(v.strip()) == 0:
                raise ValueError("E-10059")
            if len(v) < 2 or len(v) > 150:
                raise ValueError("E-10057")
            if not re.match(r"^[a-zA-Z0-9 ._()-]+$", v):
                raise ValueError("E-10058")
            return v.strip()
        return v

    @validator("capacity")
    def validate_capacity(cls, v):
        if v is not None:
            if v <= 0 or v >= 10000:
                raise ValueError("E-10064")
            if round(v, 2) != v:
                raise ValueError("E-10065")
        return v

    @validator("location")
    def validate_location(cls, v):
        if v is not None:
            if not v:
                raise ValueError("E-10066")
            if len(v) < 2 or len(v) > 150:
                raise ValueError("E-10068")
            if not re.match(r"^[a-zA-Z0-9 ._,-]+$", v):
                raise ValueError("E-10067")
        return v

    @validator("active_month")
    def validate_active_month(cls, v):
        if v is not None:
            if not (1 <= v <= 12):
                raise ValueError("E-10001")
        return v

    @validator("active_year")
    def validate_active_year(cls, v):
        if v is not None:
            if not (1900 <= v <= 2100):
                raise ValueError("E-10001")
        return v
    

class AssetOptimizationUpdate(BaseModel):
    max_charging_rate: float
    max_discharging_rate: float
    usable_capacity: float
    soc_min: int
    soc_max: int
    round_trip_efficiency: float
    max_daily_cycles: float

    @validator("max_charging_rate")
    def validate_charging(cls, v):
        if v <= 0: raise ValueError("E-10072")
        if not (0.01 <= v <= 1000): raise ValueError("E-10080")
        return v

    @validator("max_discharging_rate")
    def validate_discharging(cls, v):
        if v <= 0: raise ValueError("E-10072")
        if not (0.01 <= v <= 1000): raise ValueError("E-10081")
        return v

    @validator("usable_capacity")
    def validate_capacity(cls, v):
        if v <= 0: raise ValueError("E-10072")
        if not (0.01 <= v <= 10000): raise ValueError("E-10082")
        return v

    @validator("soc_min")
    def validate_soc_min(cls, v):
        if v <= 0: raise ValueError("E-10072")
        if not (0 <= v <= 100): raise ValueError("E-10074")
        return v

    @validator("soc_max")
    def validate_soc_max(cls, v, values):
        if v <= 0: raise ValueError("E-10072")
        if not (0 <= v <= 100): raise ValueError("E-10083")
        if "soc_min" in values and v <= values["soc_min"]:
            raise ValueError("E-10075")
        return v

    @validator("round_trip_efficiency")
    def validate_rte(cls, v):
        if v is None: raise ValueError("E-10072")
        if not (0 <= v <= 100): raise ValueError("E-10076")
        return v

    @validator("max_daily_cycles")
    def validate_cycles(cls, v, values):
        if v <= 0: raise ValueError("E-10072")
        if not (0 <= v <= 20): raise ValueError("E-10078")
        return v

class ActivateAssetPayload(BaseModel):
    status: bool

class GenerateMergeFile(BaseModel):
    aggregator_file_id: int
    scada_file_id: int

class GenerateOptmizedFile(BaseModel):
    merged_file_id: int