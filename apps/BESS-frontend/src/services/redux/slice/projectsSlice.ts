import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type ProjectSliceInitialState } from '@/interface';
import type {
  APIResponse,
  CreateProjectPayload,
  DeleteProjectRequest,
  ProjectListRequest,
  ReassignProjectOwnerRequest,
  UpdateProjectPayload,
} from '@/interface/api-interface';

const initialState: ProjectSliceInitialState = {
  isloading: false,
  projectError: false,
  projectSuccess: false,
  projects: [],
  totalPages: 0,
  nextPage: null,
  currentPage: 0,
  totalResults: 0,

  // Reassign project owner
  reassignLoading: false,
  reassignError: false,
  reassignSuccess: false,

  allProjects: [],
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {


    // ======================================
    // get project list
    // ======================================
    projectListRequest: (state, action: PayloadAction<ProjectListRequest['params']>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    projectListSuccess: (state, action: PayloadAction<ProjectListRequest['response']>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.projects = action.payload.data.projects;
        state.allProjects = action.payload.data.projects; // keep allProjects in sync
        state.totalPages = action.payload.data.total_pages;
        state.currentPage = action.payload.data.current_page;
        state.nextPage = action.payload.data.next_page;
        state.totalResults = action.payload.data.total_results;
      }
    },
    projectListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
      if (['E-20005', 'E-10015', 'E-10014'].includes(action.payload.status_code)) {
        state.projects = [];
        state.totalPages = 0;
        state.currentPage = 0;
        state.nextPage = null;
        state.totalResults = 0;
      }
    },

    resetProjectMessage: state => {
      state.projectError = false;
      state.projectSuccess = false;
    },

    // ======================================
    // reassign project owner
    // ======================================
    reassignProjectOwnerRequest: (
      state,
      action: PayloadAction<{
        params: ReassignProjectOwnerRequest['params'];
        payload: ReassignProjectOwnerRequest['payload'];
      }>
    ) => {
      state.reassignLoading = true;
      state.reassignError = false;
      state.reassignSuccess = false;
    },
    reassignProjectOwnerSuccess: (
      state,
      action: PayloadAction<ReassignProjectOwnerRequest['response']>
    ) => {
      state.reassignLoading = false;
      state.reassignSuccess = action.payload.status_code;
    },
    reassignProjectOwnerFailure: (state, action: PayloadAction<APIResponse>) => {
      state.reassignLoading = false;
      state.reassignError = action.payload.status_code;
    },

    resetReassignMessage: state => {
      state.reassignError = false;
      state.reassignSuccess = false;
    },

    cancelProjectRequest: state => {
      state.isloading = false;
    },

    createProjectRequest: (
      state,
      action: PayloadAction<CreateProjectPayload>
    ) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    createProjectSuccess: (state, action: PayloadAction<any>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
      if (action.payload?.data) {
        const newProject = action.payload.data;
        state.projects = [newProject, ...state.projects];
        state.allProjects = [newProject, ...state.allProjects];
      }
    },
    createProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    updateProjectRequest: (state, action: PayloadAction<UpdateProjectPayload>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    updateProjectSuccess: (state, action: PayloadAction<any>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
    },
    updateProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    deleteProjectRequest: (state, action: PayloadAction<DeleteProjectRequest['payload']>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    deleteProjectSuccess: (state, action: PayloadAction<DeleteProjectRequest['response']>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
    },
    deleteProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    restoreProjectRequest: (state, action: PayloadAction<number>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    restoreProjectSuccess: (state, action: PayloadAction<any>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
    },
    restoreProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    archiveProjectRequest: (state, action: PayloadAction<number>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    archiveProjectSuccess: (state, action: PayloadAction<any>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
    },
    archiveProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    unArchiveProjectRequest: (state, action: PayloadAction<number>) => {
      state.isloading = true;
      state.projectError = false;
      state.projectSuccess = false;
    },
    unArchiveProjectSuccess: (state, action: PayloadAction<any>) => {
      state.isloading = false;
      state.projectSuccess = action.payload.status_code;
    },
    unArchiveProjectFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.projectError = action.payload.status_code;
    },

    getAllProjectListRequest: (state) => {
      state.isloading = true;
    },
    getAllProjectListSuccess: (state, action: PayloadAction<ProjectListRequest['response']>) => {
      state.isloading = false;
      if (action.payload.data) {
        state.allProjects = action.payload.data.projects;
      }
    },
    getAllProjectListFailure: (state, _action: PayloadAction<APIResponse>) => {
      state.isloading = false;
    },
  },
});

export const {

  // project list
  projectListRequest,
  projectListSuccess,
  projectListFailure,

  // reassign project owner
  reassignProjectOwnerRequest,
  reassignProjectOwnerSuccess,
  reassignProjectOwnerFailure,

  // reset message
  resetProjectMessage,
  resetReassignMessage,

  // cancel request
  cancelProjectRequest,

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
} = projectSlice.actions;
export default projectSlice.reducer;
