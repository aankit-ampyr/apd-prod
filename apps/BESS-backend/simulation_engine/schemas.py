from dataclasses import dataclass, field
from datetime import datetime, timezone
from pydantic import (
    BaseModel,
    Field,
    computed_field,
    model_validator,
    ConfigDict,
    BeforeValidator,
)
from typing import Annotated, Any
import math
import numpy as np

from constants.enums import (
    BessState,
    DGTriggerType,
    LoadServingPriority,
)


def to_numpy(v: Any) -> np.ndarray:
    if isinstance(v, np.ndarray):
        return v
    return np.array(v, dtype=float)


NumpyArray = Annotated[np.ndarray, BeforeValidator(to_numpy)]


class SimulationParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)

    duration_hr: float = Field(ge=0, default=0)
    load_priority: LoadServingPriority = LoadServingPriority.BESS_FIRST
    total_load_hours: int
    total_solar_generated: float

    # --- Profiles ---
    load_profile: NumpyArray = Field(description="Hourly load data in MW")
    solar_profile: NumpyArray = Field(description="Hourly solar generation in MW")
    dg_hours: NumpyArray = Field(description="Hourly DG availability")

    # --- BESS Parameters ---
    bess_capacity_mwh: float = Field(default=30.0, alias="bess_capacity")
    bess_efficiency_pct: float = Field(default=85.0, alias="bess_efficiency")
    bess_min_soc_pct: float = Field(default=10.0, alias="bess_min_soc")
    bess_max_soc_pct: float = Field(default=90.0, alias="bess_max_soc")
    bess_initial_soc_pct: float = Field(default=50.0, alias="bess_initial_soc")
    bess_daily_cycle_limit: float = Field(default=0.0)

    # --- DG (Diesel Generator) Parameters ---
    dg_enabled: bool = False
    dg_capacity_mw: float = Field(default=0.0, alias="dg_capacity")
    dg_charges_bess: bool = True
    dg_trigger_type: DGTriggerType = DGTriggerType.SOLAR_BATTERY_DEFICIT
    # dg_run_schedule_mode: DGRunScheduleMode = DGRunScheduleMode.DISABLED
    dg_operation_binary: bool = True
    dg_takeover_mode: bool = False
    min_stable_load_pct: float = Field(default=0.0)

    # --- SoC Thresholds ---
    dg_soc_on_threshold: int = 30
    dg_soc_off_threshold: int = 80
    emergency_soc_threshold: float = 15.0

    # --- Operational Flags ---
    allow_emergency_dg_day: bool = False
    allow_emergency_dg_night: bool = False

    # --- Fuel Model Parameters ---
    dg_fuel_curve_enabled: bool = False
    dg_fuel_f0: float = Field(default=0.03, description="L/hr per kW rated (no-load)")
    dg_fuel_f1: float = Field(
        default=0.22, description="L/kWh output (load coefficient)"
    )
    dg_fuel_flat_rate: float = Field(default=0.25, description="L/kWh flat rate")

    # --- Cycle Charging Parameters ---
    cycle_charging_enabled: bool = False
    cycle_charging_min_load_pct: float = 70.0
    cycle_charging_off_soc_pct: float = 80.0

    @computed_field
    @property
    def bess_power_mw(self) -> float:
        return self.bess_capacity_mwh / self.duration_hr

    # --- Computed Values ---
    @computed_field(
        description="Recalculated based on roundtrip efficiency: √(RTE ÷ 100)"
    )
    @property
    def charge_discharge_efficiency(self) -> float:
        """Combined efficiency for both charging and discharging"""
        return math.sqrt(self.bess_efficiency_pct / 100)

    @computed_field
    @property
    def bess_min_soc_mwh(self) -> float:
        """Minimum SOC in MWh"""
        return (self.bess_min_soc_pct / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def bess_max_soc_mwh(self) -> float:
        """Maximum SOC in MWh"""
        return (self.bess_max_soc_pct / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def cycle_charging_min_load_mwh(self) -> float:
        """Maximum SOC in MWh"""
        return (self.cycle_charging_min_load_pct / 100) * self.dg_capacity_mw

    @computed_field
    @property
    def cycle_charging_off_soc_mwh(self) -> float:
        """Maximum SOC in MWh"""
        return (self.cycle_charging_off_soc_pct / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def usable_cycle_range_mwh(self) -> float:
        """Maximum SOC in MWh"""
        return self.bess_max_soc_mwh - self.bess_min_soc_mwh

    @computed_field
    @property
    def bess_initial_soc_mwh(self) -> float:
        """Initial SOC in MWh"""
        return (self.bess_initial_soc_pct / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def dg_soc_on_mwh(self) -> float:
        """DG Start SOC threshold in MWh"""
        return (self.dg_soc_on_threshold / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def min_stable_load_mw(self) -> float:
        """DG Start SOC threshold in MWh"""
        return (self.min_stable_load_pct / 100) * self.dg_capacity_mw

    @computed_field
    @property
    def dg_soc_off_mwh(self) -> float:
        """DG Stop SOC threshold in MWh"""
        return (self.dg_soc_off_threshold / 100) * self.bess_capacity_mwh

    @computed_field
    @property
    def emergency_soc_mwh(self) -> float:
        """Emergency SOC threshold in MWh"""
        return (self.emergency_soc_threshold / 100) * self.bess_capacity_mwh

    # --- Logic Validations ---
    @model_validator(mode="after")
    def validate_thresholds(self) -> "SimulationParams":
        if self.dg_soc_on_threshold >= self.dg_soc_off_threshold:
            raise ValueError("DG SOC ON threshold must be lower than OFF threshold.")

        if self.emergency_soc_threshold < self.bess_min_soc_pct:
            # Note: Depending on logic, emergency might be higher or equal to min_soc
            pass

        return self


@dataclass
class SimulationState:
    current_day: int = 0
    daily_cycles: float = 0.0
    hourly_cycle: float = 0.0
    bess_dissabled: bool = True
    bess_used: bool = False
    bess_operation_day: int = 0
    current_soc: float = 0.0
    solar_in_bess: float = 0.0  # keep track of solar energy stored in bess
    total_bess_discharge_mwh: float = 0.0
    dg_generation: float = 0.0
    fuel_consumption_l: float = 0.0
    is_dg_running: bool = False
    dg_start_count: int = 0
    bess_to_load: int = 0
    dg_to_load: int = 0


class ScenarioResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bess_mwh: float = Field(default=0, ge=0)
    duration_hr: float = Field(default=0, ge=0)
    power_mw: float = Field(default=0, ge=0)

    containers: int = Field(default=0, ge=0)
    dg_mw: float = Field(default=0, ge=0)

    delivery_pct: float = Field(default=0, ge=0, le=100)
    green_pct: float = Field(default=0, ge=0, le=100)
    wastage_pct: float = Field(default=0, ge=0, le=100)

    delivery_hours: float = Field(default=0, ge=0)
    load_hours: float = Field(default=0, ge=0)
    green_hours: float = Field(default=0, ge=0)
    dg_hours: float = Field(default=0, ge=0)

    dg_starts: int = Field(default=0, ge=0)
    bess_cycles: float = Field(default=0, ge=0)

    unserved_mwh: float = Field(default=0, ge=0)
    fuel_consumption_l: float = Field(default=0, ge=0)
    dg_generation: float = Field(default=0, ge=0)
    solar_generation: float = Field(default=1, ge=0)

    # supporting Field
    wastage_mw: float = Field(default=0, ge=0, exclude=True)

    def finalize(self):
        """Perform final rounding and calculations before storage."""

        self.delivery_pct = (
            (round((self.delivery_hours / self.load_hours) * 100, 2))
            if self.load_hours > 0.001
            else 0
        )
        self.green_pct = (
            (round((self.green_hours / self.load_hours) * 100, 2))
            if self.load_hours > 0.001
            else 0
        )

        self.wastage_pct = (
            (
                round(
                    (self.wastage_mw / self.solar_generation) * 100,
                    2,
                )
            )
            if self.solar_generation > 0.001
            else 0
        )
        self.bess_cycles = round(self.bess_cycles, 1)
        self.unserved_mwh = round(self.unserved_mwh, 2)
        self.fuel_consumption_l = round(self.fuel_consumption_l, 0)

        return self


class CompleteScenarioResult(ScenarioResult):
    green_energy_to_load_mwh: float = Field(default=0, ge=0)

    solar_hrs: int = Field(default=0, ge=0)
    bess_hrs: float = Field(default=0, ge=0)

    load_solar_wastage_pct: float = Field(default=0, ge=0)
    bess_loss_mwh: float = Field(default=0, ge=0)

    solar_mw: float = Field(default=0, ge=0)
    solar_to_load: float = Field(default=0, ge=0)
    bess_to_load: float = Field(default=0, ge=0)
    dg_to_load: float = Field(default=0, ge=0)
    dg_curtailed: float = Field(default=0, ge=0)
    energy_to_load: float = Field(default=0, ge=0)
    delivery_met_mwh: float = Field(default=0, ge=0)

    charging_loss: float = Field(default=0, ge=0)
    discharging_loss: float = Field(default=0, ge=0)

    final_soc_pct: float = Field(default=0, ge=0)

    solar_gen_during_load: float = Field(default=0, ge=0)
    solar_curtailed_during_load: float = Field(default=0, ge=0)
    solar_curtailed: float = Field(default=0, ge=0)
    green_hours_mar_oct_pct: float = Field(default=0)
    green_energy_pct: float = Field(default=0)

    # Include wastage_mw in output for multi-year
    wastage_mw: float = Field(default=0, ge=0)
    load_hours_mar_oct: float = Field(default=0, exclude=True)
    green_hours_mar_oct: float = Field(default=0, exclude=True)

    def finalize(self):
        super().finalize()
        self.green_energy_to_load_mwh = round(self.green_energy_to_load_mwh, 2)
        self.dg_to_load = round(self.dg_to_load, 2)
        self.bess_loss_mwh = round(self.bess_loss_mwh, 2)
        self.energy_to_load = round(self.energy_to_load, 2)
        self.delivery_met_mwh = round(self.delivery_met_mwh, 2)
        self.solar_curtailed = round(self.solar_curtailed, 2)
        self.green_hours_mar_oct_pct = (
            round((self.green_hours_mar_oct / self.load_hours_mar_oct) * 100, 2)
            if self.load_hours_mar_oct > 0.001
            else 0
        )
        self.green_energy_pct = (
            round((self.green_energy_to_load_mwh / self.delivery_met_mwh) * 100, 2)
            if self.delivery_met_mwh > 0.001
            else 1
        )
        return self


@dataclass
class SingleSimulationResult:
    bess_mwh: float = 0
    duration_hr: float = 0
    power_mw: float = 0
    containers: int = 0
    dg_mw: float = 0
    delivery_hours: float = 0
    load_hours: float = 0
    green_hours: float = 0
    dg_hours: float = 0
    dg_starts: int = 0
    bess_cycles: float = 0
    unserved_mwh: float = 0
    fuel_consumption_l: float = 0
    dg_generation: float = 0
    solar_generation: float = 0
    wastage_mw: float = 0
    green_energy_to_load_mwh: float = 0
    solar_hrs: int = 0
    bess_hrs: float = 0
    load_solar_wastage_pct: float = 0
    bess_loss_mwh: float = 0
    solar_mw: float = 0
    solar_to_load: float = 0
    bess_to_load: float = 0
    dg_to_load: float = 0
    dg_curtailed: float = 0
    energy_to_load: float = 0
    delivery_met_mwh: float = 0
    charging_loss: float = 0
    discharging_loss: float = 0
    final_soc_pct: float = 0
    solar_gen_during_load: float = 0
    solar_curtailed_during_load: float = 0
    solar_curtailed: float = 0
    wastage_mw: float = 0
    load_hours_mar_oct: float = 0
    green_hours_mar_oct: float = 0


@dataclass
class HourlyResult:
    timestamp: datetime = field(default_factory=datetime.now)
    hour: int = 0
    day: int = 0
    hour_of_day: int = 0
    load_mw: float = 0
    solar_mw: float = 0.0
    solar_to_load: float = 0.0
    solar_to_bess: float = 0.0
    bess_to_load: float = 0.0
    bess_power_mw: float = 0.0
    bess_state: int = 0
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

    def reset(self):
        self.load_mw = 0
        self.solar_mw = 0.0
        self.solar_to_load = 0.0
        self.solar_to_bess = 0.0
        self.bess_to_load = 0.0
        self.bess_power_mw = 0.0
        self.bess_state = BessState.IDLE
        self.dg_output_mw = 0.0
        self.is_dg_running = False
        self.dg_to_load = 0.0
        self.dg_to_bess = 0.0
        self.dg_curtailed = 0.0
        self.soc_mwh = 0.0
        self.soc_percent = 0.0
        self.unmet_mw = 0.0
        self.delivery = False
        self.solar_curtailed = 0.0
        self.daily_cycles = 0.0
        self.green_energy_to_load_mwh = 0.0
        self.charging_loss = 0.0
        self.discharging_loss = 0.0
        return self


class MultiYearProjectionResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    simulation_id: int
    job_id: int
    year: int
    bess_mwh: float
    capacity_percent: float
    delivery_hours: float
    load_hours: float
    delivery_pct: float = 0
    dg_hours: float
    bess_loss_mwh: float
    load_solar_wastage_pct: float
    green_energy_to_load_mwh: float
    solar_hrs: int
    bess_hrs: float
    wastage_mw: float
    wastage_pct: float = 0
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
    degradation_loss: float = 0
    unserved_mwh: float
    final_soc_pct: float
    solar_gen_during_load: float
    solar_curtailed_during_load: float
    solar_curtailed: float

    def finalize(self):
        self.load_solar_wastage_pct = (
            round((self.solar_curtailed_during_load / self.solar_gen_during_load) * 100)
            if self.solar_gen_during_load > 0.001
            else 0
        )
        self.bess_loss_mwh = self.charging_loss + self.discharging_loss
        self.delivery_pct = (
            round((self.delivery_hours / self.load_hours) * 100, 2)
            if self.load_hours > 0
            else 0
        )
        self.wastage_pct = (
            round(
                (self.wastage_mw / self.solar_generation) * 100,
                2,
            )
            if self.solar_generation > 0.001
            else 0
        )

        for field_name, value in self.__dict__.items():
            if isinstance(value, float):
                # Set the rounded value back to the attribute
                setattr(self, field_name, round(value, 2))
        return self


class GreenResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    simulation_id: int
    job_id: int
    solar_mwp: float
    bess_mwh: float
    duration_hr: float
    power_mw: float
    containers: int
    dg_mw: float
    delivery_pct: float = 0
    green_pct: float = 0
    green_energy_pct: float = 0
    green_hours_mar_oct_pct: float = 0
    wastage_pct: float = 0
    delivery_hours: float
    load_hours: float
    green_hours: float
    dg_hours: float
    dg_starts: int
    bess_cycles: float
    unserved_mwh: float
    fuel_consumption_l: float

    wastage_mw: float = Field(default=0, exclude=True)
    solar_generation: float = Field(default=0, exclude=True)
    green_hours_mar_oct: float = Field(default=0, exclude=True)
    load_hours_mar_oct: float = Field(default=0, exclude=True)
    green_energy_to_load_mwh: float = Field(default=0, exclude=True)
    energy_to_load: float = Field(default=0, exclude=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def finalize(self):
        self.green_pct = (
            round((self.green_hours / self.load_hours) * 100, 2)
            if self.load_hours >= 1
            else 0
        )
        self.wastage_pct = (
            round(
                (self.wastage_mw / self.solar_generation) * 100,
                2,
            )
            if self.solar_generation > 0.001
            else 0
        )
        self.green_hours_mar_oct_pct = (
            round((self.green_hours_mar_oct / self.load_hours_mar_oct) * 100, 2)
            if self.load_hours_mar_oct >= 1
            else 0
        )
        self.green_energy_pct = (
            round((self.green_energy_to_load_mwh / self.energy_to_load) * 100, 2)
            if self.energy_to_load >= 1
            else 0
        )
        self.delivery_pct = (
            round((self.delivery_hours / self.load_hours) * 100, 2)
            if self.load_hours >= 1
            else 0
        )

        for field_name, value in self.__dict__.items():
            if isinstance(value, float):
                # Set the rounded value back to the attribute
                setattr(self, field_name, round(value, 2))
        return self
