import type { SelectInputItem } from "@/interface";
import { UserRole } from "./enums";
export { PLATFORM_LABELS } from "@lazarus/react-common/constants";

/**
 * isolated constants
 */
export const resetOtpTimer = 45;
export const NA = 'N/A';
export const autoLogoutErrorCodes: any = [
  'E-10011', // user not authorized
  'E-10012', // user session expired
  'E-10027', // user not found or deleted
];


/**
 * Reusabled Dropdown values
 */
export const AMD_USER_ROLES: SelectInputItem[] = [
  {id: UserRole.Analyst, label: 'Analyst'},
  {id: UserRole.Admin, label: 'Admin'},
  {id: UserRole.Management, label: 'Management'},
];

// export const BESS_USER_ROLES: SelectInputItem[] = [
//   {id: UserRole.Analyst, label: 'Analyst'},
//   {id: UserRole.Admin, label: 'Admin'},
//   {id: UserRole.Management, label: 'Management'},
//   {id: UserRole.Viewer, label: 'Viewer'},
// ];

export const STATUS_OPTIONS: SelectInputItem[] = [
  {id: 1, label: 'Active'},
  {id: 2, label: 'Inactive'},
];
