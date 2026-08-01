import redis.asyncio as redis
from sqlalchemy.ext.asyncio import async_sessionmaker
from taskiq import TaskiqEvents
from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

from config import REDIS_URL, BESS_DATABASE_URL
from db.db_config import create_engine_worker

result_backend = RedisAsyncResultBackend(
    redis_url=REDIS_URL,
    result_ex_time=1000,
)

# We pass decode_responses=True here; it will be used by the underlying redis-py client
broker = RedisStreamBroker(
    url=REDIS_URL,
    queue_name="simulation_tasks",
    idle_timeout=3600000,
    unacknowledged_lock_timeout=3600000,
    socket_timeout=60,
    retry_on_timeout=True,
    health_check_interval=30,
).with_result_backend(result_backend)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def setup_worker_state(state):
    # This creates the pool inside the worker process
    state.redis_pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)

    # Create a process-local DB engine and session factory
    state.db_engine = create_engine_worker(BESS_DATABASE_URL)
    state.db_session_factory = async_sessionmaker(
        state.db_engine, expire_on_commit=False
    )


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def shutdown_worker_state(state):
    if hasattr(state, "redis_pool"):
        await state.redis_pool.disconnect()

    if hasattr(state, "db_engine"):
        await state.db_engine.dispose()


import simulation_engine.tasks  # noqa: F401
