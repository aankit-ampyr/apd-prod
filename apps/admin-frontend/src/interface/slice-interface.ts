import { AuditLog } from '@lazarus/react-common/interface';
import type { Auth, User} from './common-interface';

export interface UserSliceInitialState {
  isloading: boolean;
  userError: string | boolean;
  userSuccess: string | boolean;
  
  users: User[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;
}

export interface AuditLogSliceInitialState {
  isLoading: boolean;
  auditLogError: string | boolean;
  auditLogSuccess: string | boolean;

  auditLogs: AuditLog[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;
}