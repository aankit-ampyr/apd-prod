import React from 'react';
import {useLocation} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {SideNavBar, type SideNavSection} from '@lazarus/react-common/components';
import {isAppRouteActive} from '@/hooks';
import {getNormalizedRoute, Routes} from '@/navigation/Routes';
import {BESSAdminSideNavOptions, SystemSideBarOption, type SideNavOptionType} from '@/navigation/sidebar';
import {resetInitiateSimulation, resetProjectSimulation} from '@/services/redux/slice/simulationWizardSlice';

const sections: SideNavSection<SideNavOptionType['route']>[] = [
  {title: 'CONFIGURATION', options: BESSAdminSideNavOptions},
  {title: 'SYSTEM', options: SystemSideBarOption},
];

export function SideNav() {
  const location = useLocation();
  const dispatch = useDispatch();
  const pathname = getNormalizedRoute(location.pathname);

  const handleNavigate = (route: SideNavOptionType['route']) => {
    if (route === Routes.SIMULATION_WIZARD) {
      dispatch(resetInitiateSimulation());
      dispatch(resetProjectSimulation());
    }
  };

  return <SideNavBar sections={sections} platformLabel="PSP" isRouteActive={route => isAppRouteActive(pathname, {check: route})} onNavigate={handleNavigate} />;
}
