import {combineReducers} from '@reduxjs/toolkit';
import authReducer, {logoutSuccess, resetAuthWithReason} from './slice/authSlice';
import userReducer from './slice/userSlice';
import projectReducer from './slice/projectsSlice';
import simulationWizardReducer from './slice/simulationWizardSlice';
import auditLogReducer from './slice/auditLogSlice';


const appReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  project: projectReducer,
  simulationWizard: simulationWizardReducer,
  auditLog: auditLogReducer,
});

/**
 * Root Reducer: Clears Redux state and localStorage on logout
 * Preserves pre-signup files (email-tagged for security) for user convenience
 */
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: any) => {
  if (action.type === logoutSuccess.type || action.type === resetAuthWithReason.type) {
    const sessionEndReason = action.payload?.reason || null;
    state = undefined;

    localStorage.clear();

    // If there is a reason, we need to return the initial state of the app with the reason
    if (sessionEndReason) {
      const initialState = appReducer(undefined, { type: '@@INIT' });
      return {
        ...initialState,
        auth: {
          ...initialState.auth,
          sessionEndReason: sessionEndReason
        }
      };
    }
  }
  return appReducer(state, action);
};

export default rootReducer;
export type RootState = ReturnType<typeof rootReducer>;