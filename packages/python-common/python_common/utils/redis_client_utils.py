from config import REDIS_URL
import redis.asyncio as redis


class RedisClientPool:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(
            REDIS_URL, max_connections=10, decode_responses=True, socket_timeout=None
        )

    async def get_redis_client_from_pool(self) -> redis.Redis:
        redis_connection = redis.Redis(connection_pool=self.pool)
        await redis_connection.ping()
        return redis_connection


redisClient = RedisClientPool()
