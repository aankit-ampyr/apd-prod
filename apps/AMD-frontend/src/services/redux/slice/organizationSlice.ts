import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {
  APIResponse,
  OrganizationListRequest,
  OrganizationSliceInitialState,
  AddOrganizationRequest,
  EditOrganizationRequest,
  OrganizationMultipleUserRequest,
} from '@/interface';

const initialState: OrganizationSliceInitialState = {
  isLoading: false,
  organizationError: false,
  organizationSuccess: false,
  organizations: [],
  totalPages: 0,
  nextPage: null,
  currentPage: 1,
  totalResults: 0,

  users: [],

  allOrganizations: [],
};

export const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    // =========================
    // organization list
    // =========================
    organizationListRequest: (state, _action: PayloadAction<OrganizationListRequest['params']>) => {
      state.isLoading = true;
      state.organizationError = false;
      state.organizationSuccess = false;
    },
    organizationListSuccess: (state, action: PayloadAction<OrganizationListRequest['response']>) => {
      state.isLoading = false;
      state.organizationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.organizations = action.payload.data.organizations;
        state.totalPages = action.payload.data.total_pages;
        state.nextPage = action.payload.data.next_page;
        state.currentPage = action.payload.data.current_page;
        state.totalResults = action.payload.data.total_results;
      }
    },
    organizationListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.organizationError = action.payload.status_code;
      if (['E-10015', 'E-10014'].includes(action.payload.status_code)) {
        state.organizations = [];
        state.totalPages = 0;
        state.nextPage = null;
        state.currentPage = 1;
        state.totalResults = 0;
      }
    },

    // =========================
    // all organization list
    // =========================
    getAllOrganizationsListRequest: state => {
      state.isLoading = true;
    },
    getAllOrganizationListSuccess: (state, action: PayloadAction<OrganizationListRequest['response']>) => {
      state.isLoading = false;
      if (action.payload.data) {
        state.allOrganizations = action.payload.data.organizations;
      }
    },
    getAllOrganizationListFailure: (state, _action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
    },

    // =========================
    // create organization
    // =========================
    addOrganizationRequest: (state, _action: PayloadAction<AddOrganizationRequest['payload']>) => {
      state.isLoading = true;
      state.organizationError = false;
      state.organizationSuccess = false;
    },
    addOrganizationSuccess: (state, action: PayloadAction<AddOrganizationRequest['response']>) => {
      state.isLoading = false;
      state.organizationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.organizations.unshift(action.payload.data);
        state.totalResults += 1;
        state.allOrganizations = [action.payload.data, ...state.allOrganizations];
      }
    },
    addOrganizationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.organizationError = action.payload.status_code;
    },

    // =========================
    // edit organization
    // =========================
    editOrganizationRequest: (state, _action: PayloadAction<EditOrganizationRequest['payload']>) => {
      state.isLoading = true;
      state.organizationError = false;
      state.organizationSuccess = false;
    },
    editOrganizationSuccess: (state, action: PayloadAction<EditOrganizationRequest['response']>) => {
      state.isLoading = false;
      state.organizationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.organizations = state.organizations.map(org =>
          org.id === action.payload.data?.id ? action.payload.data : org,
        );
        state.allOrganizations = state.allOrganizations.map(org =>
          org.id === action.payload.data?.id ? action.payload.data : org,
        );
      }
    },
    editOrganizationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.organizationError = action.payload.status_code;
    },

    // =========================
    // reset organization
    // =========================
    resetOrganizationMessage: state => {
      state.organizationError = false;
      state.organizationSuccess = false;
    },
    // =========================
    // multiple organization users
    // =========================
    organizationMultipleUserRequest: (state, _action: PayloadAction<OrganizationMultipleUserRequest['params']>) => {
      state.isLoading = true;
      state.organizationError = false;
      state.organizationSuccess = false;
    },
    organizationMultipleUserSuccess: (state, action: PayloadAction<OrganizationMultipleUserRequest['response']>) => {
      state.isLoading = false;
      state.organizationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = action.payload.data.users;
      }
    },
    organizationMultipleUserFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.organizationError = action.payload.status_code;
      state.users = [];
    },

    cancelOrganizationRequest: (state) => {
      state.isLoading = false;
    }
  },
});

export const {
  // add organization reducers
  addOrganizationFailure,
  addOrganizationRequest,
  addOrganizationSuccess,

  // organization list reducers
  organizationListFailure,
  organizationListRequest,
  organizationListSuccess,

  // all organization list reducers
  getAllOrganizationListFailure,
  getAllOrganizationsListRequest,
  getAllOrganizationListSuccess,

  // edit organization reducers
  editOrganizationFailure,
  editOrganizationRequest,
  editOrganizationSuccess,

  // multiple organization users
  organizationMultipleUserRequest,
  organizationMultipleUserSuccess,
  organizationMultipleUserFailure,

  // reset organization message
  resetOrganizationMessage,

  // cancel organization request
  cancelOrganizationRequest,
} = organizationSlice.actions;
export default organizationSlice.reducer;
