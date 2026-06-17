import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type UserSliceInitialState } from '@/interface';
import type {
  UserListRequest,
  APIResponse,
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
  allUsers: []

};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {


    // ======================================
    // get user list
    // ======================================
    userListRequest: (state, action: PayloadAction<UserListRequest['params']>) => {
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
      if (['E-10015', 'E-10014', 'E-20005', 'E-20006'].includes(action.payload.status_code)) {
        state.users = [];
        state.totalPages = 0;
        state.currentPage = 0;
        state.nextPage = null;
        state.totalResults = 0;
      }
    },

    resetUserMessage: state => {
      state.userError = false;
      state.userSuccess = false;
    },

    cancelUserRequest(state) {
      state.isloading = false;
    },
    getAllUsersListRequest: (state) => {
      state.isloading = true;
    },
    getAllUsersListSuccess: (state, action: PayloadAction<UserListRequest['response']>) => {
      state.isloading = false;
      if (action.payload.data) {
        state.allUsers = action.payload.data.users;
      }
    },
    getAllUsersFailure: (state, _action: PayloadAction<APIResponse>) => {
      state.isloading = false;
    },
  },
});

export const {

  // user list
  userListRequest,
  userListSuccess,
  userListFailure,

  // reset message
  resetUserMessage,
  // cancel request
  cancelUserRequest,
  getAllUsersListRequest,
  getAllUsersListSuccess,
  getAllUsersFailure,
} = userSlice.actions;
export default userSlice.reducer;
