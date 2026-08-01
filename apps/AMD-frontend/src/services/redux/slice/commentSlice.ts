import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
  Comment,
  CreateCommentPayload,
  APIResponse,
  FetchCommentsRequest,
  CreateCommentApiRequest,
  UpdateCommentApiRequest,
  DeleteCommentApiRequest,
  ReplyCommentApiRequest,
  ReadCommentApiRequest,
  CheckCommentStatusApiRequest,
} from '@/interface';

export interface CommentSliceState {
  comments: Comment[];
  isLoading: boolean;
  commentSuccess: string | false;
  commentError: string | false;
  isPanelOpen: boolean;
  activeContext: Partial<CreateCommentPayload> | null;
  searchQuery: string;
  filterUserId: string | null;
  isUnreadFilterActive: boolean;
  commentStatusResult: CheckCommentStatusApiRequest['response']['data'] | null;
}

const initialState: CommentSliceState = {
  comments: [],
  isLoading: false,
  commentSuccess: false,
  commentError: false,
  isPanelOpen: false,
  activeContext: null,
  searchQuery: '',
  filterUserId: null,
  isUnreadFilterActive: false,
  commentStatusResult: null,
};

const commentSlice = createSlice({
  name: 'comment',
  initialState,
  reducers: {
    // UI State actions
    setPanelOpen(state, action: PayloadAction<boolean>) {
      state.isPanelOpen = action.payload;
      if (!action.payload) {
        state.commentStatusResult = null;
      }
    },
    setActiveContext(state, action: PayloadAction<Partial<CreateCommentPayload> | null>) {
      state.activeContext = action.payload;
      state.commentStatusResult = null;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFilterUserId(state, action: PayloadAction<string | null>) {
      state.filterUserId = action.payload;
    },
    setUnreadFilterActive(state, action: PayloadAction<boolean>) {
      state.isUnreadFilterActive = action.payload;
    },
    markAllAsReadLocally(state) {
      state.comments = state.comments.map(c => ({
        ...c,
        is_read: true,
        replies: c.replies ? c.replies.map((r: any) => ({...r, is_read: true})) : [],
      }));
    },

    // Async API Action triggers
    fetchCommentsRequest(state, _action: PayloadAction<FetchCommentsRequest['params']>) {
      state.isLoading = true;
      state.commentError = false;
      state.commentSuccess = false;
    },
    fetchCommentsSuccess(state, action: PayloadAction<FetchCommentsRequest['response']>) {
      state.isLoading = false;
      state.commentSuccess = action.payload.status_code;
      state.comments = action.payload.data?.comments ?? [];
    },
    fetchCommentsFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.commentError = action.payload.status_code;
    },

    createCommentRequest(state, _action: PayloadAction<Omit<CreateCommentApiRequest, 'response'>>) {
      state.isLoading = true;
      state.commentError = false;
      state.commentSuccess = false;
    },
    createCommentSuccess(state, action: PayloadAction<CreateCommentApiRequest['response']>) {
      state.isLoading = false;
      state.commentSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.comments.unshift(action.payload.data); // prepend latest
      }
    },
    createCommentFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.commentError = action.payload.status_code;
    },

    deleteCommentRequest(state, _action: PayloadAction<DeleteCommentApiRequest['payload']>) {
      state.isLoading = true;
      state.commentError = false;
      state.commentSuccess = false;
    },
    deleteCommentSuccess(state, action: PayloadAction<DeleteCommentApiRequest['response']>) {
      state.isLoading = false;
      state.commentSuccess = action.payload.status_code;
      // Refresh handled in Saga
    },
    deleteCommentFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.commentError = action.payload.status_code;
    },

    updateCommentRequest(state, _action: PayloadAction<Omit<UpdateCommentApiRequest, 'response'>>) {
      state.isLoading = true;
      state.commentError = false;
      state.commentSuccess = false;
    },
    updateCommentSuccess(state, action: PayloadAction<UpdateCommentApiRequest['response']>) {
      state.isLoading = false;
      state.commentSuccess = action.payload.status_code;
      // Refresh handled in Saga
    },
    updateCommentFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.commentError = action.payload.status_code;
    },

    replyCommentRequest(state, _action: PayloadAction<Omit<ReplyCommentApiRequest, 'response'>>) {
      state.isLoading = true;
      state.commentError = false;
      state.commentSuccess = false;
    },
    replyCommentSuccess(state, action: PayloadAction<ReplyCommentApiRequest['response']>) {
      state.isLoading = false;
      state.commentSuccess = action.payload.status_code;
      // Refresh handled in Saga
    },
    replyCommentFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.commentError = action.payload.status_code;
    },

    readCommentRequest(_state, _action: PayloadAction<ReadCommentApiRequest['params']>) {},
    readCommentSuccess(state, action: PayloadAction<ReadCommentApiRequest['response']>) {
      // Find comment and mark as read locally
      if (action.payload.data) {
        const {comment_id} = action.payload.data;
        // Search in main comments
        const comment = state.comments.find(c => c.id === comment_id);
        if (comment) {
          comment.is_read = true;
        } else {
          // Search in replies
          state.comments.forEach(c => {
            if (c.replies) {
              const reply = c.replies.find((r: any) => r.id === comment_id);
              if (reply) {
                reply.is_read = true;
              }
            }
          });
        }
      }
    },
    readCommentFailure(_state, _action: PayloadAction<APIResponse>) {
      // Silently fail or handle error
    },

    checkCommentStatusRequest(state, _action: PayloadAction<CheckCommentStatusApiRequest['params']>) {
      state.commentStatusResult = null;
    },
    checkCommentStatusSuccess(state, action: PayloadAction<CheckCommentStatusApiRequest['response']>) {
      state.commentStatusResult = action.payload.data ?? null;
    },
    checkCommentStatusFailure(state, _action: PayloadAction<APIResponse>) {
      state.commentStatusResult = null;
    },
  },
});

export const {
  setPanelOpen,
  setActiveContext,
  setSearchQuery,
  setFilterUserId,
  setUnreadFilterActive,
  markAllAsReadLocally,
  fetchCommentsRequest,
  fetchCommentsSuccess,
  fetchCommentsFailure,
  createCommentRequest,
  createCommentSuccess,
  createCommentFailure,
  deleteCommentRequest,
  deleteCommentSuccess,
  deleteCommentFailure,
  updateCommentRequest,
  updateCommentSuccess,
  updateCommentFailure,
  replyCommentRequest,
  replyCommentSuccess,
  replyCommentFailure,
  readCommentRequest,
  readCommentSuccess,
  readCommentFailure,
  checkCommentStatusRequest,
  checkCommentStatusSuccess,
  checkCommentStatusFailure,
} = commentSlice.actions;

export default commentSlice.reducer;
