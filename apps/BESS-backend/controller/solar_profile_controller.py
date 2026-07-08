from fastapi import Depends, UploadFile, File

from db.dependencies import get_bess_db, allowed_roles
from constants.enums import UserRole
from dtos.solar_profile_dto import SolarProfileComputeRequest
from services.solar_profile_service import SolarProfileService
from context.dependency import get_resource_id


class SolarProfileController:
    def __init__(self):
        self.service = SolarProfileService()

    async def upload_csv(
        self,
        simulation_id: int,
        file: UploadFile = File(...),
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
    ):
        return await self.service.upload_solar_profile_csv(
            bess_db=bess_db,
            simulation_id=simulation_id,
            file=file,
            current_user=current_user,
        )

    async def compute(
        self,
        simulation_id: int,
        payload: SolarProfileComputeRequest,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
    ):
        return await self.service.compute_solar_profile(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            is_saved=False,
        )

    async def compute_and_save(
        self,
        simulation_id: int,
        payload: SolarProfileComputeRequest,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.service.compute_and_save_solar_profile(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_details(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGEMENT, UserRole.VIEWER
            )
        ),
    ):
        return await self.service.get_solar_profile(
            bess_db=bess_db, simulation_id=simulation_id
        )

    async def get_files(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGEMENT, UserRole.VIEWER
            )
        ),
    ):
        return await self.service.get_solar_profile_files(
            bess_db=bess_db, simulation_id=simulation_id
        )
