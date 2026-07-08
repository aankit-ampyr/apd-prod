import {matchesRoute} from '@/utils';

export const Routes = {
  INDEX: '/',
  USER_MANAGEMENT: '/user-management',
  ORGANIZATIONS: '/organizations',
  ASSET_MANAGEMENT: '/asset-management',
  DIGEST_MANAGEMENT: '/digest-management',
  AUDIT_LOG: '/audit-log',
  HELP: '/help',
  SETTINGS: '/settings',
  LOGIN: '/login',
  OTP_VERIFICATION: '/verify-otp',
} as const;

export const DashboardRouteHeaderTitles = {
  [Routes.USER_MANAGEMENT]: 'Users',
  [Routes.ORGANIZATIONS]: 'Organizations',
  [Routes.ASSET_MANAGEMENT]: 'Asset Management',
  [Routes.DIGEST_MANAGEMENT]: 'Digest Management',
  [Routes.AUDIT_LOG]: 'Audit Log',
  [Routes.HELP]: 'Help',
  [Routes.SETTINGS]: 'Settings',
} as const;

export type RouteKeys = keyof typeof Routes;
export type RouteValues = typeof Routes[RouteKeys];
export const LinkedRoutes: Record<string, string> = {};

export function getNormalizedRoute(route: string): string | null {
  for (let key in Routes) {
    if (matchesRoute(route, Routes[key as keyof typeof Routes])) {
      return Routes[key as keyof typeof Routes];
    }
  }
  return null;
}
