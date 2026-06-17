from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import JSONB
from db.db_config import BessBase


class Simulation(BessBase):
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[int] = mapped_column(Integer, default=3, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        # unique=True,
        nullable=False,
    )
    created_by: Mapped[int] = mapped_column(index=True)
    step: Mapped[int] = mapped_column(default=0)
    edit_step: Mapped[int] = mapped_column(default=0, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @hybrid_property
    def sim_id(self):  # type: ignore
        if self.id is None:
            return None
        return f"SIM-{self.id:04d}"  # LOG-0001, LOG-1001 — no truncation

    @sim_id.expression
    def sim_id(cls):
        # Used when filtering at DB level: Model.query.filter_by(log_id=...)
        from sqlalchemy import func, cast

        id_str = cast(cls.id, String)
        id_len = func.length(id_str)
        target_len = func.greatest(id_len, 4)

        return func.concat("SIM-", func.lpad(cast(cls.id, String), target_len, "0"))

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="simulation")

    # Backtracking relationships (One-to-One)
    load_profile: Mapped["LoadProfile"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )
    solar_profile_config: Mapped["SolarProfileConfig"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )
    bess_config: Mapped["BESSContainerConfiguration"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )

    dg_config: Mapped["DieselGeneratorConfiguration"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )
    dispatch_config: Mapped["DispatchRuleConfiguration"] = relationship(
        back_populates="simulation",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    bess_dg_sizing: Mapped["BessDgSizingConfiguration"] = relationship(
        uselist=False, cascade="all, delete-orphan"
    )

    simulation_job: Mapped[list["SimulationJob"]] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )

    custom_configs: Mapped["CustomSimulationConfig"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )
    custom_jobs: Mapped[list["CustomSimulationJob"]] = relationship(
        back_populates="simulation", cascade="all, delete-orphan"
    )

    multi_year_projection: Mapped["MultiYearProjection"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )
    multi_year_jobs: Mapped[list["MultiYearSimulationJob"]] = relationship(
        back_populates="simulation", cascade="all, delete-orphan"
    )

    green_energy_config: Mapped["GreenEnergyAnalysisConfiguration"] = relationship(
        back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )


class ProjectSimulationSequence(BessBase):
    __tablename__ = "project_simulation_sqeunce"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        unique=True,
    )
    simulation_count: Mapped[int] = mapped_column(default=0, server_default=text("0"))


class LoadProfile(BessBase):
    __tablename__ = "load_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=False,
    )
    pattern: Mapped[int] = mapped_column(index=True)

    config: Mapped[dict] = mapped_column(JSONB)

    peak_load: Mapped[float]
    total_energy: Mapped[float]
    total_hours: Mapped[int]
    hour_percentage: Mapped[float]

    graph_data_points: Mapped[list[float]] = mapped_column(ARRAY(Float))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Back-reference
    simulation: Mapped["Simulation"] = relationship(back_populates="load_profile")


class SolarProfileConfig(BessBase):
    __tablename__ = "solar_profile_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=False,
    )

    source_id: Mapped[int] = mapped_column(
        ForeignKey("solar_profile_sources.id", ondelete="CASCADE"),
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(10))  # "static" | "file"

    # Core metrics
    total_generation: Mapped[float]  # in MWh
    peak_generation: Mapped[float]  # in MW
    avg_generation: Mapped[float]  # in MW
    generation_hours: Mapped[int]  # in hours

    max_storable: Mapped[float]  # in MW
    excess_hours: Mapped[int]  # in hours
    total_storable: Mapped[float]  # in MWh
    max_available: Mapped[float]  # maximum available storable in MW
    hours_at_max: Mapped[Optional[float]]  # hours at maximum available storable

    # Graph points as single JSONB: {"hourly": [...], "monthly": [...], "storable": [...]}
    output_graph_points: Mapped[dict] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    simulation: Mapped["Simulation"] = relationship(
        back_populates="solar_profile_config"
    )
    source: Mapped["SolarProfileSource"] = relationship(back_populates="configs")


class SolarProfileSource(BessBase):
    """
    Represents a solar profile input source used for computation.

    This stores both static files and uploaded CSV files used as
    solar profile sources for simulation calculations.
    """

    __tablename__ = "solar_profile_sources"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(500), index=True)  # file path in storage
    size: Mapped[int] = mapped_column(index=True)  # file size in bytes
    name: Mapped[str] = mapped_column(String(255), index=True)  # file name
    year: Mapped[int] = mapped_column(Integer, server_default=text("2024"), index=True)
    rows: Mapped[int] = mapped_column(index=True)  # number of data rows
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Back-reference
    configs: Mapped[List["SolarProfileConfig"]] = relationship(back_populates="source")


class BESSContainerConfiguration(BessBase):
    __tablename__ = "bess_container_configuration"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=True,
    )
    container_types: Mapped[List[int]] = mapped_column(ARRAY(Integer), index=True)

    bess_efficiency: Mapped[float] = mapped_column(Float)
    bess_min_soc: Mapped[float] = mapped_column(index=True)
    bess_max_soc: Mapped[float] = mapped_column(index=True)
    bess_initial_soc: Mapped[float] = mapped_column(index=True)
    bess_daily_cycle_limit: Mapped[float] = mapped_column(index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), insert_default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        insert_default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    # Back-reference
    simulation: Mapped["Simulation"] = relationship(back_populates="bess_config")


class DieselGeneratorConfiguration(BessBase):
    __tablename__ = "diesel_generator_configuration"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,
    )

    is_included: Mapped[bool] = mapped_column(index=True, nullable=False)
    is_binary: Mapped[bool] = mapped_column(index=True, nullable=False)
    advanced_fuel_curve: Mapped[Optional[bool]] = mapped_column(nullable=True)

    fuel_price: Mapped[Optional[float]] = mapped_column(nullable=True)
    flat_fuel_rate: Mapped[Optional[float]] = mapped_column(nullable=True)
    min_stable_load: Mapped[Optional[float]] = mapped_column(nullable=True)
    no_load_coeff: Mapped[Optional[float]] = mapped_column(nullable=True)
    load_coeff: Mapped[Optional[float]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), insert_default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        insert_default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    simulation: Mapped["Simulation"] = relationship(back_populates="dg_config")


class DispatchRuleConfiguration(BessBase):
    __tablename__ = "dispatch_rule_configurations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        unique=True,  # Ensures one-to-one relationship
        index=True,
        nullable=False,
    )

    # Q1: When can DG run?
    dg_run_schedule_mode: Mapped[int] = mapped_column(nullable=False)
    dg_start_time: Mapped[Optional[int]] = mapped_column(nullable=True)
    dg_end_time: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Q2: What triggers DG?
    dg_trigger_type: Mapped[Optional[int]] = mapped_column(nullable=True)
    dg_soc_on_threshold: Mapped[Optional[int]] = mapped_column(nullable=True)
    dg_soc_off_threshold: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Q3: Can DG charge battery?
    is_dg_charging_bess: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Q4: Load Serving Priority
    load_serving_priority: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Q5: DG Takeover Mode
    is_dg_takeover_full_load: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Q6: Cycle Charging Mode
    is_cycle_charging_enabled: Mapped[Optional[bool]] = mapped_column(nullable=True)
    min_load: Mapped[Optional[int]] = mapped_column(nullable=True)
    stop_soc: Mapped[Optional[int]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Back-reference
    simulation: Mapped["Simulation"] = relationship(back_populates="dispatch_config")


class BessDgSizingConfiguration(BessBase):
    __tablename__ = "bess_dg_sizing_configuration"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,
    )

    bess_min: Mapped[int] = mapped_column(Integer, nullable=False)
    bess_max: Mapped[int] = mapped_column(Integer, nullable=False)

    dg_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dg_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    dg_step_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )


class SimulationJob(BessBase):
    __tablename__ = "simulation_job"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True, start=1000),  # Start at 1000 for cleaner IDs
        unique=True,
        index=True,
    )
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    status: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_iterations: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    completed_iterations: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    is_fallback: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), default=False, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    simulation: Mapped["Simulation"] = relationship(back_populates="simulation_job")

    # Optional relationship
    results: Mapped[list["SimulationResult"]] = relationship(
        back_populates="job", passive_deletes=True
    )

    debug_logs: Mapped[list["SimulationDebug"]] = relationship(
        back_populates="job", passive_deletes=True
    )


class AbstractSimulationResult(BessBase):
    __abstract__ = True

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Metrics
    bess_mwh: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    duration_hr: Mapped[float] = mapped_column(Float, nullable=False)
    power_mw: Mapped[float] = mapped_column(Float, nullable=False)
    containers: Mapped[float] = mapped_column(Float, nullable=False)
    dg_mw: Mapped[float] = mapped_column(Float, index=True, nullable=False)

    # Percentages and Hours
    delivery_pct: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    green_pct: Mapped[float] = mapped_column(Float, nullable=False)
    wastage_pct: Mapped[float] = mapped_column(Float, nullable=False)

    delivery_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    load_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    green_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    dg_hours: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    # Cycles and Consumption
    dg_starts: Mapped[int] = mapped_column(Integer, nullable=False)
    bess_cycles: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_consumption_l: Mapped[float] = mapped_column(Float, nullable=False)
    unserved_mwh: Mapped[float] = mapped_column(Float, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )


class SimulationResult(AbstractSimulationResult):
    __tablename__ = "simulation_result"

    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("simulation_job.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    job: Mapped["SimulationJob"] = relationship(back_populates="results")


class SimulationDebug(BessBase):
    __tablename__ = "simulation_debug"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("simulation_job.job_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    current_day: Mapped[int] = mapped_column(Integer, default=0)
    daily_cycles: Mapped[float] = mapped_column(Float, default=0.0)
    hourly_cycle: Mapped[float] = mapped_column(Float, default=0.0)
    bess_disabled: Mapped[bool] = mapped_column(default=True)
    current_soc: Mapped[float] = mapped_column(Float, default=0.0)
    total_bess_discharge_mwh: Mapped[float] = mapped_column(Float, default=0.0)
    is_dg_running: Mapped[bool] = mapped_column(default=False)
    dg_start_count: Mapped[int] = mapped_column(Integer, default=0)
    unserved_mwh: Mapped[float] = mapped_column(Float, default=0.0)
    load: Mapped[float] = mapped_column(Float, default=0.0)
    solar_generation: Mapped[float] = mapped_column(Float, default=0.0)
    fuel_consumption_l: Mapped[float] = mapped_column(Float, default=0.0)
    dg_generation_mw: Mapped[float] = mapped_column(Float, default=0.0)
    solar_to_load: Mapped[float] = mapped_column(
        Float, default=0.0, server_default=text("0.0"), nullable=True
    )
    dg_to_load: Mapped[float] = mapped_column(
        Float, default=0.0, server_default=text("0.0"), nullable=True
    )
    bess_to_load: Mapped[float] = mapped_column(
        Float, default=0.0, server_default=text("0.0"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationship
    job: Mapped["SimulationJob"] = relationship(back_populates="debug_logs")


class CustomSimulationConfig(BessBase):
    __tablename__ = "custom_simulation_config"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    duration_class: Mapped[int] = mapped_column(Integer, nullable=False)
    bess_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    dg_capacity: Mapped[int] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )

    # Relationships
    simulation: Mapped["Simulation"] = relationship(back_populates="custom_configs")


class CustomSimulationJob(BessBase):
    __tablename__ = "custom_simulation_job"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,
    )
    job_id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True, start=1000),  # Start at 1000 for cleaner IDs
        unique=True,
        index=True,
    )
    status: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    simulation: Mapped["Simulation"] = relationship(back_populates="custom_jobs")
    hourly_results: Mapped[list["SimulationHourlyResult"]] = relationship(
        back_populates="custom_job", cascade="all, delete-orphan"
    )
    results: Mapped[list["SingularConfSimulationResult"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class SingularConfSimulationResult(AbstractSimulationResult):
    __tablename__ = "singular_conf_simulation_result"

    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("custom_simulation_job.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    job: Mapped["CustomSimulationJob"] = relationship(back_populates="results")


class SimulationHourlyResult(BessBase):
    __tablename__ = "simulation_hourly_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    custom_job_id: Mapped[int] = mapped_column(
        ForeignKey("custom_simulation_job.job_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    hour_of_day: Mapped[int] = mapped_column(Integer, nullable=False)
    load_mw: Mapped[int] = mapped_column(Integer, nullable=False)
    solar_mw: Mapped[float] = mapped_column(Float, nullable=False)
    solar_to_load: Mapped[float] = mapped_column(Float, nullable=False)
    solar_to_bess: Mapped[float] = mapped_column(Float, nullable=False)
    bess_to_load: Mapped[float] = mapped_column(Float, nullable=False)
    bess_power_mw: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0.0")
    )
    bess_state: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # Stored as IntEnum value
    dg_output_mw: Mapped[float] = mapped_column(Float, nullable=False)
    is_dg_running: Mapped[bool] = mapped_column(Boolean, nullable=False)
    dg_to_load: Mapped[float] = mapped_column(Float, nullable=False)
    dg_to_bess: Mapped[float] = mapped_column(Float, nullable=False)
    dg_curtailed: Mapped[float] = mapped_column(Float, nullable=False)
    soc_mwh: Mapped[float] = mapped_column(Float, nullable=False)
    soc_percent: Mapped[float] = mapped_column(Float, nullable=False)
    unmet_mw: Mapped[float] = mapped_column(Float, nullable=False)
    delivery: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    solar_curtailed: Mapped[float] = mapped_column(Float, nullable=False)
    daily_cycles: Mapped[float] = mapped_column(Float, nullable=False)
    green_energy_to_load_mwh: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    custom_job: Mapped["CustomSimulationJob"] = relationship(
        back_populates="hourly_results"
    )
    simulation: Mapped["Simulation"] = relationship()


class MultiYearProjection(BessBase):
    __tablename__ = "multi_year_projections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        unique=True,
        nullable=False,
    )

    factory_degradation: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    annual_degradation: Mapped[float] = mapped_column(
        Float, default=2.5, nullable=False
    )
    sizing_strategy: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    simulation: Mapped["Simulation"] = relationship(
        back_populates="multi_year_projection"
    )


class MultiYearSimulationJob(BessBase):
    __tablename__ = "multi_year_simulation_job"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        unique=True,
    )
    job_id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True, start=1000),  # Start at 1000 for cleaner IDs
        unique=True,
        index=True,
    )
    status: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationship
    simulation: Mapped["Simulation"] = relationship(back_populates="multi_year_jobs")


class MultiYearSimulationResult(BessBase):
    __tablename__ = "multi_year_simulation_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    job_id: Mapped[int] = mapped_column(
        ForeignKey("multi_year_simulation_job.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Core Columns
    year: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    bess_mwh: Mapped[float] = mapped_column(Float, nullable=False)
    capacity_percent: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_hours: Mapped[float] = mapped_column(Float, nullable=False)
    load_hours: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_pct: Mapped[float] = mapped_column(Float, nullable=False)
    dg_hours: Mapped[float] = mapped_column(Float, nullable=False)
    green_energy_to_load_mwh: Mapped[float] = mapped_column(Float, nullable=False)
    bess_hrs: Mapped[float] = mapped_column(Float, nullable=False)
    wastage_mw: Mapped[float] = mapped_column(Float, nullable=False)
    wastage_pct: Mapped[float] = mapped_column(Float, nullable=False)
    load_solar_wastage_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    bess_loss_mwh: Mapped[float] = mapped_column(Float, nullable=False)
    solar_generation: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    solar_hrs: Mapped[int] = mapped_column(Float, nullable=False)

    dg_generation: Mapped[float] = mapped_column(
        Float, nullable=False, server_default=text("0")
    )
    solar_to_load: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    bess_to_load: Mapped[float] = mapped_column(Float, nullable=False)
    dg_to_load: Mapped[float] = mapped_column(Float, nullable=False)
    dg_curtailed: Mapped[float] = mapped_column(Float, nullable=False)
    energy_to_load: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    delivery_met_mwh: Mapped[float] = mapped_column(Float, nullable=False)
    charging_loss: Mapped[float] = mapped_column(Float, nullable=False)
    discharging_loss: Mapped[float] = mapped_column(Float, nullable=False)
    final_soc_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    solar_gen_during_load: Mapped[float] = mapped_column(Float, nullable=False)
    solar_curtailed_during_load: Mapped[float] = mapped_column(Float, nullable=False)
    solar_curtailed: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )


class GreenEnergyAnalysisConfiguration(BessBase):
    __tablename__ = "green_energy_analysis_configuration"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )
    simulation_id: Mapped[int] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    solar_min: Mapped[int] = mapped_column(Integer, nullable=False)
    solar_max: Mapped[int] = mapped_column(Integer, nullable=False)
    solar_step: Mapped[int] = mapped_column(Integer, nullable=False)

    bess_min: Mapped[int] = mapped_column(Integer, nullable=False)
    bess_max: Mapped[int] = mapped_column(Integer, nullable=False)

    dg_min: Mapped[int] = mapped_column(Integer, nullable=False)
    dg_max: Mapped[int] = mapped_column(Integer, nullable=False)
    dg_step: Mapped[int] = mapped_column(Integer, nullable=False)

    min_green_energy: Mapped[int] = mapped_column(Integer, nullable=False)
    max_wastage: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
    )

    # Back-reference
    simulation: Mapped["Simulation"] = relationship(back_populates="green_energy_config")
