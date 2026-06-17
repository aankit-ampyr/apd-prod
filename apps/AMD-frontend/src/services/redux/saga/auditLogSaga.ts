import {call, put, takeLatest} from 'redux-saga/effects';
import {SUCCESS_KEY} from '@/constants';
import {auditLogList} from '@/services/api';
import {
  auditLogListFailure,
  auditLogListRequest,
  auditLogListSuccess,
} from '../slice/auditLogSlice';

function* AuditLogListSaga(action: ReturnType<typeof auditLogListRequest>): Generator {
  try {
    const response: any = yield call(auditLogList, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(auditLogListSuccess(response.data));
    } else {
      yield put(auditLogListFailure(response.data));
    }
  } catch (error: any) {
    yield put(auditLogListFailure(error.response?.data || error.response));
  }
}

export default function* AuditLogSaga(): Generator {
  yield takeLatest(auditLogListRequest.type, AuditLogListSaga);
}
