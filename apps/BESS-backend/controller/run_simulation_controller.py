from datetime import datetime
from fastapi import Depends, Query
from typing import List, Optional
from redis.asyncio import Redis
from context.dependency import get_resource_id, get_redis_conn
from constants.enums import UserRole, Month
from db.dependencies import allowed_roles, get_bess_db
from services import (
    RunSizingSimulationService,
    RunGreenEnergySimulationService,
    RunDetailedGreenSimulationService,
)
from sqlalchemy.ext.asyncio import AsyncSession

from services.run_simulation_service import RunSingleSimulationService
from services.run_multi_year_sim_service import RunMultiYearSimulationService
from .simulation_setup_controller import SimulationSetupController


class RunSimulationController(SimulationSetupController):
    def __init__(self):
        super().__init__()
        self.run_sizing_sim_service = RunSizingSimulationService()
        self.run_single_sim_service = RunSingleSimulationService()
        self.run_multi_year_sim_service = RunMultiYearSimulationService()
        self.run_green_energy_sim_service = RunGreenEnergySimulationService()
        self.run_detailed_green_sim_service = RunDetailedGreenSimulationService()

    async def run_sizing_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_sizing_sim_service.run_sizing_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def stop_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_sizing_sim_service.stop_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            redis=redis,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_simulation_progress(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
    ):
        return await self.run_sizing_sim_service.get_simulation_progress(
            simulation_id=simulation_id, bess_db=bess_db
        )

    async def get_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        page: int = Query(1, ge=1),
        limit: int = Query(100, ge=1),
        dg_capacity: Optional[List[float]] = Query(None),
        bess_capacity: Optional[List[float]] = Query(None),
        duration_hr: Optional[List[float]] = Query(None),
        delivery_percentage: Optional[float] = Query(None),
        dg_runtime_hours: Optional[float] = Query(None),
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_sizing_sim_service.get_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            page=page,
            limit=limit,
            dg_capacity=dg_capacity,
            bess_capacity=bess_capacity,
            duration_hr=duration_hr,
            delivery_percentage=delivery_percentage,
            dg_runtime_hours=dg_runtime_hours,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def export_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        dg_capacity: Optional[List[float]] = Query(None),
        bess_capacity: Optional[List[float]] = Query(None),
        duration_hr: Optional[List[float]] = Query(None),
        delivery_percentage: Optional[float] = Query(None),
        dg_runtime_hours: Optional[float] = Query(None),
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_sizing_sim_service.export_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            dg_capacity=dg_capacity,
            bess_capacity=bess_capacity,
            duration_hr=duration_hr,
            delivery_percentage=delivery_percentage,
            dg_runtime_hours=dg_runtime_hours,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    # Single Sizing simulation
    async def run_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_single_sim_service.run_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def get_single_hourly_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        page: int = Query(1, ge=1),
        limit: int = Query(100, ge=1),
        start_time: Optional[datetime] = Query(None),
        end_time: Optional[datetime] = Query(None),
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_single_sim_service.get_simulation_hourly_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            page=page,
            limit=limit,
            start_time=start_time,
            end_time=end_time,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_single_hourly_simulation_chart_results(
        self,
        simulation_id: int,
        start_timestamp: Optional[datetime] = Query(default=None),
        end_timestamp: Optional[datetime] = Query(default=None),
        bess_db: AsyncSession = Depends(get_bess_db),
    ):
        return await self.run_single_sim_service.get_simulation_hourly_chart_results(
            simulation_id=simulation_id,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            bess_db=bess_db,
        )

    async def export_single_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        start_time: Optional[datetime] = Query(None),
        end_time: Optional[datetime] = Query(None),
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_single_sim_service.export_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            start_time=start_time,
            end_time=end_time,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def get_single_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.MANAGEMENT
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_single_sim_service.get_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def run_multi_year_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_multi_year_sim_service.run_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def stop_multi_year_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_multi_year_sim_service.stop_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            redis=redis,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_multi_year_simulation_results(
        self,
        simulation_id: int,
        until_year: int = Query(20),
        sort: Optional[List[str]] = Query(None),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGEMENT, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_multi_year_sim_service.get_simulation_results(
            simulation_id=simulation_id,
            until_year=until_year,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            sort=sort,
            redis=redis,
        )

    async def get_multi_year_simulation_progress(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
    ):
        return await self.run_multi_year_sim_service.get_simulation_progress(
            simulation_id=simulation_id, bess_db=bess_db
        )

    async def export_multi_year_simulation_results(
        self,
        simulation_id: int,
        until_year: int = Query(20),
        sort: Optional[List[str]] = Query(None),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_multi_year_sim_service.export_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            until_year=until_year,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def get_monthly_simulation_result(
        self,
        simulation_id: int,
        month: Optional[List[Month]] = Query(None),
        sort: Optional[str] = Query(None),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_single_sim_service.get_monthly_simulation_result(
            simulation_id=simulation_id,
            months=month,
            bess_db=bess_db,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def export_monthly_simulation_results(
        self,
        simulation_id: int,
        month: Optional[List[Month]] = Query(None),
        sort: Optional[str] = Query(None),
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_single_sim_service.export_monthly_simulation_results(
            simulation_id=simulation_id,
            months=month,
            bess_db=bess_db,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def run_green_energy_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_green_energy_sim_service.run_sizing_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def stop_green_energy_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN,
                UserRole.ANALYST,
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_green_energy_sim_service.stop_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            redis=redis,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def get_green_energy_simulation_progress(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
    ):
        return await self.run_green_energy_sim_service.get_simulation_progress(
            simulation_id=simulation_id, bess_db=bess_db
        )

    async def get_green_energy_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        page: int = Query(1, ge=1),
        limit: int = Query(100, ge=1),
        solar_capacity: Optional[List[float]] = Query(None),
        dg_capacity: Optional[List[float]] = Query(None),
        bess_capacity: Optional[List[float]] = Query(None),
        duration_hr: Optional[List[float]] = Query(None),
        viable_only: bool = False,
        delivery_100_only: bool = False,
        zero_dg_hours_only: bool = False,
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.MANAGEMENT
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_green_energy_sim_service.get_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            page=page,
            limit=limit,
            solar_capacity=solar_capacity,
            dg_capacity=dg_capacity,
            bess_capacity=bess_capacity,
            duration_hr=duration_hr,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            viable_only=viable_only,
            delivery_100_only=delivery_100_only,
            zero_dg_hours_only=zero_dg_hours_only,
            redis=redis,
        )

    async def export_green_energy_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        solar_capacity: Optional[List[float]] = Query(None),
        dg_capacity: Optional[List[float]] = Query(None),
        bess_capacity: Optional[List[float]] = Query(None),
        duration_hr: Optional[List[float]] = Query(None),
        viable_only: bool = False,
        delivery_100_only: bool = False,
        zero_dg_hours_only: bool = False,
        sort: Optional[List[str]] = Query(None),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.MANAGEMENT, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_green_energy_sim_service.export_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            solar_capacity=solar_capacity,
            dg_capacity=dg_capacity,
            bess_capacity=bess_capacity,
            duration_hr=duration_hr,
            viable_only=viable_only,
            delivery_100_only=delivery_100_only,
            zero_dg_hours_only=zero_dg_hours_only,
            sort=sort,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def run_detailed_green_simulation(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN, UserRole.ANALYST)),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return await self.run_detailed_green_sim_service.run_simulation(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
            redis=redis,
        )

    async def get_detailed_green_simulation_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER, UserRole.MANAGEMENT
            )
        ),
        resource_id: str = Depends(get_resource_id),
    ):
        return await self.run_detailed_green_sim_service.get_simulation_results(
            simulation_id=simulation_id,
            bess_db=bess_db,
            current_user=current_user,
            resource_id=resource_id,
        )

    async def export_detailed_green_hourly_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return (
            await self.run_detailed_green_sim_service.export_hourly_simulation_results(
                simulation_id=simulation_id,
                bess_db=bess_db,
                current_user=current_user,
                resource_id=resource_id,
                redis=redis,
            )
        )

    async def export_detailed_green_monthly_results(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.ANALYST, UserRole.VIEWER
            )
        ),
        resource_id: str = Depends(get_resource_id),
        redis: Redis = Depends(get_redis_conn),
    ):
        return (
            await self.run_detailed_green_sim_service.export_monthly_simulation_results(
                simulation_id=simulation_id,
                current_user=current_user,
                resource_id=resource_id,
                bess_db=bess_db,
                redis=redis,
            )
        )

    async def get_detailed_green_simulation_progress(
        self,
        simulation_id: int,
        bess_db: AsyncSession = Depends(get_bess_db),
    ):
        return await self.run_detailed_green_sim_service.get_simulation_progress(
            simulation_id=simulation_id, bess_db=bess_db
        )
