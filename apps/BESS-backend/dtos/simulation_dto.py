from datetime import datetime
from typing import Literal, List, Optional, Union, Any
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
    computed_field,
)
from constants.enums import (
    BessState,
    LoadPattern,
    BESSContainerSize,
    ProjectStatus,
    SimulationJobStatus,
    SimulationStatus,
    UserRole,
    DGRunScheduleMode,
    DGTriggerType,
    LoadServingPriority,
    SizingStrategy,
)


LOAD_MW_ERROR_MSG = "Load must be between 1.00 and 500.00 MW"
SAME_HOUR_ERROR_MSG = "Start and End hour cannot be the same"


def validate_load_mw(v: float) -> float:
    if v < 1 or v > 500:
        raise ValueError(LOAD_MW_ERROR_MSG)
    return v


class ConstantConfig(BaseModel):
    load_mw: float = Field(ge=1, le=500)

    @field_validator("load_mw")
    @classmethod
    def validate_load(cls, v: float) -> float:
        return validate_load_mw(v)


class DayNightConfig(BaseModel):
    load_mw: float = Field(ge=1, le=500)
    start_time: int = Field(ge=0, le=23)
    end_time: int = Field(ge=0, le=23)

    @field_validator("load_mw")
    @classmethod
    def validate_load(cls, v: float) -> float:
        return validate_load_mw(v)

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time == self.end_time:
            raise ValueError(SAME_HOUR_ERROR_MSG)
        return self


class SeasonalConfig(BaseModel):
    load_mw: float = Field(ge=1, le=500)
    start_time: int = Field(ge=0, le=23)
    end_time: int = Field(ge=0, le=23)
    start_month: int = Field(ge=1, le=12)
    end_month: int = Field(ge=1, le=12)

    @field_validator("load_mw")
    @classmethod
    def validate_load(cls, v: float) -> float:
        return validate_load_mw(v)

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time == self.end_time:
            raise ValueError(SAME_HOUR_ERROR_MSG)
        return self


class Window(BaseModel):
    start_time: int = Field(ge=0, le=23)
    end_time: int = Field(ge=0, le=23)
    load_mw: float = Field(ge=1, le=500)

    @field_validator("load_mw")
    @classmethod
    def validate_load(cls, v: float) -> float:
        return validate_load_mw(v)

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time == self.end_time:
            raise ValueError(SAME_HOUR_ERROR_MSG)
        return self


class CustomConfig(BaseModel):
    windows: List[Window]


class ConstantPayload(BaseModel):
    pattern: Literal[LoadPattern.CONSTANT_LOAD]
    config: ConstantConfig


class DayNightPayload(BaseModel):
    pattern: Literal[LoadPattern.DAY_ONLY_LOAD, LoadPattern.NIGHT_ONLY_LOAD]
    config: DayNightConfig


class SeasonalPayload(BaseModel):
    pattern: Literal[LoadPattern.SEASONAL_LOAD]
    config: SeasonalConfig


class CustomPayload(BaseModel):
    pattern: Literal[LoadPattern.CUSTOM_WINDOW_LOAD]
    config: CustomConfig


LoadProfilePayload = Union[
    ConstantPayload, DayNightPayload, SeasonalPayload, CustomPayload
]

Configs = Union[ConstantConfig, DayNightConfig, SeasonalConfig, CustomConfig]


CONFIG_MAP = {
    LoadPattern.CONSTANT_LOAD: ConstantConfig,
    LoadPattern.DAY_ONLY_LOAD: DayNightConfig,
    LoadPattern.NIGHT_ONLY_LOAD: DayNightConfig,
    LoadPattern.SEASONAL_LOAD: SeasonalConfig,
    LoadPattern.CUSTOM_WINDOW_LOAD: CustomConfig,
}


class PatternInfo(BaseModel):
    id: LoadPattern
    label: str


class DataPoint(BaseModel):
    hour: int = Field(ge=0, le=23)
    value: float


class LoadProfileOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    peak_load: float
    total_hours: int
    total_energy: float
    hour_percentage: float = Field(ge=0, le=100)
    data_points: Optional[List[DataPoint]] = None
    graph_data_points: list[float] = Field(exclude=True)

    @model_validator(mode="after")
    def _get_data_points(self, hours_a_day: int = 24) -> "LoadProfileOutput":
        self.data_points = [
            DataPoint(hour=i, value=round(self.graph_data_points[i], 2))
            for i in range(hours_a_day)
        ]
        return self


class LoadProfileResponse(BaseModel):
    id: Optional[int] = None
    pattern: PatternInfo
    config: Configs
    output: LoadProfileOutput
    total_hours: int

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def _map_from_db(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            # Intercept SQLAlchemy object and map to DTO schema
            pattern_enum = LoadPattern(data.pattern)
            config_class = CONFIG_MAP.get(pattern_enum)

            return {
                "id": data.id,
                "pattern": PatternInfo(id=pattern_enum, label=pattern_enum.name),
                "config": config_class(**data.config) if config_class else None,
                "output": LoadProfileOutput.model_validate(data),
                "total_hours": data.total_hours,
            }
        return data


class BaseBessConfig(BaseModel):
    bess_efficiency: float = Field(ge=70, le=95)
    bess_min_soc: float = Field(ge=0, le=50)
    bess_max_soc: float = Field(ge=50, le=100)
    bess_initial_soc: float = Field(ge=0, le=100)
    bess_daily_cycle_limit: float = Field(ge=0.5, le=3.0)


class BessConfigPayload(BaseBessConfig):
    containers: List[BESSContainerSize]


class ContainerSizeInfo(BaseModel):
    id: BESSContainerSize
    label: str


class ContainerConfigResponse(BaseBessConfig):
    id: int
    simulation_id: int
    containers: Optional[List[ContainerSizeInfo]] = None
    container_types: list[int] = Field(exclude=True)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _map_to_response(self) -> "ContainerConfigResponse":
        """
        Maps a BESSContainerConfiguration model instance to a ContainerConfigResponse DTO.
        """
        labels = {
            BESSContainerSize.SIZE_5MWH_0_5C: "5 MWh / 2.5 MW (2-hour, 0.5C)",
            BESSContainerSize.SIZE_5MWH_0_25C: "5 MWh / 1.25 MW (4-hour, 0.25C)",
        }

        self.containers = [
            ContainerSizeInfo(
                id=BESSContainerSize(size_id),
                label=labels.get(BESSContainerSize(size_id), f"Size {size_id}"),
            )
            for size_id in self.container_types
        ]

        return self


class ProjectAssignment(BaseModel):
    user_id: int
    role: UserRole


class ProjectCreate(BaseModel):
    name: str
    description: str
    responsible_user_id: int
    status: ProjectStatus
    assigned_users: List[ProjectAssignment]


class FuelCoefficients(BaseModel):
    no_load_coeff: float = Field(..., ge=0.01, le=0.10, description="F0 (L/hr/kW)")
    load_coeff: float = Field(..., ge=0.15, le=0.35, description="F1 (L/kWh)")


class DGFuelCurvePoint(BaseModel):
    load_percentage: int
    output_mw: float
    fuel_rate_l_hr: int
    specific_fuel_rate_l_kwh: float


class DGConfigPayload(BaseModel):
    is_included: bool
    is_binary: bool = False
    min_stable_load: Optional[float] = Field(None, ge=10, le=100)
    fuel_price: Optional[float] = Field(None, ge=0.50, le=5.00)
    advanced_fuel_curve: bool = False
    flat_fuel_rate: Optional[float] = Field(None, ge=0.15, le=0.40)
    no_load_coeff: Optional[float] = Field(None, ge=0.01, le=0.10)
    load_coeff: Optional[float] = Field(None, ge=0.15, le=0.35)


class DGConfigResponse(DGConfigPayload):
    model_config = ConfigDict(from_attributes=True)
    id: int
    simulation_id: int
    created_at: datetime
    updated_at: datetime


class DispatchRulePayload(BaseModel):
    dg_run_schedule_mode: DGRunScheduleMode
    dg_start_time: Optional[int] = Field(None, ge=0, le=23)
    dg_end_time: Optional[int] = Field(None, ge=0, le=23)
    dg_trigger_type: Optional[DGTriggerType] = None
    dg_soc_on_threshold: Optional[int] = Field(None, ge=0, le=100)
    dg_soc_off_threshold: Optional[int] = Field(None, ge=0, le=100)
    is_dg_charging_bess: Optional[bool] = None
    load_serving_priority: Optional[LoadServingPriority] = None
    is_dg_takeover_full_load: Optional[bool] = None
    is_cycle_charging_enabled: Optional[bool] = None
    min_load: Optional[int] = Field(None, ge=50, le=90)
    stop_soc: Optional[int] = Field(None, ge=0, le=100)


class DispatchRuleResponse(DispatchRulePayload):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_id: int
    created_at: datetime
    updated_at: datetime


class BessDgSizingPayload(BaseModel):
    bess_min: int
    bess_max: int
    dg_min: Optional[int] = None
    dg_max: Optional[int] = None
    dg_step_size: Optional[int] = None


class BessDgSizingResponse(BessDgSizingPayload):
    model_config = ConfigDict(from_attributes=True)
    id: int
    simulation_id: int
    created_at: datetime
    updated_at: datetime


class BaseSimulationProgress(BaseModel):
    simulation_job_id: int
    status: SimulationJobStatus


class SimulationProgress(BaseSimulationProgress):
    current_config: int
    total_config: int
    progress_percentage: float = Field(..., ge=0, le=100)


class SimulationResult(BaseModel):
    bess_mwh: int
    duration_hr: int
    power_mw: float
    containers: int
    dg_mw: int

    delivery_percentage: float = Field(..., ge=0, le=100)
    green_percentage: float = Field(..., ge=0, le=100)
    wastage_percentage: float = Field(..., ge=0, le=100)

    delivery_hrs: float
    load_hrs: float
    green_hrs: float
    dg_hrs: float = 0

    dg_starts: int = 0
    bess_cycles: float
    unserved_mwh: float = 0
    fuel_l: float = 0

    @field_validator(
        "delivery_percentage",
        "green_percentage",
        "wastage_percentage",
        "bess_cycles",
        "unserved_mwh",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 2)


class MonthlyDataPoint(BaseModel):
    month: int = Field(ge=1, le=12)
    value: float


class SolarSourceInfo(BaseModel):
    id: int
    name: str
    year: int


class SolarConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source: SolarSourceInfo
    total_generation: float
    peak_generation: float
    avg_generation: float
    generation_hours: float
    max_storable: float
    max_available: float
    hours_at_max: float
    excess_hours: float
    total_storable: float
    # hourly_generation_graph_points: Optional[List[DataPoint]] = None
    # monthly_generation_graph_points: Optional[List[MonthlyDataPoint]] = None
    # storable_solar_graph_points: Optional[List[Dict[str, Any]]] = None

    @model_validator(mode="before")
    @classmethod
    def _map_from_db(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {
                "id": data.id,
                "source": {
                    "id": data.source.id,
                    "name": data.source.name,
                    "year": data.source.year,
                },
                "total_generation": round(data.total_generation, 2),
                "peak_generation": round(data.peak_generation, 2),
                "avg_generation": data.avg_generation,
                "generation_hours": data.generation_hours,
                "max_storable": data.max_storable,
                "max_available": data.max_available,
                "hours_at_max": data.hours_at_max or 0.0,
                "excess_hours": data.excess_hours,
                "total_storable": data.total_storable,
            }
        return data


class SizingSimulationResponse(BaseModel):
    simulation_id: int
    results: List[SimulationResult]
    total_configs: int
    total_pages: int
    current_page: int
    next_page: Optional[int] = None


class CustomSimulationConfigPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    simulation_id: Optional[int] = None
    duration_class: BESSContainerSize
    bess_capacity: int = Field(ge=5, le=1000)
    dg_capacity: Optional[int] = Field(ge=0, le=200, default=None)
    created_at: Optional[datetime] = None


class HourlyResult(BaseModel):
    id: int
    simulation_id: int
    timestamp: datetime
    hour: int = 0
    day: int = 0
    hour_of_day: int = 0
    load_mw: float = 0
    solar_mw: float = 0.0
    solar_to_load: float = 0.0
    solar_to_bess: float = 0.0
    bess_to_load: float = 0.0
    bess_power_mw: float = 0.0
    bess_state: BessState = BessState.IDLE
    dg_output_mw: float = 0.0
    is_dg_running: bool = False
    dg_to_load: float = 0.0
    dg_to_bess: float = 0.0
    dg_curtailed: float = 0.0
    soc_mwh: float = 0.0
    soc_percent: float = 0.0
    unmet_mw: float = 0.0
    delivery: bool = False
    solar_curtailed: float = 0.0
    daily_cycles: float = 0.0
    green_energy_to_load_mwh: float = 0.0
    charging_loss: float = 0.0
    discharging_loss: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SingleSimResultResponse(BaseModel):
    id: int
    job_id: int
    simulation_id: int
    bess_mwh: int
    duration_hr: int
    power_mw: float
    containers: int
    dg_mw: int

    delivery_percentage: float = Field(
        ..., ge=0, le=100, validation_alias="delivery_pct"
    )
    green_percentage: float = Field(..., ge=0, le=100, validation_alias="green_pct")
    wastage_percentage: float = Field(..., ge=0, le=100, validation_alias="wastage_pct")

    delivery_hrs: float = Field(validation_alias="delivery_hours")
    load_hrs: float = Field(validation_alias="load_hours")
    green_hrs: float = Field(validation_alias="green_hours")
    dg_hrs: float = Field(default=0, validation_alias="dg_hours")

    dg_starts: int = 0
    bess_cycles: float
    unserved_mwh: float = 0
    fuel_l: float = Field(default=0, validation_alias="fuel_consumption_l")

    model_config = ConfigDict(
        from_attributes=True, populate_by_name=True, extra="ignore"
    )

    @field_validator(
        "delivery_percentage",
        "green_percentage",
        "wastage_percentage",
        "bess_cycles",
        "unserved_mwh",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 2)


class SimulationResponse(BaseModel):
    simulation_id: int
    year: int
    results: List[HourlyResult]
    total_configs: int
    total_pages: int
    current_page: int
    next_page: Optional[int] = None


class MonthlySimulationMetrics(BaseModel):
    model_config = ConfigDict(
        from_attributes=True, populate_by_name=True, extra="ignore"
    )

    simulation_id: int
    job_id: int
    month: str
    load_met_pct: float
    green_energy_pct: float
    wastage_energy_pct: float
    hours_fully_served: int
    total_load_hours: int
    generator_hours: int
    green_energy_to_load_mwh: float
    dg_to_load_mwh: float
    curtailed_mwh: float
    month_int: int
    year_int: int

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        "load_met_pct",
        "green_energy_pct",
        "wastage_energy_pct",
        "green_energy_to_load_mwh",
        "dg_to_load_mwh",
        "curtailed_mwh",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 1)


class MonthlySimulationResponse(BaseModel):
    simulation_id: int
    year: int
    result: list[MonthlySimulationMetrics]


class HourlyChartDataPoint(BaseModel):
    timestamp: datetime
    solar: float = Field(validation_alias="solar_mw")
    dg_output: float = Field(validation_alias="dg_output_mw")
    bess_power: float = Field(validation_alias="bess_power_mw")
    soc_pct: float = Field(validation_alias="soc_percent")
    delivery_mwh: float
    bess_energy: float = Field(validation_alias="soc_mwh")
    load: float = Field(validation_alias="load_mw")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def calculate_delivery(cls, data: Any) -> Any:
        if not isinstance(data, dict) and hasattr(data, "solar_to_load"):
            # Calculate delivery_mwh as sum of energy sources to load
            data.delivery_mwh = round(
                (data.solar_to_load or 0)
                + (data.bess_to_load or 0)
                + (data.dg_to_load or 0),
                3,
            )
        elif isinstance(data, dict) and "solar_to_load" in data:
            data["delivery_mwh"] = round(
                (data.get("solar_to_load") or 0)
                + (data.get("bess_to_load") or 0)
                + (data.get("dg_to_load") or 0),
                3,
            )
        return data


class SimulationHourlyChartResponse(BaseModel):
    simulation_id: int
    hourly_data: List[HourlyChartDataPoint]
    curtailed_mwh: float
    curtailed_pct: float = Field(validation_alias="curtailed_percentage")
    avg_soc_pct: float = Field(validation_alias="avg_soc_percentage")
    total_delivery_hours: int
    total_dg_hours: int
    dg_on_pct: Optional[float]
    dg_off_pct: Optional[float]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CapacityMetric(BaseModel):
    mwh: float
    mw: float
    bol_pct: float

    @field_validator(
        "mwh",
        "mw",
        "bol_pct",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 1)


class CapacityBreakdown(BaseModel):
    year_1_bol: CapacityMetric
    year_5: CapacityMetric
    year_10: CapacityMetric
    year_20: CapacityMetric


class MultiYearOutput(BaseModel):
    nameplate_size_mwh: float
    power_mw: float
    containers: int
    sizing_margin_pct: float
    capacity_breakdown: Optional[CapacityBreakdown] = None

    @field_validator(
        "nameplate_size_mwh",
        "power_mw",
        "sizing_margin_pct",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 1)


class MultiYearCalculation(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    factory_degradation: float
    annual_degradation: float
    sizing_strategy: SizingStrategy
    output: Optional[MultiYearOutput] = None


class MultiYearBessSizing(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bess_capacity: int
    duration_class: int

    @computed_field
    @property
    def bess_power(self) -> float:
        """Maximum SOC in MWh"""
        return self.bess_capacity / (self.duration_class * 2)


class MultiYearDgSizing(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    is_included: bool
    size: float = Field(validation_alias="dg_capacity")


class MultiYearConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    load: LoadProfileResponse
    solar: SolarConfigResponse
    bess: MultiYearBessSizing
    dg: MultiYearDgSizing


class MultiYearSizingCalculation(MultiYearCalculation):
    config: MultiYearConfig

    @model_validator(mode="before")
    @classmethod
    def _map_from_db(cls, data: Any) -> Any:
        if isinstance(data, dict) and "simulation" in data:
            sim = data.pop("simulation")
            data.update(
                {
                    "id": sim.id,
                    "name": sim.name,
                    "progress": sim.step,
                    "status": sim.status,
                    "last_updated": sim.updated_at,
                    "project_id": sim.project_id,
                    "config": {
                        "load": sim.load_profile,
                        "solar": sim.solar_profile_config,
                        "bess": sim.custom_simulation_config,
                        "dg": sim.custom_simulation_config,
                    },
                }
            )
            return data

        if not isinstance(data, dict):
            return {
                "id": data.id,
                "name": data.name,
                "progress": data.step,
                "status": data.status,
                "last_updated": data.updated_at,
                "project_id": data.project_id,
                "config": {
                    "load": data.load_profile,
                    "solar": data.solar_profile_config,
                    "bess": data.custom_simulation_config,
                    "dg": data.custom_simulation_config,
                },
            }
        return data

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        exclude = kwargs.get("exclude") or {}
        if isinstance(exclude, dict):
            exclude.setdefault(
                "config",
                {
                    "load": {"output": True},
                    "bess": {"containers": True},
                },
            )
            kwargs["exclude"] = exclude

        return super().model_dump(**kwargs)


class MultiYearSimulationProgress(BaseModel):
    simulation_job_id: int
    status: SimulationJobStatus


class MultiYearProjectionResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_id: int
    job_id: int
    year: int
    bess_mwh: float
    capacity_percent: float
    delivery_hours: float
    load_hours: float
    delivery_pct: float
    dg_hours: float
    green_energy_to_load_mwh: float
    solar_hrs: int
    bess_hrs: float
    wastage_mw: float
    wastage_pct: float
    load_solar_wastage_pct: float
    bess_loss_mwh: float
    solar_generation: float
    dg_generation: float
    solar_to_load: float
    bess_to_load: float
    dg_to_load: float
    dg_curtailed: float
    energy_to_load: float
    delivery_met_mwh: float
    charging_loss: float
    discharging_loss: float
    degradation_loss: float
    final_soc_pct: float
    unserved_mwh: float
    solar_gen_during_load: float
    solar_curtailed_during_load: float
    solar_curtailed: float
    created_at: datetime


class EnergyInMetrics(BaseModel):
    solar_avg: float
    solar_total: float
    dg_avg: float
    dg_total: float
    initial_capacity: float
    initial_bess_soc: float
    initial_bess_energy: float
    total_bess_energy: float
    total_energy: float


class EnergyOutMetrics(BaseModel):
    total_solar_to_load: float
    total_bess_to_load: float
    total_dg_to_load: float
    total_energy_to_load: float
    solar_curtailed_pct: float
    solar_curtailed_mwh: float
    dg_curtailed_pct: float
    dg_curtailed_mwh: float
    charging_loss_mwh: float
    discharging_loss_mwh: float
    degradation_loss_mwh: float
    cycle_loss: float
    final_bess_soc: float
    final_bess_energy: float
    total_bess_energy: float
    total_energy: float

    @field_validator(
        "degradation_loss_mwh",
        mode="before",
    )
    @classmethod
    def round_to_two(cls, v):
        return round(float(v), 2)


class MultiYearSummary(BaseModel):
    no_of_years: int
    balance: float
    energy_in: EnergyInMetrics
    energy_out: EnergyOutMetrics


class MultiYearProjectionResponse(BaseModel):
    simulation_id: int
    summary: Optional[MultiYearSummary]
    results: List[MultiYearProjectionResult]


class GreenEnergyConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    solar_min: int = Field(ge=10, le=500)
    solar_max: int = Field(ge=10, le=500)
    solar_step: int = Field(ge=5, le=50)
    bess_min: int = Field(ge=5, le=500)
    bess_max: int = Field(ge=5, le=1000)
    dg_min: int = Field(ge=0, le=200)
    dg_max: int = Field(ge=0, le=200)
    dg_step_size: int = Field(ge=5, le=25)
    min_green_energy: int = Field(ge=0, le=100)
    max_wastage: Optional[int] = Field(
        None,
        ge=0,
        le=100,
    )


class GreenEnergyConfigResponse(GreenEnergyConfig):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_id: int
    created_at: datetime
    updated_at: datetime


class SimulationConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    load: Optional[LoadProfileResponse] = None
    solar: Optional[SolarConfigResponse] = None
    bess: Optional[ContainerConfigResponse] = None
    dg: Optional[DGConfigResponse] = None
    dispatch: Optional[DispatchRuleResponse] = None
    bess_dg_sizing: Optional[BessDgSizingResponse] = None
    green_energy_config: Optional[GreenEnergyConfig] = None


class SimulationDetails(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    progress: int
    edited_step: int
    status: SimulationStatus
    last_updated: datetime
    project_id: int
    config: SimulationConfig

    @model_validator(mode="before")
    @classmethod
    def _map_from_db(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return {
                "id": data.id,
                "name": data.name,
                "progress": data.step,
                "edited_step": data.edit_step,
                "status": data.status,
                "last_updated": data.updated_at,
                "project_id": data.project_id,
                "config": {
                    "load": data.load_profile,
                    "solar": data.solar_profile_config,
                    "bess": data.bess_config,
                    "dg": data.dg_config,
                    "dispatch": data.dispatch_config,
                    "bess_dg_sizing": data.bess_dg_sizing,
                    "green_energy_config": data.green_energy_config,
                },
            }
        return data

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        exclude = kwargs.get("exclude") or {}
        if isinstance(exclude, dict):
            exclude.setdefault(
                "config",
                {
                    "load": {"output": True},
                    "bess": {"containers": True},
                    "dg": {"created_at": True, "updated_at": True},
                    "dispatch": {
                        "created_at": True,
                        "updated_at": True,
                    },
                    "bess_dg_sizing": {"created_at": True, "updated_at": True},
                },
            )
            kwargs["exclude"] = exclude

        return super().model_dump(**kwargs)


class GreenResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_id: int
    job_id: int
    solar_mwp: float
    bess_mwh: float
    duration_hr: float
    power_mw: float
    containers: int
    dg_mw: float
    delivery_pct: float
    green_pct: float
    green_energy_pct: float
    green_hours_mar_oct_pct: float
    wastage_pct: float
    delivery_hours: float
    load_hours: float
    green_hours: float
    dg_hours: float
    dg_starts: int
    bess_cycles: float
    unserved_mwh: float
    fuel_consumption_l: float
    created_at: datetime


class GreenResultResponse(BaseModel):
    simulation_id: int
    results: list[GreenResult]
    min_green_energy: int
    max_wastage: Optional[int]
    total_configs: int
    total_pages: int
    current_page: int
    next_page: Optional[int]


class DetailGreenConfigPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    duration_class: BESSContainerSize
    solar_peak: int = Field(ge=10, le=500)
    bess_capacity: int = Field(ge=5, le=1000)
    dg_capacity: int = Field(ge=0, le=200)


class DetailGreenResponse(DetailGreenConfigPayload):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulation_id: int
    created_at: datetime
    updated_at: datetime
