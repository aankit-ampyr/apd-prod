import {AppRoutes} from './Routes';
import {UserRole} from '@/constants';
import {SideNavOptionType} from '@/interface';
import {SideNavSection} from '@lazarus/react-common/components';

function resolveSidebarValue<T>(value: T | ((role: UserRole) => T), role: UserRole): T {
  if (typeof value === 'function') {
    return (value as (role: UserRole) => T)(role);
  }

  return value;
}

export function getSidebarSections(role: UserRole): SideNavSection[] {
  const configuration: SideNavOptionType[] = [];
  const system: SideNavOptionType[] = [];

  for (const route of Object.values(AppRoutes)) {
    const sidebar = route?.sidebar;
    // If sidebar config is not present, skip the route
    if (!sidebar) continue;

    // If the user's role is not included in the route's allowed roles, skip the route
    if (!route.roles.includes(role)) continue;

    const item: SideNavOptionType = {
      icon: resolveSidebarValue(sidebar.icon, role),
      label: resolveSidebarValue(sidebar.label, role),
      route: route.path,
    };

    const section = resolveSidebarValue(sidebar.section, role);

    if (section === 'CONFIGURATION') {
      configuration.push(item);
    } else {
      system.push(item);
    }
  }

  return [
    {
      title: 'CONFIGURATION',
      options: configuration,
    },

    {
      title: 'SYSTEM',
      options: system,
    },
  ];
}
