import {useMemo, useState, useRef, useEffect} from 'react';
import {DashboardRouteHeaderTitles, getNormalizedRoute, Routes} from '@/navigation/Routes';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {Text, Avatar, Icon} from '@/ui-kits';
import {useSelector, useDispatch} from 'react-redux';
import {authDataSelector} from '@/services/redux/selectors';
import {resetAuth} from '@/services/redux/slice/authSlice';
import {
  initiateSimulationData,
  projectSimulationData,
  showDetailedAnalysisSelector,
  showDetailedMultiYearProjectionAnalysisSelector,
} from '@/services/redux/selectors/simulationWizardSelector';
import {
  resetInitiateSimulation,
  resetProjectSimulation,
  setShowDetailedAnalysis,
  setShowDetailedMultiYearProjectionAnalysis,
} from '@/services/redux/slice/simulationWizardSlice';

export const Header = () => {
  const {id} = useParams();
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userData = useSelector(authDataSelector);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const showDetailedAnalysis = useSelector(showDetailedAnalysisSelector);
  const showDetailedMultiYearProjectionAnalysis = useSelector(showDetailedMultiYearProjectionAnalysisSelector);
  const isSimulationDetailPage = Boolean(id);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardHeaderTitle = useMemo(() => {
    // Show "View Detailed Analysis" when in detailed analysis mode
    if ((showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis) && pathname.includes(Routes.SIMULATION_WIZARD)) {
      return 'View Detailed Analysis';
    }

    const normalizedRoute = getNormalizedRoute(pathname);

    // 👇 Override for simulation wizard
    if (pathname.includes(Routes.SIMULATION_WIZARD)) {
      return simulData?.name ?? proSimulData?.name ?? DashboardRouteHeaderTitles[Routes.SIMULATION_WIZARD];
    }

    return DashboardRouteHeaderTitles[normalizedRoute as keyof typeof DashboardRouteHeaderTitles] ?? 'Dashboard';
  }, [pathname, simulData?.name, proSimulData?.name, showDetailedAnalysis, showDetailedMultiYearProjectionAnalysis]);

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
      {(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis) && pathname.includes(Routes.SIMULATION_WIZARD) && (
        <button
          onClick={() => {
            dispatch(setShowDetailedAnalysis(false));
            if (showDetailedMultiYearProjectionAnalysis) {
              dispatch(setShowDetailedMultiYearProjectionAnalysis(false));
            }
          }}
          className="flex items-center gap-1 text-text-primary! mr-6 cursor-pointer">
          <Icon name="arrow-left" size={20} />
        </button>
      )}
      {isSimulationDetailPage && !(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis) && (
        <button
          onClick={() => {
            dispatch(resetInitiateSimulation());
            dispatch(resetProjectSimulation());
            navigate(Routes.SIMULATION_WIZARD);
          }}
          className="flex items-center gap-1 text-text-primary! mr-6 cursor-pointer">
          <Icon name="arrow-left" size={20} />
        </button>
      )}
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
            <button onClick={handleLogout} className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-gray-50 cursor-pointer rounded-md">
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
