import {call, put, takeLatest} from 'redux-saga/effects';
import {
  digestListRequest,
  digestListSuccess,
  digestListFailure,
  headDigest,
  endHeadDigest,

  addDigestRequest,
  addDigestSuccess,
  addDigestFailure,

  editDigestRequest,
  editDigestSuccess,
  editDigestFailure,
} from '../slice/digestSlice';
import {addDigest, editDigest, getDigests} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* DigestListSaga(action: ReturnType<typeof digestListRequest>): Generator {
  try {
    yield put(headDigest());
    const response: any = yield call(getDigests, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(digestListSuccess(response.data));
    } else {
      yield put(digestListFailure(response.data));
    }
  } catch (error: any) {
    yield put(digestListFailure(error.response?.data || error.response));
  } finally {
    yield put(endHeadDigest());
  }
}

function* AddDigestSaga(action: ReturnType<typeof addDigestRequest>): Generator {
  try {
    const response: any = yield call(addDigest, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(addDigestSuccess(response.data));
    } else {
      yield put(addDigestFailure(response.data));
    }
  } catch (error: any) {
    yield put(addDigestFailure(error.response?.data || error.response));
  }
}

function* EditDigestSaga(action: ReturnType<typeof editDigestRequest>): Generator {
  try {
    const response: any = yield call(editDigest, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(editDigestSuccess(response.data));
    } else {
      yield put(editDigestFailure(response.data));
    }
  } catch (error: any) {
    yield put(editDigestFailure(error.response?.data || error.response));
  }
}

export default function* DigestSaga(): Generator {
  yield takeLatest(digestListRequest.type, DigestListSaga);
  yield takeLatest(addDigestRequest.type, AddDigestSaga);
  yield takeLatest(editDigestRequest.type, EditDigestSaga);
}

