export * from '@lazarus/react-common/constants/enums';
import { AuditLogModules, AuditLogScenario } from '@lazarus/react-common/constants/enums';

// Asset Types: 1 = Solar, 2 = Battery, 3 = Solar-Battery
export enum AssetType {
  Solar = 1,
  BESS = 2,
  'Solar + BESS' = 3,
}

export enum AssetStatus {
  Active = 1,
  Inactive = 2,
  AnalysisReady = 3,
  Draft = 4,
  PendingApproval = 5,
}


export enum AssetSteps {
  BasicInformation = 1,
  OptimizationConfiguration = 2,
  AggregatorScada = 3,
  IAR = 4,
  Review = 5,
}

export enum AssetMetrics {
  AssetRevenue = 1,
  CapacityMarket = 2,
  DuosCredit = 3,
  DuosFixedCharges = 4,
  TotalRevenue = 5,
  ModoBenchmark = 6,
  RevenuePerMwPerYear = 7,
  DailyCycles = 8,
  RoundTripEfficiency = 9,
  IarProjection = 10,
  TbSpreadRevenue = 11,
}

export enum AssetFileType {
  AggregatorReport = 1,
  ScadaReport = 2,
  MergedDataset = 3,
  IAR = 4,
  OptimizedDataset = 5,
  SolarDataset = 6,
}

export enum AssetMarketUtilizationTypes {
  EPEX_ONLY_DAILY = 1,
  EPEX_ONLY_EFA = 2,
  ACTUAL = 3,
  MULTI_MARKET = 4,
}

export enum RevenueStreamType {
  WholesaleDayAhead = "Wholesale Day Ahead",
  WholesaleIntraday = "Wholesale Intraday",
  BalancingMechanism = "Balancing Mechanism",
  FrequencyResponse = "Frequency Response",
  CapacityMarket = "Capacity Market",
  DUoSBattery = "DUoS Battery",
  DUoSFixedCharges = "DUoS Fixed Charges",
  TNUoS = "TNUoS",
  ImbalanceRevenue = "Imbalance Revenue",
  ImbalanceCharge = "Imbalance Charge",
}

export enum APDAuditLogModules {
  AUTHENTICATION = AuditLogModules.AUTHENTICATION,
  USER_MANAGEMENT = AuditLogModules.USER_MANAGEMENT_AMD,
  ASSET_MANAGEMENT_AMD = AuditLogModules.ASSET_MANAGEMENT_AMD,
  DIGEST_MANAGEMENT_AMD = AuditLogModules.DIGEST_MANAGEMENT_AMD,
  ORGANIZATION_MANAGEMENT_AMD = AuditLogModules.ORGANIZATION_MANAGEMENT_AMD,
  BENCHMARK_CONFIGURATION = AuditLogModules.BENCHMARK_CONFIGURATION,
  MONTHLY_VALUE_MANAGEMENT_AMD = AuditLogModules.MONTHLY_VALUE_MANAGEMENT_AMD,
  ASSET_ONBOARDING = AuditLogModules.ASSET_ONBOARDING,
  ASSET_ANALYSIS = AuditLogModules.ASSET_ANALYSIS,
  BENCHMARK_ANALYSIS = AuditLogModules.BENCHMARK_ANALYSIS,
  FILE_HISTORY = AuditLogModules.FILE_HISTORY,
  INVOICE=AuditLogModules.INVOICE
}

export enum APDAuditLogScenario {
  OTP_SENT = AuditLogScenario.OTP_SENT,
  OTP_VERIFY_FAILED = AuditLogScenario.OTP_VERIFY_FAILED,
  OTP_VERIFY_SUCCESS = AuditLogScenario.OTP_VERIFY_SUCCESS,
  LOGIN_SUCCESS = AuditLogScenario.LOGIN_SUCCESS,
  LOGIN_FAILED = AuditLogScenario.LOGIN_FAILED,
  UNAUTHORIZED_ATTEMPT = AuditLogScenario.UNAUTHORIZED_ATTEMPT,
  SESSION_STARTED = AuditLogScenario.SESSION_STARTED,
  SESSION_IDLE_TIMEOUT = AuditLogScenario.SESSION_IDLE_TIMEOUT,
  SESSION_ABS_TIMEOUT = AuditLogScenario.SESSION_ABS_TIMEOUT,
  LOGOUT = AuditLogScenario.LOGOUT,
  ORG_ASSIGNED = AuditLogScenario.ORG_ASSIGNED,
  ORG_REASSIGNED = AuditLogScenario.ORG_REASSIGNED,
  ORG_CREATED = AuditLogScenario.ORG_CREATED,
  ORG_EDITED = AuditLogScenario.ORG_EDITED,
  ORG_INACTIVATED = AuditLogScenario.ORG_INACTIVATED,
  ORG_ENABLED = AuditLogScenario.ORG_ENABLED,
  ORG_UPDATED = AuditLogScenario.ORG_UPDATED,
  ASSET_REASSIGNED = AuditLogScenario.ASSET_REASSIGNED,
  DIGEST_CREATED = AuditLogScenario.DIGEST_CREATED,
  DIGEST_UPDATED = AuditLogScenario.DIGEST_UPDATED,
  DIGEST_ACTIVATED = AuditLogScenario.DIGEST_ACTIVATED,
  DIGEST_DEACTIVATED = AuditLogScenario.DIGEST_DEACTIVATED,
  RECIPIENTS_UPDATED = AuditLogScenario.RECIPIENTS_UPDATED,
  ASSET_ONBOARDED = AuditLogScenario.ASSET_ONBOARDED,
  ASSET_UPDATED = AuditLogScenario.ASSET_UPDATED,
  ASSET_OPTIMIZATION_UPDATED = AuditLogScenario.ASSET_OPTIMIZATION_UPDATED,
  SCADA_REPORT_UPLOADED = AuditLogScenario.SCADA_REPORT_UPLOADED,
  SCADA_REPORT_REMOVED = AuditLogScenario.SCADA_REPORT_REMOVED,
  DATASET_MERGED = AuditLogScenario.DATASET_MERGED,
  AGGREGATOR_REPORT_REMOVED = AuditLogScenario.AGGREGATOR_REPORT_REMOVED,
  BENCHMARK_CONFIGURATION_UPDATED = AuditLogScenario.BENCHMARK_CONFIGURATION_UPDATED,
  INTERNAL_APPRAISAL_REPORT_REMOVED = AuditLogScenario.INTERNAL_APPRAISAL_REPORT_REMOVED,
  VIEWED_ASSET_BASIC_INFORMATION = AuditLogScenario.VIEWED_ASSET_BASIC_INFORMATION,
  OPTIMIZATION_PARAMETERS_CONFIRMED = AuditLogScenario.OPTIMIZATION_PARAMETERS_CONFIRMED,
  AGGREGATOR_FILE_UPLOADED = AuditLogScenario.AGGREGATOR_FILE_UPLOADED,
  AGGREGATOR_FILE_REPLACED = AuditLogScenario.AGGREGATOR_FILE_REPLACED,
  SCADA_FILE_REPLACED = AuditLogScenario.SCADA_FILE_REPLACED,
  OPTIMIZED_DATASET_GENERATED = AuditLogScenario.OPTIMIZED_DATASET_GENERATED,
  MERGED_DATASET_DOWNLOADED = AuditLogScenario.MERGED_DATASET_DOWNLOADED,
  OPTIMIZED_DATASET_DOWNLOADED = AuditLogScenario.OPTIMIZED_DATASET_DOWNLOADED,
  VIEWED_ASSET_ANALYSIS = AuditLogScenario.VIEWED_ASSET_ANALYSIS,
  IAR_FILE_UPLOADED = AuditLogScenario.IAR_FILE_UPLOADED,
  IAR_FILE_REPLACED = AuditLogScenario.IAR_FILE_REPLACED,
  VIEWED_BENCHMARK_ANALYSIS = AuditLogScenario.VIEWED_BENCHMARK_ANALYSIS,
  ASSET_SUBMITTED_FOR_APPROVAL = AuditLogScenario.ASSET_SUBMITTED_FOR_APPROVAL,
  VIEWED_PENDING_APPROVAL_ASSET = AuditLogScenario.VIEWED_PENDING_APPROVAL_ASSET,
  VIEWED_ACTIVE_ASSET = AuditLogScenario.VIEWED_ACTIVE_ASSET,
  MONTHLY_AGGREGATOR_FILE_UPLOADED = AuditLogScenario.MONTHLY_AGGREGATOR_FILE_UPLOADED,
  MONTHLY_SCADA_FILE_UPLOADED = AuditLogScenario.MONTHLY_SCADA_FILE_UPLOADED,
  MONTHLY_AGGREGATOR_FILE_REPLACED = AuditLogScenario.MONTHLY_AGGREGATOR_FILE_REPLACED,
  MONTHLY_SCADA_FILE_REPLACED = AuditLogScenario.MONTHLY_SCADA_FILE_REPLACED,
  UPDATED_IAR_FILE = AuditLogScenario.UPDATED_IAR_FILE,
  DOWNLOADED_AGGREGATOR_FILE = AuditLogScenario.DOWNLOADED_AGGREGATOR_FILE,
  DOWNLOADED_SCADA_FILE = AuditLogScenario.DOWNLOADED_SCADA_FILE,
  DOWNLOADED_IAR_FILE = AuditLogScenario.DOWNLOADED_IAR_FILE,
  VIEWED_ASSET_APPROVAL_DETAILS = AuditLogScenario.VIEWED_ASSET_APPROVAL_DETAILS,
  ASSET_APPROVED = AuditLogScenario.ASSET_APPROVED,
  ASSET_DISABLED = AuditLogScenario.ASSET_DISABLED,
  ASSET_ENABLED = AuditLogScenario.ASSET_ENABLED,
  INVOICE_UPLOADED=AuditLogScenario.INVOICE_UPLOADED,
  INVOICE_DELETED=AuditLogScenario.INVOICE_DELETED,
  SETTELMENT_FILE_UPLOADED=AuditLogScenario.SETTELMENT_FILE_UPLOADED,
  SETTELMENT_FILE_DELETED=AuditLogScenario.SETTELMENT_FILE_DELETED,
}

export enum AssetBatteryCycleCalculationMethod {
  DISCHARGE_BASED = 'discharge-only',
  FULL_EQUIVALENT = 'full-equivalent',
  THROUGHPUT_BASED = 'throughput-based',
}

export enum InvoiceType {
  HartreePV = 1,
  HartreeBESS = 2,
  EMR = 3,
  GridBeyond = 4,
  HartreeBESSPower = 5,
  HartreeAuxiliary = 6,
  HartreeSolarPower = 7,
  HartreeOther = 8,
}