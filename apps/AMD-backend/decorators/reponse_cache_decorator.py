from typing import Optional
from functools import wraps
from utils import cache
from fastapi.requests import Request
from fastapi.responses import JSONResponse
import logging
import json

logger = logging.getLogger(__name__)

def response_cache(ttl: Optional[int] = 60):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            req: Request = kwargs.get("request")
            user: dict = kwargs.get("current_user")
            user_id: int = user.get("user_id") if user else "anonymous"

            # if request is not present, skip caching (e.g., for non-FastAPI functions)
            if not req:
                logger.info("Request object not found in kwargs, skipping cache")
                return await func(*args, **kwargs)
            
            # extract request url from it, including the query parameters and store it as the cache key
            formatted_user_id = f"USER-{user_id:04d}" if type(user_id) is int else user_id
            key = f"{formatted_user_id}:{req.url.path}?{req.url.query}"

            # check for cache hit
            cached_response = await cache.get(key)
            logger.info(f"Cache lookup for key: {key}, value: {cached_response}")
            if cached_response is not None:
                logger.info("[{key}]: Cache hit".format(key=key))
                return cached_response
            
            # cache miss - call the original function and cache its response
            logger.info("[{key}]: Cache Miss".format(key=key))
            try:
                response: JSONResponse = await func(*args, **kwargs)
                parsed_response = response.body.decode() if isinstance(response.body, bytes) else str(response.body)
                parsed_response = json.loads(parsed_response) if parsed_response else {}
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Cache storage failed: {e}")
                return response 


            # only store success response in cache and ignore error response
            if parsed_response['status'] != 'success':
                logger.info(f"Response status is not success, skipping cache storage. Response: {parsed_response}")
                return response

            await cache.set(key, parsed_response, ttl)
            return response
        return wrapper
    return decorator
