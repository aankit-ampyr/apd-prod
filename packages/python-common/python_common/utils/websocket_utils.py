
import asyncio
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket
from fastapi.websockets import WebSocketState
import asyncio

logger = logging.getLogger(__name__)

class WebSocketManager:
    # ======================= singleton pattern =======================
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WebSocketManager, cls).__new__(cls)
        return cls._instance

    # ======================= initialize the websocket manager =======================
    def __init__(self):
        # ======================= stores active connections by user_id =======================
        if not hasattr(self, "initialized"):
            self.active_connections: Dict[int, List[WebSocket]] = {}
            self.loop: Optional[asyncio.AbstractEventLoop] = None
            self._connection_lock = asyncio.Lock()
            self.initialized = True

    async def connect(self, user_id: int, websocket: WebSocket):
        # ======================= connect the websocket =======================
        if self.loop is None:
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                logger.warning(
                    "WebSocketManager: unable to capture running loop during connect"
                )

        async with self._connection_lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)

            logger.info(
                f"user has been connected to the websocker manager successfully\nuser_id: {user_id}\nsocket_manager_id: {id(self)}"
            )

    async def disconnect(self, user_id: int, websocket: WebSocket):

        # ======================= disconnect the websocket =======================
        async with self._connection_lock:
            if user_id in self.active_connections:
                try:
                    self.active_connections[user_id].remove(websocket)
                except ValueError:
                    logger.debug(
                        "WebSocketManager: connection already removed for user %s",
                        user_id,
                    )

                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

    def _is_connection_alive(self, websocket: WebSocket) -> bool:

        return (
            websocket.client_state == WebSocketState.CONNECTED
            and websocket.application_state == WebSocketState.CONNECTED
        )

    async def send_personal_message(self, message: dict, user_id: int):
        logger.info(
            f"\n\nsending personal message\nmessage: {message}\nuser_id: {user_id}\nsocket_manager_id: {id(self)}"
        )
        # ======================= send the message to the specific user =======================
        if user_id not in self.active_connections:
            return

        async with self._connection_lock:
            connections = list(self.active_connections.get(user_id, []))

        dead_connections = []
        for connection in connections:
            if not self._is_connection_alive(connection):
                dead_connections.append(connection)
                continue

            try:
                await connection.send_json(message)
            except Exception as exc:
                dead_connections.append(connection)
                logger.error(
                    "WebSocketManager: failed to send message to user %s: %s",
                    user_id,
                    exc,
                )

        if dead_connections:
            async with self._connection_lock:
                if user_id in self.active_connections:
                    for dead_conn in dead_connections:
                        try:
                            self.active_connections[user_id].remove(dead_conn)
                        except ValueError:
                            pass  # Already removed

                    if not self.active_connections[user_id]:
                        del self.active_connections[user_id]
                        logger.info(
                            f"WebSocketManager: removed user {user_id} after cleaning dead connections"
                        )

    def schedule_personal_message(self, message: dict, user_id: int):
        # ======================= schedule a message from non-async contexts =======================
        if self.loop is None or self.loop.is_closed():
            logger.debug(
                "WebSocketManager: no active loop to schedule message for user %s",
                user_id,
            )
            return

        try:
            future = asyncio.run_coroutine_threadsafe(
                self.send_personal_message(message, user_id), self.loop
            )
            future.result(timeout=5.0)

        except TimeoutError:

            logger.error(
                f"WebSocketManager: timeout scheduling message for user {user_id}"
            )
        except Exception as exc:
            logger.error(
                "WebSocketManager: failed to schedule message for user %s: %s",
                user_id,
                exc,
            )

    async def broadcast(self, message: dict):
        # ======================= send the message to all connected users =======================
        queue = []
        for user_id in list(self.active_connections.keys()):
            queue.append(self.send_personal_message(message, user_id))

        await asyncio.gather(*queue)

        # async with self._connection_lock:
        #     for user_id in list(self.active_connections.keys()):
        #         await self.send_personal_message(message, user_id)
    
    async def broadcast_to_users(self, message: dict, ids: List[int]):
        # ======================= send the message to all patients =======================
        queue = []
        async with self._connection_lock:
            for id in ids:
                queue.append(self.send_personal_message(message, id))
        asyncio.gather(*queue)

    async def get_ws_clients(self):
        # ======================= get the list of all connected users =======================
        async with self._connection_lock:
            return list(self.active_connections.keys())

    async def handle_pong(self, user_id: int):
        """Handle pong message from client"""
        async with self._connection_lock:
            # if connection does not exists
            if user_id not in self.active_connections:
                return

            for connection in self.active_connections[user_id]:

                # is connection is not alive
                if not self._is_connection_alive(connection):
                    return

                await connection.send_json({"type": "ping"})

    def is_user_online(self, user_id: int) -> bool:
        if user_id not in self.active_connections:
            return False
        
        connections = self.active_connections.get(user_id, [])
        for connection in connections:
            if self._is_connection_alive(connection):
                return True
        return False


websocket_manager = WebSocketManager()