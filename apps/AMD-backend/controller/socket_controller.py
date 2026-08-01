from services.socket_service import SocketService
from fastapi import Depends, WebSocket
from db.dependencies import allowed_roles
from db.db_config import SessionLocal
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession


class SocketController:
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
        try:
            await websocket.accept()

            async with SessionLocal() as db:
                try:
                    await self.service.handle_websocket_connection(db, websocket)
                except Exception:
                    await db.rollback()
                    raise

        except Exception:
            await websocket.close(
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                reason="Internal server error",
            )

