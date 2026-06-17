from fastapi import APIRouter, Depends

from controller.solar_profile_controller import SolarProfileController
from context.dependency import verify_simulation_active


class SolarProfileRouter:
    def __init__(self):
        self.router = APIRouter(dependencies=[Depends(verify_simulation_active)])
        self.endpoint = "/simulation"
        self.controller = SolarProfileController()
        self.tags = ["Solar Profile"]

        self.router.post("/{simulation_id}/solar-profile/upload")(
            self.controller.upload_csv
        )
        self.router.post("/{simulation_id}/solar-profile/compute")(
            self.controller.compute
        )
        self.router.post("/{simulation_id}/solar-profile")(
            self.controller.compute_and_save
        )

        self.router.get("/{simulation_id}/solar-profile")(self.controller.get_details)
        self.router.get("/{simulation_id}/solar-profile/files")(
            self.controller.get_files
        )
