import { call, put, takeLatest } from 'redux-saga/effects';
import { archiveProject, createProject, deleteProject, getProjects, reassignProjectOwner, restoreProject, unArchiveProject, updateProject } from '@/services/api';
import { SUCCESS_KEY } from '@/constants';
import {
  projectListFailure,
  projectListRequest,
  projectListSuccess,
  reassignProjectOwnerRequest,
  reassignProjectOwnerSuccess,
  reassignProjectOwnerFailure,
  createProjectRequest,
  createProjectSuccess,
  createProjectFailure,
  updateProjectRequest,
  updateProjectSuccess,
  updateProjectFailure,
  deleteProjectRequest,
  deleteProjectSuccess,
  deleteProjectFailure,
  restoreProjectRequest,
  restoreProjectSuccess,
  restoreProjectFailure,
  archiveProjectRequest,
  archiveProjectSuccess,
  archiveProjectFailure,
  unArchiveProjectRequest,
  unArchiveProjectSuccess,
  unArchiveProjectFailure,

  getAllProjectListFailure,
  getAllProjectListRequest,
  getAllProjectListSuccess,
} from '../slice/projectsSlice';


function* ProjectListSaga(action: ReturnType<typeof projectListRequest>): Generator {
  try {
    const response: any = yield call(getProjects, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(projectListSuccess(response.data));
    } else {
      yield put(projectListFailure(response.data));
    }
  } catch (error: any) {
    yield put(projectListFailure(error.response));
  }
}

function* AllProjectListSaga(action: ReturnType<typeof getAllProjectListRequest>): Generator {
  try {
    const response: any = yield call(getProjects, {limit: -1});
    if (response.data.status === SUCCESS_KEY) {
      yield put(getAllProjectListSuccess(response.data));
    } else {
      yield put(getAllProjectListFailure(response.data));
    }
  } catch (error: any) {
    yield put(getAllProjectListFailure(error.response));
  }
}


function* ReassignProjectOwnerSaga(
  action: ReturnType<typeof reassignProjectOwnerRequest>
): Generator {
  try {
    const { params, payload } = action.payload;
    const response: any = yield call(
      reassignProjectOwner,
      params.project_id,
      payload
    );
    if (response.data.status === SUCCESS_KEY) {
      yield put(reassignProjectOwnerSuccess(response.data));
    } else {
      yield put(reassignProjectOwnerFailure(response.data));
    }
  } catch (error: any) {
    yield put(reassignProjectOwnerFailure(error.response?.data || error.response));
  }
}

function* CreateProjectSaga(action: ReturnType<typeof createProjectRequest>): Generator {
  try {
    const response: any = yield call(createProject, action.payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(createProjectSuccess(response.data));
    } else {
      yield put(createProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(createProjectFailure(error.response?.data || error.response));
  }
}

function* UpdateProjectSaga(action: ReturnType<typeof updateProjectRequest>): Generator {
  try {
    const { projectId, payload } = action.payload as any;
    const response: any = yield call(updateProject, projectId, payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(updateProjectSuccess(response.data));
    } else {
      yield put(updateProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateProjectFailure(error.response?.data || error.response));
  }
}

function* RestoreProjectSaga(action: ReturnType<typeof restoreProjectRequest>): Generator {
  try {
    const projectId = action.payload as any;
    const response: any = yield call(restoreProject, projectId);
    if (response.data.status === SUCCESS_KEY) {
      yield put(restoreProjectSuccess(response.data));
    } else {
      yield put(restoreProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(restoreProjectFailure(error.response?.data || error.response));
  }
}

function* DeleteProjectSaga(action: ReturnType<typeof deleteProjectRequest>): Generator {
  try {
    const projectId = action.payload.id;
    const response: any = yield call(deleteProject, projectId);
    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteProjectSuccess(response.data));
    } else {
      yield put(deleteProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteProjectFailure(error.response?.data || error.response));
  }
}

function* ArchiveProjectSaga(action: ReturnType<typeof archiveProjectRequest>): Generator {
  try {
    const projectId = action.payload as any;
    const response: any = yield call(archiveProject, projectId);
    if (response.data.status === SUCCESS_KEY) {
      yield put(archiveProjectSuccess(response.data));
    } else {
      yield put(archiveProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(archiveProjectFailure(error.response?.data || error.response));
  }
}

function* UnArchiveProjectSaga(action: ReturnType<typeof unArchiveProjectRequest>): Generator {
  try {
    const projectId = action.payload as any;
    const response: any = yield call(unArchiveProject, projectId);
    if (response.data.status === SUCCESS_KEY) {
      yield put(unArchiveProjectSuccess(response.data));
    } else {
      yield put(unArchiveProjectFailure(response.data));
    }
  } catch (error: any) {
    yield put(unArchiveProjectFailure(error.response?.data || error.response));
  }
}

export default function* ProjectssSaga(): Generator {
  yield takeLatest(projectListRequest.type, ProjectListSaga);
  yield takeLatest(reassignProjectOwnerRequest.type, ReassignProjectOwnerSaga);
  yield takeLatest(createProjectRequest.type, CreateProjectSaga);
  yield takeLatest(updateProjectRequest.type, UpdateProjectSaga);
  yield takeLatest(deleteProjectRequest.type, DeleteProjectSaga);
  yield takeLatest(restoreProjectRequest.type, RestoreProjectSaga);
  yield takeLatest(archiveProjectRequest.type, ArchiveProjectSaga);
  yield takeLatest(unArchiveProjectRequest.type, UnArchiveProjectSaga);
  yield takeLatest(getAllProjectListRequest.type, AllProjectListSaga);

}
