import {useLocation, useSearchParams} from 'react-router-dom';
import {LinkedRoutes, getNormalizedRoute} from '@/navigation/Routes';
interface UseAppRouteArgs {
  check?: string;
}

export function isAppRouteActive(pathname?: string | null, args?: UseAppRouteArgs) {
  if (!pathname) return false;
  if (!args) return false;
  if (!args.check) return false;

  const checkRoute = args.check;
  const normalizedCheckRoute = getNormalizedRoute(checkRoute);
  if (!normalizedCheckRoute) return false;


  // isExactMatch
  if (pathname === normalizedCheckRoute) return true;
  
  // is Sub path
  if (pathname.startsWith(normalizedCheckRoute)){
    return true;
  }

  // is linked route
  const linkedRoute = LinkedRoutes[pathname];
  if (linkedRoute && linkedRoute === normalizedCheckRoute){
    return true;
  }
  return false;
}

export function useAppRoute(args?: UseAppRouteArgs) {
  const location = useLocation();
  const [params] = useSearchParams();

  const pathname = getNormalizedRoute(location.pathname);
  const is_active = isAppRouteActive(pathname, args);

  return {
    name: location.pathname,
    params,
    raw: location,
    isActive: is_active,
  };
}
