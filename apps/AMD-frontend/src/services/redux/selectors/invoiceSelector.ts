import {RootState} from '../rootReducer';

// Invoice List Selectors
export const invoiceListLoading = (state: RootState) => state.invoice.invoiceList.invoicesLoading;
export const invoiceListError = (state: RootState) => state.invoice.invoiceList.invoicesError;
export const invoiceListSuccess = (state: RootState) => state.invoice.invoiceList.invoicesSuccess;
export const invoiceListData = (state: RootState) => state.invoice.invoiceList.data;
export const invoiceListCurrentPage = (state: RootState) => state.invoice.invoiceList.currentPage;
export const invoiceListTotalResults = (state: RootState) => state.invoice.invoiceList.totalResults;
export const invoiceListTotalPages = (state: RootState) => state.invoice.invoiceList.totalPages;
export const invoiceListNextPage = (state: RootState) => state.invoice.invoiceList.nextPage;

// Invoice Summary Selectors
export const invoiceSummaryLoading = (state: RootState) => state.invoice.summary.loading;
export const invoiceSummaryError = (state: RootState) => state.invoice.summary.error;
export const invoiceSummarySuccess = (state: RootState) => state.invoice.summary.success;
export const invoiceSummaryData = (state: RootState) => state.invoice.summary.data;

// Invoice Settlement List Selectors
export const invoiceSettlementListLoading = (state: RootState) => state.invoice.settlementList.loading;
export const invoiceSettlementListError = (state: RootState) => state.invoice.settlementList.error;
export const invoiceSettlementListSuccess = (state: RootState) => state.invoice.settlementList.success;
export const invoiceSettlementListData = (state: RootState) => state.invoice.settlementList.data;
export const invoiceSettlementListCurrentPage = (state: RootState) => state.invoice.settlementList.currentPage;
export const invoiceSettlementListTotalResults = (state: RootState) => state.invoice.settlementList.totalResults;
export const invoiceSettlementListTotalPages = (state: RootState) => state.invoice.settlementList.totalPages;
export const invoiceSettlementListNextPage = (state: RootState) => state.invoice.settlementList.nextPage;

// Invoice Summary Statement List Selectors
export const invoiceSummaryStatementListLoading = (state: RootState) => state.invoice.summaryStatementList.loading;
export const invoiceSummaryStatementListError = (state: RootState) => state.invoice.summaryStatementList.error;
export const invoiceSummaryStatementListSuccess = (state: RootState) => state.invoice.summaryStatementList.success;
export const invoiceSummaryStatementListData = (state: RootState) => state.invoice.summaryStatementList.data;
export const invoiceSummaryStatementListTotalResults = (state: RootState) => state.invoice.summaryStatementList.totalResults;

// Capacity Market Summary Selectors
export const capacityMarketSummaryLoading = (state: RootState) => state.invoice.capacityMarket2.summary.loading;
export const capacityMarketSummaryError = (state: RootState) => state.invoice.capacityMarket2.summary.error;
export const capacityMarketSummarySuccess = (state: RootState) => state.invoice.capacityMarket2.summary.success;
export const capacityMarketSummaryData = (state: RootState) => state.invoice.capacityMarket2.summary.data;

// Capacity Market Payments Selectors
export const capacityMarketPaymentsLoading = (state: RootState) => state.invoice.capacityMarket2.payments.loading;
export const capacityMarketPaymentsError = (state: RootState) => state.invoice.capacityMarket2.payments.error;
export const capacityMarketPaymentsSuccess = (state: RootState) => state.invoice.capacityMarket2.payments.success;
export const capacityMarketPaymentsData = (state: RootState) => state.invoice.capacityMarket2.payments.data;

// Capacity Market Payment Trend Selectors
export const capacityMarketPaymentTrendLoading = (state: RootState) =>
  state.invoice.capacityMarket2.payment_trend.loading;
export const capacityMarketPaymentTrendError = (state: RootState) => state.invoice.capacityMarket2.payment_trend.error;
export const capacityMarketPaymentTrendSuccess = (state: RootState) =>
  state.invoice.capacityMarket2.payment_trend.success;
export const capacityMarketPaymentTrendData = (state: RootState) => state.invoice.capacityMarket2.payment_trend.data;

// Revenue Reconciliation Summary Selectors
export const revenueReconciliationSummaryLoading = (state: RootState) =>
  state.invoice.revenueReconciliation.summary.loading;
export const revenueReconciliationSummaryError = (state: RootState) =>
  state.invoice.revenueReconciliation.summary.error;
export const revenueReconciliationSummarySuccess = (state: RootState) =>
  state.invoice.revenueReconciliation.summary.success;
export const revenueReconciliationSummaryData = (state: RootState) => state.invoice.revenueReconciliation.summary.data;

// Revenue Reconciliation Per Stream Comparison Selectors
export const revenueReconciliationPerStreamComparisonLoading = (state: RootState) =>
  state.invoice.revenueReconciliation.per_stream_comparison.loading;
export const revenueReconciliationPerStreamComparisonError = (state: RootState) =>
  state.invoice.revenueReconciliation.per_stream_comparison.error;
export const revenueReconciliationPerStreamComparisonSuccess = (state: RootState) =>
  state.invoice.revenueReconciliation.per_stream_comparison.success;
export const revenueReconciliationPerStreamComparisonData = (state: RootState) =>
  state.invoice.revenueReconciliation.per_stream_comparison.data;
