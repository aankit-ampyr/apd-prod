import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
  NotificationData,
  NotificationMeta,
  APIResponse,
  ListActiveNotificationsRequest,
  MarkNotificationReadRequest,
} from '@/interface';

export interface NotificationSliceState {
  activeNotifications: NotificationData[];
  isLoading: boolean;
  notificationError: string | false;
  notificationSuccess: string | false;
  pendingDeepLink: NotificationMeta | null;
}

const initialState: NotificationSliceState = {
  activeNotifications: [],
  isLoading: false,
  notificationError: false,
  notificationSuccess: false,
  pendingDeepLink: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setPendingDeepLink(state, action: PayloadAction<NotificationMeta | null>) {
      state.pendingDeepLink = action.payload;
    },

    // Async API Action triggers
    fetchActiveNotificationsRequest(state) {
      state.isLoading = true;
      state.notificationError = false;
      state.notificationSuccess = false;
    },
    fetchActiveNotificationsSuccess(state, action: PayloadAction<ListActiveNotificationsRequest['response']>) {
      state.isLoading = false;
      state.notificationSuccess = action.payload.status_code;
      state.activeNotifications = action.payload.data ?? [];
    },
    fetchActiveNotificationsFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.notificationError = action.payload.status_code;
    },

    markNotificationReadRequest(state, _action: PayloadAction<MarkNotificationReadRequest['params']>) {
      state.isLoading = true;
      state.notificationError = false;
      state.notificationSuccess = false;
    },
    markNotificationReadSuccess(state, action: PayloadAction<MarkNotificationReadRequest['response']>) {
      state.isLoading = false;
      state.notificationSuccess = action.payload.status_code;
      
      if (action.payload.data) {
        const {notification_id} = action.payload.data;
        const notif = state.activeNotifications.find(
          n => String(n.notification_id) === String(notification_id) || String(n.id) === String(notification_id),
        );
        if (notif) {
          notif.is_read = true;
        }
      }
    },
    markNotificationReadFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.notificationError = action.payload.status_code;
    },
  },
});

export const {
  setPendingDeepLink,
  fetchActiveNotificationsRequest,
  fetchActiveNotificationsSuccess,
  fetchActiveNotificationsFailure,
  markNotificationReadRequest,
  markNotificationReadSuccess,
  markNotificationReadFailure,
} = notificationSlice.actions;

export default notificationSlice.reducer;
