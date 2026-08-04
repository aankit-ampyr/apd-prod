from typing import Optional
from pydantic import BaseModel, validator
from typing import List
from datetime import datetime
from exceptions import PayloadValidation

class BenchmarkResponse(BaseModel):
    id: int
    metric_id: int
    metric_name: str
    industry_low: Optional[float]
    industry_mid: Optional[float]
    industry_high: Optional[float]
    is_active: bool
    updated_at: Optional[datetime]


class BenchmarkUpdatePayload(BaseModel):
    metric_id: int
    industry_low: Optional[float] = None
    industry_mid: Optional[float] = None
    industry_high: Optional[float] = None

BenchmarkUpdateRequest = List[BenchmarkUpdatePayload]


class MonthlyValueItem(BaseModel):
    metric_id: int
    metric_name: str
    month: int
    year: int
    value: float

class MonthlyValueUpdatePayload(BaseModel):
    metric_id: int
    month: int
    year: int
    value: float
    
MonthlyValueUpdateRequest = List[MonthlyValueUpdatePayload]

    # @validator("value")
    # def validate_metrics(cls, v, values):
    #     m_name = values.get("metric_name", "")
    #     # Numeric check already handled by float type
        
    #     # RTE Range Check (E-10203)
    #     if "Round-Trip Efficiency" in m_name:
    #         if not (80 <= v <= 90):
    #             raise ValueError("E-10203")
        
    #     # Negative check (E-10202) - Allowed only for Fixed Charges
    #     if "DUoS Fixed Charges" not in m_name and v < 0:
    #         raise ValueError("E-10202")
            
    #     # Integer check for specific metrics (E-10202)
    #     if any(x in m_name for x in ["Benchmark", "Fixed Charges", "Credit", "Capacity"]):
    #         if v != int(v):
    #             raise ValueError("E-10202")
    #     return v