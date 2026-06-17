import asyncio
from fastapi import FastAPI
from collections.abc import AsyncIterator
from python_common.utils import redisClient
from redis.asyncio import Redis
from contextlib import asynccontextmanager
from simulation_engine.trakers import brodcast_message


class State:
    redis: Redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:

    app.state.background_tasks = set()
    # create the instance
    redis_client = await redisClient.get_redis_client_from_pool()

    # return the intance
    app.state.redis = redis_client

    # Start the subscriber task and keep a strong reference
    task = asyncio.create_task(brodcast_message(redis_client))
    app.state.background_tasks.add(task)

    # Remove task from set when it's done
    task.add_done_callback(app.state.background_tasks.discard)

    yield

    # Shutdown: Cancel all remaining background tasks
    tasks = list(app.state.background_tasks)
    for t in tasks:
        t.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    # after done, close it
    if redis_client is not None:
        await redis_client.close()
