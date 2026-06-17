import {call, put, takeLatest} from 'redux-saga/effects';
import {
  // add user
  addUserFailure,
  addUserRequest,
  addUserSuccess,

  // get user list
  userListFailure,
  userListRequest,
  userListSuccess,

  // edit user
  editUserFailure,
  editUserRequest,
  editUserSuccess,

  // delete user
  deleteUserRequest,
  deleteUserSuccess,
  deleteUserFailure,

  // assign organization
  assignOrganizationRequest,
  assignOrganizationSuccess,
  assignOrganizationFailure,

} from '../slice/userSlice';
import {addUser, assignOrganization, deleteUser, editUser, getUsers} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* AddUserSaga(action: ReturnType<typeof addUserRequest>): Generator {
  try {
    const response: any = yield call(addUser, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(addUserSuccess(response.data));
    } else {
      yield put(addUserFailure(response.data));
    }
  } catch (error: any) {
    yield put(addUserFailure(error.response));
  }
}

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

function* EditUserSaga(action: ReturnType<typeof editUserRequest>): Generator {
  try {
    const response: any = yield call(editUser, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(editUserSuccess(response.data));
    } else {
      yield put(editUserFailure(response.data));
    }
  } catch (error: any) {
    yield put(editUserFailure(error.response));
  }
}


function* DeleteUserSaga(action: ReturnType<typeof deleteUserRequest>): Generator {
  try {
    const response: any = yield call(deleteUser, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteUserSuccess(response.data));
    } else {
      yield put(editUserFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteUserFailure(error.response));
  }
}

function* AssignOrganizationSaga(action: ReturnType<typeof assignOrganizationRequest>): Generator {
  try {
    const response: any = yield call(assignOrganization, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(assignOrganizationSuccess(response.data));
    } else {
      yield put(assignOrganizationFailure(response.data));
    }
  } catch (error: any) {
    yield put(assignOrganizationFailure(error.response));
  }
}

export default function* UsersSaga(): Generator {
  yield takeLatest(addUserRequest.type, AddUserSaga);
  yield takeLatest(userListRequest.type, UserListSaga);
  yield takeLatest(editUserRequest.type, EditUserSaga);
  yield takeLatest(deleteUserRequest.type, DeleteUserSaga);
  yield takeLatest(assignOrganizationRequest.type, AssignOrganizationSaga);
}
