import React from 'react';
import {Outlet} from 'react-router-dom';
import {SideNav} from './Sidebar';
import {Header} from './Header';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex w-dvw h-dvh overflow-y-auto scroll-hidden">
      <SideNav />
      <div className="grow flex flex-col overflow-y-auto scroll-hidden">
        <Header />
        <div className="bg-bg-card p-8 grow flex flex-col">
          <div className="bg-white rounded-lg shadow p-6 grow">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
