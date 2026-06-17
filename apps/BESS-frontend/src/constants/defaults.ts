import type { SelectInputItem } from "@/interface";
import { Platform, UserRole } from "./enums";

/**
 * isolated constants
 */
export const resetOtpTimer = 45;
export const NA = 'N/A';
export const autoLogoutErrorCodes: any = [
  'E-20002',
  'E-20003',
  'E-20037',
];



/**
 * Reusabled Dropdown values
 */
export const USER_ROLES: SelectInputItem[] = [
  { id: UserRole.Analyst, label: 'Analyst' },
  { id: UserRole.Admin, label: 'Admin' },
  { id: UserRole.Management, label: 'Management' },
  { id: UserRole.Viewer, label: 'Viewer' },
];

export const STATUS_OPTIONS: SelectInputItem[] = [
  { id: 1, label: 'Active' },
  { id: 2, label: 'Inactive' },
];

export const SIMULATION_STATUS: SelectInputItem[] = [
  { id: 1, label: 'Completed' },
  { id: 2, label: 'Failed' },
  { id: 3, label: 'In Progress' },
]