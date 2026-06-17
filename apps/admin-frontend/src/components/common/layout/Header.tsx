import {useMemo, useState, useRef, useEffect} from 'react';
import {DashboardRouteHeaderTitles, getNormalizedRoute, Routes} from '@/navigation/Routes';
import {useLocation, useNavigate} from 'react-router-dom';
import {Text, Avatar, Icon} from '@/ui-kits';
import {useSelector, useDispatch} from 'react-redux';
import {authDataSelector} from '@/services/redux/selectors';
import {resetAuth} from '@/services/redux/slice/authSlice';

export const Header = () => {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector(authDataSelector);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardHeaderTitle = useMemo(() => {
    const normalizedRoute = getNormalizedRoute(pathname);
    return DashboardRouteHeaderTitles[normalizedRoute as keyof typeof DashboardRouteHeaderTitles] ?? 'Dashboard';
  }, [pathname]);

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
    <div className="py-4 px-8 shadow-md/10 flex items-center">
      <Text variant="h1" className="text-text-primary! grow">
        {dashboardHeaderTitle}
      </Text>

      {/* Avatar with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="cursor-pointer" onClick={() => setShowDropdown(prev => !prev)}>
          <Avatar email={userData?.email} image={userData?.photo} username={userData?.name} />
        </div>

        {showDropdown && (
          <div className="absolute left-0 mt-2 w-40 bg-white border border-border rounded-md shadow-lg z-50">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 cursor-pointer rounded-md">
              <Icon name="logout" className="size-4 text-error" />
              <Text variant="caption" className="text-error! font-semibold">
                Log Out
              </Text>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
