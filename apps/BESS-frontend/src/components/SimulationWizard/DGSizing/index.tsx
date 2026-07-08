import {RootState} from '@/services/redux/rootReducer';
import {
  bessContainerConfigData,
  dgSizingData,
  dgSizingDataSuccess,
  generatorData,
  loadProfileData,
  savedLoadProfileData,
  solarProfileData,
  savedSolarProfileData,
  initiateSimulationData,
  projectSimulationData,
  simulationProgressData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {authDataSelector, allProjectsData, projectLoading} from '@/services/redux/selectors';
import {dgSizingRequest, getDGSizingRequest, simulationProgressRequest} from '@/services/redux/slice/simulationWizardSlice';
import {getAllProjectListRequest} from '@/services/redux/slice/projectsSlice';
import {Button, Icon, SelectInput, Skeleton, Text, TextInput} from '@/ui-kits';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDispatch, useSelector} from 'react-redux';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {StopSimulation} from './StopSimulation';
import {useDGSizingSimulation} from './hooks/useDGSizingSimulation';
import {useSimulationStatus} from '../SimulationStatusContext';

const ErrorMessage = ({message}: {message: string}) => (
  <div className="flex items-start gap-2 mt-3 text-error-text!">
    <Icon name="infoCircle" className="text-error-text! size-4 mt-1" />
    <Text variant="caption" className="text-error-text! font-InterMedium!">
      {message}
    </Text>
  </div>
);

function DGSizingGhostLoader() {
  return (
    <div>
      <div className="bg-[#F7FDFC] p-4 mt-5 border-[1.4px] border-[#B6D7D3] rounded-lg w-full">
        <div className="flex items-center gap-3">
          <Skeleton animation="wave" variant="rounded" width={28} height={28} className="rounded-md!" />
          <Skeleton animation="wave" variant="rounded" width={220} height={24} className="rounded-full!" />
        </div>

        <div className="flex flex-col xl:flex-row gap-4 mt-1">
          {Array.from({length: 2}).map((_, index) => (
            <div key={index} className="bg-white p-4 mt-5 border-[1.4px] border-border rounded-md w-full xl:w-[60%]">
              <Skeleton animation="wave" variant="rounded" width={180} height={20} className="rounded-full!" />
              <div className="flex gap-4 mt-3">
                <div className="w-1/2">
                  <Skeleton animation="wave" variant="rounded" width={80} height={16} className="mb-2 rounded-full!" />
                  <Skeleton animation="wave" variant="rounded" width="100%" height={44} className="rounded-lg!" />
                </div>
                <div className="w-1/2">
                  <Skeleton animation="wave" variant="rounded" width={80} height={16} className="mb-2 rounded-full!" />
                  <Skeleton animation="wave" variant="rounded" width="100%" height={44} className="rounded-lg!" />
                </div>
              </div>
              <Skeleton animation="wave" variant="rounded" width="100%" height={96} className="mt-4 rounded-md!" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full mt-7">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton animation="wave" variant="rounded" width={28} height={28} className="rounded-md!" />
          <Skeleton animation="wave" variant="rounded" width={190} height={24} className="rounded-full!" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {Array.from({length: 4}).map((_, index) => (
            <div key={index}>
              <Skeleton animation="wave" variant="rounded" width={90} height={16} className="rounded-full!" />
              <Skeleton animation="wave" variant="rounded" width={56} height={32} className="mt-2 rounded-full!" />
            </div>
          ))}
        </div>
        <Skeleton animation="wave" variant="rounded" width={260} height={18} className="mt-6 rounded-full!" />
      </div>

      <div className="mt-6 flex justify-center gap-5">
        <Skeleton animation="wave" variant="rounded" width={160} height={44} className="rounded-md!" />
        <Skeleton animation="wave" variant="rounded" width={200} height={44} className="rounded-md!" />
      </div>
    </div>
  );
}

interface DGSizingProps {
  onNextToRunSimulation?: () => void;
}

interface SizingState {
  bessMin: number;
  bessMax: number;
  dgMin: number;
  dgMax: number;
  stepSize: number;
}

interface BessContainer {
  id: number;
}

export const DGSizing = ({onNextToRunSimulation}: DGSizingProps) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();
  const hasRequestedProjectListRef = useRef(false);
  const {isAnySimulationRunning, runningSimulationId} = useSimulationStatus();

  const dgData = useSelector(generatorData);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;

  // Check if user is an assigned user (view-only access)
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const isProjectLoading = useSelector(projectLoading);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some(user => user.id === authData.id));
  const isReadOnly = isAssignedUser || isProjectAssignmentPending;

  const bessSavedData = useSelector(bessContainerConfigData);
  const loadData = useSelector(loadProfileData);
  const solarData = useSelector(solarProfileData);
  const loadProfileSaved = useSelector(savedLoadProfileData);
  const solarProfileSaved = useSelector(savedSolarProfileData);
  const generatorSaved = useSelector((state: RootState) => state.simulationWizard.generatorDgData);
  const simulProgressData = useSelector(simulationProgressData);
  const dispatchRuleSaved = useSelector((state: RootState) => state.simulationWizard.dispatchRuleData);

  const hasGenerator = dgData?.is_included;

  const sizingData = useSelector(dgSizingData);
  const isDgSizingLoading = useSelector((state: RootState) => state.simulationWizard.getDgSizingLoading);
  const isProgressLoading = useSelector((state: RootState) => state.simulationWizard.simulationProgressLoading);
  const hasPersistedSizing =
    sizingData?.bess_min !== undefined && sizingData?.bess_min !== null && sizingData?.bess_max !== undefined && sizingData?.bess_max !== null;

  const [bessMin, setBessMin] = useState<number>(25);
  const [bessMax, setBessMax] = useState<number>(150);

  const [dgMin, setDgMin] = useState<number>(0);
  const [dgMax, setDgMax] = useState<number>(200);
  const [savedState, setSavedState] = useState<SizingState | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [stepSize, setStepSize] = useState<number>(5);
  const [isPostSaveState, setIsPostSaveState] = useState(false);

  const success = useSelector(dgSizingDataSuccess);
  const [hasFetchedProgress, setHasFetchedProgress] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);

  // Persisted completion state from backend
  const isSimulationCompletedPersisted = simulProgressData?.status === 2;

  // Track if user has edited since last simulation completion
  const [hasUserEditedSinceCompletion, setHasUserEditedSinceCompletion] = useState(false);
  const [resourceId, setResourceId] = useState<number | null>(null);

  const handleSimulationCompleted = useCallback(() => {
    setHasUserEditedSinceCompletion(false);
  }, []);

  const {
    currentBess,
    currentConfig,
    currentDuration,
    handleCancelStopSimulation,
    handleOpenStopSimulation,
    handleRunSizingSimulation,
    handleStopSimulation,
    isBlocked,
    isSimulationRunning,
    isStopSimulationOpen,
    progressContainerRef,
    runSimulationDisabled,
    setRunSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    simulationProgress,
    totalConfig,
  } = useDGSizingSimulation({
    simulationId: simulation_id,
    currentUserId: authData?.id,
    simulationJobId: simulProgressData?.simulation_job_id,
    simulationStatus: simulProgressData?.status,
    onSimulationCompleted: handleSimulationCompleted,
    resourceId,
    setResourceId,
  });

  // Only show completion summary if not running, not in progress, and user has NOT edited since completion
  const shouldShowCompletionSummary =
    !isProgressLoading &&
    !isSimulationRunning &&
    !showCompletionProgress &&
    !hasUserEditedSinceCompletion &&
    (showCompletionSummary || isSimulationCompletedPersisted);

  useEffect(() => {
    if (simulation_id) {
      dispatch(getDGSizingRequest({simulation_id}));
    }
  }, [dispatch, simulation_id]);

  useEffect(() => {
    if (success === 'S-20025' || simulation_id) {
      dispatch(simulationProgressRequest({simulation_id: simulation_id!}));
    }
  }, [simulation_id, success]);

  useEffect(() => {
    if (!isProgressLoading) {
      setHasFetchedProgress(true);
    }
  }, [isProgressLoading]);

  useEffect(() => {
    if (authData?.id && projectId && !currentProject && !isProjectLoading && !hasRequestedProjectListRef.current) {
      hasRequestedProjectListRef.current = true;
      dispatch(getAllProjectListRequest());
    }
  }, [authData?.id, projectId, currentProject, isProjectLoading, dispatch]);

  useEffect(() => {
    if (!isDgSizingLoading && hasFetchedProgress) {
      setShowInitialLoader(false);
    }
  }, [isDgSizingLoading, hasFetchedProgress]);

  useEffect(() => {
    if (hasPersistedSizing) {
      const initialState = {
        bessMin: Number(sizingData?.bess_min),
        bessMax: Number(sizingData?.bess_max),
        dgMin: sizingData?.dg_min !== undefined && sizingData?.dg_min !== null ? Number(sizingData.dg_min) : 0,
        dgMax: sizingData?.dg_max !== undefined && sizingData?.dg_max !== null ? Number(sizingData.dg_max) : 200,
        stepSize: Number(sizingData?.dg_step_size) || 5,
      };

      setBessMin(initialState.bessMin);
      setBessMax(initialState.bessMax);
      setDgMin(initialState.dgMin);
      setDgMax(initialState.dgMax);
      setStepSize(initialState.stepSize || 5);

      setSavedState(initialState);
      setIsDirty(false);
    } else {
      // If no sizingData (first time), set savedState to null and isDirty true (enable Save)
      setSavedState(null);
      setIsDirty(true);
    }
  }, [hasPersistedSizing, sizingData]);

  useEffect(() => {
    // If no savedState (new project), keep isDirty true
    if (!savedState) {
      setIsDirty(true);
      return;
    }

    const currentState = {
      bessMin,
      bessMax,
      dgMin,
      dgMax,
      stepSize,
    };

    const isChanged = JSON.stringify(currentState) !== JSON.stringify(savedState);
    setIsDirty(isChanged);

    // If reverted to saved state, reset hasUserEditedSinceCompletion
    if (!isChanged && hasUserEditedSinceCompletion && !isPostSaveState) {
      setHasUserEditedSinceCompletion(false);
    }
  }, [bessMin, bessMax, dgMin, dgMax, stepSize, savedState, hasUserEditedSinceCompletion]);

  const step = 5;

  const format = (val: number) => Number(val.toFixed(2));

  const getCurrentSizingValues = () => ({
    bessMin,
    bessMax,
    dgMin,
    dgMax,
    stepSize,
  });

  const restoreSizingValues = (values: ReturnType<typeof getCurrentSizingValues>) => {
    setBessMin(values.bessMin);
    setBessMax(values.bessMax);
    setDgMin(values.dgMin);
    setDgMax(values.dgMax);
    setStepSize(values.stepSize);
  };

  const updateSizingField = (setter: (value: number) => void, value: number) => {
    const previousValues = getCurrentSizingValues();
    setter(value);
    setIsPostSaveState(false);
    // Mark that user has edited since last completion
    if (!hasUserEditedSinceCompletion) setHasUserEditedSinceCompletion(true);
    if (!isDirty) setIsDirty(true);
    requestChangeConfigurationConfirmation({
      onStay: () => restoreSizingValues(previousValues),
    });
  };

  const options = useMemo(
    () =>
      bessSavedData?.containers?.map((container: BessContainer) => {
        const is2Hour = container.id === 1;

        return {
          id: container.id,
          duration: is2Hour ? '2-hour' : '4-hour',
          detail: is2Hour ? '(2h (0.5C))' : '(4h (0.25C))',
          range: `${bessMin / 5}-${bessMax / 5} containers`,
        };
      }) || [],
    [bessMax, bessMin, bessSavedData?.containers],
  );

  const durationText = options.map((item: any) => `${item?.duration} ${item?.detail}`).join(', ');

  const handleSave = () => {
    if (!simulation_id) return;

    const payload = {
      simulation_id: simulation_id,
      bess_min: bessMin,
      bess_max: bessMax,
      dg_min: hasGenerator ? dgMin : null,
      dg_max: hasGenerator ? dgMax : null,
      dg_step_size: hasGenerator ? stepSize : 5,
    };
    dispatch(dgSizingRequest(payload));
    // mark as saved
    setSavedState({
      bessMin,
      bessMax,
      dgMin,
      dgMax,
      stepSize,
    });

    setIsDirty(false);
    setIsPostSaveState(true);
    setRunSimulationDisabled(false); // Re-enable Run Simulation after save
    // Do NOT reset hasUserEditedSinceCompletion here; only reset on simulation completion
  };

  const BESS_STEP = 5;

  // BESS Sizes

  // Store previous simulation overview values
  const [simOverview, setSimOverview] = useState({
    bessSizes: Math.floor((bessMax - bessMin) / BESS_STEP) + 1,
    durations: options?.length,
    dgSizes: hasGenerator ? Math.floor((dgMax - dgMin) / (stepSize || 5)) + 1 : 1,
    totalConfigs: 0,
    formattedRuntime: '',
  });

  // Memoize error checks to avoid new object/element on every render
  const hasBessError = useMemo(() => bessMin > bessMax, [bessMin, bessMax]);
  const hasDgError = useMemo(() => hasGenerator && dgMin > dgMax, [hasGenerator, dgMin, dgMax]);

  // Step size fit error: (dgMax - dgMin) / stepSize must be whole number
  const stepSizeFitError = hasGenerator && dgMax - dgMin > 0 && (dgMax - dgMin) % stepSize !== 0;
  const hasConfigurationError = hasBessError || hasDgError || stepSizeFitError;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  const shouldShowExternalSimulationMessage = !isSimulationRunning && (isBlocked || shouldBlock);

  useEffect(() => {
    // Only recalculate if there are no errors
    if (hasBessError || hasDgError) {
      return; // Don't update simOverview
    }
    const bessSizes = Math.floor((bessMax - bessMin) / BESS_STEP) + 1;
    const durations = options?.length;
    const dgSizes = hasGenerator ? Math.floor((dgMax - dgMin) / (stepSize || 5)) + 1 : 1;
    const totalConfigs = bessSizes * durations * dgSizes;
    const runtimeSeconds = totalConfigs * 0.141;
    const formattedRuntime = runtimeSeconds > 60 ? `${Math.floor(runtimeSeconds / 60)} minutes` : `${Math.floor(runtimeSeconds)} seconds`;
    // Only update if values actually changed
    setSimOverview(prev => {
      if (
        prev.bessSizes === bessSizes &&
        prev.durations === durations &&
        prev.dgSizes === dgSizes &&
        prev.totalConfigs === totalConfigs &&
        prev.formattedRuntime === formattedRuntime
      ) {
        return prev;
      }
      return {
        bessSizes,
        durations,
        dgSizes,
        totalConfigs,
        formattedRuntime,
      };
    });
  }, [bessMin, bessMax, dgMin, dgMax, stepSize, options, hasGenerator, hasBessError, hasDgError]);

  const bessErrorMessage = () => {
    if (hasBessError) {
      return <ErrorMessage message={`Min Value should be less than or equal to max value`} />;
    }
  };

  const dgErrorMessage = () => {
    if (hasDgError) {
      return <ErrorMessage message={`Min Value should be less than or equal to max value`} />;
    }
  };

  const isSetupIncomplete = !(loadProfileSaved || loadData) || !(solarProfileSaved || solarData) || !bessSavedData || !generatorSaved || !dispatchRuleSaved;
  const isInputDisabled = isReadOnly || isSetupIncomplete;
  const hasInitialData = sizingData !== undefined && sizingData !== null;

  if (showInitialLoader) {
    return <DGSizingGhostLoader />;
  }
  const overviewItems = [
    {
      id: 1,
      title: 'BESS Sizes',
      value: simOverview.bessSizes,
      icon: 'big-battery',
      iconBg: 'bg-[linear-gradient(138.61deg,_#FDF7FF_-31.06%,_#EBD4FF_153.29%,_#D084FF_314.48%)]',
      iconColor: 'text-[#A855F7]',
    },
    {
      id: 2,
      title: 'Durations',
      value: simOverview.durations,
      icon: 'clock',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F9FFF7_-31.06%,_#E2FFD4_153.29%,_#74FF7E_314.48%)]',
      iconColor: 'text-[#289106]',
    },
    {
      id: 3,
      title: 'DG Sizes',
      value: simOverview.dgSizes,
      icon: 'gear-drop',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F7FAFF_-31.06%,_#D4E1FF_153.29%,_#74B0FF_314.48%)]',
      iconColor: 'text-blue',
    },
    {
      id: 4,
      title: 'Total Configs',
      value: simOverview.totalConfigs,
      icon: 'signal-full',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F7FFFF_-31.06%,_#D4FFF2_153.29%,_#74B0FF_314.48%)]',
      iconColor: 'text-[#148C7E]',
      valueClass: 'text-[#2F9C8F]',
    },
  ];

  return (
    <div>
      <div className="bg-[#F7FDFC] p-4 mt-5 border-[1.4px] border-[#B6D7D3] rounded-[12px] w-full">
        <div className="flex items-center gap-3">
          <Icon name="sliders" className="text-black! size-6.75!" />
          <Text variant={'h4'} className="font-SpaceGroteskBold">
            Configuration Range
          </Text>
        </div>
        <div className="flex flex-col xl:flex-row gap-4 mt-1 items-stretch">
          <div className="bg-white p-4 mt-5 border-[1.4px] border-[#E2E4EA] rounded-[12px] w-full xl:w-1/2 tabular-nums flex flex-col h-full">
            <Text variant={'body1'} className="text-primary! font-InterSemiBold!">
              BESS Capacity Range
            </Text>
            <div className="flex gap-4 mt-6">
              <div className="w-[50%]">
                <TextInput
                  label="Min (MWh)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  value={String(bessMin)}
                  showStepper
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  integer
                  min={5}
                  max={500}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= 5 && num <= 500) {
                      updateSizingField(setBessMin, num);
                    }
                  }}
                  onIncrement={() => {
                    updateSizingField(setBessMin, format(Math.min(500, bessMin + step)));
                  }}
                  onDecrement={() => {
                    updateSizingField(setBessMin, format(Math.max(5, bessMin - step)));
                  }}
                  onBlur={() => {
                    updateSizingField(setBessMin, format(Math.max(5, Math.min(500, bessMin))));
                  }}
                  className="w-full! tabular-nums"
                  wrapperClassName={hasBessError ? 'border-error!' : undefined}
                  decrementDisabled={bessMin <= 5 || isInputDisabled}
                  incrementDisabled={bessMin >= 500 || isInputDisabled}
                  disabled={isInputDisabled}
                />
              </div>
              <div className="w-[50%]">
                <TextInput
                  label="Max (MWh)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  value={String(bessMax)}
                  integer
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  showStepper
                  min={bessMin}
                  max={1000}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= bessMin && num <= 1000) {
                      updateSizingField(setBessMax, num);
                    }
                  }}
                  onIncrement={() => {
                    updateSizingField(setBessMax, format(Math.min(1000, bessMax + step)));
                  }}
                  onDecrement={() => {
                    updateSizingField(setBessMax, format(Math.max(bessMin, bessMax - step)));
                  }}
                  onBlur={() => {
                    updateSizingField(setBessMax, format(Math.max(bessMin, Math.min(1000, bessMax))));
                  }}
                  className="w-full! tabular-nums"
                  decrementDisabled={bessMax <= bessMin || isInputDisabled}
                  incrementDisabled={bessMax >= 1000 || isInputDisabled}
                  disabled={isInputDisabled}
                />
              </div>
            </div>
            {bessErrorMessage() && <div className="mt-2">{bessErrorMessage()}</div>}

            <div className="border-l-primary bg-primary-tint-2 border border-l-2 rounded-md border-[#E2E4EA] mt-7 p-4">
              <div className="flex items-center gap-3">
                <Icon name="layers" className="text-text-primary! size-5!" />
                <Text variant={'caption'} className="font-InterSemiBold! text-text-primary!">
                  Preview
                </Text>
              </div>
              <div className="mt-3 flex flex-col md:flex-row gap-4">
                {options.map(item => (
                  <div
                    key={item.id}
                    className={`w-full px-0! min-h-10 rounded-[16px] bg-white py-3! text-center shadow-[0px_1px_1px_0px_#B0B0B017]! flex items-center justify-center ${
                      options.length > 1 ? 'md:flex-1' : 'md:flex-none md:w-[calc(50%-0.5rem)]'
                    }`}>
                    <Text variant="small" className="text-[#4B5563]! leading-5 font-InterSemiBold! flex gap-3 xl:flex xl:flex-col xl:gap-0">
                      <span className="block">
                        {item.duration} {item.detail}:
                      </span>
                      <span className="block">{item.range}</span>
                    </Text>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Icon name="circle-info" className="text-primary! size-4!" />
                <Text variant={'small'} className="font-InterRegular! text-[#4B5563]!">
                  <span className="font-InterSemiBold! text-[#4B5563]!">Duration Classes :</span>{' '}
                  <span className="font-InterRegular! text-text-primary!">{durationText}</span>
                </Text>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 mt-5 border-[1.4px] border-[#E2E4EA] rounded-[12px] w-full xl:w-1/2 tabular-nums flex flex-col">
            <Text variant={'body1'} style={{color: '#2F9C8F', fontSize: '16px', lineHeight: '30px'}} className="font-InterSemiBold!">
              DG Capacity Range
            </Text>
            {hasGenerator ? (
              <>
                <div className="flex gap-4 my-3">
                  <div className="w-[50%]">
                    <TextInput
                      label="Min (MWh)"
                      labelClassName="text-text-secondary! font-InterMedium!"
                      value={String(dgMin)}
                      integer
                      readonly
                      readOnlyClassName="bg-white border-1!"
                      showStepper
                      min={0}
                      max={200}
                      onChange={val => {
                        const num = Number(val);
                        if (!Number.isNaN(num) && num >= 0 && num <= 200) {
                          updateSizingField(setDgMin, num);
                        }
                      }}
                      onIncrement={() => {
                        updateSizingField(setDgMin, format(Math.min(200, dgMin + step)));
                      }}
                      onDecrement={() => {
                        updateSizingField(setDgMin, format(Math.max(0, dgMin - step)));
                      }}
                      onBlur={() => {
                        updateSizingField(setDgMin, format(Math.max(0, Math.min(200, dgMin))));
                      }}
                      className="w-full! tabular-nums"
                      wrapperClassName={hasDgError ? 'border-error!' : undefined}
                      decrementDisabled={dgMin <= 0 || isInputDisabled}
                      incrementDisabled={dgMin >= 200 || isInputDisabled}
                      disabled={isInputDisabled}
                    />
                  </div>
                  <div className="w-[50%]">
                    <TextInput
                      label="Max (MWh)"
                      labelClassName="text-text-secondary! font-InterMedium!"
                      value={String(dgMax)}
                      integer
                      readonly
                      readOnlyClassName="bg-white border-1!"
                      showStepper
                      min={dgMin}
                      max={200}
                      onChange={val => {
                        const num = Number(val);
                        if (!Number.isNaN(num) && num >= dgMin && num <= 200) {
                          updateSizingField(setDgMax, num);
                        }
                      }}
                      onIncrement={() => {
                        updateSizingField(setDgMax, format(Math.min(200, dgMax + step)));
                      }}
                      onDecrement={() => {
                        updateSizingField(setDgMax, format(Math.max(dgMin, dgMax - step)));
                      }}
                      onBlur={() => {
                        updateSizingField(setDgMax, format(Math.max(dgMin, Math.min(200, dgMax))));
                      }}
                      className="w-full! tabular-nums"
                      wrapperClassName={hasDgError ? 'border-error!' : undefined}
                      decrementDisabled={dgMax <= dgMin || isInputDisabled}
                      incrementDisabled={dgMax >= 200 || isInputDisabled}
                      disabled={isInputDisabled}
                    />
                  </div>
                </div>
                {dgErrorMessage() && <div className="my-2">{dgErrorMessage()}</div>}

                <SelectInput
                  label="Step Size (MW)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  placeholder="Select step size"
                  required
                  options={[
                    {id: 5, label: '5 MW'},
                    {id: 10, label: '10 MW'},
                    {id: 25, label: '25 MW'},
                  ]}
                  value={stepSize}
                  onChange={item => updateSizingField(setStepSize, Number(item?.id))}
                  disabled={isInputDisabled}
                  wrapperClassName={stepSizeFitError ? 'border-error!' : undefined}
                />
                {stepSizeFitError && (
                  <div className="mt-2">
                    <ErrorMessage message="Step size needs to be adjusted to fit evenly within the selected DG range." />
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[#F8FCFF] border border-[#E2E4EA] rounded-[12px] flex flex-1 items-center justify-center w-full px-[14px] py-4 mt-6">
                <div className="flex flex-col items-center text-center w-full max-w-[360px] gap-2">
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mb-1">
                    <circle cx="10" cy="10" r="9" stroke="#2F9C8F" strokeWidth="2" />
                    <circle cx="10" cy="6.15" r="1.1" fill="#2F9C8F" />
                    <rect x="9.15" y="8.2" width="1.7" height="6.05" rx="0.85" fill="#2F9C8F" />
                  </svg>
                  <Text variant={'h4'} style={{color: '#2F9C8F', fontSize: '18px', lineHeight: '24px'}} className="font-InterSemiBold!">
                    DG Disabled
                  </Text>
                  <Text variant={'small'} style={{color: '#6B7280', fontSize: '12px', lineHeight: '24px'}} className="font-InterRegular!">
                    Running Solar + BESS only configuration
                  </Text>
                  <Text variant={'small'} style={{color: '#101329', fontSize: '14px', lineHeight: '24px'}} className="font-InterRegular!">
                    Enable DG in Setup 1 to include generator
                  </Text>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full mt-7">
        <div className="flex items-center gap-2 mb-6">
          <Icon name="clipboardSearch" className="text-black! size-6.75!" />
          <Text variant="h4">Simulation Overview</Text>
        </div>

        {hasConfigurationError ? (
          <div className="flex justify-center">
            <div className="bg-[#FFF6F4]  border border-[#F7C9C4] rounded-md px-6 w-[60%] py-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <Icon name="warning-triangle-sharp" size={20} className="text-error-text! shrink-0" />
                <Text variant="body1" className="text-error-text! font-InterSemiBold!">
                  Invalid configuration
                </Text>
              </div>
              <Text variant="body2" className="mt-2 text-text-primary! font-InterRegular!">
                Please review your inputs and fix the highlighted fields to continue.
              </Text>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6">
              {overviewItems.map((item: any) => (
                <div key={item.id}>
                  <div className="flex items-start gap-3">
                    <div className={`size-8 rounded-md flex items-center justify-center ${item.iconBg}`}>
                      <Icon name={item.icon} className={`size-4 ${item.iconColor}`} />
                    </div>

                    <div className="flex flex-col">
                      <Text variant="14R" className="text-text-secondary!">
                        {item.title}
                      </Text>

                      <Text variant="h2" className={`mt-1.5 font-InterSemiBold! ${item.valueClass ?? 'text-text-primary!'}`}>
                        {item.value}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-6 text-sm text-gray-500">
              <Icon name="clock" className="text-primary! size-4!" />
              <Text variant="small" className="text-text-secondary! font-InterMedium!">
                Estimated runtime : <span className="font-medium text-text-primary!">~{simOverview.formattedRuntime}</span>
              </Text>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-5">
        {/* Show Save and Continue and Run Sizing Simulation buttons only if not running, not showing completion, not assigned user, not blocked, and not shouldShowCompletionSummary */}
        {!isSimulationRunning && !showCompletionProgress && !shouldShowCompletionSummary && !isReadOnly && !isBlocked && (
          <Button
            variant="secondary"
            size="md"
            disabled={isSetupIncomplete || !isDirty || !!bessErrorMessage() || !!dgErrorMessage() || stepSizeFitError}
            onClick={handleSave}
            className="self-center w-40 flex justify-center">
            Save
          </Button>
        )}

        {!isSimulationRunning && !showCompletionProgress && !shouldShowCompletionSummary && !isBlocked && (
          <Button
            size="md"
            className="w-50 my-6 flex justify-center"
            disabled={runSimulationDisabled || isReadOnly || isDirty || (!sizingData && success !== 'S-20025') || !!bessErrorMessage() || !!dgErrorMessage()}
            onClick={handleRunSizingSimulation}>
            Start Simulation
          </Button>
        )}
      </div>

      {/* Show blocking message if locked for other users */}
      {shouldShowExternalSimulationMessage && (
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <Icon name="infoCircle" className="size-4.5! text-warning!" />
            <Text variant="14M" className="text-warning!">
              Another simulation is currently running. You'll be able to start a new one once it finishes. Please check back later.
            </Text>
          </div>
        </div>
      )}

      {/* Full-screen overlay when simulation is running or locked for other users */}
      {(isSimulationRunning || isBlocked || shouldBlock) &&
        createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}

      {/* Progress/Completion UI logic */}
      {(isSimulationRunning ||
        (simulationProgress > 0 && !showCompletionSummary && !shouldShowCompletionSummary) ||
        showCompletionProgress ||
        shouldShowCompletionSummary) && (
        <>
          {/* Show progress bar and config details while running or for 3s after completion */}
          {(isSimulationRunning || showCompletionProgress) && (
            <div ref={progressContainerRef} className={`mt-1 ${isSimulationRunning ? 'bg-white! z-100 relative p-4' : ''}`}>
              <Text variant="h3">{isSimulationRunning ? ' Configuration Under Progress... ' : ' Completed Configuration Successfully... '}</Text>
              <div className="h-7 w-full rounded-full border border-[#CCE9E6] bg-white px-2.5 py-1.5 shadow-[0px_2px_8px_0px_rgba(47,156,143,0.16)] mt-3">
                <div className="h-3 rounded-full bg-[#E9FFFD]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7BEEE3_0%,#6DEBDE_25.16%,#2F9C8F_100%)] transition-[width] duration-150 ease-linear"
                    style={{width: `${simulationProgress}%`}}
                  />
                </div>
              </div>
              {/* Show config details and stop button only while running, not after completion */}
              {isSimulationRunning && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <Text variant="body2" className="font-InterMedium! text-[#344054]!">
                      Config {currentConfig}/{totalConfig}
                      {/* commented below until socket issue is fixed */}: {currentBess} MWh, {currentDuration}hr
                    </Text>
                    <Text variant="body2" className="font-InterSemiBold! text-[#00B99F]!">
                      {simulationProgress}%
                    </Text>
                  </div>
                  <div className="mt-4 flex gap-6 items-center justify-center">
                    <Button
                      variant="destructive"
                      size="md"
                      onClick={handleOpenStopSimulation}
                      rightIcon="stop-circle"
                      iconClassName="size-5!"
                      className="w-51.75 justify-center gap-4">
                      Stop Simulation
                    </Button>
                    <Button variant="primary" size="md" onClick={onNextToRunSimulation} disabled>
                      Next → View Results
                    </Button>
                  </div>
                  {isStopSimulationOpen && <StopSimulation open={isStopSimulationOpen} onCancel={handleCancelStopSimulation} onStop={handleStopSimulation} />}
                </>
              )}
              {/* If not running (just completed), hide config details and stop button, enable Next button */}
              {!isSimulationRunning && (
                <div className="mt-4 flex gap-6 items-center justify-center">
                  <Button variant="primary" size="md" onClick={onNextToRunSimulation}>
                    Next → View Results
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* After 3s, show only the completion summary, or show persisted completion summary if simulation is completed in backend and not dirty */}
          {!isProgressLoading && shouldShowCompletionSummary ? (
            <>
              <div className="mt-4 flex justify-center">
                <div className="bg-primary-tint-2 p-3 flex items-center gap-3 w-fit rounded-sm">
                  <Icon name="circle-check-big" className="text-success! mt-0.5!" size={18} />
                  <Text variant="16M" className="font-InterMedium!">
                    Simulation completed <div className="bg-[#44AA6F] inline-block mx-2.5 rounded-full h-2 w-2" />{' '}
                    {totalConfig || simulProgressData?.total_config} Configurations processed
                  </Text>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <Button variant="primary" size="md" onClick={onNextToRunSimulation}>
                  Next → View Results
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
};
