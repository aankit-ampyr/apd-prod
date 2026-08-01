import json
from typing import Optional

from constants.enums import ResourceType, SimulationLogStep
from constants.defaults import LOGS_STREAM_CHANEL
from sqlalchemy.ext.asyncio import AsyncSession
from models import AuditLog
from db.db_config import BessSessionLocal
from datetime import timezone, datetime
from redis.asyncio import Redis
from dtos import AuditLogSchema, SocketLogEvent


async def audit_logs(
    user_id: str,
    user_role: int,
    module: int,
    action: int,
    redis: Redis,
    before: str | dict | None,
    after: str | dict | None,
    resource_id: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    channel: str = LOGS_STREAM_CHANEL,
):
    before_str = json.dumps(before) if isinstance(before, dict) else before
    after_str = json.dumps(after) if isinstance(after, dict) else after

    # Inner helper logic so session handling stays clean
    async def _save_and_publish(session: AsyncSession):
        audit_log = AuditLog(
            user_id=user_id,
            role=user_role,
            module=module,
            action=action,
            resource_id=resource_id,
            before=before_str,
            after=after_str,
            created_at=datetime.now(timezone.utc),
        )

        session.add(audit_log)
        await session.commit()
        await session.refresh(audit_log)

        audit_data = AuditLogSchema.model_validate(audit_log)
        complete_event = SocketLogEvent(
            resource_type=ResourceType.AUDIT_LOG, data=audit_data
        )
        await redis.publish(channel, complete_event.model_dump_json())

    try:
        if db:
            await _save_and_publish(db)
        else:
            async with BessSessionLocal() as db_session:
                await _save_and_publish(db_session)

    except Exception as e:
        raise e


FIELD_MAP = {
    # --- Global ---
    "simulation_id": "Simulation ID",
    # --- LoadProfile & SolarProfileSource ---
    "load_mw": "Load",
    "pattern": "Load Pattern",
    "name": "Solar Profile CSV",  # From SolarProfileSource
    # --- BESSContainerConfiguration ---
    "bess_initial_soc": "Initial State",
    "bess_min_soc": "Min SOC %",
    "bess_max_soc": "Max SOC %",
    "bess_efficiency": "RTE",  # Round Trip Efficiency
    "bess_daily_cycle_limit": "Cycle Limit",
    "container_types": "Container Selected",
    # --- DieselGeneratorConfiguration ---
    "is_included": "DG Enabled",
    "is_binary": "Mode",  # Maps to BINARY / VARIABLE
    "flat_fuel_rate": "Flat Fuel Rate L/kWh",
    "fuel_price": "Fuel Price per Litre",
    "no_load_coeff": "F0 (No-load coeff)",
    "load_coeff": "F1 (Load coeff)",
    # --- DispatchRuleConfiguration ---
    "dg_run_schedule_mode": "Schedule Mode",  # ANYTIME / Night Only
    "dg_start_time": "Start Time",
    "dg_end_time": "End Time",
    "dg_trigger_type": "Trigger",  # LOAD_DEFICIT / BATTERY_THRESHOLD
    "dg_soc_on_threshold": "On Below SOC",
    "dg_soc_off_threshold": "Off Above SOC",
    "is_dg_charging_bess": "Battery Charging",  # SOLAR_ONLY
    "load_serving_priority": "Load Priority",  # BESS_FIRST
    "is_dg_takeover_full_load": "Takeover Mode",
    "is_cycle_charging_enabled": "Cycle Charging",
    "min_load": "Min Load %",
    "stop_soc": "Stop SOC %",
    # --- BessDgSizingConfiguration ---
    "bess_min": "Min BESS Capacity MWh",
    "bess_max": "Max BESS Capacity MWh",
    "dg_min": "Min DG Capacity MW",
    "dg_max": "Max DG Capacity MW",
    "dg_step_size": "DG Step Size MW",
    # --- CustomConfiguration ---
    "bess_capacity": "BESS Capacity MWh",
    "dg_capacity": "DG Capacity MW",
    "duration_class": "Duration Class",
    "factory_degradation": "Factory Degradation %",
    "annual_degradation": "Annual Degradation % per Year",
    "sizing_strategy": "Sizing Strategy",
    "solar_min": "Solar Min MWh",
    "solar_max": "Solar Max MWh",
    "solar_step": "Solar Step Size MW",
    "min_green_energy": "Min Green Energy %",
    "max_wastage": "Max Wastage %",
    "solar_peak": "Solar Size Capacity MWp",
}


async def compare_and_log(
    user_id: str,
    user_role: int,
    module: int,
    action: int,
    before: dict,
    after: dict,
    redis: Redis,
    sim_module_type: SimulationLogStep,
    resource_id: Optional[str] = None,
    db: Optional[AsyncSession] = None,
    remove_id: bool = False,
    channel: str = LOGS_STREAM_CHANEL,
):
    diff_before = {}
    diff_after = {}

    all_keys = before.keys() | after.keys()

    for key in all_keys:
        if key == "simulation_id" and remove_id:
            continue

        if key in before and key in after and before[key] == after[key]:
            continue

        mapped_key = FIELD_MAP.get(key, key)

        if key in before:
            diff_before[mapped_key] = before[key]
        if key in after:
            diff_after[mapped_key] = after[key]

    return await audit_logs(
        user_id=user_id,
        user_role=user_role,
        module=module,
        action=action,
        before=str(json.dumps({sim_module_type.value: diff_before}))
        if diff_before
        else None,
        after=str(json.dumps({sim_module_type.value: diff_after}))
        if diff_after
        else None,
        resource_id=resource_id,
        db=db,
        redis=redis,
        channel=channel,
    )
