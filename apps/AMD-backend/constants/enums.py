from enum import IntEnum, StrEnum

from python_common.constants.enums import AuditLogModules, AuditLogScenario


class BaseEnum(IntEnum):
    @classmethod
    def choices(cls):
        return [(e.value, e.name.replace("_", " ").title()) for e in cls]


class UserRole(BaseEnum):
    ANALYST = 1
    ADMIN = 2
    MANAGER = 3
    SUPER_ADMIN = 4
    VIEWER = 5


class Platform(BaseEnum):
    AMD = 1
    BESS = 2


class DigestScope(BaseEnum):
    PER_ASSET = 1
    PER_ORGANIZATION = 2
    PORTFOLIO_WIDE = 3


class DigestFrequency(BaseEnum):
    DAILY = 1
    WEEKLY = 2
    MONTHLY = 3


class DigestStatus(BaseEnum):
    ACTIVE = 1
    INACTIVE = 0


class DigestResource(BaseEnum):
    ASSET = 1
    ORGANIZATION = 2
    PORTFOLIO = 3


class AssetStatus(BaseEnum):
    ACTIVE = 1
    INACTIVE = 2
    ANALYSIS_READY = 3
    DRAFT = 4
    PENDING_APPROVAL = 5


class AssetSteps(BaseEnum):
    BASIC_INFORMATION = 1
    OPTIMIZATION_CONFIGURATION = 2
    UPLOAD_AGGREGATOR_SCADA = 3
    IAR_REPORT = 4
    REVIEW = 5


class AssetType(BaseEnum):
    SOLAR = 1
    BATTERY = 2
    SOLAR_BATTERY = 3


class AssetFileType(BaseEnum):
    AGGREGATOR_REPORT = 1
    SCADA_REPORT = 2
    MERGED_SCADA_AGGREGATOR = 3
    INTERNAL_APPRAISAL_REPORT = 4
    OPTIMIZED_DATASET = 5
    SOLAR_SCADA_REPORT = 6
    SOLAR_PROCESSED_DATASET = 7


class AssetMetrics(BaseEnum):
    ASSET_REVENUE = 1
    CAPACITY_MARKET = 2
    DUOS_CREDIT = 3
    DUOS_FIXED_CHARGES = 4
    TOTAL_REVENUE = 5
    MODO_BENCHMARK = 6
    REVENUE_PER_MW_PER_YEAR = 7
    DAILY_CYCLES = 8
    ROUND_TRIP_EFFICIENCY = 9
    IAR_PROJECTION = 10
    TB_SPREAD_REVENUE = 11


class InvoiceType(BaseEnum):
    HARTREE_PV = 1
    HARTREE_BESS = 2
    EMR = 3
    GRIDBEYOND = 4
    HARTREE_BESS_POWER = 5
    HARTREE_AUXILIARY = 6
    HARTREE_SOLAR_POWER = 7
    HARTREE_OTHER = 8


class CommentContextType(BaseEnum):
    SCREEN = 1
    WIDGET = 2
    DATA_POINT = 3
    TAB = 4


class SocketEventType(StrEnum):
    AUDIT_LOG = "audit_log"
    COMMENT_NOTIFICATION = "comment_notification"


class APDAuditLogScenario(BaseEnum):
    OTP_SENT = AuditLogScenario.OTP_SENT.value
    OTP_VERIFY_FAILED = AuditLogScenario.OTP_VERIFY_FAILED.value
    OTP_VERIFY_SUCCESS = AuditLogScenario.OTP_VERIFY_SUCCESS.value
    LOGIN_SUCCESS = AuditLogScenario.LOGIN_SUCCESS.value
    LOGIN_FAILED = AuditLogScenario.LOGIN_FAILED.value
    UNAUTHORIZED_ATTEMPT = AuditLogScenario.UNAUTHORIZED_ATTEMPT.value
    SESSION_STARTED = AuditLogScenario.SESSION_STARTED.value
    SESSION_IDLE_TIMEOUT = AuditLogScenario.SESSION_IDLE_TIMEOUT.value
    SESSION_ABS_TIMEOUT = AuditLogScenario.SESSION_ABS_TIMEOUT.value
    LOGOUT = AuditLogScenario.LOGOUT.value
    ORG_ASSIGNED = AuditLogScenario.ORG_ASSIGNED.value
    ORG_REASSIGNED = AuditLogScenario.ORG_REASSIGNED.value
    ORG_CREATED = AuditLogScenario.ORG_CREATED.value
    ORG_EDITED = AuditLogScenario.ORG_EDITED.value
    ORG_INACTIVATED = AuditLogScenario.ORG_INACTIVATED.value
    ORG_ENABLED = AuditLogScenario.ORG_ENABLED.value
    ORG_UPDATED = AuditLogScenario.ORG_UPDATED.value
    ASSET_REASSIGNED = AuditLogScenario.ASSET_REASSIGNED.value
    DIGEST_CREATED = AuditLogScenario.DIGEST_CREATED.value
    DIGEST_UPDATED = AuditLogScenario.DIGEST_UPDATED.value
    DIGEST_ACTIVATED = AuditLogScenario.DIGEST_ACTIVATED.value
    DIGEST_DEACTIVATED = AuditLogScenario.DIGEST_DEACTIVATED.value
    RECIPIENTS_UPDATED = AuditLogScenario.RECIPIENTS_UPDATED.value
    ASSET_ONBOARDED = AuditLogScenario.ASSET_ONBOARDED.value
    ASSET_UPDATED = AuditLogScenario.ASSET_UPDATED.value
    ASSET_OPTIMIZATION_UPDATED = AuditLogScenario.ASSET_OPTIMIZATION_UPDATED.value
    SCADA_REPORT_UPLOADED = AuditLogScenario.SCADA_REPORT_UPLOADED.value
    SCADA_REPORT_REMOVED = AuditLogScenario.SCADA_REPORT_REMOVED.value
    DATASET_MERGED = AuditLogScenario.DATASET_MERGED.value
    AGGREGATOR_REPORT_REMOVED = AuditLogScenario.AGGREGATOR_REPORT_REMOVED.value
    BENCHMARK_CONFIGURATION_UPDATED = (
        AuditLogScenario.BENCHMARK_CONFIGURATION_UPDATED.value
    )
    INTERNAL_APPRAISAL_REPORT_REMOVED = (
        AuditLogScenario.INTERNAL_APPRAISAL_REPORT_REMOVED.value
    )
    VIEWED_ASSET_BASIC_INFORMATION = (
        AuditLogScenario.VIEWED_ASSET_BASIC_INFORMATION.value
    )
    OPTIMIZATION_PARAMETERS_CONFIRMED = (
        AuditLogScenario.OPTIMIZATION_PARAMETERS_CONFIRMED.value
    )
    AGGREGATOR_FILE_UPLOADED = AuditLogScenario.AGGREGATOR_FILE_UPLOADED.value
    AGGREGATOR_FILE_REPLACED = AuditLogScenario.AGGREGATOR_FILE_REPLACED.value
    SCADA_FILE_REPLACED = AuditLogScenario.SCADA_FILE_REPLACED.value
    OPTIMIZED_DATASET_GENERATED = AuditLogScenario.OPTIMIZED_DATASET_GENERATED.value
    MERGED_DATASET_DOWNLOADED = AuditLogScenario.MERGED_DATASET_DOWNLOADED.value
    OPTIMIZED_DATASET_DOWNLOADED = AuditLogScenario.OPTIMIZED_DATASET_DOWNLOADED.value
    VIEWED_ASSET_ANALYSIS = AuditLogScenario.VIEWED_ASSET_ANALYSIS.value
    IAR_FILE_UPLOADED = AuditLogScenario.IAR_FILE_UPLOADED.value
    IAR_FILE_REPLACED = AuditLogScenario.IAR_FILE_REPLACED.value
    VIEWED_BENCHMARK_ANALYSIS = AuditLogScenario.VIEWED_BENCHMARK_ANALYSIS.value
    ASSET_SUBMITTED_FOR_APPROVAL = AuditLogScenario.ASSET_SUBMITTED_FOR_APPROVAL.value
    VIEWED_PENDING_APPROVAL_ASSET = AuditLogScenario.VIEWED_PENDING_APPROVAL_ASSET.value
    VIEWED_ACTIVE_ASSET = AuditLogScenario.VIEWED_ACTIVE_ASSET.value
    MONTHLY_AGGREGATOR_FILE_UPLOADED = (
        AuditLogScenario.MONTHLY_AGGREGATOR_FILE_UPLOADED.value
    )
    MONTHLY_SCADA_FILE_UPLOADED = AuditLogScenario.MONTHLY_SCADA_FILE_UPLOADED.value
    MONTHLY_AGGREGATOR_FILE_REPLACED = (
        AuditLogScenario.MONTHLY_AGGREGATOR_FILE_REPLACED.value
    )
    MONTHLY_SCADA_FILE_REPLACED = AuditLogScenario.MONTHLY_SCADA_FILE_REPLACED.value
    UPDATED_IAR_FILE = AuditLogScenario.UPDATED_IAR_FILE.value
    DOWNLOADED_AGGREGATOR_FILE = AuditLogScenario.DOWNLOADED_AGGREGATOR_FILE.value
    DOWNLOADED_SCADA_FILE = AuditLogScenario.DOWNLOADED_SCADA_FILE.value
    DOWNLOADED_IAR_FILE = AuditLogScenario.DOWNLOADED_IAR_FILE.value
    VIEWED_ASSET_APPROVAL_DETAILS = AuditLogScenario.VIEWED_ASSET_APPROVAL_DETAILS.value
    ASSET_APPROVED = AuditLogScenario.ASSET_APPROVED.value
    ASSET_DISABLED = AuditLogScenario.ASSET_DISABLED.value
    ASSET_ENABLED = AuditLogScenario.ASSET_ENABLED.value
    MONTHLY_METRIC_CREATED = AuditLogScenario.MONTHLY_METRIC_CREATED.value
    MONTHLY_METRIC_UPDATED = AuditLogScenario.MONTHLY_METRIC_UPDATED.value
    MONTHLY_METRIC_CLEARED = AuditLogScenario.MONTHLY_METRIC_CLEARED.value
    INVOICE_UPLOADED = AuditLogScenario.INVOICE_UPLOADED.value
    INVOICE_DELETED = AuditLogScenario.INVOICE_DELETED.value
    SETTLEMENT_FILE_UPLOADED = AuditLogScenario.SETTLEMENT_FILE_UPLOADED.value
    SETTLEMENT_FILE_DELETED = AuditLogScenario.SETTLEMENT_FILE_DELETED.value
    INVOICE_FILE_DOWNLOADED = AuditLogScenario.INVOICE_FILE_DOWNLOADED.value
    SETTLEMENT_FILE_DOWNLOADED = AuditLogScenario.SETTLEMENT_FILE_DOWNLOADED.value
    INVOICE_PREVIEW_DOWNLOADED = AuditLogScenario.INVOICE_PREVIEW_DOWNLOADED.value
    INVOICE_ANALYSIS_VIEWED = AuditLogScenario.INVOICE_ANALYSIS_VIEWED.value
    INVOICE_ANALYSIS_DATA_DOWNLOADED = (
        AuditLogScenario.INVOICE_ANALYSIS_DATA_DOWNLOADED.value
    )
    SUMMARY_STATEMENT_UPLOADED = AuditLogScenario.SUMMARY_STATEMENT_UPLOADED.value
    SUMMARY_STATEMENT_DOWNLOADED = AuditLogScenario.SUMMARY_STATEMENT_DOWNLOADED.value
    SUMMARY_STATEMENT_DELETED = AuditLogScenario.SUMMARY_STATEMENT_DELETED.value
    ADDED_COMMENT = AuditLogScenario.ADDED_COMMENT.value
    UPDATED_COMMENT = AuditLogScenario.UPDATED_COMMENT.value
    REMOVED_COMMENT = AuditLogScenario.REMOVED_COMMENT.value
    REPLIED_TO_COMMENT = AuditLogScenario.REPLIED_TO_COMMENT.value
    VIEWED_EXECUTIVE_ANALYSIS = AuditLogScenario.VIEWED_EXECUTIVE_ANALYSIS.value
    SOLAR_SCADA_UPLOADED = AuditLogScenario.SOLAR_SCADA_UPLOADED.value
    SOLAR_SCADA_REPLACED = AuditLogScenario.SOLAR_SCADA_REPLACED.value
    SOLAR_SCADA_REMOVED = AuditLogScenario.SOLAR_SCADA_REMOVED.value
    VIEWED_SOLAR_ANALYSIS = AuditLogScenario.VIEWED_SOLAR_ANALYSIS.value
    DOWNLOADED_SOLAR_SCADA_FILE = AuditLogScenario.DOWNLOADED_SOLAR_SCADA_FILE.value


class APDAuditLogModules(BaseEnum):
    AUTHENTICATION = AuditLogModules.AUTHENTICATION.value
    USER_MANAGEMENT = AuditLogModules.USER_MANAGEMENT_AMD.value
    ASSET_MANAGEMENT_AMD = AuditLogModules.ASSET_MANAGEMENT_AMD.value
    DIGEST_MANAGEMENT_AMD = AuditLogModules.DIGEST_MANAGEMENT_AMD.value
    ORGANIZATION_MANAGEMENT_AMD = AuditLogModules.ORGANIZATION_MANAGEMENT_AMD.value
    ASSET_ONBOARDING = AuditLogModules.ASSET_ONBOARDING.value
    VIEW_ANALYSIS = AuditLogModules.VIEW_ANALYSIS.value
    BENCHMARK_ANALYSIS = AuditLogModules.BENCHMARK_ANALYSIS.value
    INVOICE_ANALYSIS = AuditLogModules.INVOICE_ANALYSIS.value
    SETTINGS = AuditLogModules.SETTINGS.value
    EXECUTIVE_ANALYSIS = AuditLogModules.EXECUTIVE_ANALYSIS.value


class AnalysisSections(StrEnum):
    # analysis section
    OPERATIONS = "operations"
    MARKET_OPTIMIZATION = "market-optimization"
    MARKET_PRICES = "market-prices"
    ANCILLARY_SERVICES = "ancillary-services"
    IMBALANCE_ANALYSIS = "imbalance-analysis"
    BATTERY_HEALTH = "battery-health"
    TB_SPREAD = "tb-spread"

    # revenue analysis section
    REVENUE_VS_BENCHMARK = "revenue-vs-benchmark"
    REVENUE_IAR_VS_ACTUAL = "revenue-iar-vs-actual"
    OPTIMIZED_VS_ACTUAL = "optimized-vs-actual"

    # invoice analysis section
    CAPACITY_MARKET = "capacity-market"
    REVENUE_RECONCILIATION = "revenue-reconciliation"

    # executive summary section
    EXECUTIVE_SUMMARY = "executive-summary"

    # solar analysis section
    SOLAR_GENERATION = "solar-generation"
    SOLAR_WEATHER = "solar-weather"


class AnalysisModules:
    ASSET_ANALYSIS = "view-analysis"
    BENCHMARK_ANALYSIS = "benchmark-analysis"
    INVOICE_ANALYSIS = "invoice-analysis"
    EXECUTIVE_ANALYSIS = "executive-analysis"
    SOLAR_ANALYSIS = "solar-analysis"


class AnalysisWidget(StrEnum):
    # ================= #
    #  asset analysis   #
    # ================= #

    # Operations
    ANALYSIS_OPERATIONS_SUMMARY = "analysis-operations-summary"
    ANALYSIS_OPERATIONS_MARKET_SUMMARY = "analysis-operations-market-summary"
    ANALYSIS_OPERATIONS_ENERGY_PRICE = "analysis-operations-energy-price"
    ANALYSIS_OPERATIONS_BATTERY_POWER_OVER_TIME = (
        "analysis-operations-battery-power-over-time"
    )

    # Market Optimization
    ANALYSIS_MARKET_SUMMARY = "analysis-market-summary"
    ANALYSIS_MARKET_UTILIZATION = "analysis-market-utilization"
    ANALYSIS_MARKET_STATISTICS = "analysis-market-statistics"
    ANALYSIS_MARKET_REVENUE_DISTRIBUTION = "analysis-market-revenue-distribution"
    ANALYSIS_MARKET_BEST_MARKETS = "analysis-market-best-markets"

    # Market Prices
    ANALYSIS_MARKET_PRICE_SPREAD = "analysis-market-price-spread"
    ANALYSIS_MARKET_PRICE_VOLATILITY = "analysis-market-price-volatility"
    ANALYSIS_MARKET_HOURLY_PRICE_PATTERNS = "analysis-market-hourly-price-patterns"
    ANALYSIS_MARKET_PRICE_CORRELATION_MATRIX = (
        "analysis-market-price-correlation-matrix"
    )

    # Ancillary Services
    ANALYSIS_ANCILLARY_SUMMARY = "analysis-ancillary-summary"
    ANALYSIS_ANCILLARY_REVENUE_BREAKDOWN = "analysis-ancillary-revenue-breakdown"
    ANALYSIS_ANCILLARY_SERVICE_REVENUE_BY_HOUR = (
        "analysis-ancillary-service-revenue-by-hour"
    )
    ANALYSIS_ANCILLARY_OPPORTUNITY_COST_ANALYSIS = (
        "analysis-ancillary-opportunity-cost-analysis"
    )

    # Imbalance Analysis
    ANALYSIS_IMBALANCE_SUMMARY = "analysis-imbalance-summary"
    ANALYSIS_IMBALANCE_HOURLY_CHARGES = "analysis-imbalance-hourly-charges"
    ANALYSIS_IMBALANCE_DAILY_BREAKDOWN = "analysis-imbalance-daily-breakdown"
    ANALYSIS_IMBALANCE_WORST_DAYS = "analysis-imbalance-worst-days"

    # Battery Health
    ANALYSIS_BATTERY_HEALTH_SUMMARY = "analysis-battery-health-summary"
    ANALYSIS_BATTERY_HEALTH_CYCLE_COMPARISON = (
        "analysis-battery-health-cycle-comparison"
    )
    ANALYSIS_BATTERY_HEALTH_STRATEGY_CYCLING_COMPARISON = (
        "analysis-battery-health-strategy-cycling-comparison"
    )
    ANALYSIS_BATTERY_HEALTH_ANNUAL_PROJECTION_REPORT = (
        "analysis-battery-health-annual-projection-report"
    )
    ANALYSIS_BATTERY_HEALTH_DAILY_CYCLES = "analysis-battery-health-daily-cycles"
    ANALYSIS_BATTERY_HEALTH_WARRANTY_EXCEEDANCE = (
        "analysis-battery-health-warranty-exceedance"
    )

    # TB Spread
    ANALYSIS_TB_SPREAD_SUMMARY = "analysis-tb-spread-summary"
    ANALYSIS_TB_SPREAD_DETAILS = "analysis-tb-spread-details"

    # ======================= #
    #  Executive Comparison   #
    # ======================= #
    EXECUTIVE_MONTHLY_REVENUE_COMPARISON = (
        "analysis-executive-monthly-revenue-comparison"
    )
    EXECUTIVE_REVENUE_BY_STREAM = "analysis-executive-revenue-by-stream"
    EXECUTIVE_SUMMARY = "analysis-executive-summary"

    # ======================= #
    #  Benchmark Analysis     #
    # ======================= #
    BENCHMARK_REVENUE_COMPARISON = "analysis-benchmark-revenue-comparison"
    BENCHMARK_REVENUE_IAR_VS_ACTUAL = "analysis-benchmark-revenue-iar-vs-actual"
    BENCHMARK_MULTI_MARKET_OPTIMIZED_VS_ACTUAL = "analysis-benchmark-multi-market-optimized-vs-actual"

    # ================== #
    #  Invoice Analysis  #
    # ================== # 
    CAPACITY_MARKET_SUMMARY = "analysis-capacity-market-summary"
    CAPACITY_MARKET_PAYMENT_TREND = "analysis-capacity-market-payment-trend"
    CAPACITY_MARKET_PAYMENTS = "analysis-capacity-market-payments"

    REVENUE_RECONCILIATION_PER_STREAM_COMPARISON = "analysis-revenue-reconciliation-per-stream-comparison"
    REVENUE_RECONCILIATION_SUMMARY = "analysis-revenue-reconciliation-summary"

    # ================== #
    #  Solar Analysis    #
    # ================== #
    ANALYSIS_SOLAR_KPI_VITALS = "analysis-solar-kpi-vitals"
    ANALYSIS_SOLAR_GENERATION_SPLIT = "analysis-solar-generation-split"
    ANALYSIS_SOLAR_DAILY_TREND = "analysis-solar-daily-trend"
    ANALYSIS_SOLAR_IRRADIANCE_TREND = "analysis-solar-irradiance-trend"
