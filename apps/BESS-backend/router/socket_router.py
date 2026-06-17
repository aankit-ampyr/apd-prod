from fastapi import APIRouter
from controller import SockerController


class SockerRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/websocket"
        self.controller = SockerController()
        self.tags = ["Web Socket"]

        # Load profile endpoints
        self.router.post("/auth")(self.controller.authenticate_websocket_connection)

        self.router.websocket("/")(self.controller.handle_websocket_connection)
