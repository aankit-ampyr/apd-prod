"""
Project Management routes for BESS platform.
"""

from controller.project_controller import ProjectController
from fastapi import APIRouter

class ProjectRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/projects"
        self.controller = ProjectController()
        self.tags = ["Project Management"]

        self.router.get("/")(self.controller.list_project)
        self.router.post("/")(self.controller.create_project)
        self.router.patch("/{project_id}")(self.controller.edit_project)
        self.router.delete("/{project_id}")(self.controller.delete_project)
        self.router.post("/{project_id}/restore")(self.controller.restore_project)
        self.router.post("/{project_id}/archive")(self.controller.archive_project)
        self.router.post("/{project_id}/unarchive")(self.controller.unarchive_project)
        # PATCH /api/v1/projects/{project_id}/reassign
        self.router.patch("/{project_id}/reassign")(self.controller.reassign_project)
        # self.router.post("/{project_id}/simulation")(
        #     self.controller.initiate_or_fetch_simulation
        # )
        self.router.get("/{project_id}/simulation")(self.controller.list_simulations)
        self.router.post("/{project_id}/simulation")(self.controller.initiate_simulation)

