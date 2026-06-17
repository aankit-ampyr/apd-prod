import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {matchesRoute} from '@/utils';


export function useRouteLeave(
  watchRoute: string,
  onLeave: (destination: string) => void
) {
  const location = useLocation();
  
  const previousPath = useRef<string | null>(null);
  const isOnWatchedRoute = useRef<boolean>(false);

  useEffect(() => {
    const currentPath = location.pathname;

    // Initialize on first render
    if (previousPath.current === null) {
      previousPath.current = currentPath;
      isOnWatchedRoute.current = matchesRoute(currentPath, watchRoute);
      return;
    }

    const wasOnWatchedRoute = isOnWatchedRoute.current;
    const isNowOnWatchedRoute = matchesRoute(currentPath, watchRoute);

    // Trigger onLeave when leaving the watched route
    if (wasOnWatchedRoute && !isNowOnWatchedRoute) {
      onLeave(currentPath);
    }

    isOnWatchedRoute.current = isNowOnWatchedRoute;
    previousPath.current = currentPath;
  }, [location.pathname, watchRoute, onLeave]);
}