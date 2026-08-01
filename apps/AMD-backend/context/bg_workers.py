from constants.defaults import LOGS_STREAM_CHANEL
from constants.enums import APDAuditLogModules, UserRole
from .sub_decorator import redis_subscriber
from python_common.utils import websocket_manager


@redis_subscriber(channel_name=LOGS_STREAM_CHANEL)
async def brodcast_logs(payload):
    print(f"Brodcasting throuth WS: {payload}")

    if payload.get("data", {}).get("role") == UserRole.ADMIN.value or payload.get(
        "data", {}
    ).get("module", {}).get("id") not in [m.value for m in APDAuditLogModules]:
        return
    await websocket_manager.broadcast(payload)
