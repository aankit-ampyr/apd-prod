from python_common.utils import (
    create_ephemeral_ws_token,
    verify_ephemeral_ws_token,
    Res,
    websocket_manager,
)
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import WebSocket, WebSocketDisconnect
import asyncio


class SocketService:
    def get_ws_token(self, current_user: dict):
        ephemeral_ws_token = create_ephemeral_ws_token(current_user)
        return Res.success(
            "S-10053",
            data={
                "user_id": current_user.get("id"),
                "ephemeral_token": ephemeral_ws_token,
            },
        )

    async def handle_websocket_connection(self, db: AsyncSession, websocket: WebSocket):
        user_id = None
        try:
            print("in socket handler")
            token = websocket.query_params.get("token")
            print(f"{token=}")
            if not token:
                await websocket.close(code=1008, reason="Missing token")
                return

            payload = verify_ephemeral_ws_token(token)
            if not payload:
                await websocket.close(code=1008, reason="Invalid or expired token")
                return
            user_id = payload.get("id")
            if not user_id:
                await websocket.close(code=1008, reason="Invalid token payload")
                return

            current_user = {
                "id": user_id,
                "role": payload.get("role"),
                "email": payload.get("email"),
            }

            await websocket_manager.connect(user_id, websocket)

            while True:
                await asyncio.sleep(60)

        except WebSocketDisconnect:
            if user_id is not None:
                websocket_manager.disconnect(user_id, websocket)

        except Exception:
            if user_id is not None:
                websocket_manager.disconnect(user_id, websocket)

        finally:
            if user_id:
                websocket_manager.disconnect(user_id, websocket)

            try:
                await websocket.close()
            except Exception:
                pass

