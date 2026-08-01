from constants.defaults import LOGS_STREAM_CHANEL
from constants.enums import PSPAuditLogModules, UserRole
from decorators.subs_decorator import redis_subscriber
from python_common.utils import websocket_manager


@redis_subscriber(channel_name=LOGS_STREAM_CHANEL)
async def brodcast_logs(payload):
    print(f"Brodcasting throuth WS: {payload}")

    if payload.get("data", {}).get("role") == UserRole.ADMIN or payload.get(
        "data", {}
    ).get("module") not in [m.value for m in PSPAuditLogModules.__members__.values()]:
        return

    await websocket_manager.broadcast(payload)
