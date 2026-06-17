import {ScreenWrapper, StepsWithUnderscore, DispatchRules, SystemSetup, SimulationResults, CustomConfiguration} from '@/components';
import {StepsWithUnderscoreType} from '@/interface';
import {
  initiateSimulationData,
  projectSimulationData,
  showDetailedAnalysisSelector,
  showDetailedMultiYearProjectionAnalysisSelector,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData} from '@/services/redux/selectors';
import {Images} from '@lazarus/react-common/assets';
import {useState, useEffect, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {getAllProjectListRequest} from '@/services/redux/slice/projectsSlice';
import {
  getLoadProfileRequest,
  getSolarProfileRequest,
  getBessConfigRequest,
  getGeneratorDgRequest,
  getProjectSimulationRequest,
  getDispatchRuleRequest,
  simulationProgressRequest,
  refreshProjectSimulationRequest,
} from '@/services/redux/slice/simulationWizardSlice';
import {DGSizing} from '@/components/SimulationWizard/DGSizing';
import {Skeleton, Text} from '@/ui-kits';
import {ChangeConfigurationProvider} from '@/components/SimulationWizard/ChangeConfigurationContext';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {MultiYearProjection} from '@/components/SimulationWizard/MultiYearProjection';

const getWizardStepStorageKey = (simulationId: string | number) => `simulation_wizard_step_${simulationId}`;
const WIZARD_RELOAD_CONSUMED_TOKEN_KEY = 'simulation_wizard_reload_consumed_token';
type WizardHistoryState = {
  simulationId?: string;
  wizardStep?: number;
};

function WizardGhostLoader() {
  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
      {/* Step indicators */}
      <div className="flex items-center gap-10 mb-10">
        {[1, 2, 3, 4, 5].map(step => (
          <div key={step} className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">{step}.</span>

            <Skeleton animation="wave" variant="rounded" width={48} height={4} className="rounded-full!" />
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="w-full max-w-4xl bg-white rounded-[32px] p-6 md:p-8 shadow-sm">
        {/* Top text skeletons */}
        <div className="flex flex-col gap-3">
          <Skeleton animation="wave" variant="rounded" width={140} height={20} className="rounded-full!" />

          <Skeleton animation="wave" variant="rounded" width={240} height={14} className="rounded-full!" />
        </div>

        {/* Center icon skeleton */}
        <div className="flex justify-center mt-16">
          <Skeleton animation="wave" variant="rounded" width={56} height={56} className="rounded-2xl!" />
        </div>

        {/* Bottom line */}
        <div className="flex justify-center mt-10 mb-16">
          <Skeleton animation="wave" variant="rounded" width="65%" height={12} className="rounded-full!" />
        </div>
      </div>
    </div>
  );
}
function SimulationWizard() {
  const dispatch = useDispatch();
  const {id: simulationIdFromUrl} = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const simulData: any = useSelector(initiateSimulationData);

  const proSimulData = useSelector(projectSimulationData);

  const showDetailedAnalysis = useSelector(showDetailedAnalysisSelector);
  const showDetailedMultiYearProjectionAnalysis = useSelector(showDetailedMultiYearProjectionAnalysisSelector);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);

  // Get project_id from simulation data
  const project_id = simulData?.project_id ?? proSimulData?.project_id;

  // Find the project name from allProjects using project_id
  const projectName = currentProject?.name || allProjects?.find((p: any) => p.id === project_id)?.name || '';

  // Prefer simulation from Redux, fallback to URL param
  const simulation_id: any = simulData?.id ?? proSimulData?.id ?? simulationIdFromUrl;
  const simulationProgress = simulData?.progress ?? proSimulData?.progress;

  const [isStepsHidden, setIsStepsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const syncStepHistory = (step: number, replace = false) => {
    setCurrentStep(step);

    if (!simulation_id) return;

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
      },
      {
        replace,
        state: {
          simulationId: String(simulation_id),
          wizardStep: step,
        } satisfies WizardHistoryState,
      },
    );
  };

  const pageLoadToken = useMemo(() => {
    if (typeof performance === 'undefined') return `${Date.now()}`;
    return `${performance.timeOrigin}`;
  }, []);

  const isReloadNavigation = useMemo(() => {
    if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return false;

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return navEntries[0]?.type === 'reload';
  }, []);

  const canRestoreStepFromReload = useMemo(() => {
    if (!isReloadNavigation || typeof sessionStorage === 'undefined') return false;
    const consumedToken = sessionStorage.getItem(WIZARD_RELOAD_CONSUMED_TOKEN_KEY);
    return consumedToken !== pageLoadToken;
  }, [isReloadNavigation, pageLoadToken]);

  // Fetch simulation by ID from URL on mount (or when ID changes)
  useEffect(() => {
    if (simulationIdFromUrl) {
      setIsLoading(true);
      dispatch(getProjectSimulationRequest({simulation_id: simulationIdFromUrl}));
    }
  }, [simulationIdFromUrl, dispatch]);

  // Set current step based on simulation progress
  useEffect(() => {
    if (typeof simulationProgress === 'number') {
      if (currentStep !== null) {
        setIsLoading(false);
        return;
      }

      if (canRestoreStepFromReload) {
        sessionStorage.setItem(WIZARD_RELOAD_CONSUMED_TOKEN_KEY, pageLoadToken);
        const storageKey = simulation_id ? getWizardStepStorageKey(simulation_id) : null;
        const savedStep = storageKey ? Number(localStorage.getItem(storageKey)) : null;

        if (savedStep && savedStep >= 1 && savedStep <= 6) {
          syncStepHistory(savedStep, true);
          setIsLoading(false);
          return;
        }
      }

      // Map progress: 1-4 => 1, 5 => 2, 6 => 3, 7 => 4, 8 => 5, etc.
      let step = 1;
      if (simulationProgress >= 1 && simulationProgress <= 4) {
        step = 1;
      } else if (simulationProgress === 5) {
        step = 2;
      } else if (simulationProgress === 6) {
        step = 3;
      } else if (simulationProgress >= 7) {
        step = 4;
      }
      step = Math.min(6, Math.max(1, step));
      syncStepHistory(step, true);
      setIsLoading(false);
    }
  }, [canRestoreStepFromReload, currentStep, pageLoadToken, simulationProgress, simulation_id]);

  useEffect(() => {
    const state = location.state as WizardHistoryState | null;
    if (!state?.wizardStep || !simulation_id) return;
    if (String(state.simulationId ?? '') !== String(simulation_id)) return;
    if (state.wizardStep === currentStep) return;

    setCurrentStep(state.wizardStep);
    setIsLoading(false);
  }, [currentStep, location.key, location.state, simulation_id]);

  // Persist the current step per simulation so browser refresh restores the same step.
  useEffect(() => {
    if (!simulation_id || currentStep === null) return;
    localStorage.setItem(getWizardStepStorageKey(simulation_id), String(currentStep));
  }, [simulation_id, currentStep]);

  // Fetch saved data for all tabs when simulation_id changes
  // This ensures tick marks show correctly for all tabs on project switch
  useEffect(() => {
    if (simulation_id) {
      dispatch(getLoadProfileRequest({simulation_id: Number(simulation_id)}));
      dispatch(getSolarProfileRequest({simulation_id: Number(simulation_id)}));
      dispatch(getBessConfigRequest({simulation_id: Number(simulation_id)}));
      dispatch(getGeneratorDgRequest({simulation_id: Number(simulation_id)}));
      dispatch(getDispatchRuleRequest({simulation_id: Number(simulation_id)}));
      dispatch(simulationProgressRequest({simulation_id: Number(simulation_id)}));
      dispatch(getAllProjectListRequest());
    }
  }, [simulation_id, dispatch]);

  useEffect(() => {
    if (showProjectSwitcher) {
      dispatch(getAllProjectListRequest());
    }
  }, [showProjectSwitcher, dispatch]);

  useEffect(() => {
    if (currentStep !== 1 && showProjectSwitcher) {
      setShowProjectSwitcher(false);
    }
  }, [currentStep, showProjectSwitcher]);

  const steps: StepsWithUnderscoreType[] = [
    {
      image: Images.fileEdit,
      label: 'Sytem Setup',
      step: 1,
    },
    {
      image: Images.fileEdit,
      label: 'Dispatch Rules',
      step: 2,
    },
    {
      image: Images.fileEdit,
      label: 'BESS & DG Sizing',
      step: 3,
    },
    {
      image: Images.fileEdit,
      label: 'Simulation Results',
      step: 4,
    },
    {
      image: Images.fileEdit,
      label: 'Custom Configuration',
      step: 5,
    },
    {
      image: Images.fileEdit,
      label: 'Multi-Year Projection',
      step: 6,
    },
  ];

  const getStepHeading = () => {
    switch (currentStep) {
      case 1:
        return 'System Setup';
      case 2:
        return 'Dispatch Rules';
      case 3:
        return 'BESS & DG Sizing';
      case 4:
        return 'Simulation Result';
      case 5:
        return 'Custom Configuration';
      case 6:
        return 'Multi-Year Projection';
      default:
        return 'System Setup';
    }
  };

  if (isLoading || currentStep === null) {
    return <WizardGhostLoader />;
  }

  return (
    <ScreenWrapper
      className={`bg-[linear-gradient(122.55deg,#F3F9FF_3.63%,#F2F3FF_92.69%)] ${isStepsHidden ? 'pt-8' : 'pt-0'}`}
      header={
        isStepsHidden ? (
          <> </>
        ) : (
          <StepsWithUnderscore className="my-10" steps={steps} currentStep={Number(currentStep)} gotoStep={step => syncStepHistory(step)} />
        )
      }>
      {!(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis) && (
        <div className="flex items-center justify-between">
          <Text variant="h2">{getStepHeading()} </Text>
          <div className="bg-primary-tint-2 p-3.5 rounded-md">
            <Text variant="14M" className="text-text-secondary!">
              Project: <span className="text-text-primary!">{projectName}</span>
            </Text>
          </div>
        </div>
      )}

      <ChangeConfigurationProvider>
        {currentStep === 1 && <SystemSetup setIsStepsHidden={setIsStepsHidden} onNextToDispatchRules={() => syncStepHistory(2)} />}
        {currentStep === 2 && simulation_id && (
          <div key={simulation_id}>
            <DispatchRules onNextToSizing={() => syncStepHistory(3)} />
          </div>
        )}
        {currentStep === 3 && <DGSizing onNextToRunSimulation={() => syncStepHistory(4)} />}
        {currentStep === 4 && <SimulationResults setIsStepsHidden={setIsStepsHidden} />}
        {currentStep === 5 && <CustomConfiguration setIsStepsHidden={setIsStepsHidden} />}
        {currentStep === 6 && <MultiYearProjection setIsStepsHidden={setIsStepsHidden} />}
      </ChangeConfigurationProvider>
    </ScreenWrapper>
  );
}

export default SimulationWizard;
