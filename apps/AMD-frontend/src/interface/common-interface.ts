import type {
  APDAuditLogModules,
  APDAuditLogScenario,
  AssetBatteryCycleCalculationMethod,
  AssetFileType,
  AssetStatus,
  AssetSteps,
  AssetType,
  DigestFrequency,
  DigestScope,
  InvoiceType,
  Platform,
  UserRole,
  CommentContextType,
  CommentModule,
} from '@/constants';
import {AuditLog, MonthYear, Nullable, ScheduleTime} from '@lazarus/react-common/interface';
export {Auth, Nullable, AuditLog} from '@lazarus/react-common/interface';

// utlilities
export type ENV = 'loc' | 'dev' | 'qa' | 'uat' | 'prod';
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type SSEEvent = 'progress' | 'success' | 'error';

export type ActionWithCallback<T = unknown> = {onSuccess?: (data: T) => void; onFailure?: (data: T) => void};

export type AssetMarket = 'multi' | 'epex_daily' | 'epex_efa' | 'actual';

// =============================== Entities ===============================

export interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: {id: number; name: string};
  status: boolean;
  last_activity: string;
  platform?: Platform[];
}

export interface Organization {
  id: number;
  org_id: string;
  name: string;
  status: boolean;
  created_at: string;
}

export type AssetReportFile = {
  id: number;
  asset_id: number;
  name: string;
  size: number;
  uploaded_at: string;
  projection_summary: {
    start_timestamp: string;
    end_timestamp: string;
  };
  total_rows: number;
  type?: AssetFileType;
  month?: number;
  year?: number;
};

export interface AssetGenerateReport {
  id: number;
  asset_id: number;
  name: string;
  month: number;
  year: number;
}

export interface Asset {
  // Basic Information
  id: number;
  asset_id: string;
  name: string;
  type: AssetType;
  capacity: number;
  status: AssetStatus;
  current_step: AssetSteps;
  organization: {
    id: number;
    name: string;
  };
  country: {
    id: number;
    name: string;
  };
  location: string;

  // optmization params
  max_charging_rate?: number;
  max_discharging_rate?: number;
  usable_capacity?: number;
  soc_min?: number;
  soc_max?: number;
  round_trip_efficiency?: number;
  max_daily_cycles?: number;

  // asset files
  aggregator_report_file?: Nullable<AssetReportFile>;
  scada_report_file?: Nullable<AssetReportFile>;
  iar_report_file?: Nullable<AssetReportFile>;
  merged_dataset_file?: Nullable<AssetGenerateReport>;
  optimized_dataset_file?: Nullable<AssetGenerateReport>;

  // invoice files
  invoice_file?: Nullable<Invoice>;
  invoice_settlement_file?: Nullable<InvoiceSettlement>;
  invoice_summary_statement?: Nullable<InvoiceStatementSummary>;

  // meta data
  active_period: Nullable<MonthYear>;
  invoice_active_period: Nullable<MonthYear>;
  available_periods?: Array<MonthYear>;
  available_invoice_periods?: Array<MonthYear>;
  available_summary_statement_periods?: Array<MonthYear>;

  // attributes flags
  analysis_available?: boolean;
  has_iar?: boolean;
  is_asset_alert_seen_before?: boolean;

  // ownership info
  created_by: {
    id: number;
    name: string;
  };
  submitted_by: {
    id: number;
    name: string;
  };
  activated_by: {
    id: number;
    name: string;
  };

  // timestamps
  activated_at: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// asset analysis
export interface AssetOperationAnalytics {
  revenue: {
    trading_analysis: {
      sffr: number;
      ida1: number;
      epex_30_da: number;
      imbalance_revenue: number;
      imbalance_charge: number;
      net_imbalance: number;
      total_net_revenue: number;
    };
    revenue_distribution: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  };
  market_summary: {
    month: number;
    year: number;
    market_prices: {
      day_ahead: {
        avg: number;
        min: number;
        max: number;
        std_dev: number;
      };
      intraday: {
        avg: number;
        min: number;
        max: number;
      };
      spread: number;
    };
    trading_activity: {
      avg_da_mw: number;
      avg_epex_30_da_mw: number;
      avg_ida1_mw: number;
    };
    ancillary_services: Array<{
      service: string;
      avg_clearing_price: number;
      avg_availability_mw: number;
    }>;
  };
  energy_price_comparison: Array<{
    timestamp: string;
    day_ahead_price: number | null;
    intraday_price: number | null;
  }>;
  battery_power_over_time: Array<{
    timestamp: string;
    battery_power: number | null;
  }>;
}

export interface AssetMarketAnalytics {
  summary: {
    asset_id: number;
    month: number;
    year: number;
    epex_daily: {
      total_revenue: number;
      improvement: number;
    };
    epex_efa: {
      total_revenue: number;
      improvement: number;
    };
    multi_market: {
      total_revenue: number;
      improvement: number;
    };
    additional_revenue: number;
    actual_revenue: number;
  };
  utilization: {
    asset_id: number;
    month: number;
    year: number;
    market_strategy: AssetMarket;
    data: Array<{
      market_used: string;
      count: number;
      percentage: number;
      total_revenue: number;
    }>;
  };
  revenue_distribution: {
    asset_id: number;
    month: number;
    year: number;
    market_strategy: string;
    chart_data: [
      {
        market: string;
        revenue: number;
      },
    ];
  };
  best_markets: {
    asset_id: number;
    month: number;
    year: number;
    buying_markets: Array<{
      market: string;
      times_selected: number;
      percentage: number;
    }>;
    selling_markets: Array<{
      market: string;
      times_selected: number;
      percentage: number;
    }>;
  };
  statistics: {
    asset_id: number;
    month: number;
    year: number;
    market_strategy: AssetMarket;
    total_periods: number;
    total_revenue: number;
    rows: Array<{
      market: string;
      periods: number;
      percentage_time: number;
      revenue: number;
      percentage_revenue: number;
    }>;
  };
}

export interface AssetMarketPriceAnalytics {
  spread: {
    asset_id: number;
    month: number;
    year: number;
    price_summary: {
      epex_da_avg_price_per_mwh: number;
      epex_da_max_price_per_mwh: number;
      ssp_max_price_per_mwh: number;
      sbp_max_price_per_mwh: number;
    };
    spread_analysis: {
      epex_avg_daily_spread_per_mwh: number;
      epex_max_daily_spread_per_mwh: number;
      avg_ssp_sbp_spread_per_mwh: number;

      daily_epex_spread: [
        {
          date: string;
          spread: number;
        },
      ];
    };
  };
  hourly_prices: {
    asset_id: number;
    month: number;
    year: number;
    lowest_avg_epex_price_per_mwh: number;
    best_buy_hour: number;
    highest_avg_epex_price_per_mwh: number;
    best_sell_hour: number;
    hourly_arbitrage_per_mwh: number;
    hourly_price_patterns: [
      {
        hour: number;
        epex_da: number;
        ssp: number;
        sbp: number;
      },
    ];
  };
  price_volatility: {
    asset_id: number;
    month: number;
    year: number;

    threshold: number;

    kpi: {
      average_daily_volatility: number;
      high_volatility_days: number;

      max_volatility: {
        value: number;
        date: string;
      };
    };

    chart_data: [
      {
        date: string;
        std_deviation: number;
        threshold: number;
      },
    ];
  };
  correlation_matrix: {
    asset_id: number;
    month: number;
    year: number;

    correlation_matrix: {
      markets: string[];
      matrix: number[][];
    };
  };
}

export interface AssetAncillaryServiceAnalytics {
  summary: {
    asset_id: number;
    month: number;
    year: number;
    summary: {
      total_ancillary_revenue: number;
      top_service: string;
      services_used: number;
      total_services: number;
      top_service_share: number;
    };
  };
  revenue_breakdown: {
    asset_id: string;
    month: string;
    year: string;

    service_breakdown: Array<{
      service: string;
      service_name: string;
      total_revenue: number | null;
      periods_active: number | null;
      avg_price: number | null;
      revenue_per_mwh: number | null;
    }>;
  };
  opportunity_cost: {
    asset_id: number;
    month: number;
    year: number;
    opportunity_cost_analysis: {
      current_avg_rate: number;
      best_service_rate: number;
      opportunity_cost: number;
      best_service: string;
    };
  };
  hourly_service_revenue: {
    asset_id: number;
    month: number;
    year: number;
    hourly_revenue: Array<{
      hour: number;
      services: Array<{
        service: string;
        revenue: number;
      }>;
    }>;
  };
}

export interface AssetImbalanceAnalytics {
  summary: {
    asset_id: number;
    month: number;
    year: number;
    summary: {
      imbalance_revenue: number;
      revenue_periods: number;
      imbalance_charges: number;
      charge_periods: number;
      net_imbalance: number;
      status: string;
      percentage_of_periods_with_charges: number;
    };
  };
  daily_breakdown: {
    asset_id: number;
    month: number;
    year: number;
    daily_breakdown: Array<{
      date: string;
      daily_revenue: number;
      daily_charges: number;
      daily_net_imbalance: number;
    }>;
  };
  worst_days: {
    asset_id: number;
    month: number;
    year: number;

    worst_days: Array<{
      date: string;
      revenue: number;
      charges: number;
      net_imbalance: number;
    }>;
  };
  hourly_charges: {
    peak_imbalance_hour: {
      hour: string;
      total_charges: number;
    };
    hourly_breakdown: [
      {
        hour: string;
        total_charges: number;
      },
    ];
  };
}

export interface AssetBatteryHealthAnalytics {
  summary: {
    asset_id: number;
    month: number;
    year: number;
    battery_health: {
      actual_discharge_energy: number;
      optimized_multi_market_discharge_energy: number;
      actual_charge_energy: number;
      optimized_multi_market_charge_energy: number;
    };
  };
  cycle_comparison: {
    asset_id: number;
    month: number;
    year: number;
    battery_capacity: number;
    number_of_days: number;
    cycle_comparison: Array<{
      method_key: AssetBatteryCycleCalculationMethod;
      method_name: AssetBatteryCycleCalculationMethod;
      actual_total_cycles: number;
      multi_market_total_cycles: number;
      actual_daily_avg: number;
      multi_market_daily_avg: number;
    }>;
  };
  stratergy_cycle_comparison: {
    asset_id: number;
    month: number;
    year: number;
    cycle_method: string;
    battery_capacity: number;
    number_of_days: number;
    degradation_per_cycle_percentage: number;
    warranty_threshold: number;
    strategy_cycling_comparison: Array<{
      strategy: AssetMarket;
      total_discharge_mwh: number;
      total_cycle: number;
      daily_cycle: number;
      degradation_percent: number;
      is_warranty_exceeded: boolean;
    }>;
  };
  annual_projection: {
    asset_id: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
    annual_degradation_limit: number;
    warranty_limit: number;
    degradation_per_cycle: number;
    annual_projection_report: Array<{
      strategy: AssetMarket;
      projected_annual_cycles: number;
      projected_annual_degradation: number;
      estimated_battery_lifespan: number;
    }>;
  };
  daily_cycles: {
    asset_id: number;
    month: number;
    year: number;
    cycle_method: string;
    warranty_limit: number;
    actual: {
      avg_cycles: number;
      max_cycles: number;
      max_cycles_date: string; // dd-mm-yyyy
    };
    multi_market: {
      avg_cycles: number;
      max_cycles: number;
      max_cycles_date: string; // dd-mm-yyyy
    };
    daily_cycles: Array<{
      actual_daily_cycles: number;
      multi_market_daily_cycles: number;
      date: string; // dd-mm-yyyy
    }>;
  };
  warranty_limit_exceed: {
    asset_id: number;
    month: number;
    year: number;
    cycle_method: AssetBatteryCycleCalculationMethod;
    warranty_limit: number;
    warranty_exceedance: {
      actual: Array<{
        date: string; // dd-mm-yyyy
        daily_cycles: number;
        over_limit: number;
      }>;
      multi_market: Array<{
        date: string; // dd-mm-yyyy
        daily_cycles: number;
        over_limit: number;
      }>;
    };
  };
}

export interface AssetTBSpreadAnalytics {
  summary: {
    asset_id: number;
    month: number;
    year: number;
    avg_tb1: number;
    avg_tb2: number;
    avg_tb3: number;
    avg_arbitrage_revenue: number;
    tb2_capture_rate: number;
    tb_spread_benchmark: number | null;
    benchmark_gap: number | null;
  };
  details: {
    asset_id: number;
    month: number;
    year: number;
    tb_spread_benchmark: number | null;
    tb_spread: Array<{
      date: string;
      tb1: number;
      tb2: number;
      tb3: number;
      arbitrage_revenue: number;
      capture_rate: number;
    }>;
  };
}

// asset benchmark
export interface AssetBenchmarkRevenueActualvsIAR {
  asset_id: number;
  year: number;

  monthly_data: Record<
    string,
    {
      streams: Array<{
        revenue_stream: string;
        iar_revenue: number;
        actual_revenue: number;
        variance_percentage: number | null;
      }>;

      total_excluding_bm_tnuos: {
        iar_revenue: number;
        actual_revenue: number;
        variance_percentage: number;
      };

      total_all_streams: {
        iar_revenue: number;
        actual_revenue: number;
        variance_percentage: number;
      };
    }
  >;
}

export interface AssetBenchmarkMultiMarketOptmizationVsActual {
  asset_id: number;
  year: number;
  monthly_data: Record<
    string,
    {
      revenue_streams: Array<{
        revenue_stream: string;
        actual_revenue: number | null;
        optimized_revenue: number | null;
      }>;

      totals: {
        total_actual_revenue: number | null;
        total_optimized_revenue: number | null;
        revenue_gap: number | null;
        capture_rate: number | null;
      };
    }
  >;
}

// ===============================
// Executive Analysis
// ===============================
export interface AssetExecutiveAnalysis {
  summary: {
    asset_id: number;
    year: number;
    strongest_month: Nullable<{
      month: number;
      capture_rate: number | null;
      revenue_gap: number | null;
      imbalance: number | null;
    }>;
    weakest_month: Nullable<{
      month: number;
      capture_rate: number | null;
      revenue_gap: number | null;
      imbalance: number | null;
    }>;
  };
  monthly_revenue_comparison: {
    asset_id: number;
    year: number;
    monthly_comparison: Array<{
      month: number;
      actual_revenue: number | null;
      capacity_market: number | null;
      duos_net_credit: number | null;
      total_revenue: number | null;
      optimized_revenue: number | null;
      net_imbalance: number | null;
      revenue_gap: number | null;
      capture_rate: number | null;
    }>;
  };
  revenue_by_stream: {
    asset_id: number;
    year: number;
    monthly_comparison: Array<{
      month: number;
      sffr: number | null;
      epex: number | null;
      ida1: number | null;
      idc: number | null;
      imbalance: number | null;
      asset_sub_total: number | null;
      capacity_market: number | null;
      duos_net_credit: number | null;
      total_revenue: number | null;
    }>;
  };
}

// ===============================
// Digest Management Entities
// ===============================
export interface DigestResource {
  id: number;
  name: string;
}

export interface DigestRecipient {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Digest {
  id: number;
  digest_id: string;
  name: string;
  scope: {
    id: DigestScope;
    label?: string;
  };
  frequency: {
    id: DigestFrequency;
    label?: string;
  };
  schedule: ScheduleTime;
  resources: DigestResource[];
  recipients: DigestRecipient[];
  status: boolean;
  created_at: string;
  updated_at: string;
}

// ===============================
// Metric Entities
// ===============================
export interface Metric {
  id: number;
  metric_name: string;
  created_at?: string;
}

export interface BenchmarkMetric extends Metric {
  metric_id: number;
  industry_low: Nullable<number>;
  industry_mid: Nullable<number>;
  industry_high: Nullable<number>;
}

export interface MetricMonthlyValues extends Metric {
  metric_id: number;
  month: number;
  year: number;
  value: number | null;
}

export interface MetricMonthlyValueTabluar {
  id: number;
  metric_name?: string;
  columns: Array<{
    month: MetricMonthlyValues['month'];
    year: MetricMonthlyValues['year'];
    value: MetricMonthlyValues['value'];
  }>;
}

// ===============================
// Invoices
// ===============================
export interface Invoice {
  id: number;
  invoice_file_name: string;
  invoice_file_size?: number;
  type: InvoiceType;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount: number | null;
  capacity_payment_month?: number | null;
  capacity_payment_year?: number | null;
  uploaded_on?: string;
  extraction_status?: string;
  month?: number;
  year?: number;
}

export interface InvoiceExctractionQualitySummaryDataPoint {
  extracted: number;
  total: number;
  missing: number;
  percentage: number;
}
export interface InvoiceExtractionQualitySummary {
  invoice_number: InvoiceExctractionQualitySummaryDataPoint;
  invoice_date: InvoiceExctractionQualitySummaryDataPoint;
  invoice_amount: InvoiceExctractionQualitySummaryDataPoint;
}
export type InvoiceExtractionCategorySummary = Array<{
  type: InvoiceType;
  count: number;
}>;

export type UploadInvoiceProgress = {
  step: number;
  message: string;
  description: string;
};

export type InvalidInvoiceFile = {
  file_name: string;
  reason: string;
};

export type InvoiceSettlement = {
  id: number;
  settlement_file_name: string;
  settlement_file_size: number;
  extracted_invoice_number: string;
  extracted_invoice_date: string;
  invoice_payment_date: string;
  uploaded_on: string;
  month: number;
  year: number;
};

export type InvoiceStatementSummary = {
  id: number;
  summary_id: string;
  file_name: string;
  file_size: number;
  uploaded_on: string;
  month: number;
  year: number;
  revenue_values: {
    total_energy_revenue: number;
    total_ancillary_revenue: number;
    reported_net_revenue: number;
  };
};

// ===============================
// Invoice Analysis
// ===============================
export interface AssetCapacityMarketAnalytics2 {
  summary: {
    asset_id: number;
    asset_name: string;
    year: number;
    month: number | null;
    has_data: boolean;
    kpis?: {
      capacity_payments: number | null;
      emr_invoices: number | null;
      average_monthly_payment: number | null;
    };
  };
  payment_trend: {
    asset_id: number;
    asset_name: string;
    year: number;
    month: number | null;
    has_data: boolean;
    payment_trend: Array<{
      month: number;
      monthly_payment: number | null;
      cumulative_payment: number | null;
    }>;
  };
  payments: {
    asset_id: number;
    asset_name: string;
    year: number;
    month: number | null;
    has_data: boolean;
    capacity_market_payments: Array<{
      invoice_id: number;
      capacity_month: number;
      capacity_year: number;
      invoice_number: string | null;
      invoice_date: string | null;
      payment_date: string | null;
      amount: number | null;
      absolute_amount: number | null;
    }>;
  };
}


export interface AssetInvoiceRevenueReconciliation {
  summary: {
    asset_id: number;
    asset_name: string;
    year: number;
    gross_revenue?: number | null;
    gridbeyond_fee?: number | null;
    expected_net?: number | null;
    reported_net?: number | null;
    variance?: number | null;
    has_data?: boolean;
  };
  per_stream_comparison: {
    asset_id: number;
    asset_name: string;
    year: number;
    per_stream_comparison: Array<{
      stream: string;
      gross_revenue: number;
      expected_net: number;
      reported_net: number;
      variance: number;
      variance_percentage: number;
      monthly_breakdown: Array<{
        month: number;
        gross_revenue: number;
        expected_net: number;
        reported_net: number;
        variance: number;
        variance_percentage: number;
      }>;
    }>;
    total_stream_data: {
      gross_revenue: number;
      expected_net: number;
      reported_net: number;
      variance: number;
      variance_percentage: number;
    };
  };
}

// ===============================
// APD Audit Logs
// ===============================
// custom APD-specific audit log interface that extends the common AuditLog interface, with module and action typed as APDAuditLogModules and APDAuditLogScenario respectively
export interface APDAuditLog extends Omit<AuditLog, 'module' | 'action'> {
  module: {
    id: APDAuditLogModules;
    name: string;
  };
  action: {
    id: APDAuditLogScenario;
    name: string;
  };
}

// ===============================
// Comments
// ===============================

export interface CommentContentBlock {
  text?: string;
  user?: {
    id: number;
    name: string;
  };
  user_id?: number;
  type: 'text' | 'mention';
}

export interface Comment {
  id: number;
  comment_id?: string;
  parent_comment_id?: number | null;
  title: string;
  content: CommentContentBlock[];
  owner: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  is_read?: boolean;
  is_owner?: boolean;
  replies?: Comment[];

  // Context mapping fields
  context_type: CommentContextType | string;
  context_module: CommentModule | string | null;
  context_tab: string | null;
  context_widget: string | null;
  context_data_point: string | null;
  context_asset_id: number | null;
  context_year: number | null;
  context_month: number | null;
}

export type CreateCommentPayload = Pick<
  Comment,
  | 'title'
  | 'content'
  | 'parent_comment_id'
  | 'context_type'
  | 'context_module'
  | 'context_tab'
  | 'context_widget'
  | 'context_data_point'
  | 'context_asset_id'
  | 'context_year'
  | 'context_month'
>;

// ===============================
// Notifications
// ===============================

export interface NotificationMeta {
  comment_id: string;
  asset_id: number;
  context_type: number | string;
  context_module: string | null;
  context_tab: string | null;
  context_widget: string | null;
  context_year?: number | null;
  context_month?: number | null;
  context_data_point?: string | null;
}

export interface NotificationData {
  id: number;
  notification_id: string;
  owner: {
    id: number;
    name: string;
  };
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  meta: NotificationMeta;
}

export interface SocketEvent {
  type?: string;
  [key: string]: any;
}
