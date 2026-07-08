from .enums import AssetMetrics
from python_common.constants.defaults import *
# JWT 
JWT_ALGORITHM = "HS256"
JWT_EXPIRY = 60*60*24
EPHEMERAL_WS_TOKEN_EXPIRY = 10

ASSET_DEGRADATION_PER_CYCLE_PERCENTAGE = 2.5 / (1.5 * 365)

CONSTRAINT_NAMES = {
    "UNIQUE_USER_EMAIL_CONSTRAINT": "uq_users_email",
}

UPLOAD_PATHS = {
    "MERGED_DATASETS": lambda asset_id: f"assets/asset-{asset_id}/merged_report/",
    "INVOICE_PATH" :"invoice-analysis/pdf-invoices/",
    "SETTLEMENT_PATH":"invoice-analysis/settlements/",

}

ASSET_METRIC_LABEL = {
    AssetMetrics.ASSET_REVENUE: "Asset Revenue (£)",
    AssetMetrics.CAPACITY_MARKET: "Capacity Market (£)",
    AssetMetrics.DUOS_CREDIT: "DUoS Credit (£)",
    AssetMetrics.DUOS_FIXED_CHARGES: "DUoS Fixed Charges (£)",
    AssetMetrics.TOTAL_REVENUE: "Total Revenue (£)",
    AssetMetrics.MODO_BENCHMARK: "Modo Benchmark (£/MW/yr)",
    AssetMetrics.REVENUE_PER_MW_PER_YEAR: "Revenue (£/MW/year)",
    AssetMetrics.DAILY_CYCLES: "Daily Cycles",
    AssetMetrics.ROUND_TRIP_EFFICIENCY: "Round-Trip Efficiency (%)",
    AssetMetrics.TB_SPREAD_REVENUE: "TB Spread Revenue Benchmark",
}

# all the metrics that are displayed for industry high low mid benchmarks
ASSET_BENCHMARK_METRICS = [
    AssetMetrics.MODO_BENCHMARK,
]

ASSET_BENCHMARK_MONTHLY_HARDCODED_METRICS = [
    AssetMetrics.MODO_BENCHMARK,
    AssetMetrics.TB_SPREAD_REVENUE,
    AssetMetrics.DUOS_FIXED_CHARGES,
    AssetMetrics.DUOS_CREDIT,
    AssetMetrics.CAPACITY_MARKET,
]