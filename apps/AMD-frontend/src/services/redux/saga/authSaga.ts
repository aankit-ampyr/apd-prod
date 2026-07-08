import {call, put, takeLatest} from 'redux-saga/effects';
import {
  loginOtpRequest,
  loginOtpSuccess,
  loginOtpFailure,
  verifyOtpRequest,
  verifyOtpSuccess,
  verifyOtpFailure,

  // logout actions
  logoutRequest,
  logoutSuccess,
  logoutFailure,

} from '../slice/authSlice';
import {login as loginOtpRequestAPI, logout, verifyOtp as verifyOtpAPI} from '@/services/api';
import {SUCCESS_KEY} from '@/constants/keys';

function* loginOtpRequestSaga(action: any): Generator {
  try {
    const response: any = yield call(loginOtpRequestAPI, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(loginOtpSuccess(response.data));
    } else {
      yield put(loginOtpFailure(response.data));
    }
  } catch (error: any) {
    yield put(loginOtpFailure(error.response));
  }
}

function* verifyOtpRequestSaga(action: any): Generator {
  try {
    const response: any = yield call(verifyOtpAPI, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(verifyOtpSuccess(response.data));
    } else {
      yield put(verifyOtpFailure(response.data));
    }
  } catch (error: any) {
    yield put(verifyOtpFailure(error.response));
  }
}

function* LogoutSaga(): Generator {
  try {
    const response: any = yield call(logout);
    if (response.data.status === SUCCESS_KEY) {
      yield put(logoutSuccess(response.data));
    } else {
      yield put(logoutFailure(response.data));
    }
  } catch (error: any) {
    yield put(logoutFailure(error.response));
  }
}

export default function* AuthSaga(): Generator {
  yield takeLatest(loginOtpRequest.type, loginOtpRequestSaga);
  yield takeLatest(verifyOtpRequest.type, verifyOtpRequestSaga);
  yield takeLatest(logoutRequest.type, LogoutSaga);
}
