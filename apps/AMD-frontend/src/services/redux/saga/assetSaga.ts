import {call, put, takeEvery, takeLatest, takeLeading} from 'redux-saga/effects';
import {
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

  // all assets list
  getAllAssetsListRequest,
  getAllAssetsListSuccess,
  getAllAssetsListFailure,

  // onboard asset
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

  // asset analytics
  assetOperationalAnalyticsRequest,
  assetOperationalAnalyticsSuccess,
  assetOperationalAnalyticsFailure,

  // asset market summary
  assetMarketSummaryAnalysisRequest,
  assetMarketSummaryAnalysisSuccess,
  assetMarketSummaryAnalysisFailure,

  // asset ancillary service summary
  getAssetAncillaryServiceSummaryRequest,
  getAssetAncillaryServiceSummarySuccess,
  getAssetAncillaryServiceSummaryFailure,

  // asset ancillary service revenue breakdown
  getAssetAncillaryServiceRevenueBreakdownRequest,
  getAssetAncillaryServiceRevenueBreakdownSuccess,
  getAssetAncillaryServiceRevenueBreakdownFailure,

  // asset ancillary service opportunity cost analysis
  getAssetAncillaryServiceOpportunityCostAnalysisRequest,
  getAssetAncillaryServiceOpportunityCostAnalysisSuccess,
  getAssetAncillaryServiceOpportunityCostAnalysisFailure,

  // get asset ancillary service revenue by hour
  getAssetAncillaryServiceRevenueByHourRequest,
  getAssetAncillaryServiceRevenueByHourSuccess,
  getAssetAncillaryServiceRevenueByHourFailure,

  // asset market statistics
  assetMarketStatisticsRequest,
  assetMarketStatisticsSuccess,
  assetMarketStatisticsFailure,

  // asset market utilization analysis
  assetMarketUtilizationAnalysisRequest,
  assetMarketUtilizationAnalysisSuccess,
  assetMarketUtilizationAnalysisFailure,

  // asset best markets analysis
  assetBestMarketsAnalysisRequest,
  assetBestMarketsAnalysisSuccess,
  assetBestMarketsAnalysisFailure,

  // asset market revenue distribution
  assetMarketRevenueDistributionRequest,
  assetMarketRevenueDistributionSuccess,
  assetMarketRevenueDistributionFailure,

  // asset market hourly price patterns
  assetMarketHourlyPricePatternsRequest,
  assetMarketHourlyPricePatternsSuccess,
  assetMarketHourlyPricePatternsFailure,

  // merge dataset
  mergeDatasetRequest,
  mergeDatasetSuccess,
  mergeDatasetFailure,

  // get asset market summary analytics
  assetMarketSummaryRequest,
  assetMarketSummarySuccess,
  assetMarketSummaryFailure,

  // asset energy price comparison
  assetEnergyPriceComparisonRequest,
  assetEnergyPriceComparisonSuccess,
  assetEnergyPriceComparisonFailure,

  // asset battery power over time
  assetBatteryPowerOverTimeRequest,
  assetBatteryPowerOverTimeSuccess,
  assetBatteryPowerOverTimeFailure,

  // asset market price spread analysis
  getAssetMarketPriceSpreadRequest,
  getAssetMarketPriceSpreadSuccess,
  getAssetMarketPriceSpreadFailure,

  // asset market price volatility analysis
  getAssetMarketPriceVolatilityRequest,
  getAssetMarketPriceVolatilitySuccess,
  getAssetMarketPriceVolatilityFailure,

  // asset market price correlation matrix analysis
  getAssetMarketPriceCorrelationMatrixRequest,
  getAssetMarketPriceCorrelationMatrixSuccess,
  getAssetMarketPriceCorrelationMatrixFailure,

  // generate optimized dataset
  generateOptimizedDatasetRequest,
  generateOptimizedDatasetSuccess,
  generateOptimizedDatasetFailure,

  // iar report upload
  uploadIARReportRequest,
  uploadIARReportSuccess,
  uploadIARReportFailure,

  // create asset
  createAssetFailure,
  createAssetRequest,
  createAssetSuccess,

  // submit asset for approval
  submitAssetForApprovalFailure,
  submitAssetForApprovalRequest,
  submitAssetForApprovalSuccess,

  // benchmark analysis
  getIndustryComparisonRequest,
  getIndustryComparisonSuccess,
  getIndustryComparisonFailure,
  getAssetBenchmarkRevenueIARvsActualRequest,
  getAssetBenchmarkRevenueIARvsActualSuccess,
  getAssetBenchmarkRevenueIARvsActualFailure,
  getAssetBenchmarkMultiMarketOptimizedVsActualRequest,
  getAssetBenchmarkMultiMarketOptimizedVsActualSuccess,
  getAssetBenchmarkMultiMarketOptimizedVsActualFailure,

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

  // upload invoices
  uploadInvoicesRequest,
  uploadInvoicesSuccess,
  uploadInvoicesFailure,

  // delete invoice
  deleteInvoiceRequest,
  deleteInvoiceSuccess,
  deleteInvoiceFailure,

  // upload invoice settlement
  uploadInvoiceSettlementRequest,
  uploadInvoiceSettlementSuccess,
  uploadInvoiceSettlementFailure,

  // delete invoice settlement
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
} from '../slice/assetSlice';
import {
  getAssets,
  reassignAssetOwnership,
  getAssetMultipleUsers,
  onboardNewAsset,
  getAssetDetails,
  editAssetDetails,
  optimizationParams,
  uploadAggregatorReport,
  uploadScadaReport,
  uploadSolarScadaReport,
  mergeAssetDatasets,
  assetOperationalAnalytics,
  assetMarketSummary,
  assetMarketSummaryAnalysis,
  getAssetAncillaryServiceSummary,
  getAssetAncillaryServiceRevenueBreakdown,
  getAssetAncillaryServiceOpportunityCostAnalysis,
  getAssetAncillaryServiceRevenueByHour,
  assetMarketStatistics,
  assetMarketUtilizationAnalysis,
  assetBestMarketsAnalysis,
  assetMarketRevenueDistribution,
  assetMarketHourlyPricePatterns,
  assetEnergyPriceComparison,
  assetBatteryPowerOverTime,
  getAssetMarketPriceSpread,
  getAssetMarketPriceVolatility,
  getAssetMarketPriceCorrelationMatrix,
  generateOptimizedDataset,
  uploadIARReport,
  submitAssetForApproval,
  activateAsset,
  getAssetIndustryBenchmarkAnalysis,
  getAssetBenchmarkRevenueIARvsActual,
  getAssetBenchmarkMultiMarketOptimizedVsActual,
  getAssetFiles,
  removeAssetFile,
  getAssetImbalanceSummary,
  getAssetImbalanceDailyBreakdown,
  getAssetImbalanceWorstDays,
  getAssetImbalanceHourlyCharges,
  getAssetBatteryHealthSummary,
  getAssetBatteryHealthCycleComparison,
  getAssetBatteryHealthStrategyCyclingComparison,
  getAssetBatteryHealthAnnualProjectionReport,
  getAssetBatteryHealthDailyCycles,
  getAssetBatteryHealthWarrantyExceedance,
  getAssetTBSpreadSummary,
  getAssetTBSpreadDetails,
  getAssetSolarKpiVitals,
  getAssetSolarGenerationSplit,
  getAssetSolarDailyTrend,
  getAssetSolarIrradianceTrend,
  getAssetExecutiveAnalysisMonthRevenueComparison,
  getAssetExecutiveAnalysisRevenueByStream,
  getAssetExecutiveAnalysisSummary,
  uploadInvoice,
  deleteInvoice,
  getInvoicesList,
  uploadInvoiceSettlement,
  deleteInvoiceSettlement,
  getInvoicesSettlementList,
  uploadAssetInvoiceStatementSummary,
  deleteAssetInvoiceStatementSummary,
  getAssetInvoiceStatementSummaryList,
} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* UploadAggregatorReportSaga(action: ReturnType<typeof uploadAggregatorReportRequest>): Generator {
  try {
    const response: any = yield call(uploadAggregatorReport, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadAggregatorReportSuccess(response.data));
    } else {
      yield put(uploadAggregatorReportFailure(response.data));
    }
  } catch (error: any) {
    yield put(uploadAggregatorReportFailure(error.response?.data || error.response));
  }
}

function* AssetListSaga(action: ReturnType<typeof assetListRequest>): Generator {
  try {
    const response: any = yield call(getAssets, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetListSuccess({data: response.data, params: action.payload}));
    } else {
      yield put(assetListFailure({data: response.data, params: action.payload}));
    }
  } catch (error: any) {
    yield put(assetListFailure({data: error.response?.data || error.response, params: action.payload}));
  }
}

function* ReassignAssetOwnershipSaga(action: ReturnType<typeof reassignAssetOwnershipRequest>): Generator {
  try {
    const response: any = yield call(reassignAssetOwnership, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(reassignAssetOwnershipSuccess(response.data));
    } else {
      yield put(reassignAssetOwnershipFailure(response.data));
    }
  } catch (error: any) {
    yield put(reassignAssetOwnershipFailure(error.response?.data || error.response));
  }
}

function* AssetMultipleUserSaga(action: ReturnType<typeof assetMultipleUserRequest>): Generator {
  try {
    const response: any = yield call(getAssetMultipleUsers, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMultipleUserSuccess(response.data));
    } else {
      yield put(assetMultipleUserFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMultipleUserFailure(error.response?.data || error.response));
  }
}

function* GetAllAssetsListSaga(action: ReturnType<typeof getAllAssetsListRequest>): Generator {
  try {
    const response: any = yield call(getAssets, {limit: -1});
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAllAssetsListSuccess(response.data));
      action.payload?.onSuccess?.(response.data);
    } else {
      yield put(getAllAssetsListFailure(response.data));
      action.payload?.onFailure?.(response.data);
    }
  } catch (error: any) {
    yield put(getAllAssetsListFailure(error.response?.data || error.response));
    action.payload?.onFailure?.(error.response?.data || error.response);
  }
}

function* OnboardAssetSaga(action: ReturnType<typeof onboardAssetRequest>): Generator {
  try {
    const response: any = yield call(onboardNewAsset, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(onboardAssetSuccess(response.data));
    } else {
      yield put(onboardAssetFailure(response.data));
    }
  } catch (error: any) {
    yield put(onboardAssetFailure(error.response?.data || error.response));
  }
}

function* GetAssetDetailsSaga(action: ReturnType<typeof getAssetDetailsRequest>): Generator {
  try {
    const response: any = yield call(getAssetDetails, {id: action.payload.id, skip_audit: action.payload.skip_audit});
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetDetailsSuccess(response.data));
    } else if (response.status === 403) {
      // Org or asset access was revoked — pass a distinct code so screens can show the access-denied modal
      yield put(getAssetDetailsFailure({status_code: 'E-ACCESS-DENIED', status: 'error', message: 'Access denied'}));
    } else {
      yield put(getAssetDetailsFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetDetailsFailure(error.response?.data || error.response));
  }
}

function* EditAssetSaga(action: ReturnType<typeof editAssetRequest>): Generator {
  try {
    const response: any = yield call(editAssetDetails, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(editAssetSuccess(response.data));
    } else {
      yield put(editAssetFailure(response.data));
    }
  } catch (error: any) {
    yield put(editAssetFailure(error.response?.data || error.response));
  }
}

function* OptimizationParamsSaga(action: ReturnType<typeof assetOptimizationParamRequest>): Generator {
  try {
    const response: any = yield call(optimizationParams, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetOptimizationParamSuccess(response.data));
    } else {
      yield put(assetOptimizationParamFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetOptimizationParamFailure(error.response?.data || error.response));
  }
}

function* UploadScadaReportSaga(action: ReturnType<typeof uploadScadaReportRequest>): Generator {
  try {
    const response: any = yield call(uploadScadaReport, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadScadaReportSuccess(response.data));
    } else {
      yield put(uploadScadaReportFailure(response.data));
    }
  } catch (error: any) {
    yield put(uploadScadaReportFailure(error.response?.data || error.response));
  }
}

function* UploadSolarScadaReportSaga(action: ReturnType<typeof uploadSolarScadaReportRequest>): Generator {
  try {
    const response: any = yield call(uploadSolarScadaReport, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadSolarScadaReportSuccess(response.data));
    } else {
      yield put(uploadSolarScadaReportFailure(response.data));
    }
  } catch (error: any) {
    yield put(uploadSolarScadaReportFailure(error.response?.data || error.response));
  }
}

function* MergeScadaReportSaga(action: ReturnType<typeof mergeDatasetRequest>): Generator {
  try {
    const response: any = yield call(mergeAssetDatasets, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(mergeDatasetSuccess(response.data));
    } else {
      yield put(mergeDatasetFailure(response.data));
    }
  } catch (error: any) {
    yield put(mergeDatasetFailure(error.response?.data || error.response));
  }
}

function* GenerateOptimizedDatasetSaga(action: ReturnType<typeof generateOptimizedDatasetRequest>): Generator {
  try {
    const response: any = yield call(generateOptimizedDataset, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(generateOptimizedDatasetSuccess(response.data));
    } else {
      yield put(generateOptimizedDatasetFailure(response.data));
    }
  } catch (error: any) {
    yield put(generateOptimizedDatasetFailure(error.response?.data || error.response));
  }
}

function* UploadIARReportSaga(action: ReturnType<typeof uploadIARReportRequest>): Generator {
  try {
    const response: any = yield call(uploadIARReport, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadIARReportSuccess(response.data));
    } else {
      yield put(uploadIARReportFailure(response.data));
    }
  } catch (error: any) {
    yield put(uploadIARReportFailure(error.response?.data || error.response));
  }
}

function* AssetOperationalAnalyticsSaga(action: ReturnType<typeof assetOperationalAnalyticsRequest>): Generator {
  try {
    const response: any = yield call(assetOperationalAnalytics, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetOperationalAnalyticsSuccess(response.data));
    } else {
      yield put(assetOperationalAnalyticsFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetOperationalAnalyticsFailure(error.response?.data || error.response));
  }
}

function* AssetMarketSummarySaga(action: ReturnType<typeof assetMarketSummaryRequest>): Generator {
  try {
    const response: any = yield call(assetMarketSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketSummarySuccess(response.data));
    } else {
      yield put(assetMarketSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketSummaryFailure(error.response?.data || error.response));
  }
}

function* AssetMarketSummaryAnalysisSaga(action: ReturnType<typeof assetMarketSummaryAnalysisRequest>): Generator {
  try {
    const response: any = yield call(assetMarketSummaryAnalysis, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketSummaryAnalysisSuccess(response.data));
    } else {
      yield put(assetMarketSummaryAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketSummaryAnalysisFailure(error.response?.data || error.response));
  }
}

function* GetAssetAncillaryServiceSummarySaga(
  action: ReturnType<typeof getAssetAncillaryServiceSummaryRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetAncillaryServiceSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetAncillaryServiceSummarySuccess(response.data));
    } else {
      yield put(getAssetAncillaryServiceSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetAncillaryServiceSummaryFailure(error.response?.data || error.response));
  }
}

function* GetAssetAncillaryServiceRevenueBreakdownSaga(
  action: ReturnType<typeof getAssetAncillaryServiceRevenueBreakdownRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetAncillaryServiceRevenueBreakdown, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetAncillaryServiceRevenueBreakdownSuccess(response.data));
    } else {
      yield put(getAssetAncillaryServiceRevenueBreakdownFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetAncillaryServiceRevenueBreakdownFailure(error.response?.data || error.response));
  }
}

function* GetAssetAncillaryServiceOpportunityCostAnalysisSaga(
  action: ReturnType<typeof getAssetAncillaryServiceOpportunityCostAnalysisRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetAncillaryServiceOpportunityCostAnalysis, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetAncillaryServiceOpportunityCostAnalysisSuccess(response.data));
    } else {
      yield put(getAssetAncillaryServiceOpportunityCostAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetAncillaryServiceOpportunityCostAnalysisFailure(error.response?.data || error.response));
  }
}

function* GetAssetAncillaryServiceRevenueByHourSaga(
  action: ReturnType<typeof getAssetAncillaryServiceRevenueByHourRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetAncillaryServiceRevenueByHour, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetAncillaryServiceRevenueByHourSuccess(response.data));
    } else {
      yield put(getAssetAncillaryServiceRevenueByHourFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetAncillaryServiceRevenueByHourFailure(error.response?.data || error.response));
  }
}

function* AssetMarketStatisticsSaga(action: ReturnType<typeof assetMarketStatisticsRequest>): Generator {
  try {
    const response: any = yield call(assetMarketStatistics, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketStatisticsSuccess(response.data));
    } else {
      yield put(assetMarketStatisticsFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketStatisticsFailure(error.response?.data || error.response));
  }
}

function* AssetMarketUtilizationAnalysisSaga(
  action: ReturnType<typeof assetMarketUtilizationAnalysisRequest>,
): Generator {
  try {
    const response: any = yield call(assetMarketUtilizationAnalysis, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketUtilizationAnalysisSuccess(response.data));
    } else {
      yield put(assetMarketUtilizationAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketUtilizationAnalysisFailure(error.response?.data || error.response));
  }
}

function* AssetBestMarketsAnalysisSaga(action: ReturnType<typeof assetBestMarketsAnalysisRequest>): Generator {
  try {
    const response: any = yield call(assetBestMarketsAnalysis, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetBestMarketsAnalysisSuccess(response.data));
    } else {
      yield put(assetBestMarketsAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetBestMarketsAnalysisFailure(error.response?.data || error.response));
  }
}

function* AssetMarketRevenueDistributionSaga(
  action: ReturnType<typeof assetMarketRevenueDistributionRequest>,
): Generator {
  try {
    const response: any = yield call(assetMarketRevenueDistribution, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketRevenueDistributionSuccess(response.data));
    } else {
      yield put(assetMarketRevenueDistributionFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketRevenueDistributionFailure(error.response?.data || error.response));
  }
}

function* AssetMarketHourlyPricePatternsSaga(
  action: ReturnType<typeof assetMarketHourlyPricePatternsRequest>,
): Generator {
  try {
    const response: any = yield call(assetMarketHourlyPricePatterns, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetMarketHourlyPricePatternsSuccess(response.data));
    } else {
      yield put(assetMarketHourlyPricePatternsFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetMarketHourlyPricePatternsFailure(error.response?.data || error.response));
  }
}

function* AssetEnergyPriceComparisonSaga(action: ReturnType<typeof assetEnergyPriceComparisonRequest>): Generator {
  try {
    const response: any = yield call(assetEnergyPriceComparison, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetEnergyPriceComparisonSuccess(response.data));
    } else {
      yield put(assetEnergyPriceComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetEnergyPriceComparisonFailure(error.response?.data || error.response));
  }
}

function* AssetBatteryPowerOverTimeSaga(action: ReturnType<typeof assetBatteryPowerOverTimeRequest>): Generator {
  try {
    const response: any = yield call(assetBatteryPowerOverTime, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assetBatteryPowerOverTimeSuccess(response.data));
    } else {
      yield put(assetBatteryPowerOverTimeFailure(response.data));
    }
  } catch (error: any) {
    yield put(assetBatteryPowerOverTimeFailure(error.response?.data || error.response));
  }
}

function* GetAssetMarketPriceSpreadSaga(action: ReturnType<typeof getAssetMarketPriceSpreadRequest>): Generator {
  try {
    const response: any = yield call(getAssetMarketPriceSpread, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetMarketPriceSpreadSuccess(response.data));
    } else {
      yield put(getAssetMarketPriceSpreadFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetMarketPriceSpreadFailure(error.response?.data || error.response));
  }
}

function* GetAssetMarketPriceVolatilitySaga(
  action: ReturnType<typeof getAssetMarketPriceVolatilityRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetMarketPriceVolatility, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetMarketPriceVolatilitySuccess(response.data));
    } else {
      yield put(getAssetMarketPriceVolatilityFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetMarketPriceVolatilityFailure(error.response?.data || error.response));
  }
}

function* GetAssetMarketPriceCorrelationMatrixSaga(
  action: ReturnType<typeof getAssetMarketPriceCorrelationMatrixRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetMarketPriceCorrelationMatrix, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetMarketPriceCorrelationMatrixSuccess(response.data));
    } else {
      yield put(getAssetMarketPriceCorrelationMatrixFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetMarketPriceCorrelationMatrixFailure(error.response?.data || error.response));
  }
}

function* CreateAssetSaga(action: ReturnType<typeof createAssetRequest>): Generator {
  try {
    const response: any = yield call(activateAsset, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(createAssetSuccess({data: response.data, params: action.payload}));
    } else {
      yield put(createAssetFailure(response.data));
    }
  } catch (error: any) {
    yield put(createAssetFailure(error.response?.data || error.response));
  }
}

function* SubmitAssetForApprovalSaga(action: ReturnType<typeof submitAssetForApprovalRequest>): Generator {
  try {
    const response: any = yield call(submitAssetForApproval, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(submitAssetForApprovalSuccess({data: response.data, params: action.payload}));
    } else {
      yield put(submitAssetForApprovalFailure(response.data));
    }
  } catch (error: any) {
    yield put(submitAssetForApprovalFailure(error.response?.data || error.response));
  }
}

function* GetIndustryComparisonSaga(action: ReturnType<typeof getIndustryComparisonRequest>): Generator {
  try {
    const response: any = yield call(getAssetIndustryBenchmarkAnalysis, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getIndustryComparisonSuccess(response.data));
    } else {
      yield put(getIndustryComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(getIndustryComparisonFailure(error.response?.data || error.response));
  }
}

function* GetAssetBenchmarkRevenueIARvsActualSaga(
  action: ReturnType<typeof getAssetBenchmarkRevenueIARvsActualRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBenchmarkRevenueIARvsActual, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBenchmarkRevenueIARvsActualSuccess(response.data));
    } else {
      yield put(getAssetBenchmarkRevenueIARvsActualFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBenchmarkRevenueIARvsActualFailure(error.response?.data || error.response));
  }
}

function* GetAssetBenchmarkMultiMarketOptimizedVsActualSaga(
  action: ReturnType<typeof getAssetBenchmarkMultiMarketOptimizedVsActualRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBenchmarkMultiMarketOptimizedVsActual, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBenchmarkMultiMarketOptimizedVsActualSuccess(response.data));
    } else {
      yield put(getAssetBenchmarkMultiMarketOptimizedVsActualFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBenchmarkMultiMarketOptimizedVsActualFailure(error.response?.data || error.response));
  }
}

function* GetAssetFilesSaga(action: ReturnType<typeof currentAssetFilesRequest>): Generator {
  try {
    const response: any = yield call(getAssetFiles, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(currentAssetFilesSuccess(response.data));
    } else {
      yield put(currentAssetFilesFailure(response.data));
    }
  } catch (error: any) {
    yield put(currentAssetFilesFailure(error.response?.data || error.response));
  }
}

function* FilterAssetAggregatorScadaFileSaga(action: ReturnType<typeof filterAggregatorScadaFilesRequest>): Generator {
  try {
    // Call both APIs in parallel - update active period and filter files
    const filesResponse: any = yield call(getAssetFiles, action.payload);

    // Check if both calls succeeded
    if (filesResponse.data.status === SUCCESS_KEY) {
      yield put(filterAggregatorScadaFilesSuccess({response: filesResponse.data, params: action.payload}));
    } else {
      yield put(filterAggregatorScadaFilesFailure(filesResponse.data));
    }
  } catch (error: any) {
    yield put(filterAggregatorScadaFilesFailure(error.response?.data || error.response));
  }
}

function* FilterAssetSolarScadaFileSaga(action: ReturnType<typeof filterSolarScadaFilesRequest>): Generator {
  try {
    const filesResponse: any = yield call(getAssetFiles, action.payload);

    if (filesResponse.data.status === SUCCESS_KEY) {
      yield put(filterSolarScadaFilesSuccess({response: filesResponse.data, params: action.payload}));
    } else {
      yield put(filterSolarScadaFilesFailure(filesResponse.data));
    }
  } catch (error: any) {
    yield put(filterSolarScadaFilesFailure(error.response?.data || error.response));
  }
}

function* FilterInvoiceFilesSaga(action: ReturnType<typeof filterInvoiceFilesRequest>): Generator {
  try {
    // Call both APIs in parallel - update active period and filter files
    const filesResponse: any = yield call(getInvoicesList, action.payload);

    // Check if both calls succeeded
    if (filesResponse.data.status === SUCCESS_KEY) {
      yield put(filterInvoiceFilesSuccess(filesResponse.data));
    } else {
      yield put(filterInvoiceFilesFailure(filesResponse.data));
    }
  } catch (error: any) {
    yield put(filterInvoiceFilesFailure(error.response?.data || error.response));
  }
}

function* FilterInvoiceSettlementFilesSaga(action: ReturnType<typeof filterInvoiceSettlementFilesRequest>): Generator {
  try {
    // Call both APIs in parallel - update active period and filter files
    const filesResponse: any = yield call(getInvoicesSettlementList, action.payload);

    // Check if both calls succeeded
    if (filesResponse.data.status === SUCCESS_KEY) {
      yield put(filterInvoiceSettlementFilesSuccess(filesResponse.data));
    } else {
      yield put(filterInvoiceSettlementFilesFailure(filesResponse.data));
    }
  } catch (error: any) {
    yield put(filterInvoiceSettlementFilesFailure(error.response?.data || error.response));
  }
}

function* FilterInvoiceSummaryStatementFilesSaga(action: ReturnType<typeof filterInvoiceSummaryStatementFilesRequest>): Generator {
  try {
    // Call both APIs in parallel - update active period and filter files
    const filesResponse: any = yield call(getAssetInvoiceStatementSummaryList, action.payload);

    // Check if both calls succeeded
    if (filesResponse.data.status === SUCCESS_KEY) {
      yield put(filterInvoiceSummaryStatementFilesSuccess(filesResponse.data));
    } else {
      yield put(filterInvoiceSummaryStatementFilesFailure(filesResponse.data));
    }
  } catch (error: any) {
    yield put(filterInvoiceSummaryStatementFilesFailure(error.response?.data || error.response));
  }
}

function* UpdateAssetReportingPeriodSaga(action: ReturnType<typeof updateAssetReportingPeriodRequest>): Generator {
  try {
    const response: any = yield call(editAssetDetails, {
      id: action.payload.assetId,
      active_month: action.payload.month,
      active_year: action.payload.year,
    });
    if (response.data.status === SUCCESS_KEY) {
      yield put(updateAssetReportingPeriodSuccess(response.data));
    } else {
      yield put(updateAssetReportingPeriodFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateAssetReportingPeriodFailure(error.response?.data || error.response));
  }
}

function* UpdateAssetInvoiceReportingPeriodSaga(action: ReturnType<typeof updateAssetInvoiceReportingPeriodRequest>): Generator {
  try {
    const response: any = yield call(editAssetDetails, {
      id: action.payload.assetId,
      active_invoice_month: action.payload.month,
      active_invoice_year: action.payload.year,
    });
    if (response.data.status === SUCCESS_KEY) {
      yield put(updateAssetInvoiceReportingPeriodSuccess(response.data));
    } else {
      yield put(updateAssetInvoiceReportingPeriodFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateAssetInvoiceReportingPeriodFailure(error.response?.data || error.response));
  }
}

function* RemoveAssetFileSaga(action: ReturnType<typeof removeAssetFileRequest>): Generator {
  try {
    const response: any = yield call(removeAssetFile, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(removeAssetFileSuccess(response.data));
    } else {
      yield put(removeAssetFileFailure(response.data));
    }
  } catch (error: any) {
    yield put(removeAssetFileFailure(error.response?.data || error.response));
  }
}

function* GetAssetImbalanceAnalysisSummarySaga(
  action: ReturnType<typeof getAssetImbalanceAnalysisSummaryRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetImbalanceSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetImbalanceAnalysisSummarySuccess(response.data));
    } else {
      yield put(getAssetImbalanceAnalysisSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetImbalanceAnalysisSummaryFailure(error.response?.data || error.response));
  }
}

function* GetAssetImbalanceDailyBreakdownSaga(
  action: ReturnType<typeof getAssetImbalanceDailyBreakdownRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetImbalanceDailyBreakdown, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetImbalanceDailyBreakdownSuccess(response.data));
    } else {
      yield put(getAssetImbalanceDailyBreakdownFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetImbalanceDailyBreakdownFailure(error.response?.data || error.response));
  }
}

function* GetAssetImbalanceWorstDaysSaga(action: ReturnType<typeof getAssetImbalanceTopWorstDaysRequest>): Generator {
  try {
    const response: any = yield call(getAssetImbalanceWorstDays, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetImbalanceTopWorstDaysSuccess(response.data));
    } else {
      yield put(getAssetImbalanceTopWorstDaysFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetImbalanceTopWorstDaysFailure(error.response?.data || error.response));
  }
}

function* GetAssetImbalanceHourlyChargesSaga(
  action: ReturnType<typeof getAssetImbalanceHourlyChargesRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetImbalanceHourlyCharges, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetImbalanceHourlyChargesSuccess(response.data));
    } else {
      yield put(getAssetImbalanceHourlyChargesFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetImbalanceHourlyChargesFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthSummarySaga(action: ReturnType<typeof getAssetBatteryHealthSummaryRequest>): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthSummarySuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthSummaryFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthCycleComparisonSaga(
  action: ReturnType<typeof getAssetBatteryHealthCycleComparisonRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthCycleComparison, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthCycleComparisonSuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthCycleComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthCycleComparisonFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthStrategyCyclingComparisonSaga(
  action: ReturnType<typeof getAssetBatteryHealthStrategyCyclingComparisonRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthStrategyCyclingComparison, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthStrategyCyclingComparisonSuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthStrategyCyclingComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthStrategyCyclingComparisonFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthAnnualProjectionReportSaga(
  action: ReturnType<typeof getAssetBatteryHealthAnnualProjectionReportRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthAnnualProjectionReport, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthAnnualProjectionReportSuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthAnnualProjectionReportFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthAnnualProjectionReportFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthDailyCyclesSaga(
  action: ReturnType<typeof getAssetBatteryHealthDailyCyclesRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthDailyCycles, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthDailyCyclesSuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthDailyCyclesFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthDailyCyclesFailure(error.response?.data || error.response));
  }
}

function* GetAssetBatteryHealthWarrantyExceedanceSaga(
  action: ReturnType<typeof getAssetBatteryHealthWarrantyExceedanceRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetBatteryHealthWarrantyExceedance, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetBatteryHealthWarrantyExceedanceSuccess(response.data));
    } else {
      yield put(getAssetBatteryHealthWarrantyExceedanceFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetBatteryHealthWarrantyExceedanceFailure(error.response?.data || error.response));
  }
}

function* GetAssetTBSpreadSummarySaga(action: ReturnType<typeof getAssetTBSpreadSummaryRequest>): Generator {
  try {
    const response: any = yield call(getAssetTBSpreadSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetTBSpreadSummarySuccess(response.data));
    } else {
      yield put(getAssetTBSpreadSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetTBSpreadSummaryFailure(error.response?.data || error.response));
  }
}

function* GetAssetTBSpreadDetailsSaga(action: ReturnType<typeof getAssetTBSpreadDetailsRequest>): Generator {
  try {
    const response: any = yield call(getAssetTBSpreadDetails, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetTBSpreadDetailsSuccess(response.data));
    } else {
      yield put(getAssetTBSpreadDetailsFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetTBSpreadDetailsFailure(error.response?.data || error.response));
  }
}

function* GetAssetSolarKpiVitalsSaga(action: ReturnType<typeof getAssetSolarKpiVitalsRequest>): Generator {
  try {
    const response: any = yield call(getAssetSolarKpiVitals, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetSolarKpiVitalsSuccess(response.data));
    } else {
      yield put(getAssetSolarKpiVitalsFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetSolarKpiVitalsFailure(error.response?.data || error.response));
  }
}

function* GetAssetSolarGenerationSplitSaga(
  action: ReturnType<typeof getAssetSolarGenerationSplitRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetSolarGenerationSplit, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetSolarGenerationSplitSuccess(response.data));
    } else {
      yield put(getAssetSolarGenerationSplitFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetSolarGenerationSplitFailure(error.response?.data || error.response));
  }
}

function* GetAssetSolarDailyTrendSaga(action: ReturnType<typeof getAssetSolarDailyTrendRequest>): Generator {
  try {
    const response: any = yield call(getAssetSolarDailyTrend, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetSolarDailyTrendSuccess(response.data));
    } else {
      yield put(getAssetSolarDailyTrendFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetSolarDailyTrendFailure(error.response?.data || error.response));
  }
}

function* GetAssetSolarIrradianceTrendSaga(
  action: ReturnType<typeof getAssetSolarIrradianceTrendRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetSolarIrradianceTrend, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAssetSolarIrradianceTrendSuccess(response.data));
    } else {
      yield put(getAssetSolarIrradianceTrendFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAssetSolarIrradianceTrendFailure(error.response?.data || error.response));
  }
}

function* GetAssetExecutiveAnalysisMonthlyRevenueComparison(
  action: ReturnType<typeof getExecutiveAnalysisMonthlyRevenueComparisonRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetExecutiveAnalysisMonthRevenueComparison, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getExecutiveAnalysisMonthlyRevenueComparisonSuccess(response.data));
    } else {
      yield put(getExecutiveAnalysisMonthlyRevenueComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(getExecutiveAnalysisMonthlyRevenueComparisonFailure(error.response?.data || error.response));
  }
}

function* GetExecutiveAnalysisSummary(action: ReturnType<typeof getExecutiveAnalysisSummaryRequest>): Generator {
  try {
    const response: any = yield call(getAssetExecutiveAnalysisSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getExecutiveAnalysisSummarySuccess(response.data));
    } else {
      yield put(getExecutiveAnalysisSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getExecutiveAnalysisSummaryFailure(error.response?.data || error.response));
  }
}

function* GetExecutiveAnalysisRevenueByStream(
  action: ReturnType<typeof getExecutiveAnalysisRevenueByStreamRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetExecutiveAnalysisRevenueByStream, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getExecutiveAnalysisRevenueByStreamSuccess(response.data));
    } else {
      yield put(getExecutiveAnalysisRevenueByStreamFailure(response.data));
    }
  } catch (error: any) {
    yield put(getExecutiveAnalysisRevenueByStreamFailure(error.response?.data || error.response));
  }
}

function* UploadInvoiceSaga(action: ReturnType<typeof uploadInvoicesRequest>): Generator {
  const file = action.payload?.formData?.get('file') as File;
  try {
    const response: any = yield call(uploadInvoice, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadInvoicesSuccess(response.data));
    } else {
      yield put(
        uploadInvoicesFailure({
          status: response?.data?.status,
          message: response?.data?.message,
          status_code: response?.data?.status_code,
          data: {
            file: file?.name || '',
          },
        }),
      );
    }
  } catch (error: any) {
    yield put(
      uploadInvoicesFailure({
        status: error.response?.data?.status || error.response?.status,
        message: error.response?.data?.message || error.response?.message || error.message,
        status_code: error.response?.data?.status_code || error.response?.status,
        data: {
          file: file?.name || '',
        },
      }),
    );
  }
}

function* DeleteInvoiceSaga(action: ReturnType<typeof deleteInvoiceRequest>): Generator {
  try {
    const response: any = yield call(deleteInvoice, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteInvoiceSuccess(response.data));
    } else {
      yield put(deleteInvoiceFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteInvoiceFailure(error.response?.data || error.response));
  }
}

function* UploadInvoiceSettlementSaga(action: ReturnType<typeof uploadInvoiceSettlementRequest>): Generator {
  const file = action.payload?.formData?.get('file') as File;
  try {
    const response: any = yield call(uploadInvoiceSettlement, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadInvoiceSettlementSuccess(response.data));
    } else {
      yield put(
        uploadInvoiceSettlementFailure({
          status: response?.data?.status,
          message: response?.data?.message,
          status_code: response?.data?.status_code,
          data: {
            file: file?.name || '',
          },
        }),
      );
    }
  } catch (error: any) {
    yield put(
      uploadInvoiceSettlementFailure({
        status: error.response?.data?.status || error.response?.status,
        message: error.response?.data?.message || error.response?.message || error.message,
        status_code: error.response?.data?.status_code || error.response?.status,
        data: {
          file: file?.name || '',
        },
      }),
    );
  }
}

function* DeleteInvoiceSettlementSaga(action: ReturnType<typeof deleteInvoiceSettlementRequest>): Generator {
  try {
    const response: any = yield call(deleteInvoiceSettlement, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteInvoiceSettlementSuccess(response.data));
    } else {
      yield put(deleteInvoiceSettlementFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteInvoiceSettlementFailure(error.response?.data || error.response));
  }
}

function* UploadInvoiceSummaryStatementSaga(action: ReturnType<typeof uploadInvoiceSummaryStatementRequest>): Generator {
  const file = action.payload?.formData?.get('file') as File;
  try {
    const response: any = yield call(uploadAssetInvoiceStatementSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadInvoiceSummaryStatementSuccess(response.data));
    } else {
      yield put(
        uploadInvoiceSummaryStatementFailure({
          status: response?.data?.status,
          message: response?.data?.message,
          status_code: response?.data?.status_code,
          data: {
            file: file?.name || '',
          },
        }),
      );
    }
  } catch (error: any) {
    yield put(
      uploadInvoiceSummaryStatementFailure({
        status: error.response?.data?.status || error.response?.status,
        message: error.response?.data?.message || error.response?.message || error.message,
        status_code: error.response?.data?.status_code || error.response?.status,
        data: {
          file: file?.name || '',
        },
      }),
    );
  }
}

function* DeleteInvoiceSummaryStatementSaga(action: ReturnType<typeof deleteInvoiceSummaryStatementRequest>): Generator {
  try {
    const response: any = yield call(deleteAssetInvoiceStatementSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteInvoiceSummaryStatementSuccess(response.data));
    } else {
      yield put(deleteInvoiceSummaryStatementFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteInvoiceSummaryStatementFailure(error.response?.data || error.response));
  }
}

export default function* AssetSaga(): Generator {
  yield takeEvery(assetListRequest.type, AssetListSaga);
  yield takeLatest(reassignAssetOwnershipRequest.type, ReassignAssetOwnershipSaga);
  yield takeLatest(assetMultipleUserRequest.type, AssetMultipleUserSaga);
  yield takeLatest(getAllAssetsListRequest.type, GetAllAssetsListSaga);
  yield takeLatest(onboardAssetRequest.type, OnboardAssetSaga);
  yield takeLatest(getAssetDetailsRequest.type, GetAssetDetailsSaga);
  yield takeLatest(editAssetRequest.type, EditAssetSaga);
  yield takeLatest(assetOptimizationParamRequest.type, OptimizationParamsSaga);
  yield takeLatest(uploadAggregatorReportRequest.type, UploadAggregatorReportSaga);
  yield takeLatest(uploadScadaReportRequest.type, UploadScadaReportSaga);
  yield takeLatest(uploadSolarScadaReportRequest.type, UploadSolarScadaReportSaga);
  yield takeLatest(mergeDatasetRequest.type, MergeScadaReportSaga);
  yield takeLatest(generateOptimizedDatasetRequest.type, GenerateOptimizedDatasetSaga);
  yield takeLatest(removeAssetFileRequest.type, RemoveAssetFileSaga);
  yield takeLatest(assetMarketSummaryRequest.type, AssetMarketSummarySaga);
  yield takeLatest(assetMarketSummaryAnalysisRequest.type, AssetMarketSummaryAnalysisSaga);
  yield takeLatest(getAssetAncillaryServiceSummaryRequest.type, GetAssetAncillaryServiceSummarySaga);
  yield takeLatest(getAssetAncillaryServiceRevenueBreakdownRequest.type, GetAssetAncillaryServiceRevenueBreakdownSaga);
  yield takeLatest(
    getAssetAncillaryServiceOpportunityCostAnalysisRequest.type,
    GetAssetAncillaryServiceOpportunityCostAnalysisSaga,
  );
  yield takeLatest(getAssetAncillaryServiceRevenueByHourRequest.type, GetAssetAncillaryServiceRevenueByHourSaga);
  yield takeLatest(assetMarketStatisticsRequest.type, AssetMarketStatisticsSaga);
  yield takeLatest(assetMarketUtilizationAnalysisRequest.type, AssetMarketUtilizationAnalysisSaga);
  yield takeLatest(assetBestMarketsAnalysisRequest.type, AssetBestMarketsAnalysisSaga);
  yield takeLatest(assetMarketRevenueDistributionRequest.type, AssetMarketRevenueDistributionSaga);
  yield takeLatest(assetMarketHourlyPricePatternsRequest.type, AssetMarketHourlyPricePatternsSaga);
  yield takeLatest(assetEnergyPriceComparisonRequest.type, AssetEnergyPriceComparisonSaga);
  yield takeLatest(assetBatteryPowerOverTimeRequest.type, AssetBatteryPowerOverTimeSaga);
  yield takeLatest(getAssetMarketPriceSpreadRequest.type, GetAssetMarketPriceSpreadSaga);
  yield takeLatest(getAssetMarketPriceVolatilityRequest.type, GetAssetMarketPriceVolatilitySaga);
  yield takeLatest(getAssetMarketPriceCorrelationMatrixRequest.type, GetAssetMarketPriceCorrelationMatrixSaga);
  yield takeLatest(uploadIARReportRequest.type, UploadIARReportSaga);
  yield takeLatest(submitAssetForApprovalRequest.type, SubmitAssetForApprovalSaga);
  yield takeLatest(createAssetRequest.type, CreateAssetSaga);

  yield takeLeading(assetOperationalAnalyticsRequest.type, AssetOperationalAnalyticsSaga);
  yield takeLatest(getIndustryComparisonRequest.type, GetIndustryComparisonSaga);
  yield takeLatest(getAssetBenchmarkRevenueIARvsActualRequest.type, GetAssetBenchmarkRevenueIARvsActualSaga);
  yield takeLatest(
    getAssetBenchmarkMultiMarketOptimizedVsActualRequest.type,
    GetAssetBenchmarkMultiMarketOptimizedVsActualSaga,
  );

  yield takeLatest(currentAssetFilesRequest.type, GetAssetFilesSaga);
  yield takeLatest(filterAggregatorScadaFilesRequest.type, FilterAssetAggregatorScadaFileSaga);
  yield takeLatest(filterSolarScadaFilesRequest.type, FilterAssetSolarScadaFileSaga);
  yield takeLatest(filterInvoiceFilesRequest.type, FilterInvoiceFilesSaga);
  yield takeLatest(filterInvoiceSettlementFilesRequest.type, FilterInvoiceSettlementFilesSaga);
  yield takeLatest(updateAssetReportingPeriodRequest.type, UpdateAssetReportingPeriodSaga);
  yield takeLatest(updateAssetInvoiceReportingPeriodRequest.type, UpdateAssetInvoiceReportingPeriodSaga);
  yield takeLatest(getAssetImbalanceAnalysisSummaryRequest.type, GetAssetImbalanceAnalysisSummarySaga);
  yield takeLatest(getAssetImbalanceDailyBreakdownRequest.type, GetAssetImbalanceDailyBreakdownSaga);
  yield takeLatest(getAssetImbalanceTopWorstDaysRequest.type, GetAssetImbalanceWorstDaysSaga);
  yield takeLatest(getAssetImbalanceHourlyChargesRequest.type, GetAssetImbalanceHourlyChargesSaga);
  yield takeLatest(getAssetBatteryHealthSummaryRequest.type, GetAssetBatteryHealthSummarySaga);
  yield takeLatest(getAssetBatteryHealthCycleComparisonRequest.type, GetAssetBatteryHealthCycleComparisonSaga);
  yield takeLatest(
    getAssetBatteryHealthStrategyCyclingComparisonRequest.type,
    GetAssetBatteryHealthStrategyCyclingComparisonSaga,
  );
  yield takeLatest(
    getAssetBatteryHealthAnnualProjectionReportRequest.type,
    GetAssetBatteryHealthAnnualProjectionReportSaga,
  );
  yield takeLatest(getAssetBatteryHealthDailyCyclesRequest.type, GetAssetBatteryHealthDailyCyclesSaga);
  yield takeLatest(getAssetBatteryHealthWarrantyExceedanceRequest.type, GetAssetBatteryHealthWarrantyExceedanceSaga);
  yield takeLatest(getAssetTBSpreadSummaryRequest.type, GetAssetTBSpreadSummarySaga);
  yield takeLatest(getAssetTBSpreadDetailsRequest.type, GetAssetTBSpreadDetailsSaga);
  yield takeLatest(getAssetSolarKpiVitalsRequest.type, GetAssetSolarKpiVitalsSaga);
  yield takeLatest(getAssetSolarGenerationSplitRequest.type, GetAssetSolarGenerationSplitSaga);
  yield takeLatest(getAssetSolarDailyTrendRequest.type, GetAssetSolarDailyTrendSaga);
  yield takeLatest(getAssetSolarIrradianceTrendRequest.type, GetAssetSolarIrradianceTrendSaga);
  yield takeLatest(
    getExecutiveAnalysisMonthlyRevenueComparisonRequest.type,
    GetAssetExecutiveAnalysisMonthlyRevenueComparison,
  );
  yield takeLatest(getExecutiveAnalysisRevenueByStreamRequest.type, GetExecutiveAnalysisRevenueByStream);
  yield takeLatest(getExecutiveAnalysisSummaryRequest.type, GetExecutiveAnalysisSummary);

  yield takeLatest(uploadInvoicesRequest.type, UploadInvoiceSaga);
  yield takeLatest(deleteInvoiceRequest.type, DeleteInvoiceSaga);
  yield takeLatest(uploadInvoiceSettlementRequest.type, UploadInvoiceSettlementSaga);
  yield takeLatest(deleteInvoiceSettlementRequest.type, DeleteInvoiceSettlementSaga);
  yield takeLatest(uploadInvoiceSummaryStatementRequest.type, UploadInvoiceSummaryStatementSaga);
  yield takeLatest(deleteInvoiceSummaryStatementRequest.type, DeleteInvoiceSummaryStatementSaga);
  yield takeLatest(filterInvoiceSummaryStatementFilesRequest.type, FilterInvoiceSummaryStatementFilesSaga);

  // refresh cached all-assets list after onboard/edit success
  yield takeLatest(onboardAssetSuccess.type, function* () {
    yield put(getAllAssetsListRequest());
  });
  yield takeLatest(editAssetSuccess.type, function* () {
    yield put(getAllAssetsListRequest());
  });
}
