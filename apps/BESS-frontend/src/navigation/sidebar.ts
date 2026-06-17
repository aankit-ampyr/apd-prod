import {Routes, type RouteValues} from '@/navigation/Routes';
import type {IconTypes} from '@/ui-kits';

export type SideNavOptionType = {
  route: RouteValues;
  icon: IconTypes;
  label: string;
};

/**
 * Side bar Options for AMD Admin role, currently
 */
export const BESSAdminSideNavOptions: SideNavOptionType[] = [
  {icon: 'user2', label: 'Users', route: Routes.USER_MANAGEMENT},
  {icon: 'file-gear', label: 'Project Management', route: Routes.PROJECT_MANAGEMENT},
  {icon: 'big-battery', label: 'Simulation Wizard', route: Routes.SIMULATION_WIZARD},
];



/**
 * Side bar Option for system options.
 */
export const SystemSideBarOption: SideNavOptionType[] = [
  {icon: 'clock', label: 'Audit Log', route: Routes.AUDIT_LOG},
  {icon: 'gear', label: 'Settings', route: Routes.SETTINGS},
];
