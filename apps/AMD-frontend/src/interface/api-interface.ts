import type {
  APDAuditLogModules,
  APDAuditLogScenario,
  AssetBatteryCycleCalculationMethod,
  AssetFileType,
  AssetStatus,
  AssetType,
  DigestFrequency,
  DigestScope,
  UserRole,
  CommentContextType,
  CommentModule,
} from '@/constants';
import type {
  APDAuditLog,
  AssetAncillaryServiceAnalytics,
  Asset,
  AssetBenchmarkMultiMarketOptmizationVsActual,
  AssetBenchmarkRevenueActualvsIAR,
  AssetTBSpreadAnalytics,
  AssetMarketAnalytics,
  AssetMarketPriceAnalytics,
  AssetOperationAnalytics,
  AssetReportFile,
  BenchmarkMetric,
  Digest,
  ENV,
  MetricMonthlyValues,
  Organization,
  User,
  AssetImbalanceAnalytics,
  AssetBatteryHealthAnalytics,
  AssetGenerateReport,
  AssetExecutiveAnalysis,
  InvoiceExtractionCategorySummary,
  InvoiceExtractionQualitySummary,
  Invoice,
  InvoiceSettlement,
  AssetCapacityMarketAnalytics2,
  InvoiceStatementSummary,
  Comment,
  CreateCommentPayload,
  AssetInvoiceRevenueReconciliation,
  NotificationData,
} from './common-interface';
import type {SortType, APIResponse} from '@lazarus/react-common/interface';
export type {APIResponse, LoginRequest, VerifyOtpRequest} from '@lazarus/react-common/interface/api-interface';

export interface ApiConfigInterface {
  currentEnv: string | undefined;
  baseUrls: Record<ENV, string>;
  webAppUrls: Record<ENV, string>;
  noAuthUrls: {
    demo: string;
    login: string;
    verifyOtp: string;
    refresh: string;
  };
  authUrls: {
    logout: string;
    websocketToken: string;

    users: string;
    user_id: (id: number) => string;
    user_organization: (id: number) => string;

    organization: string;
    organization_id: (id: number) => string;
    organization_multiple_users: string;

    assets: string;
    asset_id: (id: number) => string;
    asset_optimization_parameters: (id: number) => string;
    asset_organization: (assetId: number) => string;
    asset_aggregator_report_upload: (assetId: number) => string;
    asset_scada_report_upload: (assetId: number) => string;
    asset_merge_dataset: (assetId: number) => string;
    asset_optimized_dataset: (assetId: number) => string;
    asset_multiple_users: string;
    asset_taggable_users: (assetId: number) => string;
    asset_merged_dataset_download: (assetId: number) => string;
    asset_iar_report: (assetId: number) => string;
    asset_submit: (assetId: number) => string;
    asset_activate: (assetId: number) => string;
    asset_files: (assetId: number) => string;
    asset_files_id: (assetId: number, fileId: number) => string;
    asset_files_download: (assetId: number, fileId: number) => string;

    // asset analysis-operations related APIs
    asset_analysis_operations_summary: (assetId: number) => string;
    asset_analysis_soc_distribution: (assetId: number) => string;
    asset_analysis_operations_market_summary: (assetId: number) => string;
    asset_analysis_operations_energy_price: (assetId: number) => string;
    asset_analysis_operations_battery_power_over_time: (assetId: number) => string;

    // asset analysis-ancillary related APIs
    asset_analysis_ancillary_summary: (assetId: number) => string;
    asset_analysis_ancillary_revenue_breakdown: (assetId: number) => string;
    asset_analysis_ancillary_revenue_breakdown_export: (assetId: number) => string;
    asset_analysis_ancillary_opportunity_cost_analysis: (assetId: number) => string;
    asset_analysis_ancillary_service_revenue_by_hour: (assetId: number) => string;

    // asset analysis imabalance related APIs
    asset_analysis_imbalance_summary: (assetId: number) => string;
    asset_analysis_imbalance_daily_breakdown: (assetId: number) => string;
    asset_analysis_imbalance_worst_days: (assetId: number) => string;
    asset_analysis_imbalance_hourly_charges: (assetId: number) => string;
    asset_analysis_imbalance_worst_days_export: (assetId: number) => string;

    // asset analysis battery health related APIs
    asset_analysis_battery_health_summary: (assetId: number) => string;
    asset_analysis_battery_health_cycle_comparison: (assetId: number) => string;
    asset_analysis_battery_health_strategy_cycling_comparison: (assetId: number) => string;
    asset_analysis_battery_health_strategy_energy_throughput_summary_export: (assetId: number) => string;
    asset_analysis_battery_health_annual_projection_report: (assetId: number) => string;
    asset_analysis_battery_health_daily_cycles: (assetId: number) => string;
    asset_analysis_battery_health_warranty_exceedance: (assetId: number) => string;

    // asset analysis-tb spread related APIs
    asset_analysis_tb_spread_summary: (assetId: number) => string;
    asset_analysis_tb_spread_details: (assetId: number) => string;
    asset_analysis_tb_spread_details_export: (assetId: number) => string;

    // asset analysis-benchmark related APIs
    asset_analysis_benchmark_industry: (assetId: number) => string;
    asset_analysis_benchmark_industry_export: (assetId: number) => string;
    asset_benchmark_revenue_iar_vs_actual: (assetId: number) => string;
    asset_benchmark_revenue_iar_vs_actual_export: (assetId: number) => string;
    asset_benchmark_multi_market_optimized_vs_actual: (assetId: number) => string;
    asset_benchmark_multi_market_optimized_vs_actual_export: (assetId: number) => string;

    // asset analysis-market related APIs
    asset_analysis_market_summary: (assetId: number) => string;
    asset_analysis_market_statistics: (assetId: number) => string;
    asset_analysis_market_statistics_export: (assetId: number) => string;
    asset_analysis_market_price_spread: (assetId: number) => string;
    asset_analysis_market_price_volatility: (assetId: number) => string;
    asset_analysis_market_price_correlation_matrix: (assetId: number) => string;
    asset_analysis_market_utilization: (assetId: number) => string;
    asset_analysis_market_best_markets: (assetId: number) => string;
    asset_analysis_market_best_markets_export: (assetId: number) => string;
    asset_analysis_market_revenue_distribution: (assetId: number) => string;
    asset_analysis_market_hourly_price_patterns: (assetId: number) => string;

    // executive analysis related APIs
    asset_executive_analysis_monthly_revenue_comparison: (assetId: number) => string;
    asset_executive_analysis_monthly_revenue_comparison_export: (assetId: number) => string;
    asset_executive_analysis_revenue_by_stream: (assetId: number) => string;
    asset_executive_analysis_revenue_by_stream_export: (assetId: number) => string;
    asset_executive_analysis_summary: (assetId: number) => string;

    metrics_benchmarks: string;
    metrics_monthly_values: string;
    modo_benchmark_monthly_value: string;

    // audit log related APIs
    audit_logs: string;

    // digest related APIs
    digests: string;
    digest_id: (digestId: string) => string;

    // invoices slice
    asset_invoices: (assetId: number) => string;
    asset_invoices_summary: (assetId: number) => string;
    asset_invoices_id: (assetId: number, invoiceId: number) => string;
    asset_invoices_id_preview: (assetId: number, invoiceId: number) => string;
    asset_invoices_id_export: (assetId: number, invoiceId: number) => string;
    asset_invoices_export: (assetId: number) => string;
    asset_invoices_settlement: (assetId: number) => string;
    asset_invoices_settlement_id: (assetId: number, settlementId: number) => string;
    asset_invoices_settlement_id_export: (assetId: number, settlementId: number) => string;
    asset_invoices_summary_statement: (assetId: number) => string;
    asset_invoices_summary_statement_id: (assetId: number, statementId: number) => string;
    asset_invoices_summary_statement_id_export: (assetId: number, statementId: number) => string;

    asset_invoice_analysis_capacity_market_summary: (assetId: number) => string;
    asset_invoice_analysis_capacity_market_payments: (assetId: number) => string;
    asset_invoice_analysis_capacity_market_payment_trend: (assetId: number) => string;
    asset_invoice_analysis_capacity_market_export: (assetId: number) => string;

    // comments related APIs
    comments: (assetId: number) => string;
    comment_id: (assetId: number, commentId: number | string) => string;
    comment_reply: (assetId: number, commentId: number | string) => string;
    comment_read: (assetId: number, commentId: number | string) => string;
    comment_status: (assetId: number, commentId: number | string) => string;

    // notifications related APIs
    notifications_active: string;
    notification_read: (notificationId: number | string) => string;
    asset_invoice_analysis_revenue_reconciliation_summary: (assetId: number) => string;
    asset_invoice_analysis_revenue_reconciliation_per_stream_comparison: (assetId: number) => string;
    asset_invoice_analysis_revenue_reconciliation_export: (assetId: number) => string;
  };
}

// =============================== User Slice ===============================
export interface AddUserRequest {
  payload: {
    name: User['name'];
    email: User['email'];
    role: User['role'];
    platform: User['platform'];
    status: User['status'];
  };
  response: APIResponse<User>;
}

export interface UserListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    platform?: number[];
    sort?: NonNullable<SortType>;
    organization?: number;
    status?: boolean;
    start_date?: string;
    end_date?: string;
  };
  response: APIResponse<{
    users: User[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_results: number;
  }>;
}

export interface EditUserRequest {
  payload: {
    id: User['id'];
    name?: User['name'];
    email?: User['email'];
    role?: User['role'];
    platform?: User['platform'];
    status?: User['status'];
  };
  response: APIResponse<User>;
}

export interface DeleteUserRequest {
  payload: {
    id: number;
  };
  response: APIResponse<{user_id: number}>;
}

export interface AssignOrganizationRequest {
  payload: {
    id: number;
    organization_id: number;
  };
  response: APIResponse<{
    user_id: number;
    organization: {
      id: number;
      name: string;
    };
  }>;
}

// =============================== Organization Slice ===============================
export interface OrganizationListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: boolean;
    sort?: NonNullable<SortType>;
  };
  response: APIResponse<{
    organizations: Organization[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_results: number;
  }>;
}

export interface AddOrganizationRequest {
  payload: {
    name: string;
  };
  response: APIResponse<Organization>;
}

export interface EditOrganizationRequest {
  payload: {
    id: number;
    name?: string;
    status?: boolean;
  };
  response: APIResponse<Organization>;
}

// =============================== Asset Slice ===============================
export interface AssetListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: AssetType;
    organization?: number;
    country?: number;
    status?: AssetStatus;
  };
  response: APIResponse<{
    assets: Asset[];
    total_pages: number;
    current_page: number;
    next_page: number | null;
    total_assets: number;
  }>;
}

export interface ReassignAssetOwnershipRequest {
  payload: {
    asset_id: number;
    organization_id: number;
  };
  response: APIResponse<{
    asset_id: number;
    organization: {
      id: number;
      name: string;
    };
  }>;
  errorResponse: APIResponse<Record<string, any>>;
}

export interface OnboardAssetRequest {
  payload: {
    name: string;
    type: AssetType; // AssetType
    capacity: number;
    location: string;
    country_id: number;
    organization_id: number;
  };
  response: APIResponse<Asset>;
}

export interface EditAssetRequest {
  payload: {
    id: Asset['id'];
    name?: Asset['name'];
    type?: Asset['type'];
    capacity?: Asset['capacity'];
    location?: Asset['location'];
    country_id?: Asset['country']['id'];
    organization_id?: Asset['organization']['id'];
    current_step?: Asset['current_step'];
    status?: boolean;
    active_month?: number;
    active_year?: number;
    active_invoice_month?: number;
    active_invoice_year?: number;
  };
  response: APIResponse<Asset>;
  errorResponse: APIResponse<Record<string, any>>;
}

export interface OptimizationParamsEditRequest {
  payload: {
    id: Asset['id'];
    max_charging_rate?: Asset['max_charging_rate'];
    max_discharging_rate?: Asset['max_discharging_rate'];
    usable_capacity?: Asset['usable_capacity'];
    soc_min?: Asset['soc_min'];
    soc_max?: Asset['soc_max'];
    round_trip_efficiency?: Asset['round_trip_efficiency'];
    max_daily_cycles?: Asset['max_daily_cycles'];
  };
  response: APIResponse<{
    id: Asset['id'];
    asset_id: Asset['asset_id'];
    current_step: Asset['current_step'];
    max_charging_rate?: Asset['max_charging_rate'];
    max_discharging_rate?: Asset['max_discharging_rate'];
    usable_capacity?: Asset['usable_capacity'];
    soc_min?: Asset['soc_min'];
    soc_max?: Asset['soc_max'];
    round_trip_efficiency?: Asset['round_trip_efficiency'];
    max_daily_cycles?: Asset['max_daily_cycles'];
  }>;
}

export interface GetAssetDetailsRequest {
  params: {
    id: number;
    skip_audit?: boolean;
  };
  response: APIResponse<Asset>;
}

export interface UploadAggregatorReportRequest {
  payload: {
    assetId: number;
    formData: any; // formdata
  };
  response: APIResponse<AssetReportFile>;
  error_response: APIResponse<{
    file: {name: string};
    validation_errors: string[];
  }>;
}

export interface RemoveAggregatorReportRequest {
  payload: {
    assetId: number;
  };
  response: APIResponse;
}

export interface UploadScadaReportRequest {
  payload: {
    assetId: number;
    formData: any; // formdata
  };
  response: APIResponse<AssetReportFile>;
  error_response: APIResponse<{
    file: {name: string};
    validation_errors: string[];
  }>;
}

export interface RemoveScadaReportRequest {
  payload: {
    assetId: number;
  };
  response: APIResponse;
}

export interface MergeAssetDatasetsRequest {
  payload: {
    assetId: number;
    scada_file_id: number;
    aggregator_file_id: number;
  };
  response: APIResponse<AssetGenerateReport>;
}

export interface GenerateOptimizedDatasetRequest {
  payload: {
    assetId: number;
    merged_file_id: number;
  };
  response: APIResponse<AssetGenerateReport>;
}

export interface AssetOperationalAnalyticsRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetOperationAnalytics['revenue']>;
}

export interface AssetMarketSummaryRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetOperationAnalytics['market_summary']>;
}

export interface AssetMarketSummaryAnalysisRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketAnalytics['summary']>;
}

export interface AssetAncillaryServiceSummaryRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetAncillaryServiceAnalytics['summary']>;
}

export interface AssetAncillaryServiceRevenueBreakdownRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetAncillaryServiceAnalytics['revenue_breakdown']>;
}

export interface AssetAncillaryServiceRevenueBreakdownExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    fileName: string;
  };
}

export interface AssetAncillaryServiceOpportunityCostAnalysisRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetAncillaryServiceAnalytics['opportunity_cost']>;
}

export interface AssetAncillaryServiceRevenueByHourRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetAncillaryServiceAnalytics['hourly_service_revenue']>;
}

export interface AssetImbalanceSummaryRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetImbalanceAnalytics['summary']>;
}

export interface AssetImbalanceDailyBreakdownRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetImbalanceAnalytics['daily_breakdown']>;
}

export interface AssetImbalanceWorstDaysRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetImbalanceAnalytics['worst_days']>;
}

export interface AssetImbalanceHourlyChargesRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetImbalanceAnalytics['hourly_charges']>;
}

export interface AssetImbalanceWorstDaysExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    fileName: string;
  };
}

// =====================================
// battery health analysis related apis
// =====================================
export interface AssetAnalysisBatteryHealthSummaryRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['summary']>;
}

export interface AssetAnalysisBatteryHealthCycleComparisonRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['cycle_comparison']>;
}

export interface AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['stratergy_cycle_comparison']>;
}

export interface AssetAnalysisBatteryHealthAnnualProjectionReportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['annual_projection']>;
}

export interface AssetAnalysisBatteryHealthDailyCyclesRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['daily_cycles']>;
}

export interface AssetAnalysisBatteryHealthWarrantyExceedanceRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
  };
  response: APIResponse<AssetBatteryHealthAnalytics['warranty_limit_exceed']>;
}

export interface AssetAnalysisBatteryStrategyEnergyThroughputSummaryExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
    fileName: string;
  };
}

export interface AssetMarketStatisticsRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    market_strategy: AssetMarketAnalytics['statistics']['market_strategy'];
  };
  response: APIResponse<AssetMarketAnalytics['statistics']>;
}

export interface AssetMarketStatisticsExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    market_strategy: AssetMarketAnalytics['statistics']['market_strategy'];
    fileName: string;
  };
}

export interface AssetMarketPriceSpreadRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketPriceAnalytics['spread']>;
}

export interface AssetMarketPriceVolatilityRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketPriceAnalytics['price_volatility']>;
}

export interface AssetMarketPriceCorrelationMatrixRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketPriceAnalytics['correlation_matrix']>;
}

export interface AssetMarketUtilizationAnalysisRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    market_strategy: AssetMarketAnalytics['utilization']['market_strategy'];
  };
  response: APIResponse<AssetMarketAnalytics['utilization']>;
}

export interface AssetBestMarketsAnalysisRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketAnalytics['best_markets']>;
}

export interface AssetBestMarketsAnalysisExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    market_type: 'buy' | 'sell';
    fileName: string;
  };
}

export interface AssetMarketRevenueDistributionRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    market_strategy: 'multi' | 'epex_daily' | 'epex_efa' | 'actual';
  };
  response: APIResponse<AssetMarketAnalytics['revenue_distribution']>;
}

export interface AssetMarketHourlyPricePatternsRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetMarketPriceAnalytics['hourly_prices']>;
}

export interface AssetEnergyPriceComparisonRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<{
    month: number;
    year: number;
    energy_price_comparison: Array<{
      timestamp: string;
      day_ahead_price: number | null;
      intraday_price: number | null;
    }>;
  }>;
}

export interface AssetBatteryPowerOverTimeRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<{
    month: number;
    year: number;
    battery_power_over_time: Array<{
      timestamp: string;
      battery_power: number | null;
    }>;
  }>;
}

export interface AssetTBSpreadSummaryRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetTBSpreadAnalytics['summary']>;
}

export interface AssetTBSpreadDetailsRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<AssetTBSpreadAnalytics['details']>;
}

export interface AssetTBSpreadDetailsExportRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
    fileName: string;
  };
}

export interface UploadIARReportRequest {
  payload: {
    assetId: number;
    formData: FormData;
  };
  response: APIResponse<AssetReportFile>;
  error_response: APIResponse<{
    file: {name: string};
    validation_errors: string[];
  }>;
}

export interface RemoveIARReportRequest {
  payload: {
    assetId: number;
  };
  response: APIResponse;
}

export interface ActivateAssetRequest {
  payload: {
    assetId: number;
    status: boolean;
  };
  response: APIResponse<{
    id: number;
    status: boolean;
  }>;
}

export interface SubmitAssetForApprovalRequest {
  payload: {
    assetId: number;
  };
  response: APIResponse<{
    id: number;
    status: AssetStatus;
    submitted_at: string;
  }>;
}

export interface AssetIndustryBenchmarkAnalysisRequest {
  params: {
    assetId: number;
    year: number;
  };
  response: APIResponse<{
    asset_id: number;
    asset_name: string;
    benchmarks: Array<{
      month: number;
      year: number;
      actual: {
        metric_id: number;
        value: number;
        industry_low: number | null;
        industry_mid: number | null;
        industry_high: number | null;
      };

      modo: {
        metric_id: number;
        value: number;
        industry_low: number | null;
        industry_mid: number | null;
        industry_high: number | null;
        variance_modo: number;
      };

      iar: {
        metric_id: number;
        value: number;
        industry_low: number | null;
        industry_mid: number | null;
        industry_high: number | null;
        variance_iar: number;
      };
    }>;
  }>;
}

export interface AssetIndustryBenchmarkAnalysisExportRequest {
  params: {
    assetId: number;
    year: number;

    tableName?: string; // optional, if not provided, default name will be used in backend
  };
}

export interface AssetBenchmarkRevenueIARvsActualRequest {
  params: {
    assetId: number;
    year: number;
    months?: number[];
  };
  response: APIResponse<AssetBenchmarkRevenueActualvsIAR>;
}

export interface AssetBenchmarkRevenueIARvsActualExportRequest {
  params: {
    assetId: number;
    year: number;
    months?: number[];
    fileName?: string; // optional, if not provided, default name will be used in backend
  };
}

export interface AssetBenchmarkMultiMarketOptimizedVsActualRequest {
  params: {
    assetId: number;
    year: number;
    months?: number[];
  };
  response: APIResponse<AssetBenchmarkMultiMarketOptmizationVsActual>;
}

export interface AssetBenchmarkMultiMarketOptimizedVsActualExportRequest {
  params: {
    assetId: number;
    year: number;
    months?: number[];
    fileName?: string; // optional, if not provided, default name will be used in backend
  };
}

export interface GetAssetFilesRequest {
  params: {
    assetId: number;
    month: number[];
    year: number[];
  };
  response: APIResponse<Array<AssetReportFile>>;
}

export interface UpdateAssetReportingPeriodRequest {
  params: {
    assetId: number;
    month: number;
    year: number;
  };
  response: APIResponse<Asset>;
}

export interface DownloadAssetFileRequest {
  params: {
    fileId: number;
    assetId: number;
    fileName?: string; // optional, if not provided, default name will be used in backend
  };
}

export interface RemoveAssetFileRequest {
  params: {
    fileId: number;
    assetId: number;
  };
  response: APIResponse<{
    file_id: number;
    file_type: AssetFileType;
    asset_id: number;
    child_files: Array<{
      file_id: number;
      file_type: AssetFileType;
    }>;
  }>;
}

// =============================== Digest Management  ===============================
export interface DigestListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: boolean;
    scope?: number;
    frequency?: number;
  };
  response: APIResponse<{
    digests: Digest[];
    total_pages: number;
    current_page: number;
    next_page: number | null;
    total_results: number;
  }>;
}

export interface AddDigestRequest {
  payload: {
    name: string;
    scope: DigestScope;
    frequency: DigestFrequency;
    time: string;
    weekday?: number | null;
    day_of_month?: number | null;
    recipients: number[];
    resource_id: number[] | null;
    status: boolean;
  };
  response: APIResponse;
}

export interface EditDigestRequest {
  payload: {
    id: number;
    name?: string;
    scope?: DigestScope;
    frequency?: DigestFrequency;
    time?: string;
    weekday?: number | null;
    day_of_month?: number | null;
    recipients?: number[];
    resource_id?: number[] | null;
    status?: boolean;
  };
  response: APIResponse;
}

// =============================== Audit Log Slice ===============================
export interface AuditLogListRequest {
  params: {
    page?: number;
    limit?: number;
    asset_id?: string;
    log_id?: string;
    search?: string;
    user_id?: string;
    resource_id?: string;
    role?: UserRole;
    module?: APDAuditLogModules;
    action?: APDAuditLogScenario;
    start_date?: string;
    end_date?: string;
  };
  response: APIResponse<{
    logs: Array<APDAuditLog>;
    next_page: number | null;
    total_pages: number;
    current_page: number;
    total_results: number;
  }>;
}

// =============================== Multiple Organization Users ===============================
export interface OrganizationMultipleUserRequest {
  params: {
    org_ids: number[];
    search?: string;
  };
  response: APIResponse<{
    users: User[];
  }>;
}

// =============================== Multiple Asset Users ===============================
export interface AssetMultipleUserRequest {
  params: {
    asset_ids: number[];
    search?: string;
  };
  response: APIResponse<{
    users: User[];
  }>;
}

// =============================== Settings Management  ===============================
export interface MetricsBenchmarksRequest {
  response: APIResponse<BenchmarkMetric[]>;
}

export interface UpdateBenchmarkMetricRequest {
  payload: Array<{
    metric_id: number;
    industry_low?: number;
    industry_mid?: number;
    industry_high?: number;
  }>;
  response: APIResponse<BenchmarkMetric[]>;
}

export interface GetMonthlyValuesRequest {
  payload: {
    month?: number[];
    year?: number[];
  };
  response: APIResponse<{
    metrics: BenchmarkMetric[];
    monthly_values: MetricMonthlyValues[];
  }>;
}

export interface AddMonthlyValuesRequest {
  payload: Array<{
    metric_id: number;
    month: number;
    year: number;
    value: number | null;
  }>;
  response: APIResponse<MetricMonthlyValues[]>;
}

export interface UpdateMonthlyValuesRequest {
  payload: Array<{
    id: number;
    value: number;
  }>;
  response: APIResponse<MetricMonthlyValues[]>;
}

export interface ModoBenchmarkMonthlyValueRequest {
  params: {
    month: number;
    year: number;
  };
  response: APIResponse<{
    modo_benchmark_per_mw_per_year: number;
  }>;
}

// =============================== Asset Executive Analysis ===============================
export interface AssetExecutiveAnalysisMonthlyRevenueComparisonRequest {
  params: {
    months?: number[];
    year: number;
    assetId: number;
  };
  response: APIResponse<AssetExecutiveAnalysis['monthly_revenue_comparison']>;
}

export interface AssetExecutiveAnalysisRevenueByStreamRequest {
  params: {
    months?: number[];
    year: number;
    assetId: number;
  };
  response: APIResponse<AssetExecutiveAnalysis['revenue_by_stream']>;
}

export interface AssetExecutiveAnalysisSummaryRequest {
  params: {
    year: number;
    assetId: number;
  };
  response: APIResponse<AssetExecutiveAnalysis['summary']>;
}

export interface AssetExecutiveAnalysisMonthlyRevenueComparisonExportRequest {
  params: {
    months?: number[];
    year: number;
    assetId: number;
    fileName: string;
  };
}

export interface AssetExecutiveAnalysisRevenueByStreamExportRequest {
  params: {
    months?: number[];
    year: number;
    assetId: number;
    fileName: string;
  };
}

// =============================== Invoice Request ===============================

/**
 *
 * @method GET
 * @description Get list of invoices with pagination and filters
 * @endpoint /api/v1/assets/{assetId}/invoices
 *
 */
export interface InvoiceListRequest {
  params: {
    search?: string;
    type?: Invoice['type'];
    page?: number;
    limit: number;
    sort?: string[];
    month?: number[];
    year?: number[];
    assetId: number;
  };
  response: APIResponse<{
    current_page: number;
    total_pages: number;
    next_page: number | null;
    total_files: number;
    invoices: Array<Invoice>;
  }>;
}

/**
 *
 * @method GET
 * @description Get summary for PDF invoices
 * @endpoint /api/v1/assets/{assetId}/invoices/summary
 *
 */
export interface InvoiceSummaryRequest {
  params: {
    assetId: number;
    year?: number[];
    month?: number[];
    source: 'asset_management' | 'left_navigation';
  };
  response: APIResponse<{
    total_files: number;
    extraction_quality: InvoiceExtractionQualitySummary;
    category_summary: InvoiceExtractionCategorySummary;
  }>;
}

/**
 *
 * @method POST
 * @description Upload PDF invoices for processing
 * @endpoint /api/v1/assets/{assetId}/invoices
 *
 */
export interface InvoiceUploadRequest {
  payload: {
    assetId: number;
    formData: FormData;
  };
  response: APIResponse<Invoice>;
}

/**
 *
 * @method DELETE
 * @description Delete a specific PDF invoice
 * @endpoint /api/v1/assets/{assetId}/invoices/{invoiceId}
 *
 */
export interface InvoiceDeleteRequest {
  payload: {
    assetId: number;
    invoiceId: number;
  };
  response: APIResponse<{
    asset_id: number;
    invoice_id: number;
    message: string;
  }>;
}

/**
 *
 * @method GET
 * @description Download a specific PDF invoice
 * @endpoint /api/v1/assets/{assetId}/invoices/{invoiceId}/export
 *
 */
export interface InvoiceDownloadRequest {
  params: {
    invoiceId: number;
    fileName?: string;
    assetId: number;
    source?: 'preview' | 'upload_history';
  };
}

/**
 *
 * @method GET
 * @description Download CSV export for invoice list
 * @endpoint /api/v1/assets/{assetId}/invoices/export
 *
 */
export interface InvoiceListExportRequest {
  params: {
    search?: string;
    type?: Invoice['type'];
    page?: number;
    limit?: number;
    sort?: string[];
    month?: number[];
    year?: number[];
    assetId: number;
    fileName: string;
  };
}

/**
 *
 * @method GET
 * @description Preview a specific PDF invoice
 * @endpoint /api/v1/assets/{assetId}/invoices/{invoiceId}/preview
 *
 */
export interface InvoicePreviewRequest {
  params: {
    invoiceId: number;
    assetId: number;
  };
}

/**
 *
 * @method GET
 * @description Get List of settlement invoices for a specific asset
 * @endpoint /api/v1/assets/{asset_id}/invoices/settlement
 *
 */
export interface InvoiceSettlementListRequest {
  params: {
    month: number[];
    year: number[];
    assetId: number;
  };
  response: APIResponse<{
    current_page?: number;
    next_page?: number | null;
    total_pages?: number;
    total_files: number;
    settlement: Array<InvoiceSettlement>;
  }>;
}

/**
 *
 * @method POST
 * @description Upload settlement invoices for a specific asset
 * @endpoint /api/v1/assets/{asset_id}/invoices/settlement
 *
 */
export interface InvoiceSettlementUploadRequest {
  payload: {
    formData: FormData;
    assetId: number;
  };
  response: APIResponse<InvoiceSettlement>;
}

/**
 *
 * @method DELETE
 * @description Delete a specific settlement CSV
 * @endpoint /api/v1/assets/{asset_id}/invoices/settlement/{settlement_id}
 *
 */
export interface DeleteInvoiceSettlementRequest {
  payload: {
    assetId: number;
    settlementId: number;
  };
  response: APIResponse<{
    invoice_settlement_id: number;
    asset_id: number;
    message: string;
  }>;
}
/**
 *
 * @method GET
 * @description Export a specific settlement CSV
 * @endpoint /api/v1/assets/{asset_id}/invoices/settlement/{settlement_id}/export
 *
 */
export interface ExportInvoiceSettlementRequest {
  payload: {
    assetId: number;
    settlementId: number;
    fileName?: string;
  };
}

/**
 *
 * @method POST
 * @description Upload summary statement file for a specific asset
 * @endpoint /api/v1/assets/{asset_id}/invoice/summary-statement
 *
 */
export interface AssetInvoiceSummaryStatementUploadRequest {
  payload: {
    assetId: number;
    formData: FormData;
  };
  response: APIResponse<InvoiceStatementSummary>;
}

/**
 *
 * @method DELETE
 * @description Delete summary statement file for a specific asset
 * @endpoint /api/v1/assets/{asset_id}/invoice/summary-statement/{statement_id}
 *
 */
export interface DeleteAssetInvoiceSummaryStatementRequest {
  payload: {
    assetId: number;
    statementId: number;
  };
  response: APIResponse<{
    asset_id: number;
    statement_id: number;
  }>;
}

/**
 *
 * @method GET
 * @description Export summary statement file for a specific asset
 * @endpoint /api/v1/assets/{asset_id}/invoice/summary-statement/{statement_id}/export
 *
 */
export interface ExportAssetInvoiceSummaryStatementRequest {
  params: {
    assetId: number;
    statementId: number;
    fileName?: string;
  };
}

/**
 *
 * @method GET
 * @description Get list of summary statement files for a particular asset
 * @endpoint /api/v1/assets/{asset_id}/invoice/summary-statement/
 *
 */
export interface AssetInvoiceSummaryStatementListRequest {
  params: {
    month: number[];
    year: number[];
    assetId: number;
  };
  response: APIResponse<{
    total_files: number;
    summary_statements: Array<InvoiceStatementSummary>;
  }>;
}

// =============================== Invoice Analysis Request ===============================


/**
 *
 * @method GET
 * @description Get Capacity Market Summary
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/capacity-market/summary
 *
 */
export interface AssetCapacityMarketSummaryRequest {
  params: {
    assetId: number;
    year: number;
    month?: number;
  };
  response: APIResponse<AssetCapacityMarketAnalytics2['summary']>;
}

/**
 *
 * @method GET
 * @description Get Capacity Market Payments
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/capacity-market/payments
 *
 */
export interface AssetCapacityMarketPaymentsRequest {
  params: {
    assetId: number;
    year: number;
    month?: number;
  };
  response: APIResponse<AssetCapacityMarketAnalytics2['payments']>;
}

/**
 *
 * @method GET
 * @description Get Capacity Market Payment Trend
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/capacity-market/payment-trend
 *
 */
export interface AssetCapacityMarketPaymentTrendRequest {
  params: {
    assetId: number;
    year: number;
    month?: number;
  };
  response: APIResponse<AssetCapacityMarketAnalytics2['payment_trend']>;
}

/**
 *
 * @method GET
 * @description Export Capacity Market analytics
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/capacity-market/export
 *
 */
export interface AssetCapacityMarketExportRequest {
  params: {
    assetId: number;
    year: number;
    month?: number;
    fileName: string;
  };
}

// =============================== Comment Management  ===============================

/**
 *
 * @method GET
 * @description Fetch all comments for a given asset with optional context filters
 * @endpoint /api/v1/assets/{asset_id}/comments
 *
 */
export interface FetchCommentsRequest {
  params: {
    assetId: number;
    context_type?: CommentContextType;
    context_module?: CommentModule;
    context_tab?: string;
    context_widget?: string;
    context_data_point?: string;
    context_year?: number;
    context_month?: number;
  };
  response: APIResponse<{
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_comments: number;
    comments: Comment[];
  }>;
}

/**
 *
 * @method GET
 * @description Get Revenue Reconciliation Analysis Summary
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/revenue-reconciliation/summary
 *
 */
export interface AssetInvoiceRevenueReconciliationSummaryRequest {
  params: {
    assetId: number;
    year: number;
    months: number[];
  };
  response: APIResponse<
    | AssetInvoiceRevenueReconciliation['summary']
    | {
        asset_id: number;
        asset_name: string;
        year: number;
        has_data: false;
        message: string;
      }
  >;
}

/**
 *
 * @method GET
 * @description Get Revenue Reconciliation Analysis Per Stream Comparison
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/revenue-reconciliation/per-stream-comparison
 *
 */
export interface AssetInvoiceRevenueReconciliationPerStreamComparisonRequest {
  params: {
    assetId: number;
    year: number;
    months: number[];
  };
  response: APIResponse<AssetInvoiceRevenueReconciliation['per_stream_comparison']>;
}

/**
 *
 * @method POST
 * @description Create a new top-level comment on an asset
 * @endpoint /api/v1/assets/{asset_id}/comments
 *
 */
export interface CreateCommentApiRequest {
  params: { assetId: number };
  payload: CreateCommentPayload;
  response: APIResponse<Comment>;
}

/**
 *
 * @method PUT
 * @description Update the title or content of an owned comment within the 15-minute edit window
 * @endpoint /api/v1/assets/{asset_id}/comments/{comment_id}
 *
 */
export interface UpdateCommentApiRequest {
  params: { assetId: number; commentId: number };
  payload: Partial<Pick<CreateCommentPayload, 'title' | 'content'>> & { is_read?: boolean };
  noRefresh?: boolean;
  response: APIResponse<Comment>;
}

/**
 *
 * @method DELETE
 * @description Delete an owned comment within the 15-minute window (only if no replies exist)
 * @endpoint /api/v1/assets/{asset_id}/comments/{comment_id}
 *
 */
export interface DeleteCommentApiRequest {
  payload: { assetId: number; commentId: number };
  response: APIResponse<null>;
}

/**
 *
 * @method POST
 * @description Post a reply to an existing comment
 * @endpoint /api/v1/assets/{asset_id}/comments/{comment_id}/reply
 *
 */
export interface ReplyCommentApiRequest {
  params: { assetId: number; commentId: number };
  payload: Pick<CreateCommentPayload, 'content'> & { title?: string };
  response: APIResponse<Comment>;
}

/**
 *
 * @method PATCH
 * @description Mark a comment as read
 * @endpoint /api/v1/assets/{asset_id}/comments/{comment_id}/read
 *
 */
export interface ReadCommentApiRequest {
  params: { assetId: number; commentId: number };
  response: APIResponse<{comment_id: number, read_by: number[]}>;
}

/**
 *
 * @method GET
 * @description Check whether a comment still exists and if deleted, whether it was a parent or reply
 * @endpoint /api/v1/assets/{asset_id}/comments/{comment_id}/status
 *
 */
export interface CheckCommentStatusApiRequest {
  params: { assetId: number; commentId: number };
  response: APIResponse<{
    is_deleted: boolean;
    type: 'parent' | 'reply' | null;
    parent_id: number | null;
    deleted_comment_id: number | null;
    deleted_at: string | null;
  }>;
}

/**
 *
 * @method GET
 * @description Export Revenue Reconciliation analytics
 * @endpoint /api/v1/assets/{asset_id}/invoice-analysis/revenue-reconciliation/export
 *
 */
export interface AssetInvoiceRevenueReconciliationExportRequest {
  params: {
    assetId: number;
    year: number;
    months: number[];
    fileName?: string;
  };
}

// ===============================
// Notifications
// ===============================

export interface ListActiveNotificationsRequest {
  response: APIResponse<NotificationData[]>;
}

export interface MarkNotificationReadRequest {
  params: {
    notification_id: string | number;
  };
  response: APIResponse<{
    notification_id: number;
    is_read: boolean;
  }>;
}

export interface GetWsTokenRequest {
  response: APIResponse<{
    user_id: number;
    ephemeral_token: string;
  }>;
}
