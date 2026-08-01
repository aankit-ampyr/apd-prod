from pydantic import BaseModel
from constants.enums import SocketEventType


class BaseEvent(BaseModel):
    type: SocketEventType


class SocketLogEvent(BaseEvent):
    data: dict
