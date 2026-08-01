import {call, put, takeLatest, takeEvery} from 'redux-saga/effects';
import {SUCCESS_KEY} from '@/constants';
import {
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
  getAssetDetailsFailure,
} from '../slice';
import {fetchComments, createComment, deleteComment, updateComment, replyComment, readComment, checkCommentStatus} from '@/services/api';

function* handleFetchComments(action: ReturnType<typeof fetchCommentsRequest>): Generator {
  try {
    const response: any = yield call(fetchComments, action.payload);
    if (response.data?.status === SUCCESS_KEY) {
      yield put(fetchCommentsSuccess(response.data));
    } else if (response.status === 403 || response.data?.status_code === 'E-10013') {
      // Asset/org access was revoked. We Re-use the same E-ACCESS-DENIED signal
      // that all analysis screens already watch to show the no-access modal.
      yield put(getAssetDetailsFailure({status_code: 'E-ACCESS-DENIED', status: 'error', message: 'Access denied'}));
    } else {
      yield put(fetchCommentsFailure(response.data));
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      yield put(getAssetDetailsFailure({status_code: 'E-ACCESS-DENIED', status: 'error', message: 'Access denied'}));
    } else {
      yield put(fetchCommentsFailure(error.response?.data || {status_code: 500, message: 'Failed to fetch comments'}));
    }
  }
}

function* handleCreateComment(action: ReturnType<typeof createCommentRequest>): Generator {
  try {
    const response: any = yield call(createComment, action.payload as any);
    if (response.data?.status === SUCCESS_KEY) {
      yield put(createCommentSuccess(response.data));
    } else {
      yield put(createCommentFailure(response.data));
    }
  } catch (error: any) {
    yield put(createCommentFailure(error.response?.data || {status_code: 500, message: 'Failed to create comment'}));
  }
}

function* handleDeleteComment(action: ReturnType<typeof deleteCommentRequest>): Generator {
  try {
    const response: any = yield call(deleteComment, action.payload);
    if (response.data?.status === SUCCESS_KEY) {
      yield put(deleteCommentSuccess(response.data));
      yield put(fetchCommentsRequest({assetId: action.payload.assetId}));
    } else {
      yield put(deleteCommentFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteCommentFailure(error.response?.data || {status_code: 500, message: 'Failed to delete comment'}));
  }
}

function* handleUpdateComment(action: ReturnType<typeof updateCommentRequest>): Generator {
  try {
    const response: any = yield call(updateComment, action.payload as any);
    const data = response.data || response; // Handle both mocked wrapper and direct object
    if (data?.status === SUCCESS_KEY) {
      yield put(updateCommentSuccess(data));
      yield put(fetchCommentsRequest({assetId: action.payload.params.assetId}));
    } else {
      yield put(updateCommentFailure(data));
    }
  } catch (error: any) {
    yield put(updateCommentFailure(error.response?.data || {status_code: 500, message: 'Failed to update comment'}));
  }
}

function* handleReplyComment(action: ReturnType<typeof replyCommentRequest>): Generator {
  try {
    const response: any = yield call(replyComment, action.payload as any);
    const data = response.data || response;
    if (data?.status === SUCCESS_KEY) {
      yield put(replyCommentSuccess(data));
      yield put(fetchCommentsRequest({assetId: action.payload.params.assetId}));
    } else {
      yield put(replyCommentFailure(data));
    }
  } catch (error: any) {
    yield put(replyCommentFailure(error.response?.data || {status_code: 500, message: 'Failed to reply to comment'}));
  }
}

function* handleReadComment(action: ReturnType<typeof readCommentRequest>): Generator {
  try {
    const response: any = yield call(readComment, {params: action.payload} as any);
    const data = response.data || response;
    if (data?.status === SUCCESS_KEY) {
      yield put(readCommentSuccess(data));
    } else {
      yield put(readCommentFailure(data));
    }
  } catch (error: any) {
    yield put(
      readCommentFailure(error.response?.data || {status_code: 500, message: 'Failed to mark comment as read'}),
    );
  }
}

function* handleCheckCommentStatus(action: ReturnType<typeof checkCommentStatusRequest>): Generator {
  try {
    const response: any = yield call(checkCommentStatus, {params: action.payload} as any);
    const data = response.data || response;
    if (data?.status === SUCCESS_KEY) {
      yield put(checkCommentStatusSuccess(data));
    } else {
      yield put(checkCommentStatusFailure(data));
    }
  } catch (error: any) {
    yield put(checkCommentStatusFailure(error.response?.data || {status_code: 500, message: 'Failed to check comment status'}));
  }
}

export default function* commentSaga() {
  yield takeLatest(fetchCommentsRequest.type, handleFetchComments);
  yield takeLatest(createCommentRequest.type, handleCreateComment);
  yield takeLatest(deleteCommentRequest.type, handleDeleteComment);
  yield takeLatest(updateCommentRequest.type, handleUpdateComment);
  yield takeLatest(replyCommentRequest.type, handleReplyComment);
  yield takeEvery(readCommentRequest.type, handleReadComment);
  yield takeEvery(checkCommentStatusRequest.type, handleCheckCommentStatus);
}
