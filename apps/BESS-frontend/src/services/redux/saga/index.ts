import {all} from 'redux-saga/effects';
import userSaga from './userSaga';
import authSaga from './authSaga';
import ProjectssSaga from './projectSaga';
import simulationWizardSaga from './simulationWizardSaga';
import AuditLogSaga from './auditLogSaga';

const rootSaga = function* root() {
  yield all([userSaga(), authSaga(), ProjectssSaga(), simulationWizardSaga(), AuditLogSaga()]);
};

export default rootSaga;
