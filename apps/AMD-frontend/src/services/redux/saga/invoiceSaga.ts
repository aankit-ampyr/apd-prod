import {call, put, takeLatest} from 'redux-saga/effects';
import {
  getInvoicesList,
  getInvoicesSummary,
  getInvoicesSettlementList,
  getAssetCapacityMarketSummary,
  getAssetCapacityMarketPayments,
  getAssetCapacityMarketPaymentTrend,
  getAssetInvoiceStatementSummaryList,
  getAssetInvoiceRevenueReconciliationSummary,
  getAssetInvoiceRevenueReconciliationPerStreamComparison,
} from '@/services/api';
import {
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

  // get invoices summary statement list
  getInvoicesSummaryStatementListRequest,
  getInvoicesSummaryStatementListSuccess,
  getInvoicesSummaryStatementListFailure,

  // revenue reconciliation summary
  getRevenueReconciliationSummaryRequest,
  getRevenueReconciliationSummarySuccess,
  getRevenueReconciliationSummaryFailure,

  // revenue reconciliation per stream comparison
  getRevenueReconciliationPerStreamComparisonRequest,
  getRevenueReconciliationPerStreamComparisonSuccess,
  getRevenueReconciliationPerStreamComparisonFailure,
} from '@/services/redux/slice/invoiceSlice';
import {SUCCESS_KEY} from '@/constants';

function* GetInvoicesListSaga(action: ReturnType<typeof getInvoicesListRequest>): Generator {
  try {
    const response: any = yield call(getInvoicesList, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getInvoicesListSuccess({params: action.payload, response: response.data}));
    } else {
      yield put(getInvoicesListFailure({params: action.payload, response: response.data}));
    }
  } catch (error: any) {
    yield put(getInvoicesListFailure({params: action.payload, response: error.response?.data || error.response}));
  }
}

function* GetInvoicesSummarySaga(action: ReturnType<typeof getInvoicesSummaryRequest>): Generator {
  try {
    const response: any = yield call(getInvoicesSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getInvoicesSummarySuccess(response.data));
    } else {
      yield put(getInvoicesSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getInvoicesSummaryFailure(error.response?.data || error.response));
  }
}

function* GetInvoicesSettlementListSaga(action: ReturnType<typeof getInvoicesSettlementListRequest>): Generator {
  try {
    const response: any = yield call(getInvoicesSettlementList, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getInvoicesSettlementListSuccess(response.data));
    } else {
      yield put(getInvoicesSettlementListFailure(response.data));
    }
  } catch (error: any) {
    yield put(getInvoicesSettlementListFailure(error.response?.data || error.response));
  }
}

function* GetCapacityMarketSummarySaga(action: ReturnType<typeof getCapacityMarketSummaryRequest>): Generator {
  try {
    const response: any = yield call(getAssetCapacityMarketSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getCapacityMarketSummarySuccess(response.data));
    } else {
      yield put(getCapacityMarketSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCapacityMarketSummaryFailure(error.response?.data || error.response));
  }
}

function* GetCapacityMarketPaymentsSaga(action: ReturnType<typeof getCapacityMarketPaymentsRequest>): Generator {
  try {
    const response: any = yield call(getAssetCapacityMarketPayments, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getCapacityMarketPaymentsSuccess(response.data));
    } else {
      yield put(getCapacityMarketPaymentsFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCapacityMarketPaymentsFailure(error.response?.data || error.response));
  }
}

function* GetCapacityMarketPaymentTrendSaga(
  action: ReturnType<typeof getCapacityMarketPaymentTrendRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetCapacityMarketPaymentTrend, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getCapacityMarketPaymentTrendSuccess(response.data));
    } else {
      yield put(getCapacityMarketPaymentTrendFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCapacityMarketPaymentTrendFailure(error.response?.data || error.response));
  }
}

function* GetInvoiceSummaryStatementList(action: ReturnType<typeof getInvoicesSummaryStatementListRequest>): Generator {
  try {
    const response: any = yield call(getAssetInvoiceStatementSummaryList, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getInvoicesSummaryStatementListSuccess(response.data));
    } else {
      yield put(getInvoicesSummaryStatementListFailure(response.data));
    }
  } catch (error: any) {
    yield put(getInvoicesSummaryStatementListFailure(error.response?.data || error.response));
  }
}

function* GetRevenueReconciliationSummarySaga(
  action: ReturnType<typeof getRevenueReconciliationSummaryRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetInvoiceRevenueReconciliationSummary, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getRevenueReconciliationSummarySuccess(response.data));
    } else {
      yield put(getRevenueReconciliationSummaryFailure(response.data));
    }
  } catch (error: any) {
    yield put(getRevenueReconciliationSummaryFailure(error.response?.data || error.response || error));
  }
}

function* GetRevenueReconciliationPerStreamComparisonSaga(
  action: ReturnType<typeof getRevenueReconciliationPerStreamComparisonRequest>,
): Generator {
  try {
    const response: any = yield call(getAssetInvoiceRevenueReconciliationPerStreamComparison, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getRevenueReconciliationPerStreamComparisonSuccess(response.data));
    } else {
      yield put(getRevenueReconciliationPerStreamComparisonFailure(response.data));
    }
  } catch (error: any) {
    yield put(getRevenueReconciliationPerStreamComparisonFailure(error.response?.data || error.response || error));
  }
}

export default function* InvoiceSaga(): Generator {
  yield takeLatest(getInvoicesListRequest.type, GetInvoicesListSaga);
  yield takeLatest(getInvoicesSummaryRequest.type, GetInvoicesSummarySaga);
  yield takeLatest(getInvoicesSettlementListRequest.type, GetInvoicesSettlementListSaga);
  yield takeLatest(getCapacityMarketSummaryRequest.type, GetCapacityMarketSummarySaga);
  yield takeLatest(getCapacityMarketPaymentsRequest.type, GetCapacityMarketPaymentsSaga);
  yield takeLatest(getCapacityMarketPaymentTrendRequest.type, GetCapacityMarketPaymentTrendSaga);
  yield takeLatest(getInvoicesSummaryStatementListRequest.type, GetInvoiceSummaryStatementList);
  yield takeLatest(getRevenueReconciliationSummaryRequest.type, GetRevenueReconciliationSummarySaga);
  yield takeLatest(
    getRevenueReconciliationPerStreamComparisonRequest.type,
    GetRevenueReconciliationPerStreamComparisonSaga,
  );
}
