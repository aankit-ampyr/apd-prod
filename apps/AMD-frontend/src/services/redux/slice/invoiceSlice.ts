import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {InvoiceSliceInitialState} from '@/interface/slice-interface';
import {
  APIResponse,
  InvoiceListRequest,
  InvoiceSettlementListRequest,
  InvoiceSummaryRequest,
  AssetCapacityMarketRequest,
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
  capacityMarket: {
    loading: false,
    error: false,
    success: false,
    data: null,
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
    // Get Capacity Market Analytics
    // ====================================
    getCapacityMarketRequest(state, _action: PayloadAction<AssetCapacityMarketRequest['params']>) {
      state.capacityMarket.loading = true;
      state.capacityMarket.error = false;
      state.capacityMarket.success = false;
    },
    getCapacityMarketSuccess(state, action: PayloadAction<AssetCapacityMarketRequest['response']>) {
      state.capacityMarket.loading = false;
      state.capacityMarket.success = action.payload.status_code;
      if (action.payload.data) {
        state.capacityMarket.data = action.payload.data;
      }
    },
    getCapacityMarketFailure(state, action: PayloadAction<APIResponse>) {
      state.capacityMarket.loading = false;
      state.capacityMarket.error = action.payload.status_code;
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

  // capacity market
  getCapacityMarketRequest,
  getCapacityMarketSuccess,
  getCapacityMarketFailure,
} = invoiceSlice.actions;
