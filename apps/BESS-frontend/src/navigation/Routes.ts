import {matchesRoute} from '@/utils/common-functions';

export const Routes = {
  INDEX: '/',
  HOME: '/home',
  USER_MANAGEMENT: '/user-management',
  PROJECT_MANAGEMENT: '/project-management',
  SIMULATION_WIZARD: '/simulation-wizard',
  AUDIT_LOG: '/audit-log',
  HELP: '/help',
  SETTINGS: '/settings',
  LOGIN: '/login',
  OTP_VERIFICATION: '/verify-otp',
} as const;

export const DashboardRouteHeaderTitles = {
  [Routes.HOME]: 'Home',
  [Routes.USER_MANAGEMENT]: 'User Management',
  [Routes.PROJECT_MANAGEMENT]: 'Project Management',
  [Routes.SIMULATION_WIZARD]: 'Simulation Wizard',
  [Routes.AUDIT_LOG]: 'Audit Log',
  [Routes.HELP]: 'Help',
  [Routes.SETTINGS]: 'Settings',
} as const;

export type RouteKeys = keyof typeof Routes;
export type RouteValues = (typeof Routes)[RouteKeys];
export const LinkedRoutes: Record<string, string> = {};

export function getNormalizedRoute(route: string): string | null {
  for (let key in Routes) {
    if (matchesRoute(route, Routes[key as keyof typeof Routes])) {
      return Routes[key as keyof typeof Routes];
    }
  }
  return null;
}
