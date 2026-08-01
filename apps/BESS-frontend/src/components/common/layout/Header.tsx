import {useMemo, useState, useRef, useEffect} from 'react';
import {DashboardRouteHeaderTitles, getNormalizedRoute, Routes} from '@/navigation/Routes';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {Text, Avatar, Icon} from '@/ui-kits';
import {useSelector, useDispatch} from 'react-redux';
import {authDataSelector} from '@/services/redux/selectors';
import {logoutRequest} from '@/services/redux/slice/authSlice';
import {
  detailedGreenAnalysis,
  initiateSimulationData,
  projectSimulationData,
  showDetailedAnalysisSelector,
  showDetailedMultiYearProjectionAnalysisSelector,
  showGreenAnalysisResults,
} from '@/services/redux/selectors/simulationWizardSelector';
import {
  resetInitiateSimulation,
  resetProjectSimulation,
  setShowDetailedAnalysis,
  setShowDetailedGreenAnalysis,
  setShowDetailedMultiYearProjectionAnalysis,
  setShowGreenAnalysisResults,
} from '@/services/redux/slice/simulationWizardSlice';
import {useScreenOverride} from '@/hooks';

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
  const showGreenResults = useSelector(showGreenAnalysisResults);
  const showDetailedGreenResults = useSelector(detailedGreenAnalysis);
  const {isFullscreenActive, exitFullscreen} = useScreenOverride();
  const isSimulationDetailPage = Boolean(id);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardHeaderTitle = useMemo(() => {
    if (isFullscreenActive) {
      return 'Exit Fullscreen';
    }

    if (showDetailedGreenResults && pathname.includes(Routes.SIMULATION_WIZARD)) {
      return 'Simulation Result';
    }

    if (showGreenResults && pathname.includes(Routes.SIMULATION_WIZARD)) {
      return 'Green Energy Analysis';
    }

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
  }, [
    pathname,
    simulData?.name,
    proSimulData?.name,
    showDetailedAnalysis,
    showDetailedMultiYearProjectionAnalysis,
    isFullscreenActive,
    showGreenResults,
    showDetailedGreenResults,
  ]);

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
    dispatch(logoutRequest());
  };

  return (
    <div className="py-4 px-8 shadow-md/10 flex items-center">
      {(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis || showGreenResults || showDetailedGreenResults) &&
        pathname.includes(Routes.SIMULATION_WIZARD) && (
          <button
            onClick={() => {
              if (isFullscreenActive) {
                exitFullscreen?.();
                return;
              }
              if (showDetailedGreenResults) {
                dispatch(setShowDetailedGreenAnalysis(false));
                return;
              }
              if (showGreenResults) {
                dispatch(setShowGreenAnalysisResults(false));
                return;
              }
              dispatch(setShowDetailedAnalysis(false));
              if (showDetailedMultiYearProjectionAnalysis) {
                dispatch(setShowDetailedMultiYearProjectionAnalysis(false));
              }
            }}
            className="flex items-center gap-1 text-text-primary! mr-6 cursor-pointer">
            <Icon name="arrow-left" size={20} />
          </button>
        )}
      {isSimulationDetailPage && !(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis || showGreenResults || showDetailedGreenResults) && (
        <button
          onClick={() => {
            if (isFullscreenActive) {
              exitFullscreen?.();
              return;
            }
            dispatch(resetInitiateSimulation());
            dispatch(setShowGreenAnalysisResults(false));
            dispatch(setShowDetailedGreenAnalysis(false));
            dispatch(resetProjectSimulation());
            navigate(Routes.SIMULATION_WIZARD);
          }}
          className="flex items-center gap-1 text-text-primary! mr-6 cursor-pointer">
          <Icon name="arrow-left" size={20} />
        </button>
      )}
      <Text variant="h2" className="text-text-primary! grow lg:text-h3 xl:text-h2">
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
