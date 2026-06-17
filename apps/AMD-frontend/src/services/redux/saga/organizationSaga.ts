import {call, put, takeLatest} from 'redux-saga/effects';
import {
  // add organization actions
  addOrganizationRequest,
  addOrganizationSuccess,
  addOrganizationFailure,

  // edit organization actions
  editOrganizationRequest,
  editOrganizationSuccess,
  editOrganizationFailure,

  // list organization
  organizationListRequest,
  organizationListSuccess,
  organizationListFailure,

  // all organization list actions
  getAllOrganizationsListRequest,
  getAllOrganizationListSuccess,
  getAllOrganizationListFailure,

  // multiple organization users
  organizationMultipleUserRequest,
  organizationMultipleUserSuccess,
  organizationMultipleUserFailure
} from '../slice/organizationSlice';

import {addOrganization, editOrganization, organizationList, getOrganizationMultipleUsers} from '@/services/api';
import {SUCCESS_KEY} from '@/constants';

function* AddOrganizationSaga(action: ReturnType<typeof addOrganizationRequest>): Generator {
  try {
    const response: any = yield call(addOrganization, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(addOrganizationSuccess(response.data));
    } else {
      yield put(addOrganizationFailure(response.data));
    }
  } catch (error: any) {
    yield put(addOrganizationFailure(error.response.data));
  }
}

function* EditOrganizationSaga(action: ReturnType<typeof editOrganizationRequest>): Generator {
  try {
    const response: any = yield call(editOrganization, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(editOrganizationSuccess(response.data));
    } else {
      yield put(editOrganizationFailure(response.data));
    }
  } catch (error: any) {
    yield put(editOrganizationFailure(error.response.data));
  }
}

function* OrganizationListSaga(action: ReturnType<typeof organizationListRequest>): Generator {
  try {
    const response: any = yield call(organizationList, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(organizationListSuccess(response.data));
    } else {
      yield put(organizationListFailure(response.data));
    }
  } catch (error: any) {
    yield put(organizationListFailure(error.response.data));
  }
}

function* OrganizationMultipleUserSaga(action: ReturnType<typeof organizationMultipleUserRequest>): Generator {
  try {
    const response: any = yield call(getOrganizationMultipleUsers, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(organizationMultipleUserSuccess(response.data));
    } else {
      yield put(organizationMultipleUserFailure(response.data));
    }
  } catch (error: any) {
    yield put(organizationMultipleUserFailure(error.response?.data || error.response));
  }
}

function* GetAllOrganizationListSaga(): Generator {
  try {
    const response: any = yield call(organizationList, {limit: -1});
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAllOrganizationListSuccess(response.data));
    } else {
      yield put(getAllOrganizationListFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAllOrganizationListFailure(error.response.data));
  }
}

export default function* OrganizationSaga() {
  yield takeLatest(addOrganizationRequest.type, AddOrganizationSaga);
  yield takeLatest(editOrganizationRequest.type, EditOrganizationSaga);
  yield takeLatest(organizationListRequest.type, OrganizationListSaga);
  yield takeLatest(getAllOrganizationsListRequest.type, GetAllOrganizationListSaga);
  yield takeLatest(organizationMultipleUserRequest.type, OrganizationMultipleUserSaga);
  // refresh the cached "all organizations" list after add/edit success
  yield takeLatest(addOrganizationSuccess.type, function* () {
    yield put(getAllOrganizationsListRequest());
  });
  yield takeLatest(editOrganizationSuccess.type, function* () {
    yield put(getAllOrganizationsListRequest());
  });
}
