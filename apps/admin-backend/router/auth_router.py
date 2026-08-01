from fastapi import APIRouter
from controller.auth_controller import AuthController


class AuthRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/auth"
        self.tags = ["Auth"]
        self.controller = AuthController()
        self.tags = ["Authentication"]

        self.router.post("/login/send-otp")(self.controller.request_otp)
        self.router.post("/login/verify-otp")(self.controller.verify_otp)
        self.router.post("/logout")(self.controller.logout)
        self.router.post("/refresh")(self.controller.refresh_token)
