import { call, put, takeLatest } from 'redux-saga/effects';
import {


  getAllUsersFailure,
  getAllUsersListRequest,
  getAllUsersListSuccess,
  // get user list
  userListFailure,
  userListRequest,
  userListSuccess,


} from '../slice/userSlice';
import { getUsers } from '@/services/api';
import { SUCCESS_KEY } from '@/constants';


function* UserListSaga(action: ReturnType<typeof userListRequest>): Generator {
  try {
    const response: any = yield call(getUsers, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(userListSuccess(response.data));
    } else {
      yield put(userListFailure(response.data));
    }
  } catch (error: any) {
    yield put(userListFailure(error.response));
  }
}

function* GetAllUsersListSaga(): Generator {
  try {
    const response: any = yield call(getUsers, { limit: -1 });
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAllUsersListSuccess(response.data));
    } else {
      yield put(getAllUsersFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAllUsersFailure(error.response.data));
  }
}

export default function* UsersSaga(): Generator {
  yield takeLatest(userListRequest.type, UserListSaga);
  yield takeLatest(getAllUsersListRequest.type, GetAllUsersListSaga);
}
