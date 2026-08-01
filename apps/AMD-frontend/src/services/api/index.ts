import {API} from '@/constants';
import {createAxiosInstance} from './axiosConfig';
import {fetchAndDownloadBlob, fetchBlobFromApi} from './fetchConfig';

import {
  ActivateAssetRequest,
  FetchCommentsRequest,
  CreateCommentApiRequest,
  UpdateCommentApiRequest,
  DeleteCommentApiRequest,
  ReplyCommentApiRequest,
  ReadCommentApiRequest,
  CheckCommentStatusApiRequest,
  AddMonthlyValuesRequest,
  AssetIndustryBenchmarkAnalysisExportRequest,
  AssetIndustryBenchmarkAnalysisRequest,
  AssetMarketSummaryRequest,
  AssetMarketSummaryAnalysisRequest,
  AssetAncillaryServiceSummaryRequest,
  AssetAncillaryServiceRevenueBreakdownRequest,
  AssetAncillaryServiceRevenueBreakdownExportRequest,
  AssetAncillaryServiceOpportunityCostAnalysisRequest,
  AssetMarketStatisticsRequest,
  AssetMarketStatisticsExportRequest,
  AssetMarketPriceSpreadRequest,
  AssetMarketUtilizationAnalysisRequest,
  AssetBestMarketsAnalysisRequest,
  AssetBestMarketsAnalysisExportRequest,
  AssetMarketRevenueDistributionRequest,
  AssetMarketHourlyPricePatternsRequest,
  AssetBatteryPowerOverTimeRequest,
  AssetEnergyPriceComparisonRequest,
  AssetTBSpreadDetailsExportRequest,
  AssetTBSpreadDetailsRequest,
  AssetTBSpreadSummaryRequest,
  AssetMarketPriceVolatilityRequest,
  AssetMarketPriceCorrelationMatrixRequest,
  AssetOperationalAnalyticsRequest,
  AuditLogListRequest,
  GenerateOptimizedDatasetRequest,
  DownloadAssetFileRequest,
  EditAssetRequest,
  GetAssetFilesRequest,
  GetMonthlyValuesRequest,
  ModoBenchmarkMonthlyValueRequest,
  OptimizationParamsEditRequest,
  RemoveScadaReportRequest,
  UpdateBenchmarkMetricRequest,
  UpdateMonthlyValuesRequest,
  UploadAggregatorReportRequest,
  UploadIARReportRequest,
  UploadScadaReportRequest,
  RemoveAssetFileRequest,
  SubmitAssetForApprovalRequest,
  AssetBenchmarkMultiMarketOptimizedVsActualRequest,
  AssetBenchmarkRevenueIARvsActualRequest,
  AssetBenchmarkRevenueIARvsActualExportRequest,
  AssetBenchmarkMultiMarketOptimizedVsActualExportRequest,
  AssetAncillaryServiceRevenueByHourRequest,
  AssetImbalanceSummaryRequest,
  AssetImbalanceDailyBreakdownRequest,
  AssetImbalanceWorstDaysRequest,
  AssetImbalanceHourlyChargesRequest,
  AssetImbalanceWorstDaysExportRequest,
  AssetAnalysisBatteryHealthSummaryRequest,
  AssetAnalysisBatteryHealthCycleComparisonRequest,
  AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest,
  AssetAnalysisBatteryHealthAnnualProjectionReportRequest,
  AssetAnalysisBatteryHealthDailyCyclesRequest,
  AssetAnalysisBatteryHealthWarrantyExceedanceRequest,
  AssetExecutiveAnalysisMonthlyRevenueComparisonRequest,
  AssetExecutiveAnalysisRevenueByStreamRequest,
  AssetExecutiveAnalysisSummaryRequest,
  AssetExecutiveAnalysisMonthlyRevenueComparisonExportRequest,
  AssetExecutiveAnalysisRevenueByStreamExportRequest,
  InvoiceListRequest,
  InvoiceDeleteRequest,
  InvoiceDownloadRequest,
  InvoicePreviewRequest,
  InvoiceSummaryRequest,
  InvoiceUploadRequest,
  InvoiceListExportRequest,
  InvoiceSettlementListRequest,
  InvoiceSettlementUploadRequest,
  DeleteInvoiceSettlementRequest,
  ExportInvoiceSettlementRequest,
  AssetCapacityMarketSummaryRequest,
  AssetCapacityMarketPaymentsRequest,
  AssetCapacityMarketPaymentTrendRequest,
  AssetCapacityMarketExportRequest,
  AssetInvoiceRevenueReconciliationSummaryRequest,
  AssetInvoiceRevenueReconciliationPerStreamComparisonRequest,
  AssetInvoiceRevenueReconciliationExportRequest,
  AssetInvoiceSummaryStatementUploadRequest,
  DeleteAssetInvoiceSummaryStatementRequest,
  AssetInvoiceSummaryStatementListRequest,
  ExportAssetInvoiceSummaryStatementRequest,
  ListActiveNotificationsRequest,
  MarkNotificationReadRequest,
  AssetAnalysisBatteryStrategyEnergyThroughputSummaryExportRequest,
} from '@/interface';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

// This is for example
export async function demo() {
  return await createAxiosInstance({
    url: API.noAuthUrls.demo,
    method: 'GET',
    headers: {...defaultHeaders},
  });
}

export async function addUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function editUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

export async function getUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function deleteUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'DELETE',
    headers: {...defaultHeaders},
    data,
  });
}

export async function organizationList(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function addOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function editOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

export async function login(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.login,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function verifyOtp(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.verifyOtp,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  }).catch(res => res);
}

export async function logout() {
  return await createAxiosInstance({
    url: API.authUrls.logout,
    method: 'POST',
  });
}

export async function assignOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_organization(data.id),
    method: 'PUT',
    headers: {...defaultHeaders},
    data,
  });
}

// =============================== Audit Log Management ===============================
export async function auditLogList(params: AuditLogListRequest['params']) {
  return await createAxiosInstance({
    url: API.authUrls.audit_logs,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

// =============================== Asset Management ===============================
export async function getAssets(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.assets,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function reassignAssetOwnership(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.asset_organization(data.asset_id),
    method: 'PUT',
    headers: {...defaultHeaders},
    data: {organization_id: data.organization_id},
  });
}

// =============================== Onboard New Asset ===============================
export async function onboardNewAsset(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.assets,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function getOrganizationMultipleUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization_multiple_users,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function getAssetMultipleUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.asset_multiple_users,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function getAssetTaggableUsers(assetId: number, params: any) {
  return await createAxiosInstance({
    url: API.authUrls.asset_taggable_users(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}
// =============================== Digest Management ===============================
export async function getDigests(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.digests,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function addDigest(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.digests,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function editDigest(data: any) {
  const {id, ...body} = data;
  return await createAxiosInstance({
    url: API.authUrls.digest_id(id),
    method: 'PUT',
    headers: {...defaultHeaders},
    data: body,
  });
}

export async function getAssetDetails({id, skip_audit}: {id: number, skip_audit?: boolean}) {
  const query = skip_audit ? '?skip_audit=true' : '';
  return await createAxiosInstance({
    url: `${API.authUrls.asset_id(id)}${query}`,
    method: 'GET',
    headers: {...defaultHeaders},
  });
}

export async function editAssetDetails(data: EditAssetRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.asset_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

export async function optimizationParams(data: OptimizationParamsEditRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.asset_optimization_parameters(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

// =============================== Aggregator Report Upload ===============================
// Upload Aggregator Report
export async function uploadAggregatorReport({assetId, formData}: UploadAggregatorReportRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.asset_aggregator_report_upload(assetId),
    method: 'POST',
    data: formData,
  });
}

export async function uploadScadaReport({assetId, formData}: UploadScadaReportRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.asset_scada_report_upload(assetId),
    method: 'POST',
    data: formData,
  });
}

export async function mergeAssetDatasets(data: RemoveScadaReportRequest['payload']) {
  const {assetId, ...rest} = data;
  return await createAxiosInstance({
    url: API.authUrls.asset_merge_dataset(assetId),
    method: 'POST',
    data: rest,
  });
}

export async function generateOptimizedDataset({assetId, ...rest}: GenerateOptimizedDatasetRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.asset_optimized_dataset(assetId),
    method: 'POST',
    headers: {...defaultHeaders},
    data: rest,
  });
}

export async function assetOperationalAnalytics(params: AssetOperationalAnalyticsRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_operations_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetMarketSummary(params: AssetMarketSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_operations_market_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetMarketSummaryAnalysis(params: AssetMarketSummaryAnalysisRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetAncillaryServiceSummary(params: AssetAncillaryServiceSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_ancillary_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetAncillaryServiceRevenueBreakdown(
  params: AssetAncillaryServiceRevenueBreakdownRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_ancillary_revenue_breakdown(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetAncillaryServiceRevenueBreakdown(
  params: AssetAncillaryServiceRevenueBreakdownExportRequest['params'],
) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_ancillary_revenue_breakdown_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function getAssetAncillaryServiceOpportunityCostAnalysis(
  params: AssetAncillaryServiceOpportunityCostAnalysisRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_ancillary_opportunity_cost_analysis(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetAncillaryServiceRevenueByHour(
  params: AssetAncillaryServiceRevenueByHourRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_ancillary_service_revenue_by_hour(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetMarketStatistics(params: AssetMarketStatisticsRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_statistics(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetMarketStatistics(params: AssetMarketStatisticsExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_market_statistics_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function getAssetMarketPriceSpread(params: AssetMarketPriceSpreadRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_price_spread(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetMarketPriceVolatility(params: AssetMarketPriceVolatilityRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_price_volatility(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetMarketPriceCorrelationMatrix(params: AssetMarketPriceCorrelationMatrixRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_price_correlation_matrix(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetMarketUtilizationAnalysis(params: AssetMarketUtilizationAnalysisRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_utilization(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetBestMarketsAnalysis(params: AssetBestMarketsAnalysisRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_best_markets(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetBestMarketsAnalysis(params: AssetBestMarketsAnalysisExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_market_best_markets_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function assetMarketRevenueDistribution(params: AssetMarketRevenueDistributionRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_revenue_distribution(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetMarketHourlyPricePatterns(params: AssetMarketHourlyPricePatternsRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_market_hourly_price_patterns(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetEnergyPriceComparison(params: AssetEnergyPriceComparisonRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_operations_energy_price(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function assetBatteryPowerOverTime(params: AssetBatteryPowerOverTimeRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_operations_battery_power_over_time(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetTBSpreadSummary(params: AssetTBSpreadSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_tb_spread_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetTBSpreadDetails(params: AssetTBSpreadDetailsRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_tb_spread_details(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetTBSpreadDetails(params: AssetTBSpreadDetailsExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_tb_spread_details_export(assetId),
    filename: fileName || `tb_spread_details_${assetId}.csv`,
    params: rest,
  });
}

export async function uploadIARReport(params: UploadIARReportRequest['payload']) {
  const {assetId, formData} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_iar_report(assetId),
    method: 'POST',
    data: formData,
  });
}

export async function submitAssetForApproval(params: SubmitAssetForApprovalRequest['payload']) {
  const {assetId} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_submit(assetId),
    method: 'POST',
  });
}

export async function activateAsset(params: ActivateAssetRequest['payload']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_activate(assetId),
    method: 'POST',
    data: rest,
  });
}

export async function getBenchmarkMetrics() {
  return await createAxiosInstance({
    url: API.authUrls.metrics_benchmarks,
    method: 'GET',
  });
}

export async function updateBenchmarkMetrics(data: UpdateBenchmarkMetricRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.metrics_benchmarks,
    method: 'PATCH',
    data,
  });
}

export async function getMonthlyValues(params: GetMonthlyValuesRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.metrics_monthly_values,
    method: 'GET',
    params,
  });
}

export async function addMonthlyValues(data: AddMonthlyValuesRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.metrics_monthly_values,
    method: 'POST',
    data,
  });
}

export async function updateMonthlyValues(data: UpdateMonthlyValuesRequest['payload']) {
  return await createAxiosInstance({
    url: API.authUrls.metrics_monthly_values,
    method: 'PATCH',
    data,
  });
}

export async function getAssetIndustryBenchmarkAnalysis(params: AssetIndustryBenchmarkAnalysisRequest['params']) {
  // await new Promise(resolve => setTimeout(resolve, 5000));
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_benchmark_industry(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetIndustryBenchmarkAnalysis(
  params: AssetIndustryBenchmarkAnalysisExportRequest['params'],
) {
  const {assetId, tableName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_benchmark_industry_export(assetId),
    filename: tableName || `Table.csv`,
    params: rest,
  });
}

export async function getAssetBenchmarkRevenueIARvsActual(params: AssetBenchmarkRevenueIARvsActualRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_benchmark_revenue_iar_vs_actual(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBenchmarkRevenueIARvsActualExport(
  params: AssetBenchmarkRevenueIARvsActualExportRequest['params'],
) {
  const {assetId, fileName, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_benchmark_revenue_iar_vs_actual_export(assetId),
    filename: fileName || `file_${assetId}.csv`,
    params: rest,
  });
}

export async function getAssetBenchmarkMultiMarketOptimizedVsActual(
  params: AssetBenchmarkMultiMarketOptimizedVsActualRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_benchmark_multi_market_optimized_vs_actual(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBenchmarkMultiMarketOptimizedVsActualExport(
  params: AssetBenchmarkMultiMarketOptimizedVsActualExportRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_benchmark_multi_market_optimized_vs_actual_export(assetId),
    filename: rest.fileName || `file_${assetId}.csv`,
    params: rest,
  });
}

export async function getModoBenchmarkMonthlyValue(params: ModoBenchmarkMonthlyValueRequest['params']) {
  return await createAxiosInstance({
    url: API.authUrls.modo_benchmark_monthly_value,
    method: 'GET',
    params,
  });
}

export async function getAssetFiles(params: GetAssetFilesRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_files(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetFile(params: DownloadAssetFileRequest['params']) {
  const {fileId, assetId, fileName} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_files_download(assetId, fileId),
    filename: fileName || `file_${fileId}`,
  });
}

export async function removeAssetFile(params: RemoveAssetFileRequest['params']) {
  const {fileId, assetId} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_files_id(assetId, fileId),
    method: 'DELETE',
  });
}

export async function getAssetImbalanceSummary(params: AssetImbalanceSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_imbalance_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetImbalanceDailyBreakdown(params: AssetImbalanceDailyBreakdownRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_imbalance_daily_breakdown(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetImbalanceWorstDays(params: AssetImbalanceWorstDaysRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_imbalance_worst_days(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetImbalanceHourlyCharges(params: AssetImbalanceHourlyChargesRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_imbalance_hourly_charges(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function downloadAssetImbalanceWorstDays(params: AssetImbalanceWorstDaysExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_imbalance_worst_days_export(assetId),
    filename: fileName || `file_${assetId}.csv`,
    params: rest,
  });
}

export async function getAssetBatteryHealthSummary(params: AssetAnalysisBatteryHealthSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBatteryHealthCycleComparison(
  params: AssetAnalysisBatteryHealthCycleComparisonRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_cycle_comparison(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBatteryHealthStrategyCyclingComparison(
  params: AssetAnalysisBatteryHealthStrategyCyclingComparisonRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_strategy_cycling_comparison(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBatteryHealthAnnualProjectionReport(
  params: AssetAnalysisBatteryHealthAnnualProjectionReportRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_annual_projection_report(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBatteryHealthDailyCycles(params: AssetAnalysisBatteryHealthDailyCyclesRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_daily_cycles(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetBatteryHealthWarrantyExceedance(
  params: AssetAnalysisBatteryHealthWarrantyExceedanceRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_analysis_battery_health_warranty_exceedance(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetExecutiveAnalysisMonthRevenueComparison(
  params: AssetExecutiveAnalysisMonthlyRevenueComparisonRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_executive_analysis_monthly_revenue_comparison(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetExecutiveAnalysisRevenueByStream(
  params: AssetExecutiveAnalysisRevenueByStreamRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_executive_analysis_revenue_by_stream(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetExecutiveAnalysisSummary(params: AssetExecutiveAnalysisSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_executive_analysis_summary(assetId),
    method: 'GET',
    params: rest,
  });
}

export async function getAssetExecutiveAnalysisMonthRevenueComparisonExport(
  params: AssetExecutiveAnalysisMonthlyRevenueComparisonExportRequest['params'],
) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_executive_analysis_monthly_revenue_comparison_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function getAssetExecutiveAnalysisRevenueByStreamExport(
  params: AssetExecutiveAnalysisRevenueByStreamExportRequest['params'],
) {
  const {assetId, fileName, ...rest} = params;
  await fetchAndDownloadBlob({
    url: API.authUrls.asset_executive_analysis_revenue_by_stream_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function getInvoicesList(params: InvoiceListRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function getInvoicesSummary(params: InvoiceSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_summary(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function uploadInvoice(data: InvoiceUploadRequest['payload']) {
  const {assetId, formData} = data;
  return createAxiosInstance({
    url: API.authUrls.asset_invoices(assetId),
    method: 'POST',
    data: formData,
  });
}

export async function deleteInvoice(data: InvoiceDeleteRequest['payload']) {
  const {invoiceId, assetId} = data;
  return createAxiosInstance({
    url: API.authUrls.asset_invoices_id(assetId, invoiceId),
    method: 'DELETE',
  });
}

export async function downloadInvoice(params: InvoiceDownloadRequest['params']) {
  const {invoiceId, fileName, assetId, source} = params;
  return fetchAndDownloadBlob({
    url: API.authUrls.asset_invoices_id_export(assetId, invoiceId),
    filename: fileName || `invoice_${invoiceId}.pdf`,
    params: source ? {source} : undefined,
  });
}

export async function downloadInvoiceList(params: InvoiceListExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_invoices_export(assetId),
    filename: fileName,
    params: rest,
  });
}

export async function previewInvoice(params: InvoicePreviewRequest['params']) {
  const {invoiceId, assetId} = params;
  return await fetchBlobFromApi(API.authUrls.asset_invoices_id_preview(assetId, invoiceId));
}

export async function getInvoicesSettlementList(params: InvoiceSettlementListRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_settlement(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function uploadInvoiceSettlement(data: InvoiceSettlementUploadRequest['payload']) {
  const {assetId, formData} = data;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_settlement(assetId),
    method: 'POST',
    data: formData,
  });
}

export async function deleteInvoiceSettlement(data: DeleteInvoiceSettlementRequest['payload']) {
  const {assetId, settlementId} = data;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_settlement_id(assetId, settlementId),
    method: 'DELETE',
  });
}

export async function exportInvoiceSettlement(data: ExportInvoiceSettlementRequest['payload']) {
  const {assetId, settlementId, fileName} = data;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_invoices_settlement_id_export(assetId, settlementId),
    filename: fileName || `settlement_${settlementId}.pdf`,
  });
}

export async function getAssetCapacityMarketSummary(params: AssetCapacityMarketSummaryRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoice_analysis_capacity_market_summary(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function getAssetCapacityMarketPayments(params: AssetCapacityMarketPaymentsRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoice_analysis_capacity_market_payments(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function getAssetCapacityMarketPaymentTrend(params: AssetCapacityMarketPaymentTrendRequest['params']) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoice_analysis_capacity_market_payment_trend(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function downloadAssetCapacityMarketAnalytics(params: AssetCapacityMarketExportRequest['params']) {
  const {assetId, fileName, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_invoice_analysis_capacity_market_export(assetId),
    filename: fileName || `capacity_market_${assetId}.csv`,
    params: rest,
  });
}

export async function getAssetInvoiceRevenueReconciliationSummary(
  params: AssetInvoiceRevenueReconciliationSummaryRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoice_analysis_revenue_reconciliation_summary(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function getAssetInvoiceRevenueReconciliationPerStreamComparison(
  params: AssetInvoiceRevenueReconciliationPerStreamComparisonRequest['params'],
) {
  const {assetId, ...rest} = params;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoice_analysis_revenue_reconciliation_per_stream_comparison(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: rest,
  });
}

export async function downloadAssetInvoiceRevenueReconciliation(
  params: AssetInvoiceRevenueReconciliationExportRequest['params'],
) {
  const {assetId, fileName, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_invoice_analysis_revenue_reconciliation_export(assetId),
    filename: fileName || `revenue_reconciliation_${assetId}.csv`,
    params: rest,
  });
}

export async function uploadAssetInvoiceStatementSummary(
  payload: AssetInvoiceSummaryStatementUploadRequest['payload'],
) {
  const {assetId, formData} = payload;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_summary_statement(assetId),
    method: 'POST',
    headers: {},
    data: formData,
  });
}

export async function deleteAssetInvoiceStatementSummary(
  payload: DeleteAssetInvoiceSummaryStatementRequest['payload'],
) {
  const {assetId, statementId} = payload;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_summary_statement_id(assetId, statementId),
    method: 'DELETE',
    headers: {},
  });
}

export async function getAssetInvoiceStatementSummaryList(payload: AssetInvoiceSummaryStatementListRequest['params']) {
  const {assetId, ...rest} = payload;
  return await createAxiosInstance({
    url: API.authUrls.asset_invoices_summary_statement(assetId),
    method: 'GET',
    headers: {},
    params: rest,
  });
}

export async function downloadAssetInvoiceStatementSummary(
  payload: ExportAssetInvoiceSummaryStatementRequest['params'],
) {
  const {assetId, statementId, fileName, ...rest} = payload;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_invoices_summary_statement_id_export(assetId, statementId),
    filename: fileName || `statement_${statementId}.pdf`,
    params: rest,
  });
}


// ===============================
// Comment Management
// ===============================

export async function fetchComments(params: FetchCommentsRequest['params']) {
  const {assetId, ...queryParams} = params;
  return await createAxiosInstance({
    url: API.authUrls.comments(assetId),
    method: 'GET',
    headers: {...defaultHeaders},
    params: queryParams,
  });
}

export async function createComment(request: CreateCommentApiRequest) {
  const {params, payload} = request;
  return await createAxiosInstance({
    url: API.authUrls.comments(params.assetId),
    method: 'POST',
    headers: {...defaultHeaders},
    data: payload,
  });
}

export async function updateComment(request: Omit<UpdateCommentApiRequest, 'response'>) {
  const {params, payload} = request;
  return await createAxiosInstance({
    url: API.authUrls.comment_id(params.assetId, params.commentId),
    method: 'PUT',
    headers: {...defaultHeaders},
    data: payload,
  });
}

export async function deleteComment(payload: DeleteCommentApiRequest['payload']) {
  const {assetId, commentId} = payload;
  return await createAxiosInstance({
    url: API.authUrls.comment_id(assetId, commentId),
    method: 'DELETE',
    headers: {...defaultHeaders},
  });
}

export async function replyComment(request: ReplyCommentApiRequest) {
  const {params, payload} = request;
  return await createAxiosInstance({
    url: API.authUrls.comment_reply(params.assetId, params.commentId),
    method: 'POST',
    headers: {...defaultHeaders},
    data: payload,
  });
}

export async function readComment(request: ReadCommentApiRequest) {
  const {params} = request;
  return await createAxiosInstance({
    url: API.authUrls.comment_read(params.assetId, params.commentId),
    method: 'PATCH',
    headers: {...defaultHeaders},
  });
}

export async function checkCommentStatus(request: CheckCommentStatusApiRequest) {
  const {params} = request;
  return await createAxiosInstance({
    url: API.authUrls.comment_status(params.assetId, params.commentId),
    method: 'GET',
    headers: {...defaultHeaders},
  });
}

// ===============================
// Notification Management
// ===============================

export async function fetchActiveNotifications(): Promise<ListActiveNotificationsRequest['response']> {
  return await createAxiosInstance({
    url: API.authUrls.notifications_active,
    method: 'GET',
    headers: {...defaultHeaders},
  }) as unknown as ListActiveNotificationsRequest['response'];
}

export async function markNotificationAsRead(
  notificationId: number | string
): Promise<MarkNotificationReadRequest['response']> {
  return await createAxiosInstance({
    url: API.authUrls.notification_read(notificationId),
    method: 'PATCH',
    headers: {...defaultHeaders},
  }) as unknown as MarkNotificationReadRequest['response'];
}

export const getWsToken = async () => {
  return await createAxiosInstance({
    url: API.authUrls.websocketToken,
    method: 'POST',
    headers: {...defaultHeaders},
  });
};

export const exportStrategyEnergyThroughputSummaryExport = async (params: AssetAnalysisBatteryStrategyEnergyThroughputSummaryExportRequest['params']) => {
  const {assetId, fileName, ...rest} = params;
  return await fetchAndDownloadBlob({
    url: API.authUrls.asset_analysis_battery_health_strategy_energy_throughput_summary_export(assetId),
    filename: fileName || `filename.csv`,
    params: rest,
  });
};
