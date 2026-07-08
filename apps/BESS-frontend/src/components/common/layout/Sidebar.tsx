import React from 'react';
import {useLocation} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {SideNavBar, type SideNavSection} from '@lazarus/react-common/components';
import {isAppRouteActive} from '@/hooks';
import {useRole} from '@/hooks/useRole';
import {Routes} from '@/navigation/Routes';
import {BESSAdminSideNavOptions, SystemSideBarOption, type SideNavOptionType} from '@/navigation/sidebar';
import {resetInitiateSimulation, resetProjectSimulation} from '@/services/redux/slice/simulationWizardSlice';

export function SideNav() {
  const location = useLocation();
  const dispatch = useDispatch();
  const {isBESSAdmin, isAnalyst} = useRole();
  // Keep the raw pathname here so nested wizard routes (for example /simulation-wizard/:id)
  // still match the parent sidebar item through the active-route helper.
  const pathname = location.pathname;
  const configurationOptions = isBESSAdmin || isAnalyst
    ? BESSAdminSideNavOptions
    : BESSAdminSideNavOptions.filter(option => option.route === Routes.SIMULATION_WIZARD);
  const sections: SideNavSection<SideNavOptionType['route']>[] = [
    {title: 'CONFIGURATION', options: configurationOptions},
    {
      title: 'SYSTEM',
      options: isBESSAdmin ? SystemSideBarOption : SystemSideBarOption.filter(option => option.route !== Routes.AUDIT_LOG),
    },
  ];

  const handleNavigate = (route: SideNavOptionType['route']) => {
    if (route === Routes.SIMULATION_WIZARD) {
      dispatch(resetInitiateSimulation());
      dispatch(resetProjectSimulation());
    }
  };

  return <SideNavBar sections={sections} platformLabel="PSP" isRouteActive={route => isAppRouteActive(pathname, {check: route})} onNavigate={handleNavigate} />;
}
