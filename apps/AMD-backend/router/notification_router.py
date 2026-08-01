# ── router/notification_router.py ──

from fastapi import APIRouter
from controller.notification_controller import NotificationController

class NotificationRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/notifications"
        self.tags = ["Notifications"]

        self.controller = NotificationController()

        # ── Notification Routes ──────────────────────────────────────────────
        self.router.get("/active")(self.controller.get_active_notifications)
        self.router.patch("/{notification_id}/read")(self.controller.mark_notification_read)
