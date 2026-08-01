import asyncio
import json
import logging
import functools
import redis.asyncio as redis
from redis.asyncio import Redis

logger = logging.getLogger()


def redis_subscriber(channel_name):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(redis_client: Redis, *args, **kwargs):
            retry_delay = 1
            while True:
                try:
                    # Create a pubsub object from the shared client
                    async with redis_client.pubsub() as pubsub:
                        await pubsub.subscribe(channel_name)
                        print(f"SUCCESS: Listening on Redis channel: {channel_name}")
                        retry_delay = 1

                        async for message in pubsub.listen():
                            if message["type"] == "message":
                                try:
                                    # Automatically parse the JSON payload
                                    payload = json.loads(message["data"])
                                    # Pass the payload to your function
                                    await func(payload, *args, **kwargs)
                                except json.JSONDecodeError:
                                    logger.info(
                                        f"Failed to decode message: {message['data']}"
                                    )
                                except Exception as e:
                                    logger.error(f"Error in subscriber function: {e}")
                except (redis.TimeoutError, asyncio.TimeoutError):
                    # Just log and retry, timeouts are expected in PubSub if not configured to block forever
                    logger.debug(f"Redis PubSub timeout on {channel_name}, retrying...")
                    continue
                except redis.ConnectionError as e:
                    print(
                        f"Redis connection error on channel {channel_name}: {e}. Retrying in {retry_delay}s..."
                    )
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)
                except Exception as e:
                    print(
                        f"Unexpected error in Redis subscriber for {channel_name}: {e}"
                    )
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(retry_delay * 2, 60)

        return wrapper

    return decorator
