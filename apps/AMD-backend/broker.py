from sqlalchemy.ext.asyncio import async_sessionmaker
from taskiq import TaskiqEvents
from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

from config import REDIS_URL, DATABASE_URL
from db.db_config import create_engine_pooling

result_backend = RedisAsyncResultBackend(
    redis_url=REDIS_URL,
    result_ex_time=1000,
)

# We pass decode_responses=True here; it will be used by the underlying redis-py client
broker = RedisStreamBroker(
    url=REDIS_URL,
    queue_name="analytics_tasks",
    idle_timeout=3600000,
    unacknowledged_lock_timeout=3600000,
    socket_timeout=60,
    retry_on_timeout=True,
    health_check_interval=30,
).with_result_backend(result_backend)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def setup_worker_state(state):
    # Create a process-local DB engine and session factory
    state.db_engine = create_engine_pooling(DATABASE_URL)
    state.db_session_factory = async_sessionmaker(
        state.db_engine, expire_on_commit=False
    )


@broker.on_event(TaskiqEvents.WORKER_SHUTDOWN)
async def shutdown_worker_state(state):
    if hasattr(state, "redis_pool"):
        await state.redis_pool.disconnect()

    if hasattr(state, "db_engine"):
        await state.db_engine.dispose()


import worker.tasks  # noqa: F401
