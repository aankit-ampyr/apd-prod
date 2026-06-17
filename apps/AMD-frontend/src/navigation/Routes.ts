import {matchesRoute} from '@/utils';
import {UserRole} from '@/constants';
import {IconTypes} from '@/interface';

type SidebarSection = 'CONFIGURATION' | 'SYSTEM';
type RouteSideBarConfigItem<T> = T | ((role: UserRole) => T);

export type RouteConfig = {
  path: string;
  title?: string;
  roles: UserRole[];
  allowBackButton?: boolean;
  isPublic?: boolean;
  sidebar?: {
    icon: RouteSideBarConfigItem<IconTypes>;
    label: RouteSideBarConfigItem<string>;
    section: RouteSideBarConfigItem<SidebarSection>;
  };
};

export type RouteKeys = (
  'INDEX' |
  'HOME' |
  'USER_MANAGEMENT' |
  'ORGANIZATIONS' |
  'ASSET_MANAGEMENT' |
  'DIGEST_MANAGEMENT' |
  'AUDIT_LOG' |
  'HELP' |
  'SETTINGS' |
  'LOGIN' |
  'OTP_VERIFICATION' |
  'ASSET_ONBOARDING' |
  'VIEW_ASSET_ONBOARDING' |
  'VIEW_ASSET' |
  'VIEW_ASSET_ANALYSIS' |
  'VIEW_ASSET_BENCHMARK' |
  'VIEW_ANALYSIS' |
  'VIEW_BENCHMARK'
);

type AppRoutesConfig = Record<RouteKeys, RouteConfig>;

/**
 * =============================================
 * App Routes Configuration
 * =============================================
 */
export const AppRoutes: AppRoutesConfig = {
  INDEX: {
    path: '/',
    roles: [UserRole.Admin, UserRole.Management, UserRole.Analyst],
    isPublic: true,
  },
  HOME: {
    path: '/home',
    title: 'Home',
    roles: [UserRole.Admin, UserRole.Management, UserRole.Analyst],
  },

  USER_MANAGEMENT: {
    path: '/user-management',
    title: 'User Management',
    roles: [UserRole.Admin],
    sidebar: {
      icon: 'user2',
      label: 'Users',
      section: 'CONFIGURATION',
    },
  },

  ORGANIZATIONS: {
    path: '/organizations',
    title: 'Organizations',
    roles: [UserRole.Admin],
    sidebar: {
      icon: 'organization',
      label: 'Organizations',
      section: 'CONFIGURATION',
    },
  },

  ASSET_MANAGEMENT: {
    path: '/asset-management',
    title: 'Asset Management',
    roles: [UserRole.Admin, UserRole.Analyst],
    sidebar: {
      icon: 'windmill',
      label: 'Asset Management',
      section: 'CONFIGURATION',
    },
  },
  DIGEST_MANAGEMENT: {
    path: '/digest-management',
    title: 'Digest Management',
    roles: [UserRole.Admin],
    sidebar: {
      icon: 'book',
      label: 'Digest Management',
      section: 'CONFIGURATION',
    },
  },
  AUDIT_LOG: {
    path: '/audit-log',
    title: 'Audit Log',
    roles: [UserRole.Admin],
    sidebar: {
      icon: 'clock',
      label: 'Audit Log',
      section: 'SYSTEM',
    },
  },
  HELP: {
    path: '/help',
    title: 'Help',
    roles: [UserRole.Admin],
  },
  SETTINGS: {
    path: '/settings',
    title: 'Settings',
    roles: [UserRole.Admin, UserRole.Analyst],
    sidebar: {
      icon: 'gear',
      label: 'Settings',
      section: 'SYSTEM',
    },
  },
  LOGIN: {
    path: '/login',
    title: 'Login',
    roles: [UserRole.Admin, UserRole.Management, UserRole.Analyst],
    isPublic: true,
  },
  OTP_VERIFICATION: {
    path: '/verify-otp',
    roles: [UserRole.Admin, UserRole.Management, UserRole.Analyst],
    isPublic: true,
  },
  ASSET_ONBOARDING: {
    path: '/asset-management/onboarding',
    title: 'Add Asset',
    roles: [UserRole.Admin],
    allowBackButton: true,
  },
  VIEW_ASSET_ONBOARDING: {
    path: '/asset-management/onboarding/:id',
    title: 'Add Asset',
    roles: [UserRole.Admin, UserRole.Analyst],
    allowBackButton: true,
  },
  VIEW_ASSET: {
    path: '/asset-management/:id',
    title: 'View Details',
    roles: [UserRole.Admin, UserRole.Analyst],
    allowBackButton: true,
  },
  VIEW_ASSET_ANALYSIS: {
    path: '/asset-management/:id/analysis',
    title: 'View Analysis',
    roles: [UserRole.Admin, UserRole.Analyst, UserRole.Management],
    allowBackButton: true,
  },
  VIEW_ASSET_BENCHMARK: {
    path: '/asset-management/:id/benchmark',
    title: 'Benchmark Analysis',
    roles: [UserRole.Admin, UserRole.Analyst, UserRole.Management],
    allowBackButton: true,
  },
  VIEW_ANALYSIS: {
    path: '/asset-analysis',
    title: 'View Analysis',
    roles: [UserRole.Admin, UserRole.Analyst, UserRole.Management],
    sidebar: {
      icon: 'bar2',
      label: 'View Analysis',
      section: 'CONFIGURATION',
    },
  },
  VIEW_BENCHMARK: {
    path: '/asset-benchmark',
    title: 'Benchmark Analysis',
    roles: [UserRole.Admin, UserRole.Analyst, UserRole.Management],
    sidebar: {
      icon: 'search-analysis',
      label: 'Benchmark Analysis',
      section: 'CONFIGURATION',
    },
  },
};

/**
 * =============================================
 * Utility Derived Constants for Routes
 * =============================================
 */
export const Routes = Object.fromEntries(Object.entries(AppRoutes).map(([key, value]) => [key, value.path])) as Record<RouteKeys, string>;

export const DashboardRouteHeaderTitles = Object.fromEntries(
  Object.values(AppRoutes)
    .filter(route => route.title)
    .map(route => [route.path, route.title]),
);
export const LinkedRoutes: Record<string, string> = {};

export function getNormalizedRoute(route: string): string | null {
  for (const key in Routes) {
    if (matchesRoute(route, Routes[key as keyof typeof Routes])) {
      return Routes[key as keyof typeof Routes];
    }
  }
  return null;
}

export const RoutesWithBackButton = new Set(
  Object.values(AppRoutes)
    .filter(route => route?.allowBackButton)
    .map(route => route.path),
);