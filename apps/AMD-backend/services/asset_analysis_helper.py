from typing import Callable, List, Literal, Any, Type
from python_common.exceptions.data_exception import DependencyNotAvailableError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import (
    AssetOptimizationParameter,
    AssetFile,
    MonthlyHardcodedValue,
    MetricIndustryConfiguration,
    Metric,
    Settlement,
    PdfInvoice,
    SummaryStatement,
)
from utils import Res, FileStorageManager, get_days_in_month
from constants.enums import (
    AssetFileType,
    AssetMetrics,
    AnalysisWidget,
    AnalysisSections,
    AnalysisModules,
)
from utils.common_utils import round_decimal
from exceptions import ExceptionWithErrorCode
import pandas as pd
from io import BytesIO
from datetime import datetime
import numpy as np
import traceback
import botocore  # noqa: F403,F405
from pulp import *  # noqa: F403,F405
import io
import json
import calendar
from constants.defaults import ASSET_DEGRADATION_PER_CYCLE_PERCENTAGE
from decorators import analytics_meta
from constants.dependency_class import (
    MergedDataFrame,
    AssetUsableCapacity,
    TBSpreadBenchmark,
    OptimizedDataFrame,
    ActualStrategyDataFrame,
    ModoIndustryConfig,
    YearlyInvoiceSettlementRecords,
    YearlyMergedDataFrame,
    YearlyOptimizedDataFrame,
    IARDataFrame,
    YearlyHardcodedMetricValues,
    YearlyPdfInvoicesRecords,
    YearlySummaryStatementDataFrame,
    YearlySummaryStatementRecords,
)


def dependency(*dependency_types: Type[Any]):
    """Mark a method as a loader for one or more dependency types."""

    def decorator(func: Callable):
        func._dependency_types = dependency_types
        return func

    return decorator


class AnalysisServiceHelper:

    def __init__(self):
        self.dependency_map = {}

        for name in dir(self):
            method = getattr(self, name)

            dependency_types = getattr(
                method,
                "_dependency_types",
                None,
            )

            if dependency_types:
                for dependency_type in dependency_types:
                    self.dependency_map[dependency_type] = method

    # ===================== Private Functions =====================
    def _filter_yearly_data_by_months(self, data: dict[int, Any], months: List[int]) -> dict[int, Any]:
        if not months:
            return data
        
        filtered_data = {}
        data_months = list(map(str, sorted(data.keys())))
        for month in months:
            if str(month) in data_months:
                filtered_data[month] = data[str(month)]

        return filtered_data

    async def _get_iar_file_record(self, db: AsyncSession, asset_id: int) -> AssetFile:
        iar_stmt = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
            AssetFile.is_active.is_(True),
        )

        iar_files_result = await db.execute(iar_stmt)
        iar_file = iar_files_result.scalars().first()
        if not iar_file:
            raise ExceptionWithErrorCode(
                "E-10145", message="IAR dataset is not available"
            )
        return iar_file

    def _transform_per_stream_data(self, monthly_data):
        transformed_data = []

        """
        Transform the monthly data into a list of dictionaries, where each dictionary represents a revenue stream and its monthly breakdown.
        for example, the output will look like:
        {
            "STREAM_NAME_1": {
                "stream": "STREAM_NAME_1",
                "monthly_breakdown": [
                    {
                        "month": ...,
                        "gross_revenue": ...,
                        "expected_net": ...,
                        "reported_net": ...,
                        "variance": ...,
                        "variance_percentage": ...
                    },
                    {
                        "month": ...,
                        "gross_revenue": ...,
                        "expected_net": ...,
                        "reported_net": ...,
                        "variance": ...,
                        "variance_percentage": ...
                    }
                ]
            },
            "STREAM_NAME_2" : { ... },
            "STREAM_NAME_3" : { ... },
            ....
            "STREAM_NAME_N" : { ... },
        }
        """
        stream_map = {}
        total = {
            "gross_revenue": 0,
            "expected_net": 0,
            "reported_net": 0,
            "variance": 0,
            "variance_percentage": 0,
        }
        # first collect all streams and their monthly breakdowns into stream_map
        for month, streams in monthly_data.items():
            for stream in streams:
                stream_name = stream["stream_name"]
                monthly_breakdown_object = {
                    "month": int(month),
                    "gross_revenue": round_decimal(stream["stream_gross_revenue"]),
                    "expected_net": round_decimal(stream["stream_net_revenue"]),
                    "reported_net": round_decimal(stream["stream_reported_net"]),
                    "variance": round_decimal(stream["stream_variance"]),
                    "variance_percentage": round_decimal(stream["stream_variance_pct"]),
                }
                if stream_name not in stream_map:
                    stream_map[stream_name] = {
                        "stream": stream_name,
                        "monthly_breakdown": [monthly_breakdown_object],
                    }
                else:
                    stream_map[stream_name]["monthly_breakdown"].append(
                        monthly_breakdown_object
                    )

        # now calculate monthly calculations for each stream and add them as keys beside monthly breakdown
        for stream_name, stream_data in stream_map.items():
            monthly_breakdown = stream_data["monthly_breakdown"]
            stream_gross_revenue = round_decimal(sum(
                item["gross_revenue"] for item in monthly_breakdown
            ))
            stream_expected_net = round_decimal(
                sum(item["expected_net"] for item in monthly_breakdown)
            )
            stream_reported_net = round_decimal(sum(
                item["reported_net"] for item in monthly_breakdown
            ))
            stream_variance = round_decimal(stream_reported_net - stream_expected_net)
            stream_variance_percentage = round_decimal(
                stream_variance / stream_expected_net * 100
                if stream_expected_net != 0
                else 0
            )

            # to avoid situation like -0.0 
            if stream_variance_percentage == 0:
                stream_variance_percentage = 0.0

            stream_data["gross_revenue"] = stream_gross_revenue
            stream_data["expected_net"] = stream_expected_net
            stream_data["reported_net"] = stream_reported_net
            stream_data["variance"] = stream_variance
            stream_data["variance_percentage"] = stream_variance_percentage

        # finally remove the keys and make the overall data flat array
        for stream_name, stream_data in stream_map.items():
            total["gross_revenue"] += stream_data["gross_revenue"]
            total["expected_net"] += stream_data["expected_net"]
            total["reported_net"] += stream_data["reported_net"]
            total["variance"] += stream_data["variance"]
            transformed_data.append(stream_data)

        total['variance_percentage'] = total['variance'] / total['expected_net'] * 100 if total['expected_net'] != 0 else 0.0

        # round off the total values to 2 decimal places
        for key in total:
            total[key] = round_decimal(total[key])

        return {"per_stream_comparison": transformed_data, "total_stream_data": total}

    @dependency(YearlyPdfInvoicesRecords)
    async def load_yearly_pdf_invoices(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
    ) -> YearlyPdfInvoicesRecords:
        query = select(PdfInvoice).where(
            PdfInvoice.asset_id == asset_id,
            PdfInvoice.year == year,
            PdfInvoice.is_deleted == False,
        )
        query = query.order_by(PdfInvoice.month.asc())
        invoices_records = await db.execute(query)
        invoices_records = invoices_records.scalars().all()

        if len(invoices_records) == 0:
            raise DependencyNotAvailableError(
                "E-10001", message="invoice records not available"
            )
        
        root = {}
        for i in invoices_records:
            root[i.month] = i


        return YearlyPdfInvoicesRecords.model_validate(root)

    @dependency(YearlyInvoiceSettlementRecords)
    async def load_yearly_settlement_records(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
    ) -> YearlyInvoiceSettlementRecords:
        query = select(Settlement).where(
            Settlement.asset_id == asset_id,
            Settlement.year == year,
            Settlement.is_deleted == False,
        )
        query = query.order_by(Settlement.month.asc())
        settlement_records = await db.execute(query)
        settlement_records = settlement_records.scalars().all()

        root = {}
        for i in settlement_records:
            root[i.month] = i

        if len(settlement_records) == 0:
            raise DependencyNotAvailableError(
                "E-10001", message="settlement records not available"
            )

        return YearlyInvoiceSettlementRecords.model_validate(root)

    @dependency(YearlySummaryStatementRecords)
    async def load_yearly_summary_statement_records(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
    ) -> YearlySummaryStatementRecords:
        query = select(SummaryStatement).where(
            SummaryStatement.asset_id == asset_id,
            SummaryStatement.year == year,
            SummaryStatement.is_deleted == False,
        )
        query = query.order_by(SummaryStatement.month.asc())
        summary_statement_records = await db.execute(query)
        summary_statement_records = summary_statement_records.scalars().all()

        root = {}
        for i in summary_statement_records:
            root[i.month] = i

        if len(summary_statement_records) == 0:
            raise DependencyNotAvailableError(
                "E-10001", message="Summary statement records not available"
            )

        return YearlySummaryStatementRecords.model_validate(root)

    @dependency(YearlySummaryStatementDataFrame)
    async def load_yearly_summary_statement_files(
        self,
        db: AsyncSession,
        asset_id: int,
        year: int,
    ):
        query = select(SummaryStatement).where(
            SummaryStatement.asset_id == asset_id,
            SummaryStatement.year == year,
            SummaryStatement.is_deleted == False,
        )
        query = query.order_by(SummaryStatement.month.asc())
        summary_statement_records = await db.execute(query)
        summary_statement_records = summary_statement_records.scalars().all()

        root = {}
        for summary_file in summary_statement_records:
            # fetch file bytes from storage
            file_obj, _ = FileStorageManager.get_file_object(
                summary_file.file_key, storage_type=summary_file.storage_server
            )
            file_bytes = BytesIO(file_obj)

            summary_df = pd.read_excel(
                file_bytes,
                sheet_name="Summary",
            )
            detail_df = pd.read_excel(file_bytes, sheet_name="Detail")

            root[summary_file.month] = {
                "summary": summary_df,
                "detail": detail_df,
            }

        if len(summary_statement_records) == 0:
            raise DependencyNotAvailableError(
                "E-10001", message="Summary statement records not available"
            )

        return YearlySummaryStatementDataFrame.model_validate(root)

    @dependency(ModoIndustryConfig)
    async def load_modo_benchmark_industry_config(
        self, db: AsyncSession, **kwargs
    ) -> ModoIndustryConfig:
        metric_stmt = (
            select(MetricIndustryConfiguration, Metric.metric_name)
            .join(Metric, Metric.id == MetricIndustryConfiguration.metric_id)
            .where(Metric.id == AssetMetrics.MODO_BENCHMARK.value)
        )

        metrics_res = await db.execute(metric_stmt)
        all_metrics = metrics_res.first()

        if not all_metrics:
            return self.ModoIndustryConfig(
                name="Modo Benchmark",
                low=0.0,
                mid=0.0,
                high=0.0,
            )

        industry_configuration, metric_name = all_metrics

        return ModoIndustryConfig(
            name=metric_name,
            low=industry_configuration.industry_low,
            mid=industry_configuration.industry_mid,
            high=industry_configuration.industry_high,
        )

    @dependency(OptimizedDataFrame)
    async def load_optimized_df(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
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
        optimized_df = pd.read_csv(io.BytesIO(file_obj))
        if optimized_df is None or optimized_df.empty:
            raise ExceptionWithErrorCode("E-10154")

        return optimized_df

    @dependency(MergedDataFrame)
    async def load_merged_file(
        self, asset_id: int, month: int, year: int, db: AsyncSession, **kwargs
    ):
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
            raise ExceptionWithErrorCode("E-10100")

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
                raise ExceptionWithErrorCode(
                    "E-10111",
                    message="Analysis data not found for the selected period.",
                )

        except botocore.exceptions.ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise ExceptionWithErrorCode(
                    "E-10114",
                    message="File key not found in S3. Please re-run merge.",
                )

        except Exception:
            traceback.print_exc()
            raise ExceptionWithErrorCode(
                "E-10001", message="Error processing analysis data."
            )

        return filtered_df

    @dependency(AssetUsableCapacity)
    async def load_asset_usable_capacity(
        self, db: AsyncSession, asset_id: int, **kwargs
    ):
        optimization_query = await db.execute(
            select(AssetOptimizationParameter).where(
                AssetOptimizationParameter.asset_id == asset_id
            )
        )

        optimization = optimization_query.scalars().first()

        if not optimization:
            raise ExceptionWithErrorCode("E-10193")

        usable_capacity = optimization.usable_capacity_mwh

        if usable_capacity is None:
            raise ExceptionWithErrorCode("E-10193")

        if usable_capacity <= 0:
            raise ExceptionWithErrorCode("E-10194")

        return usable_capacity

    @dependency(TBSpreadBenchmark)
    async def load_tb_spread_benchmark(
        self, db: AsyncSession, month: int, year: int, **kwargs
    ):
        benchmark_query = await db.execute(
            select(MonthlyHardcodedValue).where(
                MonthlyHardcodedValue.metric_id == AssetMetrics.TB_SPREAD_REVENUE,
                MonthlyHardcodedValue.month == month,
                MonthlyHardcodedValue.year == year,
            )
        )

        benchmark_record = benchmark_query.scalars().first()
        return (
            float(benchmark_record.value)
            if benchmark_record and benchmark_record.value is not None
            else None
        )

    @dependency(ActualStrategyDataFrame)
    async def load_actual_strategy_df(
        self, db: AsyncSession, asset_id: int, month: int, year: int, **kwargs
    ):
        file_stmt = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
        )
        files_res = await db.execute(file_stmt)
        merged_records = files_res.scalars().all()
        if not merged_records:
            raise ExceptionWithErrorCode("E-10100")
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
            raise ExceptionWithErrorCode("E-10140")

        ts_col = None
        for col in df.columns:
            if col.lower().strip() == "timestamp":
                ts_col = col
                break
        if not ts_col:
            raise ExceptionWithErrorCode("E-10139")

        df[ts_col] = pd.to_datetime(df[ts_col], errors="coerce")
        df = df[(df[ts_col].dt.month == month) & (df[ts_col].dt.year == year)].copy()
        if df.empty:
            raise ExceptionWithErrorCode("E-10139")

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
                raise ExceptionWithErrorCode("E-10139")

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

        return df

    @dependency(YearlyMergedDataFrame)
    async def load_yearly_merged_df(
        self, db: AsyncSession, asset_id: int, year: int, **kwargs
    ) -> YearlyMergedDataFrame:
        merged_stmt = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
            AssetFile.is_active.is_(True),
            AssetFile.year == year,
        )
        merged_files_result = await db.execute(merged_stmt)
        merged_records = merged_files_result.scalars().all()

        if not merged_records:
            raise DependencyNotAvailableError(
                "E-10107", message="Merged dataset unavailable"
            )

        def fetch_merged_file(file_record):
            obj, _ = FileStorageManager.get_file_object(
                file_record.key, storage_type=file_record.storage_server
            )
            return pd.read_excel(BytesIO(obj))

        root = {}
        try:
            for f in merged_records:
                df = fetch_merged_file(f)
                df.columns = [str(c).strip().lower() for c in df.columns]

                root[f.month] = df

            return YearlyMergedDataFrame.model_validate(root)

        except Exception:
            traceback.print_exc()
            raise ExceptionWithErrorCode("E-10157", message="Failed to load datasets")

    @dependency(YearlyOptimizedDataFrame)
    async def load_yearly_optimized_df(
        self, db: AsyncSession, asset_id: int, year: int, **kwargs
    ) -> YearlyOptimizedDataFrame:
        optmized_stmt = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
            AssetFile.is_active.is_(True),
            AssetFile.year == year,
        )

        optmized_files_result = await db.execute(optmized_stmt)
        optmized_records = optmized_files_result.scalars().all()

        if not optmized_records:
            raise DependencyNotAvailableError(
                "E-10154", message="Optimized dataset unavailable"
            )

        def fetch_optimized_file(file_record):
            obj, _ = FileStorageManager.get_file_object(
                file_record.key, storage_type=file_record.storage_server
            )
            return pd.read_csv(BytesIO(obj))

        root = {}
        try:
            for f in optmized_records:
                df = fetch_optimized_file(f)
                df.columns = [str(c).strip().lower() for c in df.columns]

                root[f.month] = df

            return YearlyOptimizedDataFrame.model_validate(root)

        except Exception:
            traceback.print_exc()
            raise ExceptionWithErrorCode("E-10157", message="Failed to load datasets")

    @dependency(IARDataFrame)
    async def load_iar_file_df(
        self, db: AsyncSession, asset_id: int, **kwargs
    ) -> IARDataFrame:

        # clever loading for some service functions
        iar_file = kwargs.get("iar_file")
        if not iar_file:
            iar_file = await self._get_iar_file_record(db=db, asset_id=asset_id)

        # load base file
        try:
            file_obj, _ = FileStorageManager.get_file_object(
                iar_file.key, storage_type=iar_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

        except Exception:
            raise ExceptionWithErrorCode(
                "E-10153", message="Failed to load IAR baseline template file"
            )

        def extract_iar_dataset(df_raw):
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

        # parse & return IAR file
        df_clean, date_obj = extract_iar_dataset(df)
        return IARDataFrame(
            master_dataframe=df_clean,
            date_objs=date_obj,
        )

    @dependency(YearlyHardcodedMetricValues)
    async def load_yearwise_monthly_hardcoded_metric_values(
        self, db: AsyncSession, year: int, **kwargs
    ) -> YearlyHardcodedMetricValues:
        hardcoded_stmt = select(MonthlyHardcodedValue).where(
            MonthlyHardcodedValue.year == year,
            MonthlyHardcodedValue.metric_id.in_(
                [
                    AssetMetrics.TB_SPREAD_REVENUE.value,
                    AssetMetrics.MODO_BENCHMARK.value,
                    AssetMetrics.DUOS_CREDIT.value,
                    AssetMetrics.DUOS_FIXED_CHARGES.value,
                    AssetMetrics.CAPACITY_MARKET.value,
                ]
            ),
        )
        hardcoded_res = await db.execute(hardcoded_stmt)
        settings_year_map = {}
        for item in hardcoded_res.scalars().all():
            if item.month not in settings_year_map:
                settings_year_map[item.month] = {}
            settings_year_map[item.month][item.metric_id] = float(item.value)
        return YearlyHardcodedMetricValues(settings_year_map)

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_SUMMARY,
    )
    async def get_operations_summary(self, df: MergedDataFrame, **kwargs):
        sffr = float(df.get("SFFR revenues", 0).sum())
        ida1 = float(df.get("IDA1 Revenue", 0).sum())
        epex_30 = float(df.get("EPEX 30 DA Revenue", 0).sum())
        imb_rev = float(df.get("Imbalance Revenue", 0).sum())
        imb_chg = float(df.get("Imbalance Charge", 0).sum())

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
                            "percentage": round((abs(s["val"]) / total_abs) * 100, 1),
                        }
                    )

        return {
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
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_MARKET_SUMMARY,
    )
    def get_operation_market_summary(self, df: MergedDataFrame, **kwargs):
        da_prices = df.get("Day Ahead Price (EPEX)", pd.Series(dtype=float))
        id_prices = df.get("GB-ISEM Intraday 1 Price", pd.Series(dtype=float))

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
            if price_col in df.columns and mw_col in df.columns:
                ancillary_list.append(
                    {
                        "service": svc,
                        "avg_clearing_price": round(df[price_col].mean(), 2),
                        "avg_availability_mw": round(df[mw_col].mean(), 2),
                    }
                )

        # Trading Activity (KPI Metrics) - Fixed AttributeError
        trading_activity = {
            "avg_da_mw": (
                round(df.get("DA MW", pd.Series(dtype=float)).mean(), 2)
                if "DA MW" in df.columns
                else 0
            ),
            "avg_epex_30_da_mw": (
                round(
                    df.get("EPEX 30 DA MW", pd.Series(dtype=float)).mean(),
                    2,
                )
                if "EPEX 30 DA MW" in df.columns
                else 0
            ),
            "avg_ida1_mw": (
                round(df.get("IDA1 MW", pd.Series(dtype=float)).mean(), 2)
                if "IDA1 MW" in df.columns
                else 0
            ),
        }

        return {
            "market_prices": market_prices,
            "ancillary_services": ancillary_list,
            "trading_activity": trading_activity,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_ENERGY_PRICE,
    )
    def get_energy_price_comparison(self, df: MergedDataFrame, **kwargs):
        # Replaced .iterrows() loop with rapid vectorization
        # Isolate rows where both pricing variables are not null simultaneously
        temp_df = df.dropna(
            subset=["Day Ahead Price (EPEX)", "GB-ISEM Intraday 1 Price"], how="all"
        ).copy()

        temp_df["timestamp"] = pd.to_datetime(temp_df.index).strftime(
            "%Y-%m-%dT%H:%M:%S"
        )

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

        return {
            "energy_price_comparison": energy_price_comparison,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.OPERATIONS,
        widget=AnalysisWidget.ANALYSIS_OPERATIONS_BATTERY_POWER_OVER_TIME,
    )
    def get_battery_power_over_time(self, df: MergedDataFrame, **kwargs):
        # Removed loop iterrows()
        temp_df = df.dropna(subset=["Power_MW"]).copy()

        temp_df["timestamp"] = pd.to_datetime(temp_df.index).strftime(
            "%Y-%m-%dT%H:%M:%S"
        )

        temp_df["battery_power"] = temp_df["Power_MW"].astype(float)

        battery_power_over_time = temp_df[["timestamp", "battery_power"]].to_dict(
            orient="records"
        )
        return {
            "battery_power_over_time": battery_power_over_time,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_UTILIZATION,
    )
    def get_market_utilization(
        self,
        optimized_df: OptimizedDataFrame,
        actual_df: ActualStrategyDataFrame,
        market_strategy: Literal["actual", "multi", "epex_daily", "epex_efa"],
        **kwargs,
    ):
        df = None
        if market_strategy == "actual":
            df = actual_df.copy()
            group_col = "assigned_market_label"
            revenue_col = "assigned_net_revenue"
        else:
            df = optimized_df.copy()
            if market_strategy == "multi":
                group_col = "Market_Used_Multi"
                revenue_col = "Optimised_Revenue_Multi"
                df.loc[df["Strategy_Selected_Multi"] == "SFFR", group_col] = "SFFR"
            elif market_strategy == "epex_daily":
                group_col = "Strategy_Selected_Daily"
                revenue_col = "Optimised_Revenue_Daily"
            elif market_strategy == "epex_efa":
                group_col = "Strategy_Selected_EFA"
                revenue_col = "Optimised_Revenue_EFA"

        utilization_data = []

        if df.empty:
            return {"data": []}

        total_strategy_rows = len(df)
        counts = df[group_col].value_counts()

        for label, count in counts.items():
            mask = df[group_col] == label
            total_rev = float(df.loc[mask, revenue_col].sum())

            clean_label = (
                str(label).replace("-", "_")
                if market_strategy != "actual"
                else str(label)
            )

            utilization_data.append(
                {
                    "market_used": clean_label,
                    "count": int(count),
                    "percentage": round(
                        (count / total_strategy_rows) * 100,
                        2,
                    ),
                    "total_revenue": round(total_rev, 2),
                }
            )

        return {"data": utilization_data}

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_STATISTICS,
    )
    def get_market_statistics_table(
        self,
        actual_df: ActualStrategyDataFrame,
        optimized_df: OptimizedDataFrame,
        market_strategy: Literal["actual", "multi", "epex_daily", "epex_efa"],
        **kwargs,
    ):
        df = None

        if market_strategy == "actual":
            df = actual_df.copy()
            strategy_col = "assigned_market_label"
            revenue_col = "assigned_net_revenue"
        else:
            df = optimized_df.copy()
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
            else:
                strategy_col, revenue_col = (
                    "Market_Used_Multi",
                    "Optimised_Revenue_Multi",
                )
                df.loc[df["Strategy_Selected_Multi"] == "SFFR", strategy_col] = "SFFR"

        total_periods = len(df)
        total_revenue = float(df[revenue_col].fillna(0).sum())

        rows = []

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

        return {
            "market_strategy": market_strategy,
            "total_periods": total_periods,
            "total_revenue": round(total_revenue, 2),
            "rows": rows,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_REVENUE_DISTRIBUTION,
    )
    def get_revenue_distribution_chart(
        self,
        actual_df: ActualStrategyDataFrame,
        optimized_df: OptimizedDataFrame,
        market_strategy: Literal["actual", "multi", "epex_daily", "epex_efa"],
        **kwargs,
    ):
        df = None
        if market_strategy == "actual":
            df = actual_df.copy()
            if df.empty:
                return {
                    "market_strategy": market_strategy,
                    "chart_data": [],
                }

            strategy_col = "assigned_market_label"
            revenue_col = "assigned_net_revenue"
        else:
            df = optimized_df.copy()
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
                df.loc[df["Strategy_Selected_Multi"] == "SFFR", strategy_col] = "SFFR"
        chart_data = []

        if df.empty:
            return {"market_strategy": market_strategy, "chart_data": []}

        markets = df[strategy_col].dropna().unique().tolist()

        for market in markets:
            if str(market).lower().strip() in [
                "idle",
                "unknown operation / idle",
            ]:
                continue

            revenue = float(
                df.loc[df[strategy_col] == market, revenue_col].fillna(0).sum()
            )

            chart_data.append(
                {
                    "market": market,
                    "revenue": round(revenue, 2),
                }
            )

        return {
            "market_strategy": market_strategy,
            "chart_data": chart_data,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_BEST_MARKETS,
    )
    def get_best_markets(self, df: OptimizedDataFrame, **kwargs):

        buy_counts = df["Best_Buy_Market"].value_counts().reset_index()
        buy_counts.columns = ["market", "times_selected"]

        total_buy = buy_counts["times_selected"].sum()

        buy_counts["percentage"] = (
            buy_counts["times_selected"] / total_buy * 100
        ).round(1)

        buying_markets = buy_counts.sort_values(
            by="times_selected",
            ascending=False,
        ).to_dict(orient="records")

        sell_counts = df["Best_Sell_Market"].value_counts().reset_index()
        sell_counts.columns = ["market", "times_selected"]

        total_sell = sell_counts["times_selected"].sum()

        sell_counts["percentage"] = (
            sell_counts["times_selected"] / total_sell * 100
        ).round(1)

        selling_markets = sell_counts.sort_values(
            by="times_selected",
            ascending=False,
        ).to_dict(orient="records")

        return {
            "buying_markets": buying_markets,
            "selling_markets": selling_markets,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_OPTIMIZATION,
        widget=AnalysisWidget.ANALYSIS_MARKET_SUMMARY,
    )
    def get_market_analysis_summary(
        self,
        optimized_df: OptimizedDataFrame,
        actual_df: ActualStrategyDataFrame,
        **kwargs,
    ):
        daily_rev = float(optimized_df["Optimised_Revenue_Daily"].sum()) * 0.95
        efa_rev = float(optimized_df["Optimised_Revenue_EFA"].sum()) * 0.95
        multi_rev = float(optimized_df["Optimised_Revenue_Multi"].sum()) * 0.95

        imp_efa = ((efa_rev - daily_rev) / daily_rev) * 100 if daily_rev != 0 else 0

        imp_multi = ((multi_rev - daily_rev) / daily_rev) * 100 if daily_rev != 0 else 0

        diff_revenue = multi_rev - daily_rev

        actual_revenue_total = (
            float(actual_df["assigned_net_revenue"].sum())
            if not actual_df.empty
            else 0.0
        )

        return {
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
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_SPREAD,
    )
    def get_price_spread_analysis(self, df: MergedDataFrame, **kwargs):

        df = df.copy()

        def normalize_col(c):
            return c.lower().strip().replace(" ", "_").replace("-", "_")

        df.columns = [normalize_col(c) for c in df.columns]

        epex_col = normalize_col("Day Ahead Price (EPEX)")  # 'day_ahead_price_(epex)'
        ssp_col = normalize_col("SSP Price")  # 'ssp_price'
        sbp_col = normalize_col("SBP Price")  # 'sbp_price'
        timestamp_col = normalize_col("Timestamp")

        if ssp_col not in df.columns and "ssp" in df.columns:
            ssp_col = "ssp"
        if sbp_col not in df.columns and "sbp" in df.columns:
            sbp_col = "sbp"

        for col in [epex_col, ssp_col, sbp_col]:
            if col not in df.columns:
                return Res.error(
                    "E-10133",
                    message=f"Required column '{col}' is missing in the merged dataset.",
                    http_status_code=422,
                )

        # Timestamp is already the dataframe index from load_merged_file()
        temp_df = df.reset_index()

        timestamp_col = temp_df.columns[0]

        price_summary = {
            "epex_da_avg_price_per_mwh": round(float(df[epex_col].mean()), 2),
            "epex_da_max_price_per_mwh": round(float(df[epex_col].max()), 2),
            "ssp_max_price_per_mwh": round(float(df[ssp_col].max()), 2),
            "sbp_max_price_per_mwh": round(float(df[sbp_col].max()), 2),
        }

        daily_df = (
            temp_df.groupby(temp_df[timestamp_col].dt.date)
            .agg(
                Daily_MAX_EPEX=(epex_col, "max"),
                Daily_MIN_EPEX=(epex_col, "min"),
                SBP_MAX=(sbp_col, "max"),
                SSP_MIN=(ssp_col, "min"),
            )
            .reset_index()
        )
        date_col = daily_df.columns[0]

        daily_df["Daily_EPEX_SPREAD"] = (
            daily_df["Daily_MAX_EPEX"] - daily_df["Daily_MIN_EPEX"]
        )
        daily_df["Daily_SBP_SSP_SPREAD"] = daily_df["SBP_MAX"] - daily_df["SSP_MIN"]

        daily_df["date_str"] = pd.to_datetime(daily_df[date_col]).dt.strftime(
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

        return {
            "price_summary": price_summary,
            "spread_analysis": spread_analysis,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_VOLATILITY,
    )
    def get_price_volatility_analysis(self, df: MergedDataFrame, **kwargs):

        df = df.copy()

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

        epex_col = normalize_col("Day Ahead Price (EPEX)")
        if epex_col not in df.columns:
            return Res.error(
                "E-10136",
                message=f"Required column '{epex_col}' is missing.",
                http_status_code=422,
            )

        # Timestamp is already dataframe index
        temp_df = df.reset_index()

        timestamp_col = temp_df.columns[0]

        # TIMESTAMP CONVERSION
        temp_df[timestamp_col] = pd.to_datetime(
            temp_df[timestamp_col], dayfirst=True, errors="coerce"
        )
        temp_df[epex_col] = pd.to_numeric(temp_df[epex_col], errors="coerce")
        temp_df = temp_df.dropna(subset=[timestamp_col, epex_col])

        if temp_df.empty:
            return Res.error(
                "E-10100",
                message="No valid volatility data available.",
                http_status_code=404,
            )

        # EXTRACT DATE
        temp_df["date"] = temp_df[timestamp_col].dt.date

        # DAILY GROUPING
        grouped = temp_df.groupby("date")[epex_col]

        # DAILY MEAN + STD DEV
        daily_df = grouped.agg(
            epex_mean="mean", std_deviation=lambda x: x.std(ddof=1)
        ).reset_index()
        if daily_df.empty:
            return Res.error(
                "E-10137",
                message="Volatility calculation failed.",
                http_status_code=422,
            )

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
            return Res.error(
                "E-10137",
                message="Volatility calculation failed.",
                http_status_code=422,
            )
        max_row = high_volatility_df.loc[high_volatility_df["std_deviation"].idxmax()]
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

        return {
            "threshold": threshold,
            "kpi": {
                "average_daily_volatility": average_daily_volatility,
                "high_volatility_days": high_volatility_days,
                "max_volatility": max_volatility,
            },
            "chart_data": chart_data,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_HOURLY_PRICE_PATTERNS,
    )
    def get_hourly_price_patterns(self, df: MergedDataFrame, **kwargs):

        df = df.copy()

        required_columns = [
            "Day Ahead Price (EPEX)",
            "SSP",
            "SBP",
        ]

        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            raise ExceptionWithErrorCode(
                "E-10001",
                message=f"Missing columns: {missing_columns}",
            )

        # Timestamp is already index
        temp_df = df.reset_index()

        timestamp_col = temp_df.columns[0]

        temp_df["hour"] = temp_df[timestamp_col].dt.hour

        hourly_df = (
            temp_df.groupby("hour")
            .agg(
                epex_da=("Day Ahead Price (EPEX)", "mean"),
                ssp=("SSP", "mean"),
                sbp=("SBP", "mean"),
            )
            .reset_index()
        )

        hourly_df = hourly_df.set_index("hour").reindex(range(24)).reset_index()

        hourly_df = hourly_df.fillna(0)

        hourly_df["epex_da"] = hourly_df["epex_da"].round(2)
        hourly_df["ssp"] = hourly_df["ssp"].round(2)
        hourly_df["sbp"] = hourly_df["sbp"].round(2)

        lowest_idx = hourly_df["epex_da"].idxmin()

        lowest_avg_epex_price = float(hourly_df.loc[lowest_idx, "epex_da"])

        best_buy_hour = int(hourly_df.loc[lowest_idx, "hour"])

        highest_idx = hourly_df["epex_da"].idxmax()

        highest_avg_epex_price = float(hourly_df.loc[highest_idx, "epex_da"])

        best_sell_hour = int(hourly_df.loc[highest_idx, "hour"])

        hourly_arbitrage = round(highest_avg_epex_price - lowest_avg_epex_price, 2)

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

        return {
            "lowest_avg_epex_price_per_mwh": lowest_avg_epex_price,
            "best_buy_hour": best_buy_hour,
            "highest_avg_epex_price_per_mwh": highest_avg_epex_price,
            "best_sell_hour": best_sell_hour,
            "hourly_arbitrage_per_mwh": hourly_arbitrage,
            "hourly_price_patterns": hourly_price_patterns,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.MARKET_PRICES,
        widget=AnalysisWidget.ANALYSIS_MARKET_PRICE_CORRELATION_MATRIX,
    )
    def get_price_correlation_matrix(self, df: MergedDataFrame, **kwargs):
        df = df.copy()

        required_columns = [
            "Day Ahead Price (EPEX)",
            "GB-ISEM Intraday 1 Price",
            "SSP",
            "SBP",
        ]

        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            raise ExceptionWithErrorCode(
                "E-10141",
                message=f"Missing required columns: {missing_columns}",
            )

        # Timestamp is already the dataframe index
        temp_df = df.reset_index()

        timestamp_col = temp_df.columns[0]

        temp_df = temp_df.dropna(subset=[timestamp_col])

        temp_df = temp_df.drop_duplicates(subset=[timestamp_col])

        correlation_df = temp_df[
            [
                "Day Ahead Price (EPEX)",
                "GB-ISEM Intraday 1 Price",
                "SSP",
                "SBP",
            ]
        ].copy()

        markets = [
            "EPEX DA",
            "Intraday",
            "SSP",
            "SBP",
        ]

        correlation_df.columns = markets

        correlation_df = correlation_df.apply(
            pd.to_numeric,
            errors="coerce",
        )

        correlation_df = correlation_df.dropna()

        if len(correlation_df) < 2:
            raise ExceptionWithErrorCode(
                "E-10142",
                message="Insufficient valid records for correlation calculation.",
            )

        std_values = correlation_df.std()

        if (std_values <= 0).any() or std_values.isna().any():
            raise ExceptionWithErrorCode(
                "E-10143",
                message="Standard deviation calculation failed.",
            )

        corr_matrix = correlation_df.corr(method="pearson").round(2)

        for i in range(len(corr_matrix)):
            corr_matrix.iat[i, i] = 1.00

        return {
            "correlation_matrix": {
                "markets": markets,
                "matrix": corr_matrix.values.tolist(),
            }
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_SUMMARY,
    )
    def get_ancillary_summary(self, df: MergedDataFrame, **kwargs):
        services = [
            "SFFR",
            "DCL",
            "DCH",
            "DML",
            "DMH",
            "DRL",
            "DRH",
        ]
        revenues = {}

        for service in services:
            revenue_col = f"{service} revenues"

            if revenue_col not in df.columns:
                raise ExceptionWithErrorCode("E-10160")

            revenues[service] = float(df[revenue_col].sum()) * 0.95

        total_ancillary_revenue = round(sum(revenues.values()), 2)
        top_service = max(revenues, key=revenues.get)
        top_service_revenue = revenues[top_service]
        services_used = len([value for value in revenues.values() if value > 0])

        top_service_share = (
            round((top_service_revenue / total_ancillary_revenue) * 100, 2)
            if total_ancillary_revenue > 0
            else 0
        )

        return {
            "summary": {
                "total_ancillary_revenue": total_ancillary_revenue,
                "top_service": top_service,
                "top_service_revenue": round(top_service_revenue, 2),
                "services_used": services_used,
                "total_services": len(services),
                "top_service_share": top_service_share,
            }
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_REVENUE_BREAKDOWN,
    )
    def get_ancillary_breakdown(self, df: MergedDataFrame, **kwargs):
        SERVICE_MAPPING = {
            "SFFR": "Static FFR",
            "DCL": "DC Low",
            "DCH": "DC High",
            "DML": "DM Low",
            "DMH": "DM High",
            "DRL": "DR Low",
            "DRH": "DR High",
        }

        service_breakdown = []

        # Validate required columns
        for service in SERVICE_MAPPING:
            revenue_col = f"{service} revenues"
            availability_col = f"{service} Availability"
            price_col = f"{service} Clearing Price"

            if revenue_col not in df.columns:
                raise ExceptionWithErrorCode("E-10160")
            if availability_col not in df.columns:
                raise ExceptionWithErrorCode("E-10161")
            if price_col not in df.columns:
                raise ExceptionWithErrorCode("E-10162")

        # Compute analytics
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
            revenue_per_mwh = total_revenue_service / total_mwh if total_mwh > 0 else 0

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

        return {
            "service_breakdown": service_breakdown,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_OPPORTUNITY_COST_ANALYSIS,
    )
    def get_opportunity_cost_analysis(self, df: MergedDataFrame, **kwargs):
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

        return {
            "opportunity_cost_analysis": {
                "current_avg_rate": round(avg_rate, 2),
                "best_service_rate": round(best_rate, 2),
                "opportunity_cost": round(opp_cost, 2),
                "best_service": best_service,
            }
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.ANCILLARY_SERVICES,
        widget=AnalysisWidget.ANALYSIS_ANCILLARY_SERVICE_REVENUE_BY_HOUR,
    )
    def get_service_revenue_by_hour(self, df: MergedDataFrame, **kwargs):
        services = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]
        temp_df = df.reset_index()
        timestamp_col = temp_df.columns[0]
        temp_df["hour"] = pd.to_datetime(temp_df[timestamp_col]).dt.hour
        hourly_revenue = []
        for h in range(24):
            hour_df = temp_df[temp_df["hour"] == h]
            service_list = []
            for s in services:
                col = f"{s} revenues"
                rev = float(hour_df[col].sum()) * 0.95 if col in hour_df else 0.0
                service_list.append({"service": s, "revenue": round(rev, 2)})
            hourly_revenue.append({"hour": h, "services": service_list})

        return {
            "hourly_revenue": hourly_revenue,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_DAILY_BREAKDOWN,
    )
    def get_daily_imbalance_breakdown(self, df: MergedDataFrame, **kwargs):

        if df.empty:
            return {
                "daily_breakdown": [],
            }
        required_columns = [
            "Imbalance Revenue",
            "Imbalance Charge",
        ]
        for column in required_columns:
            if column not in df.columns:
                if column == "Imbalance Revenue":
                    raise ExceptionWithErrorCode("E-10168")
                raise ExceptionWithErrorCode("E-10169")

        temp_df = df.reset_index()
        timestamp_col = temp_df.columns[0]
        temp_df["adj_revenue"] = temp_df["Imbalance Revenue"] * 0.95
        temp_df["adj_charge"] = temp_df["Imbalance Charge"] * 0.95
        temp_df["calendar_date"] = pd.to_datetime(temp_df[timestamp_col]).dt.date

        daily_df = (
            temp_df.groupby("calendar_date")
            .agg(
                {
                    "adj_revenue": "sum",
                    "adj_charge": "sum",
                }
            )
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
                    "daily_net_imbalance": round(float(row["daily_net_imbalance"]), 2),
                }
            )

        return {
            "daily_breakdown": daily_breakdown,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_WORST_DAYS,
    )
    def get_top_5_worst_imbalance_days(self, df: MergedDataFrame, **kwargs):
        if df.empty:
            return {
                "worst_days": [],
            }

        required_columns = [
            "Imbalance Revenue",
            "Imbalance Charge",
        ]

        for column in required_columns:
            if column not in df.columns:
                if column == "Imbalance Revenue":
                    raise ExceptionWithErrorCode("E-10168")
                raise ExceptionWithErrorCode("E-10169")

        temp_df = df.reset_index()
        timestamp_col = temp_df.columns[0]
        temp_df["adj_revenue"] = temp_df["Imbalance Revenue"] * 0.95
        temp_df["adj_charge"] = temp_df["Imbalance Charge"] * 0.95
        temp_df["calendar_date"] = pd.to_datetime(temp_df[timestamp_col]).dt.date

        daily_df = (
            temp_df.groupby("calendar_date")
            .agg(
                {
                    "adj_revenue": "sum",
                    "adj_charge": "sum",
                }
            )
            .reset_index()
        )

        daily_df["net_imbalance"] = daily_df["adj_revenue"] - daily_df["adj_charge"]
        worst_days_df = daily_df.sort_values(
            by="net_imbalance",
            ascending=True,
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

        return {
            "worst_days": worst_days,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_SUMMARY,
    )
    def get_imbalance_summary(self, df: MergedDataFrame, **kwargs):
        required_columns = [
            "Imbalance Revenue",
            "Imbalance Charge",
        ]

        for column in required_columns:
            if column not in df.columns:
                if column == "Imbalance Revenue":
                    raise ExceptionWithErrorCode("E-10168")

                raise ExceptionWithErrorCode("E-10169")
        df = df.copy()

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

        return {
            "summary": {
                "imbalance_revenue": round(rev_kpi, 2),
                "revenue_periods": rev_periods,
                "imbalance_charges": round(chg_kpi, 2),
                "charge_periods": chg_periods,
                "net_imbalance": round(net_imbalance, 2),
                "status": status,
                "percentage_of_periods_with_charges": round(pct, 2),
            }
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.IMBALANCE_ANALYSIS,
        widget=AnalysisWidget.ANALYSIS_IMBALANCE_HOURLY_CHARGES,
    )
    def get_imbalance_hourly_charges(self, df: MergedDataFrame, **kwargs):
        df = df.copy()
        temp_df = df.reset_index()
        timestamp_col = temp_df.columns[0]

        # Apply 5% deduction
        temp_df["chg_adj"] = temp_df["Imbalance Charge"] * 0.95
        temp_df["hour"] = pd.to_datetime(temp_df[timestamp_col]).dt.hour

        hourly = (
            temp_df.groupby("hour")["chg_adj"].sum().reindex(range(24), fill_value=0.0)
        )

        # Peak Hour: Max Absolute Value
        peak_hour_idx = hourly.abs().idxmax()
        peak_charges = float(hourly[peak_hour_idx])

        breakdown = [
            {"hour": f"{h:02d}:00", "total_charges": round(float(v), 2)}
            for h, v in hourly.items()
        ]

        return {
            "peak_imbalance_hour": {
                "hour": f"{peak_hour_idx:02d}:00",
                "total_charges": round(peak_charges, 2),
            },
            "hourly_breakdown": breakdown,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_SUMMARY,
    )
    def get_battery_health_analysis(
        self, merged_df: MergedDataFrame, optimized_df: OptimizedDataFrame, **kwargs
    ):
        if "Power_MW" not in merged_df.columns:
            return Res.error("E-10175", http_status_code=422)

        if "Optimised_Net_MWh_Multi" not in optimized_df.columns:
            return Res.error("E-10176", http_status_code=422)

        actual_discharge_energy = float(
            merged_df.loc[merged_df["Power_MW"] > 0, "Power_MW"].sum() * 0.5
        )

        actual_charge_energy = abs(
            float(merged_df.loc[merged_df["Power_MW"] < 0, "Power_MW"].sum() * 0.5)
        )

        optimized_discharge_energy = float(
            optimized_df.loc[
                optimized_df["Optimised_Net_MWh_Multi"] > 0, "Optimised_Net_MWh_Multi"
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

        return {
            "battery_health": {
                "actual_discharge_energy": round(actual_discharge_energy, 2),
                "optimized_multi_market_discharge_energy": round(
                    optimized_discharge_energy,
                    2,
                ),
                "actual_charge_energy": round(actual_charge_energy, 2),
                "optimized_multi_market_charge_energy": round(
                    optimized_charge_energy,
                    2,
                ),
            }
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_CYCLE_COMPARISON,
    )
    def get_cycle_comparison(
        self,
        merged_df: MergedDataFrame,
        optimized_df: OptimizedDataFrame,
        usable_capacity: AssetUsableCapacity,
        month: int,
        year: int,
        **kwargs,
    ):
        if "Power_MW" not in merged_df.columns:
            return Res.error("E-10177", http_status_code=422)
        if "Optimised_Net_MWh_Multi" not in optimized_df.columns:
            return Res.error("E-10178", http_status_code=422)

        act_discharge = merged_df[merged_df["Power_MW"] > 0]["Power_MW"].sum() * 0.5
        act_charge = abs(merged_df[merged_df["Power_MW"] < 0]["Power_MW"].sum()) * 0.5
        mm_discharge = optimized_df[optimized_df["Optimised_Net_MWh_Multi"] > 0][
            "Optimised_Net_MWh_Multi"
        ].sum()
        mm_charge = abs(
            optimized_df[optimized_df["Optimised_Net_MWh_Multi"] < 0][
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
                act_cyc, mm_cyc = (
                    act_discharge / usable_capacity,
                    mm_discharge / usable_capacity,
                )
            elif method == "full-equivalent":
                act_cyc, mm_cyc = (
                    (act_discharge + act_charge) / 2 / usable_capacity,
                    (mm_discharge + mm_charge) / 2 / usable_capacity,
                )
            else:
                act_cyc, mm_cyc = (
                    (act_discharge + act_charge) / (2 * usable_capacity),
                    (mm_discharge + mm_charge) / (2 * usable_capacity),
                )

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

        return {
            "cycle_comparison": results,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_STRATEGY_CYCLING_COMPARISON,
    )
    def get_strategy_cycling_comparison(
        self,
        merged_df: MergedDataFrame,
        optimized_df: OptimizedDataFrame,
        usable_capacity: AssetUsableCapacity,
        month: int,
        year: int,
        cycle_method: Literal["discharge-only", "full-equivalent", "throughput-based"],
        **kwargs,
    ):
        strategies = [
            {"name": "actual", "col": "Power_MW", "is_opt": False},
            {"name": "epex_daily", "col": "Optimised_Net_MWh_Daily", "is_opt": True},
            {"name": "epex_efa", "col": "Optimised_Net_MWh_EFA", "is_opt": True},
            {"name": "multi", "col": "Optimised_Net_MWh_Multi", "is_opt": True},
        ]

        results, days = [], calendar.monthrange(year, month)[1]
        for s in strategies:
            df = merged_df if not s["is_opt"] else optimized_df
            discharge = df[df[s["col"]] > 0][s["col"]].sum() * (
                0.5 if not s["is_opt"] else 1
            )
            charge = abs(df[df[s["col"]] < 0][s["col"]].sum()) * (
                0.5 if not s["is_opt"] else 1
            )

            if cycle_method == "discharge-only":
                total = discharge / usable_capacity
            elif cycle_method == "full-equivalent":
                total = (discharge + charge) / 2 / usable_capacity
            else:
                total = (discharge + charge) / (2 * usable_capacity)

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
        return {
            "strategy_cycling_comparison": results,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_ANNUAL_PROJECTION_REPORT,
    )
    def get_annual_projection_report(
        self,
        merged_df: MergedDataFrame,
        optimized_df: OptimizedDataFrame,
        usable_capacity: AssetUsableCapacity,
        month: int,
        year: int,
        cycle_method: Literal["discharge-only", "full-equivalent", "throughput-based"],
        **kwargs,
    ):
        strategy_data = self.get_strategy_cycling_comparison(
            merged_df=merged_df,
            optimized_df=optimized_df,
            usable_capacity=usable_capacity,
            month=month,
            year=year,
            cycle_method=cycle_method,
        )

        strategy_rows = strategy_data.get("strategy_cycling_comparison", [])
        if not strategy_rows:
            raise ExceptionWithErrorCode("E-10186")

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
                    "strategy": STRATEGY_KEY_MAP.get(row["strategy"], row["strategy"]),
                    "projected_annual_cycles": round(projected_annual_cycles, 2),
                    "projected_annual_degradation": round(
                        projected_annual_degradation, 4
                    ),
                    "estimated_battery_lifespan": estimated_battery_lifespan,
                }
            )

        return {
            "cycle_method": cycle_method,
            "annual_degradation_limit": annual_degradation_limit,
            "warranty_limit": warranty_limit,
            "degradation_per_cycle": round(degradation_per_cycle, 6),
            "annual_projection_report": annual_projection_report,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_DAILY_CYCLES,
    )
    def get_daily_cycles(
        self,
        merged_df: MergedDataFrame,
        optimized_df: OptimizedDataFrame,
        usable_capacity: AssetUsableCapacity,
        cycle_method: Literal["discharge-only", "full-equivalent", "throughput-based"],
        **kwargs,
    ):
        merged_df = merged_df.copy()
        optimized_df = optimized_df.copy()

        merged_df = merged_df.reset_index()
        if "Power_MW" not in merged_df.columns:
            return Res.error("E-10177", http_status_code=422)
        if "Optimised_Net_MWh_Multi" not in optimized_df.columns:
            return Res.error("E-10178", http_status_code=422)

        # Parse timestamps
        merged_df["Timestamp"] = pd.to_datetime(merged_df["Timestamp"], errors="coerce")
        optimized_df["Timestamp"] = pd.to_datetime(
            optimized_df["Timestamp"], errors="coerce"
        )

        merged_df = merged_df.dropna(subset=["Timestamp"])
        optimized_df = optimized_df.dropna(subset=["Timestamp"])

        # Fill missing energy values with 0
        merged_df["Power_MW"] = pd.to_numeric(
            merged_df["Power_MW"], errors="coerce"
        ).fillna(0)
        optimized_df["Optimised_Net_MWh_Multi"] = pd.to_numeric(
            optimized_df["Optimised_Net_MWh_Multi"], errors="coerce"
        ).fillna(0)

        # Actual interval energy: Power_MW × 0.5 (30-min intervals)
        merged_df["interval_energy"] = merged_df["Power_MW"] * 0.5
        # Multi-market energy: use directly (already MWh)
        optimized_df["interval_energy"] = optimized_df["Optimised_Net_MWh_Multi"]

        # Group by date
        merged_df["date"] = merged_df["Timestamp"].dt.date
        optimized_df["date"] = optimized_df["Timestamp"].dt.date

        def calc_daily_cycles(group_energy, method, capacity):
            discharge = group_energy[group_energy > 0].sum()
            charge = group_energy[group_energy < 0].abs().sum()
            if method == "discharge-only":
                return discharge / capacity
            else:  # full-equivalent and throughput-based are identical
                return (discharge + charge) / (2 * capacity)

        # Calculate daily cycles per date
        agg_grouped = merged_df.groupby("date")["interval_energy"]
        opt_grouped = optimized_df.groupby("date")["interval_energy"]

        all_dates = sorted(
            set(merged_df["date"].unique()) | set(optimized_df["date"].unique())
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

            actual_dc = calc_daily_cycles(actual_energy, cycle_method, usable_capacity)
            multi_dc = calc_daily_cycles(multi_energy, cycle_method, usable_capacity)

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

        return {
            "warranty_limit": warranty_limit,
            "actual": summary(actual_cycles_list, all_dates),
            "multi_market": summary(multi_cycles_list, all_dates),
            "daily_cycles": daily_cycles,
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.BATTERY_HEALTH,
        widget=AnalysisWidget.ANALYSIS_BATTERY_HEALTH_WARRANTY_EXCEEDANCE,
    )
    def get_warranty_limit_exceedance(
        self,
        usable_capacity: AssetUsableCapacity,
        merged_df: MergedDataFrame,
        optimized_df: OptimizedDataFrame,
        cycle_method: Literal["discharge-only", "full-equivalent", "throughput-based"],
        **kwargs,
    ):
        daily_cycles_result = self.get_daily_cycles(
            merged_df=merged_df,
            optimized_df=optimized_df,
            usable_capacity=usable_capacity,
            cycle_method=cycle_method,
        )

        daily_cycles = daily_cycles_result.get("daily_cycles", [])
        warranty_limit = daily_cycles_result.get("warranty_limit", 1.5)

        actual_exceedance = []
        multi_market_exceedance = []

        for row in daily_cycles:
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

        return {
            "warranty_limit": warranty_limit,
            "warranty_exceedance": {
                "actual": actual_exceedance,
                "multi_market": multi_market_exceedance,
            },
        }

    @analytics_meta(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_MONTHLY_REVENUE_COMPARISON,
    )
    def get_monthly_revenue_comparison(
        self,
        yearly_merged_df: YearlyMergedDataFrame,
        yearly_optimized_df: YearlyOptimizedDataFrame,
        hardcoded_map: YearlyHardcodedMetricValues,
        **kwargs,
    ):
        monthly_revenue_comparison = []
        available_month = list(yearly_merged_df.root.keys())
        available_month.sort()

        for month in available_month:
            merged_df = yearly_merged_df.root[month].copy()

            optimized_df = None
            if yearly_optimized_df is not None and month in yearly_optimized_df.root:
                optimized_df = yearly_optimized_df.root[month].copy()

            if merged_df is None or merged_df.empty:
                continue  # Skip months with no data

            # Revenue stream calculations from merged dataset
            sffr_revenue = float(merged_df["sffr revenues"].sum())
            epex_revenue = float(
                merged_df["epex da revenues"].sum()
                + merged_df["epex 30 da revenue"].sum()
            )
            ida1_revenue = float(merged_df["ida1 revenue"].sum())
            idc_revenue = float(merged_df["idc revenue"].sum())
            imbalance_net = float(
                merged_df["imbalance revenue"].sum()
                - merged_df["imbalance charge"].sum()
            )

            # Raw actual revenue = sum of all market streams
            raw_actual = (
                sffr_revenue + epex_revenue + ida1_revenue + idc_revenue + imbalance_net
            )

            # Apply 5% GridBeyond share adjustment
            actual_revenue = raw_actual * 0.95
            imbalance = imbalance_net * 0.95

            def get_hardcoded_metric_values_from_map(month: int, metric_id: int):
                month_values = hardcoded_map.root.get(month, {})
                return month_values.get(metric_id, None)

            # Settings values
            capacity_market = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.CAPACITY_MARKET.value
            )
            duos_credit = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.DUOS_CREDIT.value
            )
            duos_fixed = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.DUOS_FIXED_CHARGES.value
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

            optimal_revenue = None
            if (
                optimized_df is not None
                and "optimised_revenue_multi" in optimized_df.columns
            ):
                optimal_revenue = (
                    float(optimized_df["optimised_revenue_multi"].sum()) * 0.95
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

            monthly_revenue_comparison.append(
                {
                    "month": month,
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
        return {"monthly_comparison": monthly_revenue_comparison}

    @analytics_meta(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_REVENUE_BY_STREAM,
    )
    def get_revenue_by_stream_analysis(
        self,
        yearly_merged_df: YearlyMergedDataFrame,
        hardcoded_map: YearlyHardcodedMetricValues,
        year: int,
        **kwargs,
    ):
        monthly_stream_comparision = []
        available_month = list(yearly_merged_df.root.keys())
        available_month.sort()

        def get_hardcoded_metric_values_from_map(month: int, metric_id: int):
            month_values = hardcoded_map.root.get(month, {})
            return month_values.get(metric_id, None)

        for month in available_month:

            df = yearly_merged_df.root[month].copy()

            required_cols = [
                "sffr revenues",
                "epex 30 da revenue",
                "epex da revenues",
                "ida1 revenue",
                "idc revenue",
                "imbalance revenue",
                "imbalance charge",
            ]

            missing = [c for c in required_cols if c not in df.columns]
            if missing:
                return Res.error(
                    "E-10218",
                    message=f"Missing required columns: {', '.join(missing)}",
                    http_status_code=422,
                )

            for col in required_cols:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

            sffr_m = float(df["sffr revenues"].sum()) * 0.95

            epex_m = (
                float(df["epex 30 da revenue"].sum())
                + float(df["epex da revenues"].sum())
            ) * 0.95

            ida1_m = float(df["ida1 revenue"].sum()) * 0.95

            idc_m = float(df["idc revenue"].sum()) * 0.95

            imbalance_m = (
                float(df["imbalance revenue"].sum())
                - float(df["imbalance charge"].sum())
            ) * 0.95

            asset_sub_total_m = sffr_m + epex_m + ida1_m + idc_m + imbalance_m

            capacity_market = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.CAPACITY_MARKET.value
            )
            duos_credit = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.DUOS_CREDIT.value
            )
            duos_fixed = get_hardcoded_metric_values_from_map(
                month, AssetMetrics.DUOS_FIXED_CHARGES.value
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

            monthly_stream_comparision.append(
                {
                    "month": int(month),
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

        return {
            "monthly_comparison": monthly_stream_comparision,
        }

    @analytics_meta(
        module=AnalysisModules.EXECUTIVE_ANALYSIS,
        section=AnalysisSections.EXECUTIVE_SUMMARY,
        widget=AnalysisWidget.EXECUTIVE_SUMMARY,
    )
    def get_executive_summary(
        self,
        yearly_merged_df: YearlyMergedDataFrame,
        yearly_optimized_df: YearlyOptimizedDataFrame,
        hardcoded_map: YearlyHardcodedMetricValues,
        **kwargs,
    ):
        monthly_comparison_data = self.get_monthly_revenue_comparison(
            yearly_merged_df=yearly_merged_df,
            yearly_optimized_df=yearly_optimized_df,
            hardcoded_map=hardcoded_map,
        )

        monthly_comparison = monthly_comparison_data["monthly_comparison"]

        valid_months = [
            m for m in monthly_comparison if m.get("capture_rate") is not None
        ]

        if not valid_months or len(valid_months) < 2:
            return {
                "strongest_month": None,
                "weakest_month": None,
            }

        strongest_month = max(valid_months, key=lambda x: x["capture_rate"])
        weakest_month = min(valid_months, key=lambda x: x["capture_rate"])

        return {
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
        }

    @analytics_meta(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.REVENUE_IAR_VS_ACTUAL,
        widget=AnalysisWidget.BENCHMARK_REVENUE_IAR_VS_ACTUAL,
    )
    def get_revenue_iar_vs_actual(
        self,
        merged_master_dataframes: YearlyMergedDataFrame,
        iar_master_datagrame: IARDataFrame,
        settings_year_map: YearlyHardcodedMetricValues,
        year: int,
        **kwargs,
    ):
        merged_df = merged_master_dataframes
        available_months = merged_master_dataframes.root.keys()
        iar_df = iar_master_datagrame.master_dataframe

        if iar_df is None or iar_df.empty:
            raise ExceptionWithErrorCode(
                "E-10147", message="Required IAR columns are missing"
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

        for m in available_months:
            days_in_month = get_days_in_month(month=m, year=year)
            filtered_actual_df = merged_df.root[m]

            if filtered_actual_df.empty:
                continue

            actual_col_map = {
                col.lower().strip(): col for col in filtered_actual_df.columns
            }
            settings_map = settings_year_map.root.get(m, {})

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

                    if not matching_rows.empty and target_date in matching_rows.columns:
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
        return {
            "monthly_data": monthly_data_payload,
        }

    @analytics_meta(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.OPTIMIZED_VS_ACTUAL,
        widget=AnalysisWidget.BENCHMARK_MULTI_MARKET_OPTIMIZED_VS_ACTUAL,
    )
    def get_multi_market_optimized_vs_actual(
        self,
        master_merged_dataframe: YearlyMergedDataFrame,
        master_optimized_dataframe: YearlyOptimizedDataFrame,
        year: int,
        **kwargs,
    ):
        merged_df = master_merged_dataframe
        optimized_df = master_optimized_dataframe

        months = master_merged_dataframe.root.keys()
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
            c
            for c in required_merged_cols
            if c not in merged_df.root[next(iter(months))].columns
        ]

        if missing_merged:
            return Res.error(
                "E-10155",
                message=f"Missing merged columns: {missing_merged}",
                http_status_code=422,
            )

        missing_optimized = [
            c
            for c in required_optimized_cols
            if c not in optimized_df.root[next(iter(months))].columns
        ]

        if missing_optimized:
            return Res.error(
                "E-10156",
                message=f"Missing optimized columns: {missing_optimized}",
                http_status_code=422,
            )
        monthly_data_payload = {}

        for m in months:
            merged_month_df = merged_df.root[m].copy()
            optimized_month_df = optimized_df.root[m].copy()

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
                revenue = pd.to_numeric(row["optimised_revenue_multi"], errors="coerce")
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

        return {
            "monthly_data": monthly_data_payload,
        }

    @analytics_meta(
        module=AnalysisModules.BENCHMARK_ANALYSIS,
        section=AnalysisSections.REVENUE_VS_BENCHMARK,
        widget=AnalysisWidget.BENCHMARK_REVENUE_COMPARISON,
    )
    def get_benchmark_analysis(
        self,
        year: int,
        usabled_capacity: AssetUsableCapacity,
        iar_master_dataframe: IARDataFrame,
        merged_master_dataframe: YearlyMergedDataFrame,
        hardcoded_yearly_values: YearlyHardcodedMetricValues,
        modo_benchmark_industry_config: ModoIndustryConfig,
        **kwargs,
    ):
        def extract_iar_value(
            iar_master_dataframe: IARDataFrame, month: int, year: int
        ) -> float:
            try:
                df_clean = iar_master_dataframe.master_dataframe

                if df_clean is None:
                    return 0.0

                target_label = (
                    "Total BESS Revenues incl. DUoS Fixed Charges (£/MW/month)"
                )
                target_date = datetime(year, month, 1)

                row_mask = df_clean["Row_Label"].str.lower() == target_label.lower()
                row_data = df_clean[row_mask]

                if not row_data.empty and target_date in row_data.columns:
                    val = row_data[target_date].iloc[0]
                    return float(val) if pd.notna(val) else 0.0

                return 0.0
            except Exception:
                return 0.0

        # global variables for the analysis
        avaiable_months = list(merged_master_dataframe.root.keys())
        avaiable_months.sort()
        yealy_merged_df = merged_master_dataframe
        benchmarks = []

        def get_hardcoded_metric_values_from_map(month: int, metric_id: int):
            month_values = hardcoded_yearly_values.root.get(month, {})
            return month_values.get(metric_id, 0.0)

        for m in avaiable_months:
            merged_df = yealy_merged_df.root[m].copy()

            # ====================== FR1: Extract Revenue Components =====================================
            sffr_revenue = float(merged_df["sffr revenues"].sum())
            epex_revenue = float(
                merged_df["epex da revenues"].sum()
                + merged_df["epex 30 da revenue"].sum()
            )
            ida1_revenue = float(merged_df["ida1 revenue"].sum())
            idc_revenue = float(merged_df["idc revenue"].sum())
            imbalance_net = float(
                merged_df["imbalance revenue"].sum()
                - merged_df["imbalance charge"].sum()
            )

            # ====================== FR2: Calculate GridBeyond Gross =====================================
            gb_gross = (
                sffr_revenue + epex_revenue + ida1_revenue + idc_revenue + imbalance_net
            )

            # ====================== FR3: Apply GridBeyond Commission (5%) ===============================
            gb_net = gb_gross * 0.95

            # ====================== FR4: Extract Hardcoded Values  =======================================
            capacity_market = get_hardcoded_metric_values_from_map(
                m, AssetMetrics.CAPACITY_MARKET.value
            )
            duos_credit = get_hardcoded_metric_values_from_map(
                m, AssetMetrics.DUOS_CREDIT.value
            )
            duos_fixed = get_hardcoded_metric_values_from_map(
                m, AssetMetrics.DUOS_FIXED_CHARGES.value
            )

            # ======================= FR5: Calculate Total Monthly Revenue ===============================
            total_revenue = gb_net + capacity_market + duos_credit - duos_fixed

            # ======================= FR6: Convert to Daily Revenue ===============================
            daily_revenue = total_revenue / get_days_in_month(month=m, year=year)

            # ======================= FR7: Annualize Revenue ===============================
            annual_revenue = daily_revenue * 365

            # ======================= FR8: Normalize per MW ===============================
            annual_per_mw = annual_revenue / usabled_capacity

            # ======================= FR9: Convert to Standardized Monthly ===============================
            actual_monthly = annual_per_mw * (30.4 / 365)

            # ======================= FR10: Modo Benchmark Conversion ===============================
            modo_value = get_hardcoded_metric_values_from_map(
                m, AssetMetrics.MODO_BENCHMARK.value
            )

            # ======================= FR11: IAR Calculation ===============================
            iar_value = extract_iar_value(iar_master_dataframe, month=m, year=year)

            # ======================= FR12: Variance Calculation ===============================
            actual_modo_diff = round(actual_monthly - modo_value, 2)
            actual_vs_modo_variance = (
                round(actual_modo_diff / modo_value * 100, 2)
                if modo_value != 0
                else None
            )

            actual_iar_diff = round(actual_monthly - iar_value, 2)
            actual_vs_iar_variance = (
                round(actual_iar_diff / iar_value * 100, 2) if iar_value != 0 else None
            )

            # ======================= FR13: Compile Benchmark Data ===============================
            benchmarks.append(
                {
                    "month": m,
                    "year": year,
                    "actual": {
                        "metric_id": AssetMetrics.ASSET_REVENUE.value,
                        "value": round(actual_monthly, 2),
                        "industry_low": 0,
                        "industry_mid": 0,
                        "industry_high": 0,
                    },
                    "modo": {
                        "metric_id": AssetMetrics.MODO_BENCHMARK.value,
                        "value": round(modo_value, 2),
                        "industry_low": modo_benchmark_industry_config.low,
                        "industry_mid": modo_benchmark_industry_config.mid,
                        "industry_high": modo_benchmark_industry_config.high,
                        "variance_modo": actual_vs_modo_variance,
                    },
                    "iar": {
                        "metric_id": AssetMetrics.IAR_PROJECTION.value,
                        "value": round(iar_value, 2),
                        "industry_low": 0,
                        "industry_mid": 0,
                        "industry_high": 0,
                        "variance_iar": actual_vs_iar_variance,
                    },
                }
            )
        return {"benchmarks": benchmarks}

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.TB_SPREAD,
        widget=AnalysisWidget.ANALYSIS_TB_SPREAD_SUMMARY,
    )
    def get_tb_spread_summary(
        self,
        merged_df: MergedDataFrame,
        usable_capacity: AssetUsableCapacity,
        tb_spread_benchmark: TBSpreadBenchmark,
        **kwargs,
    ):
        if isinstance(merged_df, pd.DataFrame):
            merged_df = merged_df.reset_index()

        if "Timestamp" not in merged_df.columns:
            raise ExceptionWithErrorCode("E-10163")

        if "Day Ahead Price (EPEX)" not in merged_df.columns:
            raise ExceptionWithErrorCode("E-10191")

        revenue_cols = [
            "EPEX DA Revenues",
            "EPEX 30 DA Revenue",
            "IDA1 Revenue",
            "IDC Revenue",
        ]

        missing_revenue_cols = [
            col for col in revenue_cols if col not in merged_df.columns
        ]

        if missing_revenue_cols:
            raise ExceptionWithErrorCode("E-10192")
        merged_df["Timestamp"] = pd.to_datetime(merged_df["Timestamp"])

        merged_df["date"] = merged_df["Timestamp"].dt.date
        merged_df["hour"] = merged_df["Timestamp"].dt.hour

        hourly_df = (
            merged_df.groupby(["date", "hour"])["Day Ahead Price (EPEX)"]
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
            merged_df["EPEX DA Revenues"].sum()
            + merged_df["EPEX 30 DA Revenue"].sum()
            + merged_df["IDA1 Revenue"].sum()
            + merged_df["IDC Revenue"].sum()
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

        benchmark_gap = (
            round(tb2_capture_rate - tb_spread_benchmark, 2)
            if tb_spread_benchmark is not None
            else None
        )

        return {
            "avg_tb1": round(avg_tb1, 2),
            "avg_tb2": round(avg_tb2, 2),
            "avg_tb3": round(avg_tb3, 2),
            "avg_arbitrage_revenue": round(avg_arbitrage_revenue, 2),
            "tb2_capture_rate": round(tb2_capture_rate, 2),
            "tb_spread_benchmark": (
                round(tb_spread_benchmark, 2)
                if tb_spread_benchmark is not None
                else None
            ),
            "benchmark_gap": (
                round(benchmark_gap, 2) if benchmark_gap is not None else None
            ),
        }

    @analytics_meta(
        module=AnalysisModules.ASSET_ANALYSIS,
        section=AnalysisSections.TB_SPREAD,
        widget=AnalysisWidget.ANALYSIS_TB_SPREAD_DETAILS,
    )
    def get_tb_spread_details(
        self,
        merged_df: MergedDataFrame,
        tb_spread_benchmark: TBSpreadBenchmark,
        **kwargs,
    ):
        if isinstance(merged_df, pd.DataFrame):
            merged_df = merged_df.reset_index()

        if "Timestamp" not in merged_df.columns:
            return Res.error(
                "E-10163",
                message="Missing required column: Timestamp",
                http_status_code=422,
            )

        if "Day Ahead Price (EPEX)" not in merged_df.columns:
            return Res.error(
                "E-10191",
                message="Missing required column: Day Ahead Price (EPEX)",
                http_status_code=422,
            )

        revenue_cols = [
            "EPEX DA Revenues",
            "EPEX 30 DA Revenue",
            "IDA1 Revenue",
            "IDC Revenue",
        ]

        missing_revenue_cols = [
            col for col in revenue_cols if col not in merged_df.columns
        ]

        if missing_revenue_cols:
            return Res.error(
                "E-10192",
                message=f"Missing required revenue columns: {', '.join(missing_revenue_cols)}",
                http_status_code=422,
            )

        merged_df["Timestamp"] = pd.to_datetime(merged_df["Timestamp"])
        merged_df["date"] = merged_df["Timestamp"].dt.date
        merged_df["hour"] = merged_df["Timestamp"].dt.hour

        hourly_df = (
            merged_df.groupby(["date", "hour"])["Day Ahead Price (EPEX)"]
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

            day_df = merged_df[merged_df["date"] == date]
            if day_df.empty:
                return Res.error(
                    "E-10198",
                    message=f"No data available for date: {date}",
                    http_status_code=422,
                )

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
            return Res.error(
                "E-10197", message="No daily rows available", http_status_code=422
            )

        return {
            "tb_spread_benchmark": (
                round(tb_spread_benchmark, 2)
                if tb_spread_benchmark is not None
                else None
            ),
            "tb_spread": daily_rows,
        }

    @analytics_meta(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.REVENUE_RECONCILIATION,
        widget=AnalysisWidget.REVENUE_RECONCILIATION_PER_STREAM_COMPARISON,
    )
    def get_revenue_reconciliation_per_stream_comparison(
        self,
        yearly_merged_df: YearlyMergedDataFrame,
        yearly_summary_statement_df: YearlySummaryStatementDataFrame,
    ):
        stream_mapping = {
            "EPEX DAM 30": {
                "merged": "epex 30 da revenue",
                "summary": "EPEX 30 DA Rev",
            },
            "EPEX DAM 60": {"merged": "epex da revenues", "summary": "EPEX DAM Rev"},
            "IDA1": {"merged": "ida1 revenue", "summary": "IDA1 Rev"},
            "IDC": {"merged": "idc revenue", "summary": "IDC Rev"},
            "Imbalance": {"merged": "imbalance revenue", "summary": "Imbalance Rev"},
            "SFFR": {"merged": "sffr revenues", "summary": "SFFR Revenue"},
            "DC": {
                "merged": ["dcl revenues", "dch revenues"],
                "summary": ["DCL revenues", "DCH revenues"],
            },
            "DR": {
                "merged": ["drl revenues", "drh revenues"],
                "summary": ["DRL revenues", "DRH revenues"],
            },
            "DM": {
                "merged": ["dml revenues", "dmh revenues"],
                "summary": ["DML revenues", "DMH revenues"],
            },
        }

        merged_file_months = set(yearly_merged_df.root.keys())
        summary_statement_df_months = set(yearly_summary_statement_df.root.keys())

        common_months = merged_file_months.intersection(summary_statement_df_months)

        if not common_months:
            raise DependencyNotAvailableError(
                "E-10100",
                message="merged file not available for any month in summary statement",
            )

        data = {}

        for month in common_months:
            merged_df = yearly_merged_df.root[month]
            summary_df = yearly_summary_statement_df.root[month]["detail"]

            stream_comparison = []

            for stream_name, stream_info in stream_mapping.items():
                merged_cols = stream_info["merged"]
                summary_cols = stream_info["summary"]

                stream_gross_revenue = 0
                stream_reported_net = 0
                if isinstance(merged_cols, list):
                    stream_gross_revenue = merged_df[merged_cols].sum().sum()
                else:
                    stream_gross_revenue = merged_df[merged_cols].sum()

                if isinstance(summary_cols, list):
                    stream_reported_net = summary_df[summary_cols].sum().sum()
                else:
                    stream_reported_net = summary_df[summary_cols].sum()

                stream_expected_net = stream_gross_revenue * 0.95
                stream_reported_net = stream_reported_net * 0.95

                stream_variance = stream_reported_net - stream_expected_net
                stream_variance_pct = (
                    (stream_variance / stream_expected_net) * 100
                    if stream_expected_net != 0
                    else 0
                )

                # to avoid situation like -0.0 
                if stream_variance_pct == 0:
                    stream_variance_pct = 0.0


                stream_comparison.append(
                    {
                        "stream_name": stream_name,
                        "stream_gross_revenue": float(stream_gross_revenue),
                        "stream_net_revenue": float(stream_expected_net),
                        "stream_reported_net": float(stream_reported_net),
                        "stream_variance": float(stream_variance),
                        "stream_variance_pct": (
                            float(stream_variance_pct)
                            if stream_variance_pct is not None
                            else 0.0
                        ),
                    }
                )

            data[str(month)] = stream_comparison

        return data

    

    @analytics_meta(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.REVENUE_RECONCILIATION,
        widget=AnalysisWidget.REVENUE_RECONCILIATION_SUMMARY,
    )
    def get_revenue_reconciliation_summary(
        self,
        yearly_merged_df: YearlyMergedDataFrame,
        yearly_summary_statement_record: YearlySummaryStatementRecords,
    ):
        merged_file_months = set(yearly_merged_df.root.keys())
        summary_statement_months = set(yearly_summary_statement_record.root.keys())

        common_months = merged_file_months.intersection(summary_statement_months)

        if not common_months:
            raise DependencyNotAvailableError(
                "E-10100",
                message="merged file not available for any month in summary statement",
            )

        data = {}

        for month in common_months:
            merged_df = yearly_merged_df.root[month]
            summary_record = yearly_summary_statement_record.root[month]

            gross_revenue = (
                merged_df["sffr revenues"].sum()
                + merged_df["epex da revenues"].sum()
                + merged_df["epex 30 da revenue"].sum()
                + merged_df["ida1 revenue"].sum()
                + merged_df["idc revenue"].sum()
                + merged_df["imbalance revenue"].sum()
                + merged_df["dcl revenues"].sum()
                + merged_df["dch revenues"].sum()
                + merged_df["dmh revenues"].sum()
                + merged_df["dml revenues"].sum()
                + merged_df["drl revenues"].sum()
                + merged_df["drh revenues"].sum()
            )

            gridbeyond_fee = gross_revenue * 0.05
            expected_net = gross_revenue - gridbeyond_fee
            reported_net = (
                summary_record.total_energy_revenue
                - summary_record.total_ancillary_revenue
            )
            variance = reported_net - expected_net

            data[str(month)] = {
                "gross_revenue": round(gross_revenue, 2),
                "gridbeyond_fee": round(gridbeyond_fee, 2),
                "expected_net": round(expected_net, 2),
                "reported_net": round(reported_net, 2),
                "variance": round(variance, 2),
            }

        return data

    @analytics_meta(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_SUMMARY,
    )
    def get_invoice_capacity_market_summary(
        self,
        yearly_pdf_invoices_records: YearlyPdfInvoicesRecords,
        yearly_invoice_settlement_records: YearlyInvoiceSettlementRecords,
    ):

        data = {}
        invoice_months = sorted(yearly_pdf_invoices_records.root.keys())
        settlement_months = sorted(yearly_invoice_settlement_records.root.keys())
        common_months = set(invoice_months).intersection(set(settlement_months))

        for month in common_months:
            invoice_record = yearly_pdf_invoices_records.root[month]

            invoice_amount = (
                invoice_record.invoice_amount
                if invoice_record.invoice_amount is not None
                else 0.0
            )

            absolute_amount = abs(invoice_amount)

            data[str(month)] = {
                "capacity_payments": round(absolute_amount, 2),
                "emr_invoices" : 1
            }

        return data

    @analytics_meta(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_PAYMENTS,
    )
    def get_capacity_market_payments(
        self,
        yearly_pdf_invoices_records: YearlyPdfInvoicesRecords,
        yearly_invoice_settlement_records: YearlyInvoiceSettlementRecords,
    ):
        invoice_months = set(yearly_pdf_invoices_records.root.keys())
        settlement_months = set(yearly_invoice_settlement_records.root.keys())        
        common_months = invoice_months.intersection(settlement_months)

        capacity_market_payments = []

        for month in common_months:
            invoice = yearly_pdf_invoices_records.root[month]
            settlement = yearly_invoice_settlement_records.root[month]

            invoice_amount = (
                invoice.invoice_amount if invoice.invoice_amount is not None else 0.0
            )
            absolute_amount = abs(invoice_amount)

            capacity_market_payments.append(
                {
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "capacity_year": settlement.year,
                    "capacity_month": settlement.month,
                    "invoice_date": (
                        invoice.invoice_date.strftime("%d %b %Y")
                        if invoice.invoice_date
                        else None
                    ),
                    "payment_date": (
                        settlement.invoice_payment_date.strftime("%d %b %Y")
                        if settlement.invoice_payment_date
                        else None
                    ),
                    "amount": invoice_amount,
                    "absolute_amount": round(absolute_amount, 2),
                }
            )
    
        return {
            "capacity_market_payments": capacity_market_payments
        }


    @analytics_meta(
        module=AnalysisModules.INVOICE_ANALYSIS,
        section=AnalysisSections.CAPACITY_MARKET,
        widget=AnalysisWidget.CAPACITY_MARKET_PAYMENT_TREND,
    )
    def get_capacity_market_payment_trend(
        self,
        yearly_pdf_invoices_records: YearlyPdfInvoicesRecords,
        yearly_invoice_settlement_records: YearlyInvoiceSettlementRecords,
    ):
        invoice_months = sorted(yearly_pdf_invoices_records.root.keys())
        settlement_months = sorted(yearly_invoice_settlement_records.root.keys())
        common_months = sorted(set(invoice_months).intersection(set(settlement_months)))

        payment_trend_data = []
        cumulative_sum = 0.0

        for month in common_months:
            invoice = yearly_pdf_invoices_records.root[month]

            invoice_amount = (
                invoice.invoice_amount if invoice.invoice_amount is not None else 0.0
            )
            absolute_amount = abs(invoice_amount)

            cumulative_sum += absolute_amount
            payment_trend_data.append(
                {
                    "month": month,
                    "monthly_payment": round(absolute_amount, 2),
                    "cumulative_payment": round(cumulative_sum, 2),
                }
            )

        return {
            "payment_trend": payment_trend_data
        }