import { AuditLog } from '@lazarus/react-common/interface';
import { Project, type Auth, type User} from './common-interface';

export interface UserSliceInitialState {
  isloading: boolean;
  userError: string | boolean;
  userSuccess: string | boolean;
  
  users: User[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;

  allUsers: User[];
}

export interface ProjectSliceInitialState {
  isloading: boolean;
  projectError: string | boolean;
  projectSuccess: string | boolean;
  
  projects: Project[];
  totalPages: number;
  nextPage: number | null;
  currentPage: number;
  totalResults: number;

  // Reassign project owner
  reassignLoading: boolean;
  reassignError: string | boolean;
  reassignSuccess: string | boolean;

  allProjects: Project[];
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