import {call, put, takeLatest} from 'redux-saga/effects';
import {
  loginOtpRequest,
  loginOtpSuccess,
  loginOtpFailure,
  verifyOtpRequest,
  verifyOtpSuccess,
  verifyOtpFailure,
} from '../slice/authSlice';
import {login as loginOtpRequestAPI, verifyOtp as verifyOtpAPI} from '@/services/api';
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

export default function* AuthSaga(): Generator {
  yield takeLatest(loginOtpRequest.type, loginOtpRequestSaga);
  yield takeLatest(verifyOtpRequest.type, verifyOtpRequestSaga);
}
