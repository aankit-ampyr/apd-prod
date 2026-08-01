/**
 * this file contains the redux slice for the auth state
 */

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {APIResponse, AuthSliceInitalState, LoginRequest, LogoutRequest, VerifyOtpRequest} from '@/interface';
import { UserSessionEndReason } from '@/constants';

const initialState: AuthSliceInitalState = {
  isLoading: false,
  isAuthenticated: false,
  authData: null,
  authSuccess: false,
  authFailure: false,

  session: {
    email: '',
    otp_attempts: null,
    otp_timer: null,
    otp_recieved_at: null,
    limit_reached: false,
  },

  sessionEndReason: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginOtpRequest(state, action: PayloadAction<LoginRequest['payload']>) {
      state.isLoading = true;
      state.authSuccess = false;
      state.authFailure = false;
      // Store the email in session for later use (verify OTP, resend OTP)
      if (!state.session) {
        state.session = {
          email: action.payload.email,
          otp_attempts: null,
          otp_timer: null,
          otp_recieved_at: null,
        };
      } else {
        state.session.email = action.payload.email;
      }
    },
    loginOtpSuccess(state, action: PayloadAction<LoginRequest['response']>) {
      state.isLoading = false;
      state.authSuccess = action.payload.status_code;      
      // Update remaining attempts if returned in response
      const remainingAttempts = action.payload.data?.otp_attempts;
      if (typeof remainingAttempts === 'number' && !state.session.limit_reached) {
        state.session.otp_timer = new Date().toISOString();
        state.session.otp_recieved_at = new Date().toISOString();
        state.session.otp_attempts = remainingAttempts;
      }
      
    },
    loginOtpFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.authFailure = action.payload.status_code;
      if (action.payload.status_code === 'E-10044') {
        state.session.limit_reached = true;
        state.session.otp_attempts = 0;
      }
    },

    // verify otp
    verifyOtpRequest(state, _action: PayloadAction<VerifyOtpRequest['payload']>) {
      state.isLoading = true;
      state.authSuccess = false;
      state.authFailure = false;
    },
    verifyOtpSuccess(state, action: PayloadAction<VerifyOtpRequest['response']>) {
      state.isLoading = false;
      state.authSuccess = action.payload.status_code;
      state.isAuthenticated = true;
      // Store auth data from response
      if (action.payload.data) {
        state.authData = {
          id: action.payload.data.id,
          name: action.payload.data.username,
          email: action.payload.data.email,
          phone: '',
          role: action.payload.data.role,
          platform: action.payload.data.platform,
        };
      }
      // Clear session data after successful verification
      state.session.email = null;
      state.session.otp_attempts = null;
      state.session.otp_timer = null;
      state.session.otp_recieved_at = null;
    },
    verifyOtpFailure(state, action: PayloadAction<VerifyOtpRequest['error_response']>) {
      state.isLoading = false;
      state.authFailure = action.payload.status_code;
      if (action.payload.status_code === 'E-10044') {
        state.session.limit_reached = true;
        state.session.otp_attempts = 0;
      } else {
        // Update remaining attempts if returned in response
        const remainingAttempts = action.payload.data?.otp_attempts;
        if (typeof remainingAttempts === 'number' && !state.session.limit_reached) {
          state.session.otp_attempts = remainingAttempts;
        }
      }
    },

    // logout otp
    logoutRequest(state) {
      state.isLoading = true;
      state.authSuccess = false;
      state.authFailure = false;
    },
    logoutSuccess(state, action: PayloadAction<LogoutRequest['response']>) {
      state.isLoading = false;
      // if logout successfully
      if (action.payload.status_code === 'S-10092') {
        return { ...initialState };
      }
    },
    logoutFailure(state, action: PayloadAction<APIResponse>) {
      state.isLoading = false;
      state.authFailure = action.payload.status_code;
    },

    // reset auth
    resetAuth(_state, _action: PayloadAction<void>) {
      return { ...initialState };
    },

    resetAuthWithReason(_state, action: PayloadAction<{reason: UserSessionEndReason; errorCode?: string}>) {
      return {
        ...initialState,
        sessionEndReason: action.payload.reason,
      };
    },

    resetAuthMessage(state) {
      state.authSuccess = false;
      state.authFailure = false;
    },

    resetAuthSession(state) {
      state.session.email = null;
      state.session.otp_attempts = null;
      state.session.otp_timer = null;
      state.session.otp_recieved_at = null;
      state.session.limit_reached = false;
    },

    // cancel auth request
    cancelAuthRequest(state) {
      state.isLoading = false;
      state.sessionEndReason = null;
    },
  },
});

export const {
  // login otp actions
  loginOtpRequest,
  loginOtpSuccess,
  loginOtpFailure,

  // verify otp actions
  verifyOtpRequest,
  verifyOtpSuccess,
  verifyOtpFailure,

  // logout actions
  logoutRequest,
  logoutSuccess,
  logoutFailure,

  // utility actions
  resetAuthMessage,
  resetAuth,
  resetAuthSession,
  cancelAuthRequest,
  resetAuthWithReason,
} = authSlice.actions;
export default authSlice.reducer;
