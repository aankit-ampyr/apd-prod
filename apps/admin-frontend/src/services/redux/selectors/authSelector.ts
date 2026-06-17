import {type RootState} from '../rootReducer';

export const authStatus = (state: RootState) => state.auth.isAuthenticated;
export const authSuccessStatus = (state: RootState) => state.auth.authSuccess;
export const authFailureStatus = (state: RootState) => state.auth.authFailure;
export const authDataSelector = (state: RootState) => state.auth.authData;
export const isAuthLoading = (state: RootState) => state.auth.isLoading;
export const authSessionEndReasonSelector = (state: RootState) => state.auth.sessionEndReason;

// Session selectors
export const authSessionSelector = (state: RootState) => state.auth.session;
export const authSessionEmailSelector = (state: RootState) => state.auth.session.email;
export const authSessionOtpAttemptsSelector = (state: RootState) => state.auth.session.otp_attempts;
export const authSessionOtpTimerSelector = (state: RootState) => state.auth?.session?.otp_timer || '';
export const authSessionOtpRecievedAtSelector = (state: RootState) => state.auth?.session?.otp_recieved_at || '';
export const authSessionOtpLimitExceeded = (state: RootState) => state.auth?.session?.limit_reached || false;
