from fastapi import Depends
from context.dependency import get_resource_id
from constants.enums import UserRole
from db.dependencies import allowed_roles, get_bess_db
from utils.response_utils import Res
from dtos.simulation_dto import (
    LoadProfilePayload,
    BessConfigPayload,
    DGConfigPayload,
    FuelCoefficients,
    DispatchRulePayload,
    BessDgSizingPayload,
    CustomSimulationConfigPayload,
    MultiYearCalculation,
    GreenEnergyConfig,
)
from services import (
    LoadSimulationService,
    ContainerConfigService,
    DGConfigService,
    DispatchRuleService,
    BessDGService,
    SimulationService,
    CustomSimConfigService,
    MultiYearSimService,
    GreenEnergyConfigService,
)

from sqlalchemy.ext.asyncio import AsyncSession


class SimulationSetupController:
    def __init__(self):
        self.load_service = LoadSimulationService()
        self.bess_config_service = ContainerConfigService()
        self.dg_config_service = DGConfigService()
        self.dispatch_rule_service = DispatchRuleService()
        self.bess_dg_service = BessDGService()
        self.simulation_service = SimulationService()
        self.custom_config_service = CustomSimConfigService()
        self.multi_y_config_service = MultiYearSimService()
        self.green_energy_service = GreenEnergyConfigService()

    async def compute_load_profile(self, payload: LoadProfilePayload):
        return await self.load_service.compute_load_profile(payload=payload)

    async def compute_and_save_load_profile(
        self,
        simulation_id: int,
        payload: LoadProfilePayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.load_service.compute_and_save_load_profile(
            simulation_id=simulation_id,
            payload=payload,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_load_profile(self, simulation_id: int, bess_db=Depends(get_bess_db)):
        return await self.load_service.get_load_profile(
            simulation_id=simulation_id, bess_db=bess_db
        )

    async def save_bess_config(
        self,
        simulation_id: int,
        payload: BessConfigPayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.bess_config_service.create_or_update_container_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_bess_config(self, simulation_id: int, bess_db=Depends(get_bess_db)):
        return await self.bess_config_service.get_container_config(
            bess_db=bess_db, simulation_id=simulation_id
        )

    async def get_dg_config(self, simulation_id: int, bess_db=Depends(get_bess_db)):
        return await self.dg_config_service.get_config(
            simulation_id=simulation_id, bess_db=bess_db
        )

    async def upsert_dg_config(
        self,
        simulation_id: int,
        payload: DGConfigPayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.dg_config_service.upsert_config(
            simulation_id=simulation_id,
            payload=payload,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def fuel_curve_calculation(
        self, simulation_id: int, payload: FuelCoefficients
    ):
        return self.dg_config_service.fuel_curve_calculation(
            simulation_id=simulation_id, payload=payload
        )

    async def upsert_dispatch_rules(
        self,
        simulation_id: int,
        payload: DispatchRulePayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.dispatch_rule_service.upsert_dispatch_rule(
            simulation_id=simulation_id,
            payload=payload,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_dispatch_rules(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
    ):
        return await self.dispatch_rule_service.get_dispatch_rule(
            simulation_id=simulation_id,
            bess_db=bess_db,
        )

    async def upsert_bess_dg_sizing(
        self,
        simulation_id: int,
        payload: BessDgSizingPayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.bess_dg_service.create_or_update_bess_dg_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_bess_dg_sizing(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
    ):
        return await self.bess_dg_service.get_bess_dg_config(
            bess_db=bess_db, simulation_id=simulation_id
        )

    async def update_simulation(
        self,
        simulation_id: int,
        payload: dict,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
    ):
        try:
            return await self.simulation_service.update_simulation(
                bess_db=bess_db,
                simulation_id=simulation_id,
                name=payload.get("name"),  # type: ignore
                current_user=current_user,
                resource_id=resource_id,
            )
        except Exception:
            return Res.error("E-20001")

    async def delete_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN)),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.simulation_service.delete_simulation(
            bess_db=bess_db,
            simulation_id=simulation_id,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_simulation_details(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
    ):
        return await self.simulation_service.get_simulation_details(
            bess_db=bess_db, simulation_id=simulation_id, current_user=current_user
        )

    async def upsert_custom_config(
        self,
        simulation_id: int,
        payload: CustomSimulationConfigPayload,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.custom_config_service.create_or_update_custom_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_custom_config(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
    ):
        return await self.custom_config_service.get_custom_config(
            bess_db=bess_db, simulation_id=simulation_id
        )

    async def get_multi_year_projection(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
    ):
        return await self.multi_y_config_service.get_or_create_multi_y_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            current_user=current_user,
        )

    async def compute_multi_year_projection(
        self,
        simulation_id: int,
        payload: MultiYearCalculation,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
    ):
        return await self.multi_y_config_service.calc_create_multi_y_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            config=payload,
            current_user=current_user,
        )

    async def save_multi_year_projection(
        self,
        simulation_id: int,
        payload: MultiYearCalculation,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
    ):
        return await self.multi_y_config_service.save_multi_y_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            config=payload,
            current_user=current_user,
        )

    async def upsert_green_energy_config(
        self,
        simulation_id: int,
        payload: GreenEnergyConfig,
        bess_db=Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.MANAGEMENT,
                UserRole.SUPER_ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.green_energy_service.create_or_update_config(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_green_energy_config(
        self,
        simulation_id: int,
        bess_db=Depends(get_bess_db),
    ):
        return await self.green_energy_service.get_green_config(
            bess_db=bess_db, simulation_id=simulation_id
        )
