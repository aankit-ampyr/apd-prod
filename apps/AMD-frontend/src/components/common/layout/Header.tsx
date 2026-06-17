import {useMemo, useState, useRef, useEffect} from 'react';
import {DashboardRouteHeaderTitles, getNormalizedRoute, Routes, RoutesWithBackButton} from '@/navigation/Routes';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {Text, Avatar, Icon} from '@/ui-kits';
import {useSelector, useDispatch} from 'react-redux';
import {authDataSelector} from '@/services/redux/selectors';
import {resetAuth} from '@/services/redux/slice/authSlice';
import { useScreenOverride } from '@/hooks';

export const Header = () => {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector(authDataSelector);
  const [showDropdown, setShowDropdown] = useState(false);
  const {override, hide} = useScreenOverride();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchParams] = useSearchParams();

  const dashboardHeaderTitle = useMemo(() => {
    const normalizedRoute = getNormalizedRoute(pathname);
    return DashboardRouteHeaderTitles[normalizedRoute as keyof typeof DashboardRouteHeaderTitles] ?? 'Dashboard';
  }, [pathname]);


  const showBackButton = useMemo(() => {
    if (override){ 
      return true;
    }
    const normalizedRoute = getNormalizedRoute(pathname);

    // For other routes, use the existing logic
    for (const route of RoutesWithBackButton) {
      if (normalizedRoute === route) {
        return true;
      }
    }
    return false;
  }, [pathname, searchParams]);

  const handleNavigateBack = () => {
    if (override){
      hide();
      return;
    }
    navigate(-1)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(resetAuth());
    navigate(Routes.LOGIN);
  };

  return (
    <div className='py-4 z-999 px-8 shadow-md/10 flex items-center'>
      {showBackButton && (
        <button onClick={handleNavigateBack} className="cursor-pointer shrink-0">
          <Icon name="arrow-left" className="size-6! mr-4 sm:size-6 font-bold text-text-primary" />
        </button>
      )}
      <Text variant='h1' className='text-text-primary! grow'>{dashboardHeaderTitle}</Text>

      {/* Avatar with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div 
          className="cursor-pointer"
          onClick={() => setShowDropdown(prev => !prev)}
        >
          <Avatar email={userData?.email} image={userData?.photo} username={userData?.name}/>
        </div>

        {showDropdown && (
          <div className="absolute left-0 mt-2 w-40 bg-white border border-border rounded-md shadow-lg z-50">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 cursor-pointer rounded-md"
            >
              <Icon name="logout" className="size-4 text-error" />
              <Text variant="caption" className="text-error! font-semibold">Log Out</Text>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
