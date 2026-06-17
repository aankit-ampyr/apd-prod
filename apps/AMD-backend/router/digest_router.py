from fastapi import APIRouter
from controller.digest_controller import DigestController

class DigestRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/digests"
        self.tags = ["Digest Management"]
        self.controller = DigestController()

        self.router.get("/")(self.controller.get_digests)
        self.router.post("/")(self.controller.create_digest)
        self.router.put("/{digest_id}")(self.controller.update_digest)