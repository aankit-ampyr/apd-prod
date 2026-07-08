import {all} from 'redux-saga/effects';
import userSaga from './userSaga';
import organizationSaga from './organizationSaga';
import authSaga from './authSaga';
import assetSaga from './assetSaga';
import digestSaga from './digestSaga';
import settingSaga from './settingsSaga';
import auditLogSaga from './auditLogSaga';
import invoiceSaga from './invoiceSaga';

const rootSaga = function* root() {
  yield all([
    userSaga(),
    organizationSaga(),
    authSaga(),
    assetSaga(),
    digestSaga(),
    settingSaga(),
    auditLogSaga(),
    invoiceSaga(),
  ]);
};

export default rootSaga;
