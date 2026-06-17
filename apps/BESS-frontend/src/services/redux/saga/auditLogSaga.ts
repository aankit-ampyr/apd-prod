import {call, put, takeLatest} from 'redux-saga/effects';
import {auditLogListRequest, auditLogListSuccess, auditLogListFailure} from '../slice/auditLogSlice';
import {getAuditLogs} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* AuditLogListSaga(action: ReturnType<typeof auditLogListRequest>): Generator {
  try {
    const response: any = yield call(getAuditLogs, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(auditLogListSuccess(response.data));
    } else {
      yield put(auditLogListFailure(response.data));
    }
  } catch (error: any) {
    yield put(auditLogListFailure(error.response));
  }
}

export default function* AuditLogSaga(): Generator {
  yield takeLatest(auditLogListRequest.type, AuditLogListSaga);
}
