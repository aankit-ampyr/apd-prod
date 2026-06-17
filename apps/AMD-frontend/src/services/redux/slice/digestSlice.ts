import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {APIResponse, AddDigestRequest, DigestListRequest, DigestSliceInitialState, EditDigestRequest} from '@/interface';

const initialState: DigestSliceInitialState = {
  isLoading: false,
  digestError: false,
  digestSuccess: false,
  digests: [],
  totalPages: 0,
  nextPage: null,
  currentPage: 0,
  totalResults: 0,
};

export const digestSlice = createSlice({
  name: 'digest',
  initialState,
  reducers: {
    // ======================================
    // digest list
    // ======================================
    digestListRequest: (state, _action: PayloadAction<DigestListRequest['params']>) => {
      // reset messages; loading is handled via head/end reducers
      state.digestError = false;
      state.digestSuccess = false;
    },
    headDigest: state => {
      state.isLoading = true;
      state.digestError = false;
      state.digestSuccess = false;
    },
    endHeadDigest: state => {
      state.isLoading = false;
    },
    digestListSuccess: (state, action: PayloadAction<DigestListRequest['response']>) => {
      state.isLoading = false;
      state.digestSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.digests = action.payload.data.digests;
        state.totalPages = action.payload.data.total_pages;
        state.currentPage = action.payload.data.current_page;
        state.nextPage = action.payload.data.next_page;
        state.totalResults = action.payload.data.total_results;
      }
    },
    digestListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.digestError = action.payload.status_code;
      if (['E-10014', 'E-10015'].includes(action.payload.status_code)) {
        state.digests = [];
        state.totalPages = 0;
        state.currentPage = 0;
        state.nextPage = null;
        state.totalResults = 0;
      }
    },

    // ======================================
    // add digest
    // ======================================
    addDigestRequest: (state, _action: PayloadAction<AddDigestRequest['payload']>) => {
      state.isLoading = true;
      state.digestError = false;
      state.digestSuccess = false;
    },
    addDigestSuccess: (state, action: PayloadAction<AddDigestRequest['response']>) => {
      state.isLoading = false;
      state.digestSuccess = action.payload.status_code;
    },
    addDigestFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.digestError = action.payload.status_code;
    },

    // ======================================
    // edit digest
    // ======================================
    editDigestRequest: (state, _action: PayloadAction<EditDigestRequest['payload']>) => {
      state.isLoading = true;
      state.digestError = false;
      state.digestSuccess = false;
    },
    editDigestSuccess: (state, action: PayloadAction<EditDigestRequest['response']>) => {
      state.isLoading = false;
      state.digestSuccess = action.payload.status_code;
    },
    editDigestFailure: (state, action: PayloadAction<APIResponse>) => {
      state.isLoading = false;
      state.digestError = action.payload.status_code;
    },

    // ======================================
    // reset messages
    // ======================================
    resetDigestMessage: state => {
      state.digestError = false;
      state.digestSuccess = false;
    },

    cancelDigestRequest: (state) => {
      state.isLoading = false;
    }
  },
});

export const {
  digestListRequest,
  headDigest,
  endHeadDigest,
  digestListSuccess,
  digestListFailure,

  addDigestRequest,
  addDigestSuccess,
  addDigestFailure,

  editDigestRequest,
  editDigestSuccess,
  editDigestFailure,

  resetDigestMessage,

  cancelDigestRequest,
} = digestSlice.actions;

export default digestSlice.reducer;

