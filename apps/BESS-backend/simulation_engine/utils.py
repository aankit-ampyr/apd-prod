import calendar
from typing import List, Any, Optional
import numpy as np
import pandas as pd
from redis.asyncio import Redis
from datetime import datetime, timedelta, timezone

from dtos.simulation_dto import MonthlySimulationMetrics


def create_constant_load(load_mw: float):
    return np.full(8760, load_mw, dtype=float)


def create_seasonal_load_profile(params: dict):
    month_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    # Calculate which day of the year each month starts on (0-indexed)
    month_starts = np.cumsum([0] + month_days[:-1])

    load = params["load_mw"]
    s_month, e_month = params["start_month"] - 1, params["end_month"] - 1
    s_hour, e_hour = params["start_time"], params["end_time"]

    start_day = month_starts[s_month]
    end_day = month_starts[e_month] + month_days[e_month]

    profile_grid = np.zeros((365, 24))

    if s_hour < e_hour:
        # Standard daytime load (e.g., 08:00 to 18:00)
        profile_grid[start_day:end_day, s_hour:e_hour] = load
    else:
        # Overnight load spanning midnight (e.g., 16:00 to 06:00)
        profile_grid[start_day:end_day, s_hour:24] = load
        profile_grid[start_day:end_day, 0:e_hour] = load

    return profile_grid.ravel()


def create_windowed_load_profile(data: List[dict]):
    grid = np.zeros((365, 24))

    for window in data:
        load = window["load_mw"]
        s = window["start_time"]
        e = window["end_time"]

        if s < e:
            # Normal case (e.g., 07:00 to 19:00)
            grid[:, s:e] = load
        else:
            # Wrap-around case (e.g., 19:00 to 07:00)
            # We fill from start to midnight AND midnight to end
            grid[:, s:] = load
            grid[:, :e] = load

    return grid.ravel()


def create_availability_hours_array(
    start_hour: Optional[int] = None, end_hour: Optional[int] = None
):
    blackout_grid = np.zeros((365, 24), dtype=bool)

    if start_hour is None or end_hour is None:
        return blackout_grid

    if start_hour < end_hour:
        blackout_grid[:, start_hour:end_hour] = True
    else:
        blackout_grid[:, start_hour:] = True
        blackout_grid[:, :end_hour] = True

    return blackout_grid.ravel()


async def stop_simulation(job_id: int, redis_client: Redis):
    """
    Sets a termination flag in Redis for a specific simulation task with a 30s TTL.
    """
    key = f"simulation:terminate:{job_id}"
    await redis_client.set(key, "True", ex=30)


async def should_simulation_stopped(job_id: int, redis_client: Any) -> bool:
    """
    Checks if a termination flag exists in Redis for the given simulation ID.
    If it exists, it deletes the key and returns True.
    """
    key = f"simulation:terminate:{job_id}"
    result = await redis_client.delete(key)
    return result > 0


def get_datetime_from_hour_of_year(
    year: int, hour_of_year: int
) -> tuple[datetime, int]:
    """
    Takes a year and the hour of that year (1-8760 for standard years),
    and returns the corresponding datetime object and the hour of the day (0-23).
    """
    base_date = datetime(year, 1, 1, 0, 0, tzinfo=timezone.utc)
    target_datetime = base_date + timedelta(hours=hour_of_year)
    hour_of_day = target_datetime.hour

    return target_datetime, hour_of_day


def is_within_march_to_october(
    hour_of_year: int, year: int, zero_indexed: bool = True
) -> bool:
    base_date = datetime(year, 1, 1, 0, 0)
    hours_to_add = hour_of_year if zero_indexed else (hour_of_year - 1)
    target_date = base_date + timedelta(hours=hours_to_add)
    return 3 <= target_date.month <= 10


def aggregate_monthly_data(
    simulation_id: int, job_id: int, hourly_data: list[dict]
) -> list[MonthlySimulationMetrics]:

    data = []
    year: int = 1990

    for row in hourly_data:
        data.append(
            {
                "timestamp": row.get("timestamp"),
                "is_dg_running": row.get("is_dg_running"),
                "dg_to_load": row.get("dg_to_load"),
                "load_mw": row.get("load_mw"),
                "solar_curtailed": row.get("solar_curtailed"),
                "solar_mw": row.get("solar_mw"),
                "delivery": row.get("delivery"),
                "green_energy_to_load_mwh": row.get("green_energy_to_load_mwh"),
            }
        )

    # Load into DataFrame
    df = pd.DataFrame(data)

    # Handle empty results gracefully
    if df.empty:
        return []

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["month_int"] = df["timestamp"].dt.month
    year = int(df["timestamp"].dt.year.iloc[0])

    # Booleans for fast counting
    df["load_active"] = (df["load_mw"] > 0).astype(int)
    df["delivery_int"] = df["delivery"].astype(int)
    df["dg_running_int"] = df["is_dg_running"].astype(int)
    df["delivery_dg_off"] = (df["delivery"] & ~df["is_dg_running"]).astype(int)

    grouped = (
        df.groupby("month_int")
        .agg(
            hours_fully_served=("delivery_int", "sum"),
            total_load_hours=("load_active", "sum"),
            green_delivery_hours=("delivery_dg_off", "sum"),
            generator_hours=("dg_running_int", "sum"),
            sum_solar_mw=("solar_mw", "sum"),
            green_energy_to_load_mwh=("green_energy_to_load_mwh", "sum"),
            dg_to_load_mwh=("dg_to_load", "sum"),
            curtailed_mwh=("solar_curtailed", "sum"),
        )
        .reset_index()
    )

    # 4. Perform final percentage calculations (with safe division to prevent divide-by-zero errors)
    grouped["load_met_pct"] = np.where(
        grouped["total_load_hours"] > 0,
        (grouped["hours_fully_served"] / grouped["total_load_hours"]) * 100,
        0.0,
    )

    grouped["green_energy_pct"] = np.where(
        grouped["hours_fully_served"] > 0,
        (grouped["green_delivery_hours"] / grouped["hours_fully_served"]) * 100,
        0.0,
    )

    grouped["wastage_energy_pct"] = np.where(
        grouped["sum_solar_mw"] > 0,
        (grouped["curtailed_mwh"] / grouped["sum_solar_mw"]) * 100,
        0.0,
    )

    grouped["month"] = grouped["month_int"].apply(lambda x: calendar.month_name[x])

    metrics_list = []

    for row in grouped.itertuples(index=False):
        metric = MonthlySimulationMetrics(
            simulation_id=simulation_id,
            job_id=job_id,
            month=row.month,  # type: ignore
            load_met_pct=row.load_met_pct,  # type: ignore
            green_energy_pct=row.green_energy_pct,  # type: ignore
            wastage_energy_pct=row.wastage_energy_pct,  # type: ignore
            hours_fully_served=int(row.hours_fully_served),  # type: ignore
            total_load_hours=int(row.total_load_hours),  # type: ignore
            generator_hours=int(row.generator_hours),  # type: ignore
            green_energy_to_load_mwh=row.green_energy_to_load_mwh,  # type: ignore
            dg_to_load_mwh=row.dg_to_load_mwh,  # type: ignore
            curtailed_mwh=row.curtailed_mwh,  # type: ignore
            month_int=row.month_int,  # type: ignore
            year_int=year,
        )
        metrics_list.append(metric)

    return metrics_list
