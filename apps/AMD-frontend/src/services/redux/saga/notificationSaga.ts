import {call, put, takeLatest} from 'redux-saga/effects';
import {fetchActiveNotifications, markNotificationAsRead} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';
import {
  fetchActiveNotificationsRequest,
  fetchActiveNotificationsSuccess,
  fetchActiveNotificationsFailure,
  markNotificationReadRequest,
  markNotificationReadSuccess,
  markNotificationReadFailure,
} from '../slice/notificationSlice';

function* handleFetchActiveNotifications(_action: ReturnType<typeof fetchActiveNotificationsRequest>): Generator {
  try {
    const response: any = yield call(fetchActiveNotifications);
    const data = response.data || response;
    if (data?.status === SUCCESS_KEY) {
      yield put(fetchActiveNotificationsSuccess(data));
    } else {
      yield put(fetchActiveNotificationsFailure(data));
    }
  } catch (error: any) {
    yield put(
      fetchActiveNotificationsFailure(
        error.response?.data || {status_code: 500, message: 'Failed to fetch active notifications'},
      ),
    );
  }
}

function* handleMarkNotificationRead(action: ReturnType<typeof markNotificationReadRequest>): Generator {
  try {
    const response: any = yield call(markNotificationAsRead, action.payload.notification_id);
    const data = response.data || response;
    if (data?.status === SUCCESS_KEY) {
      yield put(markNotificationReadSuccess(data));
    } else {
      yield put(markNotificationReadFailure(data));
    }
  } catch (error: any) {
    yield put(
      markNotificationReadFailure(
        error.response?.data || {status_code: 500, message: 'Failed to mark notification as read'},
      ),
    );
  }
}

export default function* notificationSaga() {
  yield takeLatest(fetchActiveNotificationsRequest.type, handleFetchActiveNotifications);
  yield takeLatest(markNotificationReadRequest.type, handleMarkNotificationRead);
}
