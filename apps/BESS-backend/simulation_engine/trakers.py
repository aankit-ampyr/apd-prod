from constants.defaults import SIMULATION_UPDATES_CHANEL
from decorators.subs_decorator import redis_subscriber
from python_common.utils import websocket_manager


@redis_subscriber(channel_name=SIMULATION_UPDATES_CHANEL)
async def brodcast_message(payload):
    print(f"Brodcasting throuth WS: {payload}")
    await websocket_manager.broadcast(payload)
