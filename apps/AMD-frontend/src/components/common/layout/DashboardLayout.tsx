import React, {useEffect, useRef} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import {SideNav} from './Sidebar';
import {Header} from './Header';
import {CommentPanel} from '../CommentPanel';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const currentRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const scrollContainer = contentScrollRef.current;
    const nextRouteKey = `${location.pathname}${location.search}`;

    if (!scrollContainer) {
      currentRouteRef.current = nextRouteKey;
      return;
    }

    const previousRouteKey = currentRouteRef.current;
    if (previousRouteKey) {
      scrollPositionsRef.current.set(previousRouteKey, scrollContainer.scrollTop);
    }

    const nextScrollTop = scrollPositionsRef.current.get(nextRouteKey) ?? 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollContainer.scrollTo({
          top: nextScrollTop,
          behavior: 'smooth',
        });
      });
    });

    currentRouteRef.current = nextRouteKey;
  }, [location.pathname, location.search]);

  return (
    <div className="flex w-dvw h-dvh overflow-y-auto scroll-hidden">
      <SideNav />
      <div ref={contentScrollRef} className="grow flex flex-col overflow-y-auto scroll-hidden relative">
        <Header />
        <Outlet />
      </div>
      <CommentPanel />
    </div>
  );
};

