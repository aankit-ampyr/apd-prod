from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from context.dependencies import get_redis_conn
from redis.asyncio import Redis
from db.dependencies import get_db, allowed_roles, verify_asset_access
from services.asset_analysis_service import AnalysisService
from constants.enums import UserRole, Platform
from typing import List, Literal
from utils.response_utils import Res
from fastapi import Request
from python_common.constants.enums import Month
from models.asset import Asset


class AnalysisController:
    def __init__(self):
        self.service = AnalysisService()

    async def get_benchmark_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_benchmark_analysis(
            db=db, redis=redis, asset_id=asset.id, year=year, current_user=current_user
        )

    async def download_benchmark_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.download_benchmark_analysis(
            db=db, asset_id=asset.id, year=year, current_user=current_user
        )

    async def get_operations_summary(
        self,
        request: Request,
        asset: Asset = Depends(verify_asset_access),
        month: Month = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_operations_summary(
            db=db,
            redis=redis,
            asset_id=asset.id,
            month=month.value,
            year=year,
            current_user=current_user,
        )

    async def get_market_summary(
        self,
        request: Request, # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_market_summary(
            db, asset.id, month, year, current_user
        )

    async def get_asset_energy_price_comparison(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(),
        year: int = Query(),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        # Platform check
        return await self.service.get_asset_energy_price_comparison(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            current_user=current_user,
        )

    async def get_battery_power(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(),
        year: int = Query(),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        # Platform check
        return await self.service.get_battery_power(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            current_user=current_user,
        )

    async def get_market_analysis_summary(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_market_analysis_summary(
            db=db, asset_id=asset.id, month=month, year=year
        )

    async def get_market_utilization(
        self,
        request: Request,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),  # ← Add Query(...)
        year: int = Query(...),  # ← Add Query(...)
        market_strategy: Literal["multi", "epex_daily", "epex_efa", "actual"] = Query(
            ...
        ),  # ← Add Query(...)
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)

        return await self.service.get_market_utilization(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            market_strategy=market_strategy,
        )

    async def get_market_statistics_table(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        market_strategy: Literal["multi", "epex_daily", "epex_efa", "actual"] = Query(
            ...
        ),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_market_statistics_table(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            market_strategy=market_strategy,
            current_user=current_user,
        )

    async def download_market_statistics_table(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        market_strategy: Literal["multi", "epex_daily", "epex_efa", "actual"] = Query(
            ...
        ),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)

        return await self.service.download_market_statistics_table(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            market_strategy=market_strategy,
            current_user=current_user,
        )

    async def get_revenue_distribution_chart(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        market_strategy: Literal["multi", "epex_daily", "epex_efa", "actual"] = Query(
            ...
        ),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_revenue_distribution_chart(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            market_strategy=market_strategy,
            current_user=current_user,
        )

    async def get_best_markets(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_best_markets(
            db=db, asset_id=asset.id, month=month, year=year
        )

    async def export_best_markets(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        market_type: Literal["buy", "sell"] = Query(...),  # "buy" or "sell"
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.export_best_markets(
            db=db, asset_id=asset.id, month=month, year=year, market_type=market_type
        )

    async def get_price_spread_analysis(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_price_spread_analysis(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_price_volatility_analysis(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_price_volatility_analysis(
            db=db, asset_id=asset.id, month=month, year=year
        )

    async def get_hourly_price_patterns(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", http_status_code=403)

        return await self.service.get_hourly_price_patterns(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_price_correlation_matrix(
        self,
        request: Request,  # to capture the request for caching purposes
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_price_correlation_matrix(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_revenue_iar_vs_actual(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_revenue_iar_vs_actual(
            db=db, asset_id=asset.id, year=year, current_user=current_user
        )

    async def export_revenue_iar_vs_actual(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.export_revenue_iar_vs_actual(
            db=db, asset_id=asset.id, year=year, current_user=current_user
        )

    async def get_multi_market_optimized_vs_actual(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        # Platform validation
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_multi_market_optimized_vs_actual(
            db=db, asset_id=asset.id, year=year, current_user=current_user
        )

    async def export_multi_market_optimized_vs_actual(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value,
                UserRole.ANALYST.value,
                UserRole.MANAGER.value,
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.export_multi_market_optimized_vs_actual(
            db=db, asset_id=asset.id, year=year, current_user=current_user
        )

    async def get_ancillary_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_ancillary_summary(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_ancillary_breakdown(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_ancillary_breakdown(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def export_ancillary_breakdown(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.export_ancillary_breakdown(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_service_revenue_by_hour(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_service_revenue_by_hour(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_opportunity_cost_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_opportunity_cost_analysis(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_imbalance_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user=Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_imbalance_summary(
            db, asset.id, month, year, current_user
        )

    async def get_imbalance_hourly_charges(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user=Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_imbalance_hourly_charges(
            db, asset.id, month, year, current_user
        )

    async def get_daily_imbalance_breakdown(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_daily_imbalance_breakdown(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_top_5_worst_imbalance_days(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_top_5_worst_imbalance_days(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def export_top_5_worst_imbalance_days(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_top_5_worst_imbalance_days(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_battery_health_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_battery_health_analysis(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_cycle_comparison(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_cycle_comparison(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_strategy_cycling_comparison(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        cycle_method: Literal[
            "discharge-only", "full-equivalent", "throughput-based"
        ] = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_strategy_cycling_comparison(
            db, asset.id, month, year, cycle_method, current_user
        )

    async def get_annual_projection_report(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        cycle_method: Literal[
            "discharge-only", "full-equivalent", "throughput-based"
        ] = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_annual_projection_report(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            cycle_method=cycle_method,
            current_user=current_user,
        )

    async def get_tb_spread_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_tb_spread_summary(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_tb_spread_details(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_tb_spread_details(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def export_tb_spread_details(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_tb_spread_details(
            db=db, asset_id=asset.id, month=month, year=year, current_user=current_user
        )

    async def get_warranty_limit_exceedance(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        cycle_method: Literal[
            "discharge-only", "full-equivalent", "throughput-based"
        ] = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_warranty_limit_exceedance(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            cycle_method=cycle_method,
            current_user=current_user,
        )

    async def get_daily_cycles(
        self,
        asset: Asset = Depends(verify_asset_access),
        month: int = Query(...),
        year: int = Query(...),
        cycle_method: Literal[
            "discharge-only", "full-equivalent", "throughput-based"
        ] = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_daily_cycles(
            db=db,
            asset_id=asset.id,
            month=month,
            year=year,
            cycle_method=cycle_method,
            current_user=current_user,
        )

    async def get_revenue_by_stream_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        months: List[int] = Query(None),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_revenue_by_stream_analysis(
            db=db,
            redis=redis,
            asset_id=asset.id,
            year=year,
            months=months,
            current_user=current_user,
        )

    async def get_monthly_revenue_comparison(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        month: int = Query(None),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.get_monthly_revenue_comparison(
            db=db,
            redis=redis,
            asset_id=asset.id,
            year=year,
            month=month,
            current_user=current_user,
        )

    async def export_revenue_by_stream_analysis(
        self,
        asset: Asset = Depends(verify_asset_access),
        months: List[int] = Query(None),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_revenue_by_stream_analysis(
            db=db,
            asset_id=asset.id,
            months=months,
            year=year,
            current_user=current_user,
        )

    async def export_monthly_revenue_comparison(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        months: List[int] = Query(None),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_monthly_revenue_comparison(
            db=db,
            asset_id=asset.id,
            year=year,
            months=months,
            current_user=current_user,
        )

    async def get_executive_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        redis: Redis = Depends(get_redis_conn),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        return await self.service.get_executive_summary(
            db=db,
            redis=redis,
            asset_id=asset.id,
            year=year,
            current_user=current_user,
        )

    async def export_executive_summary(
        self,
        asset: Asset = Depends(verify_asset_access),
        year: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(UserRole.ADMIN.value, UserRole.MANAGER.value)
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_executive_summary(
            db=db,
            asset_id=asset.id,
            year=year,
            current_user=current_user,
        )

    async def export_strategy_energy_throughput_summary(
        self,
        asset_id: int,
        year: int = Query(...),
        month: int = Query(...),
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(
            allowed_roles(
                UserRole.ADMIN.value, UserRole.ANALYST.value, UserRole.MANAGER.value
            )
        ),
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )
        return await self.service.export_strategy_energy_throughput_summary(
            db=db, asset_id=asset_id, year=year, month=month, current_user=current_user
        )
