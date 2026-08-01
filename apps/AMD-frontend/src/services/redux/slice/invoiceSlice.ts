import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {InvoiceSliceInitialState} from '@/interface/slice-interface';
import {
  APIResponse,
  InvoiceListRequest,
  InvoiceSettlementListRequest,
  InvoiceSummaryRequest,
  AssetCapacityMarketSummaryRequest,
  AssetCapacityMarketPaymentsRequest,
  AssetCapacityMarketPaymentTrendRequest,
  AssetInvoiceRevenueReconciliationSummaryRequest,
  AssetInvoiceRevenueReconciliationPerStreamComparisonRequest,
  AssetInvoiceSummaryStatementListRequest,
} from '@/interface';

const initialState: InvoiceSliceInitialState = {
  invoiceList: {
    invoicesError: false,
    invoicesLoading: false,
    assetId: null, // for which asset invoices are being fetched, for same assetId, loading will not be set to true again, until the assetId changes, this is to avoid flickering of invoice list when user is on same asset page and is fetching invoices again
    invoicesSuccess: false,
    currentPage: 0,
    totalResults: 0,
    totalPages: 0,
    nextPage: null,
    data: [],
  },
  summary: {
    loading: false,
    error: false,
    success: false,
    data: {
      total_invoices: 24,
      category_summary: null,
      extraction_quality: null,
    },
  },
  settlementList: {
    loading: false,
    error: false,
    success: false,
    currentPage: 0,
    totalResults: 0,
    totalPages: 0,
    nextPage: null,
    data: [],
  },

  summaryStatementList: {
    loading: false,
    error: false,
    success: false,
    totalResults: 0,
    data: [],
  },

  capacityMarket2: {
    summary: {
      loading: false,
      error: false,
      success: false,
      data: null,
    },
    payment_trend: {
      loading: false,
      error: false,
      success: false,
      data: null,
    },
    payments: {
      loading: false,
      error: false,
      success: false,

      data: null,
    },
  },
  revenueReconciliation: {
    summary: {
      loading: false,
      error: false,
      success: false,
      data: null,
    },
    per_stream_comparison: {
      loading: false,
      error: false,
      success: false,
      data: null,
    },
  },
};

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    // ====================================
    // Get Invoices List
    // ====================================
    getInvoicesListRequest(state, action: PayloadAction<InvoiceListRequest['params']>) {
      if (state.invoiceList.assetId !== action.payload.assetId) {
        state.invoiceList.invoicesLoading = true;
      }
      state.invoiceList.invoicesError = false;
      state.invoiceList.invoicesSuccess = false;
    },
    getInvoicesListSuccess(
      state,
      action: PayloadAction<{params: InvoiceListRequest['params']; response: InvoiceListRequest['response']}>,
    ) {
      state.invoiceList.invoicesLoading = false;
      const {params, response} = action.payload;

      if (state.invoiceList.assetId !== params.assetId) {
        state.invoiceList.assetId = params.assetId || null;
      }
      state.invoiceList.invoicesSuccess = response.status_code;
      state.invoiceList.data = response.data?.invoices || [];
      state.invoiceList.totalPages = response.data?.total_pages || 0;
      state.invoiceList.nextPage = response.data?.next_page || null;
      state.invoiceList.currentPage = response.data?.current_page || 0;
      state.invoiceList.totalResults = response.data?.total_files || 0;
    },

    getInvoicesListFailure(
      state,
      action: PayloadAction<{params: InvoiceListRequest['params']; response: APIResponse}>,
    ) {
      const {params, response} = action.payload;
      state.invoiceList.invoicesLoading = false;
      if (state.invoiceList.assetId !== params.assetId) {
        state.invoiceList.assetId = params.assetId || null;
      }
      state.invoiceList.invoicesError = response.status_code;
    },

    // ====================================
    // Get Invoices Summary
    // ====================================
    getInvoicesSummaryRequest(state, _action: PayloadAction<InvoiceSummaryRequest['params']>) {
      state.summary.loading = true;
      state.summary.error = false;
      state.summary.success = false;
    },
    getInvoicesSummarySuccess(state, action: PayloadAction<InvoiceSummaryRequest['response']>) {
      state.summary.loading = false;
      state.summary.success = action.payload.status_code;

      if (action.payload.data) {
        state.summary.data = {
          total_invoices: action.payload.data.total_files,
          extraction_quality: action.payload.data.extraction_quality,
          category_summary: action.payload.data.category_summary,
        };
      }
    },
    getInvoicesSummaryFailure(state, action: PayloadAction<APIResponse>) {
      state.summary.loading = false;
      state.summary.error = action.payload.status_code;
    },

    // ====================================
    // Get Invoices Settlement List
    // ====================================
    getInvoicesSettlementListRequest(state, _action: PayloadAction<InvoiceSettlementListRequest['params']>) {
      state.settlementList.loading = true;
      state.settlementList.error = false;
      state.settlementList.success = false;
    },
    getInvoicesSettlementListSuccess(state, action: PayloadAction<InvoiceSettlementListRequest['response']>) {
      state.settlementList.loading = false;
      state.settlementList.success = action.payload.status_code;
      if (action.payload.data) {
        state.settlementList.data = action.payload.data?.settlement || [];
        state.settlementList.totalPages = action.payload.data?.total_pages || 0;
        state.settlementList.nextPage = action.payload.data?.next_page || null;
        state.settlementList.currentPage = action.payload.data?.current_page || 0;
        state.settlementList.totalResults = action.payload.data?.total_files || 0;
      }
    },
    getInvoicesSettlementListFailure(state, action: PayloadAction<APIResponse>) {
      state.settlementList.loading = false;
      state.settlementList.error = action.payload.status_code;
    },

    // ====================================
    // Get Invoices Summary Statement List
    // ====================================
    getInvoicesSummaryStatementListRequest(
      state,
      _action: PayloadAction<AssetInvoiceSummaryStatementListRequest['params']>,
    ) {
      state.summaryStatementList.loading = true;
      state.summaryStatementList.error = false;
      state.summaryStatementList.success = false;
    },
    getInvoicesSummaryStatementListSuccess(
      state,
      action: PayloadAction<AssetInvoiceSummaryStatementListRequest['response']>,
    ) {
      state.summaryStatementList.loading = false;
      state.summaryStatementList.success = action.payload.status_code;
      if (action.payload.data) {
        state.summaryStatementList.data = action.payload.data?.summary_statements || [];
        state.summaryStatementList.totalResults = action.payload.data?.total_files || 0;
      }
    },
    getInvoicesSummaryStatementListFailure(state, action: PayloadAction<APIResponse>) {
      state.summaryStatementList.loading = false;
      state.summaryStatementList.error = action.payload.status_code;
    },

    // ====================================
    // Get Capacity Market Summary
    // ====================================
    getCapacityMarketSummaryRequest(state, _action: PayloadAction<AssetCapacityMarketSummaryRequest['params']>) {
      state.capacityMarket2.summary.loading = true;
      state.capacityMarket2.summary.error = false;
      state.capacityMarket2.summary.success = false;
      state.capacityMarket2.summary.data = null;
    },
    getCapacityMarketSummarySuccess(state, action: PayloadAction<AssetCapacityMarketSummaryRequest['response']>) {
      state.capacityMarket2.summary.loading = false;
      state.capacityMarket2.summary.success = action.payload.status_code;
      if (action.payload.data) {
        state.capacityMarket2.summary.data = action.payload.data;
      }
    },
    getCapacityMarketSummaryFailure(state, action: PayloadAction<APIResponse>) {
      state.capacityMarket2.summary.loading = false;
      state.capacityMarket2.summary.error = action.payload.status_code;
    },

    // ====================================
    // Get Capacity Market Payments
    // ====================================
    getCapacityMarketPaymentsRequest(state, _action: PayloadAction<AssetCapacityMarketPaymentsRequest['params']>) {
      state.capacityMarket2.payments.loading = true;
      state.capacityMarket2.payments.error = false;
      state.capacityMarket2.payments.success = false;
      state.capacityMarket2.payments.data = null;
    },
    getCapacityMarketPaymentsSuccess(state, action: PayloadAction<AssetCapacityMarketPaymentsRequest['response']>) {
      state.capacityMarket2.payments.loading = false;
      state.capacityMarket2.payments.success = action.payload.status_code;
      if (action.payload.data) {
        state.capacityMarket2.payments.data = action.payload.data;
      }
    },
    getCapacityMarketPaymentsFailure(state, action: PayloadAction<APIResponse>) {
      state.capacityMarket2.payments.loading = false;
      state.capacityMarket2.payments.error = action.payload.status_code;
    },

    // ====================================
    // Get Capacity Market Payment Trend
    // ====================================
    getCapacityMarketPaymentTrendRequest(
      state,
      _action: PayloadAction<AssetCapacityMarketPaymentTrendRequest['params']>,
    ) {
      state.capacityMarket2.payment_trend.loading = true;
      state.capacityMarket2.payment_trend.error = false;
      state.capacityMarket2.payment_trend.success = false;
      state.capacityMarket2.payment_trend.data = null;
    },
    getCapacityMarketPaymentTrendSuccess(
      state,
      action: PayloadAction<AssetCapacityMarketPaymentTrendRequest['response']>,
    ) {
      state.capacityMarket2.payment_trend.loading = false;
      state.capacityMarket2.payment_trend.success = action.payload.status_code;
      if (action.payload.data) {
        state.capacityMarket2.payment_trend.data = action.payload.data;
      }
    },
    getCapacityMarketPaymentTrendFailure(state, action: PayloadAction<APIResponse>) {
      state.capacityMarket2.payment_trend.loading = false;
      state.capacityMarket2.payment_trend.error = action.payload.status_code;
    },

    // ====================================
    // Get Revenue Reconciliation Summary
    // ====================================
    getRevenueReconciliationSummaryRequest(
      state,
      _action: PayloadAction<AssetInvoiceRevenueReconciliationSummaryRequest['params']>,
    ) {
      state.revenueReconciliation.summary.loading = true;
      state.revenueReconciliation.summary.error = false;
      state.revenueReconciliation.summary.success = false;
      state.revenueReconciliation.summary.data = null;
    },
    getRevenueReconciliationSummarySuccess(
      state,
      action: PayloadAction<AssetInvoiceRevenueReconciliationSummaryRequest['response']>,
    ) {
      state.revenueReconciliation.summary.loading = false;
      state.revenueReconciliation.summary.success = action.payload.status_code;

      if (action.payload.data) {
        state.revenueReconciliation.summary.data = action.payload.data;
      }
    },
    getRevenueReconciliationSummaryFailure(state, action: PayloadAction<APIResponse>) {
      state.revenueReconciliation.summary.loading = false;
      state.revenueReconciliation.summary.error = action.payload.status_code;
    },

    // ====================================
    // Get Revenue Reconciliation Per Stream Comparison
    // ====================================
    getRevenueReconciliationPerStreamComparisonRequest(
      state,
      _action: PayloadAction<AssetInvoiceRevenueReconciliationPerStreamComparisonRequest['params']>,
    ) {
      state.revenueReconciliation.per_stream_comparison.loading = true;
      state.revenueReconciliation.per_stream_comparison.error = false;
      state.revenueReconciliation.per_stream_comparison.success = false;
      state.revenueReconciliation.per_stream_comparison.data = null;
    },
    getRevenueReconciliationPerStreamComparisonSuccess(
      state,
      action: PayloadAction<AssetInvoiceRevenueReconciliationPerStreamComparisonRequest['response']>,
    ) {
      state.revenueReconciliation.per_stream_comparison.loading = false;
      state.revenueReconciliation.per_stream_comparison.success = action.payload.status_code;

      if (action.payload.data) {
        state.revenueReconciliation.per_stream_comparison.data = action.payload.data;
      }
    },
    getRevenueReconciliationPerStreamComparisonFailure(state, action: PayloadAction<APIResponse>) {
      state.revenueReconciliation.per_stream_comparison.loading = false;
      state.revenueReconciliation.per_stream_comparison.error = action.payload.status_code;
    },
  },
});

export default invoiceSlice.reducer;
export const {
  // get invoices list
  getInvoicesListFailure,
  getInvoicesListRequest,
  getInvoicesListSuccess,

  // get invoices summary
  getInvoicesSummaryFailure,
  getInvoicesSummaryRequest,
  getInvoicesSummarySuccess,

  // get invoices settlement list
  getInvoicesSettlementListFailure,
  getInvoicesSettlementListRequest,
  getInvoicesSettlementListSuccess,

  // get invoices summary statement list
  getInvoicesSummaryStatementListRequest,
  getInvoicesSummaryStatementListSuccess,
  getInvoicesSummaryStatementListFailure,

  // capacity market summary
  getCapacityMarketSummaryRequest,
  getCapacityMarketSummarySuccess,
  getCapacityMarketSummaryFailure,

  // capacity market payments
  getCapacityMarketPaymentsRequest,
  getCapacityMarketPaymentsSuccess,
  getCapacityMarketPaymentsFailure,

  // capacity market payment trend
  getCapacityMarketPaymentTrendRequest,
  getCapacityMarketPaymentTrendSuccess,
  getCapacityMarketPaymentTrendFailure,

  // revenue reconciliation summary
  getRevenueReconciliationSummaryFailure,
  getRevenueReconciliationSummaryRequest,
  getRevenueReconciliationSummarySuccess,

  // revenue reconciliation per stream comparison
  getRevenueReconciliationPerStreamComparisonFailure,
  getRevenueReconciliationPerStreamComparisonRequest,
  getRevenueReconciliationPerStreamComparisonSuccess,
} = invoiceSlice.actions;
