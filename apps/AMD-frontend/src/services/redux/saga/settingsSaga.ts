import {call, put, takeLatest} from 'redux-saga/effects';
import {
  // get benchmark metrics
  getBenchmarkMetricsFailure,
  getBenchmarkMetricsRequest,
  getBenchmarkMetricsSuccess,

  // update benchmark metrics
  updateBenchmarkMetricsFailure,
  updateBenchmarkMetricsRequest,
  updateBenchmarkMetricsSuccess,

  // get monthly values
  getMonthlyValuesRequest,
  getMonthlyValuesSuccess,
  getMonthlyValuesFailure,

  // add monthly values
  addMonthlyValuesRequest,
  addMonthlyValuesSuccess,
  addMonthlyValuesFailure,

  // update monthly values
  updateMonthlyValuesRequest,
  updateMonthlyValuesSuccess,
  updateMonthlyValuesFailure,
} from '../slice/settingsSlice';

import {
  getBenchmarkMetrics,
  updateBenchmarkMetrics,
  getMonthlyValues,
  addMonthlyValues,
  updateMonthlyValues,
} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* GetBenchmarkSaga(): Generator {
  try {
    const response: any = yield call(getBenchmarkMetrics);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getBenchmarkMetricsSuccess(response.data));
    } else {
      yield put(getBenchmarkMetricsFailure(response.data));
    }
  } catch (error: any) {
    yield put(getBenchmarkMetricsFailure(error.response?.data || error.response));
  }
}

function* UpdateBenchmarkSaga(action: ReturnType<typeof updateBenchmarkMetricsRequest>): Generator {
  try {
    const response: any = yield call(updateBenchmarkMetrics, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(updateBenchmarkMetricsSuccess(response.data));
    } else {
      yield put(updateBenchmarkMetricsFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateBenchmarkMetricsFailure(error.response?.data || error.response));
  }
}

function* UpdateMonthlyValuesSaga(action: ReturnType<typeof updateMonthlyValuesRequest>): Generator {
  try {
    const response: any = yield call(updateMonthlyValues, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(updateMonthlyValuesSuccess(response.data));
    } else {
      yield put(updateMonthlyValuesFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateMonthlyValuesFailure(error.response?.data || error.response));
  }
}

function* GetMonthlyValuesSaga(action: ReturnType<typeof getMonthlyValuesRequest>): Generator {
  try {
    const response: any = yield call(getMonthlyValues, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(getMonthlyValuesSuccess(response.data));
    } else {
      yield put(getMonthlyValuesFailure(response.data));
    }
  } catch (error: any) {
    yield put(getMonthlyValuesFailure(error.response?.data || error.response));
  }
}

function* AddMonthlyValuesSaga(action: ReturnType<typeof addMonthlyValuesRequest>): Generator {
  try {
    const response: any = yield call(addMonthlyValues, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(addMonthlyValuesSuccess(response.data));
    } else {
      yield put(addMonthlyValuesFailure(response.data));
    }
  } catch (error: any) {
    yield put(addMonthlyValuesFailure(error.response?.data || error.response));
  }
}

export default function* SettingSaga(): Generator {
  yield takeLatest(getBenchmarkMetricsRequest.type, GetBenchmarkSaga);
  yield takeLatest(updateBenchmarkMetricsRequest.type, UpdateBenchmarkSaga);
  yield takeLatest(updateMonthlyValuesRequest.type, UpdateMonthlyValuesSaga);
  yield takeLatest(getMonthlyValuesRequest.type, GetMonthlyValuesSaga);
  yield takeLatest(addMonthlyValuesRequest.type, AddMonthlyValuesSaga);
}
