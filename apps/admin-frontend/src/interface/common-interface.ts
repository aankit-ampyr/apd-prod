import type {AuditLogModules, AuditLogScenario, Platform, UserRole} from '@/constants';
export {Auth} from '@lazarus/react-common/interface';
export type ENV = 'loc' | 'dev' | 'qa' | 'uat' | 'prod';
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// =============================== Entities ===============================

export interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: {id: number; name: string};
  status: boolean;
  last_activity: string;
  platform?: Platform[];
}

