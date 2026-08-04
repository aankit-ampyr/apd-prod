from typing import List, Any
from .asset_analysis_helper import AnalysisServiceHelper
from sqlalchemy.ext.asyncio import AsyncSession
from models import Asset, AssetFile
from sqlalchemy import select
from utils import Res, audit_logs
from redis.asyncio import Redis
from python_common.constants.enums import Month
from decorators.analysis_function_meta import asset_analytics_db_cache
from constants.enums import (
    AssetType,
    Platform,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
    AnalysisWidget,
    AnalysisSections,
    AnalysisModules,
    AssetFileType,
)
import calendar
from exceptions import ExceptionWithErrorCode
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
import traceback
import csv
import json
from pulp import *  # noqa: F403,F405
import logging
import io
from io import StringIO
from pprint import pprint

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self):
        self.helper = AnalysisServiceHelper()

    @asset_analytics_db_cache(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.REVENUE_VS_BENCHMARK,
        widget=AnalysisWidget.BENCHMARK_REVENUE_COMPARISON,
        index=["asset_id", "year"],
    )
    async def get_benchmark_analysis(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            if not year:
                return Res.error(
                    "E-10134",
                    message="Year parameter is required",
                    http_status_code=400,
                )

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034",
                    message=f"Asset with ID {asset_id} not found.",
                    http_status_code=404,
                )

            iar_file = await self.helper._get_iar_file_record(db=db, asset_id=asset_id)

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.BENCHMARK_ANALYSIS,
                action=AuditLogScenario.VIEWED_BENCHMARK_ANALYSIS,
                before={
                    "Asset": asset.name,
                    "Year": year,
                    "Benchmark Analysis Status": "Available",
                },
                after="User viewed Benchmark Analysis visualisations",
                resource_id=asset.asset_id,
            )
            await db.commit()

            benchmark_analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if benchmark_analytics_data:
                return Res.success(
                    "S-10045",
                    data={
                        "asset_id": asset_id,
                        "asset_name": asset.name,
                        **benchmark_analytics_data,
                    },
                )

            # ====================== resolve dependencies =======================
            usable_asset_capacity = await self.helper.load_asset_usable_capacity(
                asset_id=asset_id, db=db
            )

            yearly_merged_files = await self.helper.load_yearly_merged_df(
                db=db, asset_id=asset_id, year=year
            )

            modo_industry_metric_config = (
                await self.helper.load_modo_benchmark_industry_config(db=db)
            )

            hardcoded_map = (
                await self.helper.load_yearwise_monthly_hardcoded_metric_values(
                    db=db, year=year
                )
            )

            iar_master_datagrame = await self.helper.load_iar_file_df(
                asset_id=asset_id, db=db, iar_file=iar_file
            )

            # ===================== perform the compute =========================
            benchmark_analytics_data = self.helper.get_benchmark_analysis(
                usabled_capacity=usable_asset_capacity,
                year=year,
                iar_master_dataframe=iar_master_datagrame,
                merged_master_dataframe=yearly_merged_files,
                hardcoded_yearly_values=hardcoded_map,
                modo_benchmark_industry_config=modo_industry_metric_config,
            )

            compute_context["result"] = benchmark_analytics_data

            return Res.success(
                "S-10045",
                data={
                    "asset_id": asset_id,
                    "asset_name": asset.name,
                    **benchmark_analytics_data,
                },
            )

        except Exception:
            raise

    async def download_benchmark_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        redis: Redis,
        year: int,
        current_user: dict,
    ):
        analysis_res = await self.get_benchmark_analysis(
            db=db, redis=redis, asset_id=asset_id, year=year, current_user=current_user
        )

        res_body = json.loads(analysis_res.body.decode())

        if res_body.get("status") == "error":
            return analysis_res

        analysis_data = res_body.get("data", {})
        benchmarks = analysis_data.get("benchmarks", [])  # This is your new nested list

        output = StringIO()
        writer = csv.writer(output)

        header = [
            "Month",
            "Year",
            "Actual (£/MW/year)",
            "Modo Benchmark (£/MW/month)",
            "IAR Projection (£/MW/month)",
            "Actual vs Modo (%)",
            "Actual vs IAR (%)",
            "Ind. Low",
            "Ind. Mid",
            "Ind. High",
        ]
        writer.writerow(header)

        for b in benchmarks:
            actual = b.get("actual", {})
            modo = b.get("modo", {})
            iar = b.get("iar", {})

            month_display = Month(b["month"]).name
            row = [
                month_display,
                b["year"],
                actual.get("value"),
                modo.get("value"),
                iar.get("value"),
                modo.get("variance_modo"),
                iar.get("variance_iar"),
                actual.get("industry_low"),
                actual.get("industry_mid"),
                actual.get("industry_high"),
            ]
            writer.writerow(row)

        output.seek(0)

        file_name = f"BenchmarkAnalysis_{asset_id}.csv"
        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_operations_summary(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034",
                    message=f"Asset with ID {asset_id} not found.",
                    http_status_code=404,
                )

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.VIEW_ANALYSIS,
                action=AuditLogScenario.VIEWED_ASSET_ANALYSIS,
                before={
                    "Asset": asset.name,
                    "Month/Year": f"{month}/{year}",
                },
                after="User viewed Asset Analysis visualisations",
                resource_id=asset.asset_id,
            )
            await db.commit()

            # if computed result already exits
            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10036",
                    data={"month": month, "year": year, **analytics_data},
                )

            # ================ load dataframe ===================
            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )

            # ================ calculate analaytics data ===================
            analytics_data = await self.helper.get_operations_summary(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10036",
                data={"month": month, "year": year, **analytics_data},
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            raise

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_MARKET_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_market_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        # if computed result already exits
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10038",
                data={"month": month, "year": year, **analytics_data},
            )
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034",
                    message=f"Asset with ID {asset_id} not found.",
                    http_status_code=404,
                )

            # ================ load dataframe ===================
            df = await self.helper.load_merged_file(
                asset_id=asset_id, db=db, month=month, year=year
            )

            # ================ calculate analaytics data ===================
            market_summary_analytics = self.helper.get_operation_market_summary(df)
            compute_context["result"] = market_summary_analytics

            # Success Response
            response_data = {"month": month, "year": year, **market_summary_analytics}

            return Res.success("S-10038", data=response_data)
        except ExceptionWithErrorCode:
            raise
        except Exception:
            raise

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_ENERGY_PRICE,
        index=["asset_id", "month", "year"],
    )
    async def get_asset_energy_price_comparison(
        self,
        asset_id: int,
        month: int,
        year: int,
        db: AsyncSession,
        current_user: dict,
        **kwargs,
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error(
                "E-10034",
                message=f"Asset with ID {asset_id} not found.",
                http_status_code=404,
            )

        # if computed result already exits
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10050",
                data={
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )

        # ============================= Load Dataframe ================================
        df = await self.helper.load_merged_file(
            asset_id=asset_id,
            db=db,
            month=month,
            year=year,
        )

        # ===================== Compute Energy Price Comparison =======================
        analytics_data = self.helper.get_energy_price_comparison(df)
        compute_context["result"] = analytics_data

        return Res.success(
            "S-10050",
            data={
                "month": month,
                "year": year,
                **analytics_data,
            },
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_BATTERY_POWER_OVER_TIME,
        index=["asset_id", "month", "year"],
    )
    async def get_battery_power(
        self,
        asset_id: int,
        month: int,
        year: int,
        db: AsyncSession,
        current_user: dict,
        **kwargs,
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error(
                "E-10013",
                message="Unauthorized: AMD platform required",
                http_status_code=403,
            )

        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error(
                "E-10034",
                message=f"Asset with ID {asset_id} not found.",
                http_status_code=404,
            )

        # if computed result already exits
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10051",
                data={"month": month, "year": year, **analytics_data},
            )

        # ====================== Load Dataframe ==========================
        df = await self.helper.load_merged_file(
            asset_id=asset_id,
            month=month,
            year=year,
            db=db,
        )

        # ====================== Compute Battery Power ==========================
        analytics_data = self.helper.get_battery_power_over_time(df)
        compute_context["result"] = analytics_data

        return Res.success(
            "S-10051",
            data={"month": month, "year": year, **analytics_data},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_market_analysis_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10055",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        try:
            optimized_df = await self.helper.load_optimized_df(
                asset_id=asset_id, month=month, year=year, db=db
            )

            actual_df = await self.helper.load_actual_strategy_df(
                db=db, asset_id=asset_id, month=month, year=year
            )

            analytics_data = self.helper.get_market_analysis_summary(
                optimized_df=optimized_df,
                actual_df=actual_df,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10055",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10001", errors=[str(e)])

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_UTILIZATION,
        index=["asset_id", "month", "year"],
        parameters=["market_strategy"],
    )
    async def get_market_utilization(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        **kwargs,
    ):
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10056",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    **analytics_data,
                },
            )

        try:
            actual_df = await self.helper.load_actual_strategy_df(
                db=db, asset_id=asset_id, month=month, year=year
            )

            optimized_df = await self.helper.load_optimized_df(
                asset_id=asset_id, month=month, year=year, db=db
            )

            analytics_data = self.helper.get_market_utilization(
                optimized_df=optimized_df,
                actual_df=actual_df,
                market_strategy=market_strategy,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10056",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10140", errors=[str(e)])

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_STATISTICS,
        index=["asset_id", "month", "year"],
        parameters=["market_strategy"],
    )
    async def get_market_statistics_table(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        current_user: dict,
        **kwargs,
    ):
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10057",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    **analytics_data,
                },
            )
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            valid_strategies = ["epex_daily", "epex_efa", "multi", "actual"]
            if market_strategy not in valid_strategies:
                return Res.error(
                    "E-10134",
                    message="Invalid market strategy passed",
                    http_status_code=400,
                )

            actual_df = await self.helper.load_actual_strategy_df(
                db=db, asset_id=asset_id, month=month, year=year
            )
            optimized_df = await self.helper.load_optimized_df(
                asset_id=asset_id, month=month, year=year, db=db
            )

            analytics_data = self.helper.get_market_statistics_table(
                optimized_df=optimized_df,
                actual_df=actual_df,
                market_strategy=market_strategy,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10057",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10135",
                message="Aggregation/calculation failed",
                http_status_code=500,
            )

    async def download_market_statistics_table(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        current_user: dict,
    ):
        result = await self.get_market_statistics_table(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
            market_strategy=market_strategy,
            current_user=current_user,
        )

        res_body = (
            json.loads(result.body.decode()) if hasattr(result, "body") else result
        )
        if res_body.get("status") == "error":
            return result

        data = res_body["data"]
        rows = data["rows"]

        output = StringIO()
        output.write("\ufeff")
        writer = csv.writer(output)

        writer.writerow(
            ["Market", "Periods", "% of Time", "Revenue (£)", "% of Revenue"]
        )

        for row in rows:
            rev_val = (
                float(row["revenue"])
                if isinstance(row["revenue"], (int, float))
                else 0.0
            )

            writer.writerow(
                [
                    row["market"],
                    row["periods"],
                    f"{row['percentage_time']}%",
                    f"{rev_val:,.2f}",
                    f"{row['percentage_revenue']}%",
                ]
            )

        output.seek(0)

        asset = await db.get(Asset, asset_id)
        asset_str = asset.asset_id if asset else str(asset_id)
        file_name = (
            f"{asset_str}_{month}_{year}_{market_strategy}_market_statistics.csv"
        )

        return StreamingResponse(
            BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_REVENUE_DISTRIBUTION,
        index=["asset_id", "month", "year"],
        parameters=["market_strategy"],
    )
    async def get_revenue_distribution_chart(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        current_user: dict,
        **kwargs,
    ):

        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            valid_strategies = ["epex_daily", "epex_efa", "multi", "actual"]
            if market_strategy not in valid_strategies:
                return Res.error(
                    "E-10134",
                    message="Invalid market strategy passed",
                    http_status_code=400,
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10058",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            actual_df = await self.helper.load_actual_strategy_df(
                db=db, asset_id=asset_id, month=month, year=year
            )
            optimized_df = await self.helper.load_optimized_df(
                asset_id=asset_id, month=month, year=year, db=db
            )

            analytics_data = self.helper.get_revenue_distribution_chart(
                actual_df=actual_df,
                market_strategy=market_strategy,
                optimized_df=optimized_df,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10058",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )

        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error("E-10135", message="Aggregation/calculation failed")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_BEST_MARKETS,
        index=["asset_id", "month", "year"],
    )
    async def get_best_markets(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10058",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        try:
            df = await self.helper.load_optimized_df(
                db=db, asset_id=asset_id, month=month, year=year
            )

            analytics_data = self.helper.get_best_markets(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10059",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10135", errors=[str(e)])

    async def export_best_markets(
        self, db: AsyncSession, asset_id: int, month: int, year: int, market_type: str
    ):
        try:
            response = await self.get_best_markets(db, asset_id, month, year)

            res_data = json.loads(response.body.decode("utf-8"))

            if res_data.get("status") == "error":
                return response

            m_type = market_type.lower()
            key = "buying_markets" if m_type == "buy" else "selling_markets"

            summary_data = res_data.get("data", {}).get(key, [])

            if not summary_data:
                return Res.error(
                    "E-10132",
                    message=f"No {m_type} data available.",
                    http_status_code=404,
                )

            export_df = pd.DataFrame(summary_data)

            export_df.columns = ["Market", "Times Selected", "Percentage"]

            csv_data = export_df.to_csv(index=False)

            filename = f"{asset_id}_{month}_{year}_best-{m_type}-market.csv"

            return StreamingResponse(
                io.BytesIO(csv_data.encode("utf-8")),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}",
                    "Access-Control-Expose-Headers": "Content-Disposition",
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error("E-10135")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_SPREAD,
        index=["asset_id", "month", "year"],
    )
    async def get_price_spread_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10121",
                    message="Price spread analysis is not applicable for Solar assets.",
                    http_status_code=422,
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10060",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )
            analytics_data = self.helper.get_price_spread_analysis(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10060",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception as e:
            traceback.print_exc()
            return Res.error(errors=[str(e)])

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_VOLATILITY,
        index=["asset_id", "month", "year"],
    )
    async def get_price_volatility_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10062",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            analytics_data = self.helper.get_price_volatility_analysis(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10062",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error("E-10137", message="Volatility calculation failed.")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_HOURLY_PRICE_PATTERNS,
        index=["asset_id", "month", "year"],
    )
    async def get_hourly_price_patterns(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            # Solar validation
            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10121",
                    message="Hourly price pattern not supported for solar asset",
                    http_status_code=422,
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10061",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )
            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )
            analytics_data = self.helper.get_hourly_price_patterns(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10061",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_CORRELATION_MATRIX,
        index=["asset_id", "month", "year"],
    )
    async def get_price_correlation_matrix(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034",
                    message=f"Asset with ID {asset_id} not found.",
                    http_status_code=404,
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10165",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            analytics_data = self.helper.get_price_correlation_matrix(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10165",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10144", message="Failed to generate price correlation matrix."
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.REVENUE_IAR_VS_ACTUAL,
        widget=AnalysisWidget.BENCHMARK_REVENUE_IAR_VS_ACTUAL,
        index=["asset_id", "year"],
    )
    async def get_revenue_iar_vs_actual(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: List[int] | None,
        current_user: dict,
        **kwargs,
    ):
        def filter_data_by_months(data, months):
            if months is None:
                return data

            filtered_data = {"monthly_data": {}}
            data_to_filter = data.get("monthly_data", {})
            filtered_data["monthly_data"] = self.helper._filter_yearly_data_by_months(
                data_to_filter, months
            )
            return filtered_data

        try:
            # will throw error if no IAR file found for the asset, allowing the exception to be handled before cache data is returned
            iar_file = await self.helper._get_iar_file_record(db=db, asset_id=asset_id)

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data is None:
                merged_df = await self.helper.load_yearly_merged_df(
                    asset_id=asset_id, year=year, db=db
                )

                iar_df = await self.helper.load_iar_file_df(
                    asset_id=asset_id, db=db, iar_file=iar_file
                )

                settings_year_map = (
                    await self.helper.load_yearwise_monthly_hardcoded_metric_values(
                        db=db, year=year
                    )
                )

                analytics_data = self.helper.get_revenue_iar_vs_actual(
                    merged_master_dataframes=merged_df,
                    iar_master_datagrame=iar_df,
                    settings_year_map=settings_year_map,
                    year=year,
                )
                compute_context["result"] = analytics_data

            analytics_data = filter_data_by_months(analytics_data, months)

            return Res.success(
                "S-10066",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10153", message="Revenue IAR vs Actual calculation failed"
            )

    async def export_revenue_iar_vs_actual(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: List[int] | None,
        current_user: dict,
    ):
        result = await self.get_revenue_iar_vs_actual(
            db=db,
            asset_id=asset_id,
            year=year,
            months=months,
            current_user=current_user,
        )

        res_body = (
            json.loads(result.body.decode()) if hasattr(result, "body") else result
        )
        if res_body.get("status") == "error":
            return result

        data = res_body["data"]
        monthly_records = data["monthly_data"]

        output = StringIO()
        output.write("\ufeff")
        writer = csv.writer(output)

        writer.writerow(["Revenue IAR vs Actual Comparison Report"])
        writer.writerow([f"Asset ID: {asset_id}", f"Year: {year}"])
        writer.writerow([])
        writer.writerow(
            [
                "Month",
                "Revenue Stream",
                "IAR Revenue (£)",
                "Actual Revenue (£)",
                "Variance %",
            ]
        )

        month_names = {
            1: "Jan",
            2: "Feb",
            3: "Mar",
            4: "Apr",
            5: "May",
            6: "Jun",
            7: "Jul",
            8: "Aug",
            9: "Sep",
            10: "Oct",
            11: "Nov",
            12: "Dec",
        }

        for m in sorted(int(k) for k in monthly_records.keys()):
            m_str = str(m)
            m_label = month_names.get(m, f"Month {m}")
            data_slice = monthly_records[m_str]

            for stream in data_slice["streams"]:
                iar_val = float(stream["iar_revenue"])
                act_val = float(stream["actual_revenue"])
                var_val = stream["variance_percentage"]
                var_str = (
                    f"{var_val}%" if isinstance(var_val, (int, float)) else str(var_val)
                )

                writer.writerow(
                    [
                        m_label,
                        stream["revenue_stream"],
                        f"{iar_val:,.2f}",
                        f"{act_val:,.2f}",
                        var_str,
                    ]
                )

            ex_bm = data_slice["total_excluding_bm_tnuos"]
            all_str = data_slice["total_all_streams"]

            iar_ex = float(ex_bm["iar_revenue"])
            act_ex = float(ex_bm["actual_revenue"])
            var_ex = ex_bm["variance_percentage"]
            var_ex_str = (
                f"{var_ex}%" if isinstance(var_ex, (int, float)) else str(var_ex)
            )

            iar_all = float(all_str["iar_revenue"])
            act_all = float(all_str["actual_revenue"])
            var_all = all_str["variance_percentage"]
            var_all_str = (
                f"{var_all}%" if isinstance(var_all, (int, float)) else str(var_all)
            )

            writer.writerow(
                [
                    m_label,
                    "TOTAL (excl. BM, TNUoS)",
                    f"{iar_ex:,.2f}",
                    f"{act_ex:,.2f}",
                    var_ex_str,
                ]
            )
            writer.writerow(
                [
                    m_label,
                    "TOTAL (all streams)",
                    f"{iar_all:,.2f}",
                    f"{act_all:,.2f}",
                    var_all_str,
                ]
            )
            writer.writerow([])

        output.seek(0)

        asset = await db.get(Asset, asset_id)
        asset_str = asset.asset_id if asset else str(asset_id)
        file_name = f"Revenue_IAR_vs_Actual_Comparison_{asset_str}.csv"

        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="application/file.csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.OPTIMIZED_VS_ACTUAL,
        widget=AnalysisWidget.BENCHMARK_MULTI_MARKET_OPTIMIZED_VS_ACTUAL,
        index=["asset_id", "year"],
    )
    async def get_multi_market_optimized_vs_actual(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: List[int] | None,
        current_user: dict,
        **kwargs,
    ):
        def filter_data_by_months(data, months):
            if months is None:
                return data

            filtered_data = {"monthly_data": {}}
            data_to_filter = data.get("monthly_data", {})
            filtered_data["monthly_data"] = self.helper._filter_yearly_data_by_months(
                data_to_filter, months
            )
            return filtered_data

        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data is None:

                merged_df = await self.helper.load_yearly_merged_df(
                    asset_id=asset_id,
                    year=year,
                    db=db,
                )

                optimized_df = await self.helper.load_yearly_optimized_df(
                    asset_id=asset_id,
                    year=year,
                    db=db,
                )

                analytics_data = self.helper.get_multi_market_optimized_vs_actual(
                    master_merged_dataframe=merged_df,
                    master_optimized_dataframe=optimized_df,
                    year=year,
                )
                compute_context["result"] = analytics_data

            analytics_data = filter_data_by_months(analytics_data, months)

            return Res.success(
                "S-10067",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10157", message="Multi-market optimized vs actual calculation failed"
            )

    async def export_multi_market_optimized_vs_actual(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        current_user: dict,
        months: List[int] | None,
    ):
        result = await self.get_multi_market_optimized_vs_actual(
            db=db,
            asset_id=asset_id,
            year=year,
            current_user=current_user,
            months=months,
        )
        res_body = (
            json.loads(result.body.decode()) if hasattr(result, "body") else result
        )

        if res_body.get("status") == "error":
            return result

        data = res_body["data"]
        monthly_records = data["monthly_data"]
        output = StringIO()
        output.write("\ufeff")
        writer = csv.writer(output)

        writer.writerow(["Multi-Market Optimized vs Actual Revenue Report"])
        writer.writerow(
            [
                f"Asset ID: {asset_id}",
                f"Year: {year}",
            ]
        )
        writer.writerow([])
        writer.writerow(
            [
                "Month",
                "Revenue Stream",
                "Actual Revenue (£)",
                "Optimized Revenue (£)",
            ]
        )

        month_names = {
            1: "Jan",
            2: "Feb",
            3: "Mar",
            4: "Apr",
            5: "May",
            6: "Jun",
            7: "Jul",
            8: "Aug",
            9: "Sep",
            10: "Oct",
            11: "Nov",
            12: "Dec",
        }

        for m in sorted(int(k) for k in monthly_records.keys()):
            m_str = str(m)
            m_label = month_names.get(m, f"Month {m}")
            data_slice = monthly_records[m_str]

            for stream in data_slice["revenue_streams"]:
                actual_val = float(stream["actual_revenue"])
                optimized_val = float(stream["optimized_revenue"])
                writer.writerow(
                    [
                        m_label,
                        stream["revenue_stream"],
                        f"{actual_val:,.2f}",
                        f"{optimized_val:,.2f}",
                    ]
                )

            totals = data_slice["totals"]
            total_actual = float(totals["total_actual_revenue"])
            total_optimized = float(totals["total_optimized_revenue"])
            revenue_gap = float(totals["revenue_gap"])
            capture_rate = totals["capture_rate"]
            writer.writerow(
                [
                    m_label,
                    "TOTAL",
                    f"{total_actual:,.2f}",
                    f"{total_optimized:,.2f}",
                ]
            )
            writer.writerow(
                [
                    m_label,
                    "Revenue Gap",
                    "",
                    f"{revenue_gap:,.2f}",
                ]
            )
            writer.writerow(
                [
                    m_label,
                    "Capture Rate",
                    "",
                    (
                        f"{capture_rate}%"
                        if isinstance(capture_rate, (int, float))
                        else capture_rate
                    ),
                ]
            )
            writer.writerow([])
        output.seek(0)
        asset = await db.get(Asset, asset_id)
        asset_str = asset.asset_id if asset else str(asset_id)

        file_name = f"Multi_Market_Optimized_vs_Actual_{asset_str}.csv"

        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="application/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_ancillary_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10068",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )
            analytics_data = self.helper.get_ancillary_summary(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10068",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10163", message="Ancillary revenue summary calculation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_REVENUE_BREAKDOWN,
        index=["asset_id", "month", "year"],
    )
    async def get_ancillary_breakdown(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10068",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            analytics_data = self.helper.get_ancillary_breakdown(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10068",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10164", message="Ancillary revenue breakdown calculation failed"
            )

    async def export_ancillary_breakdown(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
    ):

        result = await self.get_ancillary_breakdown(
            db=db, asset_id=asset_id, month=month, year=year, current_user=current_user
        )
        res_body = (
            json.loads(result.body.decode()) if hasattr(result, "body") else result
        )
        if res_body.get("status") == "error":
            return result

        data = res_body["data"]
        service_breakdown = data["service_breakdown"]
        output = StringIO()
        output.write("\ufeff")
        writer = csv.writer(output)
        writer.writerow(["Ancillary Service Breakdown Report"])
        writer.writerow(
            [
                f"Asset ID: {asset_id}",
                f"Month: {month}",
                f"Year: {year}",
            ]
        )
        writer.writerow([])
        writer.writerow(
            [
                "Service",
                "Service Name",
                "Total Revenue (£)",
                "Periods Active",
                "Average Price (£/MW/h)",
                "Revenue Per MW-Hour (£)",
            ]
        )
        for service in service_breakdown:
            writer.writerow(
                [
                    service["service"],
                    service["service_name"],
                    f"{float(service['total_revenue']):,.2f}",
                    service["periods_active"],
                    f"{float(service['avg_price']):,.2f}",
                    f"{float(service['revenue_per_mwh']):,.2f}",
                ]
            )
        output.seek(0)
        asset = await db.get(Asset, asset_id)
        asset_str = asset.asset_id if asset else str(asset_id)
        file_name = f"ancillary_service_breakdown_{asset_str}_{month}_{year}.csv"

        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_OPPORTUNITY_COST_ANALYSIS,
        index=["asset_id", "month", "year"],
    )
    async def get_opportunity_cost_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10069",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_opportunity_cost_analysis(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10069",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10166")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_SERVICE_REVENUE_BY_HOUR,
        index=["asset_id", "month", "year"],
    )
    async def get_service_revenue_by_hour(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10069",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_service_revenue_by_hour(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10069",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10167")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_DAILY_BREAKDOWN,
        index=["asset_id", "month", "year"],
    )
    async def get_daily_imbalance_breakdown(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10071",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )
            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_daily_imbalance_breakdown(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10071",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10171", message="Daily imbalance breakdown calculation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_WORST_DAYS,
        index=["asset_id", "month", "year"],
    )
    async def get_top_5_worst_imbalance_days(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10072",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_top_5_worst_imbalance_days(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10072",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10172", message="Top 5 worst imbalance days calculation failed"
            )

    async def export_top_5_worst_imbalance_days(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            result = await self.get_top_5_worst_imbalance_days(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
                current_user=current_user,
            )

            res_body = (
                json.loads(result.body.decode()) if hasattr(result, "body") else result
            )
            if res_body.get("status") == "error":
                return result

            data = res_body["data"]
            worst_days = data["worst_days"]
            output = StringIO()
            output.write("\ufeff")
            writer = csv.writer(output)

            writer.writerow(["Top 5 Worst Imbalance Days Report"])
            writer.writerow(
                [
                    f"Asset ID: {asset_id}",
                    f"Month: {month}",
                    f"Year: {year}",
                ]
            )
            writer.writerow([])
            writer.writerow(
                [
                    "Date",
                    "Revenue (£)",
                    "Charges (£)",
                    "Net Imbalance (£)",
                ]
            )

            for day in worst_days:
                writer.writerow(
                    [
                        day["date"],
                        f"{float(day['revenue']):,.2f}",
                        f"{float(day['charges']):,.2f}",
                        f"{float(day['net_imbalance']):,.2f}",
                    ]
                )
            output.seek(0)
            asset = await db.get(Asset, asset_id)
            asset_str = asset.asset_id if asset else str(asset_id)

            file_name = f"top_5_worst_imbalance_days_{asset_str}_{month}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file_name}"},
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10174", message="Top 5 worst imbalance days export generation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_imbalance_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10070",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_imbalance_summary(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10070",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10170")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_HOURLY_CHARGES,
        index=["asset_id", "month", "year"],
    )
    async def get_imbalance_hourly_charges(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10073",
                    data={
                        **analytics_data,
                    },
                )
            df = await self.helper.load_merged_file(
                asset_id=asset_id, month=month, year=year, db=db
            )
            analytics_data = self.helper.get_imbalance_hourly_charges(df)
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10073",
                data={
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10173")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_battery_health_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10075",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            optimized_df = await self.helper.load_optimized_df(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
            )

            analytics_data = self.helper.get_battery_health_analysis(
                merged_df=merged_df,
                optimized_df=optimized_df,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10075",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10178", message="Battery health analysis calculation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_CYCLE_COMPARISON,
        index=["asset_id", "month", "year"],
    )
    async def get_cycle_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        asset = await db.get(Asset, asset_id)
        if not asset:

            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success(
                "S-10075",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )

        cap = await self.helper.load_asset_usable_capacity(
            db=db,
            asset_id=asset_id,
        )

        # Fetch Files
        merged_df = await self.helper.load_merged_file(
            asset_id=asset_id,
            month=month,
            year=year,
            db=db,
        )

        optimized_df = await self.helper.load_optimized_df(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
        )

        analytics_data = self.helper.get_cycle_comparison(
            merged_df=merged_df,
            optimized_df=optimized_df,
            usable_capacity=cap,
            month=month,
            year=year,
        )
        compute_context["result"] = analytics_data

        return Res.success(
            "S-10076",
            data={
                "asset_id": asset_id,
                "month": month,
                "year": year,
                **analytics_data,
            },
        )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_STRATEGY_CYCLING_COMPARISON,
        index=["asset_id", "month", "year"],
        parameters=["cycle_method"],
    )
    async def get_strategy_cycling_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str = "discharge-only",
        current_user: dict = None,
        **kwargs,
    ):
        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")
        if analytics_data:
            return Res.success("S-10077", data={**analytics_data})

        cap = await self.helper.load_asset_usable_capacity(
            db=db,
            asset_id=asset_id,
        )

        merged_df = await self.helper.load_merged_file(
            asset_id=asset_id,
            month=month,
            year=year,
            db=db,
        )

        optimized_df = await self.helper.load_optimized_df(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
        )

        analytics_data = self.helper.get_strategy_cycling_comparison(
            merged_df=merged_df,
            optimized_df=optimized_df,
            usable_capacity=cap,
            month=month,
            year=year,
            cycle_method=cycle_method,
        )
        compute_context["result"] = analytics_data

        return Res.success("S-10077", data={**analytics_data})

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_ANNUAL_PROJECTION_REPORT,
        index=["asset_id", "month", "year"],
        parameters=["cycle_method"],
    )
    async def get_annual_projection_report(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
        **kwargs,
    ):
        try:
            VALID_METHODS = ["discharge-only", "full-equivalent", "throughput-based"]

            if cycle_method not in VALID_METHODS:
                return Res.error("E-10183", http_status_code=400)

            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10078",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            cap = await self.helper.load_asset_usable_capacity(
                db=db,
                asset_id=asset_id,
            )

            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )
            optimized_df = await self.helper.load_optimized_df(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
            )

            analytics_data = self.helper.get_annual_projection_report(
                merged_df=merged_df,
                optimized_df=optimized_df,
                usable_capacity=cap,
                month=month,
                year=year,
                cycle_method=cycle_method,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10078",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10191", message="Annual projection report calculation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.TB_SPREAD,
        widget=AnalysisWidget.ANALYSIS_TB_SPREAD_SUMMARY,
        index=["asset_id", "month", "year"],
    )
    async def get_tb_spread_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10079",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            # ============== load dependencies data ===================
            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )
            usable_capacity = await self.helper.load_asset_usable_capacity(
                asset_id=asset_id, db=db
            )

            benchmark_record = await self.helper.load_tb_spread_benchmark(
                db=db, month=month, year=year
            )

            # ================== calculate analytics data ===================
            analytics_data = self.helper.get_tb_spread_summary(
                merged_df=merged_df,
                usable_capacity=usable_capacity,
                tb_spread_benchmark=benchmark_record,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10079",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            raise ExceptionWithErrorCode(
                "E-10195", message="Time-based spread summary calculation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.TB_SPREAD,
        widget=AnalysisWidget.ANALYSIS_TB_SPREAD_DETAILS,
        index=["asset_id", "month", "year"],
    )
    async def get_tb_spread_details(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10080",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        **analytics_data,
                    },
                )

            # ============== load dependencies data ===================
            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            benchmark_record = await self.helper.load_tb_spread_benchmark(
                db=db, month=month, year=year
            )

            # ============== compute data ===================
            analytics_data = self.helper.get_tb_spread_details(
                merged_df=merged_df,
                tb_spread_benchmark=benchmark_record,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10080",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10197", message="Time-based spread details calculation failed"
            )

    async def export_tb_spread_details(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            result = await self.get_tb_spread_details(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
                current_user=current_user,
            )

            res_body = (
                json.loads(result.body.decode()) if hasattr(result, "body") else result
            )

            if res_body.get("status") == "error":
                return result

            data = res_body["data"]
            tb_spread_rows = data["tb_spread"]

            output = StringIO()
            output.write("\ufeff")

            writer = csv.writer(output)

            writer.writerow(["TB Spread Details Report"])

            writer.writerow(
                [
                    f"Asset ID: {asset_id}",
                    f"Month: {month}",
                    f"Year: {year}",
                ]
            )

            writer.writerow([])

            writer.writerow(
                [
                    "Date",
                    "TB1 (£/MWh)",
                    "TB2 (£/MWh)",
                    "TB3 (£/MWh)",
                    "Arbitrage Revenue (£)",
                ]
            )

            for row in tb_spread_rows:
                writer.writerow(
                    [
                        row["date"],
                        f"{float(row['tb1']):,.2f}",
                        f"{float(row['tb2']):,.2f}",
                        f"{float(row['tb3']):,.2f}",
                        f"{float(row['arbitrage_revenue']):,.2f}",
                    ]
                )

            output.seek(0)

            file_name = f"tb_spread_details_{asset_id}_{month}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file_name}"},
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10199", message="TB Spread Details export generation failed"
            )

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_DAILY_CYCLES,
        index=["asset_id", "month", "year"],
        parameters=["cycle_method"],
    )
    async def get_daily_cycles(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
        **kwargs,
    ):
        try:
            VALID_METHODS = ["discharge-only", "full-equivalent", "throughput-based"]
            if cycle_method not in VALID_METHODS:
                return Res.error("E-10183", http_status_code=400)

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10083",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        "cycle_method": cycle_method,
                        **analytics_data,
                    },
                )

            cap = await self.helper.load_asset_usable_capacity(
                db=db,
                asset_id=asset_id,
            )

            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            optimized_df = await self.helper.load_optimized_df(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
            )

            analytics_data = self.helper.get_daily_cycles(
                merged_df=merged_df,
                optimized_df=optimized_df,
                usable_capacity=cap,
                cycle_method=cycle_method,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10083",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "cycle_method": cycle_method,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    @asset_analytics_db_cache(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_MONTHLY_REVENUE_COMPARISON,
        index=["asset_id", "year"],
    )
    async def get_monthly_revenue_comparison(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        year: int,
        current_user: dict,
        months: List[int] = None,
        **kwargs,
    ):
        def filter_monthly_data(data: Any):
            if months is None:
                return data

            # apply filtering
            filterd_data = {"monthly_comparison": []}
            monthly_comparision = data["monthly_comparison"]
            filterd_data["monthly_comparison"] = [
                d for d in monthly_comparision if d["month"] in months
            ]

            return filterd_data

        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034", http_status_code=404)

        analytics_data = kwargs.get("analytics_data")
        compute_context = kwargs.get("compute_context")

        if analytics_data is None:

            # Fetch all hardcoded values
            hardcoded_map = (
                await self.helper.load_yearwise_monthly_hardcoded_metric_values(
                    db=db, year=year
                )
            )

            merged_df = await self.helper.load_yearly_merged_df(
                asset_id=asset_id,
                year=year,
                db=db,
            )

            optimized_df = await self.helper.load_yearly_optimized_df(
                asset_id=asset_id,
                year=year,
                db=db,
            )

            analytics_data = self.helper.get_monthly_revenue_comparison(
                yearly_merged_df=merged_df,
                yearly_optimized_df=optimized_df,
                hardcoded_map=hardcoded_map,
            )
            compute_context["result"] = analytics_data

        analytics_data = filter_monthly_data(analytics_data)

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.EXECUTIVE_ANALYSIS,
            action=AuditLogScenario.VIEWED_EXECUTIVE_ANALYSIS,
            before={
                "Asset": asset.name,
                "Year": year,
                "Screen": "Monthly Revenue Comparison",
            },
            after="User viewed Monthly Revenue Comparison",
            resource_id=asset.asset_id,
        )
        await db.commit()

        return Res.success(
            "S-10086",
            data={
                "asset_id": asset_id,
                "year": year,
                **analytics_data,
            },
        )

    async def export_monthly_revenue_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: list,
        redis: Redis,
        current_user: dict,
    ):
        try:
            result = await self.get_monthly_revenue_comparison(
                db=db,
                asset_id=asset_id,
                year=year,
                redis=redis,
                months=months,
                current_user=current_user,
            )

            res_body = (
                json.loads(result.body.decode()) if hasattr(result, "body") else result
            )
            if res_body.get("status") == "error":
                return result

            monthly_comparison = res_body["data"]["monthly_comparison"]
            year = res_body["data"]["year"]

            # month filter if provided
            # if months:
            #     monthly_comparison = [
            #         r for r in monthly_comparison if r["month"] in months
            #     ]

            output = StringIO()
            output.write("\ufeff")  # BOM for Excel UTF-8
            writer = csv.writer(output)

            writer.writerow(["Monthly Revenue Comparison Report"])
            writer.writerow([f"Asset ID: {asset_id}", f"Year: {year}"])
            writer.writerow([])

            writer.writerow(
                [
                    "Month",
                    "Year",
                    "Actual Revenue (£)",
                    "Capacity Market (£)",
                    "DUoS Net Credit (£)",
                    "Total Revenue (£)",
                    "Optimal Revenue (£)",
                    "Imbalance (£)",
                    "Revenue Gap (£)",
                    "Capture Rate (%)",
                ]
            )

            for row in monthly_comparison:
                writer.writerow(
                    [
                        calendar.month_abbr[row["month"]],
                        year,
                        f"{row['actual_revenue']:,.2f}",
                        (
                            f"{row['capacity_market']:,.2f}"
                            if row["capacity_market"] is not None
                            else "–"
                        ),
                        (
                            f"{row['duos_net_credit']:,.2f}"
                            if row["duos_net_credit"] is not None
                            else "–"
                        ),
                        f"{row['total_revenue']:,.2f}",
                        (
                            f"{row['optimized_revenue']:,.2f}"
                            if row["optimized_revenue"] is not None
                            else "–"
                        ),
                        f"{row['net_imbalance']:,.2f}",
                        (
                            f"{row['revenue_gap']:,.2f}"
                            if row["revenue_gap"] is not None
                            else "–"
                        ),
                        (
                            f"{row['capture_rate']:,.2f}%"
                            if row["capture_rate"] is not None
                            else "–"
                        ),
                    ]
                )

            output.seek(0)

            asset = await db.get(Asset, asset_id)
            asset_str = asset.asset_id if asset else str(asset_id)
            file_name = f"monthly_revenue_comparison_{asset_str}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file_name}"},
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    @asset_analytics_db_cache(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_REVENUE_BY_STREAM,
        index=["asset_id", "year"],
    )
    async def get_revenue_by_stream_analysis(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        months: List[int],
        year: int,
        current_user: dict,
        **kwargs,
    ):
        def filter_monthly_data(data: Any):

            if months is None:
                return data

            # apply filtering
            filterd_data = {"monthly_comparison": []}
            monthly_comparision = data["monthly_comparison"]
            filterd_data["monthly_comparison"] = [
                d for d in monthly_comparision if d["month"] in months
            ]

            return filterd_data

        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034", status_code=404)

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            filter_analytics_data = filter_monthly_data(analytics_data)
            if analytics_data:
                return Res.success(
                    "S-10083",
                    data={"asset_id": asset_id, "year": year, **filter_analytics_data},
                )

            # load dependencies
            yearly_merged_files = await self.helper.load_yearly_merged_df(
                db=db, year=year, asset_id=asset_id
            )
            hardcoded_map = (
                await self.helper.load_yearwise_monthly_hardcoded_metric_values(
                    db=db, year=year
                )
            )

            analytics_data = self.helper.get_revenue_by_stream_analysis(
                yearly_merged_df=yearly_merged_files,
                hardcoded_map=hardcoded_map,
                year=year,
            )
            compute_context["result"] = analytics_data

            filter_analytics_data = filter_monthly_data(analytics_data)

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.EXECUTIVE_ANALYSIS,
                action=AuditLogScenario.VIEWED_EXECUTIVE_ANALYSIS,
                before={
                    "Asset": asset.name,
                    "Year": year,
                    "Screen": "Revenue By Stream",
                },
                after="User viewed Revenue By Stream Analysis",
                resource_id=asset.asset_id,
            )
            await db.commit()

            return Res.success(
                "S-10086",
                data={"asset_id": asset_id, "year": year, **filter_analytics_data},
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_revenue_by_stream_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        redis: Redis,
        months: List[int],
        current_user: dict,
    ):
        try:
            response = await self.get_revenue_by_stream_analysis(
                db=db,
                asset_id=asset_id,
                months=months,
                year=year,
                redis=redis,
                current_user=current_user,
            )

            response_body = (
                json.loads(response.body.decode())
                if hasattr(response, "body")
                else response
            )

            if response_body.get("status") == "error":
                return response

            monthly_data = response_body["data"]["monthly_comparison"]

            output = StringIO()

            writer = csv.writer(output)

            writer.writerow(
                [
                    "Month",
                    "Year",
                    "SFFR",
                    "EPEX",
                    "IDA1",
                    "IDC",
                    "Imbalance",
                    "Asset Sub Total",
                    "Capacity Market",
                    "DUoS Net Credit",
                    "Total Revenue",
                ]
            )

            for row in monthly_data:
                writer.writerow(
                    [
                        calendar.month_abbr[row["month"]],
                        year,
                        row["sffr"],
                        row["epex"],
                        row["ida1"],
                        row["idc"],
                        row["imbalance"],
                        row["asset_sub_total"],
                        row["capacity_market"],
                        row["duos_net_credit"],
                        row["total_revenue"],
                    ]
                )

            output.seek(0)

            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="revenue_stream_comparison_{asset_id}_{year}.csv"'
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    @asset_analytics_db_cache(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_SUMMARY,
        index=["asset_id", "year"],
    )
    async def get_executive_summary(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        year: int,
        current_user: dict,
        **kwargs,
    ):
        try:

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10085",
                    data={
                        "asset_id": asset_id,
                        "year": year,
                        **analytics_data,
                    },
                )

            # Fetch all hardcoded values
            hardcoded_map = (
                await self.helper.load_yearwise_monthly_hardcoded_metric_values(
                    db=db, year=year
                )
            )

            merged_df = await self.helper.load_yearly_merged_df(
                asset_id=asset_id,
                year=year,
                db=db,
            )

            optimized_df = await self.helper.load_yearly_optimized_df(
                asset_id=asset_id,
                year=year,
                db=db,
            )

            analytics_data = self.helper.get_executive_summary(
                yearly_merged_df=merged_df,
                yearly_optimized_df=optimized_df,
                hardcoded_map=hardcoded_map,
            )
            compute_context["result"] = analytics_data
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.EXECUTIVE_ANALYSIS,
                action=AuditLogScenario.VIEWED_EXECUTIVE_ANALYSIS,
                before={
                    "Asset": asset.name,
                    "Year": year,
                    "Screen": "Executive Summary",
                },
                after="User viewed Executive Summary",
                resource_id=asset.asset_id,
            )
            await db.commit()

            return Res.success(
                "S-10085", data={"asset_id": asset_id, "year": year, **analytics_data}
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_executive_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        current_user: dict,
    ):
        try:
            response = await self.get_executive_summary(
                db=db,
                asset_id=asset_id,
                year=year,
                current_user=current_user,
            )

            response_body = (
                json.loads(response.body.decode())
                if hasattr(response, "body")
                else response
            )

            if response_body.get("status") == "error":
                return response

            strongest = response_body["data"]["strongest_month"]
            weakest = response_body["data"]["weakest_month"]

            if strongest is None or weakest is None:
                return Res.error(
                    "E-10216",
                    message="Executive summary is not available for a single month.",
                    http_status_code=422,
                )

            output = StringIO()

            writer = csv.writer(output)

            writer.writerow(
                ["Type", "Month", "Capture Rate", "Revenue Gap", "Imbalance"]
            )

            writer.writerow(
                [
                    "Strongest Month",
                    strongest["month"],
                    strongest["capture_rate"],
                    strongest["revenue_gap"],
                    strongest["imbalance"],
                ]
            )

            writer.writerow(
                [
                    "Weakest Month",
                    weakest["month"],
                    weakest["capture_rate"],
                    weakest["revenue_gap"],
                    weakest["imbalance"],
                ]
            )

            output.seek(0)

            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="executive_summary_{asset_id}_{year}.csv"'
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    @asset_analytics_db_cache(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_WARRANTY_EXCEEDANCE,
        index=["asset_id", "month", "year"],
        parameters=["cycle_method"],
    )
    async def get_warranty_limit_exceedance(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
        **kwargs,
    ):
        try:
            VALID_METHODS = ["discharge-only", "full-equivalent", "throughput-based"]
            if cycle_method not in VALID_METHODS:
                return Res.error("E-10183", http_status_code=400)

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)

            analytics_data = kwargs.get("analytics_data")
            compute_context = kwargs.get("compute_context")
            if analytics_data:
                return Res.success(
                    "S-10084",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        "cycle_method": cycle_method,
                        **analytics_data,
                    },
                )

            cap = await self.helper.load_asset_usable_capacity(
                db=db,
                asset_id=asset_id,
            )

            merged_df = await self.helper.load_merged_file(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
            )

            optimized_df = await self.helper.load_optimized_df(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
            )

            analytics_data = self.helper.get_warranty_limit_exceedance(
                usable_capacity=cap,
                merged_df=merged_df,
                optimized_df=optimized_df,
                cycle_method=cycle_method,
            )
            compute_context["result"] = analytics_data

            return Res.success(
                "S-10084",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "cycle_method": cycle_method,
                    **analytics_data,
                },
            )
        except ExceptionWithErrorCode:
            raise
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_strategy_energy_throughput_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str = "discharge-only",
        current_user: dict = None,
        **kwargs,
    ):
        result = await self.get_strategy_cycling_comparison(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
            cycle_method=cycle_method,
            current_user=current_user,
        )

        res_body = (
            json.loads(result.body.decode()) if hasattr(result, "body") else result
        )

        if res_body.get("status") == "error":
            return result

        data = res_body["data"].get("strategy_cycling_comparison", [])
        output = StringIO()
        writer = csv.writer(output)

        header = [
            "Strategy",
            "Total Discharge",
            "Total Cycle",
            "Daily Cycle",
            "Degradation %",
            "Warranty Status",
        ]
        writer.writerow(header)

        for row in data:
            writer.writerow(
                [
                    row.get("strategy", ""),
                    row.get("total_discharge_mwh", ""),
                    row.get("total_cycle", ""),
                    row.get("daily_cycle", ""),
                    row.get("degradation_percent", ""),
                    (
                        "EXCEEDED"
                        if row.get("is_warranty_exceeded", False)
                        else "WITHIN LIMIT"
                    ),
                ]
            )

        output.seek(0)
        file_name = f"strategy_energy_throughput_summary_{asset_id}_{month}_{year}.csv"
        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )
