import inspect
import traceback
import json
from utils.response_utils import Res

def sse_stream(gen_func):
    def wrapper(*args, **kwargs):
        try:
            result = gen_func(*args, **kwargs)

            # async generator
            if inspect.isasyncgen(result):
                async def async_wrapper():
                    try:
                        async for chunk in result:
                            yield chunk
                            if is_terminal_event(chunk):
                                return
                    except Exception as e:
                        # Handle errors during async iteration
                        traceback.print_exc()
                        yield Res.streaming_error("E-10001", str(e))
                        return
                return async_wrapper()

            # sync generator
            else:
                def sync_wrapper():
                    try:
                        for chunk in result:
                            yield chunk
                            if is_terminal_event(chunk):
                                return
                    except Exception as e:
                        # Handle errors during sync iteration
                        traceback.print_exc()
                        yield Res.streaming_error("E-10001", str(e))
                        return
                return sync_wrapper()
                    
        except Exception as e:
            # Handle errors during generator creation
            traceback.print_exc()
            def error_wrapper():
                yield Res.streaming_error("E-10001", str(e))
            return error_wrapper()

    return wrapper


def is_terminal_event(chunk: str) -> bool:
    # SSE format:
    # event: success
    # data: {...}
    lines = chunk.split('\n')

    for line in lines:
        if line.startswith('event:'):
            event = line.replace('event:', '').strip()
            return event in ('success', 'error')

    return False
 