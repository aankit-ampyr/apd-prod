import { UserSessionEndReason } from "../constants";
import { Auth } from "./common-interface";

export interface AuthSliceInitalState {
  isLoading: boolean;
  authSuccess: boolean | string;
  authFailure: boolean | string;
  isAuthenticated: boolean;
  authData: Auth | null;

  session: {
    email: string | null;
    otp_attempts: number | null;
    otp_timer: string | null;
    otp_recieved_at: string | null;
    limit_reached?: boolean;
  }

  sessionEndReason: UserSessionEndReason | null;
}