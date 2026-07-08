import { Platform, UserRole } from "../constants";

export interface APIResponse<T = unknown> {
  status: string;
  status_code: string;
  message?: string;
  cancelled?: boolean;
  data?: T;
}

export interface StreamingAPIResponse<T = unknown> {
  status: string;
  data?: T;
}

// =============================== Auth Slice ===============================
export interface LoginRequest {
  payload: {
    email: string;
  };
  response: APIResponse<{
    otp_attempts: number,
  }>;
}

export interface VerifyOtpRequest {
  payload: {
    email: string;
    otp: string;
  };
  response: APIResponse<{
    id: number;
    role: UserRole;
    email: string;
    username: string;
    platform: Platform[];
    access_token: string;
    refresh_token: string;
    expiry_for_access_token: number;
  }>
  error_response: APIResponse<{
    otp_attempts: number,
  }>;
}

export interface LogoutRequest {
  response: APIResponse;
}