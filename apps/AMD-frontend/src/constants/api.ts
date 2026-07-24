import {type ApiConfigInterface} from '@/interface';
const {
  VITE_APP_API_URL_LOC,
  VITE_APP_API_URL_DEV,
  VITE_APP_API_URL_QA,
  VITE_APP_API_URL_UAT,
  VITE_APP_API_URL_PROD,
  VITE_APP_WEB_APP_URL_LOC,
  VITE_APP_WEB_APP_URL_DEV,
  VITE_APP_WEB_APP_URL_QA,
  VITE_APP_WEB_APP_URL_UAT,
  VITE_APP_WEB_APP_URL_PROD,
  VITE_APP_ENV,
} = import.meta.env;

export const API: ApiConfigInterface = {
  currentEnv: VITE_APP_ENV, // API server environment: <loc, dev, qa, uat, prod>
  baseUrls: {
    loc: VITE_APP_API_URL_LOC as string,
    dev: VITE_APP_API_URL_DEV as string,
    qa: VITE_APP_API_URL_QA as string,
    uat: VITE_APP_API_URL_UAT as string,
    prod: VITE_APP_API_URL_PROD as string,
  },
  webAppUrls: {
    loc: VITE_APP_WEB_APP_URL_LOC as string,
    dev: VITE_APP_WEB_APP_URL_DEV as string,
    qa: VITE_APP_WEB_APP_URL_QA as string,
    uat: VITE_APP_WEB_APP_URL_UAT as string,
    prod: VITE_APP_WEB_APP_URL_PROD as string,
  },
  noAuthUrls: {
    demo: 'api/v1/demo',
    login: 'api/v1/auth/login/send-otp',
    verifyOtp: 'api/v1/auth/login/verify-otp',
  },
  authUrls: {
    // auth related APIs
    logout: 'api/v1/auth/logout',

    // users related APIs
    users: 'api/v1/users/',
    user_id: (id: number) => `api/v1/users/${id}`,
    user_organization: (userId: number) => `/api/v1/users/${userId}/organization`,

    // organization related APIs
    organization: 'api/v1/organizations/',
    organization_id: (id: number) => `api/v1/organizations/${id}`,
    organization_multiple_users: `api/v1/organizations/users`,

    // Asset related APIs
    assets: 'api/v1/assets/',
    asset_id: (id: number) => `api/v1/assets/${id}`,
    asset_optimization_parameters: (id: number) => `api/v1/assets/${id}/optimization-parameters`,
    asset_organization: (assetId: number) => `api/v1/assets/${assetId}/organization`,
    asset_multiple_users: `api/v1/assets/users`,
    asset_aggregator_report_upload: (assetId: number) => `api/v1/assets/${assetId}/aggregator-report`,
    asset_scada_report_upload: (assetId: number) => `api/v1/assets/${assetId}/scada-report`,
    asset_solar_report_upload: (assetId: number) => `api/v1/assets/${assetId}/solar-report`,
    asset_merge_dataset: (assetId: number) => `api/v1/assets/${assetId}/merge-dataset`,
    asset_optimized_dataset: (assetId: number) => `api/v1/assets/${assetId}/optimized-dataset`,
    asset_merged_dataset_download: (assetId: number) => `api/v1/assets/${assetId}/merged-dataset/download`,
    asset_iar_report: (assetId: number) => `api/v1/assets/${assetId}/iar-report`,
    asset_submit: (assetId: number) => `api/v1/assets/${assetId}/submit`,
    asset_activate: (assetId: number) => `api/v1/assets/${assetId}/activate`,
    asset_files: (assetId: number) => `api/v1/assets/${assetId}/files`,
    asset_files_id: (assetId: number, fileId: number) => `api/v1/assets/${assetId}/files/${fileId}`,
    asset_files_download: (assetId: number, fileId: number) => `api/v1/assets/${assetId}/files/${fileId}/export`,

    // asset analysis-operations related APIs
    asset_analysis_operations_summary: (assetId: number) => `api/v1/assets/${assetId}/analysis/operations/summary`,
    asset_analysis_soc_distribution: (assetId: number) => `api/v1/assets/${assetId}/analysis/soc-distribution`,
    asset_analysis_operations_market_summary: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/operations/market-summary`,
    asset_analysis_operations_energy_price: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/operations/energy-price`,
    asset_analysis_operations_battery_power_over_time: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/operations/battery-power-over-time`,

    // asset analysis-ancillary related APIs
    asset_analysis_ancillary_summary: (assetId: number) => `api/v1/assets/${assetId}/analysis/ancillary/summary`,
    asset_analysis_ancillary_revenue_breakdown: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/ancillary/revenue-breakdown`,
    asset_analysis_ancillary_revenue_breakdown_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/ancillary/revenue-breakdown/export`,
    asset_analysis_ancillary_opportunity_cost_analysis: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/ancillary/opportunity-cost-analysis`,
    asset_analysis_ancillary_service_revenue_by_hour: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/ancillary/service-revenue-by-hour`,

    // asset analysis imabalance related APIs
    asset_analysis_imbalance_summary: (assetId: number) => `api/v1/assets/${assetId}/analysis/imbalance/summary`,
    asset_analysis_imbalance_daily_breakdown: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/imbalance/daily-breakdown`,
    asset_analysis_imbalance_worst_days: (assetId: number) => `api/v1/assets/${assetId}/analysis/imbalance/worst-days`,
    asset_analysis_imbalance_hourly_charges: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/imbalance/hourly-charges`,
    asset_analysis_imbalance_worst_days_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/imbalance/worst-days/export`,

    // asset analysis battery health related APIs
    asset_analysis_battery_health_summary: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/summary`,
    asset_analysis_battery_health_cycle_comparison: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/cycle-comparison`,
    asset_analysis_battery_health_strategy_cycling_comparison: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/strategy-cycling-comparison`,
    asset_analysis_battery_health_annual_projection_report: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/annual-projection-report`,
    asset_analysis_battery_health_daily_cycles: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/daily-cycles`,
    asset_analysis_battery_health_warranty_exceedance: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/battery-health/warranty-exceedance`,

    // asset analysis-tb spread related APIs
    asset_analysis_tb_spread_summary: (assetId: number) => `api/v1/assets/${assetId}/analysis/tb-spread/summary`,
    asset_analysis_tb_spread_details: (assetId: number) => `api/v1/assets/${assetId}/analysis/tb-spread/details`,
    asset_analysis_tb_spread_details_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/tb-spread/details/export`,

    // asset analysis-benchmark related APIs
    asset_analysis_benchmark_industry: (assetId: number) => `api/v1/assets/${assetId}/analysis/benchmark`,
    asset_analysis_benchmark_industry_export: (assetId: number) => `api/v1/assets/${assetId}/analysis/benchmark/export`,
    asset_benchmark_revenue_iar_vs_actual: (assetId: number) =>
      `api/v1/assets/${assetId}/benchmark/revenue-iar-vs-actual`,
    asset_benchmark_revenue_iar_vs_actual_export: (assetId: number) =>
      `api/v1/assets/${assetId}/benchmark/revenue-iar-vs-actual/export`,
    asset_benchmark_multi_market_optimized_vs_actual: (assetId: number) =>
      `api/v1/assets/${assetId}/benchmark/multi-market-optimized-vs-actual`,
    asset_benchmark_multi_market_optimized_vs_actual_export: (assetId: number) =>
      `api/v1/assets/${assetId}/benchmark/multi-market-optimized-vs-actual/export`,

    // asset analysis-market related APIs
    asset_analysis_market_summary: (assetId: number) => `api/v1/assets/${assetId}/analysis/market/summary`,
    asset_analysis_market_statistics: (assetId: number) => `api/v1/assets/${assetId}/analysis/market/statistics`,
    asset_analysis_market_statistics_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/market/statistics/export`,
    asset_analysis_market_price_spread: (assetId: number) => `api/v1/assets/${assetId}/analysis/market/price-spread`,
    asset_analysis_market_price_volatility: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/market-price/volatility`,
    asset_analysis_market_price_correlation_matrix: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/price/correlation-matrix`,
    asset_analysis_market_utilization: (assetId: number) => `api/v1/assets/${assetId}/analysis/market/utilization`,
    asset_analysis_market_best_markets: (assetId: number) => `api/v1/assets/${assetId}/analysis/market/best-markets`,
    asset_analysis_market_best_markets_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/market/best-markets/export`,
    asset_analysis_market_revenue_distribution: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/market/revenue-distribution`,
    asset_analysis_solar_kpi_vitals: (assetId: number) => `api/v1/assets/${assetId}/analysis/solar/kpi-vitals`,
    asset_analysis_solar_generation_split: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/solar/generation-split`,
    asset_analysis_market_hourly_price_patterns: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/market/hourly-price-patterns`,

    // executive analysis related APIs
    asset_executive_analysis_monthly_revenue_comparison: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/executive-comparison/monthly-revenue-comparison`,
    asset_executive_analysis_monthly_revenue_comparison_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/executive-comparison/monthly-revenue-comparison/export`,
    asset_executive_analysis_revenue_by_stream: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/executive-comparison/revenue-by-stream`,
    asset_executive_analysis_revenue_by_stream_export: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/executive-comparison/revenue-by-stream/export`,
    asset_executive_analysis_summary: (assetId: number) =>
      `api/v1/assets/${assetId}/analysis/executive-comparison/summary`,

    // settings related APIs
    metrics_benchmarks: '/api/v1/metrics/benchmarks',
    metrics_monthly_values: '/api/v1/metrics/monthly-values',
    modo_benchmark_monthly_value: '/api/v1/metrics/modo/benchmarking/monthly-index-live',

    // audit log related APIs
    audit_logs: 'api/v1/audit-logs/',

    // digest related APIs
    digests: 'api/v1/digests/',
    digest_id: (digestId: string) => `api/v1/digests/${digestId}`,

    // assets invoices slice
    asset_invoices: (assetId: number) => `api/v1/assets/${assetId}/invoices/`,
    asset_invoices_summary: (assetId: number) => `api/v1/assets/${assetId}/invoices/summary`,
    asset_invoices_id: (assetId: number, invoiceId: number) => `api/v1/assets/${assetId}/invoices/${invoiceId}`,
    asset_invoices_id_preview: (assetId: number, invoiceId: number) =>
      `api/v1/assets/${assetId}/invoices/${invoiceId}/preview`,
    asset_invoices_id_export: (assetId: number, invoiceId: number) =>
      `api/v1/assets/${assetId}/invoices/${invoiceId}/export`,
    asset_invoices_export: (assetId: number) => `api/v1/assets/${assetId}/invoices/export`,

    asset_invoices_settlement: (assetId: number) => `api/v1/assets/${assetId}/invoices/settlement`,
    asset_invoices_settlement_id: (assetId: number, settlementId: number) =>
      `api/v1/assets/${assetId}/invoices/settlement/${settlementId}`,
    asset_invoices_settlement_id_export: (assetId: number, settlementId: number) =>
      `api/v1/assets/${assetId}/invoices/settlement/${settlementId}/export`,

    asset_invoice_analysis_capacity_market: (assetId: number) =>
      `api/v1/assets/${assetId}/invoice-analysis/capacity-market`,
    asset_invoice_analysis_capacity_market_export: (assetId: number) =>
      `api/v1/assets/${assetId}/invoice-analysis/capacity-market/export`,
  },
};
