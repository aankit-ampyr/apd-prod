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
