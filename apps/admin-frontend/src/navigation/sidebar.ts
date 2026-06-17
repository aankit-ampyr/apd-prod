import {Routes, type RouteValues} from './Routes';
import type {SideNavOptionType} from '@/interface';

/**
 * Side bar Options for Super Admin role, currently
 */
export const SuperAdminSideNavOptions: SideNavOptionType<RouteValues>[] = [
  {icon: 'user2', label: 'User Management', route: Routes.USER_MANAGEMENT},
];

/**
 * Side bar Option for system options.
 */
export const SystemSideBarOption: SideNavOptionType<RouteValues>[] = [
  {icon: 'clock', label: 'Audit Log', route: Routes.AUDIT_LOG},
  {icon: 'gear', label: 'Settings', route: Routes.SETTINGS},
];
