import {call, put, takeLatest} from 'redux-saga/effects';
import {
  getInvoicesList,
  getInvoicesSummary,
  getInvoicesSettlementList,
  getAssetCapacityMarketAnalytics,
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

  // capacity market
  getCapacityMarketRequest,
  getCapacityMarketSuccess,
  getCapacityMarketFailure,
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

function* GetCapacityMarketSaga(action: ReturnType<typeof getCapacityMarketRequest>): Generator {
  try {
    const response: any = yield call(getAssetCapacityMarketAnalytics, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getCapacityMarketSuccess(response.data));
    } else {
      yield put(getCapacityMarketFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCapacityMarketFailure(error.response?.data || error.response));
  }
}

export default function* InvoiceSaga(): Generator {
  yield takeLatest(getInvoicesListRequest.type, GetInvoicesListSaga);
  yield takeLatest(getInvoicesSummaryRequest.type, GetInvoicesSummarySaga);
  yield takeLatest(getInvoicesSettlementListRequest.type, GetInvoicesSettlementListSaga);
  yield takeLatest(getCapacityMarketRequest.type, GetCapacityMarketSaga);
}
