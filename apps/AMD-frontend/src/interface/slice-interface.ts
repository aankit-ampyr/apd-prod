import type {
  Asset,
  AssetOperationAnalytics,
  AssetMarketAnalytics,
  Digest,
  Organization,
  User,
  Nullable,
  BenchmarkMetric,
  Metric,
  MetricMonthlyValues,
  AssetReportFile,
  AssetMarketPriceAnalytics,
  AssetBenchmarkRevenueActualvsIAR,
  AssetBenchmarkMultiMarketOptmizationVsActual,
  APDAuditLog,
  AssetAncillaryServiceAnalytics,
  AssetImbalanceAnalytics,
  AssetBatteryHealthAnalytics,
  AssetTBSpreadAnalytics,
  AssetExecutiveAnalysis,
  Invoice,
  InvoiceExtractionQualitySummary,
  InvoiceExtractionCategorySummary,
  InvoiceSettlement,
  AssetCapacityMarketAnalytics,
} from './common-interface';

export interface UserSliceInitialState {
  isloading: boolean;
  userError: string | boolean;
  userSuccess: string | boolean;

  users: User[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;
}

export interface OrganizationSliceInitialState {
  isLoading: boolean;
  organizationError: string | boolean;
  organizationSuccess: string | boolean;

  organizations: Organization[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;

  allOrganizations: Organization[];

  users: User[];
}

export type AssetFileUploadError = {
  file?: {name: string};
  validation_errors?: string[];
};

export interface AssetSliceInitialState {
  isLoading: boolean;
  assetError: string | boolean;
  assetErrorMessage: string;
  assetErrorMessageVars?: Record<string, string>;
  assetSuccess: string | boolean;
  assetDetailsFetchLoading: boolean;
  mergeLoading: boolean;
  optimizedDatasetGenerationLoading: boolean;
  aggregatorReportUploadLoading: boolean;
  scadaReportUploadLoading: boolean;
  iarReportUploadLoading: boolean;
  currentAssetFilesLoading: boolean;

  solar: {
    assets: Asset[];
    isLoading: boolean;
    totalPages: number;
    nextPage: number | null;
    currentPage: number;
    totalAssets: number;
  };
  bess: {
    assets: Asset[];
    isLoading: boolean;
    totalPages: number;
    nextPage: number | null;
    currentPage: number;
    totalAssets: number;
  };
  solarBess: {
    assets: Asset[];
    isLoading: boolean;
    totalPages: number;
    nextPage: number | null;
    currentPage: number;
    totalAssets: number;
  };

  allAssets: Asset[];
  currentSelectedAsset: Asset | null;
  currentAssetFiles: Array<AssetReportFile>;

  aggregatorReportUploadError: AssetFileUploadError | null;
  scadaReportUploadError: AssetFileUploadError | null;
  iarReportUploadError: AssetFileUploadError | null;
  invoiceUploadError: AssetFileUploadError | null;
  invoiceSettlementUploadError: AssetFileUploadError | null;

  users: User[];

  // analytics data
  analytics: {
    operations: Partial<{
      revenue_metrics: Nullable<AssetOperationAnalytics['revenue']>;
      revenue_distribution: Nullable<AssetOperationAnalytics['revenue_distribution']>;
      soc_distribution: Nullable<AssetOperationAnalytics['soc_distribution']>;
      market_prices: Nullable<AssetOperationAnalytics['market_price']>;
      ancillary_services_revenue: Nullable<AssetOperationAnalytics['ancillary_services_revenue']>;
      trading_activity: Nullable<AssetOperationAnalytics['trading_activity']>;
      energy_price_comparison: Nullable<AssetOperationAnalytics['energy_price_comparison']>;
      battery_power_over_time: Nullable<AssetOperationAnalytics['battery_power_over_time']>;
    }>;
    market: Partial<{
      summary: Nullable<AssetMarketAnalytics['summary']>;
      utilization: Nullable<AssetMarketAnalytics['utilization']>;
      best_markets: Nullable<AssetMarketAnalytics['best_markets']>;
      statistics: Nullable<AssetMarketAnalytics['statistics']>;
      revenue_distribution: Nullable<AssetMarketAnalytics['revenue_distribution']>;
    }>;
    market_prices: Partial<{
      spread: Nullable<AssetMarketPriceAnalytics['spread']>;
      hourly_prices: Nullable<AssetMarketPriceAnalytics['hourly_prices']>;
      price_volatility: Nullable<AssetMarketPriceAnalytics['price_volatility']>;
      correlation_matrix: Nullable<AssetMarketPriceAnalytics['correlation_matrix']>;
    }>;
    ancillary_services: Partial<{
      summary: Nullable<AssetAncillaryServiceAnalytics['summary']>;
      revenue_breakdown: Nullable<AssetAncillaryServiceAnalytics['revenue_breakdown']>;
      opportunity_cost: Nullable<AssetAncillaryServiceAnalytics['opportunity_cost']>;
      hourly_service_revenue: Nullable<AssetAncillaryServiceAnalytics['hourly_service_revenue']>;
    }>;
    imbalance: Partial<{
      summary: Nullable<AssetImbalanceAnalytics['summary']>;
      daily_breakdown: Nullable<AssetImbalanceAnalytics['daily_breakdown']>;
      worst_days: Nullable<AssetImbalanceAnalytics['worst_days']>;
      hourly_charges: Nullable<AssetImbalanceAnalytics['hourly_charges']>;
    }>;
    battery_health: Partial<{
      summary: Nullable<AssetBatteryHealthAnalytics['summary']>;
      cycle_comparison: Nullable<AssetBatteryHealthAnalytics['cycle_comparison']>;
      stratergy_cycle_comparison: Nullable<AssetBatteryHealthAnalytics['stratergy_cycle_comparison']>;
      annual_projection: Nullable<AssetBatteryHealthAnalytics['annual_projection']>;
      daily_cycles: Nullable<AssetBatteryHealthAnalytics['daily_cycles']>;
      warranty_limit_exceedance: Nullable<AssetBatteryHealthAnalytics['warranty_limit_exceed']>;
    }>;
    tb_spread: Partial<{
      summary: Nullable<AssetTBSpreadAnalytics['summary']>;
      details: Nullable<AssetTBSpreadAnalytics['details']>;
    }>;
  };

  // analytics loading and error states
  analyticsLoading: {
    operations: Partial<{
      revenue: boolean;
      soc: boolean;
      market_summary: boolean;
      energy_price_comparison: boolean;
      battery_power_over_time: boolean;
    }>;

    market: Partial<{
      summary: boolean;
      utilization: boolean;
      revenue_distribution: boolean;
      best_markets: boolean;
      statistics: boolean;
    }>;

    market_prices: Partial<{
      spread: boolean;
      hourly_prices: boolean;
      price_volatility: boolean;
      correlation_matrix: boolean;
    }>;
    ancillary_services: Partial<{
      summary: boolean;
      revenue_breakdown: boolean;
      opportunity_cost: boolean;
      hourly_service_revenue: boolean;
    }>;
    imbalance: Partial<{
      summary: boolean;
      daily_breakdown: boolean;
      worst_days: boolean;
      hourly_charges: boolean;
    }>;
    battery_health: Partial<{
      summary: boolean;
      cycle_comparison: boolean;
      stratergy_cycle_comparison: boolean;
      annual_projection: boolean;
      daily_cycles: boolean;
      warranty_limit_exceedance: boolean;
    }>;
    tb_spread: Partial<{
      summary: boolean;
      details: boolean;
    }>;
  };
  analyticsError: {
    operations: Partial<{
      revenue: boolean | string;
      soc: boolean | string;
      market_summary: boolean | string;
      energy_price_comparison: boolean | string;
      battery_power_over_time: boolean | string;
    }>;
    market: Partial<{
      summary: boolean | string;
      utilization: boolean | string;
      revenue_distribution: boolean | string;
      best_markets: boolean | string;
      statistics: boolean | string;
    }>;
    market_prices: Partial<{
      spread: boolean | string;
      hourly_prices: boolean | string;
      price_volatility: boolean | string;
      correlation_matrix: boolean | string;
    }>;
    ancillary_services: Partial<{
      summary: boolean | string;
      revenue_breakdown: boolean | string;
      opportunity_cost: boolean | string;
      hourly_service_revenue: boolean | string;
    }>;
    imbalance: Partial<{
      summary: boolean | string;
      daily_breakdown: boolean | string;
      worst_days: boolean | string;
      hourly_charges: boolean | string;
    }>;
    battery_health: Partial<{
      summary: boolean | string;
      cycle_comparison: boolean | string;
      stratergy_cycle_comparison: boolean | string;
      annual_projection: boolean | string;
      daily_cycles: boolean | string;
      warranty_limit_exceedance: boolean | string;
    }>;
    tb_spread: Partial<{
      summary: boolean | string;
      details: boolean | string;
    }>;
  };

  // benchmark data
  benchmark: {
    industryComparison: {
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
    };
    revenueIARvsActual: Nullable<AssetBenchmarkRevenueActualvsIAR>;
    multiMarketOptmization: Nullable<AssetBenchmarkMultiMarketOptmizationVsActual>;
  };
  // benchmark error
  benchmarkError: {
    industryComparison: boolean | string;
    revenueIARvsActual: boolean | string;
    multiMarketOptmization: boolean | string;
  };
  benchmarkLoading: {
    industryComparison: boolean;
    revenueIARvsActual: boolean;
    multiMarketOptmization: boolean;
  };

  // executive analysis data
  executiveAnalysis: Partial<{
    summary: Nullable<AssetExecutiveAnalysis['summary']>;
    monthly_revenue_comparison: Nullable<AssetExecutiveAnalysis['monthly_revenue_comparison']>;
    revenue_by_stream: Nullable<AssetExecutiveAnalysis['revenue_by_stream']>;
  }>;
  executiveAnalysisError: {
    summary: boolean | string;
    monthly_revenue_comparison: boolean | string;
    revenue_by_stream: boolean | string;
  };
  executiveAnalysisLoading: {
    summary: boolean;
    monthly_revenue_comparison: boolean;
    revenue_by_stream: boolean;
  };

  // upload invoice data
  uploadInvoice: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
  };
  deleteInvoice: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
  };

  // upload invoice settlement data
  uploadInvoiceSettlement: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
  };
  deleteInvoiceSettlement: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
  };
}

export interface DigestSliceInitialState {
  isLoading: boolean;
  digestError: string | boolean;
  digestSuccess: string | boolean;

  digests: Digest[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;
}

export interface SettingsSliceInitialState {
  isLoading: boolean;
  settingsError: string | boolean;
  settingsSuccess: string | boolean;

  benchmarkLoading: boolean;
  benchmarkUpdateLoading: boolean;

  monthlyValuesLoading: boolean;
  monthlyValuesUpdateLoading: boolean;

  metrics: {
    industryBenchmarck: BenchmarkMetric[];
    monthlyMetricValues: {
      metric: Metric[];
      monthly_values: MetricMonthlyValues[];
    };
  };
}

export interface AuditLogSliceInitialState {
  isLoading: boolean;
  auditLogError: string | boolean;
  auditLogSuccess: string | boolean;
  auditLogs: APDAuditLog[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;
}

export interface InvoiceSliceInitialState {
  // keeping loading, error, success and data states for invoice list in a seperate object
  // instead of keeping centralized loading, error, success and data states for all invoice related data in this slice
  // this is part of new coding standard that need to be implement from now onwards.
  invoiceList: {
    invoicesLoading: boolean;
    assetId: Nullable<number>; // for which asset invoices are being fetched, for same assetId, loading will not be set to true again, until the assetId changes, this is to avoid flickering of invoice list when user is on same asset page and is fetching invoices again
    invoicesError: string | boolean;
    invoicesSuccess: string | boolean;
    data: Invoice[];
    totalPages: number;
    nextPage: number | null;
    currentPage: number;
    totalResults: number;
  };

  // keeping loading, error, success and data states for invoice summary in a seperate object
  summary: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
    data: {
      total_invoices: number;
      extraction_quality: Nullable<InvoiceExtractionQualitySummary>;
      category_summary: Nullable<InvoiceExtractionCategorySummary>;
    };
  };

  // invoice settlement list, with separate loading, error, success and data states
  settlementList: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
    data: InvoiceSettlement[];
    totalPages: number;
    nextPage: number | null;
    currentPage: number;
    totalResults: number;
  };

  capacityMarket: {
    loading: boolean;
    error: string | boolean;
    success: string | boolean;
    data: Nullable<AssetCapacityMarketAnalytics>;
  };
}
