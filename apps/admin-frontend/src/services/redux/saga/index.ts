import {all} from 'redux-saga/effects';
import userSaga from './userSaga';
import authSaga from './authSaga';
import auditLogSaga from './auditLogSaga';

const rootSaga = function* root() {
  yield all([userSaga(), authSaga(), auditLogSaga()]);
};

export default rootSaga;
