# ── router/comment_router.py ──

from fastapi import APIRouter
from controller.comment_controller import CommentController


class CommentRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/assets/{asset_id}/comments"
        self.tags = ["Comments"]

        self.controller = CommentController()

        # ── Comment Routes ──────────────────────────────────────────────────
        self.router.post("/")(self.controller.create_comment)
        self.router.get("/")(self.controller.list_comments)
        self.router.put("/{comment_id}")(self.controller.update_comment)
        self.router.delete("/{comment_id}")(self.controller.delete_comment)
        self.router.post("/{comment_id}/reply")(self.controller.reply_to_comment)
        self.router.patch("/{comment_id}/read")(self.controller.mark_comment_read)
        self.router.get("/{comment_id}/status")(self.controller.get_comment_status)
       
        # ── Tagging Routes ───────────────────────────────────────────────────
        self.router.get("/users/taggable")(self.controller.get_taggable_users)