import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type AuditLogSliceInitialState} from '@/interface';
import type {AuditLogListRequest, APIResponse} from '@/interface/api-interface';

const initialState: AuditLogSliceInitialState = {
  isLoading: false,
  auditLogError: false,
  auditLogSuccess: false,
  auditLogs: [],
  totalPages: 0,
  nextPage: null,
  currentPage: 0,
  totalResults: 0,
};

const auditLogSlice = createSlice({
  name: 'auditLog',
  initialState,
  reducers: {
    // ======================================
    // get audit log list
    // ======================================
    auditLogListRequest: (state, _action: PayloadAction<AuditLogListRequest['params']>) => {
      state.isLoading = true;
      state.auditLogError = false;
      state.auditLogSuccess = false;
    },
    auditLogListSuccess: (state, action: PayloadAction<AuditLogListRequest['response']>) => {
      state.isLoading = false;
      state.auditLogSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.auditLogs = action.payload.data.logs;
        state.totalPages = action.payload.data.total_pages;
        state.currentPage = action.payload.data.current_page;
        state.nextPage = action.payload.data.next_page;
        state.totalResults = action.payload.data.total_results;
      }
    },
    auditLogListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.auditLogError = action.payload.status_code;
      if (['E-10030', 'E-10032', 'E-10014'].includes(action.payload.status_code)) {
        state.auditLogs = [];
        state.totalPages = 0;
        state.currentPage = 0;
        state.nextPage = null;
        state.totalResults = 0;
      }
    },

    resetAuditLogMessage: state => {
      state.auditLogError = false;
      state.auditLogSuccess = false;
    },

    cancelAuditLogRequest(state) {
      state.isLoading = false;
    }
  },
});

export const {
  // audit log list
  auditLogListRequest,
  auditLogListSuccess,
  auditLogListFailure,

  // reset message
  resetAuditLogMessage,
  // cancel request
  cancelAuditLogRequest,
} = auditLogSlice.actions;
export default auditLogSlice.reducer;
