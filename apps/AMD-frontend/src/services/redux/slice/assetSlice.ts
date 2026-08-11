import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {ActionWithCallback, AssetReportFile, AssetSliceInitialState} from '@/interface';
import type {
  AssetListRequest,
  APIResponse,
  ReassignAssetOwnershipRequest,
  AssetMultipleUserRequest,
  OnboardAssetRequest,
  GetAssetDetailsRequest,
  EditAssetRequest,
  OptimizationParamsEditRequest,
  UploadAggregatorReportRequest,
  UploadScadaReportRequest,
  UploadSolarScadaReportRequest,
  MergeAssetDatasetsRequest,
  AssetOperationalAnalyticsRequest,
  AssetMarketSummaryRequest,
  AssetMarketSummaryAnalysisRequest,
  AssetAncillaryServiceSummaryRequest,
  AssetAncillaryServiceRevenueBreakdownRequest,
  AssetAncillaryServiceOpportunityCostAnalysisRequest,
  AssetMarketStatisticsRequest,
  AssetMarketPriceSpreadRequest,
  AssetMarketUtilizationAnalysisRequest,
  AssetBestMarketsAnalysisRequest,
  AssetMarketRevenueDistributionRequest,
  AssetMarketHourlyPricePatternsRequest,
  AssetBatteryPowerOverTimeRequest,
  AssetEnergyPriceComparisonRequest,
  AssetTBSpreadSummaryRequest,
  AssetTBSpreadDetailsRequest,
  AssetMarketPriceVolatilityRequest,
  AssetMarketPriceCorrelationMatrixRequest,
  UploadIARReportRequest,
  ActivateAssetRequest,
  SubmitAssetForApprovalRequest,
  AssetIndustryBenchmarkAnalysisRequest,
  GetAssetFilesRequest,
  GenerateOptimizedDatasetRequest,
  RemoveAssetFileRequest,
  AssetBenchmarkMultiMarketOptimizedVsActualRequest,
  AssetBenchmarkRevenueIARvsActualRequest,
  AssetAncillaryServiceRevenueByHourRequest,
  AssetImbalanceSummaryRequest,
  AssetImbalanceDailyBreakdownRequest,
  AssetImbalanceWorstDaysRequest,
  AssetImbalanceHourlyChargesRequest,
  AssetAnalysisBatteryHealthSummaryRequest,
  AssetAnalysisBatteryHealthCycleComparisonRequest,
  AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest,
  AssetAnalysisBatteryHealthAnnualProjectionReportRequest,
  AssetAnalysisBatteryHealthDailyCyclesRequest,
  AssetAnalysisBatteryHealthWarrantyExceedanceRequest,
  AssetAnalysisSolarKpiVitalsRequest,
  AssetAnalysisSolarGenerationSplitRequest,
  AssetAnalysisSolarDailyTrendRequest,
  AssetAnalysisSolarIrradianceTrendRequest,
  UpdateAssetReportingPeriodRequest,
  AssetExecutiveAnalysisMonthlyRevenueComparisonRequest,
  AssetExecutiveAnalysisRevenueByStreamRequest,
  AssetExecutiveAnalysisSummaryRequest,
  InvoiceUploadRequest,
  InvoiceDeleteRequest,
  InvoiceListRequest,
  InvoiceSettlementUploadRequest,
  DeleteInvoiceSettlementRequest,
  InvoiceSettlementListRequest,
  AssetInvoiceSummaryStatementUploadRequest,
  DeleteAssetInvoiceSummaryStatementRequest,
  AssetInvoiceSummaryStatementListRequest,
} from '@/interface/api-interface';
import {mergeDeepRight} from 'ramda';
import {AssetFileType, AssetStatus, AssetSteps, AssetType, SolarAssetSteps} from '@/constants';

const initialState: AssetSliceInitialState = {
  // loading states
  isLoading: false,
  assetDetailsFetchLoading: false,
  aggregatorReportUploadLoading: false,
  scadaReportUploadLoading: false,
  solarScadaReportUploadLoading: false,
  iarReportUploadLoading: false,
  mergeLoading: false,
  optimizedDatasetGenerationLoading: false,
  currentAssetFilesLoading: false,
  assetListLoading: false,

  // for messages
  assetError: false,
  assetErrorMessage: '',
  assetErrorMessageVars: {},
  assetSuccess: false,

  // data
  solar: {
    assets: [],
    isLoading: false,
    totalPages: 0,
    nextPage: null,
    currentPage: 0,
    totalAssets: 0,
  },
  bess: {
    assets: [],
    isLoading: false,
    totalPages: 0,
    nextPage: null,
    currentPage: 0,
    totalAssets: 0,
  },
  solarBess: {
    assets: [],
    isLoading: false,
    totalPages: 0,
    nextPage: null,
    currentPage: 0,
    totalAssets: 0,
  },

  allAssets: [],
  users: [],

  // current selected asset for details page and edit page
  currentSelectedAsset: null,
  currentAssetFiles: [],

  // file upload errors
  aggregatorReportUploadError: null,
  scadaReportUploadError: null,
  solarScadaReportUploadError: null,
  iarReportUploadError: null,
  invoiceSettlementUploadError: null,
  invoiceUploadError: null,
  invoiceSummaryStatementUploadError: null,

  analytics: {
    operations: {
      revenue: null,
      battery_power_over_time: null,
      energy_price_comparison: null,
      market_summary: null,
    },
    market: {
      summary: null,
      statistics: null,
      utilization: null,
      best_markets: null,
    },
    market_prices: {
      spread: null,
      hourly_prices: null,
      price_volatility: null,
    },
    ancillary_services: {
      summary: null,
      revenue_breakdown: null,
      opportunity_cost: null,
      hourly_service_revenue: null,
    },
    imbalance: {
      summary: null,
      daily_breakdown: null,
      worst_days: null,
      hourly_charges: null,
    },
    battery_health: {
      summary: null,
      cycle_comparison: null,
      stratergy_cycle_comparison: null,
      annual_projection: null,
      daily_cycles: null,
      warranty_limit_exceedance: null,
    },
    tb_spread: {
      summary: null,
      details: null,
    },
    solar: {
      kpi_vitals: null,
      generation_split: null,
      daily_trend: null,
      irradiance_trend: null,
    },
  },
  analyticsLoading: {
    operations: {
      revenue: false,
      market_summary: false,
      energy_price_comparison: false,
      battery_power_over_time: false,
    },
    market: {
      summary: false,
      statistics: false,
      utilization: false,
      best_markets: false,
    },
    market_prices: {
      spread: false,
      hourly_prices: false,
      price_volatility: false,
    },
    ancillary_services: {
      summary: false,
      revenue_breakdown: false,
      opportunity_cost: false,
      hourly_service_revenue: false,
    },
    imbalance: {
      summary: false,
      daily_breakdown: false,
      worst_days: false,
      hourly_charges: false,
    },
    battery_health: {
      summary: false,
      cycle_comparison: false,
      stratergy_cycle_comparison: false,
      annual_projection: false,
      daily_cycles: false,
      warranty_limit_exceedance: false,
    },
    tb_spread: {
      summary: false,
      details: false,
    },
    solar: {
      kpi_vitals: false,
      generation_split: false,
      daily_trend: false,
      irradiance_trend: false,
    },
  },
  analyticsError: {
    operations: {
      revenue: false,
      soc: false,
      market_summary: false,
      energy_price_comparison: false,
      battery_power_over_time: false,
    },
    market: {
      summary: false,
      statistics: false,
      utilization: false,
      best_markets: false,
    },
    market_prices: {
      spread: false,
      hourly_prices: false,
      price_volatility: false,
    },
    ancillary_services: {
      summary: false,
      revenue_breakdown: false,
      opportunity_cost: false,
      hourly_service_revenue: false,
    },
    imbalance: {
      summary: false,
      daily_breakdown: false,
      worst_days: false,
      hourly_charges: false,
    },
    battery_health: {
      summary: false,
      cycle_comparison: false,
      stratergy_cycle_comparison: false,
      annual_projection: false,
      daily_cycles: false,
      warranty_limit_exceedance: false,
    },
    tb_spread: {
      summary: false,
      details: false,
    },
    solar: {
      kpi_vitals: false,
      generation_split: false,
      daily_trend: false,
      irradiance_trend: false,
    },
  },

  benchmark: {
    industryComparison: {
      asset_id: 0,
      asset_name: '',
      benchmarks: [],
    },
    revenueIARvsActual: null,
    multiMarketOptmization: null,
  },

  benchmarkError: {
    industryComparison: false,
    revenueIARvsActual: false,
    multiMarketOptmization: false,
  },
  benchmarkLoading: {
    industryComparison: false,
    revenueIARvsActual: false,
    multiMarketOptmization: false,
  },

  executiveAnalysis: {
    monthly_revenue_comparison: null,
    revenue_by_stream: null,
    summary: null,
  },
  executiveAnalysisError: {
    summary: false,
    monthly_revenue_comparison: false,
    revenue_by_stream: false,
  },
  executiveAnalysisLoading: {
    summary: false,
    monthly_revenue_comparison: false,
    revenue_by_stream: false,
  },

  uploadInvoice: {
    loading: false,
    error: false,
    success: false,
  },

  deleteInvoice: {
    loading: false,
    error: false,
    success: false,
  },

  deleteInvoiceSettlement: {
    loading: false,
    error: false,
    success: false,
  },
  uploadInvoiceSettlement: {
    loading: false,
    error: false,
    success: false,
  },

  deleteInvoiceSummaryStatement: {
    loading: false,
    error: false,
    success: false,
  },
  uploadInvoiceSummaryStatement: {
    loading: false,
    error: false,
    success: false,
  }
};

const assetSlice = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    // ======================================
    // get asset list
    // ======================================
    assetListRequest: (state, _action: PayloadAction<AssetListRequest['params']>) => {
      if (_action.payload.type === AssetType.Solar) {
        state.solar.isLoading = true;
      }
      if (_action.payload.type === AssetType.BESS) {
        state.bess.isLoading = true;
      }
      if (_action.payload.type === AssetType['Solar + BESS']) {
        state.solarBess.isLoading = true;
      }
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetListSuccess: (
      state,
      action: PayloadAction<{data: AssetListRequest['response']; params: AssetListRequest['params']}>,
    ) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.data.status_code;
      if (action.payload.data.data) {
        state.assetErrorMessageVars = {
          ...state.assetErrorMessageVars,
          organization_name: (action.payload.data.data as any).organization_name || state.assetErrorMessageVars?.organization_name || 'your organization'
        };
        const assetData = {
          isLoading: false,
          totalPages: action.payload.data.data?.total_pages,
          currentPage: action.payload.data.data?.current_page,
          nextPage: action.payload.data.data?.next_page,
          totalAssets: action.payload.data.data?.total_assets,
        };
        const assetType = action.payload.params.type;
        if (assetType === AssetType.Solar) {
          state.solar = {
            assets:
              action.payload.data.data?.current_page === 1
                ? action.payload.data.data?.assets
                : [...state.solar.assets, ...(action.payload.data.data?.assets || [])],
            ...assetData,
          };
        }
        if (assetType === AssetType.BESS) {
          state.bess = {
            assets:
              action.payload.data.data?.current_page === 1
                ? action.payload.data.data?.assets
                : [...state.bess.assets, ...(action.payload.data.data?.assets || [])],
            ...assetData,
          };
        }
        if (assetType === AssetType['Solar + BESS']) {
          state.solarBess = {
            assets:
              action.payload.data.data?.current_page === 1
                ? action.payload.data.data?.assets
                : [...state.solarBess.assets, ...(action.payload.data.data?.assets || [])],
            ...assetData,
          };
        }
      }
    },
    assetListFailure: (state, action: PayloadAction<{data: APIResponse; params: AssetListRequest['params']}>) => {
      state.isLoading = false;
      state.assetError = action.payload.data.status_code;
      if (['E-10033', 'E-10014', 'E-10015'].includes(action.payload.data.status_code)) {
        const assetType = action.payload.params.type;
        const emptyAssetData = {
          assets: [],
          isLoading: false,
          totalPages: 0,
          currentPage: 0,
          nextPage: null,
          totalAssets: 0,
        };

        if (assetType === AssetType.Solar) {
          state.solar = emptyAssetData;
        }
        if (assetType === AssetType.BESS) {
          state.bess = emptyAssetData;
        }
        if (assetType === AssetType['Solar + BESS']) {
          state.solarBess = emptyAssetData;
        }
      }
    },

    // ======================================
    // multiple asset users
    // ======================================
    assetMultipleUserRequest: (state, _action: PayloadAction<AssetMultipleUserRequest['params']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMultipleUserSuccess: (state, action: PayloadAction<AssetMultipleUserRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = action.payload.data.users;
      }
    },
    assetMultipleUserFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
      state.users = [];
    },
    // ======================================
    // reassign asset ownership
    // ======================================
    reassignAssetOwnershipRequest: (state, _action: PayloadAction<ReassignAssetOwnershipRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    reassignAssetOwnershipSuccess: (state, action: PayloadAction<ReassignAssetOwnershipRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        // Update the asset in the list with new organization
        if (state.solar.assets) {
          state.solar.assets = state.solar.assets.map(asset =>
            asset.id === action.payload.data?.asset_id
              ? {...asset, organization: action.payload.data.organization}
              : asset,
          );
        }
        if (state.bess.assets) {
          state.bess.assets = state.bess.assets.map(asset =>
            asset.id === action.payload.data?.asset_id
              ? {...asset, organization: action.payload.data.organization}
              : asset,
          );
        }
        if (state.solarBess.assets) {
          state.solarBess.assets = state.solarBess.assets.map(asset =>
            asset.id === action.payload.data?.asset_id
              ? {...asset, organization: action.payload.data.organization}
              : asset,
          );
        }
      }
    },
    reassignAssetOwnershipFailure: (state, action: PayloadAction<ReassignAssetOwnershipRequest['errorResponse']>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
      state.assetErrorMessageVars = action.payload?.data || {};
    },

    // ======================================
    // reset messages
    // ======================================
    resetAssetMessage: state => {
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
      state.analyticsError.operations.revenue = false;
      state.analyticsError.operations.soc = false;
      state.analyticsError.operations.market_summary = false;
      state.analyticsError.operations.energy_price_comparison = false;
      state.analyticsError.operations.battery_power_over_time = false;
      state.analyticsError.ancillary_services.summary = false;
      state.analyticsError.ancillary_services.revenue_breakdown = false;
      state.analyticsError.market.summary = false;
      state.analyticsError.market.statistics = false;
      state.analyticsError.market.utilization = false;
      state.analyticsError.market.best_markets = false;
      state.analyticsError.market_prices.spread = false;
      state.analyticsError.market_prices.hourly_prices = false;
      state.analyticsError.market_prices.price_volatility = false;
      state.analyticsError.battery_health.summary = false;
      state.analyticsError.battery_health.cycle_comparison = false;
      state.analyticsError.battery_health.stratergy_cycle_comparison = false;
      state.analyticsError.battery_health.annual_projection = false;
      state.analyticsError.battery_health.daily_cycles = false;
      state.analyticsError.battery_health.warranty_limit_exceedance = false;
      state.analyticsError.tb_spread.summary = false;
      state.analyticsError.tb_spread.details = false;
      state.benchmarkError.revenueIARvsActual = false;
      state.benchmarkError.multiMarketOptmization = false;
    },

    // ======================================
    // all assets list for dropdown
    // ======================================
    getAllAssetsListRequest: (state, _action: PayloadAction<ActionWithCallback<AssetListRequest['response']> | undefined>) => {
      state.assetListLoading = true;
    },
    getAllAssetsListSuccess: (state, action: PayloadAction<AssetListRequest['response']>) => {
      state.assetListLoading = false;
      if (action.payload.data) {
        state.allAssets = action.payload.data.assets;
        state.assetErrorMessageVars = {
          ...state.assetErrorMessageVars,
          organization_name: (action.payload.data as any).organization_name || state.assetErrorMessageVars?.organization_name || 'your organization'
        };
      }
    },
    getAllAssetsListFailure: state => {
      state.assetListLoading = false;
    },

    // =======================================
    // onboard new asset
    // =======================================
    onboardAssetRequest: (state, _action: PayloadAction<OnboardAssetRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
    },
    onboardAssetSuccess: (state, action: PayloadAction<OnboardAssetRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;

      // put the current assets in the current selected asset
      if (action.payload.data) {
        state.currentSelectedAsset = action.payload.data;
        state.allAssets = [action.payload.data, ...state.allAssets];
      }
    },
    onboardAssetFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
      state.assetErrorMessage = action.payload.message || '';
    },

    // =======================================
    // edit assets
    // =======================================
    editAssetRequest: (state, _action: PayloadAction<EditAssetRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
    },
    editAssetSuccess: (state, action: PayloadAction<EditAssetRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        if (state.currentSelectedAsset && state.currentSelectedAsset.id === action.payload.data.id) {
          state.currentSelectedAsset = mergeDeepRight(state.currentSelectedAsset, action.payload.data);
        }
        state.allAssets = state.allAssets.map(a =>
          a.id === action.payload.data!.id ? {...a, ...action.payload.data} : a,
        );
      }
    },
    editAssetFailure: (state, action: PayloadAction<EditAssetRequest['errorResponse']>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
      state.assetErrorMessage = action.payload?.message || '';
      state.assetErrorMessageVars = action.payload?.data || {};
    },
    // =======================================
    // upload aggregator report
    // =======================================
    uploadAggregatorReportRequest: (state, _action: PayloadAction<UploadAggregatorReportRequest['payload']>) => {
      state.aggregatorReportUploadLoading = true;
      state.aggregatorReportUploadError = null;
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
    },
    uploadAggregatorReportSuccess: (state, action: PayloadAction<UploadAggregatorReportRequest['response']>) => {
      state.aggregatorReportUploadLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (state.currentSelectedAsset && action.payload.data) {
        const fileData = {
          id: action.payload.data.id,
          asset_id: action.payload.data.asset_id,
          name: action.payload.data.name,
          size: action.payload.data.size,
          uploaded_at: action.payload.data.uploaded_at,
          projection_summary: action.payload.data.projection_summary,
          total_rows: action.payload.data.total_rows,
          type: AssetFileType.AggregatorReport,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
        state.currentSelectedAsset.aggregator_report_file = fileData;
        // initialize if null to avoid error when filtering in case of multiple uploads without page refresh
        if (!state.currentAssetFiles) {
          state.currentAssetFiles = [];
        }

        let isInserted = false;
        // loop throught current files array and append it
        for (let i = 0; i < state.currentAssetFiles.length; i++) {
          const currentFile = state.currentAssetFiles[i];
          // replace already existing file to prevent duplicates
          if (currentFile.id === fileData.id) {
            state.currentAssetFiles[i] = fileData;
            isInserted = true;
            break;
          }
        }

        // if not inserted in the above loop, then append it to the last
        if (!isInserted) {
          state.currentAssetFiles = [...state.currentAssetFiles, fileData];
        }
      }
    },
    uploadAggregatorReportFailure: (state, action: PayloadAction<UploadAggregatorReportRequest['error_response']>) => {
      state.aggregatorReportUploadLoading = false;
      state.assetError = action.payload.status_code;
      if (['E-10087', 'E-10091'].includes(action.payload.status_code)) {
        if (!state.aggregatorReportUploadError) {
          state.aggregatorReportUploadError = {};
        }
        state.aggregatorReportUploadError.file = action.payload.data?.file || {name: 'Uploaded File'};
        state.aggregatorReportUploadError.validation_errors = action.payload.data?.validation_errors || [
          action.payload.message || 'Failed to parse aggregator report content',
        ];
      }
    },

    // =======================================
    // updated optimization params
    // =======================================
    assetOptimizationParamRequest: (state, _action: PayloadAction<OptimizationParamsEditRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetOptimizationParamSuccess: (state, action: PayloadAction<OptimizationParamsEditRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (
        action.payload.data &&
        state.currentSelectedAsset &&
        state.currentSelectedAsset.id === action.payload.data.id
      ) {
        state.currentSelectedAsset.max_charging_rate = action.payload.data.max_charging_rate;
        state.currentSelectedAsset.max_discharging_rate = action.payload.data.max_discharging_rate;
        state.currentSelectedAsset.soc_max = action.payload.data.soc_max;
        state.currentSelectedAsset.soc_min = action.payload.data.soc_min;
        state.currentSelectedAsset.round_trip_efficiency = action.payload.data.round_trip_efficiency;
        state.currentSelectedAsset.max_daily_cycles = action.payload.data.max_daily_cycles;
        state.currentSelectedAsset.usable_capacity = action.payload.data.usable_capacity;
        state.currentSelectedAsset.current_step = action.payload.data.current_step;
      }
    },
    assetOptimizationParamFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // get asset details
    // =======================================
    getAssetDetailsRequest: (state, action: PayloadAction<GetAssetDetailsRequest['params']>) => {
      state.assetDetailsFetchLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
      if (state.currentSelectedAsset && state.currentSelectedAsset.id !== action.payload.id) {
        state.currentSelectedAsset = null;
      }
    },

    getAssetDetailsSuccess: (state, action: PayloadAction<GetAssetDetailsRequest['response']>) => {
      state.assetDetailsFetchLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.currentSelectedAsset = action.payload.data;
      }
    },

    getAssetDetailsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.assetDetailsFetchLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // upload scada report
    // =======================================
    uploadScadaReportRequest: (state, _action: PayloadAction<UploadScadaReportRequest['payload']>) => {
      state.scadaReportUploadLoading = true;
      state.scadaReportUploadError = null;
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
    },
    uploadScadaReportSuccess: (state, action: PayloadAction<UploadScadaReportRequest['response']>) => {
      state.scadaReportUploadLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (state.currentSelectedAsset && action.payload.data) {
        const fileData = {
          id: action.payload.data.id,
          asset_id: action.payload.data.asset_id,
          name: action.payload.data.name,
          size: action.payload.data.size,
          uploaded_at: action.payload.data.uploaded_at,
          projection_summary: {
            end_timestamp: action.payload.data?.projection_summary?.end_timestamp || '',
            start_timestamp: action.payload.data?.projection_summary?.start_timestamp || '',
          },
          total_rows: action.payload.data.total_rows,
          type: AssetFileType.ScadaReport,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
        state.currentSelectedAsset.scada_report_file = fileData;
        // Add to file history list
        // state.currentAssetFiles = state.currentAssetFiles.filter(f => f.type !== AssetFileType.ScadaReport);
        // state.currentAssetFiles.push(fileData);

        // initialize if null to avoid error when filtering in case of multiple uploads without page refresh
        if (!state.currentAssetFiles) {
          state.currentAssetFiles = [];
        }

        let isInserted = false;
        // loop throught current files array and append it
        for (let i = 0; i < state.currentAssetFiles.length; i++) {
          const currentFile = state.currentAssetFiles[i];
          // replace already existing file to prevent duplicates
          if (currentFile.id === fileData.id) {
            state.currentAssetFiles[i] = fileData;
            isInserted = true;
            break;
          }
        }

        // if not inserted in the above loop, then append it to the last
        if (!isInserted) {
          state.currentAssetFiles = [...state.currentAssetFiles, fileData];
        }
      }
    },
    uploadScadaReportFailure: (state, action: PayloadAction<UploadScadaReportRequest['error_response']>) => {
      state.scadaReportUploadLoading = false;
      state.assetError = action.payload.status_code;
      if (['E-10087', 'E-10090', 'E-10091'].includes(action.payload.status_code)) {
        if (!state.scadaReportUploadError) {
          state.scadaReportUploadError = {};
        }
        state.scadaReportUploadError.file = action.payload.data?.file || {name: 'Uploaded File'};
        state.scadaReportUploadError.validation_errors = action.payload.data?.validation_errors || [
          action.payload.message || 'Failed to parse scada report content',
        ];
      }
    },

    // =======================================
    // upload solar scada report
    // =======================================
    uploadSolarScadaReportRequest: (
      state,
      _action: PayloadAction<UploadSolarScadaReportRequest['payload']>,
    ) => {
      state.solarScadaReportUploadLoading = true;
      state.solarScadaReportUploadError = null;
      state.assetError = false;
      state.assetErrorMessage = '';
      state.assetSuccess = false;
    },
    uploadSolarScadaReportSuccess: (
      state,
      action: PayloadAction<UploadSolarScadaReportRequest['response']>,
    ) => {
      state.solarScadaReportUploadLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (state.currentSelectedAsset && action.payload.data) {
        const rawFileData = {
          id: action.payload.data.id,
          asset_id: action.payload.data.asset_id,
          name: action.payload.data.name,
          size: action.payload.data.size,
          uploaded_at: action.payload.data.uploaded_at,
          projection_summary: action.payload.data.projection_summary,
          total_rows: action.payload.data.total_rows,
          type: AssetFileType.SolarScadaReport,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
        state.currentSelectedAsset.solar_scada_report_file = rawFileData;

        const processedFileData = action.payload.data.processed_dataset
          ? {
              id: action.payload.data.processed_dataset.id,
              name: action.payload.data.processed_dataset.name,
              month: action.payload.data.processed_dataset.month,
              year: action.payload.data.processed_dataset.year,
              asset_id: action.payload.data.processed_dataset.asset_id,
            }
          : null;
        state.currentSelectedAsset.solar_processed_dataset_file = processedFileData;

        // initialize if null to avoid error when filtering in case of multiple uploads without page refresh
        if (!state.currentAssetFiles) {
          state.currentAssetFiles = [];
        }

        [rawFileData, processedFileData].forEach(fileData => {
          if (!fileData) return;
          let isInserted = false;
          for (let i = 0; i < state.currentAssetFiles.length; i++) {
            if (state.currentAssetFiles[i].id === fileData.id) {
              state.currentAssetFiles[i] = fileData as any;
              isInserted = true;
              break;
            }
          }
          if (!isInserted) {
            state.currentAssetFiles = [...state.currentAssetFiles, fileData as any];
          }
        });
      }
    },
    uploadSolarScadaReportFailure: (
      state,
      action: PayloadAction<UploadSolarScadaReportRequest['error_response']>,
    ) => {
      state.solarScadaReportUploadLoading = false;
      state.assetError = action.payload.status_code;
      if (['E-10277', 'E-10278'].includes(action.payload.status_code)) {
        if (!state.solarScadaReportUploadError) {
          state.solarScadaReportUploadError = {};
        }
        state.solarScadaReportUploadError.file = action.payload.data?.file || {name: 'Uploaded File'};
        state.solarScadaReportUploadError.validation_errors = action.payload.data?.validation_errors || [
          action.payload.message || 'Failed to parse solar SCADA report content',
        ];
      }
    },

    // =======================================
    // upload iar report
    // =======================================
    uploadIARReportRequest: (state, _action: PayloadAction<UploadIARReportRequest['payload']>) => {
      state.iarReportUploadLoading = true;
      state.iarReportUploadError = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    uploadIARReportSuccess: (state, action: PayloadAction<UploadIARReportRequest['response']>) => {
      state.iarReportUploadLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        const uploadedAssetId = Number(action.payload.data.asset_id);
        const isCurrentAsset = state.currentSelectedAsset && state.currentSelectedAsset.id === uploadedAssetId;
        const fileData = {
          id: action.payload.data.id,
          asset_id: action.payload.data.asset_id,
          name: action.payload.data.name,
          size: action.payload.data.size,
          uploaded_at: action.payload.data.uploaded_at,
          projection_summary: {
            end_timestamp: action.payload.data?.projection_summary?.end_timestamp || '',
            start_timestamp: action.payload.data?.projection_summary?.start_timestamp || '',
          },
          total_rows: action.payload.data.total_rows,
          type: AssetFileType.IAR,
        };

        if (isCurrentAsset && state.currentSelectedAsset) {
          state.currentSelectedAsset.iar_report_file = fileData;
          state.currentSelectedAsset.has_iar = true;
        }
        // Add to file history list
        // state.currentAssetFiles = state.currentAssetFiles.filter(f => f.type !== AssetFileType.IAR);
        // state.currentAssetFiles.push(fileData);

        // initialize if null to avoid error when filtering in case of multiple uploads without page refresh
        if (isCurrentAsset && !state.currentAssetFiles) {
          state.currentAssetFiles = [];
        }

        if (isCurrentAsset) {
          let isInserted = false;
          // loop throught current files array and append it
          for (let i = 0; i < state.currentAssetFiles.length; i++) {
            const currentFile = state.currentAssetFiles[i];
            // replace already existing file to prevent duplicates
            if (currentFile.id === fileData.id) {
              state.currentAssetFiles[i] = fileData;
              isInserted = true;
              break;
            }
          }

          // if not inserted in the above loop, then append it to the last
          if (!isInserted) {
            state.currentAssetFiles = [...state.currentAssetFiles, fileData];
          }
        }

        state.bess.assets = state.bess.assets.map(asset =>
          asset.id === uploadedAssetId ? {...asset, has_iar: true} : asset,
        );
        state.solarBess.assets = state.solarBess.assets.map(asset =>
          asset.id === uploadedAssetId ? {...asset, has_iar: true} : asset,
        );
        state.allAssets = state.allAssets.map(asset =>
          asset.id === uploadedAssetId ? {...asset, has_iar: true} : asset,
        );
      }
    },
    uploadIARReportFailure: (state, action: PayloadAction<UploadIARReportRequest['error_response']>) => {
      state.iarReportUploadLoading = false;
      state.assetError = action.payload.status_code;
      if (['E-10115', 'E-10114'].includes(action.payload.status_code)) {
        if (!state.iarReportUploadError) {
          state.iarReportUploadError = {};
        }
        state.iarReportUploadError.file = action.payload.data?.file || {name: 'Uploaded File'};
        state.iarReportUploadError.validation_errors = action.payload.data?.validation_errors || [
          action.payload.message || 'Failed to parse IAR report content',
        ];
      }
    },

    // =======================================
    // merge dataset
    // =======================================
    mergeDatasetRequest: (state, _action: PayloadAction<MergeAssetDatasetsRequest['payload']>) => {
      state.mergeLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    mergeDatasetSuccess: (state, action: PayloadAction<MergeAssetDatasetsRequest['response']>) => {
      state.mergeLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (
        state.currentSelectedAsset &&
        state.currentSelectedAsset.id === action.payload.data?.asset_id &&
        action.payload.status_code === 'S-10031'
      ) {
        state.currentSelectedAsset.merged_dataset_file = {
          id: action.payload.data.id,
          name: action.payload.data.name,
          asset_id: action.payload.data.asset_id,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
        // Add merged dataset to file history list
        if (action.payload.data) {
          const mergedFileData: AssetReportFile = {
            id: action.payload.data.id,
            asset_id: action.payload.data.asset_id,
            name: 'Merged Dataset',
            size: 0,
            uploaded_at: new Date().toISOString(),
            type: AssetFileType.MergedDataset,
            projection_summary: {
              end_timestamp: '',
              start_timestamp: '',
            },
            total_rows: 0,
          };

          if (!state.currentAssetFiles) {
            state.currentAssetFiles = [];
          }

          let isInserted = false;
          // loop throught current files array and append it
          for (let i = 0; i < state.currentAssetFiles.length; i++) {
            const currentFile = state.currentAssetFiles[i];
            // replace already existing file to prevent duplicates
            if (currentFile.id === mergedFileData.id) {
              state.currentAssetFiles[i] = mergedFileData;
              isInserted = true;
              break;
            }
          }

          // if not inserted in the above loop, then append it to the last
          if (!isInserted) {
            state.currentAssetFiles = [...state.currentAssetFiles, mergedFileData];
          }
        }

        // update the asset file list, where analysis_available will be set to true for the merged dataset
        if (state.bess.assets) {
          state.bess.assets = state.bess.assets.map(asset =>
            asset.id === action.payload.data?.asset_id ? {...asset, analysis_available: true} : asset,
          );
        }
        if (state.solarBess.assets) {
          state.solarBess.assets = state.solarBess.assets.map(asset =>
            asset.id === action.payload.data?.asset_id ? {...asset, analysis_available: true} : asset,
          );
        }
      }
    },
    mergeDatasetFailure: (state, action: PayloadAction<APIResponse>) => {
      state.mergeLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // generate optimized dataset
    // =======================================
    generateOptimizedDatasetRequest: (state, _action: PayloadAction<GenerateOptimizedDatasetRequest['payload']>) => {
      state.optimizedDatasetGenerationLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    generateOptimizedDatasetSuccess: (state, action: PayloadAction<GenerateOptimizedDatasetRequest['response']>) => {
      state.optimizedDatasetGenerationLoading = false;
      state.assetSuccess = action.payload.status_code;

      if (state.currentSelectedAsset && state.currentSelectedAsset.id === action.payload.data?.asset_id) {
        state.currentSelectedAsset.optimized_dataset_file = {
          id: action.payload.data.id,
          name: action.payload.data.name,
          asset_id: action.payload.data.asset_id,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
      }
    },
    generateOptimizedDatasetFailure: (state, action: PayloadAction<APIResponse>) => {
      state.optimizedDatasetGenerationLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Operational Analytics
    // =======================================
    assetOperationalAnalyticsRequest: (state, _action: PayloadAction<AssetOperationalAnalyticsRequest['params']>) => {
      state.analyticsLoading.operations.revenue = true;
      state.analyticsError.operations.revenue = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetOperationalAnalyticsSuccess: (state, action: PayloadAction<AssetOperationalAnalyticsRequest['response']>) => {
      state.analyticsLoading.operations.revenue = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.operations.revenue = action.payload.data;
      }
    },
    assetOperationalAnalyticsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.operations.revenue = false;
      state.analyticsError.operations.revenue = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Prices Analytics
    // =======================================
    assetMarketSummaryRequest: (state, _action: PayloadAction<AssetMarketSummaryRequest['params']>) => {
      state.analyticsLoading.operations.market_summary = true;
      state.analyticsError.operations.market_summary = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketSummarySuccess: (state, action: PayloadAction<AssetMarketSummaryRequest['response']>) => {
      state.analyticsLoading.operations.market_summary = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.operations.market_summary = action.payload.data;
      }
    },
    assetMarketSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.operations.market_summary = false;
      state.analyticsError.operations.market_summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Analysis
    // =======================================
    assetMarketSummaryAnalysisRequest: (state, _action: PayloadAction<AssetMarketSummaryAnalysisRequest['params']>) => {
      state.analyticsLoading.market.summary = true;
      state.analyticsError.market.summary = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketSummaryAnalysisSuccess: (
      state,
      action: PayloadAction<AssetMarketSummaryAnalysisRequest['response']>,
    ) => {
      state.analyticsLoading.market.summary = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market.summary = action.payload.data;
      }
    },
    assetMarketSummaryAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market.summary = false;
      state.analyticsError.market.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Ancillary Service Summary
    // =======================================
    getAssetAncillaryServiceSummaryRequest: (
      state,
      _action: PayloadAction<AssetAncillaryServiceSummaryRequest['params']>,
    ) => {
      state.analyticsLoading.ancillary_services.summary = true;
      state.analyticsError.ancillary_services.summary = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetAncillaryServiceSummarySuccess: (
      state,
      action: PayloadAction<AssetAncillaryServiceSummaryRequest['response']>,
    ) => {
      state.analyticsLoading.ancillary_services.summary = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.ancillary_services.summary = action.payload.data;
      }
    },
    getAssetAncillaryServiceSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.ancillary_services.summary = false;
      state.analyticsError.ancillary_services.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Ancillary Service Revenue Breakdown
    // =======================================
    getAssetAncillaryServiceRevenueBreakdownRequest: (
      state,
      _action: PayloadAction<AssetAncillaryServiceRevenueBreakdownRequest['params']>,
    ) => {
      state.analyticsLoading.ancillary_services.revenue_breakdown = true;
      state.analyticsError.ancillary_services.revenue_breakdown = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetAncillaryServiceRevenueBreakdownSuccess: (
      state,
      action: PayloadAction<AssetAncillaryServiceRevenueBreakdownRequest['response']>,
    ) => {
      state.analyticsLoading.ancillary_services.revenue_breakdown = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.ancillary_services.revenue_breakdown = action.payload.data;
      }
    },
    getAssetAncillaryServiceRevenueBreakdownFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.ancillary_services.revenue_breakdown = false;
      state.analyticsError.ancillary_services.revenue_breakdown = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Ancillary Service Opportunity Cost Analysis
    // =======================================
    getAssetAncillaryServiceOpportunityCostAnalysisRequest: (
      state,
      _action: PayloadAction<AssetAncillaryServiceOpportunityCostAnalysisRequest['params']>,
    ) => {
      state.analyticsLoading.ancillary_services.opportunity_cost = true;
      state.analyticsError.ancillary_services.opportunity_cost = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetAncillaryServiceOpportunityCostAnalysisSuccess: (
      state,
      action: PayloadAction<AssetAncillaryServiceOpportunityCostAnalysisRequest['response']>,
    ) => {
      state.analyticsLoading.ancillary_services.opportunity_cost = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.ancillary_services.opportunity_cost = action.payload.data;
      }
    },
    getAssetAncillaryServiceOpportunityCostAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.ancillary_services.opportunity_cost = false;
      state.analyticsError.ancillary_services.opportunity_cost = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Ancillary Service Revenue By Hour
    // =======================================
    getAssetAncillaryServiceRevenueByHourRequest: (
      state,
      _action: PayloadAction<AssetAncillaryServiceRevenueByHourRequest['params']>,
    ) => {
      state.analyticsLoading.ancillary_services.hourly_service_revenue = true;
      state.analyticsError.ancillary_services.hourly_service_revenue = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetAncillaryServiceRevenueByHourSuccess: (
      state,
      action: PayloadAction<AssetAncillaryServiceRevenueByHourRequest['response']>,
    ) => {
      state.analyticsLoading.ancillary_services.hourly_service_revenue = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.ancillary_services.hourly_service_revenue = action.payload.data;
      }
    },
    getAssetAncillaryServiceRevenueByHourFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.ancillary_services.hourly_service_revenue = false;
      state.analyticsError.ancillary_services.hourly_service_revenue = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Statistics
    // =======================================
    assetMarketStatisticsRequest: (state, _action: PayloadAction<AssetMarketStatisticsRequest['params']>) => {
      state.analyticsLoading.market.statistics = true;
      state.analyticsError.market.statistics = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketStatisticsSuccess: (state, action: PayloadAction<AssetMarketStatisticsRequest['response']>) => {
      state.analyticsLoading.market.statistics = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market.statistics = action.payload.data;
      }
    },
    assetMarketStatisticsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market.statistics = false;
      state.analyticsError.market.statistics = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    assetMarketUtilizationAnalysisRequest: (
      state,
      _action: PayloadAction<AssetMarketUtilizationAnalysisRequest['params']>,
    ) => {
      state.analyticsLoading.market.utilization = true;
      state.analyticsError.market.utilization = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketUtilizationAnalysisSuccess: (
      state,
      action: PayloadAction<AssetMarketUtilizationAnalysisRequest['response']>,
    ) => {
      state.analyticsLoading.market.utilization = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market.utilization = action.payload.data;
      }
    },
    assetMarketUtilizationAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market.utilization = false;
      state.analyticsError.market.utilization = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Best Markets Analysis
    // =======================================
    assetBestMarketsAnalysisRequest: (state, _action: PayloadAction<AssetBestMarketsAnalysisRequest['params']>) => {
      state.analyticsLoading.market.best_markets = true;
      state.analyticsError.market.best_markets = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetBestMarketsAnalysisSuccess: (state, action: PayloadAction<AssetBestMarketsAnalysisRequest['response']>) => {
      state.analyticsLoading.market.best_markets = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market.best_markets = action.payload.data;
      }
    },
    assetBestMarketsAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market.best_markets = false;
      state.analyticsError.market.best_markets = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Revenue Distribution
    // =======================================
    assetMarketRevenueDistributionRequest: (
      state,
      _action: PayloadAction<AssetMarketRevenueDistributionRequest['params']>,
    ) => {
      state.analyticsLoading.market.revenue_distribution = true;
      state.analyticsError.market.revenue_distribution = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketRevenueDistributionSuccess: (
      state,
      action: PayloadAction<AssetMarketRevenueDistributionRequest['response']>,
    ) => {
      state.analyticsLoading.market.revenue_distribution = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market.revenue_distribution = {
          asset_id: action.payload.data.asset_id,
          chart_data: action.payload.data.chart_data.filter(item => item.market.toLowerCase() !== 'idle') as any,
          market_strategy: action.payload.data.market_strategy,
          month: action.payload.data.month,
          year: action.payload.data.year,
        };
      }
    },
    assetMarketRevenueDistributionFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market.revenue_distribution = false;
      state.analyticsError.market.revenue_distribution = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Hourly Price Patterns
    // =======================================
    assetMarketHourlyPricePatternsRequest: (
      state,
      _action: PayloadAction<AssetMarketHourlyPricePatternsRequest['params']>,
    ) => {
      state.analyticsLoading.market_prices.hourly_prices = true;
      state.analyticsError.market_prices.hourly_prices = false;
      state.analytics.market_prices.hourly_prices = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetMarketHourlyPricePatternsSuccess: (
      state,
      action: PayloadAction<AssetMarketHourlyPricePatternsRequest['response']>,
    ) => {
      state.analyticsLoading.market_prices.hourly_prices = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market_prices.hourly_prices = action.payload.data;
      }
    },
    assetMarketHourlyPricePatternsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market_prices.hourly_prices = false;
      state.analyticsError.market_prices.hourly_prices = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Energy Price Comparison Analytics
    // =======================================
    assetEnergyPriceComparisonRequest: (state, _action: PayloadAction<AssetEnergyPriceComparisonRequest['params']>) => {
      state.analyticsLoading.operations.energy_price_comparison = true;
      state.analyticsError.operations.energy_price_comparison = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetEnergyPriceComparisonSuccess: (
      state,
      action: PayloadAction<AssetEnergyPriceComparisonRequest['response']>,
    ) => {
      state.analyticsLoading.operations.energy_price_comparison = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.operations.energy_price_comparison = action.payload.data.energy_price_comparison;
      }
    },
    assetEnergyPriceComparisonFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.operations.energy_price_comparison = false;
      state.analyticsError.operations.energy_price_comparison = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Power Over Time Analytics
    // =======================================
    assetBatteryPowerOverTimeRequest: (state, _action: PayloadAction<AssetBatteryPowerOverTimeRequest['params']>) => {
      state.analyticsLoading.operations.battery_power_over_time = true;
      state.analyticsError.operations.battery_power_over_time = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    assetBatteryPowerOverTimeSuccess: (state, action: PayloadAction<AssetBatteryPowerOverTimeRequest['response']>) => {
      state.analyticsLoading.operations.battery_power_over_time = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.operations.battery_power_over_time = action.payload.data.battery_power_over_time;
      }
    },
    assetBatteryPowerOverTimeFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.operations.battery_power_over_time = false;
      state.analyticsError.operations.battery_power_over_time = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Price Spread Analysis
    // =======================================
    getAssetMarketPriceSpreadRequest: (state, _action: PayloadAction<AssetMarketPriceSpreadRequest['params']>) => {
      state.analyticsLoading.market_prices.spread = true;
      state.analyticsError.market_prices.spread = false;
      state.analytics.market_prices.spread = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetMarketPriceSpreadSuccess: (state, action: PayloadAction<AssetMarketPriceSpreadRequest['response']>) => {
      state.analyticsLoading.market_prices.spread = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market_prices.spread = action.payload.data;
      }
    },
    getAssetMarketPriceSpreadFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market_prices.spread = false;
      state.analyticsError.market_prices.spread = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Price Volatility Analysis
    // =======================================
    getAssetMarketPriceVolatilityRequest: (
      state,
      _action: PayloadAction<AssetMarketPriceVolatilityRequest['params']>,
    ) => {
      state.analyticsLoading.market_prices.price_volatility = true;
      state.analyticsError.market_prices.price_volatility = false;
      state.analytics.market_prices.price_volatility = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetMarketPriceVolatilitySuccess: (
      state,
      action: PayloadAction<AssetMarketPriceVolatilityRequest['response']>,
    ) => {
      state.analyticsLoading.market_prices.price_volatility = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market_prices.price_volatility = action.payload.data;
      }
    },
    getAssetMarketPriceVolatilityFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market_prices.price_volatility = false;
      state.analyticsError.market_prices.price_volatility = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Market Price Correlation Matrix Analysis
    // =======================================
    getAssetMarketPriceCorrelationMatrixRequest: (
      state,
      _action: PayloadAction<AssetMarketPriceCorrelationMatrixRequest['params']>,
    ) => {
      state.analyticsLoading.market_prices.correlation_matrix = true;
      state.analyticsError.market_prices.correlation_matrix = false;
      state.analytics.market_prices.correlation_matrix = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetMarketPriceCorrelationMatrixSuccess: (
      state,
      action: PayloadAction<AssetMarketPriceCorrelationMatrixRequest['response']>,
    ) => {
      state.analyticsLoading.market_prices.correlation_matrix = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.market_prices.correlation_matrix = action.payload.data;
      }
    },
    getAssetMarketPriceCorrelationMatrixFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.market_prices.correlation_matrix = false;
      state.analyticsError.market_prices.correlation_matrix = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Imbalance Analysis Summary Request
    // =======================================
    getAssetImbalanceAnalysisSummaryRequest: (
      state,
      _action: PayloadAction<AssetImbalanceSummaryRequest['params']>,
    ) => {
      state.analyticsLoading.imbalance.summary = true;
      state.analyticsError.imbalance.summary = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetImbalanceAnalysisSummarySuccess: (
      state,
      action: PayloadAction<AssetImbalanceSummaryRequest['response']>,
    ) => {
      state.analyticsLoading.imbalance.summary = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.imbalance.summary = action.payload.data;
      }
    },
    getAssetImbalanceAnalysisSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.imbalance.summary = false;
      state.analyticsError.imbalance.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Imbalance Daily Breakdown
    // =======================================
    getAssetImbalanceDailyBreakdownRequest: (
      state,
      _action: PayloadAction<AssetImbalanceDailyBreakdownRequest['params']>,
    ) => {
      state.analyticsLoading.imbalance.daily_breakdown = true;
      state.analyticsError.imbalance.daily_breakdown = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetImbalanceDailyBreakdownSuccess: (
      state,
      action: PayloadAction<AssetImbalanceDailyBreakdownRequest['response']>,
    ) => {
      state.analyticsLoading.imbalance.daily_breakdown = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.imbalance.daily_breakdown = action.payload.data;
      }
    },
    getAssetImbalanceDailyBreakdownFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.imbalance.daily_breakdown = false;
      state.analyticsError.imbalance.daily_breakdown = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Imbalance Top Worst Days
    // =======================================
    getAssetImbalanceTopWorstDaysRequest: (state, _action: PayloadAction<AssetImbalanceWorstDaysRequest['params']>) => {
      state.analyticsLoading.imbalance.worst_days = true;
      state.analyticsError.imbalance.worst_days = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetImbalanceTopWorstDaysSuccess: (
      state,
      action: PayloadAction<AssetImbalanceWorstDaysRequest['response']>,
    ) => {
      state.analyticsLoading.imbalance.worst_days = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.imbalance.worst_days = action.payload.data;
      }
    },
    getAssetImbalanceTopWorstDaysFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.imbalance.worst_days = false;
      state.analyticsError.imbalance.worst_days = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Imbalance Hourly charges
    // =======================================
    getAssetImbalanceHourlyChargesRequest: (
      state,
      _action: PayloadAction<AssetImbalanceHourlyChargesRequest['params']>,
    ) => {
      state.analyticsLoading.imbalance.hourly_charges = true;
      state.analyticsError.imbalance.hourly_charges = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetImbalanceHourlyChargesSuccess: (
      state,
      action: PayloadAction<AssetImbalanceHourlyChargesRequest['response']>,
    ) => {
      state.analyticsLoading.imbalance.hourly_charges = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.imbalance.hourly_charges = action.payload.data;
      }
    },
    getAssetImbalanceHourlyChargesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.imbalance.hourly_charges = false;
      state.analyticsError.imbalance.hourly_charges = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Summary
    // =======================================
    getAssetBatteryHealthSummaryRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthSummaryRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.summary = true;
      state.analyticsError.battery_health.summary = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthSummarySuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthSummaryRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.summary = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.summary = action.payload.data;
      }
    },
    getAssetBatteryHealthSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.summary = false;
      state.analyticsError.battery_health.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Cycle Comparison
    // =======================================
    getAssetBatteryHealthCycleComparisonRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthCycleComparisonRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.cycle_comparison = true;
      state.analyticsError.battery_health.cycle_comparison = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthCycleComparisonSuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthCycleComparisonRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.cycle_comparison = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.cycle_comparison = action.payload.data;
      }
    },
    getAssetBatteryHealthCycleComparisonFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.cycle_comparison = false;
      state.analyticsError.battery_health.cycle_comparison = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Strategy Cycling Comparison
    // =======================================
    getAssetBatteryHealthStrategyCyclingComparisonRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.stratergy_cycle_comparison = true;
      state.analyticsError.battery_health.stratergy_cycle_comparison = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthStrategyCyclingComparisonSuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.stratergy_cycle_comparison = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.stratergy_cycle_comparison = action.payload.data;
      }
    },
    getAssetBatteryHealthStrategyCyclingComparisonFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.stratergy_cycle_comparison = false;
      state.analyticsError.battery_health.stratergy_cycle_comparison = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Annual Projection Report
    // =======================================
    getAssetBatteryHealthAnnualProjectionReportRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthAnnualProjectionReportRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.annual_projection = true;
      state.analyticsError.battery_health.annual_projection = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthAnnualProjectionReportSuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthAnnualProjectionReportRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.annual_projection = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.annual_projection = action.payload.data;
      }
    },
    getAssetBatteryHealthAnnualProjectionReportFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.annual_projection = false;
      state.analyticsError.battery_health.annual_projection = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Daily Cycles
    // =======================================
    getAssetBatteryHealthDailyCyclesRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthDailyCyclesRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.daily_cycles = true;
      state.analyticsError.battery_health.daily_cycles = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthDailyCyclesSuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthDailyCyclesRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.daily_cycles = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.daily_cycles = action.payload.data;
      }
    },
    getAssetBatteryHealthDailyCyclesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.daily_cycles = false;
      state.analyticsError.battery_health.daily_cycles = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Battery Health Warranty Exceedance
    // =======================================
    getAssetBatteryHealthWarrantyExceedanceRequest: (
      state,
      _action: PayloadAction<AssetAnalysisBatteryHealthWarrantyExceedanceRequest['params']>,
    ) => {
      state.analyticsLoading.battery_health.warranty_limit_exceedance = true;
      state.analyticsError.battery_health.warranty_limit_exceedance = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBatteryHealthWarrantyExceedanceSuccess: (
      state,
      action: PayloadAction<AssetAnalysisBatteryHealthWarrantyExceedanceRequest['response']>,
    ) => {
      state.analyticsLoading.battery_health.warranty_limit_exceedance = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.battery_health.warranty_limit_exceedance = action.payload.data;
      }
    },
    getAssetBatteryHealthWarrantyExceedanceFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.battery_health.warranty_limit_exceedance = false;
      state.analyticsError.battery_health.warranty_limit_exceedance = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // TB Spread Summary
    // =======================================
    getAssetTBSpreadSummaryRequest: (state, _action: PayloadAction<AssetTBSpreadSummaryRequest['params']>) => {
      state.analyticsLoading.tb_spread.summary = true;
      state.analyticsError.tb_spread.summary = false;
      state.analytics.tb_spread.summary = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetTBSpreadSummarySuccess: (state, action: PayloadAction<AssetTBSpreadSummaryRequest['response']>) => {
      state.analyticsLoading.tb_spread.summary = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.tb_spread.summary = action.payload.data;
      }
    },
    getAssetTBSpreadSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.tb_spread.summary = false;
      state.analyticsError.tb_spread.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // TB Spread Details
    // =======================================
    getAssetTBSpreadDetailsRequest: (state, _action: PayloadAction<AssetTBSpreadDetailsRequest['params']>) => {
      state.analyticsLoading.tb_spread.details = true;
      state.analyticsError.tb_spread.details = false;
      state.analytics.tb_spread.details = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetTBSpreadDetailsSuccess: (state, action: PayloadAction<AssetTBSpreadDetailsRequest['response']>) => {
      state.analyticsLoading.tb_spread.details = false;
      state.assetSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.analytics.tb_spread.details = action.payload.data;
      }
    },
    getAssetTBSpreadDetailsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.tb_spread.details = false;
      state.analyticsError.tb_spread.details = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Solar KPI Vitals
    // =======================================
    getAssetSolarKpiVitalsRequest: (
      state,
      _action: PayloadAction<AssetAnalysisSolarKpiVitalsRequest['params']>,
    ) => {
      state.analyticsLoading.solar.kpi_vitals = true;
      state.analyticsError.solar.kpi_vitals = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetSolarKpiVitalsSuccess: (
      state,
      action: PayloadAction<AssetAnalysisSolarKpiVitalsRequest['response']>,
    ) => {
      state.analyticsLoading.solar.kpi_vitals = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.solar.kpi_vitals = action.payload.data;
      }
    },
    getAssetSolarKpiVitalsFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.solar.kpi_vitals = false;
      state.analyticsError.solar.kpi_vitals = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Solar Generation Split
    // =======================================
    getAssetSolarGenerationSplitRequest: (
      state,
      _action: PayloadAction<AssetAnalysisSolarGenerationSplitRequest['params']>,
    ) => {
      state.analyticsLoading.solar.generation_split = true;
      state.analyticsError.solar.generation_split = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetSolarGenerationSplitSuccess: (
      state,
      action: PayloadAction<AssetAnalysisSolarGenerationSplitRequest['response']>,
    ) => {
      state.analyticsLoading.solar.generation_split = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.solar.generation_split = action.payload.data;
      }
    },
    getAssetSolarGenerationSplitFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.solar.generation_split = false;
      state.analyticsError.solar.generation_split = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Solar Daily Generation Trend
    // =======================================
    getAssetSolarDailyTrendRequest: (
      state,
      _action: PayloadAction<AssetAnalysisSolarDailyTrendRequest['params']>,
    ) => {
      state.analyticsLoading.solar.daily_trend = true;
      state.analyticsError.solar.daily_trend = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetSolarDailyTrendSuccess: (
      state,
      action: PayloadAction<AssetAnalysisSolarDailyTrendRequest['response']>,
    ) => {
      state.analyticsLoading.solar.daily_trend = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.solar.daily_trend = action.payload.data;
      }
    },
    getAssetSolarDailyTrendFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.solar.daily_trend = false;
      state.analyticsError.solar.daily_trend = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Asset Solar Irradiance Trend
    // =======================================
    getAssetSolarIrradianceTrendRequest: (
      state,
      _action: PayloadAction<AssetAnalysisSolarIrradianceTrendRequest['params']>,
    ) => {
      state.analyticsLoading.solar.irradiance_trend = true;
      state.analyticsError.solar.irradiance_trend = false;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetSolarIrradianceTrendSuccess: (
      state,
      action: PayloadAction<AssetAnalysisSolarIrradianceTrendRequest['response']>,
    ) => {
      state.analyticsLoading.solar.irradiance_trend = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.analytics.solar.irradiance_trend = action.payload.data;
      }
    },
    getAssetSolarIrradianceTrendFailure: (state, action: PayloadAction<APIResponse>) => {
      state.analyticsLoading.solar.irradiance_trend = false;
      state.analyticsError.solar.irradiance_trend = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Executive Analysis monthly revenue Comparison
    // =======================================
    getExecutiveAnalysisMonthlyRevenueComparisonRequest: (
      state,
      _action: PayloadAction<AssetExecutiveAnalysisMonthlyRevenueComparisonRequest['params']>,
    ) => {
      state.executiveAnalysisLoading.monthly_revenue_comparison = true;
      state.executiveAnalysisError.monthly_revenue_comparison = false;
      state.executiveAnalysis.monthly_revenue_comparison = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getExecutiveAnalysisMonthlyRevenueComparisonSuccess: (
      state,
      action: PayloadAction<AssetExecutiveAnalysisMonthlyRevenueComparisonRequest['response']>,
    ) => {
      state.executiveAnalysisLoading.monthly_revenue_comparison = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.executiveAnalysis.monthly_revenue_comparison = action.payload.data;
      }
    },
    getExecutiveAnalysisMonthlyRevenueComparisonFailure: (state, action: PayloadAction<APIResponse>) => {
      state.executiveAnalysisLoading.monthly_revenue_comparison = false;
      state.executiveAnalysisError.monthly_revenue_comparison = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Executive Analysis revenue by stream
    // =======================================
    getExecutiveAnalysisRevenueByStreamRequest: (
      state,
      _action: PayloadAction<AssetExecutiveAnalysisRevenueByStreamRequest['params']>,
    ) => {
      state.executiveAnalysisLoading.revenue_by_stream = true;
      state.executiveAnalysisError.revenue_by_stream = false;
      state.executiveAnalysis.revenue_by_stream = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getExecutiveAnalysisRevenueByStreamSuccess: (
      state,
      action: PayloadAction<AssetExecutiveAnalysisRevenueByStreamRequest['response']>,
    ) => {
      state.executiveAnalysisLoading.revenue_by_stream = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.executiveAnalysis.revenue_by_stream = action.payload.data;
      }
    },
    getExecutiveAnalysisRevenueByStreamFailure: (state, action: PayloadAction<APIResponse>) => {
      state.executiveAnalysisLoading.revenue_by_stream = false;
      state.executiveAnalysisError.revenue_by_stream = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Executive Analysis summary
    // =======================================
    getExecutiveAnalysisSummaryRequest: (
      state,
      _action: PayloadAction<AssetExecutiveAnalysisSummaryRequest['params']>,
    ) => {
      state.executiveAnalysisLoading.summary = true;
      state.executiveAnalysisError.summary = false;
      state.executiveAnalysis.summary = null;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getExecutiveAnalysisSummarySuccess: (
      state,
      action: PayloadAction<AssetExecutiveAnalysisSummaryRequest['response']>,
    ) => {
      state.executiveAnalysisLoading.summary = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.executiveAnalysis.summary = action.payload.data;
      }
    },
    getExecutiveAnalysisSummaryFailure: (state, action: PayloadAction<APIResponse>) => {
      state.executiveAnalysisLoading.summary = false;
      state.executiveAnalysisError.summary = action.payload.status_code;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // Create Asset
    // =======================================
    createAssetRequest: (state, _action: PayloadAction<ActivateAssetRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    createAssetSuccess: (
      state,
      action: PayloadAction<{data: ActivateAssetRequest['response']; params: ActivateAssetRequest['payload']}>,
    ) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.data.status_code;
      if (
        state.currentSelectedAsset &&
        action.payload.data.data &&
        state.currentSelectedAsset.id === action.payload.params.assetId
      ) {
        const assetData = {status: action.payload.data.data.status ? AssetStatus.Active : AssetStatus.Inactive};
        state.currentSelectedAsset.status = assetData.status;

        // also update the list for all 3 types in case the asset type is changed after activation/deactivation
        state.bess.assets = state.bess.assets.map(asset =>
          asset.id === action.payload.params.assetId ? {...asset, ...assetData} : asset,
        );
        state.solar.assets = state.solar.assets.map(asset =>
          asset.id === action.payload.params.assetId ? {...asset, ...assetData} : asset,
        );
        state.solarBess.assets = state.solarBess.assets.map(asset =>
          asset.id === action.payload.params.assetId ? {...asset, ...assetData} : asset,
        );

        // also update in the all assets list
        state.allAssets = state.allAssets.map(asset =>
          asset.id === action.payload.params.assetId ? {...asset, ...assetData} : asset,
        );
      }
    },
    createAssetFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // submit asset for approval
    // =======================================
    submitAssetForApprovalRequest: (state, _action: PayloadAction<SubmitAssetForApprovalRequest['payload']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    submitAssetForApprovalSuccess: (
      state,
      action: PayloadAction<{
        data: SubmitAssetForApprovalRequest['response'];
        params: SubmitAssetForApprovalRequest['payload'];
      }>,
    ) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.data.status_code;

      if (action.payload.data.data && action.payload.params.assetId) {
        const assetData = action.payload.data.data;

        if (state.currentSelectedAsset && state.currentSelectedAsset.id === assetData.id) {
          state.currentSelectedAsset.status = assetData.status;
          state.currentSelectedAsset.submitted_at = assetData.submitted_at;
        }

        state.bess.assets = state.bess.assets.map(asset =>
          asset.id === assetData.id ? {...asset, ...assetData} : asset,
        );
        state.solar.assets = state.solar.assets.map(asset =>
          asset.id === assetData.id ? {...asset, ...assetData} : asset,
        );
        state.solarBess.assets = state.solarBess.assets.map(asset =>
          asset.id === assetData.id ? {...asset, ...assetData} : asset,
        );
        state.allAssets = state.allAssets.map(asset => (asset.id === assetData.id ? {...asset, ...assetData} : asset));
      }
    },
    submitAssetForApprovalFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // asset benchmark - industry comparison
    // =======================================
    getIndustryComparisonRequest: (state, _action: PayloadAction<AssetIndustryBenchmarkAnalysisRequest['params']>) => {
      state.benchmarkError.industryComparison = false;
      state.benchmarkLoading.industryComparison = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getIndustryComparisonSuccess: (state, action: PayloadAction<AssetIndustryBenchmarkAnalysisRequest['response']>) => {
      state.benchmarkLoading.industryComparison = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data && action.payload.status_code === 'S-10045') {
        state.benchmark.industryComparison = {
          asset_id: action.payload.data.asset_id,
          asset_name: action.payload.data.asset_name,
          benchmarks: action.payload.data.benchmarks,
        };
      }
    },
    getIndustryComparisonFailure: (state, action: PayloadAction<APIResponse>) => {
      state.benchmarkLoading.industryComparison = false;
      state.benchmarkError.industryComparison = action.payload.status_code;
    },

    // =======================================
    // asset benchmark - revenue IAR vs actual
    // =======================================
    getAssetBenchmarkRevenueIARvsActualRequest: (
      state,
      _action: PayloadAction<AssetBenchmarkRevenueIARvsActualRequest['params']>,
    ) => {
      state.benchmarkError.revenueIARvsActual = false;
      state.benchmarkLoading.revenueIARvsActual = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBenchmarkRevenueIARvsActualSuccess: (
      state,
      action: PayloadAction<AssetBenchmarkRevenueIARvsActualRequest['response']>,
    ) => {
      state.benchmarkLoading.revenueIARvsActual = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.benchmark.revenueIARvsActual = {
          asset_id: action.payload.data.asset_id,
          year: action.payload.data.year,
          monthly_data: action.payload.data.monthly_data,
        };
      }
    },
    getAssetBenchmarkRevenueIARvsActualFailure: (state, action: PayloadAction<APIResponse>) => {
      state.benchmarkLoading.revenueIARvsActual = false;
      state.benchmarkError.revenueIARvsActual = action.payload.status_code;
    },

    // =======================================
    // asset benchmark - multi market optimized vs actual
    // =======================================
    getAssetBenchmarkMultiMarketOptimizedVsActualRequest: (
      state,
      _action: PayloadAction<AssetBenchmarkMultiMarketOptimizedVsActualRequest['params']>,
    ) => {
      state.benchmarkError.multiMarketOptmization = false;
      state.benchmarkLoading.multiMarketOptmization = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    getAssetBenchmarkMultiMarketOptimizedVsActualSuccess: (
      state,
      action: PayloadAction<AssetBenchmarkMultiMarketOptimizedVsActualRequest['response']>,
    ) => {
      state.benchmarkLoading.multiMarketOptmization = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.benchmark.multiMarketOptmization = {
          asset_id: action.payload.data.asset_id,
          year: action.payload.data.year,
          monthly_data: action.payload.data.monthly_data,
        };
      }
    },
    getAssetBenchmarkMultiMarketOptimizedVsActualFailure: (state, action: PayloadAction<APIResponse>) => {
      state.benchmarkLoading.multiMarketOptmization = false;
      state.benchmarkError.multiMarketOptmization = action.payload.status_code;
    },

    resetIndustryComparisonMessage: state => {
      state.benchmarkError.industryComparison = false;
      state.benchmarkError.revenueIARvsActual = false;
      state.benchmarkError.multiMarketOptmization = false;
    },

    // =======================================
    // asset files
    // =======================================
    currentAssetFilesRequest: (state, _action: PayloadAction<GetAssetFilesRequest['params']>) => {
      state.currentAssetFilesLoading = true;
    },
    currentAssetFilesSuccess: (state, action: PayloadAction<GetAssetFilesRequest['response']>) => {
      state.currentAssetFilesLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.currentAssetFiles = action.payload.data;
      }
    },
    currentAssetFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.currentAssetFilesLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // filter scada, aggregator files
    // =======================================
    filterAggregatorScadaFilesRequest: (state, _action: PayloadAction<GetAssetFilesRequest['params']>) => {
      state.isLoading = true;
    },
    filterAggregatorScadaFilesSuccess: (
      state,
      action: PayloadAction<{params: GetAssetFilesRequest['params']; response: GetAssetFilesRequest['response']}>,
    ) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.response.status_code;
      if (action.payload.response.data && state.currentSelectedAsset) {
        const aggregatorFile = action.payload.response.data.find(item => item.type === AssetFileType.AggregatorReport);
        const scadaFile = action.payload.response.data.find(item => item.type === AssetFileType.ScadaReport);
        const mergedFile = action.payload.response.data.find(item => item.type === AssetFileType.MergedDataset);
        const optimizedFile = action.payload.response.data.find(item => item.type === AssetFileType.OptimizedDataset);

        if (aggregatorFile) {
          state.currentSelectedAsset.aggregator_report_file = aggregatorFile;
        } else {
          state.currentSelectedAsset.aggregator_report_file = null;
        }

        if (scadaFile) {
          state.currentSelectedAsset.scada_report_file = scadaFile;
        } else {
          state.currentSelectedAsset.scada_report_file = null;
        }

        if (mergedFile) {
          state.currentSelectedAsset.merged_dataset_file = {
            id: mergedFile.id,
            name: mergedFile.name,
            month: mergedFile.month!,
            year: mergedFile.year!,
            asset_id: mergedFile.asset_id,
          };
        } else {
          state.currentSelectedAsset.merged_dataset_file = null;
        }

        if (optimizedFile) {
          state.currentSelectedAsset.optimized_dataset_file = {
            id: optimizedFile.id,
            name: optimizedFile.name,
            month: optimizedFile.month!,
            year: optimizedFile.year!,
            asset_id: optimizedFile.asset_id,
          };
        } else {
          state.currentSelectedAsset.optimized_dataset_file = null;
        }

        // reset the state
        state.aggregatorReportUploadError = null;
        state.scadaReportUploadError = null;
      }
    },
    filterAggregatorScadaFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // filter solar scada files
    // =======================================
    filterSolarScadaFilesRequest: (state, _action: PayloadAction<GetAssetFilesRequest['params']>) => {
      state.isLoading = true;
    },
    filterSolarScadaFilesSuccess: (
      state,
      action: PayloadAction<{params: GetAssetFilesRequest['params']; response: GetAssetFilesRequest['response']}>,
    ) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.response.status_code;
      if (action.payload.response.data && state.currentSelectedAsset) {
        const solarScadaFile = action.payload.response.data.find(
          item => item.type === AssetFileType.SolarScadaReport,
        );
        const solarProcessedFile = action.payload.response.data.find(
          item => item.type === AssetFileType.SolarProcessedDataset,
        );

        if (solarScadaFile) {
          state.currentSelectedAsset.solar_scada_report_file = solarScadaFile;
        } else {
          state.currentSelectedAsset.solar_scada_report_file = null;
        }

        if (solarProcessedFile) {
          state.currentSelectedAsset.solar_processed_dataset_file = {
            id: solarProcessedFile.id,
            name: solarProcessedFile.name,
            month: solarProcessedFile.month!,
            year: solarProcessedFile.year!,
            asset_id: solarProcessedFile.asset_id,
          };
        } else {
          state.currentSelectedAsset.solar_processed_dataset_file = null;
        }

        // reset the state
        state.solarScadaReportUploadError = null;
      }
    },
    filterSolarScadaFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // filter invoices files
    // =======================================
    filterInvoiceFilesRequest: (state, _action: PayloadAction<InvoiceListRequest['params']>) => {
      state.isLoading = true;
    },
    filterInvoiceFilesSuccess: (state, action: PayloadAction<InvoiceListRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data && state.currentSelectedAsset) {
        const invoiceFile = action.payload.data.invoices.at(0);
        if (invoiceFile) {
          state.currentSelectedAsset.invoice_file = invoiceFile;
        } else {
          state.currentSelectedAsset.invoice_file = null;
        }
        state.invoiceUploadError = null;
      }
    },
    filterInvoiceFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // filter invoices settlement files
    // =======================================
    filterInvoiceSettlementFilesRequest: (state, _action: PayloadAction<InvoiceSettlementListRequest['params']>) => {
      state.isLoading = true;
    },
    filterInvoiceSettlementFilesSuccess: (state, action: PayloadAction<InvoiceSettlementListRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data && state.currentSelectedAsset) {
        const invoiceSettlementFile = action.payload.data.settlement.at(0);
        if (invoiceSettlementFile) {
          state.currentSelectedAsset.invoice_settlement_file = invoiceSettlementFile;
        } else {
          state.currentSelectedAsset.invoice_settlement_file = null;
        }
        state.invoiceSettlementUploadError = null;
      }
    },
    filterInvoiceSettlementFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // update reporting period of the asset
    // =======================================
    updateAssetReportingPeriodRequest: (state, _action: PayloadAction<UpdateAssetReportingPeriodRequest['params']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    updateAssetReportingPeriodSuccess: (
      state,
      action: PayloadAction<UpdateAssetReportingPeriodRequest['response']>,
    ) => {
      state.isLoading = false;
      // state.assetSuccess = action.payload.status_code;
      if (action.payload.data && state.currentSelectedAsset) {
        const {id, active_period} = action.payload.data;
        if (id === state.currentSelectedAsset.id) {
          if (state.currentSelectedAsset?.active_period && active_period) {
            state.currentSelectedAsset.active_period.month = active_period.month;
            state.currentSelectedAsset.active_period.year = active_period.year;
          }
        }
      }
    },

    updateAssetReportingPeriodFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // update invoice repoting period of the asset
    // =======================================
    updateAssetInvoiceReportingPeriodRequest: (state, _action: PayloadAction<UpdateAssetReportingPeriodRequest['params']>) => {
      state.isLoading = true;
      state.assetError = false;
      state.assetSuccess = false;
    },
    updateAssetInvoiceReportingPeriodSuccess: (state, action: PayloadAction<UpdateAssetReportingPeriodRequest['response']>) => {
      state.isLoading = false;
      if (action.payload.data && state.currentSelectedAsset) {
        const {id, invoice_active_period} = action.payload.data;
        if (id === state.currentSelectedAsset.id) {
          if (state.currentSelectedAsset?.invoice_active_period && invoice_active_period) {
            state.currentSelectedAsset.invoice_active_period.month = invoice_active_period.month;
            state.currentSelectedAsset.invoice_active_period.year = invoice_active_period.year;
          }
        }
      }
    },
    updateAssetInvoiceReportingPeriodFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // remove asset files
    // =======================================
    removeAssetFileRequest: (state, _action: PayloadAction<RemoveAssetFileRequest['params']>) => {
      state.isLoading = true;
    },
    removeAssetFileSuccess: (state, action: PayloadAction<RemoveAssetFileRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data && state.currentSelectedAsset) {
        const {file_id, asset_id, child_files} = action.payload.data;
        let isMergedFileRemoved = false;
        let isOptimizedFileRemoved = false;
        let isIarRemoved = false;
        const childFileIds = child_files ? child_files.map(f => f.file_id) : [];

        if (asset_id !== state.currentSelectedAsset.id) {
          return;
        }

        if (state.currentSelectedAsset.aggregator_report_file?.id === file_id) {
          state.currentSelectedAsset.aggregator_report_file = null;
        }
        if (state.currentSelectedAsset.scada_report_file?.id === file_id) {
          state.currentSelectedAsset.scada_report_file = null;
        }
        if (state.currentSelectedAsset.iar_report_file?.id === file_id) {
          state.currentSelectedAsset.iar_report_file = null;
          state.currentSelectedAsset.has_iar = false;
          isIarRemoved = true;
        }
        // solar's raw upload and processed dataset are always deleted together (see
        // delete_asset_file's cascade) -- whichever one wasn't the direct target comes
        // back as a child file, same as the merged/optimized dataset cascade below.
        if (
          state.currentSelectedAsset.solar_scada_report_file?.id === file_id ||
          childFileIds.includes(state.currentSelectedAsset.solar_scada_report_file?.id as number)
        ) {
          state.currentSelectedAsset.solar_scada_report_file = null;
        }
        if (
          state.currentSelectedAsset.solar_processed_dataset_file?.id === file_id ||
          childFileIds.includes(state.currentSelectedAsset.solar_processed_dataset_file?.id as number)
        ) {
          state.currentSelectedAsset.solar_processed_dataset_file = null;
        }
        // remove merged dataset either direct deletion or if the removed file is a child file of the merged dataset
        if (
          state.currentSelectedAsset.merged_dataset_file?.id === file_id ||
          childFileIds.includes(state.currentSelectedAsset.merged_dataset_file?.id as number)
        ) {
          state.currentSelectedAsset.merged_dataset_file = null;
          isMergedFileRemoved = true;
        }
        if (
          state.currentSelectedAsset.optimized_dataset_file?.id === file_id ||
          childFileIds.includes(state.currentSelectedAsset.optimized_dataset_file?.id as number)
        ) {
          state.currentSelectedAsset.optimized_dataset_file = null;
          isOptimizedFileRemoved = true;
        }
        // Remove file from file history list
        const newFileHistory = [];
        for (let i = 0; i < state.currentAssetFiles.length; i++) {
          const currentFile = state.currentAssetFiles[i];
          // ignore current file
          if (currentFile.id === file_id) {
            continue;
          }
          // ignore child files
          if (childFileIds.includes(currentFile.id)) {
            continue;
          }
          newFileHistory.push(currentFile);
        }

        // update the asset file list, where analysis_available will be set to false if the removed file is a merged dataset or if the removed file is a child file of the merged dataset, as both cases will lead to the merged dataset becoming unavailable for analysis
        if (isMergedFileRemoved || isOptimizedFileRemoved) {
          if (state.bess.assets) {
            state.bess.assets = state.bess.assets.map(asset =>
              asset.id === action.payload.data?.asset_id ? {...asset, analysis_available: false} : asset,
            );
          }
          if (state.solarBess.assets) {
            state.solarBess.assets = state.solarBess.assets.map(asset =>
              asset.id === action.payload.data?.asset_id ? {...asset, analysis_available: false} : asset,
            );
          }
        }

        if (isIarRemoved) {
          const removedIarAssetId = action.payload.data?.asset_id;
          state.bess.assets = state.bess.assets.map(asset =>
            asset.id === removedIarAssetId ? {...asset, has_iar: false} : asset,
          );
          state.solarBess.assets = state.solarBess.assets.map(asset =>
            asset.id === removedIarAssetId ? {...asset, has_iar: false} : asset,
          );
          state.allAssets = state.allAssets.map(asset =>
            asset.id === removedIarAssetId ? {...asset, has_iar: false} : asset,
          );
        }

        state.currentAssetFiles = newFileHistory;
      }
    },
    removeAssetFileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // ====================================
    // Upload Invoices
    // ====================================
    uploadInvoicesRequest(state, _action: PayloadAction<InvoiceUploadRequest['payload']>) {
      state.uploadInvoice.loading = true;
      state.uploadInvoice.error = false;
      state.uploadInvoice.success = false;
      state.invoiceUploadError = null;
    },
    uploadInvoicesSuccess(state, action: PayloadAction<InvoiceUploadRequest['response']>) {
      state.uploadInvoice.loading = false;
      state.uploadInvoice.success = action.payload.status_code;
      state.invoiceUploadError = null;
      if (action.payload.data && state.currentSelectedAsset) {
        state.currentSelectedAsset.invoice_file = action.payload.data;
      }
    },
    uploadInvoicesFailure(state, action: PayloadAction<APIResponse<{file: string}>>) {
      state.uploadInvoice.loading = false;
      state.uploadInvoice.error = action.payload.status_code;
      state.uploadInvoice.success = false;
      const message = action.payload.message || action.payload.status_code;

      state.invoiceUploadError = {
        file: {
          name: action.payload.data?.file ?? '',
        },
        validation_errors: [message],
      };
    },

    // ====================================
    // Delete Invoice
    // ====================================
    deleteInvoiceRequest(state, _action: PayloadAction<InvoiceDeleteRequest['payload']>) {
      state.deleteInvoice.loading = true;
      state.deleteInvoice.error = false;
      state.deleteInvoice.success = false;
      state.invoiceUploadError = null;
    },
    deleteInvoiceSuccess(state, action: PayloadAction<InvoiceDeleteRequest['response']>) {
      state.deleteInvoice.loading = false;
      state.deleteInvoice.success = true;
      state.invoiceUploadError = null;
      if (
        state.currentSelectedAsset &&
        action.payload.data &&
        action.payload.data.asset_id === state.currentSelectedAsset.id &&
        state.currentSelectedAsset.invoice_file &&
        state.currentSelectedAsset.invoice_file.id === action.payload.data.invoice_id
      ) {
        state.currentSelectedAsset.invoice_file = null;
      }
    },
    deleteInvoiceFailure(state, action: PayloadAction<APIResponse>) {
      state.deleteInvoice.loading = false;
      state.deleteInvoice.error = action.payload.status_code;
      state.invoiceUploadError = null;
    },

    // ====================================
    // Upload Invoice Settlement
    // ====================================
    uploadInvoiceSettlementRequest(state, _action: PayloadAction<InvoiceSettlementUploadRequest['payload']>) {
      state.uploadInvoiceSettlement.loading = true;
      state.uploadInvoiceSettlement.error = false;
      state.uploadInvoiceSettlement.success = false;
      state.invoiceSettlementUploadError = null;
    },
    uploadInvoiceSettlementSuccess(state, action: PayloadAction<InvoiceSettlementUploadRequest['response']>) {
      state.uploadInvoiceSettlement.loading = false;
      state.uploadInvoiceSettlement.success = action.payload.status_code;
      state.invoiceSettlementUploadError = null;
      if (action.payload.data && state.currentSelectedAsset) {
        state.currentSelectedAsset.invoice_settlement_file = action.payload.data;
      }
    },
    uploadInvoiceSettlementFailure(state, action: PayloadAction<APIResponse<{file: string}>>) {
      state.uploadInvoiceSettlement.loading = false;
      state.uploadInvoiceSettlement.error = action.payload.status_code;
      state.uploadInvoiceSettlement.success = false;

      const message = action.payload.message || action.payload.status_code;

      state.invoiceSettlementUploadError = {
        file: {
          name: action.payload.data?.file ?? '',
        },
        validation_errors: [message],
      };
    },

    // ====================================
    // Delete Invoice Settlement
    // ====================================
    deleteInvoiceSettlementRequest(state, _action: PayloadAction<DeleteInvoiceSettlementRequest['payload']>) {
      state.deleteInvoiceSettlement.loading = true;
      state.deleteInvoiceSettlement.error = false;
      state.deleteInvoiceSettlement.success = false;
      state.invoiceSettlementUploadError = null;
    },
    deleteInvoiceSettlementSuccess(state, action: PayloadAction<DeleteInvoiceSettlementRequest['response']>) {
      state.deleteInvoiceSettlement.loading = false;
      state.deleteInvoiceSettlement.success = true;
      state.invoiceSettlementUploadError = null;
      if (
        state.currentSelectedAsset &&
        action.payload.data &&
        action.payload.data.asset_id === state.currentSelectedAsset.id &&
        state.currentSelectedAsset.invoice_settlement_file &&
        state.currentSelectedAsset.invoice_settlement_file.id === action.payload.data.invoice_settlement_id
      ) {
        state.currentSelectedAsset.invoice_settlement_file = null;
      }
    },
    deleteInvoiceSettlementFailure(state, action: PayloadAction<APIResponse>) {
      state.deleteInvoiceSettlement.loading = false;
      state.deleteInvoiceSettlement.error = action.payload.status_code;
      state.invoiceSettlementUploadError = null;
    },

    // =======================================
    // Upload Invoice Summary Statement 
    // =======================================
    uploadInvoiceSummaryStatementRequest(state, _action: PayloadAction<AssetInvoiceSummaryStatementUploadRequest['payload']>) {
      state.uploadInvoiceSummaryStatement.loading = true;
      state.uploadInvoiceSummaryStatement.error = false;
      state.uploadInvoiceSummaryStatement.success = false;
      state.invoiceSummaryStatementUploadError = null;
    },
    uploadInvoiceSummaryStatementSuccess(state, action: PayloadAction<AssetInvoiceSummaryStatementUploadRequest['response']>) {
      state.uploadInvoiceSummaryStatement.loading = false;
      state.uploadInvoiceSummaryStatement.success = action.payload.status_code;
      const file = action.payload.data;
      if (state.currentSelectedAsset && file) {
        state.currentSelectedAsset.invoice_summary_statement = file;
      }
      state.invoiceSummaryStatementUploadError = null;
    },
    uploadInvoiceSummaryStatementFailure(state, action: PayloadAction<APIResponse<{file: string}>>) {
      state.uploadInvoiceSummaryStatement.loading = false;
      state.uploadInvoiceSummaryStatement.error = action.payload.status_code;
      state.uploadInvoiceSummaryStatement.success = false;

      const message = action.payload.message || action.payload.status_code;

      state.invoiceSummaryStatementUploadError = {
        file: {
          name: action.payload.data?.file ?? '',
        },
        validation_errors: [message],
      };
    },

    // =======================================
    // Delete Invoice Summary Statement
    // =======================================
    deleteInvoiceSummaryStatementRequest(state, _action: PayloadAction<DeleteAssetInvoiceSummaryStatementRequest['payload']>) {
      state.deleteInvoiceSummaryStatement.loading = true;
      state.deleteInvoiceSummaryStatement.error = false;
      state.deleteInvoiceSummaryStatement.success = false;
      state.invoiceSummaryStatementUploadError = null;
    },
    deleteInvoiceSummaryStatementSuccess(state, action: PayloadAction<DeleteAssetInvoiceSummaryStatementRequest['response']>) {
      state.deleteInvoiceSummaryStatement.loading = false;
      state.deleteInvoiceSummaryStatement.success = true;
      if (
        state.currentSelectedAsset &&
        action.payload.data &&
        action.payload.data.asset_id === state.currentSelectedAsset.id &&
        state.currentSelectedAsset.invoice_summary_statement &&
        state.currentSelectedAsset.invoice_summary_statement.id === action.payload.data.statement_id
      ) {
        state.currentSelectedAsset.invoice_summary_statement = null;
      }
      state.invoiceSummaryStatementUploadError = null;
    },
    deleteInvoiceSummaryStatementFailure(state, action: PayloadAction<APIResponse>) {
      state.deleteInvoiceSummaryStatement.loading = false;
      state.deleteInvoiceSummaryStatement.error = action.payload.status_code;
      state.invoiceSummaryStatementUploadError = null;
    },

    // =======================================
    // filter invoices summary statement files
    // =======================================
    filterInvoiceSummaryStatementFilesRequest: (state, _action: PayloadAction<AssetInvoiceSummaryStatementListRequest['params']>) => {
      state.isLoading = true;
    },
    filterInvoiceSummaryStatementFilesSuccess: (state, action: PayloadAction<AssetInvoiceSummaryStatementListRequest['response']>) => {
      state.isLoading = false;
      state.assetSuccess = action.payload.status_code;
      if (action.payload.data && state.currentSelectedAsset) {
        const invoiceSummaryStatement = action.payload.data.summary_statements.at(0);
        if (invoiceSummaryStatement) {
          state.currentSelectedAsset.invoice_summary_statement = invoiceSummaryStatement;
        } else {
          state.currentSelectedAsset.invoice_summary_statement = null;
        }
        state.invoiceSummaryStatementUploadError = null;
      }
    },
    filterInvoiceSummaryStatementFilesFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.assetError = action.payload.status_code;
    },

    // =======================================
    // utility
    // =======================================
    gotoReviewStep: state => {
      if (state.currentSelectedAsset) {
        state.currentSelectedAsset.current_step = AssetSteps.Review;
      }
    },

    gotoIARStep: state => {
      if (state.currentSelectedAsset) {
        state.currentSelectedAsset.current_step = AssetSteps.AggregatorScada;
      }
    },

    gotoSolarReviewStep: state => {
      if (state.currentSelectedAsset) {
        state.currentSelectedAsset.current_step = SolarAssetSteps.ScadaUpload;
      }
    },
    cancelAssetsRequest(state) {
      state.isLoading = false;
      state.assetDetailsFetchLoading = false;
      state.aggregatorReportUploadLoading = false;
      state.aggregatorReportUploadError = null;
      state.scadaReportUploadLoading = false;
      state.scadaReportUploadError = null;
      state.solarScadaReportUploadLoading = false;
      state.solarScadaReportUploadError = null;
      state.iarReportUploadLoading = false;
      state.iarReportUploadError = null;
      state.mergeLoading = false;
      state.optimizedDatasetGenerationLoading = false;

      state.analyticsLoading.operations.revenue = false;
      state.analyticsLoading.operations.market_summary = false;
      state.analyticsLoading.operations.energy_price_comparison = false;
      state.analyticsLoading.operations.battery_power_over_time = false;
      state.analyticsLoading.market.summary = false;
      state.analyticsLoading.market.utilization = false;
      state.analyticsLoading.market.statistics = false;
      state.analyticsLoading.market.best_markets = false;
      state.analyticsLoading.market.revenue_distribution = false;
      state.analyticsLoading.market_prices.spread = false;
      state.analyticsLoading.market_prices.hourly_prices = false;
      state.analyticsLoading.market_prices.price_volatility = false;
      state.analyticsLoading.market_prices.correlation_matrix = false;
      state.analyticsLoading.ancillary_services.summary = false;
      state.analyticsLoading.ancillary_services.revenue_breakdown = false;
      state.analyticsLoading.ancillary_services.opportunity_cost = false;
      state.analyticsLoading.ancillary_services.hourly_service_revenue = false;
      state.analyticsLoading.imbalance.summary = false;
      state.analyticsLoading.imbalance.daily_breakdown = false;
      state.analyticsLoading.imbalance.worst_days = false;
      state.analyticsLoading.imbalance.hourly_charges = false;
      state.analyticsLoading.battery_health.summary = false;
      state.analyticsLoading.battery_health.cycle_comparison = false;
      state.analyticsLoading.battery_health.stratergy_cycle_comparison = false;
      state.analyticsLoading.battery_health.annual_projection = false;
      state.analyticsLoading.tb_spread.summary = false;
      state.analyticsLoading.tb_spread.details = false;

      state.analyticsError.operations.revenue = false;
      state.analyticsError.operations.soc = false;
      state.analyticsError.operations.market_summary = false;
      state.analyticsError.operations.energy_price_comparison = false;
      state.analyticsError.operations.battery_power_over_time = false;
      state.analyticsError.market.summary = false;
      state.analyticsError.market.utilization = false;
      state.analyticsError.market.statistics = false;
      state.analyticsError.market.best_markets = false;
      state.analyticsError.market.revenue_distribution = false;
      state.analyticsError.market_prices.spread = false;
      state.analyticsError.market_prices.hourly_prices = false;
      state.analyticsError.market_prices.price_volatility = false;
      state.analyticsError.market_prices.correlation_matrix = false;
      state.analyticsError.ancillary_services.summary = false;
      state.analyticsError.ancillary_services.revenue_breakdown = false;
      state.analyticsError.ancillary_services.opportunity_cost = false;
      state.analyticsError.ancillary_services.hourly_service_revenue = false;
      state.analyticsError.imbalance.summary = false;
      state.analyticsError.imbalance.daily_breakdown = false;
      state.analyticsError.imbalance.worst_days = false;
      state.analyticsError.imbalance.hourly_charges = false;
      state.analyticsError.battery_health.summary = false;
      state.analyticsError.battery_health.cycle_comparison = false;
      state.analyticsError.battery_health.stratergy_cycle_comparison = false;
      state.analyticsError.battery_health.annual_projection = false;
      state.analyticsError.tb_spread.summary = false;
      state.analyticsError.tb_spread.details = false;

      state.benchmarkError.revenueIARvsActual = false;
      state.benchmarkError.multiMarketOptmization = false;

      state.benchmarkLoading.revenueIARvsActual = false;
      state.benchmarkLoading.multiMarketOptmization = false;
    },
    resetCurrentSelectedAsset: state => {
      state.currentSelectedAsset = null;
    },

    resetAssetFileUploadError: state => {
      state.aggregatorReportUploadError = null;
      state.scadaReportUploadError = null;
      state.solarScadaReportUploadError = null;
      state.iarReportUploadError = null;
    },
  },
});

export const {
  // asset list
  assetListRequest,
  assetListSuccess,
  assetListFailure,

  // reassign asset ownership
  reassignAssetOwnershipRequest,
  reassignAssetOwnershipSuccess,
  reassignAssetOwnershipFailure,

  // multiple asset users
  assetMultipleUserRequest,
  assetMultipleUserSuccess,
  assetMultipleUserFailure,

  // all assets list for dropdown
  getAllAssetsListRequest,
  getAllAssetsListSuccess,
  getAllAssetsListFailure,

  // onboard new asset
  onboardAssetRequest,
  onboardAssetSuccess,
  onboardAssetFailure,

  // get asset details
  getAssetDetailsRequest,
  getAssetDetailsSuccess,
  getAssetDetailsFailure,

  // edit asset
  editAssetFailure,
  editAssetRequest,
  editAssetSuccess,

  // optmization params
  assetOptimizationParamFailure,
  assetOptimizationParamRequest,
  assetOptimizationParamSuccess,

  // aggregator report
  uploadAggregatorReportRequest,
  uploadAggregatorReportSuccess,
  uploadAggregatorReportFailure,

  // scada report upload
  uploadScadaReportRequest,
  uploadScadaReportSuccess,
  uploadScadaReportFailure,

  // solar scada report upload
  uploadSolarScadaReportRequest,
  uploadSolarScadaReportSuccess,
  uploadSolarScadaReportFailure,

  // merge dataset
  mergeDatasetRequest,
  mergeDatasetSuccess,
  mergeDatasetFailure,

  // generate optimized dataset
  generateOptimizedDatasetRequest,
  generateOptimizedDatasetSuccess,
  generateOptimizedDatasetFailure,

  // get asset operational analytics
  assetOperationalAnalyticsRequest,
  assetOperationalAnalyticsSuccess,
  assetOperationalAnalyticsFailure,

  // get asset market summary analytics
  assetMarketSummaryRequest,
  assetMarketSummarySuccess,
  assetMarketSummaryFailure,

  // get asset market summary analysis
  assetMarketSummaryAnalysisRequest,
  assetMarketSummaryAnalysisSuccess,
  assetMarketSummaryAnalysisFailure,

  // get asset ancillary service summary
  getAssetAncillaryServiceSummaryRequest,
  getAssetAncillaryServiceSummarySuccess,
  getAssetAncillaryServiceSummaryFailure,

  // get asset ancillary service revenue breakdown
  getAssetAncillaryServiceRevenueBreakdownRequest,
  getAssetAncillaryServiceRevenueBreakdownSuccess,
  getAssetAncillaryServiceRevenueBreakdownFailure,

  // get asset ancillary service opportunity cost analysis
  getAssetAncillaryServiceOpportunityCostAnalysisRequest,
  getAssetAncillaryServiceOpportunityCostAnalysisSuccess,
  getAssetAncillaryServiceOpportunityCostAnalysisFailure,

  // get asset ancillary service revenue by hour
  getAssetAncillaryServiceRevenueByHourRequest,
  getAssetAncillaryServiceRevenueByHourSuccess,
  getAssetAncillaryServiceRevenueByHourFailure,

  // get asset market statistics
  assetMarketStatisticsRequest,
  assetMarketStatisticsSuccess,
  assetMarketStatisticsFailure,

  // get asset market utilization analysis
  assetMarketUtilizationAnalysisRequest,
  assetMarketUtilizationAnalysisSuccess,
  assetMarketUtilizationAnalysisFailure,

  // get asset best markets analysis
  assetBestMarketsAnalysisRequest,
  assetBestMarketsAnalysisSuccess,
  assetBestMarketsAnalysisFailure,

  // get asset market revenue distribution
  assetMarketRevenueDistributionRequest,
  assetMarketRevenueDistributionSuccess,
  assetMarketRevenueDistributionFailure,

  // get asset market hourly price patterns
  assetMarketHourlyPricePatternsRequest,
  assetMarketHourlyPricePatternsSuccess,
  assetMarketHourlyPricePatternsFailure,

  // get asset energy price comparison analytics
  assetEnergyPriceComparisonRequest,
  assetEnergyPriceComparisonSuccess,
  assetEnergyPriceComparisonFailure,

  // get asset battery power over time analytics
  assetBatteryPowerOverTimeRequest,
  assetBatteryPowerOverTimeSuccess,
  assetBatteryPowerOverTimeFailure,

  // get asset market price spread analysis
  getAssetMarketPriceSpreadRequest,
  getAssetMarketPriceSpreadSuccess,
  getAssetMarketPriceSpreadFailure,

  // get asset market price volatility analysis
  getAssetMarketPriceVolatilityRequest,
  getAssetMarketPriceVolatilitySuccess,
  getAssetMarketPriceVolatilityFailure,

  // get asset market price correlation matrix analysis
  getAssetMarketPriceCorrelationMatrixRequest,
  getAssetMarketPriceCorrelationMatrixSuccess,
  getAssetMarketPriceCorrelationMatrixFailure,

  // get executive analysis monthly revenue comparision
  getExecutiveAnalysisMonthlyRevenueComparisonFailure,
  getExecutiveAnalysisMonthlyRevenueComparisonRequest,
  getExecutiveAnalysisMonthlyRevenueComparisonSuccess,

  // get executive analysis revenu by stream
  getExecutiveAnalysisRevenueByStreamFailure,
  getExecutiveAnalysisRevenueByStreamRequest,
  getExecutiveAnalysisRevenueByStreamSuccess,

  // get executive analysis summary
  getExecutiveAnalysisSummaryFailure,
  getExecutiveAnalysisSummaryRequest,
  getExecutiveAnalysisSummarySuccess,

  // get asset IAR report upload
  uploadIARReportRequest,
  uploadIARReportSuccess,
  uploadIARReportFailure,

  // create asset
  createAssetRequest,
  createAssetSuccess,
  createAssetFailure,

  // submit asset for approval
  submitAssetForApprovalRequest,
  submitAssetForApprovalSuccess,
  submitAssetForApprovalFailure,

  // get industry comparison benchmark
  getIndustryComparisonRequest,
  getIndustryComparisonSuccess,
  getIndustryComparisonFailure,
  resetIndustryComparisonMessage,

  // get revenue IAR vs actual benchmark
  getAssetBenchmarkRevenueIARvsActualRequest,
  getAssetBenchmarkRevenueIARvsActualSuccess,
  getAssetBenchmarkRevenueIARvsActualFailure,

  // get multi market optimized vs actual benchmark
  getAssetBenchmarkMultiMarketOptimizedVsActualRequest,
  getAssetBenchmarkMultiMarketOptimizedVsActualSuccess,
  getAssetBenchmarkMultiMarketOptimizedVsActualFailure,

  // get asset imbalance analysis summary
  getAssetImbalanceAnalysisSummaryRequest,
  getAssetImbalanceAnalysisSummarySuccess,
  getAssetImbalanceAnalysisSummaryFailure,

  // get asset imbalance daily breakdown
  getAssetImbalanceDailyBreakdownRequest,
  getAssetImbalanceDailyBreakdownSuccess,
  getAssetImbalanceDailyBreakdownFailure,

  // get asset imbalance top worst days
  getAssetImbalanceTopWorstDaysRequest,
  getAssetImbalanceTopWorstDaysSuccess,
  getAssetImbalanceTopWorstDaysFailure,

  // get asset imbalance hourly charges
  getAssetImbalanceHourlyChargesRequest,
  getAssetImbalanceHourlyChargesSuccess,
  getAssetImbalanceHourlyChargesFailure,

  // get asset battery health summary
  getAssetBatteryHealthSummaryRequest,
  getAssetBatteryHealthSummarySuccess,
  getAssetBatteryHealthSummaryFailure,

  // get asset battery health cycle comparison
  getAssetBatteryHealthCycleComparisonRequest,
  getAssetBatteryHealthCycleComparisonSuccess,
  getAssetBatteryHealthCycleComparisonFailure,

  // get asset battery health strategy cycling comparison
  getAssetBatteryHealthStrategyCyclingComparisonRequest,
  getAssetBatteryHealthStrategyCyclingComparisonSuccess,
  getAssetBatteryHealthStrategyCyclingComparisonFailure,

  // get asset battery health annual projection report
  getAssetBatteryHealthAnnualProjectionReportRequest,
  getAssetBatteryHealthAnnualProjectionReportSuccess,
  getAssetBatteryHealthAnnualProjectionReportFailure,

  // get asset battery health daily cycles
  getAssetBatteryHealthDailyCyclesRequest,
  getAssetBatteryHealthDailyCyclesSuccess,
  getAssetBatteryHealthDailyCyclesFailure,

  // get asset battery health warranty exceedance
  getAssetBatteryHealthWarrantyExceedanceRequest,
  getAssetBatteryHealthWarrantyExceedanceSuccess,
  getAssetBatteryHealthWarrantyExceedanceFailure,

  // get tb spread summary
  getAssetTBSpreadSummaryRequest,
  getAssetTBSpreadSummarySuccess,
  getAssetTBSpreadSummaryFailure,

  // get tb spread details
  getAssetTBSpreadDetailsRequest,
  getAssetTBSpreadDetailsSuccess,
  getAssetTBSpreadDetailsFailure,

  // get asset solar kpi vitals
  getAssetSolarKpiVitalsRequest,
  getAssetSolarKpiVitalsSuccess,
  getAssetSolarKpiVitalsFailure,

  // get asset solar generation split
  getAssetSolarGenerationSplitRequest,
  getAssetSolarGenerationSplitSuccess,
  getAssetSolarGenerationSplitFailure,

  // get asset solar daily generation trend
  getAssetSolarDailyTrendRequest,
  getAssetSolarDailyTrendSuccess,
  getAssetSolarDailyTrendFailure,

  // get asset solar irradiance trend
  getAssetSolarIrradianceTrendRequest,
  getAssetSolarIrradianceTrendSuccess,
  getAssetSolarIrradianceTrendFailure,

  // get files request
  currentAssetFilesRequest,
  currentAssetFilesSuccess,
  currentAssetFilesFailure,

  // filter scada, aggregator files
  filterAggregatorScadaFilesRequest,
  filterAggregatorScadaFilesSuccess,
  filterAggregatorScadaFilesFailure,

  // filter solar scada files
  filterSolarScadaFilesRequest,
  filterSolarScadaFilesSuccess,
  filterSolarScadaFilesFailure,

  // filter merged dataset files
  filterInvoiceFilesRequest,
  filterInvoiceFilesSuccess,
  filterInvoiceFilesFailure,

  // filter invoice settlement files
  filterInvoiceSettlementFilesRequest,
  filterInvoiceSettlementFilesSuccess,
  filterInvoiceSettlementFilesFailure,

  // update asset reporting period
  updateAssetReportingPeriodRequest,
  updateAssetReportingPeriodSuccess,
  updateAssetReportingPeriodFailure,

  // update asset invoice reporting period
  updateAssetInvoiceReportingPeriodRequest,
  updateAssetInvoiceReportingPeriodSuccess,
  updateAssetInvoiceReportingPeriodFailure,

  // remove asset files
  removeAssetFileRequest,
  removeAssetFileSuccess,
  removeAssetFileFailure,

  // upload invoices
  uploadInvoicesRequest,
  uploadInvoicesSuccess,
  uploadInvoicesFailure,

  // delete invoice
  deleteInvoiceRequest,
  deleteInvoiceSuccess,
  deleteInvoiceFailure,

  // upload invoices settlement
  uploadInvoiceSettlementRequest,
  uploadInvoiceSettlementSuccess,
  uploadInvoiceSettlementFailure,

  // delete invoices settlement
  deleteInvoiceSettlementRequest,
  deleteInvoiceSettlementSuccess,
  deleteInvoiceSettlementFailure,

  // upload invoices summary settlement
  uploadInvoiceSummaryStatementRequest,
  uploadInvoiceSummaryStatementSuccess,
  uploadInvoiceSummaryStatementFailure,

  // delete invoices summary settlement
  deleteInvoiceSummaryStatementRequest,
  deleteInvoiceSummaryStatementSuccess,
  deleteInvoiceSummaryStatementFailure,

  // filter invoices summary settlement files
  filterInvoiceSummaryStatementFilesRequest,
  filterInvoiceSummaryStatementFilesSuccess,
  filterInvoiceSummaryStatementFilesFailure,

  // utility & reset message
  cancelAssetsRequest,
  resetCurrentSelectedAsset,
  resetAssetFileUploadError,
  gotoReviewStep,
  resetAssetMessage,
  gotoIARStep,
  gotoSolarReviewStep,
} = assetSlice.actions;
export default assetSlice.reducer;
