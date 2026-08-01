from services import SocketService
from fastapi import Depends, WebSocket
from db.dependencies import allowed_roles
from fastapi import status


class SockerController:
    def __init__(self):
        self.service = SocketService()

    async def authenticate_websocket_connection(
        self, current_user: dict = Depends(allowed_roles())
    ):
        return self.service.get_ws_token(current_user)

    async def handle_websocket_connection(
        self,
        websocket: WebSocket,
    ):

        # handle the websocket connection
        try:
            # accept the connection
            await websocket.accept()
            await self.service.handle_websocket_connection(websocket)

        except Exception as e:
            await websocket.close(
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                reason="Internal server error",
            )
