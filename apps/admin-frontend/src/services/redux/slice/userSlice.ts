import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type UserSliceInitialState} from '@/interface';
import type {
  AddUserRequest,
  UserListRequest,
  APIResponse,
  EditUserRequest,
  DeleteUserRequest,
  AssignOrganizationRequest,
} from '@/interface/api-interface';

const initialState: UserSliceInitialState = {
  isloading: false,
  userError: false,
  userSuccess: false,
  users: [],
  totalPages: 0,
  nextPage: null,
  currentPage: 0,
  totalResults: 0,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // ======================================
    // add request and response reducers
    // ======================================
    addUserRequest: (state, _action: PayloadAction<AddUserRequest['payload']>) => {
      state.isloading = true;
      state.userError = false;
      state.userSuccess = false;
    },
    addUserSuccess: (state, action: PayloadAction<AddUserRequest['response']>) => {
      state.isloading = false;
      state.userSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = [action.payload.data, ...state.users];
        state.totalResults += 1;
      }
    },
    addUserFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.userError = action.payload.status_code;
    },

    // ======================================
    // get user list
    // ======================================
    userListRequest: (state, _action: PayloadAction<UserListRequest['params']>) => {
      state.isloading = true;
      state.userError = false;
      state.userSuccess = false;
    },
    userListSuccess: (state, action: PayloadAction<UserListRequest['response']>) => {
      state.isloading = false;
      state.userSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = action.payload.data.users;
        state.totalPages = action.payload.data.total_pages;
        state.currentPage = action.payload.data.current_page;
        state.nextPage = action.payload.data.next_page;
        state.totalResults = action.payload.data.total_results;
      }
    },
    userListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.userError = action.payload.status_code;
      if (['E-10015', 'E-10014'].includes(action.payload.status_code)) {
        state.users = [];
        state.totalPages = 0;
        state.currentPage = 0;
        state.nextPage = null;
        state.totalResults = 0;
      }
    },

    // ======================================
    // edit request and response reducers
    // ======================================
    editUserRequest: (state, _action: PayloadAction<EditUserRequest['payload']>) => {
      state.isloading = true;
      state.userError = false;
      state.userSuccess = false;
    },
    editUserSuccess: (state, action: PayloadAction<EditUserRequest['response']>) => {
      state.isloading = false;
      state.userSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = state.users.map(user => (user.id === action.payload.data?.id ? action.payload.data : user));
      }
    },
    editUserFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.userError = action.payload.status_code;
    },

    // ======================================
    // delete request and response reducers
    // ======================================
    deleteUserRequest: (state, _action: PayloadAction<DeleteUserRequest['payload']>) => {
      state.isloading = true;
      state.userError = false;
      state.userSuccess = false;
    },
    deleteUserSuccess: (state, action: PayloadAction<DeleteUserRequest['response']>) => {
      state.isloading = false;
      state.userSuccess = action.payload.status_code;
      state.users = state.users.filter(user => user.id !== action.payload.data?.user_id);
    },
    deleteUserFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.userError = action.payload.status_code;
    },

    // ======================================
    // assign organization
    // ======================================
    assignOrganizationRequest: (state, _action: PayloadAction<AssignOrganizationRequest['payload']>) => {
      state.isloading = true;
      state.userError = false;
      state.userSuccess = false;
    },
    assignOrganizationSuccess: (state, action: PayloadAction<AssignOrganizationRequest['response']>) => {
      state.isloading = false;
      state.userSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.users = state.users.map(user => {
          if (user.id === action.payload.data?.user_id) {
            const newUser = {...user};
            if (action.payload.data?.organization) {
              newUser.organization = action.payload.data.organization;
            }
            return newUser;
          }
          return user;
        });
      }
    },
    assignOrganizationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isloading = false;
      state.userError = action.payload.status_code;
    },

    resetUserMessage: state => {
      state.userError = false;
      state.userSuccess = false;
    },

    cancelUserRequest(state) {
      state.isloading = false;
    },
  },
});

export const {
  // add user
  addUserRequest,
  addUserSuccess,
  addUserFailure,

  // user list
  userListRequest,
  userListSuccess,
  userListFailure,

  // edit user
  editUserRequest,
  editUserSuccess,
  editUserFailure,

  // delete user
  deleteUserRequest,
  deleteUserSuccess,
  deleteUserFailure,

  // assign organization
  assignOrganizationRequest,
  assignOrganizationSuccess,
  assignOrganizationFailure,

  // reset message
  resetUserMessage,
  // cancel request
  cancelUserRequest,
} = userSlice.actions;
export default userSlice.reducer;
