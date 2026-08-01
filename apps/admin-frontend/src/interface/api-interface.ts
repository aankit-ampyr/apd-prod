import type {AuditLogModules, AuditLogScenario, UserRole} from '@/constants';
import type {ENV, User} from './common-interface';
import type {SortType, APIResponse, AuditLog} from '@lazarus/react-common/interface';
export type {
  APIResponse,
  LoginRequest,
  VerifyOtpRequest,
  LogoutRequest,
} from '@lazarus/react-common/interface/api-interface';

export interface ApiConfigInterface {
  currentEnv: string | undefined;
  baseUrls: Record<ENV, string>;
  webAppUrls: Record<ENV, string>;
  noAuthUrls: {
    demo: string;
    login: string;
    verifyOtp: string;
  };
  authUrls: {
    logout: string;
    refresh: string;
    users: string;
    user_id: (id: number) => string;
    user_organization: (id: number) => string;

    organization: string;
    organization_id: (id: number) => string;

    audit_logs: string;

    // websocket
    ws_token: string;
    ws: string;
  };
}

// =============================== User Slice ===============================
export interface AddUserRequest {
  payload: {
    name: User['name'];
    email: User['email'];
    role: User['role'];
    platform: User['platform'];
    status: User['status'];
  };
  response: APIResponse<User>;
}

// =============================== Websocket ===============================
export interface GetWsTokenRequest {
  response: APIResponse<{
    user_id: number;
    ephemeral_token: string;
  }>;
}

export interface UserListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    platform?: number[];
    sort?: NonNullable<SortType>;
    organization?: number;
    status?: boolean;
    start_date?: string;
    end_date?: string;
  };
  response: APIResponse<{
    users: User[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_results: number;
  }>;
}

export interface EditUserRequest {
  payload: {
    id: User['id'];
    name?: User['name'];
    email?: User['email'];
    role?: User['role'];
    platform?: User['platform'];
    status?: User['status'];
  };
  response: APIResponse<User>;
}

export interface DeleteUserRequest {
  payload: {
    id: number;
  };
  response: APIResponse<{user_id: number}>;
}

export interface AssignOrganizationRequest {
  payload: {
    id: number;
    organization_id: number;
  };
  response: APIResponse<{
    user_id: number;
    organization: {
      id: number;
      name: string;
    };
  }>;
}

// =============================== Audit Log Slice ===============================
export interface AuditLogListRequest {
  params: {
    page?: number;
    limit?: number;
    user_id?: string;
    log_id?: string;
    role?: UserRole;
    module?: AuditLogModules;
    action?: AuditLogScenario;
    start_date?: string;
    end_date?: string;
    search?: string;
  };
  response: APIResponse<{
    logs: AuditLog[];
    total_pages: number;
    current_page: number;
    next_page: number | null;
    total_results: number;
  }>;
}
