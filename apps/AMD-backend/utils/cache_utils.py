# cache_utils.py
import redis
import json
from typing import Any, Optional
from config import REDIS_URL

class RedisCache:
    def __init__(self):
        self.client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Store value in Redis with optional TTL."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value, default=str)
        if ttl_seconds:
            self.client.setex(key, ttl_seconds, value)
        else:
            self.client.set(key, value)

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value from Redis."""
        value = self.client.get(key)
        if not value:
            return None
        try:
            obj = json.loads(value)
            return obj
        except json.JSONDecodeError:
            return value

    def delete(self, key: str) -> None:
        self.client.delete(key)

    def clear(self) -> None:
        self.client.flushdb()

    def all(self) -> dict:
        """Return all keys/values (for debugging)."""
        result = {}
        for key in self.client.keys("*"):
            val = self.client.get(key)
            try:
                result[key] = json.loads(val)
            except Exception:
                result[key] = val
        return result

cache = RedisCache()
