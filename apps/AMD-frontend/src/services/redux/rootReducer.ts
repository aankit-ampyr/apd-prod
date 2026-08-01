import {combineReducers} from '@reduxjs/toolkit';
import authReducer, {logoutSuccess, resetAuthWithReason} from './slice/authSlice';
import userReducer from './slice/userSlice';
import organizationReducer from './slice/organizationSlice';
import assetReducer from './slice/assetSlice';
import digestReducer from './slice/digestSlice';
import settingsReducer from './slice/settingsSlice';
import auditLogReducer from './slice/auditLogSlice';
import invoiceReducer from './slice/invoiceSlice';
import commentReducer from './slice/commentSlice';
import notificationReducer from './slice/notificationSlice';
import analyticsFilterReducer from './slice/analyticsFilterSlice';

const appReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  organization: organizationReducer,
  asset: assetReducer,
  digest: digestReducer,
  settings: settingsReducer,
  auditLog: auditLogReducer,
  invoice: invoiceReducer,
  comment: commentReducer,
  notification: notificationReducer,
  analyticsFilter: analyticsFilterReducer,
});

/**
 * Root Reducer: Clears Redux state and localStorage on logout
 * Preserves pre-signup files (email-tagged for security) for user convenience
 */
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: any) => {
  if (action.type === logoutSuccess.type || action.type === resetAuthWithReason.type) {
    const sessionEndReason = action.payload?.reason || null;
    const errorCode = action.payload?.errorCode || null;
    state = undefined;

    localStorage.clear();

    // If there is a reason, we need to return the initial state of the app with the reason
    if (sessionEndReason) {
      const initialState = appReducer(undefined, {type: '@@INIT'});
      return {
        ...initialState,
        auth: {
          ...initialState.auth,
          sessionEndReason,
          ...(errorCode && { authFailure: errorCode }),
        },
      };
    }
  }

  return appReducer(state, action);
};

export default rootReducer;
export type RootState = ReturnType<typeof rootReducer>;
