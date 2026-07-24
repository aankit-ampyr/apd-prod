from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import (
    AssetOptimizationParameter,
    Asset,
    AssetFile,
    MetricIndustryConfiguration,
    MonthlyHardcodedValue,
    Metric,
)
from utils import Res, audit_logs, FileStorageManager, get_days_in_month
from python_common.constants.enums import Month
from constants.enums import (
    AssetType,
    AssetFileType,
    UserRole,
    Platform,
    AssetMetrics,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
)
import pandas as pd
from io import BytesIO
from datetime import datetime, timezone
from fastapi.responses import StreamingResponse
import numpy as np
import traceback
import botocore  # noqa: F403,F405
import csv
import json
from pulp import *  # noqa: F403,F405
import logging
import io
from io import StringIO
import asyncio
import calendar
from constants.defaults import ASSET_DEGRADATION_PER_CYCLE_PERCENTAGE

logger = logging.getLogger(__name__)


class AnalysisService:
    def _format_aggregator_report_filename(self, timestamp: any) -> str:
        # Case 1: pandas Timestamp
        if isinstance(timestamp, pd.Timestamp):
            return timestamp.to_pydatetime().isoformat()

        # Case 2: Python datetime
        if isinstance(timestamp, datetime):
            return timestamp.isoformat()

        # Case 3: string
        if isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            return timestamp.isoformat()

        raise TypeError(f"Unsupported type for timestamp: {type(timestamp)}")

    def _get_datetime(self, timestamp: any) -> any:
        dt = None
        if isinstance(timestamp, pd.Timestamp):
            dt = timestamp.to_pydatetime()

        # Case 2: Python datetime
        elif isinstance(timestamp, datetime):
            dt = timestamp

        elif isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            dt = timestamp
        else:
            raise TypeError(f"Unsupported type for timestamp: {type(timestamp)}")

        return dt.replace(tzinfo=timezone.utc)

    def _get_utc_range(self, year, month):
        start = datetime(year, month, 1, tzinfo=timezone.utc)

        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        return start, end

    async def get_benchmark_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        year: list[int] | None,
        current_user: dict,
    ):
        try:
            if not year:
                return Res.error("E-10134", message="Year parameter is required")

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            await audit_logs(
                db=db,
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

            metric_names = [
                "Asset Revenue (£)",
                "Modo Benchmark (£/MW/yr)",
                "IAR Projection",
            ]
            metric_stmt = (
                select(MetricIndustryConfiguration, Metric.metric_name)
                .join(Metric, Metric.id == MetricIndustryConfiguration.metric_id)
                .where(Metric.metric_name.in_(metric_names))
            )

            metrics_res = await db.execute(metric_stmt)
            metrics_lookup = {
                row.metric_name: {
                    "id": row.MetricIndustryConfiguration.metric_id,
                    "low": row.MetricIndustryConfiguration.industry_low,
                    "mid": row.MetricIndustryConfiguration.industry_mid,
                    "high": row.MetricIndustryConfiguration.industry_high,
                }
                for row in metrics_res.all()
            }

            file_query = await db.execute(
                select(AssetFile)
                .where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.year.in_(year),
                    AssetFile.is_active.is_(True),
                )
                .order_by(AssetFile.projection_start_date)
            )

            merged_files = file_query.scalars().all()
            if not merged_files:
                return Res.error("E-10100")

            # OPTIMIZATION: Bulk fetch monthly hardcoded configurations up-front
            hardcoded_stmt = select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.year.in_(year)
            )
            hardcoded_res = await db.execute(hardcoded_stmt)
            hardcoded_data = hardcoded_res.scalars().all()

            # Map coordinates safely: (year, month, metric_id) -> value
            hardcoded_map = {}
            for item in hardcoded_data:
                hardcoded_map[(item.year, item.month, item.metric_id)] = item.value

            benchmark_results = []
            for merged_file in merged_files:
                m, y = (
                    merged_file.projection_start_date.month,
                    merged_file.projection_start_date.year,
                )

                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))

                sffr_revenue = float(df["SFFR revenues"].sum())
                epex_revenue = float(
                    df["EPEX DA Revenues"].sum() + df["EPEX 30 DA Revenue"].sum()
                )
                ida1_revenue = float(df["IDA1 Revenue"].sum())
                idc_revenue = float(df["IDC Revenue"].sum())
                imbalance_net = float(
                    df["Imbalance Revenue"].sum() - df["Imbalance Charge"].sum()
                )

                gb_gross = (
                    sffr_revenue
                    + epex_revenue
                    + ida1_revenue
                    + idc_revenue
                    + imbalance_net
                )
                gb_net = gb_gross * 0.95

                # Pull values instantly out of memory instead of executing 60 sequential DB queries
                capacity_market = hardcoded_map.get(
                    (y, m, AssetMetrics.CAPACITY_MARKET.value), 0.0
                )
                duos_credit = hardcoded_map.get(
                    (y, m, AssetMetrics.DUOS_CREDIT.value), 0.0
                )
                duos_fixed = hardcoded_map.get(
                    (y, m, AssetMetrics.DUOS_FIXED_CHARGES.value), 0.0
                )

                total_revenue = gb_net + capacity_market + duos_credit - duos_fixed
                daily_revenue = total_revenue / get_days_in_month(month=m, year=y)
                annual_revenue = daily_revenue * 365
                annual_per_mw = annual_revenue / 4.2
                actual_monthly = annual_per_mw * (30.4 / 365)

                modo_val = hardcoded_map.get(
                    (y, m, AssetMetrics.MODO_BENCHMARK.value), 0.0
                )
                iar_val = await self._extract_iar_row_value(db, asset_id, m, y)

                actual_cfg = metrics_lookup.get("Asset Revenue (£)", {})
                modo_cfg = metrics_lookup.get("Modo Benchmark (£/MW/yr)", {})
                iar_cfg = metrics_lookup.get("IAR Projection", {})

                benchmark_results.append(
                    {
                        "month": m,
                        "year": y,
                        "actual": {
                            "metric_id": actual_cfg.get("id"),
                            "value": round(actual_monthly, 2),
                            "industry_low": actual_cfg.get("low"),
                            "industry_mid": actual_cfg.get("mid"),
                            "industry_high": actual_cfg.get("high"),
                        },
                        "modo": {
                            "metric_id": modo_cfg.get("id"),
                            "value": round(modo_val, 2),
                            "industry_low": modo_cfg.get("low"),
                            "industry_mid": modo_cfg.get("mid"),
                            "industry_high": modo_cfg.get("high"),
                            "variance_modo": round(
                                (
                                    ((actual_monthly - modo_val) / modo_val * 100)
                                    if modo_val
                                    else 0
                                ),
                                2,
                            ),
                        },
                        "iar": {
                            "metric_id": iar_cfg.get("id"),
                            "value": round(iar_val, 2),
                            "industry_low": iar_cfg.get("low"),
                            "industry_mid": iar_cfg.get("mid"),
                            "industry_high": iar_cfg.get("high"),
                            "variance_iar": round(
                                (
                                    ((actual_monthly - iar_val) / iar_val * 100)
                                    if iar_val
                                    else 0
                                ),
                                2,
                            ),
                        },
                    }
                )

            return Res.success(
                "S-10045",
                data={
                    "asset_id": asset_id,
                    "asset_name": asset.name,
                    "benchmarks": benchmark_results,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def _get_monthly_hardcoded(self, db: AsyncSession, month: int, year: int):
        monthly_values = await db.execute(
            select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.month == month,
                MonthlyHardcodedValue.year == year,
            )
        )

        monthly_values = monthly_values.scalars().all()

        return lambda metric_id: next(
            (item.value for item in monthly_values if item.metric_id == metric_id), 0
        )

    async def _extract_iar_row_value(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        query = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
            AssetFile.is_active.is_(True),
        )
        res = await db.execute(query)
        iar_file = res.scalars().first()

        if not iar_file:
            return 0.0

        try:
            file_obj, _ = FileStorageManager.get_file_object(
                iar_file.key, storage_type=iar_file.storage_server
            )

            df_raw = pd.read_excel(BytesIO(file_obj), header=None)
            df_clean, _ = self._extract_iar_dataset(df_raw)

            if df_clean is None:
                return 0.0

            target_label = "Total BESS Revenues incl. DUoS Fixed Charges (£/MW/month)"
            target_date = datetime(year, month, 1)

            row_mask = df_clean["Row_Label"].str.lower() == target_label.lower()
            row_data = df_clean[row_mask]

            if not row_data.empty and target_date in row_data.columns:
                val = row_data[target_date].iloc[0]
                return float(val) if pd.notna(val) else 0.0

            return 0.0
        except Exception:
            return 0.0

    async def _get_industry_metrics(self, db: AsyncSession, filter_ids: list[int]):
        query = (
            select(
                MetricIndustryConfiguration.metric_id,
                MetricIndustryConfiguration.industry_low,
                MetricIndustryConfiguration.industry_mid,
                MetricIndustryConfiguration.industry_high,
                Metric.metric_name,
            )
            .join(Metric, Metric.id == MetricIndustryConfiguration.metric_id)
            .where(MetricIndustryConfiguration.metric_id.in_(filter_ids))
        )

        res = await db.execute(query)
        rows = res.all()

        return [
            {
                "id": r.metric_id,
                "metric_name": r.metric_name,
                "industry_low": r.industry_low,
                "industry_mid": r.industry_mid,
                "industry_high": r.industry_high,
            }
            for r in rows
        ]

    async def download_benchmark_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        year: list[int] | None,
        current_user: dict,
    ):
        analysis_res = await self.get_benchmark_analysis(
            db, asset_id, year, current_user
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

            month_display = Month.get_name(b["month"])
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

    async def get_operations_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message=f"Asset with ID {asset_id} not found."
                )

            await audit_logs(
                db=db,
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
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error(
                    "E-10100",
                    message="Merged dataset is not available.",
                    http_status_code=404,
                )

            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))

                if "Timestamp" in df.columns:
                    df["Timestamp"] = pd.to_datetime(df["Timestamp"], format="mixed")
                    df.set_index("Timestamp", inplace=True)

                filtered_df = df[(df.index.month == month) & (df.index.year == year)]
                if filtered_df.empty:
                    return Res.error(
                        "E-10111",
                        message="Analysis data not found for the selected period.",
                    )

            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return Res.error(
                        "E-10114",
                        message="File key not found in S3. Please re-run merge.",
                    )
                raise e
            except Exception:
                traceback.print_exc()
                return Res.error("E-10001", message="Error processing analysis data.")

            sffr = float(filtered_df.get("SFFR revenues", 0).sum())
            ida1 = float(filtered_df.get("IDA1 Revenue", 0).sum())
            epex_30 = float(filtered_df.get("EPEX 30 DA Revenue", 0).sum())
            imb_rev = float(filtered_df.get("Imbalance Revenue", 0).sum())
            imb_chg = float(filtered_df.get("Imbalance Charge", 0).sum())

            net_imbalance = imb_rev - imb_chg
            total_net_revenue = sffr + ida1 + epex_30 + net_imbalance

            streams = [
                {"name": "SFFR", "val": sffr},
                {"name": "IDA1", "val": ida1},
                {"name": "EPEX 30 DA", "val": epex_30},
                {"name": "Net Imbalance", "val": net_imbalance},
            ]

            total_abs = sum(abs(s["val"]) for s in streams)
            revenue_distribution = []

            if total_abs > 0:
                for s in streams:
                    if s["val"] != 0:
                        revenue_distribution.append(
                            {
                                "name": s["name"],
                                "value": round(s["val"], 2),
                                "percentage": round(
                                    (abs(s["val"]) / total_abs) * 100, 1
                                ),
                            }
                        )

            return Res.success(
                "S-10036",
                data={
                    "month": month,
                    "year": year,
                    "trading_analysis": {
                        "sffr": round(sffr, 2),
                        "ida1": round(ida1, 2),
                        "epex_30_da": round(epex_30, 2),
                        "imbalance_revenue": round(imb_rev, 2),
                        "imbalance_charge": round(imb_chg, 2),
                        "net_imbalance": round(net_imbalance, 2),
                        "total_net_revenue": round(total_net_revenue, 2),
                    },
                    "revenue_distribution": revenue_distribution,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_solar_kpi_vitals(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message=f"Asset with ID {asset_id} not found."
                )

            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.VIEW_ANALYSIS,
                action=AuditLogScenario.VIEWED_ASSET_ANALYSIS,
                before={
                    "Asset": asset.name,
                    "Month/Year": f"{month}/{year}",
                },
                after="User viewed Solar KPI vitals",
                resource_id=asset.asset_id,
            )
            await db.commit()

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.SOLAR_DATASET.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            solar_file = file_query.scalars().first()
            if not solar_file:
                return Res.error(
                    "E-10100",
                    message="Solar dataset is not available.",
                    http_status_code=404,
                )

            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    solar_file.key, storage_type=solar_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))

                if "Timestamp" in df.columns:
                    df["Timestamp"] = pd.to_datetime(df["Timestamp"], format="mixed")
                    df.set_index("Timestamp", inplace=True)

                filtered_df = df[(df.index.month == month) & (df.index.year == year)]
                if filtered_df.empty:
                    return Res.error(
                        "E-10111",
                        message="Analysis data not found for the selected period.",
                    )

            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return Res.error(
                        "E-10114",
                        message="File key not found in S3. Please re-upload the solar report.",
                    )
                raise e
            except Exception:
                traceback.print_exc()
                return Res.error("E-10001", message="Error processing analysis data.")

            # 15-minute cadence: interval length in hours for energy/insolation integration
            interval_hours = 0.25

            energy_kwh = float(filtered_df.get("Export_kWh", 0).sum())
            energy_mwh = energy_kwh / 1000
            peak_power_mw = float(filtered_df.get("AC_Power_kW", 0).max()) / 1000
            insolation_kwh_m2 = (
                float((filtered_df.get("Irradiance_Wm2", 0) * interval_hours).sum())
                / 1000
            )

            # capacity is stored as a single MW value on the asset
            capacity_mw = float(asset.capacity) if asset.capacity else 0
            capacity_kw = capacity_mw * 1000
            hours_in_month = calendar.monthrange(year, month)[1] * 24

            specific_yield = (
                round(energy_kwh / capacity_kw, 2) if capacity_kw else None
            )
            capacity_factor_pct = (
                round((energy_mwh / (capacity_mw * hours_in_month)) * 100, 2)
                if capacity_mw and hours_in_month
                else None
            )
            performance_ratio_pct = (
                round((specific_yield / insolation_kwh_m2) * 100, 2)
                if specific_yield is not None and insolation_kwh_m2
                else None
            )

            return Res.success(
                "S-10094",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "capacity_mw": round(capacity_mw, 2),
                    "energy_exported_mwh": round(energy_mwh, 2),
                    "peak_power_mw": round(peak_power_mw, 2),
                    "capacity_factor_pct": capacity_factor_pct,
                    "specific_yield_kwh_per_kw": specific_yield,
                    "performance_ratio_pct": performance_ratio_pct,
                    "insolation_kwh_per_m2": round(insolation_kwh_m2, 2),
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_solar_generation_split(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.SOLAR_DATASET.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            solar_file = file_query.scalars().first()
            if not solar_file:
                return Res.error(
                    "E-10100",
                    message="Solar dataset is not available.",
                    http_status_code=404,
                )

            file_obj, _ = FileStorageManager.get_file_object(
                solar_file.key, storage_type=solar_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            if "Timestamp" in df.columns:
                df["Timestamp"] = pd.to_datetime(df["Timestamp"], format="mixed")
                df.set_index("Timestamp", inplace=True)

            filtered_df = df[(df.index.month == month) & (df.index.year == year)]

            offpeak_mwh = round(
                float(filtered_df.get("Offpeak_kWh", 0).sum()) / 1000, 2
            )
            peak_mwh = round(float(filtered_df.get("Peak_kWh", 0).sum()) / 1000, 2)

            chart_data = [
                {"label": "Off-Peak", "value": offpeak_mwh},
                {"label": "Peak", "value": peak_mwh},
            ]

            return Res.success(
                "S-10095",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "chart_data": chart_data,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10135", message="Aggregation/calculation failed")

    async def get_market_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message=f"Asset with ID {asset_id} not found."
                )

            # Fetch Merged Dataset Record
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100", message="Merged dataset is not available.")

            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))
            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return Res.error(
                        "E-10114",
                        message="File key not found in S3. Please re-run merge.",
                    )
                traceback.print_exc()
                return Res.error("E-10001", message="Oops something went wrong")

            if "Timestamp" in df.columns:
                df["Timestamp"] = pd.to_datetime(df["Timestamp"], dayfirst=True)
                df.set_index("Timestamp", inplace=True)

            filtered_df = df[(df.index.month == month) & (df.index.year == year)]

            if filtered_df.empty:
                return Res.error(
                    "E-10111",
                    message="Analysis data not found for the selected period.",
                )

            da_prices = filtered_df.get(
                "Day Ahead Price (EPEX)", pd.Series(dtype=float)
            )
            id_prices = filtered_df.get(
                "GB-ISEM Intraday 1 Price", pd.Series(dtype=float)
            )

            market_prices = {
                "day_ahead": {
                    "avg": round(da_prices.mean(), 2) if not da_prices.empty else 0,
                    "min": round(da_prices.min(), 2) if not da_prices.empty else 0,
                    "max": round(da_prices.max(), 2) if not da_prices.empty else 0,
                    "std_dev": round(da_prices.std(), 2) if not da_prices.empty else 0,
                },
                "intraday": {
                    "avg": round(id_prices.mean(), 2) if not id_prices.empty else 0,
                    "min": round(id_prices.min(), 2) if not id_prices.empty else 0,
                    "max": round(id_prices.max(), 2) if not id_prices.empty else 0,
                },
                "spread": (
                    round(id_prices.mean() - da_prices.mean(), 2)
                    if not (id_prices.empty or da_prices.empty)
                    else 0
                ),
            }

            # Ancillary Services Pricing
            ancillary_list = []
            services = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]
            for svc in services:
                price_col = f"{svc} Clearing Price"
                mw_col = f"{svc} Availability"

                # Use columns defined in your manifest
                if price_col in filtered_df.columns and mw_col in filtered_df.columns:
                    ancillary_list.append(
                        {
                            "service": svc,
                            "avg_clearing_price": round(
                                filtered_df[price_col].mean(), 2
                            ),
                            "avg_availability_mw": round(filtered_df[mw_col].mean(), 2),
                        }
                    )

            # Trading Activity (KPI Metrics) - Fixed AttributeError
            trading_activity = {
                "avg_da_mw": (
                    round(filtered_df.get("DA MW", pd.Series(dtype=float)).mean(), 2)
                    if "DA MW" in filtered_df.columns
                    else 0
                ),
                "avg_epex_30_da_mw": (
                    round(
                        filtered_df.get("EPEX 30 DA MW", pd.Series(dtype=float)).mean(),
                        2,
                    )
                    if "EPEX 30 DA MW" in filtered_df.columns
                    else 0
                ),
                "avg_ida1_mw": (
                    round(filtered_df.get("IDA1 MW", pd.Series(dtype=float)).mean(), 2)
                    if "IDA1 MW" in filtered_df.columns
                    else 0
                ),
            }

            # Success Response
            response_data = {
                "month": month,
                "year": year,
                "market_prices": market_prices,
                "ancillary_services": ancillary_list,
                "trading_activity": trading_activity,
            }

            return Res.success("S-10038", data=response_data)

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10001", message="An unexpected error occurred during analysis."
            )

    async def get_soc_distribution(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            # Role check
            if current_user.get("role") not in [
                UserRole.ADMIN.value,
                UserRole.ANALYST.value,
            ]:
                return Res.error("E-10013", message="Unauthorized")

            # Check asset
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            # Get merged dataset
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.is_active.is_(True),
                )
            )

            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100", message="Merged dataset not available")

            # Load dataset
            file_bytes, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_bytes))

            # Ensure timestamp index
            if "Timestamp" in df.columns:
                df["Timestamp"] = pd.to_datetime(df["Timestamp"], dayfirst=True)
                df.set_index("Timestamp", inplace=True)

            # Filter month/year
            df = df[(df.index.month == month) & (df.index.year == year)]

            if df.empty:
                return Res.error("E-10112", message="SOC data not available")

            # Drop null SOC
            df = df.dropna(subset=["SOC"])

            if df.empty:
                return Res.error("E-10112", message="SOC data not available")

            # Binning logic (IMPORTANT)

            bins = np.arange(0, 110, 10)  # 0-100
            labels = [f"{i}-{i+10}" for i in range(0, 100, 10)]

            df["soc_bin"] = pd.cut(
                df["SOC"], bins=bins, labels=labels, right=False, include_lowest=True
            )

            # handle 100 edge case
            df.loc[df["SOC"] == 100, "soc_bin"] = "90-100"

            # Count
            distribution = df["soc_bin"].value_counts().sort_index()

            # ensure all bins exist
            full_bins = pd.Series(0, index=labels)
            distribution = full_bins.add(distribution, fill_value=0).astype(int)

            # Format response
            soc_distribution = []
            for label in labels:
                min_val, max_val = map(int, label.split("-"))
                soc_distribution.append(
                    {
                        "range": {"min": min_val, "max": max_val},
                        "count": int(distribution[label]),
                    }
                )

            return Res.success(
                "S-10037",
                data={
                    "month": month,
                    "year": year,
                    "soc_distribution": soc_distribution,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001", message="Failed to compute SOC distribution")

    async def get_asset_energy_price_comparison(
        self, asset_id: int, month: int, year: int, db: AsyncSession, current_user: dict
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034", message=f"Asset with ID {asset_id} not found.")

        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )

        merged_file = file_query.scalars().first()
        if not merged_file:
            return Res.error("E-10100", message="Merged dataset is not available.")

        file_obj, _ = FileStorageManager.get_file_object(
            merged_file.key, storage_type=merged_file.storage_server
        )
        df = pd.read_excel(BytesIO(file_obj), engine="openpyxl")

        if "Timestamp" not in df.columns:
            return Res.error("E-10001", "Malformed Aggregator file")

        # Replaced .iterrows() loop with rapid vectorization
        # Isolate rows where both pricing variables are not null simultaneously
        temp_df = df.dropna(
            subset=["Day Ahead Price (EPEX)", "GB-ISEM Intraday 1 Price"], how="all"
        ).copy()

        temp_df["timestamp"] = pd.to_datetime(
            temp_df["Timestamp"], format="mixed"
        ).dt.strftime("%Y-%m-%dT%H:%M:%S")
        temp_df["day_ahead_price"] = temp_df["Day Ahead Price (EPEX)"].replace(
            {np.nan: None}
        )
        temp_df["intraday_price"] = temp_df["GB-ISEM Intraday 1 Price"].replace(
            {np.nan: None}
        )

        # Directly build matrix records layout instantly in memory
        energy_price_comparison = temp_df[
            ["timestamp", "day_ahead_price", "intraday_price"]
        ].to_dict(orient="records")

        return Res.success(
            "S-10050",
            data={
                "month": month,
                "year": year,
                "energy_price_comparison": energy_price_comparison,
            },
        )

    # async def get_batter_power(self, asset_id: int, month: int, year: int, db: AsyncSession, current_user: dict):
    #     if Platform.AMD.value not in current_user.get("platform", []):
    #         return Res.error("E-10013", message="Unauthorized: AMD platform required")

    #     asset = await db.get(Asset, asset_id)
    #     if not asset:
    #         return Res.error("E-10034", message=f"Asset with ID {asset_id} not found.")

    #     file_query = await db.execute(
    #         select(AssetFile).where(
    #             AssetFile.asset_id == asset_id,
    #             AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
    #             extract('month', AssetFile.projection_start_date) == month,
    #             extract('year', AssetFile.projection_start_date) == year,
    #         )
    #     )

    #     merged_file = file_query.scalars().first()
    #     if not merged_file:
    #         return Res.error("E-10100", message="Merged dataset is not available.")

    #     file_obj, _ = FileStorageManager.get_file_object(merged_file.key, storage_type=merged_file.storage_server)
    #     df = pd.read_excel(BytesIO(file_obj), engine="openpyxl")

    #     if not 'Timestamp' in df.columns:
    #         return Res.error('E-10001', 'Malformed Aggragator file')

    #     # convert time stamp for indexing
    #     df['Timestamp'] = pd.to_datetime(df['Timestamp'], dayfirst=True)
    #     df.set_index('Timestamp', inplace=True)

    #     # extract data
    #     battery_power_over_time = []
    #     for timestamp, row in df.iterrows():

    #         battery_power = row.get('Power_MW')

    #         if pd.isna(battery_power):
    #             continue

    #         battery_power_over_time.append({
    #             "timestamp": timestamp.isoformat(),
    #             "battery_power": (
    #                 float(battery_power)
    #                 if pd.notna(battery_power) else None
    #             ),
    #         })

    #     return Res.success('S-10051', data={
    #         "month": month,
    #         "year": year,
    #         "battery_power_over_time": battery_power_over_time
    #     })

    async def get_batter_power(
        self, asset_id: int, month: int, year: int, db: AsyncSession, current_user: dict
    ):
        if Platform.AMD.value not in current_user.get("platform", []):
            return Res.error("E-10013", message="Unauthorized: AMD platform required")

        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034", message=f"Asset with ID {asset_id} not found.")

        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )

        merged_file = file_query.scalars().first()
        if not merged_file:
            return Res.error("E-10100", message="Merged dataset is not available.")

        file_obj, _ = FileStorageManager.get_file_object(
            merged_file.key, storage_type=merged_file.storage_server
        )
        df = pd.read_excel(BytesIO(file_obj), engine="openpyxl")

        if "Timestamp" not in df.columns:
            return Res.error("E-10001", "Malformed Aggregator file")

        # Removed loop iterrows()
        temp_df = df.dropna(subset=["Power_MW"]).copy()
        temp_df["timestamp"] = pd.to_datetime(
            temp_df["Timestamp"], format="mixed"
        ).dt.strftime("%Y-%m-%dT%H:%M:%S")
        temp_df["battery_power"] = temp_df["Power_MW"].astype(float)

        battery_power_over_time = temp_df[["timestamp", "battery_power"]].to_dict(
            orient="records"
        )

        return Res.success(
            "S-10051",
            data={
                "month": month,
                "year": year,
                "battery_power_over_time": battery_power_over_time,
            },
        )

    async def _get_optimized_df(self, db, asset_id, month, year):
        """Helper to fetch and load the optimized CSV"""
        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )
        opt_file = file_query.scalars().first()
        if not opt_file:
            return None

        file_obj, _ = FileStorageManager.get_file_object(
            opt_file.key, storage_type=opt_file.storage_server
        )
        return pd.read_csv(io.BytesIO(file_obj))

    async def get_market_analysis_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            df = await self._get_optimized_df(db, asset_id, month, year)
            if df is None or len(df) == 0:
                return Res.error("E-10132", message="Optimized dataset not available.")

            daily_rev = float(df["Optimised_Revenue_Daily"].sum()) * 0.95
            efa_rev = float(df["Optimised_Revenue_EFA"].sum()) * 0.95
            multi_rev = float(df["Optimised_Revenue_Multi"].sum()) * 0.95

            # Improvements are calculated based on the net values
            imp_efa = ((efa_rev - daily_rev) / daily_rev * 100) if daily_rev != 0 else 0
            imp_multi = (
                ((multi_rev - daily_rev) / daily_rev * 100) if daily_rev != 0 else 0
            )

            diff_revenue = multi_rev - daily_rev

            actual_df, _ = await self._process_actual_strategy_df(
                db, asset_id, month, year
            )
            actual_revenue_total = (
                float(actual_df["assigned_net_revenue"].sum())
                if not actual_df.empty
                else 0.0
            )

            return Res.success(
                "S-10055",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "epex_daily": {
                        "total_revenue": round(daily_rev, 2),
                    },
                    "epex_efa": {
                        "total_revenue": round(efa_rev, 2),
                        "improvement": round(imp_efa, 2),
                    },
                    "multi_market": {
                        "total_revenue": round(multi_rev, 2),
                        "improvement": round(imp_multi, 2),
                    },
                    "additional_revenue": round(diff_revenue, 2),
                    "actual_revenue": round(actual_revenue_total, 2),
                    "note": "All revenue values are shown after deducting the 5% GridBeyond revenue share.",
                },
            )
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10001", errors=[str(e)])

    async def _process_actual_strategy_df(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        file_stmt = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
        )
        files_res = await db.execute(file_stmt)
        merged_records = files_res.scalars().all()
        if not merged_records:
            return None, "E-10100"
        try:
            dfs = []
            for f in merged_records:
                obj, _ = FileStorageManager.get_file_object(
                    f.key, storage_type=f.storage_server
                )
                sub_df = pd.read_excel(BytesIO(obj))
                sub_df.columns = [str(c).strip() for c in sub_df.columns]
                dfs.append(sub_df)
            df = pd.concat(dfs, ignore_index=True)
        except Exception:
            return None, "E-10140"

        ts_col = None
        for col in df.columns:
            if col.lower().strip() == "timestamp":
                ts_col = col
                break
        if not ts_col:
            return None, "E-10139"

        df[ts_col] = pd.to_datetime(df[ts_col], errors="coerce")
        df = df[(df[ts_col].dt.month == month) & (df[ts_col].dt.year == year)].copy()
        if df.empty:
            return pd.DataFrame(), None

        col_map = {c.lower().strip(): c for c in df.columns}
        required = [
            "epex 30 da revenue",
            "epex da revenues",
            "ida1 revenue",
            "idc revenue",
            "imbalance revenue",
            "imbalance charge",
            "sffr revenues",
            "power_mw",
        ]
        for r in required:
            if r not in col_map:
                return None, "E-10139"

        epex_30_da = df[col_map["epex 30 da revenue"]].fillna(0).astype(float)
        epex_da = df[col_map["epex da revenues"]].fillna(0).astype(float)
        df["derived_epex_revenue"] = epex_30_da + epex_da

        df["derived_ida1_revenue"] = df[col_map["ida1 revenue"]].fillna(0).astype(float)
        df["derived_idc_revenue"] = df[col_map["idc revenue"]].fillna(0).astype(float)
        df["derived_imb_revenue"] = (
            df[col_map["imbalance revenue"]].fillna(0).astype(float)
        )
        df["derived_imb_charge"] = (
            df[col_map["imbalance charge"]].fillna(0).astype(float)
        )
        df["derived_sffr_revenue"] = (
            df[col_map["sffr revenues"]].fillna(0).astype(float)
        )
        df["derived_power_mw"] = df[col_map["power_mw"]].fillna(0).astype(float)

        assigned_markets = []
        assigned_revenues = []

        for row in df.itertuples():
            market = "Idle"
            rev = 0.0

            if abs(row.derived_epex_revenue) > 0.01:
                market = "EPEX"
                rev = row.derived_epex_revenue
            elif abs(row.derived_ida1_revenue) > 0.01:
                market = "IDA1"
                rev = row.derived_ida1_revenue
            elif abs(row.derived_idc_revenue) > 0.01:
                market = "IDC"
                rev = row.derived_idc_revenue
            elif (
                abs(row.derived_imb_revenue) > 0.01
                or abs(row.derived_imb_charge) > 0.01
            ):
                market = "Imbalance"
                rev = row.derived_imb_revenue - abs(row.derived_imb_charge)
            elif abs(row.derived_sffr_revenue) > 0.01:
                market = "SFFR"
                rev = row.derived_sffr_revenue
            else:
                market = "Idle"
                rev = 0.0

            if market in ["EPEX", "IDA1", "IDC"]:
                if row.derived_power_mw > 0.1:
                    market = f"Sell-{market}"
                elif row.derived_power_mw < -0.1:
                    market = f"Buy-{market}"

            assigned_markets.append(market)
            assigned_revenues.append(rev)

        df["assigned_market_label"] = assigned_markets
        df["assigned_net_revenue"] = [r * 0.95 for r in assigned_revenues]

        return df, None

    async def get_market_utilization(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
    ):
        try:
            utilization_data = []

            if market_strategy == "actual":
                df, err_code = await self._process_actual_strategy_df(
                    db, asset_id, month, year
                )
                if err_code:
                    return Res.error(err_code)
                if df.empty:
                    return Res.error(
                        "E-10100",
                        message="No actual data available for the selected period.",
                    )

                group_col = "assigned_market_label"
                rev_col = "assigned_net_revenue"
            else:
                df_full = await self._get_optimized_df(db, asset_id, month, year)
                if df_full is None or len(df_full) == 0:
                    return Res.error("E-10100")

                df = df_full.copy()
                if market_strategy == "multi":
                    group_col = "Market_Used_Multi"
                    rev_col = "Optimised_Revenue_Multi"
                    df.loc[df["Strategy_Selected_Multi"] == "SFFR", group_col] = "SFFR"
                elif market_strategy == "epex_daily":
                    group_col = "Strategy_Selected_Daily"
                    rev_col = "Optimised_Revenue_Daily"
                elif market_strategy == "epex_efa":
                    group_col = "Strategy_Selected_EFA"
                    rev_col = "Optimised_Revenue_EFA"
                else:
                    return Res.error("E-10132", message="Invalid strategy selected.")

            if not df.empty:
                total_strategy_rows = len(df)
                counts = df[group_col].value_counts()
                for label, count in counts.items():
                    mask = df[group_col] == label
                    total_rev = float(df.loc[mask, rev_col].sum())

                    # Convert labels format dynamically for backwards optimization compliance
                    clean_label = (
                        str(label).replace("-", "_")
                        if market_strategy != "actual"
                        else str(label)
                    )

                    utilization_data.append(
                        {
                            "market_used": clean_label,
                            "count": int(count),
                            "percentage": round((count / total_strategy_rows) * 100, 2),
                            "total_revenue": round(total_rev, 2),
                        }
                    )

                    clean_label = str(label).replace("-", "_")

            return Res.success(
                "S-10056",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    "data": utilization_data,
                },
            )
        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10140", errors=[str(e)])

    async def get_market_statistics_table(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        current_user: dict,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            valid_strategies = ["epex_daily", "epex_efa", "multi", "actual"]
            if market_strategy not in valid_strategies:
                return Res.error("E-10134", message="Invalid market strategy passed")

            rows = []

            if market_strategy == "actual":
                df, err_code = await self._process_actual_strategy_df(
                    db, asset_id, month, year
                )
                if err_code:
                    return Res.error(err_code)
                if df.empty:
                    return Res.error(
                        "E-10100",
                        message="No actual data available for the selected period.",
                    )

                strategy_col = "assigned_market_label"
                revenue_col = "assigned_net_revenue"
            else:
                df = await self._get_optimized_df(db, asset_id, month, year)
                if df is None or df.empty:
                    return Res.error(
                        "E-10100", message="Optimized dataset not available"
                    )

                if market_strategy == "epex_daily":
                    strategy_col, revenue_col = (
                        "Strategy_Selected_Daily",
                        "Optimised_Revenue_Daily",
                    )
                elif market_strategy == "epex_efa":
                    strategy_col, revenue_col = (
                        "Strategy_Selected_EFA",
                        "Optimised_Revenue_EFA",
                    )
                else:  # multi
                    strategy_col, revenue_col = (
                        "Market_Used_Multi",
                        "Optimised_Revenue_Multi",
                    )
                    df = df.copy()
                    df.loc[df["Strategy_Selected_Multi"] == "SFFR", strategy_col] = (
                        "SFFR"
                    )

            total_periods = len(df)
            total_revenue = float(df[revenue_col].fillna(0).sum())
            markets = df[strategy_col].dropna().unique().tolist()

            for market in markets:
                mask = df[strategy_col] == market
                market_periods = int(mask.sum())
                market_revenue = float(df.loc[mask, revenue_col].fillna(0).sum())

                pct_time = (
                    round((market_periods / total_periods) * 100, 1)
                    if total_periods
                    else 0.0
                )
                pct_revenue = (
                    round((market_revenue / total_revenue) * 100, 1)
                    if total_revenue
                    else 0.0
                )

                rows.append(
                    {
                        "market": market,
                        "periods": market_periods,
                        "percentage_time": pct_time,
                        "revenue": round(market_revenue, 2),
                        "percentage_revenue": pct_revenue,
                    }
                )

            rows.append(
                {
                    "market": "TOTAL",
                    "periods": total_periods,
                    "percentage_time": 100.0,
                    "revenue": round(total_revenue, 2),
                    "percentage_revenue": 100.0,
                }
            )

            return Res.success(
                "S-10057",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    "total_periods": total_periods,
                    "total_revenue": round(total_revenue, 2),
                    "rows": rows,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10135", message="Aggregation/calculation failed")

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

    async def get_revenue_distribution_chart(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        market_strategy: str,
        current_user: dict,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            valid_strategies = ["epex_daily", "epex_efa", "multi", "actual"]
            if market_strategy not in valid_strategies:
                return Res.error("E-10134", message="Invalid market strategy passed")

            chart_data = []

            if market_strategy == "actual":
                df, err_code = await self._process_actual_strategy_df(
                    db, asset_id, month, year
                )
                if err_code:
                    return Res.error(err_code)
                if df.empty:
                    return Res.success(
                        "S-10058",
                        data={
                            "asset_id": asset_id,
                            "month": month,
                            "year": year,
                            "market_strategy": market_strategy,
                            "chart_data": [],
                        },
                    )

                strategy_col = "assigned_market_label"
                revenue_col = "assigned_net_revenue"
            else:
                df_raw = await self._get_optimized_df(db, asset_id, month, year)
                if df_raw is None or df_raw.empty:
                    return Res.error(
                        "E-10100", message="Optimized dataset not available"
                    )
                df = df_raw.copy()

                if market_strategy == "epex_daily":
                    strategy_col, revenue_col = (
                        "Strategy_Selected_Daily",
                        "Optimised_Revenue_Daily",
                    )
                elif market_strategy == "epex_efa":
                    strategy_col, revenue_col = (
                        "Strategy_Selected_EFA",
                        "Optimised_Revenue_EFA",
                    )
                else:  # multi
                    strategy_col, revenue_col = (
                        "Market_Used_Multi",
                        "Optimised_Revenue_Multi",
                    )
                    df.loc[df["Strategy_Selected_Multi"] == "SFFR", strategy_col] = (
                        "SFFR"
                    )

            markets = df[strategy_col].dropna().unique().tolist()
            for market in markets:
                if str(market).lower().strip() in ["idle", "unknown operation / idle"]:
                    continue

                revenue = float(
                    df.loc[df[strategy_col] == market, revenue_col].fillna(0).sum()
                )
                chart_data.append({"market": market, "revenue": round(revenue, 2)})

            return Res.success(
                "S-10058",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "market_strategy": market_strategy,
                    "chart_data": chart_data,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10135", message="Aggregation/calculation failed")

    async def get_best_markets(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            df = await self._get_optimized_df(db, asset_id, month, year)
            if df is None or len(df) == 0:
                return Res.error("E-10100")

            buy_counts = df["Best_Buy_Market"].value_counts().reset_index()
            buy_counts.columns = ["market", "times_selected"]
            total_buy = buy_counts["times_selected"].sum()
            buy_counts["percentage"] = (
                buy_counts["times_selected"] / total_buy * 100
            ).round(1)
            buying_markets = buy_counts.sort_values(
                by="times_selected", ascending=False
            ).to_dict(orient="records")

            sell_counts = df["Best_Sell_Market"].value_counts().reset_index()
            sell_counts.columns = ["market", "times_selected"]
            total_sell = sell_counts["times_selected"].sum()
            sell_counts["percentage"] = (
                sell_counts["times_selected"] / total_sell * 100
            ).round(1)
            selling_markets = sell_counts.sort_values(
                by="times_selected", ascending=False
            ).to_dict(orient="records")

            return Res.success(
                "S-10059",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "buying_markets": buying_markets,
                    "selling_markets": selling_markets,
                },
            )

        except Exception:
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
                return Res.error("E-10132", message=f"No {m_type} data available.")

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

        except Exception:
            traceback.print_exc()
            return Res.error("E-10135")

    async def get_price_spread_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.")
            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10121",
                    message="Price spread analysis is not applicable for Solar assets.",
                )

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error(
                    "E-10100", message="Required merged dataset not available."
                )

            # Load Merged Data
            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(io.BytesIO(file_obj))

            def normalize_col(c):
                return c.lower().strip().replace(" ", "_").replace("-", "_")

            df.columns = [normalize_col(c) for c in df.columns]

            epex_col = normalize_col(
                "Day Ahead Price (EPEX)"
            )  # 'day_ahead_price_(epex)'
            ssp_col = normalize_col("SSP Price")  # 'ssp_price'
            sbp_col = normalize_col("SBP Price")  # 'sbp_price'
            timestamp_col = normalize_col("Timestamp")

            if ssp_col not in df.columns and "ssp" in df.columns:
                ssp_col = "ssp"
            if sbp_col not in df.columns and "sbp" in df.columns:
                sbp_col = "sbp"

            for col in [epex_col, ssp_col, sbp_col, timestamp_col]:
                if col not in df.columns:
                    return Res.error(
                        "E-10133",
                        message=f"Required column '{col}' is missing in the merged dataset.",
                    )

            df[timestamp_col] = pd.to_datetime(df[timestamp_col])

            price_summary = {
                "epex_da_avg_price_per_mwh": round(float(df[epex_col].mean()), 2),
                "epex_da_max_price_per_mwh": round(float(df[epex_col].max()), 2),
                "ssp_max_price_per_mwh": round(float(df[ssp_col].max()), 2),
                "sbp_max_price_per_mwh": round(float(df[sbp_col].max()), 2),
            }

            daily_df = (
                df.groupby(df[timestamp_col].dt.date)
                .agg(
                    Daily_MAX_EPEX=(epex_col, "max"),
                    Daily_MIN_EPEX=(epex_col, "min"),
                    SBP_MAX=(sbp_col, "max"),
                    SSP_MIN=(ssp_col, "min"),
                )
                .reset_index()
            )

            daily_df["Daily_EPEX_SPREAD"] = (
                daily_df["Daily_MAX_EPEX"] - daily_df["Daily_MIN_EPEX"]
            )
            daily_df["Daily_SBP_SSP_SPREAD"] = daily_df["SBP_MAX"] - daily_df["SSP_MIN"]

            daily_df["date_str"] = pd.to_datetime(daily_df[timestamp_col]).dt.strftime(
                "%Y-%m-%d"
            )
            daily_df["spread_rounded"] = (
                daily_df["Daily_EPEX_SPREAD"].astype(float).round(2)
            )

            daily_epex_spread_list = (
                daily_df[["date_str", "spread_rounded"]]
                .rename(columns={"date_str": "date", "spread_rounded": "spread"})
                .to_dict(orient="records")
            )

            spread_analysis = {
                "epex_avg_daily_spread_per_mwh": round(
                    float(daily_df["Daily_EPEX_SPREAD"].mean()), 2
                ),
                "epex_max_daily_spread_per_mwh": round(
                    float(daily_df["Daily_EPEX_SPREAD"].max()), 2
                ),
                "avg_ssp_sbp_spread_per_mwh": round(
                    float(daily_df["Daily_SBP_SSP_SPREAD"].mean()), 2
                ),
                "daily_epex_spread": daily_epex_spread_list,
            }

            return Res.success(
                "S-10060",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "price_summary": price_summary,
                    "spread_analysis": spread_analysis,
                },
            )

        except Exception as e:
            traceback.print_exc()
            return Res.error(errors=[str(e)])

    async def get_price_volatility_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found.")

            # FETCH MERGED FILE
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error(
                    "E-10100", message="Market price dataset not available."
                )

            # LOAD FILE
            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(io.BytesIO(file_obj))

            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return Res.error("E-10114", message="File key not found in S3.")
                traceback.print_exc()
                return Res.error("E-10001", message="Failed to load merged dataset.")

            # NORMALIZE COLUMNS
            def normalize_col(c):
                return (
                    c.lower()
                    .strip()
                    .replace(" ", "_")
                    .replace("-", "_")
                    .replace("(", "")
                    .replace(")", "")
                )

            df.columns = [normalize_col(c) for c in df.columns]
            timestamp_col = normalize_col("Timestamp")
            epex_col = normalize_col("Day Ahead Price (EPEX)")
            required_cols = [timestamp_col, epex_col]
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                return Res.error(
                    "E-10136", message=f"Required columns missing: {missing_cols}"
                )

            # TIMESTAMP CONVERSION
            df[timestamp_col] = pd.to_datetime(
                df[timestamp_col], dayfirst=True, errors="coerce"
            )
            df[epex_col] = pd.to_numeric(df[epex_col], errors="coerce")
            df = df.dropna(subset=[timestamp_col, epex_col])

            if df.empty:
                return Res.error(
                    "E-10100", message="No valid volatility data available."
                )

            # EXTRACT DATE
            df["date"] = df[timestamp_col].dt.date

            # DAILY GROUPING
            grouped = df.groupby("date")[epex_col]

            # DAILY MEAN + STD DEV
            daily_df = grouped.agg(
                epex_mean="mean", std_deviation=lambda x: x.std(ddof=1)
            ).reset_index()
            if daily_df.empty:
                return Res.error("E-10137", message="Volatility calculation failed.")

            sorted_std = np.sort(daily_df["std_deviation"].values)
            position = round(0.75 * len(sorted_std))
            position = max(position, 1)
            threshold = round(float(sorted_std[position - 1]), 2)

            # HIGH VOLATILITY DAYS
            high_volatility_df = daily_df[
                daily_df["std_deviation"] >= sorted_std[position - 1]
            ]

            # KPI CALCULATIONS
            average_daily_volatility = round(float(daily_df["std_deviation"].mean()), 2)
            high_volatility_days = int(len(high_volatility_df))

            # MAX VOLATILITY
            if high_volatility_df.empty:
                return Res.error("E-10137", message="Volatility calculation failed.")
            max_row = high_volatility_df.loc[
                high_volatility_df["std_deviation"].idxmax()
            ]
            max_volatility = {
                "value": round(float(max_row["std_deviation"]), 2),
                "date": str(max_row["date"]),
            }

            # CHART DATA
            chart_data = []
            for _, row in daily_df.iterrows():
                chart_data.append(
                    {
                        "date": str(row["date"]),
                        "epex_mean": round(float(row["epex_mean"]), 2),
                        "std_deviation": round(float(row["std_deviation"]), 2),
                        "threshold": threshold,
                    }
                )

            return Res.success(
                "S-10062",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "threshold": threshold,
                    "kpi": {
                        "average_daily_volatility": average_daily_volatility,
                        "high_volatility_days": high_volatility_days,
                        "max_volatility": max_volatility,
                    },
                    "chart_data": chart_data,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10137", message="Volatility calculation failed.")

    async def get_hourly_price_patterns(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            # Solar validation
            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10121",
                    message="Hourly price pattern not supported for solar asset",
                )

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100", message="Merged dataset not available")

            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))

            except Exception:
                traceback.print_exc()
                return Res.error("E-10001", message="Failed to load merged dataset")

            required_columns = ["Timestamp", "Day Ahead Price (EPEX)", "SSP", "SBP"]

            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return Res.error(
                    "E-10001", message=f"Missing columns: {missing_columns}"
                )

            df["Timestamp"] = pd.to_datetime(
                df["Timestamp"], dayfirst=True, errors="coerce"
            )

            df = df.dropna(subset=["Timestamp"])

            df = df[
                (df["Timestamp"].dt.month == month) & (df["Timestamp"].dt.year == year)
            ]

            if df.empty:
                return Res.error(
                    "E-10111", message="No analysis data found for selected period"
                )

            # CREATE HOUR BUCKET
            df = df.copy()
            df["hour"] = df["Timestamp"].dt.hour

            # GENERATE HOURLY DATASET
            hourly_df = (
                df.groupby("hour")
                .agg(
                    epex_da=("Day Ahead Price (EPEX)", "mean"),
                    ssp=("SSP", "mean"),
                    sbp=("SBP", "mean"),
                )
                .reset_index()
            )

            # Ensure all 24 hours exist
            hourly_df = hourly_df.set_index("hour").reindex(range(24)).reset_index()

            hourly_df = hourly_df.fillna(0)
            hourly_df["epex_da"] = hourly_df["epex_da"].round(2)
            hourly_df["ssp"] = hourly_df["ssp"].round(2)
            hourly_df["sbp"] = hourly_df["sbp"].round(2)

            # Lowest Avg EPEX
            lowest_idx = hourly_df["epex_da"].idxmin()
            lowest_avg_epex_price = float(hourly_df.loc[lowest_idx, "epex_da"])
            best_buy_hour = int(hourly_df.loc[lowest_idx, "hour"])

            # Highest Avg EPEX
            highest_idx = hourly_df["epex_da"].idxmax()
            highest_avg_epex_price = float(hourly_df.loc[highest_idx, "epex_da"])
            best_sell_hour = int(hourly_df.loc[highest_idx, "hour"])

            # Hourly Arbitrage
            hourly_arbitrage = round(
                float(highest_avg_epex_price - lowest_avg_epex_price), 2
            )
            hourly_price_patterns = []

            for _, row in hourly_df.iterrows():
                hourly_price_patterns.append(
                    {
                        "hour": int(row["hour"]),
                        "epex_da": float(row["epex_da"]),
                        "ssp": float(row["ssp"]),
                        "sbp": float(row["sbp"]),
                    }
                )

            response_data = {
                "asset_id": asset_id,
                "month": month,
                "year": year,
                "lowest_avg_epex_price_per_mwh": lowest_avg_epex_price,
                "best_buy_hour": best_buy_hour,
                "highest_avg_epex_price_per_mwh": highest_avg_epex_price,
                "best_sell_hour": best_sell_hour,
                "hourly_arbitrage_per_mwh": hourly_arbitrage,
                "hourly_price_patterns": hourly_price_patterns,
            }
            return Res.success("S-10061", data=response_data)

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_price_correlation_matrix(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message=f"Asset with ID {asset_id} not found."
                )

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100", message="Merged dataset is not available.")
            try:
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj), engine="openpyxl")

            except botocore.exceptions.ClientError as e:
                if e.response["Error"]["Code"] == "NoSuchKey":
                    return Res.error("E-10114", message="File key not found in S3.")
                traceback.print_exc()

                return Res.error("E-10001", message="Failed to load merged dataset.")

            required_columns = [
                "Timestamp",
                "Day Ahead Price (EPEX)",
                "GB-ISEM Intraday 1 Price",
                "SSP",
                "SBP",
            ]
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Res.error(
                    "E-10141", message=f"Missing required columns: {missing_columns}"
                )

            df["Timestamp"] = pd.to_datetime(
                df["Timestamp"], dayfirst=True, errors="coerce"
            )
            df = df.dropna(subset=["Timestamp"])
            df = df[
                (df["Timestamp"].dt.month == month) & (df["Timestamp"].dt.year == year)
            ]
            if df.empty:
                return Res.error(
                    "E-10111", message="Analysis data not found for selected period."
                )
            df = df.drop_duplicates(subset=["Timestamp"])
            correlation_df = df[
                ["Day Ahead Price (EPEX)", "GB-ISEM Intraday 1 Price", "SSP", "SBP"]
            ].copy()
            markets = ["EPEX DA", "Intraday", "SSP", "SBP"]
            correlation_df.columns = markets
            correlation_df = correlation_df.apply(pd.to_numeric, errors="coerce")
            correlation_df = correlation_df.dropna()

            if len(correlation_df) < 2:
                return Res.error(
                    "E-10142",
                    message="Insufficient valid records for correlation calculation.",
                )
            std_values = correlation_df.std()
            if (std_values <= 0).any() or std_values.isna().any():
                return Res.error(
                    "E-10143", message="Standard deviation calculation failed."
                )

            try:
                corr_matrix = correlation_df.corr(method="pearson").round(2)
            except Exception:
                traceback.print_exc()
                return Res.error(
                    "E-10144", message="Correlation matrix calculation failed."
                )
            for i in range(len(corr_matrix)):
                corr_matrix.iat[i, i] = 1.00

            return Res.success(
                "S-10165",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "correlation_matrix": {
                        "markets": markets,
                        "matrix": corr_matrix.values.tolist(),
                    },
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10144", message="Failed to generate price correlation matrix."
            )

    async def get_revenue_iar_vs_actual(
        self, db: AsyncSession, asset_id: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            opt_params = (
                await db.execute(
                    select(AssetOptimizationParameter).where(
                        AssetOptimizationParameter.asset_id == asset_id
                    )
                )
            ).scalar_one_or_none()

            if not opt_params or not opt_params.usable_capacity_mwh:
                return Res.error(
                    "E-10149", message="Asset capacity configuration missing"
                )

            files_stmt = select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type.in_(
                    [
                        AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                        AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    ]
                ),
                AssetFile.is_active.is_(True),
            )
            files_res = await db.execute(files_stmt)
            all_files = files_res.scalars().all()

            iar_records = [
                f
                for f in all_files
                if f.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value
            ]
            merged_records = [
                f
                for f in all_files
                if f.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value
            ]

            if not iar_records:
                return Res.error("E-10145", message="IAR dataset is not available")
            if not merged_records:
                return Res.error(
                    "E-10146", message="Actual revenue dataset is not available"
                )

            async def fetch_iar(file_record):
                obj, _ = FileStorageManager.get_file_object(
                    file_record.key, storage_type=file_record.storage_server
                )
                return pd.read_excel(BytesIO(obj), header=None)

            async def fetch_merged_file(file_record):
                obj, _ = FileStorageManager.get_file_object(
                    file_record.key, storage_type=file_record.storage_server
                )
                return pd.read_excel(BytesIO(obj))

            try:
                iar_df_raw = await fetch_iar(iar_records[0])
            except Exception:
                return Res.error(
                    "E-10153", message="Failed to load IAR baseline template file"
                )

            try:
                merged_dfs = await asyncio.gather(
                    *(fetch_merged_file(f) for f in merged_records)
                )

                for sub_df in merged_dfs:
                    sub_df.columns = [str(c).strip() for c in sub_df.columns]

                merged_df = pd.concat(merged_dfs, ignore_index=True)
            except Exception:
                return Res.error(
                    "E-10153",
                    message="Revenue IAR vs Actual calculation failed to load merged datasets",
                )

            hardcoded_stmt = select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.year == year
            )
            hardcoded_res = await db.execute(hardcoded_stmt)
            settings_year_map = {}
            for item in hardcoded_res.scalars().all():
                if item.month not in settings_year_map:
                    settings_year_map[item.month] = {}
                settings_year_map[item.month][item.metric_id] = float(item.value)

            iar_df, _ = self._extract_iar_dataset(iar_df_raw)
            if iar_df is None or iar_df.empty:
                return Res.error("E-10147", message="Required IAR columns are missing")

            timestamp_col = None
            for col in merged_df.columns:
                if str(col).lower().strip() == "timestamp":
                    timestamp_col = col
                    break

            if timestamp_col is not None:
                merged_df[timestamp_col] = pd.to_datetime(
                    merged_df[timestamp_col], format="mixed"
                )
                merged_df.set_index(timestamp_col, inplace=True)
            else:
                return Res.error(
                    "E-10148",
                    message="Timestamp reference missing in actual revenue dataset",
                )

            stream_config = {
                "Wholesale Day Ahead": {
                    "iar_label": "Wholesale Day Ahead Battery Revenue",
                    "csv_cols": ["epex 30 da revenue", "epex da revenues"],
                },
                "Wholesale Intraday": {
                    "iar_label": "Wholesale Intraday Revenue",
                    "csv_cols": ["ida1 revenue"],
                },
                "Balancing Mechanism": {
                    "iar_label": "Balancing Mechanism Revenue",
                    "csv_cols": [],
                },
                "Frequency Response": {
                    "iar_label": "Frequency Response Revenues",
                    "csv_cols": ["sffr revenues"],
                },
                "Capacity Market": {
                    "iar_label": "Capacity Market Revenues",
                    "use_settings": True,
                    "metric_id": AssetMetrics.CAPACITY_MARKET.value,
                },
                "DUoS Battery": {
                    "iar_label": "DUoS Battery Revenues",
                    "use_settings": True,
                    "metric_id": AssetMetrics.DUOS_CREDIT.value,
                },
                "DUoS Fixed Charges": {
                    "iar_label": "DUoS Fixed Charges",
                    "use_settings": True,
                    "metric_id": AssetMetrics.DUOS_FIXED_CHARGES.value,
                    "is_cost": True,
                },
                "TNUoS": {"iar_label": "TNUoS Revenues", "csv_cols": []},
                "Imbalance Revenue": {
                    "iar_label": None,
                    "csv_cols": ["imbalance revenue"],
                },
                "Imbalance Charge": {
                    "iar_label": None,
                    "csv_cols": ["imbalance charge"],
                },
            }

            def calculate_variance(actual, target):
                if target == 0.0:
                    return None
                return round(((actual - target) / target) * 100, 2)

            monthly_data_payload = {}

            for m in range(1, 13):
                days_in_month = get_days_in_month(month=m, year=year)
                filtered_actual_df = merged_df[
                    (merged_df.index.month == m) & (merged_df.index.year == year)
                ]

                if filtered_actual_df.empty:
                    continue

                actual_col_map = {
                    col.lower().strip(): col for col in filtered_actual_df.columns
                }
                settings_map = settings_year_map.get(m, {})

                streams_list = []
                iar_values = {}
                actual_values = {}

                for stream_name, config in stream_config.items():
                    iar_raw_yearly = 0.0
                    if config["iar_label"]:
                        row_mask = (
                            iar_df["Row_Label"].astype(str).str.lower().str.strip()
                            == config["iar_label"].lower().strip()
                        )
                        matching_rows = iar_df[row_mask]
                        target_date = pd.Timestamp(year, m, 1)

                        if (
                            not matching_rows.empty
                            and target_date in matching_rows.columns
                        ):
                            raw_val = matching_rows[target_date].iloc[0]
                            try:
                                iar_raw_yearly = (
                                    float(str(raw_val).replace(",", "").strip())
                                    if pd.notna(raw_val)
                                    else 0.0
                                )
                            except ValueError:
                                iar_raw_yearly = 0.0

                    iar_values[stream_name] = iar_raw_yearly * 4.2

                    actual_val = 0.0
                    if config.get("use_settings"):
                        actual_val = settings_map.get(config["metric_id"], 0.0)
                    elif config["csv_cols"]:
                        sub_sum = 0.0
                        for col_lower in config["csv_cols"]:
                            if col_lower in actual_col_map:
                                sub_sum += float(
                                    filtered_actual_df[actual_col_map[col_lower]].sum()
                                )
                        actual_val = sub_sum * 0.95

                    actual_values[stream_name] = actual_val
                    variance_pct = calculate_variance(
                        actual_values[stream_name], iar_values[stream_name]
                    )

                    streams_list.append(
                        {
                            "revenue_stream": stream_name,
                            "iar_revenue": round(iar_values[stream_name], 2),
                            "actual_revenue": round(actual_values[stream_name], 2),
                            "variance_percentage": (
                                variance_pct
                                if isinstance(variance_pct, str) or variance_pct is None
                                else round(variance_pct, 2)
                            ),
                        }
                    )

                iar_ex_bm = sum(
                    iar_values[s]
                    for s in [
                        "Wholesale Day Ahead",
                        "Wholesale Intraday",
                        "Frequency Response",
                        "Capacity Market",
                        "DUoS Battery",
                        "DUoS Fixed Charges",
                    ]
                )
                iar_all = (
                    iar_ex_bm + iar_values["Balancing Mechanism"] + iar_values["TNUoS"]
                )

                actual_ex_bm_monthly_sum = (
                    actual_values["Wholesale Day Ahead"]
                    + actual_values["Wholesale Intraday"]
                    + actual_values["Frequency Response"]
                    + actual_values["Imbalance Revenue"]
                    - actual_values["Imbalance Charge"]
                )

                actual_all_monthly_sum = (
                    actual_ex_bm_monthly_sum
                    + actual_values["Capacity Market"]
                    + actual_values["DUoS Battery"]
                    - actual_values["DUoS Fixed Charges"]
                    + actual_values["TNUoS"]
                )

                monthly_data_payload[m] = {
                    "streams": streams_list,
                    "total_excluding_bm_tnuos": {
                        "iar_revenue": round(iar_ex_bm, 2),
                        "actual_revenue": round(
                            actual_ex_bm_monthly_sum, 2
                        ),  # Use Monthly Sum
                        "variance_percentage": calculate_variance(
                            actual_ex_bm_monthly_sum, iar_ex_bm
                        ),
                    },
                    "total_all_streams": {
                        "iar_revenue": round(iar_all, 2),
                        "actual_revenue": round(
                            actual_all_monthly_sum, 2
                        ),  # Use Monthly Sum
                        "variance_percentage": calculate_variance(
                            actual_all_monthly_sum, iar_all
                        ),
                    },
                }
            return Res.success(
                "S-10066",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    "monthly_data": monthly_data_payload,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10153", message="Revenue IAR vs Actual calculation failed"
            )

    def _extract_iar_dataset(self, df_raw):
        mandatory_lower = [
            "wholesale day ahead battery revenue",
            "wholesale intraday revenue",
            "balancing mechanism revenue",
            "frequency response revenues",
            "capacity market revenues",
            "duos battery revenues",
            "duos fixed charges",
            "tnuos revenues",
            "total bess revenues incl. duos fixed charges (£/mw/month)",
            "mw assumed in model at iar",
            "total bess revenues (real)",
            "indexation",
            "total bess revenues (nominal)",
        ]

        row_idx, col_idx = -1, -1
        for r in range(len(df_raw)):
            for c in range(len(df_raw.columns)):
                cell_val = str(df_raw.iloc[r, c]).strip().lower()
                if cell_val in mandatory_lower:
                    row_idx, col_idx = r, c
                    break
            if row_idx != -1:
                break

        if row_idx == -1:
            return None, None

        start_data_col = -1
        for c in range(col_idx + 1, len(df_raw.columns)):
            val = df_raw.iloc[row_idx - 1, c]
            if not pd.isna(pd.to_datetime(val, errors="coerce")):
                start_data_col = c
                break

        if start_data_col == -1:
            return None, None

        labels = df_raw.iloc[row_idx:, col_idx].astype(str).str.strip().tolist()
        headers = [
            pd.to_datetime(h, errors="coerce")
            for h in df_raw.iloc[row_idx - 1, start_data_col:]
        ]
        data_values = df_raw.iloc[row_idx:, start_data_col:].values

        df_clean = pd.DataFrame(data_values, columns=headers)
        df_clean.insert(0, "Row_Label", labels)
        date_objs = [h for h in headers if h is not None]
        return df_clean, date_objs

    async def export_revenue_iar_vs_actual(
        self, db: AsyncSession, asset_id: int, year: int, current_user: dict
    ):
        result = await self.get_revenue_iar_vs_actual(
            db=db, asset_id=asset_id, year=year, current_user=current_user
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

    async def get_multi_market_optimized_vs_actual(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        current_user: dict,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", message="Asset not found")

            files_stmt = select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type.in_(
                    [
                        AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                        AssetFileType.OPTIMIZED_DATASET.value,
                    ]
                ),
                AssetFile.is_active.is_(True),
            )
            files_res = await db.execute(files_stmt)
            all_files = files_res.scalars().all()
            merged_records = [
                f
                for f in all_files
                if f.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value
            ]

            optimized_records = [
                f for f in all_files if f.type == AssetFileType.OPTIMIZED_DATASET.value
            ]

            if not merged_records:
                return Res.error("E-10107", message="Merged dataset unavailable")

            if not optimized_records:
                return Res.error("E-10154", message="Optimized dataset unavailable")

            async def fetch_merged_file(file_record):
                obj, _ = FileStorageManager.get_file_object(
                    file_record.key, storage_type=file_record.storage_server
                )
                return pd.read_excel(BytesIO(obj))

            async def fetch_optimized_file(file_record):
                obj, _ = FileStorageManager.get_file_object(
                    file_record.key, storage_type=file_record.storage_server
                )
                return pd.read_csv(BytesIO(obj))

            try:
                merged_dfs = await asyncio.gather(
                    *(fetch_merged_file(f) for f in merged_records)
                )
                optimized_dfs = await asyncio.gather(
                    *(fetch_optimized_file(f) for f in optimized_records)
                )
                for df in merged_dfs:
                    df.columns = [str(c).strip().lower() for c in df.columns]
                for df in optimized_dfs:
                    df.columns = [str(c).strip().lower() for c in df.columns]
                merged_df = pd.concat(merged_dfs, ignore_index=True)
                optimized_df = pd.concat(optimized_dfs, ignore_index=True)

            except Exception:
                traceback.print_exc()
                return Res.error("E-10157", message="Failed to load datasets")

            required_merged_cols = [
                "timestamp",
                "sffr revenues",
                "epex 30 da revenue",
                "epex da revenues",
                "ida1 revenue",
                "idc revenue",
                "imbalance revenue",
                "imbalance charge",
            ]

            required_optimized_cols = [
                "timestamp",
                "market_used_multi",
                "optimised_revenue_multi",
            ]

            missing_merged = [
                c for c in required_merged_cols if c not in merged_df.columns
            ]

            if missing_merged:
                return Res.error(
                    "E-10155", message=f"Missing merged columns: {missing_merged}"
                )

            missing_optimized = [
                c for c in required_optimized_cols if c not in optimized_df.columns
            ]

            if missing_optimized:
                return Res.error(
                    "E-10156", message=f"Missing optimized columns: {missing_optimized}"
                )

            merged_df["timestamp"] = pd.to_datetime(
                merged_df["timestamp"], format="mixed", errors="coerce"
            )
            optimized_df["timestamp"] = pd.to_datetime(
                optimized_df["timestamp"], format="mixed", errors="coerce"
            )
            monthly_data_payload = {}

            for m in range(1, 13):
                merged_month_df = merged_df[
                    (merged_df["timestamp"].dt.month == m)
                    & (merged_df["timestamp"].dt.year == year)
                ].copy()

                optimized_month_df = optimized_df[
                    (optimized_df["timestamp"].dt.month == m)
                    & (optimized_df["timestamp"].dt.year == year)
                ].copy()

                if merged_month_df.empty and optimized_month_df.empty:
                    continue

                actual_streams = {
                    "SFFR": (merged_month_df["sffr revenues"].sum()),
                    "EPEX DA": (
                        merged_month_df["epex 30 da revenue"].sum()
                        + merged_month_df["epex da revenues"].sum()
                    ),
                    "IDA1": (merged_month_df["ida1 revenue"].sum()),
                    "IDC": (merged_month_df["idc revenue"].sum()),
                    "Imbalance": (
                        merged_month_df["imbalance revenue"].sum()
                        - merged_month_df["imbalance charge"].sum()
                    ),
                }

                actual_streams = {k: v * 0.95 for k, v in actual_streams.items()}
                market_totals = {
                    "SFFR": 0.0,
                    "BUY-EPEX": 0.0,
                    "SELL-EPEX": 0.0,
                    "BUY-DA_HH": 0.0,
                    "SELL-DA_HH": 0.0,
                    "BUY-ISEM": 0.0,
                    "SELL-ISEM": 0.0,
                    "BUY-SSP": 0.0,
                    "SELL-SSP": 0.0,
                    "BUY-SBP": 0.0,
                    "SELL-SBP": 0.0,
                    "IDC": 0.0,
                    "IDLE": 0.0,
                }
                for _, row in optimized_month_df.iterrows():
                    market = str(row["market_used_multi"]).strip().upper()
                    revenue = pd.to_numeric(
                        row["optimised_revenue_multi"], errors="coerce"
                    )
                    revenue = 0.0 if pd.isna(revenue) else float(revenue)

                    if market in market_totals:
                        market_totals[market] += revenue
                optimized_streams = {
                    "SFFR": (market_totals["SFFR"]),
                    "EPEX DA": (
                        market_totals["BUY-EPEX"]
                        + market_totals["SELL-EPEX"]
                        + market_totals["BUY-DA_HH"]
                        + market_totals["SELL-DA_HH"]
                    ),
                    "IDA1": (market_totals["BUY-ISEM"] + market_totals["SELL-ISEM"]),
                    "IDC": (market_totals["IDC"]),
                    "Imbalance": (
                        market_totals["BUY-SSP"]
                        + market_totals["SELL-SSP"]
                        + market_totals["BUY-SBP"]
                        + market_totals["SELL-SBP"]
                    ),
                }
                optimized_streams = {k: v * 0.95 for k, v in optimized_streams.items()}

                stream_names = [
                    "SFFR",
                    "EPEX DA",
                    "IDA1",
                    "IDC",
                    "Imbalance",
                ]
                stream_names_map = {
                    "SFFR": "SFFR (Frequency Response)",
                    "EPEX DA": "EPEX DA (Day Ahead)",
                    "IDA1": "IDA1 / ISEM (Intraday)",
                    "IDC": "IDC (Continuous)",
                    "Imbalance": "SSP / SBP (Imbalance)",
                }
                revenue_streams = []
                total_actual_revenue = 0
                total_optimized_revenue = 0
                for stream in stream_names:
                    actual_val = round(actual_streams.get(stream, 0))
                    optimized_val = round(optimized_streams.get(stream, 0))
                    total_actual_revenue += actual_val
                    total_optimized_revenue += optimized_val
                    revenue_streams.append(
                        {
                            "revenue_stream": stream_names_map.get(stream, stream),
                            "actual_revenue": actual_val,
                            "optimized_revenue": optimized_val,
                        }
                    )
                revenue_gap = round(total_optimized_revenue - total_actual_revenue)
                capture_rate = (
                    round((total_actual_revenue / total_optimized_revenue) * 100)
                    if total_optimized_revenue != 0
                    else "N/A"
                )

                monthly_data_payload[m] = {
                    "revenue_streams": revenue_streams,
                    "totals": {
                        "total_actual_revenue": total_actual_revenue,
                        "total_optimized_revenue": total_optimized_revenue,
                        "revenue_gap": revenue_gap,
                        "capture_rate": capture_rate,
                    },
                }
            return Res.success(
                "S-10067",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    "monthly_data": monthly_data_payload,
                },
            )
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
    ):
        result = await self.get_multi_market_optimized_vs_actual(
            db=db,
            asset_id=asset_id,
            year=year,
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

        file_name = f"Multi_Market_Optimized_vs_Actual_" f"{asset_str}.csv"

        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="application/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    async def get_ancillary_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100")
            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))
            services = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]
            revenues = {}
            for service in services:
                revenue_col = f"{service} revenues"

                if revenue_col not in df.columns:
                    return Res.error("E-10160")

                revenues[service] = float(df[revenue_col].sum()) * 0.95
            total_ancillary_revenue = round(sum(revenues.values()), 2)
            top_service = max(revenues, key=revenues.get)
            top_service_revenue = revenues[top_service]
            services_used = len([v for v in revenues.values() if v > 0])

            top_service_share = (
                round((top_service_revenue / total_ancillary_revenue) * 100, 2)
                if total_ancillary_revenue > 0
                else 0
            )

            return Res.success(
                "S-10068",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "summary": {
                        "total_ancillary_revenue": total_ancillary_revenue,
                        "top_service": top_service,
                        "top_service_revenue": round(top_service_revenue, 2),
                        "services_used": services_used,
                        "total_services": len(services),
                        "top_service_share": top_service_share,
                    },
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10163", message="Ancillary revenue summary calculation failed"
            )

    async def get_ancillary_breakdown(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            SERVICE_MAPPING = {
                "SFFR": "Static FFR",
                "DCL": "DC Low",
                "DCH": "DC High",
                "DML": "DM Low",
                "DMH": "DM High",
                "DRL": "DR Low",
                "DRH": "DR High",
            }
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            service_breakdown = []

            for service in SERVICE_MAPPING:
                revenue_col = f"{service} revenues"
                availability_col = f"{service} Availability"
                price_col = f"{service} Clearing Price"

                if revenue_col not in df.columns:
                    return Res.error("E-10160")
                if availability_col not in df.columns:
                    return Res.error("E-10161")
                if price_col not in df.columns:
                    return Res.error("E-10162")

            for service, service_name in SERVICE_MAPPING.items():

                revenue_col = f"{service} revenues"
                availability_col = f"{service} Availability"
                price_col = f"{service} Clearing Price"

                total_revenue_service = float(df[revenue_col].sum()) * 0.95
                periods_active = int((df[availability_col] > 0).sum())

                active_rows = df[df[availability_col] > 0]
                avg_price = (
                    float(active_rows[price_col].mean()) if not active_rows.empty else 0
                )
                total_mwh = float(df[availability_col].sum()) * 0.5
                revenue_per_mwh = (
                    total_revenue_service / total_mwh if total_mwh > 0 else 0
                )

                service_breakdown.append(
                    {
                        "service": service,
                        "service_name": service_name,
                        "total_revenue": round(total_revenue_service, 2),
                        "periods_active": periods_active,
                        "avg_price": round(avg_price, 2),
                        "revenue_per_mwh": round(revenue_per_mwh, 2),
                    }
                )

            return Res.success(
                "S-10068",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "service_breakdown": service_breakdown,
                },
            )

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
                    f'{float(service["total_revenue"]):,.2f}',
                    service["periods_active"],
                    f'{float(service["avg_price"]):,.2f}',
                    f'{float(service["revenue_per_mwh"]):,.2f}',
                ]
            )
        output.seek(0)
        asset = await db.get(Asset, asset_id)
        asset_str = asset.asset_id if asset else str(asset_id)
        file_name = f"ancillary_service_breakdown_" f"{asset_str}_{month}_{year}.csv"

        return StreamingResponse(
            BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    async def get_opportunity_cost_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            services = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]
            total_rev, total_mwh = 0.0, 0.0
            service_rates = {}

            for s in services:
                r_col, a_col = f"{s} revenues", f"{s} Availability"
                s_rev = float(df[r_col].sum()) * 0.95 if r_col in df else 0.0
                s_mwh = float(df[a_col].sum()) * 0.5 if a_col in df else 0.0
                total_rev += s_rev
                total_mwh += s_mwh
                service_rates[s] = (s_rev / s_mwh) if s_mwh > 0 else 0

            avg_rate = (total_rev / total_mwh) if total_mwh > 0 else 0

            best_rate = list(service_rates.values())[
                0
            ]  # default initialize to first element
            best_service: str = list(service_rates.keys())[
                0
            ]  # default initialise to first element
            for s in service_rates:
                rate = service_rates[s]
                if rate > best_rate:
                    best_rate = rate
                    best_service = s

            optimal_rev = best_rate * total_mwh
            opp_cost = max(0.0, optimal_rev - total_rev)

            return Res.success(
                "S-10069",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "opportunity_cost_analysis": {
                        "current_avg_rate": round(avg_rate, 2),
                        "best_service_rate": round(best_rate, 2),
                        "opportunity_cost": round(opp_cost, 2),
                        "best_service": best_service.upper(),
                    },
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10166")

    async def get_service_revenue_by_hour(
        self, db: AsyncSession, asset_id: int, month: int, year: int
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            df["hour"] = pd.to_datetime(df["Timestamp"]).dt.hour
            services = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]

            hourly_revenue = []
            for h in range(24):
                hour_df = df[df["hour"] == h]
                service_list = []
                for s in services:
                    col = f"{s} revenues"
                    rev = float(hour_df[col].sum()) * 0.95 if col in hour_df else 0.0
                    service_list.append({"service": s, "revenue": round(rev, 2)})
                hourly_revenue.append({"hour": h, "services": service_list})

            return Res.success(
                "S-10069",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "hourly_revenue": hourly_revenue,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10167")

    async def get_daily_imbalance_breakdown(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))
            if df.empty:
                return Res.success(
                    "S-10071",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        "daily_breakdown": [],
                    },
                )

            if "Timestamp" not in df.columns:
                return Res.error("E-10163")
            if "Imbalance Revenue" not in df.columns:
                return Res.error("E-10168")
            if "Imbalance Charge" not in df.columns:
                return Res.error("E-10169")

            df["Timestamp"] = pd.to_datetime(df["Timestamp"])
            df["adj_revenue"] = df["Imbalance Revenue"] * 0.95
            df["adj_charge"] = df["Imbalance Charge"] * 0.95
            df["calendar_date"] = df["Timestamp"].dt.date
            daily_df = (
                df.groupby("calendar_date")
                .agg({"adj_revenue": "sum", "adj_charge": "sum"})
                .reset_index()
            )

            daily_df["daily_net_imbalance"] = (
                daily_df["adj_revenue"] - daily_df["adj_charge"]
            )
            daily_breakdown = []

            for _, row in daily_df.iterrows():
                daily_breakdown.append(
                    {
                        "date": str(row["calendar_date"]),
                        "daily_revenue": round(float(row["adj_revenue"]), 2),
                        "daily_charges": round(float(row["adj_charge"]), 2),
                        "daily_net_imbalance": round(
                            float(row["daily_net_imbalance"]), 2
                        ),
                    }
                )
            return Res.success(
                "S-10071",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "daily_breakdown": daily_breakdown,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10171", message="Daily imbalance breakdown calculation failed"
            )

    async def get_top_5_worst_imbalance_days(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))
            if df.empty:
                return Res.success(
                    "S-10072",
                    data={
                        "asset_id": asset_id,
                        "month": month,
                        "year": year,
                        "worst_days": [],
                    },
                )
            if "Timestamp" not in df.columns:
                return Res.error("E-10163")
            if "Imbalance Revenue" not in df.columns:
                return Res.error("E-10168")
            if "Imbalance Charge" not in df.columns:
                return Res.error("E-10169")

            df["Timestamp"] = pd.to_datetime(df["Timestamp"])
            df["adj_revenue"] = df["Imbalance Revenue"] * 0.95
            df["adj_charge"] = df["Imbalance Charge"] * 0.95
            df["calendar_date"] = df["Timestamp"].dt.date

            daily_df = (
                df.groupby("calendar_date")
                .agg({"adj_revenue": "sum", "adj_charge": "sum"})
                .reset_index()
            )

            daily_df["net_imbalance"] = daily_df["adj_revenue"] - daily_df["adj_charge"]

            worst_days_df = daily_df.sort_values(
                by="net_imbalance", ascending=True
            ).head(5)

            worst_days = []

            for _, row in worst_days_df.iterrows():
                worst_days.append(
                    {
                        "date": str(row["calendar_date"]),
                        "revenue": round(float(row["adj_revenue"]), 2),
                        "charges": round(float(row["adj_charge"]), 2),
                        "net_imbalance": round(float(row["net_imbalance"]), 2),
                    }
                )
            return Res.success(
                "S-10072",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "worst_days": worst_days,
                },
            )

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
                        f'{float(day["revenue"]):,.2f}',
                        f'{float(day["charges"]):,.2f}',
                        f'{float(day["net_imbalance"]):,.2f}',
                    ]
                )
            output.seek(0)
            asset = await db.get(Asset, asset_id)
            asset_str = asset.asset_id if asset else str(asset_id)

            file_name = f"top_5_worst_imbalance_days_" f"{asset_str}_{month}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file_name}"},
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10174", message="Top 5 worst imbalance days export generation failed"
            )

    async def get_imbalance_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            # Apply 5% deduction
            df["rev_adj"] = df["Imbalance Revenue"] * 0.95
            df["chg_adj"] = df["Imbalance Charge"] * 0.95

            # KPI Calculations
            rev_kpi = float(df["rev_adj"].sum())
            chg_kpi = float(df["chg_adj"].sum())
            net_imbalance = rev_kpi - chg_kpi

            rev_periods = int((df["rev_adj"] > 0).sum())
            chg_periods = int((df["chg_adj"] > 0).sum())
            total_periods = len(df)
            pct = (chg_periods / total_periods * 100) if total_periods > 0 else 0

            status = (
                "Profit"
                if net_imbalance > 0
                else ("Loss" if net_imbalance < 0 else "Neutral")
            )

            return Res.success(
                "S-10070",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "summary": {
                        "imbalance_revenue": round(rev_kpi, 2),
                        "revenue_periods": rev_periods,
                        "imbalance_charges": round(chg_kpi, 2),
                        "charge_periods": chg_periods,
                        "net_imbalance": round(net_imbalance, 2),
                        "status": status,
                        "percentage_of_periods_with_charges": round(pct, 2),
                    },
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10170")

    async def get_imbalance_hourly_charges(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            merged_file = file_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            # Apply 5% deduction
            df["chg_adj"] = df["Imbalance Charge"] * 0.95
            df["hour"] = pd.to_datetime(df["Timestamp"]).dt.hour

            hourly = (
                df.groupby("hour")["chg_adj"].sum().reindex(range(24), fill_value=0.0)
            )

            # Peak Hour: Max Absolute Value
            peak_hour_idx = hourly.abs().idxmax()
            peak_charges = float(hourly[peak_hour_idx])

            breakdown = [
                {"hour": f"{h:02d}:00", "total_charges": round(float(v), 2)}
                for h, v in hourly.items()
            ]

            return Res.success(
                "S-10073",
                data={
                    "peak_imbalance_hour": {
                        "hour": f"{peak_hour_idx:02d}:00",
                        "total_charges": round(peak_charges, 2),
                    },
                    "hourly_breakdown": breakdown,
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10173")

    async def get_battery_health_analysis(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            merged_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )

            merged_file = merged_query.scalars().first()
            if not merged_file:
                return Res.error("E-10100")

            optimized_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )

            optimized_file = optimized_query.scalars().first()
            if not optimized_file:
                return Res.error("E-10154")

            merged_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            merged_df = pd.read_excel(BytesIO(merged_obj))

            optimized_obj, _ = FileStorageManager.get_file_object(
                optimized_file.key, storage_type=optimized_file.storage_server
            )
            optimized_df = pd.read_csv(BytesIO(optimized_obj))

            if "Power_MW" not in merged_df.columns:
                return Res.error("E-10175")

            if "Optimised_Net_MWh_Multi" not in optimized_df.columns:
                return Res.error("E-10176")

            actual_discharge_energy = float(
                merged_df.loc[merged_df["Power_MW"] > 0, "Power_MW"].sum() * 0.5
            )

            actual_charge_energy = abs(
                float(merged_df.loc[merged_df["Power_MW"] < 0, "Power_MW"].sum() * 0.5)
            )

            optimized_discharge_energy = float(
                optimized_df.loc[
                    optimized_df["Optimised_Net_MWh_Multi"] > 0,
                    "Optimised_Net_MWh_Multi",
                ].sum()
            )

            optimized_charge_energy = abs(
                float(
                    optimized_df.loc[
                        optimized_df["Optimised_Net_MWh_Multi"] < 0,
                        "Optimised_Net_MWh_Multi",
                    ].sum()
                )
            )

            return Res.success(
                "S-10075",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "battery_health": {
                        "actual_discharge_energy": round(actual_discharge_energy, 2),
                        "optimized_multi_market_discharge_energy": round(
                            optimized_discharge_energy, 2
                        ),
                        "actual_charge_energy": round(actual_charge_energy, 2),
                        "optimized_multi_market_charge_energy": round(
                            optimized_charge_energy, 2
                        ),
                    },
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10178", message="Battery health analysis calculation failed"
            )

    async def get_cycle_comparison(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        asset = await db.get(Asset, asset_id)
        if not asset:

            return Res.error("E-10034")

        asset_opt = await db.execute(
            select(AssetOptimizationParameter).where(
                AssetOptimizationParameter.asset_id == asset_id
            )
        )

        asset_opt = asset_opt.scalars().first()
        if not asset_opt:
            return Res.error(
                "E-10001",
                message="asset optmization parameter not found",
                http_status_code=404,
            )

        cap = asset_opt.usable_capacity_mwh
        if cap is None or cap <= 0:
            return Res.error("E-10179" if cap is None else "E-10180")

        # Fetch Files
        agg_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )
        agg_file = agg_query.scalars().first()

        opt_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )
        opt_file = opt_query.scalars().first()

        if not agg_file:
            return Res.error("E-10100")
        if not opt_file:
            return Res.error("E-10154")

        df_agg = pd.read_excel(
            BytesIO(FileStorageManager.get_file_object(agg_file.key)[0]),
            engine="openpyxl",
        )
        df_opt = pd.read_csv(
            BytesIO(FileStorageManager.get_file_object(opt_file.key)[0])
        )

        if "Power_MW" not in df_agg.columns:
            return Res.error("E-10177")
        if "Optimised_Net_MWh_Multi" not in df_opt.columns:
            return Res.error("E-10178")

        act_discharge = df_agg[df_agg["Power_MW"] > 0]["Power_MW"].sum() * 0.5
        act_charge = abs(df_agg[df_agg["Power_MW"] < 0]["Power_MW"].sum()) * 0.5
        mm_discharge = df_opt[df_opt["Optimised_Net_MWh_Multi"] > 0][
            "Optimised_Net_MWh_Multi"
        ].sum()
        mm_charge = abs(
            df_opt[df_opt["Optimised_Net_MWh_Multi"] < 0][
                "Optimised_Net_MWh_Multi"
            ].sum()
        )

        days = calendar.monthrange(year, month)[1]

        results = []
        for method, name in [
            ("discharge-only", "discharge-only"),
            ("full-equivalent", "full-equivalent"),
            ("throughput-based", "throughput-based"),
        ]:
            if method == "discharge-only":
                act_cyc, mm_cyc = act_discharge / cap, mm_discharge / cap
            elif method == "full-equivalent":
                act_cyc, mm_cyc = (act_discharge + act_charge) / 2 / cap, (
                    mm_discharge + mm_charge
                ) / 2 / cap
            else:
                act_cyc, mm_cyc = (act_discharge + act_charge) / (2 * cap), (
                    mm_discharge + mm_charge
                ) / (2 * cap)

            results.append(
                {
                    "method_key": method[0],
                    "method_name": name,
                    "actual_total_cycles": round(act_cyc, 2),
                    "multi_market_total_cycles": round(mm_cyc, 2),
                    "actual_daily_avg": round(act_cyc / days, 3),
                    "multi_market_daily_avg": round(mm_cyc / days, 3),
                }
            )

        return Res.success(
            "S-10076",
            data={
                "asset_id": asset_id,
                "month": month,
                "year": year,
                "cycle_comparison": results,
            },
        )

    async def get_strategy_cycling_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str = "discharge-only",
        current_user: dict = None,
    ):
        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034")

        asset_opt = await db.execute(
            select(AssetOptimizationParameter).where(
                AssetOptimizationParameter.asset_id == asset_id
            )
        )

        asset_opt = asset_opt.scalars().first()
        if not asset_opt:
            return Res.error(
                "E-10001",
                message="Asset optimization parameter not found",
                http_status_code=404,
            )
        cap = asset_opt.usable_capacity_mwh
        if cap is None or cap <= 0:
            return Res.error("E-10179" if cap is None else "E-10180")

        agg_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )
        agg_file = agg_query.scalars().first()
        opt_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                AssetFile.month == month,
                AssetFile.year == year,
            )
        )
        opt_file = opt_query.scalars().first()

        if not agg_file:
            return Res.error("E-10100")
        if not opt_file:
            return Res.error("E-10154")

        df_agg = pd.read_excel(
            BytesIO(FileStorageManager.get_file_object(agg_file.key)[0]),
            engine="openpyxl",
        )
        df_opt = pd.read_csv(
            BytesIO(FileStorageManager.get_file_object(opt_file.key)[0])
        )

        strategies = [
            {"name": "actual", "col": "Power_MW", "is_opt": False},
            {"name": "epex_daily", "col": "Optimised_Net_MWh_Daily", "is_opt": True},
            {"name": "epex_efa", "col": "Optimised_Net_MWh_EFA", "is_opt": True},
            {"name": "multi", "col": "Optimised_Net_MWh_Multi", "is_opt": True},
        ]

        results, days = [], calendar.monthrange(year, month)[1]
        for s in strategies:
            df = df_agg if not s["is_opt"] else df_opt
            discharge = df[df[s["col"]] > 0][s["col"]].sum() * (
                0.5 if not s["is_opt"] else 1
            )
            charge = abs(df[df[s["col"]] < 0][s["col"]].sum()) * (
                0.5 if not s["is_opt"] else 1
            )

            if cycle_method == "discharge-only":
                total = discharge / cap
            elif cycle_method == "full-equivalent":
                total = (discharge + charge) / 2 / cap
            else:
                total = (discharge + charge) / (2 * cap)

            daily = total / days
            results.append(
                {
                    "strategy": s["name"],
                    "total_discharge_mwh": round(discharge, 2),
                    "total_charge": (
                        round(charge, 2) if cycle_method != "discharge-only" else None
                    ),
                    "total_cycle": round(total, 2),
                    "daily_cycle": round(daily, 3),
                    "degradation_percent": round(
                        total * ASSET_DEGRADATION_PER_CYCLE_PERCENTAGE, 4
                    ),
                    "is_warranty_exceeded": bool(daily > 1.5),
                }
            )

        return Res.success("S-10077", data={"strategy_cycling_comparison": results})

    async def get_annual_projection_report(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
    ):
        try:
            VALID_METHODS = ["discharge-only", "full-equivalent", "throughput-based"]

            if cycle_method not in VALID_METHODS:
                return Res.error("E-10183")

            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034")

            strategy_data = await self.get_strategy_cycling_comparison(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
                cycle_method=cycle_method,
                current_user=current_user,
            )

            strategy_body = (
                json.loads(strategy_data.body.decode())
                if hasattr(strategy_data, "body")
                else strategy_data
            )

            if strategy_body.get("status") == "error":
                return strategy_data

            strategy_rows = strategy_body["data"]["strategy_cycling_comparison"]

            if not strategy_rows:
                return Res.error("E-10186")

            annual_degradation_limit = 2.5
            warranty_limit = 1.5
            degradation_per_cycle = ASSET_DEGRADATION_PER_CYCLE_PERCENTAGE

            if degradation_per_cycle <= 0:
                return Res.error("E-10189")

            annual_projection_report = []

            for row in strategy_rows:
                daily_cycle = row.get("daily_cycle")

                if daily_cycle is None:
                    return Res.error("E-10186")

                projected_annual_cycles = float(daily_cycle) * 365
                projected_annual_degradation = (
                    projected_annual_cycles * degradation_per_cycle
                )
                if projected_annual_degradation < 0:
                    return Res.error("E-10190")

                estimated_battery_lifespan = (
                    None
                    if projected_annual_degradation == 0
                    else round(20 / projected_annual_degradation, 2)
                )

                STRATEGY_KEY_MAP = {
                    "Actual Operation": "actual",
                    "EPEX-Only Daily": "epex_daily",
                    "EPEX-Only EFA": "epex_efa",
                    "Multi-Market": "multi",
                }

                annual_projection_report.append(
                    {
                        "strategy": STRATEGY_KEY_MAP.get(
                            row["strategy"], row["strategy"]
                        ),
                        "projected_annual_cycles": round(projected_annual_cycles, 2),
                        "projected_annual_degradation": round(
                            projected_annual_degradation, 4
                        ),
                        "estimated_battery_lifespan": estimated_battery_lifespan,
                    }
                )

            return Res.success(
                "S-10078",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "cycle_method": cycle_method,
                    "annual_degradation_limit": annual_degradation_limit,
                    "warranty_limit": warranty_limit,
                    "degradation_per_cycle": round(degradation_per_cycle, 6),
                    "annual_projection_report": annual_projection_report,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10191", message="Annual projection report calculation failed"
            )

    async def get_tb_spread_summary(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )

            merged_file = file_query.scalars().first()

            if not merged_file:
                return Res.error("E-10100")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )

            df = pd.read_excel(BytesIO(file_obj))
            print(df.columns.tolist())

            if "Timestamp" not in df.columns:
                return Res.error("E-10163")

            if "Day Ahead Price (EPEX)" not in df.columns:
                return Res.error("E-10191")

            revenue_cols = [
                "EPEX DA Revenues",
                "EPEX 30 DA Revenue",
                "IDA1 Revenue",
                "IDC Revenue",
            ]

            missing_revenue_cols = [
                col for col in revenue_cols if col not in df.columns
            ]

            if missing_revenue_cols:
                return Res.error("E-10192")

            optimization_query = await db.execute(
                select(AssetOptimizationParameter).where(
                    AssetOptimizationParameter.asset_id == asset_id
                )
            )

            optimization = optimization_query.scalars().first()

            if not optimization:
                return Res.error("E-10193")

            usable_capacity = optimization.usable_capacity_mwh

            if usable_capacity is None:
                return Res.error("E-10193")

            if usable_capacity <= 0:
                return Res.error("E-10194")

            df["Timestamp"] = pd.to_datetime(df["Timestamp"])

            df["date"] = df["Timestamp"].dt.date
            df["hour"] = df["Timestamp"].dt.hour

            hourly_df = (
                df.groupby(["date", "hour"])["Day Ahead Price (EPEX)"]
                .mean()
                .reset_index(name="hourly_price")
            )

            daily_tb = []

            for date, group in hourly_df.groupby("date"):

                prices = sorted(group["hourly_price"].dropna().tolist())
                if len(prices) < 3:
                    continue
                tb1 = max(prices) - min(prices)

                tb2 = sum(prices[-2:]) - sum(prices[:2])

                tb3 = sum(prices[-3:]) - sum(prices[:3])

                daily_tb.append({"date": date, "tb1": tb1, "tb2": tb2, "tb3": tb3})

            tb_df = pd.DataFrame(daily_tb)

            if tb_df.empty:
                avg_tb1 = 0
                avg_tb2 = 0
                avg_tb3 = 0
            else:
                avg_tb1 = float(tb_df["tb1"].mean())
                avg_tb2 = float(tb_df["tb2"].mean())
                avg_tb3 = float(tb_df["tb3"].mean())

            total_arbitrage_revenue = (
                df["EPEX DA Revenues"].sum()
                + df["EPEX 30 DA Revenue"].sum()
                + df["IDA1 Revenue"].sum()
                + df["IDC Revenue"].sum()
            )

            num_days = len(tb_df)

            avg_arbitrage_revenue = (
                total_arbitrage_revenue / num_days if num_days > 0 else 0
            )

            theoretical_max = avg_tb2 * usable_capacity

            tb2_capture_rate = (
                (avg_arbitrage_revenue / theoretical_max) * 100
                if theoretical_max > 0
                else 0
            )

            benchmark_query = await db.execute(
                select(MonthlyHardcodedValue).where(
                    MonthlyHardcodedValue.metric_id == AssetMetrics.TB_SPREAD_REVENUE,
                    MonthlyHardcodedValue.month == month,
                    MonthlyHardcodedValue.year == year,
                )
            )

            benchmark_record = benchmark_query.scalars().first()
            if not benchmark_record or benchmark_record.value is None:
                return Res.error("E-10196")

            tb_spread_benchmark = float(benchmark_record.value)

            benchmark_gap = round(tb2_capture_rate - tb_spread_benchmark, 2)

            return Res.success(
                "S-10079",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "avg_tb1": round(avg_tb1, 2),
                    "avg_tb2": round(avg_tb2, 2),
                    "avg_tb3": round(avg_tb3, 2),
                    "avg_arbitrage_revenue": round(avg_arbitrage_revenue, 2),
                    "tb2_capture_rate": round(tb2_capture_rate, 2),
                    "tb_spread_benchmark": round(tb_spread_benchmark, 2),
                    "benchmark_gap": round(benchmark_gap, 2),
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10195", message="Time-based spread summary calculation failed"
            )

    async def get_tb_spread_details(
        self, db: AsyncSession, asset_id: int, month: int, year: int, current_user: dict
    ):
        try:

            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034")

            merged_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )

            merged_file = merged_query.scalars().first()

            if not merged_file:
                return Res.error("E-10195")

            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )

            df = pd.read_excel(BytesIO(file_obj))

            if "Timestamp" not in df.columns:
                return Res.error("E-10163")

            if "Day Ahead Price (EPEX)" not in df.columns:
                return Res.error("E-10191")

            revenue_cols = [
                "EPEX DA Revenues",
                "EPEX 30 DA Revenue",
                "IDA1 Revenue",
                "IDC Revenue",
            ]

            missing_revenue_cols = [
                col for col in revenue_cols if col not in df.columns
            ]

            if missing_revenue_cols:
                return Res.error("E-10192")

            benchmark_query = await db.execute(
                select(MonthlyHardcodedValue).where(
                    MonthlyHardcodedValue.metric_id == AssetMetrics.TB_SPREAD_REVENUE,
                    MonthlyHardcodedValue.month == month,
                    MonthlyHardcodedValue.year == year,
                )
            )

            benchmark_record = benchmark_query.scalars().first()

            if not benchmark_record or benchmark_record.value is None:
                return Res.error("E-10196")

            tb_spread_benchmark = float(benchmark_record.value)

            df["Timestamp"] = pd.to_datetime(df["Timestamp"])
            df["date"] = df["Timestamp"].dt.date
            df["hour"] = df["Timestamp"].dt.hour

            hourly_df = (
                df.groupby(["date", "hour"])["Day Ahead Price (EPEX)"]
                .mean()
                .reset_index(name="hourly_price")
            )

            daily_rows = []

            for date, group in hourly_df.groupby("date"):

                prices = sorted(group["hourly_price"].dropna().tolist())

                if len(prices) < 3:
                    continue

                tb1 = max(prices) - min(prices)

                tb2 = sum(prices[-2:]) - sum(prices[:2])

                tb3 = sum(prices[-3:]) - sum(prices[:3])

                day_df = df[df["date"] == date]
                if day_df.empty:
                    return Res.error("E-10198")

                arbitrage_revenue = (
                    day_df["EPEX DA Revenues"].sum()
                    + day_df["EPEX 30 DA Revenue"].sum()
                    + day_df["IDA1 Revenue"].sum()
                    + day_df["IDC Revenue"].sum()
                )

                daily_rows.append(
                    {
                        "date": str(date),
                        "tb1": round(float(tb1), 2),
                        "tb2": round(float(tb2), 2),
                        "tb3": round(float(tb3), 2),
                        "arbitrage_revenue": round(float(arbitrage_revenue), 2),
                    }
                )
            if not daily_rows:
                return Res.error("E-10197")

            return Res.success(
                "S-10080",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "tb_spread_benchmark": round(tb_spread_benchmark, 2),
                    "tb_spread": daily_rows,
                },
            )

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
                        f'{float(row["tb1"]):,.2f}',
                        f'{float(row["tb2"]):,.2f}',
                        f'{float(row["tb3"]):,.2f}',
                        f'{float(row["arbitrage_revenue"]):,.2f}',
                    ]
                )

            output.seek(0)

            file_name = f"tb_spread_details_{asset_id}_{month}_{year}.csv"

            return StreamingResponse(
                BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file_name}"},
            )

        except Exception:
            traceback.print_exc()
            return Res.error(
                "E-10199", message="TB Spread Details export generation failed"
            )

    async def get_daily_cycles(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
    ):
        try:
            VALID_METHODS = ["discharge-only", "full-equivalent", "throughput-based"]
            if cycle_method not in VALID_METHODS:
                return Res.error("E-10183")

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            # Fetch optimization parameters for battery capacity
            asset_opt_query = await db.execute(
                select(AssetOptimizationParameter).where(
                    AssetOptimizationParameter.asset_id == asset_id
                )
            )
            asset_opt = asset_opt_query.scalars().first()
            if not asset_opt:
                return Res.error(
                    "E-10001",
                    message="Asset optimization parameter not found",
                    http_status_code=404,
                )

            cap = asset_opt.usable_capacity_mwh
            if cap is None or cap <= 0:
                return Res.error("E-10179" if cap is None else "E-10180")

            # Fetch merged and optimized files
            agg_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            agg_file = agg_query.scalars().first()

            opt_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                    AssetFile.month == month,
                    AssetFile.year == year,
                )
            )
            opt_file = opt_query.scalars().first()

            if not agg_file:
                return Res.error("E-10100")
            if not opt_file:
                return Res.error("E-10154")

            # Load dataframes
            df_agg = pd.read_excel(
                BytesIO(FileStorageManager.get_file_object(agg_file.key)[0]),
                engine="openpyxl",
            )
            df_opt = pd.read_csv(
                BytesIO(FileStorageManager.get_file_object(opt_file.key)[0])
            )

            if "Power_MW" not in df_agg.columns:
                return Res.error("E-10177")
            if "Optimised_Net_MWh_Multi" not in df_opt.columns:
                return Res.error("E-10178")

            # Parse timestamps
            df_agg["Timestamp"] = pd.to_datetime(df_agg["Timestamp"], errors="coerce")
            df_opt["Timestamp"] = pd.to_datetime(df_opt["Timestamp"], errors="coerce")

            df_agg = df_agg.dropna(subset=["Timestamp"])
            df_opt = df_opt.dropna(subset=["Timestamp"])

            # Fill missing energy values with 0
            df_agg["Power_MW"] = pd.to_numeric(
                df_agg["Power_MW"], errors="coerce"
            ).fillna(0)
            df_opt["Optimised_Net_MWh_Multi"] = pd.to_numeric(
                df_opt["Optimised_Net_MWh_Multi"], errors="coerce"
            ).fillna(0)

            # Actual interval energy: Power_MW × 0.5 (30-min intervals)
            df_agg["interval_energy"] = df_agg["Power_MW"] * 0.5
            # Multi-market energy: use directly (already MWh)
            df_opt["interval_energy"] = df_opt["Optimised_Net_MWh_Multi"]

            # Group by date
            df_agg["date"] = df_agg["Timestamp"].dt.date
            df_opt["date"] = df_opt["Timestamp"].dt.date

            def calc_daily_cycles(group_energy, method, capacity):
                discharge = group_energy[group_energy > 0].sum()
                charge = group_energy[group_energy < 0].abs().sum()
                if method == "discharge-only":
                    return discharge / capacity
                else:  # full-equivalent and throughput-based are identical
                    return (discharge + charge) / (2 * capacity)

            # Calculate daily cycles per date
            agg_grouped = df_agg.groupby("date")["interval_energy"]
            opt_grouped = df_opt.groupby("date")["interval_energy"]

            all_dates = sorted(
                set(df_agg["date"].unique()) | set(df_opt["date"].unique())
            )

            daily_cycles = []
            actual_cycles_list = []
            multi_cycles_list = []

            for date in all_dates:
                actual_energy = (
                    agg_grouped.get_group(date)
                    if date in agg_grouped.groups
                    else pd.Series([], dtype=float)
                )
                multi_energy = (
                    opt_grouped.get_group(date)
                    if date in opt_grouped.groups
                    else pd.Series([], dtype=float)
                )

                actual_dc = calc_daily_cycles(actual_energy, cycle_method, cap)
                multi_dc = calc_daily_cycles(multi_energy, cycle_method, cap)

                actual_dc = round(actual_dc, 3)
                multi_dc = round(multi_dc, 3)

                actual_cycles_list.append(actual_dc)
                multi_cycles_list.append(multi_dc)

                daily_cycles.append(
                    {
                        "date": date.strftime("%d-%m-%Y"),
                        "actual_daily_cycles": actual_dc,
                        "multi_market_daily_cycles": multi_dc,
                    }
                )

            # Summary stats
            def summary(cycles_list, dates):
                if not cycles_list:
                    return {
                        "avg_cycles": 0.0,
                        "max_cycles": 0.0,
                        "max_cycles_date": None,
                    }
                max_val = max(cycles_list)
                max_date = dates[cycles_list.index(max_val)].strftime("%d-%m-%Y")
                avg_val = round(sum(cycles_list) / len(cycles_list), 3)
                return {
                    "avg_cycles": avg_val,
                    "max_cycles": round(max_val, 3),
                    "max_cycles_date": max_date,
                }

            warranty_limit = 1.5

            return Res.success(
                "S-10083",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "cycle_method": cycle_method,
                    "warranty_limit": warranty_limit,
                    "actual": summary(actual_cycles_list, all_dates),
                    "multi_market": summary(multi_cycles_list, all_dates),
                    "daily_cycles": daily_cycles,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_monthly_revenue_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        month: int,
        current_user: dict,
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034")

            # Fetch all merged files for the selected year
            merged_query = await db.execute(
                select(AssetFile)
                .where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.year == year,
                    AssetFile.is_active.is_(True),
                )
                .order_by(AssetFile.month)
            )
            merged_files = merged_query.scalars().all()

            if not merged_files:
                return Res.error(
                    "E-10219",
                    message="No analysis data is available for the selected year.",
                )

            # If month filter provided, apply it
            if month is not None:
                merged_files = [f for f in merged_files if f.month == month]
                if not merged_files:
                    return Res.error(
                        "E-10220",
                        message="No analysis data is available for the selected month.",
                    )

            # Fetch all optimized files for the year in one query
            months_available = [f.month for f in merged_files]
            opt_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                    AssetFile.year == year,
                    AssetFile.month.in_(months_available),
                    AssetFile.is_active.is_(True),
                )
            )
            opt_files = {f.month: f for f in opt_query.scalars().all()}

            # Fetch all hardcoded values
            hardcoded_stmt = select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.year == year
            )
            hardcoded_res = await db.execute(hardcoded_stmt)
            hardcoded_data = hardcoded_res.scalars().all()

            hardcoded_map = {}
            for item in hardcoded_data:
                hardcoded_map[(item.year, item.month, item.metric_id)] = item.value

            monthly_comparison = []

            for merged_file in merged_files:
                m = merged_file.month
                y = merged_file.year

                # Load merged dataset
                file_obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )
                df = pd.read_excel(BytesIO(file_obj))

                # Revenue stream calculations from merged dataset
                sffr_revenue = float(df["SFFR revenues"].sum())
                epex_revenue = float(
                    df["EPEX DA Revenues"].sum() + df["EPEX 30 DA Revenue"].sum()
                )
                ida1_revenue = float(df["IDA1 Revenue"].sum())
                idc_revenue = float(df["IDC Revenue"].sum())
                imbalance_net = float(
                    df["Imbalance Revenue"].sum() - df["Imbalance Charge"].sum()
                )

                # Raw actual revenue = sum of all market streams
                raw_actual = (
                    sffr_revenue
                    + epex_revenue
                    + ida1_revenue
                    + idc_revenue
                    + imbalance_net
                )

                # Apply 5% GridBeyond share adjustment
                actual_revenue = raw_actual * 0.95
                imbalance = imbalance_net * 0.95

                # Settings values
                capacity_market = hardcoded_map.get(
                    (y, m, AssetMetrics.CAPACITY_MARKET.value), None
                )
                duos_credit = hardcoded_map.get(
                    (y, m, AssetMetrics.DUOS_CREDIT.value), None
                )
                duos_fixed = hardcoded_map.get(
                    (y, m, AssetMetrics.DUOS_FIXED_CHARGES.value), None
                )

                duos_net_credit = (
                    float(duos_credit) - float(duos_fixed)
                    if duos_credit is not None and duos_fixed is not None
                    else None
                )

                total_revenue = actual_revenue
                if capacity_market is not None:
                    total_revenue += float(capacity_market)
                if duos_net_credit is not None:
                    total_revenue += duos_net_credit

                # Optimal revenue from optimized dataset
                optimal_revenue = None
                opt_file = opt_files.get(m)
                if opt_file:
                    opt_obj, _ = FileStorageManager.get_file_object(
                        opt_file.key, storage_type=opt_file.storage_server
                    )
                    df_opt = pd.read_csv(BytesIO(opt_obj))
                    if "Optimised_Revenue_Multi" in df_opt.columns:
                        optimal_revenue = (
                            float(df_opt["Optimised_Revenue_Multi"].sum()) * 0.95
                        )

                # Revenue Gap and Capture Rate
                revenue_gap = None
                capture_rate = None
                if optimal_revenue is not None:
                    revenue_gap = round(optimal_revenue - actual_revenue, 2)
                    capture_rate = (
                        round((actual_revenue / optimal_revenue * 100), 2)
                        if optimal_revenue != 0
                        else None
                    )

                monthly_comparison.append(
                    {
                        "month": m,
                        "actual_revenue": round(actual_revenue, 2),
                        "capacity_market": (
                            round(float(capacity_market), 2)
                            if capacity_market is not None
                            else None
                        ),
                        "duos_net_credit": (
                            round(duos_net_credit, 2)
                            if duos_net_credit is not None
                            else None
                        ),
                        "total_revenue": round(total_revenue, 2),
                        "optimized_revenue": (
                            round(optimal_revenue, 2)
                            if optimal_revenue is not None
                            else None
                        ),
                        "net_imbalance": round(imbalance, 2),
                        "revenue_gap": revenue_gap,
                        "capture_rate": capture_rate,
                    }
                )

            return Res.success(
                "S-10086",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    "monthly_comparison": monthly_comparison,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_monthly_revenue_comparison(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: list,
        current_user: dict,
    ):
        try:
            result = await self.get_monthly_revenue_comparison(
                db=db,
                asset_id=asset_id,
                year=year,
                month=None,
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
            if months:
                monthly_comparison = [
                    r for r in monthly_comparison if r["month"] in months
                ]

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
                        row["month"],
                        year,
                        f'{row["actual_revenue"]:,.2f}',
                        (
                            f'{row["capacity_market"]:,.2f}'
                            if row["capacity_market"] is not None
                            else "–"
                        ),
                        (
                            f'{row["duos_net_credit"]:,.2f}'
                            if row["duos_net_credit"] is not None
                            else "–"
                        ),
                        f'{row["total_revenue"]:,.2f}',
                        (
                            f'{row["optimized_revenue"]:,.2f}'
                            if row["optimized_revenue"] is not None
                            else "–"
                        ),
                        f'{row["net_imbalance"]:,.2f}',
                        (
                            f'{row["revenue_gap"]:,.2f}'
                            if row["revenue_gap"] is not None
                            else "–"
                        ),
                        (
                            f'{row["capture_rate"]:,.2f}%'
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

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_revenue_by_stream_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        months: List[int],
        year: int,
        current_user: dict,
    ):
        try:
            asset = await db.get(Asset, asset_id)

            if not asset:
                return Res.error("E-10034")

            files_stmt = (
                select(AssetFile)
                .where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.year == year,
                    AssetFile.is_active.is_(True),
                )
                .order_by(AssetFile.month)
            )

            files_res = await db.execute(files_stmt)
            merged_files = files_res.scalars().all()

            if not merged_files:
                return Res.error("E-10216")

            hardcoded_stmt = select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.year == year
            )
            hardcoded_res = await db.execute(hardcoded_stmt)
            hardcoded_data = hardcoded_res.scalars().all()
            hardcoded_map = {}

            for item in hardcoded_data:
                hardcoded_map[(item.year, item.month, item.metric_id)] = item.value

            monthly_comparison = []

            files_to_process = merged_files
            if months:
                files_to_process = [f for f in merged_files if f.month in months]
                if not files_to_process:
                    return Res.error("E-10217")

            for merged_file in files_to_process:

                m = merged_file.month

                obj, _ = FileStorageManager.get_file_object(
                    merged_file.key, storage_type=merged_file.storage_server
                )

                mdf = pd.read_excel(BytesIO(obj))
                mdf.columns = [str(c).strip().lower() for c in mdf.columns]
                required_cols = [
                    "sffr revenues",
                    "epex 30 da revenue",
                    "epex da revenues",
                    "ida1 revenue",
                    "idc revenue",
                    "imbalance revenue",
                    "imbalance charge",
                ]

                missing = [c for c in required_cols if c not in mdf.columns]
                if missing:
                    return Res.error("E-10218")

                for col in required_cols:
                    mdf[col] = pd.to_numeric(mdf[col], errors="coerce").fillna(0)

                sffr_m = float(mdf["sffr revenues"].sum()) * 0.95

                epex_m = (
                    float(mdf["epex 30 da revenue"].sum())
                    + float(mdf["epex da revenues"].sum())
                ) * 0.95

                ida1_m = float(mdf["ida1 revenue"].sum()) * 0.95

                idc_m = float(mdf["idc revenue"].sum()) * 0.95

                imbalance_m = (
                    float(mdf["imbalance revenue"].sum())
                    - float(mdf["imbalance charge"].sum())
                ) * 0.95

                asset_sub_total_m = sffr_m + epex_m + ida1_m + idc_m + imbalance_m
                capacity_market = hardcoded_map.get(
                    (year, m, AssetMetrics.CAPACITY_MARKET.value), None
                )
                duos_credit = hardcoded_map.get(
                    (year, m, AssetMetrics.DUOS_CREDIT.value), None
                )
                duos_fixed = hardcoded_map.get(
                    (year, m, AssetMetrics.DUOS_FIXED_CHARGES.value), None
                )
                duos_net_credit = (
                    float(duos_credit) - float(duos_fixed)
                    if duos_credit is not None and duos_fixed is not None
                    else None
                )
                total_revenue = asset_sub_total_m
                if capacity_market is not None:
                    total_revenue += float(capacity_market)

                if duos_net_credit is not None:
                    total_revenue += duos_net_credit

                monthly_comparison.append(
                    {
                        "month": int(m),
                        "sffr": float(round(sffr_m, 2)),
                        "epex": float(round(epex_m, 2)),
                        "ida1": float(round(ida1_m, 2)),
                        "idc": float(round(idc_m, 2)),
                        "imbalance": float(round(imbalance_m, 2)),
                        "asset_sub_total": float(round(asset_sub_total_m, 2)),
                        "capacity_market": (
                            round(float(capacity_market), 2)
                            if capacity_market is not None
                            else None
                        ),
                        "duos_net_credit": (
                            round(float(duos_net_credit), 2)
                            if duos_net_credit is not None
                            else None
                        ),
                        "total_revenue": float(round(total_revenue, 2)),
                    }
                )

            return Res.success(
                "S-10086",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    "monthly_comparison": monthly_comparison,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def export_revenue_by_stream_analysis(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        months: List[int],
        current_user: dict,
    ):
        try:
            response = await self.get_revenue_by_stream_analysis(
                db=db,
                asset_id=asset_id,
                months=months,
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
                        row["month"],
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

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_executive_summary(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
        current_user: dict,
    ):
        try:

            response = await self.get_monthly_revenue_comparison(
                db=db,
                asset_id=asset_id,
                year=year,
                month=None,
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

            if len(monthly_data) <= 1:
                return Res.success(
                    "S-10085",
                    data={
                        "asset_id": asset_id,
                        "year": year,
                        "strongest_month": None,
                        "weakest_month": None,
                    },
                )

            strongest_month = max(monthly_data, key=lambda x: x["capture_rate"])

            weakest_month = min(monthly_data, key=lambda x: x["capture_rate"])

            return Res.success(
                "S-10085",
                data={
                    "asset_id": asset_id,
                    "year": year,
                    "strongest_month": {
                        "month": strongest_month["month"],
                        "capture_rate": strongest_month["capture_rate"],
                        "revenue_gap": strongest_month["revenue_gap"],
                        "imbalance": strongest_month["net_imbalance"],
                    },
                    "weakest_month": {
                        "month": weakest_month["month"],
                        "capture_rate": weakest_month["capture_rate"],
                        "revenue_gap": weakest_month["revenue_gap"],
                        "imbalance": weakest_month["net_imbalance"],
                    },
                },
            )

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

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_warranty_limit_exceedance(
        self,
        db: AsyncSession,
        asset_id: int,
        month: int,
        year: int,
        cycle_method: str,
        current_user: dict,
    ):
        try:

            daily_cycles_response = await self.get_daily_cycles(
                db=db,
                asset_id=asset_id,
                month=month,
                year=year,
                cycle_method=cycle_method,
                current_user=current_user,
            )

            response_body = (
                json.loads(daily_cycles_response.body.decode())
                if hasattr(daily_cycles_response, "body")
                else daily_cycles_response
            )

            if response_body.get("status") == "error":
                return daily_cycles_response

            daily_cycles_data = response_body["data"]

            warranty_limit = daily_cycles_data.get("warranty_limit")

            if warranty_limit is None:
                return Res.error("E-10200")

            actual_exceedance = []
            multi_market_exceedance = []

            for row in daily_cycles_data["daily_cycles"]:
                actual_cycles = row["actual_daily_cycles"]
                multi_cycles = row["multi_market_daily_cycles"]

                if actual_cycles > warranty_limit:

                    actual_exceedance.append(
                        {
                            "date": datetime.strptime(row["date"], "%d-%m-%Y").strftime(
                                "%d-%m-%Y"
                            ),
                            "daily_cycles": round(actual_cycles, 2),
                            "over_limit": round(actual_cycles - warranty_limit, 2),
                        }
                    )

                if multi_cycles > warranty_limit:
                    multi_market_exceedance.append(
                        {
                            "date": datetime.strptime(row["date"], "%d-%m-%Y").strftime(
                                "%d-%m-%Y"
                            ),
                            "daily_cycles": round(multi_cycles, 2),
                            "over_limit": round(multi_cycles - warranty_limit, 2),
                        }
                    )

            return Res.success(
                "S-10084",
                data={
                    "asset_id": asset_id,
                    "month": month,
                    "year": year,
                    "cycle_method": cycle_method,
                    "warranty_limit": warranty_limit,
                    "warranty_exceedance": {
                        "actual": actual_exceedance,
                        "multi_market": multi_market_exceedance,
                    },
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")
