import {useLocation} from 'react-router-dom';
import {SideNavBar, type SideNavSection} from '@lazarus/react-common/components';
import {isAppRouteActive} from '@/hooks';
import {getNormalizedRoute} from '@/navigation/Routes';
import {SuperAdminSideNavOptions, SystemSideBarOption} from '@/navigation/sidebar';

const sections: SideNavSection[] = [
  {title: 'CONFIGURATION', options: SuperAdminSideNavOptions},
  {title: 'SYSTEM', options: SystemSideBarOption},
];

export function SideNav() {
  const location = useLocation();
  const pathname = getNormalizedRoute(location.pathname);
  return (
    <SideNavBar
      sections={sections}
      platformLabel="Super Admin"
      isRouteActive={route => isAppRouteActive(pathname, {check: route})}
    />
  );
}
