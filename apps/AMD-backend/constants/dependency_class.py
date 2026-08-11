from pydantic import BaseModel, RootModel
from typing import Any, Dict, List
from pandas import DataFrame

class MergedDataFrame(DataFrame):
    pass

class SolarOperationsDataFrame(DataFrame):
    pass

# TODO: implement trigger for this dependency to be loaded
class AssetUsableCapacity(float):
    pass

class TBSpreadBenchmark(float):
    pass

class OptimizedDataFrame(DataFrame):
    pass

class ActualStrategyDataFrame(DataFrame):
    pass

class ModoIndustryConfig(BaseModel):
    name: str
    low: float
    mid: float
    high: float

class YearlyMergedDataFrame(RootModel[Dict[int, Any]]):
    pass

class YearlyOptimizedDataFrame(RootModel[Dict[int, Any]]):
    pass

class IARDataFrame(BaseModel):
    date_objs: List[Any]
    master_dataframe: Any

class YearlyHardcodedMetricValues(RootModel[dict[int, dict[int, float]]]):
    pass

# TODO: implement trigger for this dependency to be loaded
class YearlyPdfInvoicesRecords(RootModel[dict[int, Any]]):
    pass

class YearlyInvoiceSettlementRecords(RootModel[dict[int, Any]]):
    pass

class YearlySummaryStatementRecords(RootModel[dict[int, Any]]):
    pass

class YearlySummaryStatementDataFrame(RootModel[dict[int, Any]]):
    pass