import React from 'react';
import {useLocation} from 'react-router-dom';
import {SideNavBar, type SideNavSection} from '@lazarus/react-common/components';
import {isAppRouteActive} from '@/hooks';
import {useRole} from '@/hooks/useRole';
import {getNormalizedRoute} from '@/navigation/Routes';
// import {AMDAdminSideNavOptions, ManagementSideNavOptions, SystemSideBarOption} from '@/navigation/sidebar';
import {
  getSidebarSections,
} from '@/navigation/sidebar';

export function SideNav() {
  const location = useLocation();
  const {currentUserRole} = useRole();
  const pathname = getNormalizedRoute(location.pathname);
  const sections: SideNavSection[] = getSidebarSections(currentUserRole);

  return (
    <SideNavBar
      sections={sections}
      platformLabel="APD"
      className="z-999"
      isRouteActive={route => isAppRouteActive(pathname, {check: route})}
    />
  );
}
