# cache_utils.py
from redis.asyncio import Redis
import json
from typing import Any, Optional
from python_common.config import REDIS_URL


class RedisCache:
    def __init__(self, namespace: str = "cache"):
        print(f"{REDIS_URL=}")
        self.client = Redis.from_url(REDIS_URL, decode_responses=True)
        self.namespace = namespace

    def _build_key(self, key: str) -> str:
        return f"{self.namespace}:{key}"
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        keep_ttl: bool = False,
    ) -> None:
        """Store value in Redis with optional TTL or preserve existing TTL."""
        
        key = self._build_key(key)

        if isinstance(value, (dict, list)):
            value = json.dumps(value, default=str)

        if ttl_seconds is not None:
            # Set new TTL
            await self.client.set(key, value, ex=ttl_seconds)
        elif keep_ttl:
            # Preserve existing TTL
            await self.client.set(key, value, keepttl=True)
        else:
            # No TTL → becomes persistent
            await self.client.set(key, value)

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve value from Redis."""
        key = self._build_key(key)

        value = await self.client.get(key)
        if not value:
            return None
        try:
            obj = json.loads(value)
            return obj
        except json.JSONDecodeError:
            return value

    async def delete(self, key: str) -> None:
        key = self._build_key(key)
        await self.client.delete(key)

    async def clear(self) -> None:
        keys = await self.client.keys(f"{self.namespace}:*")
        if keys:
            await self.client.delete(*keys)

    async def all(self) -> dict:
        """Return all keys/values (for debugging)."""
        result = {}
        keys = await self.client.keys(f"{self.namespace}:*")
        for key in keys:
            val = await self.client.get(key)
            try:
                result[key] = json.loads(val)
            except Exception:
                result[key] = val
        return result


cache = RedisCache(namespace="cache")
