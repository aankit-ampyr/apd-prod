from fastapi import APIRouter
from controller import SocketController


class SocketRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/websocket"
        self.controller = SocketController()
        self.tags = ["Web Socket"]

        self.router.post("/auth")(self.controller.authenticate_websocket_connection)
        self.router.websocket("/")(self.controller.handle_websocket_connection)