import type {MonthYear, SelectInputItem} from '@/interface';
import {type RootState} from '../rootReducer';
import {createSelector} from '@reduxjs/toolkit';
import {AssetStatus, AssetType as AssetTypeEnum} from '@/constants';

/** error/success selector */
export const assetSuccess = (state: RootState) => state.asset.assetSuccess;
export const assetError = (state: RootState) => state.asset.assetError;
export const assetErrorMessage = (state: RootState) => state.asset.assetErrorMessage;
export const assetErrorMessageVars = (state: RootState) => state.asset.assetErrorMessageVars;

/** loading selector */
export const assetLoading = (state: RootState) => state.asset.isLoading;
export const assetDatasetMergeLoading = (state: RootState) => state.asset.mergeLoading;
export const currentAssetFilesLoading = (state: RootState) => state.asset.currentAssetFilesLoading;

/** asset management selector */
type AssetType = 'solar' | 'bess' | 'solarBess';
export const assets = (type: AssetType) => (state: RootState) => state.asset[type].assets;
export const assetTypeLoading = (type: AssetType) => (state: RootState) => state.asset[type].isLoading;
export const assetTotalPages = (type: AssetType) => (state: RootState) => state.asset[type].totalPages;
export const assetNextPage = (type: AssetType) => (state: RootState) => state.asset[type].nextPage;
export const assetCurrentPage = (type: AssetType) => (state: RootState) => state.asset[type].currentPage;
export const totalAssetResults = (type: AssetType) => (state: RootState) => state.asset[type].totalAssets;
export const noAsset = createSelector(
  assets('solar'),
  assets('bess'),
  assets('solarBess'),
  (solarAssets, bessAssets, solarBessAssets) => {
    const totalAssets = solarAssets.length + bessAssets.length + solarBessAssets.length;
    return totalAssets === 0;
  },
);
export const assetListLoading = (state: RootState) => state.asset.assetListLoading;
export const assetMultipleUsers = (state: RootState) => state.asset.users;

export const allAssetsList = createSelector([(state: RootState) => state.asset.allAssets], allAssets =>
  allAssets
    .filter(item => item.status !== AssetStatus.Inactive)
    .map((asset): SelectInputItem => ({label: asset.name, id: asset.id})),
);

// View Analysis dropdown: show all assets (BESS + Solar) that have analysis months (if provided by backend).
export const analysisAssetsList = createSelector([(state: RootState) => state.asset.allAssets], allAssets => {
  return (
    allAssets
      .filter(item => item.analysis_available)
      .map(
        (
          item,
        ): SelectInputItem<{
          organization_id: number;
          organization_name: string;
          available_periods?: MonthYear[];
        }> => ({
          id: item.id,
          label: item.name,
          subLabel: item.organization.name,
          metadata: {
            organization_id: item.organization.id,
            organization_name: item.organization.name,
            available_periods: item.available_periods,
          },
        }),
      )
  );
});

// Benchmark Analysis dropdown: show only assets that have analysis months and an uploaded IAR file.
export const benchmarkAnalysisAssetsList = createSelector([(state: RootState) => state.asset.allAssets], allAssets => {
  return (
    allAssets
      // exclude asset without analysis, without IAR, and solar assets
      .filter(item => item.analysis_available && item.has_iar && item.type !== AssetTypeEnum.Solar)
      .map(
        (
          item,
        ): SelectInputItem<{
          organization_id: number;
          organization_name: string;
          available_periods?: MonthYear[];
        }> => ({
          id: item.id,
          label: item.name,
          subLabel: item.organization.name,
          metadata: {
            organization_id: item.organization.id,
            organization_name: item.organization.name,
            available_periods: item.available_periods,
          },
        }),
      )
  );
});


export const executiveAnalysisAssetsList = (type: AssetTypeEnum) => createSelector([(state: RootState) => state.asset.allAssets], allAssets => {
  return (
    allAssets
      // exclude asset without analysis and solar assets
      .filter(item => item.analysis_available && item.type !== AssetTypeEnum.Solar && item.type === type)
      .map(
        (
          item,
        ): SelectInputItem<{
          organization_id: number;
          organization_name: string;
          available_periods?: MonthYear[];
        }> => ({
          id: item.id,
          label: item.name,
          subLabel: item.organization.name,
          metadata: {
            organization_id: item.organization.id,
            organization_name: item.organization.name,
            available_periods: item.available_periods,
          },
        }),
      )
  );
});

// current selected asset selector for details page and edit page
export const currentSelectedAsset = (state: RootState) => state.asset.currentSelectedAsset;
export const currentSelectedAssetFiles = (state: RootState) => state.asset.currentAssetFiles;

// details fetch loading selector
export const assetDetailsFetchLoading = (state: RootState) => state.asset.assetDetailsFetchLoading;

// aggregator report loading selectors
export const aggregatorReportUploadLoading = (state: RootState) => state.asset.aggregatorReportUploadLoading;
export const aggregatorReportUploadError = (state: RootState) => state.asset.aggregatorReportUploadError;

// scada report loading selectors
export const scadaReportUploadLoading = (state: RootState) => state.asset.scadaReportUploadLoading;
export const scadaReportUploadError = (state: RootState) => state.asset.scadaReportUploadError;

// iar report loading selectors
export const iarReportUploadLoading = (state: RootState) => state.asset.iarReportUploadLoading;
export const iarReportUploadError = (state: RootState) => state.asset.iarReportUploadError;

// solar scada report loading selectors
export const solarScadaReportUploadLoading = (state: RootState) => state.asset.solarScadaReportUploadLoading;
export const solarScadaReportUploadError = (state: RootState) => state.asset.solarScadaReportUploadError;

// optimized dataset loading selectors
export const optimizedDatasetGenerationLoading = (state: RootState) => state.asset.optimizedDatasetGenerationLoading;

// ================================ Asset Analysis selectors ================================

// operations summary
export const assetAnalysisOperationalSummaryResult = (state: RootState) => state.asset.analytics.operations?.revenue;
export const assetAnalysisOperationalRevenueLoading = (state: RootState) =>
  state.asset.analyticsLoading.operations?.revenue ?? false;
export const assetAnalysisOperationalRevenueError = (state: RootState) =>
  state.asset.analyticsError.operations?.revenue ?? false;

// operations market summary
export const assetOperationalMarketSummaryResult = (state: RootState) => state.asset.analytics.operations?.market_summary;
export const assetOperationalMarketSummaryLoading = (state: RootState) =>
  state.asset.analyticsLoading.operations?.market_summary ?? false;
export const assetAnalysisOperationalMarketSummaryError = (state: RootState) =>
  state.asset.analyticsError.operations?.market_summary ?? false;

// energy price comparison
export const assetEnergyPriceComparisonResult = (state: RootState) =>
  state.asset.analytics.operations.energy_price_comparison;
export const assetAnalysisEnergyPriceComparisonLoading = (state: RootState) =>
  state.asset.analyticsLoading.operations?.energy_price_comparison ?? false;
export const assetAnalysisEnergyPriceComparisonError = (state: RootState) =>
  state.asset.analyticsError.operations?.energy_price_comparison ?? false;

// battery power over time
export const assetBatteryPowerOverTimeResult = (state: RootState) =>
  state.asset.analytics.operations.battery_power_over_time;
export const assetAnalysisBatteryPowerOverTimeLoading = (state: RootState) =>
  state.asset.analyticsLoading.operations?.battery_power_over_time ?? false;
export const assetAnalysisBatteryPowerOverTimeError = (state: RootState) =>
  state.asset.analyticsError.operations?.battery_power_over_time ?? false;

// market optimization summary
export const assetMarketSummaryAnalysisResult = (state: RootState) => state.asset.analytics.market?.summary;
export const assetMarketSummaryAnalysisLoading = (state: RootState) =>
  state.asset.analyticsLoading.market?.summary ?? false;
export const assetMarketSummaryAnalysisError = (state: RootState) =>
  state.asset.analyticsError.market?.summary ?? false;

// market statistics
export const assetMarketStatisticsResult = (state: RootState) => state.asset.analytics.market?.statistics;
export const assetMarketStatisticsLoading = (state: RootState) =>
  state.asset.analyticsLoading.market?.statistics ?? false;
export const assetMarketStatisticsError = (state: RootState) => state.asset.analyticsError.market?.statistics ?? false;

// market utilization
export const assetMarketUtilizationAnalysisResult = (state: RootState) => state.asset.analytics.market?.utilization;
export const assetMarketUtilizationAnalysisLoading = (state: RootState) =>
  state.asset.analyticsLoading.market?.utilization ?? false;
export const assetMarketUtilizationAnalysisError = (state: RootState) =>
  state.asset.analyticsError.market?.utilization ?? false;

// best markets
export const assetBestMarketsAnalysisResult = (state: RootState) => state.asset.analytics.market?.best_markets;
export const assetBestMarketsAnalysisLoading = (state: RootState) =>
  state.asset.analyticsLoading.market.best_markets ?? false;
export const assetBestMarketsAnalysisError = (state: RootState) =>
  state.asset.analyticsError.market.best_markets ?? false;

// market revenue distribution
export const assetMarketRevenueDistributionResult = (state: RootState) =>
  state.asset.analytics.market?.revenue_distribution;
export const assetMarketRevenueDistributionLoading = (state: RootState) =>
  state.asset.analyticsLoading.market?.revenue_distribution ?? false;
export const assetMarketRevenueDistributionError = (state: RootState) =>
  state.asset.analyticsError.market?.revenue_distribution ?? false;

// ancillary service summary
export const assetAncillaryServiceSummaryResult = (state: RootState) =>
  state.asset.analytics.ancillary_services?.summary;
export const assetAncillaryServiceSummaryLoading = (state: RootState) =>
  state.asset.analyticsLoading.ancillary_services?.summary ?? false;
export const assetAncillaryServiceSummaryError = (state: RootState) =>
  state.asset.analyticsError.ancillary_services?.summary ?? false;

// ancillary service revenue breakdown
export const assetAncillaryServiceRevenueBreakdownResult = (state: RootState) =>
  state.asset.analytics.ancillary_services?.revenue_breakdown;
export const assetAncillaryServiceRevenueBreakdownLoading = (state: RootState) =>
  state.asset.analyticsLoading.ancillary_services?.revenue_breakdown ?? false;
export const assetAncillaryServiceRevenueBreakdownError = (state: RootState) =>
  state.asset.analyticsError.ancillary_services?.revenue_breakdown ?? false;

// ancillary service opportunity cost analysis
export const assetAncillaryServiceOpportunityCostAnalysisResult = (state: RootState) =>
  state.asset.analytics.ancillary_services?.opportunity_cost;
export const assetAncillaryServiceOpportunityCostAnalysisLoading = (state: RootState) =>
  state.asset.analyticsLoading.ancillary_services?.opportunity_cost ?? false;
export const assetAncillaryServiceOpportunityCostAnalysisError = (state: RootState) =>
  state.asset.analyticsError.ancillary_services?.opportunity_cost ?? false;

// ancillary service revenue by hour
export const assetAncillaryServiceRevenueByHourResult = (state: RootState) =>
  state.asset.analytics.ancillary_services?.hourly_service_revenue;
export const assetAncillaryServiceRevenueByHourLoading = (state: RootState) =>
  state.asset.analyticsLoading.ancillary_services?.hourly_service_revenue ?? false;
export const assetAncillaryServiceRevenueByHourError = (state: RootState) =>
  state.asset.analyticsError.ancillary_services?.hourly_service_revenue ?? false;

// asset imbalance analysis summary
export const assetImbalanceAnalysisSummaryResult = (state: RootState) => state.asset.analytics.imbalance?.summary;
export const assetImbalanceAnalysisSummaryLoading = (state: RootState) =>
  state.asset.analyticsLoading.imbalance?.summary ?? false;
export const assetImbalanceAnalysisSummaryError = (state: RootState) =>
  state.asset.analyticsError.imbalance?.summary ?? false;

// asset imbalance analysis daily breakdown
export const assetImbalanceAnalysisDailyBreakdownResult = (state: RootState) =>
  state.asset.analytics.imbalance?.daily_breakdown;
export const assetImbalanceAnalysisDailyBreakdownLoading = (state: RootState) =>
  state.asset.analyticsLoading.imbalance?.daily_breakdown ?? false;
export const assetImbalanceAnalysisDailyBreakdownError = (state: RootState) =>
  state.asset.analyticsError.imbalance?.daily_breakdown ?? false;

// asset imbalance analysis top worst days
export const assetImbalanceAnalysisTopWorstDaysResult = (state: RootState) =>
  state.asset.analytics.imbalance?.worst_days;
export const assetImbalanceAnalysisTopWorstDaysLoading = (state: RootState) =>
  state.asset.analyticsLoading.imbalance?.worst_days ?? false;
export const assetImbalanceAnalysisTopWorstDaysError = (state: RootState) =>
  state.asset.analyticsError.imbalance?.worst_days ?? false;

// asset imbalance analysis hourly charges
export const assetImbalanceAnalysisHourlyChargesResult = (state: RootState) =>
  state.asset.analytics.imbalance?.hourly_charges;
export const assetImbalanceAnalysisHourlyChargesLoading = (state: RootState) =>
  state.asset.analyticsLoading.imbalance?.hourly_charges ?? false;
export const assetImbalanceAnalysisHourlyChargesError = (state: RootState) =>
  state.asset.analyticsError.imbalance?.hourly_charges ?? false;

// asset battery health summary
export const assetBatteryHealthSummaryResult = (state: RootState) => state.asset.analytics.battery_health?.summary;
export const assetBatteryHealthSummaryLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.summary ?? false;
export const assetBatteryHealthSummaryError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.summary ?? false;

// asset battery health cycle comparison
export const assetBatteryHealthCycleComparisonResult = (state: RootState) =>
  state.asset.analytics.battery_health?.cycle_comparison;
export const assetBatteryHealthCycleComparisonLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.cycle_comparison ?? false;
export const assetBatteryHealthCycleComparisonError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.cycle_comparison ?? false;

// asset battery health strategy cycling comparison
export const assetBatteryHealthStrategyCyclingComparisonResult = (state: RootState) =>
  state.asset.analytics.battery_health?.stratergy_cycle_comparison;
export const assetBatteryHealthStrategyCyclingComparisonLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.stratergy_cycle_comparison ?? false;
export const assetBatteryHealthStrategyCyclingComparisonError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.stratergy_cycle_comparison ?? false;

// asset battery health annual projection report
export const assetBatteryHealthAnnualProjectionReportResult = (state: RootState) =>
  state.asset.analytics.battery_health?.annual_projection;
export const assetBatteryHealthAnnualProjectionReportLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.annual_projection ?? false;
export const assetBatteryHealthAnnualProjectionReportError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.annual_projection ?? false;

// asset battery health daily cycles
export const assetBatteryHealthDailyCyclesResult = (state: RootState) =>
  state.asset.analytics.battery_health?.daily_cycles;
export const assetBatteryHealthDailyCyclesLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.daily_cycles ?? false;
export const assetBatteryHealthDailyCyclesError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.daily_cycles ?? false;

// asset battery warranty limit exceedance analysis
export const assetBatteryWarrantyLimitExceedanceResult = (state: RootState) =>
  state.asset.analytics.battery_health?.warranty_limit_exceedance;
export const assetBatteryWarrantyLimitExceedanceLoading = (state: RootState) =>
  state.asset.analyticsLoading.battery_health?.warranty_limit_exceedance ?? false;
export const assetBatteryWarrantyLimitExceedanceError = (state: RootState) =>
  state.asset.analyticsError.battery_health?.warranty_limit_exceedance ?? false;

// tb spread summary
export const assetTBSpreadSummaryResult = (state: RootState) => state.asset.analytics.tb_spread?.summary;
export const assetTBSpreadSummaryLoading = (state: RootState) =>
  state.asset.analyticsLoading.tb_spread?.summary ?? false;
export const assetTBSpreadSummaryError = (state: RootState) => state.asset.analyticsError.tb_spread?.summary ?? false;

// tb spread details
export const assetTBSpreadDetailsResult = (state: RootState) => state.asset.analytics.tb_spread?.details;
export const assetTBSpreadDetailsLoading = (state: RootState) =>
  state.asset.analyticsLoading.tb_spread?.details ?? false;
export const assetTBSpreadDetailsError = (state: RootState) => state.asset.analyticsError.tb_spread?.details ?? false;

// asset solar kpi vitals
export const assetSolarKpiVitalsResult = (state: RootState) => state.asset.analytics.solar?.kpi_vitals;
export const assetSolarKpiVitalsLoading = (state: RootState) =>
  state.asset.analyticsLoading.solar?.kpi_vitals ?? false;
export const assetSolarKpiVitalsError = (state: RootState) => state.asset.analyticsError.solar?.kpi_vitals ?? false;

// asset solar generation split
export const assetSolarGenerationSplitResult = (state: RootState) => state.asset.analytics.solar?.generation_split;
export const assetSolarGenerationSplitLoading = (state: RootState) =>
  state.asset.analyticsLoading.solar?.generation_split ?? false;
export const assetSolarGenerationSplitError = (state: RootState) =>
  state.asset.analyticsError.solar?.generation_split ?? false;

// asset solar daily generation trend
export const assetSolarDailyTrendResult = (state: RootState) => state.asset.analytics.solar?.daily_trend;
export const assetSolarDailyTrendLoading = (state: RootState) =>
  state.asset.analyticsLoading.solar?.daily_trend ?? false;
export const assetSolarDailyTrendError = (state: RootState) => state.asset.analyticsError.solar?.daily_trend ?? false;

// asset solar irradiance trend
export const assetSolarIrradianceTrendResult = (state: RootState) => state.asset.analytics.solar?.irradiance_trend;
export const assetSolarIrradianceTrendLoading = (state: RootState) =>
  state.asset.analyticsLoading.solar?.irradiance_trend ?? false;
export const assetSolarIrradianceTrendError = (state: RootState) =>
  state.asset.analyticsError.solar?.irradiance_trend ?? false;

// market hourly price patterns
export const assetMarketHourlyPricePatternsResult = (state: RootState) =>
  state.asset.analytics?.market_prices?.hourly_prices;
export const assetMarketHourlyPricePatternsLoading = (state: RootState) =>
  state.asset.analyticsLoading?.market_prices?.hourly_prices ?? false;
export const assetMarketHourlyPricePatternsError = (state: RootState) =>
  state.asset.analyticsError?.market_prices?.hourly_prices ?? false;

// market price volatility
export const assetMarketPriceVolatilityResult = (state: RootState) =>
  state.asset.analytics?.market_prices?.price_volatility;
export const assetMarketPriceVolatilityLoading = (state: RootState) =>
  state.asset.analyticsLoading?.market_prices?.price_volatility ?? false;
export const assetMarketPriceVolatilityError = (state: RootState) =>
  state.asset.analyticsError?.market_prices?.price_volatility ?? false;

// market price correlation matrix
export const assetMarketPriceCorrelationMatrixResult = (state: RootState) =>
  state.asset.analytics?.market_prices?.correlation_matrix;
export const assetMarketPriceCorrelationMatrixLoading = (state: RootState) =>
  state.asset.analyticsLoading?.market_prices?.correlation_matrix ?? false;
export const assetMarketPriceCorrelationMatrixError = (state: RootState) =>
  state.asset.analyticsError?.market_prices?.correlation_matrix ?? false;

// market price spread
export const assetMarketPriceSpreadResult = (state: RootState) => state.asset.analytics?.market_prices?.spread;
export const assetMarketPriceSpreadLoading = (state: RootState) =>
  state.asset.analyticsLoading?.market_prices?.spread ?? false;
export const assetMarketPriceSpreadError = (state: RootState) =>
  state.asset.analyticsError?.market_prices?.spread ?? false;

// ================================ Asset Benchmark selectors ================================
export const assetIndustryBenchmarkAnalysisResult = (state: RootState) => state.asset.benchmark.industryComparison;
export const assetIndustryBenchmarkAnalysisLoading = (state: RootState) =>
  state.asset.benchmarkLoading.industryComparison;
export const assetIndustryBenchmarkAnalysisError = (state: RootState) => state.asset.benchmarkError.industryComparison;

export const assetBenchmarkRevenueIARvsActualResult = (state: RootState) => state.asset.benchmark.revenueIARvsActual;
export const assetBenchmarkRevenueIARvsActualLoading = (state: RootState) =>
  state.asset.benchmarkLoading.revenueIARvsActual;
export const assetBenchmarkRevenueIARvsActualError = (state: RootState) =>
  state.asset.benchmarkError.revenueIARvsActual;

export const assetBenchmarkMultiMarketOptimizedVsActualResult = (state: RootState) =>
  state.asset.benchmark.multiMarketOptmization;
export const assetBenchmarkMultiMarketOptimizedVsActualLoading = (state: RootState) =>
  state.asset.benchmarkLoading.multiMarketOptmization;
export const assetBenchmarkMultiMarketOptimizedVsActualError = (state: RootState) =>
  state.asset.benchmarkError.multiMarketOptmization;


// ================================ Executive Analysis selectors ================================
// monthly revenue comparison
export const assetExecutiveMonthlyRevenueComparisonResult = (state: RootState) => state.asset.executiveAnalysis?.monthly_revenue_comparison;
export const assetExecutiveMonthlyRevenueComparisonLoading = (state: RootState) =>
  state.asset.executiveAnalysisLoading?.monthly_revenue_comparison ?? false;
export const assetExecutiveMonthlyRevenueComparisonError = (state: RootState) =>
  state.asset.executiveAnalysisError?.monthly_revenue_comparison ?? false;

// revenue by stream
export const assetExecutiveRevenueByStreamResult = (state: RootState) => state.asset.executiveAnalysis?.revenue_by_stream;
export const assetExecutiveRevenueByStreamLoading = (state: RootState) =>
  state.asset.executiveAnalysisLoading?.revenue_by_stream ?? false;
export const assetExecutiveRevenueByStreamError = (state: RootState) =>
  state.asset.executiveAnalysisError?.revenue_by_stream ?? false;


// revenue by stream
export const assetExecutiveSummaryResult = (state: RootState) => state.asset.executiveAnalysis?.summary;
export const assetExecutiveSummaryLoading = (state: RootState) =>
  state.asset.executiveAnalysisLoading?.summary ?? false;
export const assetExecutiveSummaryError = (state: RootState) =>
  state.asset.executiveAnalysisError?.summary ?? false;


// Invoice Upload Selectors
export const assetInvoiceUploadLoading = (state: RootState) => state.asset.uploadInvoice.loading;
export const assetInvoiceUploadError = (state: RootState) => state.asset.uploadInvoice.error;
export const assetInvoiceUploadSuccess = (state: RootState) => state.asset.uploadInvoice.success;
export const assetInvoiceUploadErrorMessage = (state: RootState) => state.asset.invoiceUploadError;

// Invoice Delete Selectors
export const invoiceDeleteLoading = (state: RootState) => state.asset.deleteInvoice.loading;
export const invoiceDeleteError = (state: RootState) => state.asset.deleteInvoice.error;
export const invoiceDeleteSuccess = (state: RootState) => state.asset.deleteInvoice.success;

// Invoice Settlement Upload Selectors
export const assetInvoiceSettlementUploadLoading = (state: RootState) => state.asset.uploadInvoiceSettlement.loading;
export const assetInvoiceSettlementUploadError = (state: RootState) => state.asset.uploadInvoiceSettlement.error;
export const assetInvoiceSettlementUploadSuccess = (state: RootState) => state.asset.uploadInvoiceSettlement.success;
export const assetInvoiceSettlementUploadErrorMessage = (state: RootState) => state.asset.invoiceSettlementUploadError;

// Invoice Settlement Delete Selectors
export const assetInvoiceSettlementDeleteLoading = (state: RootState) => state.asset.deleteInvoiceSettlement.loading;
export const assetInvoiceSettlementDeleteError = (state: RootState) => state.asset.deleteInvoiceSettlement.error;
export const assetInvoiceSettlementDeleteSuccess = (state: RootState) => state.asset.deleteInvoiceSettlement.success;

// Invoice Summary Statement Upload Selectors
export const assetInvoiceSummaryStatementUploadLoading = (state: RootState) => state.asset.uploadInvoiceSummaryStatement.loading;
export const assetInvoiceSummaryStatementUploadError = (state: RootState) => state.asset.uploadInvoiceSummaryStatement.error;
export const assetInvoiceSummaryStatementUploadSuccess = (state: RootState) => state.asset.uploadInvoiceSummaryStatement.success;
export const assetInvoiceSummaryStatementUploadErrorMessage = (state: RootState) => state.asset.invoiceSummaryStatementUploadError;

// Invoice Summary Statement Delete Selectors
export const assetInvoiceSummaryStatementDeleteLoading = (state: RootState) => state.asset.deleteInvoiceSummaryStatement.loading;
export const assetInvoiceSummaryStatementDeleteError = (state: RootState) => state.asset.deleteInvoiceSummaryStatement.error;
export const assetInvoiceSummaryStatementDeleteSuccess = (state: RootState) => state.asset.deleteInvoiceSummaryStatement.success;
