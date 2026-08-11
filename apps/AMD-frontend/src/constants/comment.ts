export enum CommentContextType {
  Screen = 1,
  Widget = 2,
  DataPoint = 3,
  Tab = 4,
}

export enum WidgetType {
  Chart = 1,
  Table,
  KPI,
}

export enum CommentModule {
  ExecutiveAnalysis = 'ExecutiveAnalysis',
  ViewAnalysis = 'ViewAnalysis',
  BenchmarkAnalysis = 'BenchmarkAnalysis',
  InvoiceAnalysis = 'InvoiceAnalysis',
}

export interface WidgetConfig {
  id: string;
  name: string;
  type: WidgetType;
}

export interface TabConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
}

export interface ModuleConfig {
  name: string;
  tabs: TabConfig[] | null;
  widgets?: WidgetConfig[];
}

export type AppModuleHierarchyType = Record<CommentModule, ModuleConfig>;

export interface CommentContextRequirements {
  requiresTab: boolean;
  requiresWidget: boolean;
  requiresDataPoint: boolean;
}

export type CommentContextMapType = Record<CommentContextType, CommentContextRequirements>;

export const COMMENT_CONTEXT_MAP: CommentContextMapType = {
  [CommentContextType.Screen]: {
    requiresTab: false,
    requiresWidget: false,
    requiresDataPoint: false,
  },
  [CommentContextType.Tab]: {
    requiresTab: true,
    requiresWidget: false,
    requiresDataPoint: false,
  },
  [CommentContextType.Widget]: {
    requiresTab: true,
    requiresWidget: true,
    requiresDataPoint: false,
  },
  [CommentContextType.DataPoint]: {
    requiresTab: true,
    requiresWidget: true,
    requiresDataPoint: true, // This will store the X value (e.g., "Year 2025")
  },
};

/**
 * Strongly typed payload for data point comments.
 * Maps specific widgets to their expected data point format to ensure mismatches cannot happen.
 */

// ==========================================
// ENUMS FOR MODULES, TABS, AND WIDGETS
// ==========================================

export enum ViewAnalysisTabs {
  Operations = 'operations',
  MarketOptimization = 'market-optimization',
  MarketPrices = 'market-prices',
  AncillaryServices = 'ancillary-services',
  ImbalanceAnalysis = 'imbalance-analysis',
  BatteryHealth = 'battery-health',
  TBSpread = 'tb-spread',
  SolarGeneration = 'solar-generation',
}

export enum ViewAnalysisWidgets {
  RevenueSourcesDistribution = 'revenue-sources-distribution',
  MarketPricesAnalysis = 'market-prices-analysis',
  AncillaryServicesPricing = 'ancillary-services-pricing',
  EnergyPricesComparison = 'energy-prices-comparison',
  BatteryPowerOverTime = 'battery-power-over-time',
  MarketSelectionDistribution = 'market-selection-distribution',
  RevenueDistribution = 'revenue-distribution',
  MarketStatistics = 'market-statistics',
  MarketSelectedCharging = 'market-selected-charging',
  MarketSelectedDischarging = 'market-selected-discharging',
  DailyEpexSpread = 'daily-epex-spread',
  AveragePriceHourDay = 'average-price-hour-day',
  DailyVolatility = 'daily-volatility',
  MarketPriceCorrelation = 'market-price-correlation',
  RevenueByAncillaryService = 'revenue-by-ancillary-service',
  AncillaryServiceBreakdown = 'ancillary-service-breakdown',
  ServiceRevenueByHour = 'service-revenue-by-hour',
  DailyImbalanceRevenue = 'daily-imbalance-revenue',
  Top5WorstImbalance = 'top-5-worst-imbalance',
  ImbalanceChargesByHour = 'imbalance-charges-by-hour',
  CycleComparison = 'cycle-comparison',
  DailyCycleComparison = 'daily-cycle-comparison',
  MonthlyDegradationComparison = 'monthly-degradation-comparison',
  EnergyThroughputAnalysis = 'energy-throughput-analysis',
  StrategyEnergyThroughput = 'strategy-energy-throughput',
  EstimatedBatteryLifespan = 'estimated-battery-lifespan',
  ActualOperationVsOptimized = 'actual-operation-vs-optimized',
  WarrantyLimitExceedance = 'warranty-limit-exceedance',
  DailyTbSpreadTrend = 'daily-tb-spread-trend',
  DailyTbSpreadDetails = 'daily-tb-spread-details',
  SolarKpiVitals = 'solar-kpi-vitals',
  SolarGenerationSplit = 'solar-generation-split',
}

export enum BenchmarkAnalysisTabs {
  RevenueVsBenchmarks = 'revenue-vs-benchmarks',
  RevenueIarVsActual = 'revenue-iar-vs-actual',
  OptimizedVsActual = 'optimized-vs-actual',
}

export enum BenchmarkAnalysisWidgets {
  BenchmarkSelection = 'benchmark-selection',
  MonthlyTotalRevenueVsIar = 'monthly-total-revenue-vs-iar',
  MonthlyTotalRevenueVsIarChart = 'monthly-total-revenue-vs-iar-chart',
  IarVsActualRevenueByStream = 'iar-vs-actual-revenue-by-stream',
  IarVsActualVariance = 'iar-vs-actual-variance',
  MonthlyActualVsOptimized = 'monthly-actual-vs-optimized',
  StreamWiseOptimized = 'stream-wise-optimized',
  MonthlyRevenueComparisonTable = 'monthly-revenue-comparison-table',
}

export enum ExecutiveAnalysisWidgets {
  ActualVsOptimal = 'actual-vs-optimal',
  MonthlyRevenueComparison = 'monthly-revenue-comparison',
  ActualRevenueByStream = 'actual-revenue-by-stream',
  MonthlyRevenueByStream = 'monthly-revenue-by-stream',
}

export enum InvoiceAnalysisTabs {
  PdfInvoices = 'pdf-invoices',
  CapacityMarket = 'capacity-market',
  RevenueReconciliation = 'revenue-reconciliation',
}

export enum InvoiceAnalysisWidgets {
  CapacityAgreementDetails = 'capacity-agreement-details',
  PaymentTrend = 'payment-trend',
  CapacityMarketPaymentsTable = 'capacity-market-payments-table',
  RevenueByStreamComparison = 'revenue-by-stream-comparison',
  PerStreamComparisonTable = 'per-stream-comparison-table',
}

export type WidgetDataPointPayload =
  // ========================================
  // VIEW ANALYSIS MODULE
  // ========================================
  // Tab: Market Prices
  | {context_widget: ViewAnalysisWidgets.DailyEpexSpread; context_data_point: string} // Expected: ISO Date string (YYYY-MM-DD)
  | {context_widget: ViewAnalysisWidgets.DailyVolatility; context_data_point: string} // Expected: ISO Date string (YYYY-MM-DD)
  // Tab: Imbalance Analysis
  | {context_widget: ViewAnalysisWidgets.DailyImbalanceRevenue; context_data_point: string}
  | {context_widget: ViewAnalysisWidgets.ImbalanceChargesByHour; context_data_point: string}
  // Tab: Ancillary Services
  | {context_widget: ViewAnalysisWidgets.ServiceRevenueByHour; context_data_point: string}

  // ========================================
  // BENCHMARK ANALYSIS MODULE
  // ========================================
  // Tab: Revenue vs Benchmarks
  | {context_widget: BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart; context_data_point: string}
  | {context_widget: BenchmarkAnalysisWidgets.IarVsActualRevenueByStream; context_data_point: string}
  // Tab: Optimized vs Actual
  | {context_widget: BenchmarkAnalysisWidgets.MonthlyActualVsOptimized; context_data_point: string}
  | {context_widget: BenchmarkAnalysisWidgets.StreamWiseOptimized; context_data_point: string}

  // ========================================
  // EXECUTIVE ANALYSIS MODULE
  // ========================================
  | {context_widget: ExecutiveAnalysisWidgets.ActualVsOptimal; context_data_point: string}

  // ========================================
  // INVOICE ANALYSIS MODULE
  // ========================================
  // Tab: Capacity Market
  | {
      context_widget: InvoiceAnalysisWidgets.PaymentTrend;
      context_data_point: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
    }
  // Tab: Revenue Reconciliation
  | {
      context_widget: InvoiceAnalysisWidgets.RevenueByStreamComparison;
      context_data_point: string;
    };

/**
 * Exhaustive Global Application Hierarchy mapping
 * Maps Modules -> Tabs -> Specific Widgets (Charts/Tables/KPIs) based on frontend architecture
 */
export const APP_MODULE_HIERARCHY: AppModuleHierarchyType = {
  [CommentModule.ViewAnalysis]: {
    name: 'View Analysis',
    tabs: [
      {
        id: ViewAnalysisTabs.Operations,
        name: 'Operations',
        widgets: [
          // Tables
          {
            id: ViewAnalysisWidgets.RevenueSourcesDistribution,
            name: 'Revenue Sources Distribution',
            type: WidgetType.Table,
          },
          {id: ViewAnalysisWidgets.MarketPricesAnalysis, name: 'Market Prices Analysis', type: WidgetType.Table},
          // Tables
          {
            id: ViewAnalysisWidgets.AncillaryServicesPricing,
            name: 'Ancillary Services Pricing',
            type: WidgetType.Table,
          },
          // Charts
          {id: ViewAnalysisWidgets.EnergyPricesComparison, name: 'Energy Prices Comparison', type: WidgetType.Chart},
          {id: ViewAnalysisWidgets.BatteryPowerOverTime, name: 'Battery Power Over Time', type: WidgetType.Chart},
        ],
      },
      {
        id: ViewAnalysisTabs.MarketOptimization,
        name: 'Market Optimization',
        widgets: [
          // Charts
          {
            id: ViewAnalysisWidgets.MarketSelectionDistribution,
            name: 'Market Selection Distribution',
            type: WidgetType.Chart,
          },
          {id: ViewAnalysisWidgets.RevenueDistribution, name: 'Revenue Distribution', type: WidgetType.Chart},
          // Tables
          {id: ViewAnalysisWidgets.MarketStatistics, name: 'Market Statistics', type: WidgetType.Table},
          {
            id: ViewAnalysisWidgets.MarketSelectedCharging,
            name: 'Market Selected for Charging (Buying)',
            type: WidgetType.Table,
          },
          {
            id: ViewAnalysisWidgets.MarketSelectedDischarging,
            name: 'Markets Selected for Discharging (selling)',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: ViewAnalysisTabs.MarketPrices,
        name: 'Market Prices',
        widgets: [
          // Charts
          {id: ViewAnalysisWidgets.DailyEpexSpread, name: 'Daily EPEX Spread', type: WidgetType.Chart},
          {id: ViewAnalysisWidgets.AveragePriceHourDay, name: 'Average price by hour of day', type: WidgetType.Chart},
          {id: ViewAnalysisWidgets.DailyVolatility, name: 'Daily volatility', type: WidgetType.Chart},
          {
            id: ViewAnalysisWidgets.MarketPriceCorrelation,
            name: 'Market Price Correlation Matrix',
            type: WidgetType.Chart,
          },
        ],
      },
      {
        id: ViewAnalysisTabs.AncillaryServices,
        name: 'Ancillary Services',
        widgets: [
          // Charts
          {
            id: ViewAnalysisWidgets.RevenueByAncillaryService,
            name: 'Revenue by Ancillary Service',
            type: WidgetType.Chart,
          },
          // Tables
          {
            id: ViewAnalysisWidgets.AncillaryServiceBreakdown,
            name: 'Ancillary Service Breakdown',
            type: WidgetType.Table,
          },
          // Charts
          {id: ViewAnalysisWidgets.ServiceRevenueByHour, name: 'Service Revenue by Hour', type: WidgetType.Chart},
        ],
      },
      {
        id: ViewAnalysisTabs.ImbalanceAnalysis,
        name: 'Imbalance Analysis',
        widgets: [
          // Charts
          {
            id: ViewAnalysisWidgets.DailyImbalanceRevenue,
            name: 'Daily Imbalance Revenue vs Charges',
            type: WidgetType.Chart,
          },
          // Tables
          {id: ViewAnalysisWidgets.Top5WorstImbalance, name: 'Top 5 Worst Imbalance Days', type: WidgetType.Table},
          // Charts
          {
            id: ViewAnalysisWidgets.ImbalanceChargesByHour,
            name: 'Imbalance Charges by Hour of Day',
            type: WidgetType.Chart,
          },
        ],
      },
      {
        id: ViewAnalysisTabs.BatteryHealth,
        name: 'Battery Health',
        widgets: [
          // Tables
          {id: ViewAnalysisWidgets.CycleComparison, name: 'Cycle Comparison', type: WidgetType.Table},
          // Charts
          {id: ViewAnalysisWidgets.DailyCycleComparison, name: 'Daily Cycle Comparison', type: WidgetType.Chart},
          {
            id: ViewAnalysisWidgets.MonthlyDegradationComparison,
            name: 'Monthly Degradation Comparison',
            type: WidgetType.Chart,
          },
          {
            id: ViewAnalysisWidgets.EnergyThroughputAnalysis,
            name: 'Energy Throughput Analysis',
            type: WidgetType.Chart,
          },
          // Tables
          {
            id: ViewAnalysisWidgets.StrategyEnergyThroughput,
            name: 'Strategy Energy Throughput Summary',
            type: WidgetType.Table,
          },
          // Charts
          {
            id: ViewAnalysisWidgets.EstimatedBatteryLifespan,
            name: 'Estimated Battery Lifespan',
            type: WidgetType.Chart,
          },
          {
            id: ViewAnalysisWidgets.ActualOperationVsOptimized,
            name: 'Actual Operation vs Optimized',
            type: WidgetType.Chart,
          },
          // Tables
          {
            id: ViewAnalysisWidgets.WarrantyLimitExceedance,
            name: 'Warranty Limit Exceedance Analysis',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: ViewAnalysisTabs.TBSpread,
        name: 'TB Spread',
        widgets: [
          // Charts
          {id: ViewAnalysisWidgets.DailyTbSpreadTrend, name: 'Daily TB Spread Trend', type: WidgetType.Chart},
          // Tables
          {id: ViewAnalysisWidgets.DailyTbSpreadDetails, name: 'Daily TB Spread Details', type: WidgetType.Table},
        ],
      },
      {
        id: ViewAnalysisTabs.SolarGeneration,
        name: 'Solar',
        widgets: [
          // KPIs
          {id: ViewAnalysisWidgets.SolarKpiVitals, name: 'Solar KPI Vitals', type: WidgetType.KPI},
          // Charts
          {id: ViewAnalysisWidgets.SolarGenerationSplit, name: 'Off-Peak / Peak Generation', type: WidgetType.Chart},
        ],
      },
    ],
  },
  [CommentModule.BenchmarkAnalysis]: {
    name: 'Benchmark Analysis',
    tabs: [
      {
        id: BenchmarkAnalysisTabs.RevenueVsBenchmarks,
        name: 'Revenue vs Benchmarks',
        widgets: [
          // Charts
          {id: BenchmarkAnalysisWidgets.BenchmarkSelection, name: 'Benchmark selection', type: WidgetType.Chart},
          // Tables
          {
            id: BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIar,
            name: 'Monthly Performance Breakdown',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: BenchmarkAnalysisTabs.RevenueIarVsActual,
        name: 'IAR vs Actual',
        widgets: [
          // Charts
          {
            id: BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart,
            name: 'Monthly Total Revenue vs IAR',
            type: WidgetType.Chart,
          },
          {
            id: BenchmarkAnalysisWidgets.IarVsActualRevenueByStream,
            name: 'IAR vs Actual Revenue by Stream',
            type: WidgetType.Chart,
          },
          // Tables
          {
            id: BenchmarkAnalysisWidgets.IarVsActualVariance,
            name: 'IAR vs Actual Variance by Stream and Month',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: BenchmarkAnalysisTabs.OptimizedVsActual,
        name: 'Optimized vs Actual',
        widgets: [
          // Charts
          {
            id: BenchmarkAnalysisWidgets.MonthlyActualVsOptimized,
            name: 'Monthly Actual vs Optimized Revenue',
            type: WidgetType.Chart,
          },
          {
            id: BenchmarkAnalysisWidgets.StreamWiseOptimized,
            name: 'Stream-wise Optimized vs Actual Revenue',
            type: WidgetType.Chart,
          },
          // Tables
          {
            id: BenchmarkAnalysisWidgets.MonthlyRevenueComparisonTable,
            name: 'Monthly Revenue Comparison',
            type: WidgetType.Table,
          },
        ],
      },
    ],
  },
  [CommentModule.ExecutiveAnalysis]: {
    name: 'Executive Analysis',
    tabs: null,
    widgets: [
      // Charts
      {id: ExecutiveAnalysisWidgets.ActualVsOptimal, name: 'Actual vs Optimal Revenue Trend', type: WidgetType.Chart},
      // Tables
      {
        id: ExecutiveAnalysisWidgets.MonthlyRevenueComparison,
        name: 'Monthly Revenue Comparison',
        type: WidgetType.Table,
      },
      // Charts
      {id: ExecutiveAnalysisWidgets.ActualRevenueByStream, name: 'Actual Revenue by Stream', type: WidgetType.Chart},
      // Tables
      {id: ExecutiveAnalysisWidgets.MonthlyRevenueByStream, name: 'Monthly Revenue by Stream', type: WidgetType.Table},
    ],
  },
  [CommentModule.InvoiceAnalysis]: {
    name: 'Invoice Analysis',
    tabs: [
      {
        id: InvoiceAnalysisTabs.PdfInvoices,
        name: 'PDF Invoices',
        widgets: [
          // Tables
          {
            id: InvoiceAnalysisWidgets.CapacityAgreementDetails,
            name: 'Capacity Agreement Details',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: InvoiceAnalysisTabs.CapacityMarket,
        name: 'Capacity Market',
        widgets: [
          // Charts
          {id: InvoiceAnalysisWidgets.PaymentTrend, name: 'Payment Trend', type: WidgetType.Chart},
          // Tables
          {
            id: InvoiceAnalysisWidgets.CapacityMarketPaymentsTable,
            name: 'Capacity Market Payments',
            type: WidgetType.Table,
          },
        ],
      },
      {
        id: InvoiceAnalysisTabs.RevenueReconciliation,
        name: 'Revenue Reconciliation',
        widgets: [
          // Charts
          {
            id: InvoiceAnalysisWidgets.RevenueByStreamComparison,
            name: 'Revenue by Stream Comparison',
            type: WidgetType.Chart,
          },
          // Tables
          {id: InvoiceAnalysisWidgets.PerStreamComparisonTable, name: 'Per Stream Comparison', type: WidgetType.Table},
        ],
      },
    ],
  },
};
