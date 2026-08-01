import {ScreenWrapper, StepsWithUnderscore, DispatchRules, SystemSetup, SimulationResults, CustomConfiguration} from '@/components';
import {StepsWithUnderscoreType} from '@/interface';
import {
  initiateSimulationData,
  projectSimulationData,
  showDetailedAnalysisSelector,
  showDetailedMultiYearProjectionAnalysisSelector,
  showGreenAnalysisResults,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData} from '@/services/redux/selectors';
import {Images} from '@lazarus/react-common/assets';
import {useState, useEffect, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {getAllProjectListRequest} from '@/services/redux/slice/projectsSlice';
import {
  getBessConfigRequest,
  getDispatchRuleRequest,
  getGeneratorDgRequest,
  getLoadProfileRequest,
  getProjectSimulationRequest,
  getSolarProfileRequest,
  resetProjectSimulation,
  simulationProgressRequest,
} from '@/services/redux/slice/simulationWizardSlice';
import {DGSizing} from '@/components/SimulationWizard/DGSizing';
import {Skeleton, Text} from '@/ui-kits';
import {ChangeConfigurationProvider} from '@/components/SimulationWizard/ChangeConfigurationContext';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {MultiYearProjection} from '@/components/SimulationWizard/MultiYearProjection';
import {GreenEnergyAnalysis} from '@/components/SimulationWizard/GreenEnergyAnalysis';
import {SimulationStatusProvider} from '@/components/SimulationWizard/SimulationStatusContext';

const getWizardStepStorageKey = (simulationId: string | number) => `simulation_wizard_step_${simulationId}`;
const WIZARD_RELOAD_CONSUMED_TOKEN_KEY = 'simulation_wizard_reload_consumed_token';
type WizardHistoryState = {
  simulationId?: string;
  wizardStep?: number;
};

const getStepFromSearch = (search: string) => {
  const value = Number(new URLSearchParams(search).get('step'));
  return Number.isInteger(value) && value >= 1 && value <= 7 ? value : null;
};

const scrollWizardViewportToTop = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const screenWrapper = document.querySelector('.screen-wrapper');
  let scrollContainer: HTMLElement | null = screenWrapper?.parentElement ?? null;

  while (scrollContainer) {
    const {overflow, overflowY} = window.getComputedStyle(scrollContainer);
    if (/(auto|scroll)/.test(`${overflow}${overflowY}`) && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
      scrollContainer.scrollTo({top: 0, left: 0, behavior: 'auto'});
      return;
    }

    scrollContainer = scrollContainer.parentElement;
  }

  window.scrollTo({top: 0, left: 0, behavior: 'auto'});
};

function WizardGhostLoader() {
  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
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
  const showGreenAnalysisResult = useSelector(showGreenAnalysisResults);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);

  // Get project_id from simulation data
  const project_id = simulData?.project_id ?? proSimulData?.project_id;

  // Find the project name from allProjects using project_id
  const projectName = currentProject?.name || allProjects?.find((p: any) => p.id === project_id)?.name || '';

  // Prefer simulation from Redux, fallback to URL param
  const simulation_id: any = simulData?.id ?? proSimulData?.id ?? simulationIdFromUrl;
  const simulationProgress = simulData?.progress ?? proSimulData?.progress;
  const editedStep = simulData?.edited_step ?? proSimulData?.edited_step;

  const [isStepsHidden, setIsStepsHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const syncStepHistory = (step: number, replace = false) => {
    if (!simulation_id) return;

    navigate(
      {
        pathname: location.pathname,
        search: `?step=${step}`,
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

      const stepFromUrl = getStepFromSearch(location.search);
      if (stepFromUrl) {
        setCurrentStep(stepFromUrl);
        setIsLoading(false);
        return;
      }

      if (canRestoreStepFromReload) {
        sessionStorage.setItem(WIZARD_RELOAD_CONSUMED_TOKEN_KEY, pageLoadToken);
        const storageKey = simulation_id ? getWizardStepStorageKey(simulation_id) : null;
        const savedStep = storageKey ? Number(localStorage.getItem(storageKey)) : null;

        if (savedStep && savedStep >= 1 && savedStep <= 7) {
          syncStepHistory(savedStep, true);
          setIsLoading(false);
          return;
        }
      }

      // Map progress: 1-4 => 1, 5 => 2, 6 => 3, 7 => 4, 8 => 5, etc.
      let step = 1;

      if (editedStep >= 1 && editedStep <= 4) {
        step = 1;
      } else if (editedStep === 5) {
        step = 2;
      } else if (editedStep === 6) {
        step = 3;
      } else if (editedStep === 7) {
        step = 4;
      } else if (editedStep === 8 || editedStep === 9) {
        step = 5;
      } else if (editedStep === 10 || editedStep === 11) {
        step = 6;
      } else if (editedStep === 12 || editedStep >= 13) {
        step = 7;
      }
      step = Math.min(7, Math.max(1, step));
      syncStepHistory(step, true);
      setIsLoading(false);
    }
  }, [canRestoreStepFromReload, currentStep, location.search, pageLoadToken, simulationProgress, simulation_id]);

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
    const stepFromUrl = getStepFromSearch(location.search);
    const state = location.state as WizardHistoryState | null;
    const stateStep = state?.wizardStep && String(state.simulationId ?? '') === String(simulation_id) ? state.wizardStep : null;
    const nextStep = stepFromUrl ?? stateStep;
    if (!nextStep) return;

    // Ignore stale history state.
    // If URL says 3 but history state still says 4, trust the URL.
    if (stepFromUrl !== null && stateStep !== null && stepFromUrl !== stateStep) {
      return;
    }
    if (nextStep === currentStep) return;

    setCurrentStep(nextStep);
    setIsLoading(false);
  }, [currentStep, location.key, location.search, location.state, simulation_id]);

  // Persist the current step per simulation so browser refresh restores the same step.
  useEffect(() => {
    if (!simulation_id || currentStep === null) return;
    localStorage.setItem(getWizardStepStorageKey(simulation_id), String(currentStep));
  }, [simulation_id, currentStep]);

  useEffect(() => {
    return () => {
      dispatch(resetProjectSimulation());
    };
  }, [dispatch]);

  // Fetch saved data for all tabs when simulation_id changes
  // This ensures tick marks show correctly for all tabs on project switch

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

  useEffect(() => {
    if (currentStep === null) return;

    const animationFrameId = window.requestAnimationFrame(scrollWizardViewportToTop);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [currentStep]);

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
    {
      image: Images.fileEdit,
      label: 'Green Energy Analysis',
      step: 7,
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
      case 7:
        return 'Green Energy Analysis';
      default:
        return 'System Setup';
    }
  };

  if (isLoading || currentStep === null) {
    return <WizardGhostLoader />;
  }
  const goToStep = (step: number) => {
    if (!step) return;
    syncStepHistory(step);
  };
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
      {!(showDetailedAnalysis || showDetailedMultiYearProjectionAnalysis || showGreenAnalysisResult) && (
        <div className="flex items-center justify-between">
          <Text variant="h2" className="lg:text-h3 xl:text-h2">
            {getStepHeading()}{' '}
          </Text>
          <div className="bg-primary-tint-2 p-3.5 rounded-md">
            <Text variant="14M" className="text-text-secondary!">
              Project: <span className="text-text-primary!">{projectName}</span>
            </Text>
          </div>
        </div>
      )}
      <SimulationStatusProvider>
        <ChangeConfigurationProvider>
          {currentStep === 1 && <SystemSetup setIsStepsHidden={setIsStepsHidden} onNextToDispatchRules={() => syncStepHistory(2)} />}
          {currentStep === 2 && simulation_id && (
            <div key={simulation_id}>
              <DispatchRules onNextToSizing={() => syncStepHistory(3)} />
            </div>
          )}
          {currentStep === 3 && <DGSizing onNextToRunSimulation={() => syncStepHistory(4)} />}
          {currentStep === 4 && <SimulationResults setIsStepsHidden={setIsStepsHidden} />}
          {currentStep === 5 && <CustomConfiguration setIsStepsHidden={setIsStepsHidden} goToStep={goToStep} />}
          {currentStep === 6 && <MultiYearProjection setIsStepsHidden={setIsStepsHidden} goToStep={goToStep} />}
          {currentStep === 7 && <GreenEnergyAnalysis setIsStepsHidden={setIsStepsHidden} />}
        </ChangeConfigurationProvider>
      </SimulationStatusProvider>
    </ScreenWrapper>
  );
}

export default SimulationWizard;
