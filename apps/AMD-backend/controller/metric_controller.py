from fastapi import Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from db.dependencies import get_db, allowed_roles
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from services.metric_service import MetricService
from constants.enums import UserRole
from utils import Res
from constants.enums import Platform
from dtos import BenchmarkUpdateRequest, MonthlyValueUpdateRequest
from typing import List

class MetricController:
    def __init__(self):
        self.service = MetricService()

    async def get_benchmarks(
        self,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.get_benchmarks(db)

    async def update_benchmarks(
        self,
        payload: BenchmarkUpdateRequest,
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
        backgroundTask: BackgroundTasks = BackgroundTasks()
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        return await self.service.update_benchmarks(
            db=db,
            redis=redis,
            payload=payload,
            current_user=current_user,
            backgroundTask=backgroundTask
        )

    async def get_monthly_values(
            self,
            month: List[int] = Query(None),
            year: List[int] = Query(None),
            db: AsyncSession = Depends(get_db)
        ):
            return await self.service.get_monthly_hardcoded_values(db, month, year)

    async def save_monthly_values(
        self,
        payload: MonthlyValueUpdateRequest,
        backgroundTask: BackgroundTasks,
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(allowed_roles(UserRole.ADMIN.value)),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
             return Res.error("E-10013", message="Unauthorized: AMD platform required")
        
        return await self.service.save_monthly_hardcoded_values(db, redis, payload, current_user, backgroundTask)
    
    async def get_modo_energy_monthly_benchmark(
        self,
        month: int =  Query(),
        year: int =  Query(),
        # although we are not using current user, we need the dependency to make it protected
        _: dict = Depends(allowed_roles(UserRole.ADMIN.value))
    ):
        return await self.service.get_modo_energy_monthly_benchmark(month=month, year=year)
