from typing import List, Any, Optional
import numpy as np
from redis.asyncio import Redis
from datetime import datetime, timedelta, timezone


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
