from typing import Any
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from taskiq import TaskiqDepends, Context
from broker import broker

from .simulations import (
    run_multi_year_projection,
    run_simulation_single_config,
    run_sizing_simulation,
)


async def get_redis(context: Context = TaskiqDepends()) -> Redis:
    return Redis(connection_pool=context.state.redis_pool, decode_responses=True)


async def get_db(
    context: Context = TaskiqDepends(),
) -> AsyncSession:
    async with context.state.db_session_factory() as session:
        yield session


@broker.task(task_name="bess_sizing_sim_task")
async def bess_sizing_sim_task(
    simulation_id: int,
    job_id: int,
    db: AsyncSession = TaskiqDepends(get_db),
    redis: Redis = TaskiqDepends(get_redis),
):
    try:
        async with redis:
            return await run_sizing_simulation(
                simulation_id=simulation_id,
                job_id=job_id,
                redis=redis,
                db=db,
            )
    except Exception as e:
        return {"status": "error", "message": str(e)}


@broker.task(task_name="bess_single_sim_task")
async def bess_single_sim_task(
    simulation_id: int,
    job_id: int,
    db: AsyncSession = TaskiqDepends(get_db),
    redis: Redis = TaskiqDepends(get_redis),
):
    try:
        async with redis:
            return await run_simulation_single_config(
                simulation_id=simulation_id,
                job_id=job_id,
                redis=redis,
                db=db,
            )
    except Exception as e:
        return {"status": "error", "message": str(e)}


@broker.task(task_name="multi_year_projection_sim_task")
async def multi_year_projection_sim_task(
    simulation_id: int,
    job_id: int,
    db: AsyncSession = TaskiqDepends(get_db),
    redis: Redis = TaskiqDepends(get_redis),
):
    try:
        async with redis:
            return await run_multi_year_projection(
                simulation_id=simulation_id,
                job_id=job_id,
                redis=redis,
                db=db,
            )
    except Exception as e:
        return {"status": "error", "message": str(e)}
