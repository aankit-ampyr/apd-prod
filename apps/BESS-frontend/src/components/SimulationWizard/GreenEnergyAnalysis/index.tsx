import {DGDriggerType, DGRunScheduleMode, LoadProfilePattern, LoadServingPriority} from '@/constants';
import {
  bessContainerConfigData,
  editedStepData,
  generatorData,
  greenAnalysisData,
  greenAnalysisProgressData,
  greenAnalysisSuccess,
  initiateSimulationData,
  projectSimulationData,
  showGreenAnalysisResults,
  simulationProjectLoading,
} from '@/services/redux/selectors/simulationWizardSelector';
import {
  clearGreenAnalysisProgressData,
  editedStepSimulationDataRequest,
  getGreenAnalysisProgressSilentRequest,
  getGreenAnalysisSilentRequest,
  greenAnalysisDataRequest,
  greenAnalysisProgressRequest,
  greenAnalysisRequest,
  setShowGreenAnalysisResults,
} from '@/services/redux/slice/simulationWizardSlice';
import {Alert, Button, Checkbox, Icon, IconTypes, SelectInput, Skeleton, Text, TextInput, Tooltip} from '@/ui-kits';
import {RootState} from '@/services/redux/rootReducer';
import {Images} from '@lazarus/react-common';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDispatch, useSelector} from 'react-redux';
import {GreenEnergyAnalysisResult} from './SimulationResult';
import {useGreenEnergyAnalysisSimulation} from './hooks/useGreenEnergyAnalysisSimulation';
import {StopSimulation} from '../DGSizing/StopSimulation';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {useSimulationStatus} from '../SimulationStatusContext';

interface BessContainer {
  id: number;
}

const ErrorMessage = ({message}: {message: string}) => (
  <div className="flex items-start gap-2 mt-3 text-error-text!">
    <Icon name="infoCircle" className="text-error-text! size-4 mt-1" />
    <Text variant="caption" className="text-error-text! font-InterMedium!">
      {message}
    </Text>
  </div>
);

function GreenAnalysisGhostLoader() {
  return (
    <div>
      <Skeleton animation="wave" variant="rounded" width={520} height={18} className="rounded-full! mt-1" />

      <div className="rounded-md border border-l-3 border-blue bg-[#F8FCFF] p-3 mt-8 mb-8">
        <div className="flex items-start gap-3.5">
          <Skeleton animation="wave" variant="circular" width={20} height={20} className="mt-1" />
          <Skeleton animation="wave" variant="rounded" width="100%" height={24} className="rounded-full!" />
        </div>
      </div>

      <Skeleton animation="wave" variant="rounded" width="100%" height={76} className="rounded-md!" />

      <div className="bg-[#F7FDFC] p-4 mt-5 border-[1.4px] border-[#B6D7D3] rounded-lg">
        <div className="flex items-center gap-3">
          <Skeleton animation="wave" variant="rounded" width={28} height={28} className="rounded-md!" />
          <Skeleton animation="wave" variant="rounded" width={220} height={24} className="rounded-full!" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
          {Array.from({length: 4}).map((_, index) => (
            <div key={index} className="bg-white p-4 border-[1.4px] border-border rounded-md">
              <Skeleton animation="wave" variant="rounded" width={180} height={20} className="rounded-full!" />
              <div className="mt-4 flex flex-col gap-3">
                <Skeleton animation="wave" variant="rounded" width="100%" height={44} className="rounded-lg!" />
                <Skeleton animation="wave" variant="rounded" width="100%" height={44} className="rounded-lg!" />
                <Skeleton animation="wave" variant="rounded" width="100%" height={44} className="rounded-lg!" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Skeleton animation="wave" variant="rounded" width="100%" height={230} className="rounded-2xl! mt-6" />

      <div className="flex justify-center gap-3 mt-3">
        <Skeleton animation="wave" variant="rounded" width={120} height={44} className="rounded-md!" />
        <Skeleton animation="wave" variant="rounded" width={220} height={44} className="rounded-md!" />
      </div>
    </div>
  );
}

export const GreenEnergyAnalysis = ({setIsStepsHidden}: {setIsStepsHidden: (hidden: boolean) => void}) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  const bessSavedData = useSelector(bessContainerConfigData);
  const saveSuccess = useSelector(greenAnalysisSuccess);
  const greenAnalysis = useSelector(greenAnalysisData);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const dgData = useSelector(generatorData);
  const showResults = useSelector(showGreenAnalysisResults);
  const progressData = useSelector(greenAnalysisProgressData);
  const isGreenAnalysisDataLoading = useSelector((state: RootState) => state.simulationWizard.greenAnalysisDataLoading);
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const isProSimulLoading = useSelector(simulationProjectLoading);

  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find((project: any) => Number(project?.id) === projectId);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some((user: any) => user.id === authData.id));
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isReadOnly = isAssignedUser || isProjectAssignmentPending;
  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus() ?? {};
  const stepData = useSelector(editedStepData);

  const simulationProgress = simulData?.progress ?? proSimulData?.progress;
  const hasGenerator = dgData?.is_included;

  const simulation_id = simulData?.id ?? proSimulData?.id;

  const greenAnalysisCompleted = progressData?.status === 2;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  const handleGreenAnalysisCompleted = useCallback(() => {
    setHasUserEditedAfterCompletion(false);

    dispatch(setShowGreenAnalysisResults(false));
    if (!simulation_id) return;

    dispatch(getGreenAnalysisSilentRequest({simulation_id: Number(simulation_id)}));
    dispatch(getGreenAnalysisProgressSilentRequest({simulation_id: Number(simulation_id)}));
  }, [dispatch, simulation_id]);

  const handleGreenAnalysisStopped = useCallback(() => {
    setHasUserEditedAfterCompletion(false);
    dispatch(setShowGreenAnalysisResults(false));
    dispatch(clearGreenAnalysisProgressData());
  }, [dispatch]);

  const {
    currentBess,
    currentConfig,
    currentDg,
    currentDuration,
    currentSolar,
    handleCancelStopSimulation,
    handleOpenStopSimulation,
    handleRunGreenAnalysis,
    handleStopGreenAnalysis,
    isBlocked,
    isSimulationRunning,
    isStopSimulationOpen,
    progressContainerRef,
    runSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    isCurrentUserOwner,
    simulationProgress: greenAnalysisProgress,
    totalConfig,
    stopSimulationStatus,
    handleCloseStoppedPopup,
    setShowCompletionSummary,
    isOwnerRunning,
  } = useGreenEnergyAnalysisSimulation({
    simulationId: simulation_id,
    onSimulationCompleted: handleGreenAnalysisCompleted,
    onSimulationStopped: handleGreenAnalysisStopped,
  });

  const hideSimulationCTAs = isOwnerRunning;

  const shouldShowResults = showResults && (greenAnalysisCompleted || showCompletionSummary);

  const [savedState, setSavedState] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(true);
  const [hasUserEditedAfterCompletion, setHasUserEditedAfterCompletion] = useState(false);

  const [solarMin, setSolarMin] = useState<number>(50);
  const [solarMax, setSolarMax] = useState<number>(90);
  const [solarStep, setSolarStep] = useState<number>(5);

  const [bessMin, setBessMin] = useState<number>(25);
  const [bessMax, setBessMax] = useState<number>(150);

  const [dgMin, setDgMin] = useState<number>(0);
  const [dgMax, setDgMax] = useState<number>(200);
  const [dgStep, setDgStep] = useState<number>(5);

  const [minGreenEnergy, setMinGreenEnergy] = useState<number>(50);

  const [maxWastage, setMaxWastage] = useState<number>(20);
  const [isMaxWastageEnabled, setIsMaxWastageEnabled] = useState(false);

  const shouldPromptChangeConfirmation = !isSimulationRunning && (greenAnalysisCompleted || showCompletionSummary);
  const shouldShowExternalSimulationMessage = !isSimulationRunning && (isBlocked || shouldBlock);

  const guardConfigurationChange = useCallback(
    (onStay: () => void) => {
      if (!shouldPromptChangeConfirmation) {
        return;
      }

      setHasUserEditedAfterCompletion(true);
      requestChangeConfigurationConfirmation({
        forceOpen: true,
        onStay: () => {
          onStay();
          setHasUserEditedAfterCompletion(false);
        },
      });
    },
    [requestChangeConfigurationConfirmation, shouldPromptChangeConfirmation],
  );

  const updateSolarMin = useCallback(
    (value: number) => {
      const previousValue = solarMin;
      setSolarMin(value);
      guardConfigurationChange(() => setSolarMin(previousValue));
    },
    [guardConfigurationChange, solarMin],
  );

  const updateSolarMax = useCallback(
    (value: number) => {
      const previousValue = solarMax;
      setSolarMax(value);
      guardConfigurationChange(() => setSolarMax(previousValue));
    },
    [guardConfigurationChange, solarMax],
  );

  const updateSolarStep = useCallback(
    (value: number) => {
      const previousValue = solarStep;
      setSolarStep(value);
      guardConfigurationChange(() => setSolarStep(previousValue));
    },
    [guardConfigurationChange, solarStep],
  );

  const updateBessMin = useCallback(
    (value: number) => {
      const previousValue = bessMin;
      setBessMin(value);
      guardConfigurationChange(() => setBessMin(previousValue));
    },
    [bessMin, guardConfigurationChange],
  );

  const updateBessMax = useCallback(
    (value: number) => {
      const previousValue = bessMax;
      setBessMax(value);
      guardConfigurationChange(() => setBessMax(previousValue));
    },
    [bessMax, guardConfigurationChange],
  );

  const updateDgMin = useCallback(
    (value: number) => {
      const previousValue = dgMin;
      setDgMin(value);
      guardConfigurationChange(() => setDgMin(previousValue));
    },
    [dgMin, guardConfigurationChange],
  );

  const updateDgMax = useCallback(
    (value: number) => {
      const previousValue = dgMax;
      setDgMax(value);
      guardConfigurationChange(() => setDgMax(previousValue));
    },
    [dgMax, guardConfigurationChange],
  );

  const updateDgStep = useCallback(
    (value: number) => {
      const previousValue = dgStep;
      setDgStep(value);
      guardConfigurationChange(() => setDgStep(previousValue));
    },
    [dgStep, guardConfigurationChange],
  );

  const updateMinGreenEnergy = useCallback(
    (value: number) => {
      const previousValue = minGreenEnergy;
      setMinGreenEnergy(value);
      guardConfigurationChange(() => setMinGreenEnergy(previousValue));
    },
    [guardConfigurationChange, minGreenEnergy],
  );

  const updateMaxWastage = useCallback(
    (value: number) => {
      const previousValue = maxWastage;
      setMaxWastage(value);
      guardConfigurationChange(() => setMaxWastage(previousValue));
    },
    [guardConfigurationChange, maxWastage],
  );

  const updateMaxWastageEnabled = useCallback(
    (value: boolean) => {
      const previousValue = isMaxWastageEnabled;
      setIsMaxWastageEnabled(value);
      guardConfigurationChange(() => setIsMaxWastageEnabled(previousValue));
    },
    [guardConfigurationChange, isMaxWastageEnabled],
  );

  useEffect(() => {
    if (showResults) {
      setHasUserEditedAfterCompletion(false);
    }
  }, [showResults]);

  useEffect(() => {
    if (simulation_id) {
      dispatch(
        greenAnalysisDataRequest({
          simulation_id,
        }),
      );
    }
  }, [simulation_id]);

  useEffect(() => {
    if (simulation_id) {
      dispatch(editedStepSimulationDataRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    if (!greenAnalysisCompleted) {
      setShowCompletionSummary(false);
    }
  }, [greenAnalysisCompleted]);

  useEffect(() => {
    if (!simulation_id) return;
    dispatch(greenAnalysisProgressRequest({simulation_id: Number(simulation_id)}));
  }, [simulation_id]);

  useEffect(() => {
    if (stepData?.last_edited === 12) {
      setIsDirty(false);
    }
  }, [stepData?.last_edited]);

  useEffect(() => {
    if (!greenAnalysis) return;

    setSolarMin(Number(greenAnalysis.solar_min));
    setSolarMax(Number(greenAnalysis.solar_max));
    setSolarStep(Number(greenAnalysis.solar_step));

    setBessMin(Number(greenAnalysis.bess_min));
    setBessMax(Number(greenAnalysis.bess_max));

    setDgMin(Number(greenAnalysis.dg_min));
    setDgMax(Number(greenAnalysis.dg_max));
    setDgStep(Number(greenAnalysis.dg_step_size));

    setMinGreenEnergy(Number(greenAnalysis.min_green_energy));
    setIsMaxWastageEnabled(greenAnalysis.max_wastage !== null);

    setMaxWastage(greenAnalysis.max_wastage ?? 20);
    setHasUserEditedAfterCompletion(false);

    setIsDirty(false);
  }, [greenAnalysis]);

  useEffect(() => {
    if (showResults && !greenAnalysisCompleted && !showCompletionSummary) {
      dispatch(setShowGreenAnalysisResults(false));
    }
  }, [dispatch, greenAnalysisCompleted, showCompletionSummary, showResults]);

  useEffect(() => {
    if (!savedState) {
      setIsDirty(true);
      return;
    }

    const currentState = {
      solarMin,
      solarMax,
      solarStep,

      bessMin,
      bessMax,

      dgMin,
      dgMax,
      dgStep,

      minGreenEnergy,
      maxWastage,
      isMaxWastageEnabled,
    };

    setIsDirty(JSON.stringify(currentState) !== JSON.stringify(savedState));
  }, [solarMin, solarMax, solarStep, bessMin, bessMax, dgMin, dgMax, dgStep, minGreenEnergy, maxWastage, isMaxWastageEnabled, savedState]);

  // Memoize error checks to avoid new object/element on every render
  const hasSolarError = useMemo(() => solarMin > solarMax, [solarMin, solarMax]);
  const hasBessError = useMemo(() => bessMin > bessMax, [bessMin, bessMax]);
  const hasDgError = useMemo(() => dgMin > dgMax, [dgMin, dgMax]);

  const solarStepError = solarMax - solarMin > 0 && (solarMax - solarMin) % solarStep !== 0;
  const dgStepError = hasGenerator && dgMax - dgMin > 0 && (dgMax - dgMin) % dgStep !== 0;

  const hasStepError = solarStepError || dgStepError;

  const stepErrMsg = () => {
    if (hasStepError) {
      return <ErrorMessage message={`Step must fit evenly within the selected capacity range`} />;
    }
  };

  const errorMsg = () => {
    if (hasSolarError || hasBessError || hasDgError) {
      return <ErrorMessage message={`Min Value should be less than or equal to max value`} />;
    }
  };

  const hasConfigurationError = hasSolarError || hasBessError || hasDgError || hasStepError;

  const shouldShowCompletionSummary =
    !isSimulationRunning && !showCompletionProgress && (showCompletionSummary || greenAnalysisCompleted) && !hasUserEditedAfterCompletion;

  const completedConfig = greenAnalysisCompleted && greenAnalysis && !hasUserEditedAfterCompletion ? greenAnalysis : null;
  const displaySolarMin = Number(completedConfig?.solar_min ?? solarMin);
  const displaySolarMax = Number(completedConfig?.solar_max ?? solarMax);
  const displaySolarStep = Number(completedConfig?.solar_step ?? solarStep);
  const displayBessMin = Number(completedConfig?.bess_min ?? bessMin);
  const displayBessMax = Number(completedConfig?.bess_max ?? bessMax);
  const displayDgMin = Number(completedConfig?.dg_min ?? dgMin);
  const displayDgMax = Number(completedConfig?.dg_max ?? dgMax);
  const displayDgStep = Number(completedConfig?.dg_step_size ?? dgStep);

  const options = useMemo(
    () =>
      bessSavedData?.containers?.map((container: BessContainer) => {
        const is2Hour = container.id === 1;

        return {
          id: container.id,
          duration: is2Hour ? '2-hour' : '4-hour',
          detail: is2Hour ? '(2h (0.5C))' : '(4h (0.25C))',
          range: `${displayBessMin / 5}-${displayBessMax / 5} containers`,
        };
      }) || [],
    [bessSavedData?.containers, displayBessMax, displayBessMin],
  );

  const durationText = options.map((item: any) => `${item?.duration} ${item?.detail}`).join(', ');

  const format = (val: number) => Number(val.toFixed(2));

  const SOLAR_STEP = 10;
  const BESS_STEP = 5;
  const DG_STEP = 5;
  const PERCENT_STEP = 1;

  const solarSizes = Math.floor((displaySolarMax - displaySolarMin) / displaySolarStep) + 1;

  const bessSizes = Math.floor((displayBessMax - displayBessMin) / 5) + 1;

  const dgSizes = hasGenerator ? Math.floor((displayDgMax - displayDgMin) / displayDgStep) + 1 : 1;

  const durations = options?.length;

  const totalConfigurations = solarSizes * bessSizes * durations * dgSizes;
  const completedConfigurationCount = progressData?.total_config || totalConfig || totalConfigurations;

  const estimatedRuntimeSeconds = totalConfigurations * 0.05;

  const formattedRuntime =
    estimatedRuntimeSeconds > 60 ? `${Math.floor(estimatedRuntimeSeconds / 60)} minutes` : `${Math.floor(estimatedRuntimeSeconds)} seconds`;

  const overviewItems = [
    {
      id: 1,
      title: 'Solar Sizes',
      value: solarSizes,
      icon: 'sun',
      iconBg: 'bg-[linear-gradient(140.89deg,_#FFFBF7_-31.61%,_#FFEBD4_57.86%,_#FFE2C0_136.08%)]',
      iconColor: 'text-[#ED9024]',
    },
    {
      id: 2,
      title: 'BESS Sizes',
      value: bessSizes,
      icon: 'big-battery',
      iconBg: 'bg-[linear-gradient(138.61deg,_#FDF7FF_-31.06%,_#EBD4FF_153.29%,_#D084FF_314.48%)]',
      iconColor: 'text-[#A855F7]',
    },
    {
      id: 3,
      title: 'Durations',
      value: durations,
      icon: 'clock',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F9FFF7_-31.06%,_#E2FFD4_153.29%,_#74FF7E_314.48%)]',
      iconColor: 'text-[#289106]',
    },
    {
      id: 4,
      title: 'DG Sizes',
      value: dgSizes,
      icon: 'gear-drop',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F7FAFF_-31.06%,_#D4E1FF_153.29%,_#74B0FF_314.48%)]',
      iconColor: 'text-blue',
    },
    {
      id: 5,
      title: 'Total Configs',
      value: totalConfigurations,
      icon: 'signal-full',
      iconBg: 'bg-[linear-gradient(138.61deg,_#F7FFFF_-31.06%,_#D4FFF2_153.29%,_#74B0FF_314.48%)]',
      iconColor: 'text-[#148C7E]',
      valueClass: 'text-[#2F9C8F]',
    },
  ];

  const handleSave = () => {
    if (!simulation_id) return;
    const payload = {
      simulation_id,

      solar_min: solarMin,
      solar_max: solarMax,
      solar_step: solarStep,

      bess_min: bessMin,
      bess_max: bessMax,

      dg_min: dgMin,
      dg_max: dgMax,
      dg_step_size: dgStep,

      min_green_energy: minGreenEnergy,
      max_wastage: isMaxWastageEnabled ? maxWastage : null,
    };

    dispatch(greenAnalysisRequest(payload));

    setSavedState({
      solarMin,
      solarMax,
      solarStep,

      bessMin,
      bessMax,

      dgMin,
      dgMax,
      dgStep,

      minGreenEnergy,
      maxWastage,
      isMaxWastageEnabled,
    });

    setIsDirty(false);
  };

  const shouldShowInitialLoader = isGreenAnalysisDataLoading || isProSimulLoading || !proSimulData?.project_id || !currentProject;
  if (shouldShowInitialLoader) {
    return <GreenAnalysisGhostLoader />;
  }

  if (Number(simulationProgress) < 5) {
    return (
      <>
        {shouldShowExternalSimulationMessage && (
          <div className="flex justify-center">
            <Alert
              textClassName="text-error-text! text-[14px]!"
              iconClassName="mt-0! size-4.5!"
              iconName="warning-triangle-sharp"
              message={`${userName} is currently running this simulation. You can run it again once it completes`}
              variant="error"
              className={`w-fit! justify-center items-center! p-3! border-0.5 border-error/20`}
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-center min-h-full! gap-4 py-10">
          <img src={Images.sliders} alt="No Simulations" className="w-22" />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            Complete Step 1 & Step 2 to generate and view configuration results.{' '}
          </Text>
        </div>
        {(isSimulationRunning || isBlocked || shouldBlock) &&
          createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
      </>
    );
  }

  if (shouldShowResults) {
    return <GreenEnergyAnalysisResult setIsStepsHidden={setIsStepsHidden} />;
  }

  return (
    <div className="main">
      <Text variant="14R" className="text-text-secondary! w-[65%]! xl:w-full">
        Find optimal Solar + BESS + DG configurations to meet green energy targets with acceptable wastage levels.
      </Text>
      {shouldShowExternalSimulationMessage && (
        <div className="flex justify-center mt-3">
          <Alert
            textClassName="text-error-text! text-[14px]!"
            iconClassName="mt-0! size-4.5!"
            iconName="warning-triangle-sharp"
            message={`${userName} is currently running this simulation. You can run it again once it completes`}
            variant="error"
            className={`w-fit! justify-center items-center! p-3! border-0.5 border-error/20`}
          />
        </div>
      )}
      <div className="rounded-md border border-l-3 border-blue bg-[#F8FCFF] p-3 mt-8 mb-8">
        <div className="flex items-start gap-3.5">
          <Icon name="circle-info" size={20} className="text-blue mt-1" />
          <Text variant="16R" className="text-text-primary!">
            You are viewing Green Energy Analysis based on the completed configurations from Step 1 and Step 2. If you make any changes to those steps, please
            save them to refresh and update the analysis shown here.
          </Text>
        </div>
      </div>

      <SimulationConfigurationSummary />

      <div className="bg-[#F7FDFC] p-4 mt-5 border-[1.4px] border-[#B6D7D3] rounded-lg">
        <div className="flex items-center gap-3">
          <Icon name="sliders" className="size-6.75!" />
          <Text variant="h4">Configuration Range</Text>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white p-4 border-[1.4px] border-border rounded-md flex flex-col h-full self-start w-full">
            <Text variant="body1" className="text-[#0B7E70]! font-InterSemiBold!">
              <span className="text-text-primary!"> 1. </span>Solar Capacity Range
            </Text>

            <div className="mt-4">
              <TextInput
                label="Min (MWp)"
                labelClassName="text-text-secondary! font-InterMedium!"
                value={String(solarMin)}
                integer
                showStepper
                readonly
                readOnlyClassName="bg-white border-1!"
                className="w-full!"
                min={10}
                max={500}
                onChange={val => {
                  const num = Number(val);
                  if (!Number.isNaN(num) && num >= 10 && num <= 500) {
                    updateSolarMin(num);
                  }
                }}
                onIncrement={() => {
                  updateSolarMin(format(Math.min(500, solarMin + SOLAR_STEP)));
                }}
                onDecrement={() => {
                  updateSolarMin(format(Math.max(10, solarMin - SOLAR_STEP)));
                }}
                onBlur={() => {
                  updateSolarMin(format(Math.max(10, Math.min(500, solarMin))));
                }}
                decrementDisabled={solarMin <= 10 || isReadOnly}
                incrementDisabled={solarMin >= 500 || isReadOnly}
                wrapperClassName={hasSolarError ? 'border-error!' : undefined}
              />
            </div>
            {hasSolarError && <div className="mt-2">{errorMsg()}</div>}

            <div className="mt-4">
              <TextInput
                label="Max (MWp)"
                labelClassName="text-text-secondary! font-InterMedium!"
                value={String(solarMax)}
                integer
                showStepper
                readonly
                readOnlyClassName="bg-white border-1!"
                className="w-full!"
                min={solarMin}
                max={500}
                onChange={val => {
                  const num = Number(val);
                  if (!Number.isNaN(num) && num >= solarMin && num <= 500) {
                    updateSolarMax(num);
                  }
                }}
                onIncrement={() => {
                  updateSolarMax(format(Math.min(500, solarMax + SOLAR_STEP)));
                }}
                onDecrement={() => {
                  updateSolarMax(format(Math.max(solarMin, solarMax - SOLAR_STEP)));
                }}
                onBlur={() => {
                  updateSolarMax(format(Math.max(solarMin, Math.min(500, solarMax))));
                }}
                decrementDisabled={solarMax <= solarMin || isReadOnly}
                incrementDisabled={solarMax >= 500 || isReadOnly}
              />
            </div>

            <div className="mt-4">
              <SelectInput
                label="Step Size (MWp)"
                labelClassName="text-text-secondary! font-InterMedium!"
                options={[
                  {id: 5, label: '5'},
                  {id: 10, label: '10'},
                  {id: 15, label: '15'},
                  {id: 20, label: '20'},
                  {id: 25, label: '25'},
                  {id: 30, label: '30'},
                  {id: 35, label: '35'},
                  {id: 40, label: '40'},
                  {id: 45, label: '45'},
                  {id: 50, label: '50'},
                ]}
                value={solarStep}
                onChange={item => updateSolarStep(Number(item?.id))}
                wrapperClassName={solarStepError ? 'border-error!' : undefined}
                disabled={isReadOnly}
              />
              {solarStepError && <div className="mt-2">{stepErrMsg()}</div>}
            </div>
          </div>
          <div className="bg-white p-4 border-[1.4px] border-border rounded-md flex flex-col self-start w-full">
            <Text variant="body1" className="text-[#0B7E70]! font-InterSemiBold!">
              <span className="text-text-primary!"> 2. </span>BESS Capacity Range
            </Text>

            <div className="flex gap-4 mt-4">
              <div className="w-1/2">
                <TextInput
                  label="Min (MWh)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  value={String(bessMin)}
                  integer
                  showStepper
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  min={5}
                  max={500}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= 5 && num <= 500) {
                      updateBessMin(num);
                    }
                  }}
                  onIncrement={() => {
                    updateBessMin(format(Math.min(500, bessMin + BESS_STEP)));
                  }}
                  onDecrement={() => {
                    updateBessMin(format(Math.max(5, bessMin - BESS_STEP)));
                  }}
                  onBlur={() => {
                    updateBessMin(format(Math.max(5, Math.min(500, bessMin))));
                  }}
                  decrementDisabled={bessMin <= 5 || isReadOnly}
                  incrementDisabled={bessMin >= 500 || isReadOnly}
                  wrapperClassName={hasBessError ? 'border-error!' : undefined}
                />
              </div>
              <div className="w-1/2">
                <TextInput
                  label="Max (MWh)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  value={String(bessMax)}
                  integer
                  showStepper
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  min={bessMin}
                  max={1000}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= bessMin && num <= 1000) {
                      updateBessMax(num);
                    }
                  }}
                  onIncrement={() => {
                    updateBessMax(format(Math.min(1000, bessMax + BESS_STEP)));
                  }}
                  onDecrement={() => {
                    updateBessMax(format(Math.max(bessMin, bessMax - BESS_STEP)));
                  }}
                  onBlur={() => {
                    updateBessMax(format(Math.max(bessMin, Math.min(1000, bessMax))));
                  }}
                  decrementDisabled={bessMax <= bessMin || isReadOnly}
                  incrementDisabled={bessMax >= 1000 || isReadOnly}
                />
              </div>
            </div>
            {hasBessError && <div className="mt-2">{errorMsg()}</div>}
            <div className="border-l-primary bg-primary-tint-2 border border-l-2 rounded-md border-[#E2E4EA] mt-7 p-4">
              <div className="flex items-center gap-3">
                <Icon name="layers" className="text-text-primary! size-5!" />
                <Text variant={'caption'} className="font-InterSemiBold! text-text-primary!">
                  Preview
                </Text>
              </div>

              <div className="mt-3 flex flex-col md:flex-row gap-4">
                {options.map((item: any) => (
                  <div
                    key={item.id}
                    className={`w-full min-w-0 min-h-11 rounded-[16px] bg-white px-3 py-1.5 text-center shadow-[0px_1px_1px_0px_#B0B0B017]! flex items-center justify-center ${
                      options.length > 1 ? 'md:flex-1' : 'md:flex-none md:w-[calc(50%-0.5rem)]'
                    }`}>
                    <Text variant="small" className="text-[#4B5563]! leading-5 font-InterSemiBold!">
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

          <div className="bg-white p-4 border-[1.4px] border-border rounded-md flex flex-col h-full w-full">
            <Text variant="body1" className="text-[#0B7E70]! font-InterSemiBold!">
              <span className="text-text-primary!"> 3. </span>DG Capacity Range
            </Text>
            {hasGenerator ? (
              <>
                <div className="mt-4">
                  <TextInput
                    label="Min (MW)"
                    labelClassName="text-text-secondary! font-InterMedium!"
                    value={String(dgMin)}
                    integer
                    showStepper
                    readonly
                    readOnlyClassName="bg-white border-1!"
                    min={0}
                    max={200}
                    onChange={val => {
                      const num = Number(val);
                      if (!Number.isNaN(num) && num >= 0 && num <= 200) {
                        updateDgMin(num);
                      }
                    }}
                    onIncrement={() => {
                      updateDgMin(format(Math.min(200, dgMin + DG_STEP)));
                    }}
                    onDecrement={() => {
                      updateDgMin(format(Math.max(0, dgMin - DG_STEP)));
                    }}
                    onBlur={() => {
                      updateDgMin(format(Math.max(0, Math.min(200, dgMin))));
                    }}
                    decrementDisabled={dgMin <= 0 || isReadOnly}
                    incrementDisabled={dgMin >= 200 || isReadOnly}
                    wrapperClassName={hasDgError ? 'border-error!' : undefined}
                  />
                </div>
                {hasDgError && <div className="mt-2">{errorMsg()}</div>}

                <div className="mt-4">
                  <TextInput
                    label="Max (MW)"
                    labelClassName="text-text-secondary! font-InterMedium!"
                    value={String(dgMax)}
                    integer
                    showStepper
                    readonly
                    readOnlyClassName="bg-white border-1!"
                    min={dgMin}
                    max={200}
                    onChange={val => {
                      const num = Number(val);
                      if (!Number.isNaN(num) && num >= dgMin && num <= 200) {
                        updateDgMax(num);
                      }
                    }}
                    onIncrement={() => {
                      updateDgMax(format(Math.min(200, dgMax + DG_STEP)));
                    }}
                    onDecrement={() => {
                      updateDgMax(format(Math.max(dgMin, dgMax - DG_STEP)));
                    }}
                    onBlur={() => {
                      updateDgMax(format(Math.max(dgMin, Math.min(200, dgMax))));
                    }}
                    decrementDisabled={dgMax <= dgMin || isReadOnly}
                    incrementDisabled={dgMax >= 200 || isReadOnly}
                  />
                </div>

                <div className="mt-4">
                  <SelectInput
                    label="Step Size (MW)"
                    labelClassName="text-text-secondary! font-InterMedium!"
                    value={dgStep}
                    options={[
                      {id: 5, label: '5'},
                      {id: 10, label: '10'},
                      {id: 25, label: '25'},
                    ]}
                    onChange={item => updateDgStep(Number(item?.id))}
                    wrapperClassName={dgStepError ? 'border-error!' : undefined}
                    disabled={isReadOnly}
                  />
                  {dgStepError && <div className="mt-2">{stepErrMsg()}</div>}
                </div>
              </>
            ) : (
              <div className="bg-[#F8FCFF] border border-[#E2E4EA] rounded-md flex flex-1 items-center justify-center w-full px-[14px] py-4 mt-6">
                <div className={`flex flex-col items-center text-center w-full max-w-90 ${isMaxWastageEnabled ? 'gap-3' : 'gap-1'}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" stroke="#2F9C8F" strokeWidth="2" />
                    <circle cx="10" cy="6.15" r="1.1" fill="#2F9C8F" />
                    <rect x="9.15" y="8.2" width="1.7" height="6.05" rx="0.85" fill="#2F9C8F" />
                  </svg>
                  <Text variant="h4" style={{color: '#2F9C8F', fontSize: '18px', lineHeight: '24px'}} className="font-InterSemiBold!">
                    DG Disabled
                  </Text>
                  <Text variant="small" style={{color: '#6B7280', fontSize: '12px', lineHeight: '24px'}} className="font-InterRegular!">
                    Running Solar + BESS only configuration
                  </Text>
                  <Text
                    variant="small"
                    style={{color: '#101329', fontSize: isMaxWastageEnabled ? '14px' : '12px', lineHeight: isMaxWastageEnabled ? '24px' : '16px'}}
                    className="font-InterRegular!">
                    Enable DG in Setup 1 to include generator
                  </Text>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white p-4 border-[1.4px] border-border rounded-md flex flex-col h-full w-full">
            <Text variant="body1" className="text-[#0B7E70]! font-InterSemiBold!">
              <span className="text-text-primary!"> 4. </span> Green Energy Targets
            </Text>
            <div className="mt-4">
              <TextInput
                label="Min Green Energy (%)"
                labelClassName="text-text-secondary! font-InterMedium!"
                inputInfo="Minimum Percentage of energy delivered from solar + BESS (MWh based)"
                value={String(minGreenEnergy)}
                integer
                showStepper
                readonly
                readOnlyClassName="bg-white border-1!"
                min={0}
                max={100}
                onChange={val => {
                  const num = Number(val);
                  if (!Number.isNaN(num) && num >= 0 && num <= 100) {
                    updateMinGreenEnergy(num);
                  }
                }}
                onIncrement={() => {
                  updateMinGreenEnergy(Math.min(100, minGreenEnergy + PERCENT_STEP));
                }}
                onDecrement={() => {
                  updateMinGreenEnergy(Math.max(0, minGreenEnergy - PERCENT_STEP));
                }}
                onBlur={() => {
                  updateMinGreenEnergy(Math.max(0, Math.min(100, minGreenEnergy)));
                }}
                decrementDisabled={minGreenEnergy <= 0 || isReadOnly}
                incrementDisabled={minGreenEnergy >= 100 || isReadOnly}
              />
            </div>
            <div className="mt-6.5">
              <Checkbox
                checked={isMaxWastageEnabled}
                onCheckedChange={updateMaxWastageEnabled}
                size="md"
                label="Set Maximum Wastage Percentage (%)"
                className="border-primary!"
                labelClassName="font-InterMedium!"
                disabled={isReadOnly}
              />
            </div>
            {isMaxWastageEnabled && maxWastage !== null && maxWastage > 0 && (
              <div className="mt-4">
                <TextInput
                  label="Max Wastage (%)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  inputInfo="Limit Solar curtailment as percentage of total solar generation"
                  value={String(maxWastage)}
                  integer
                  showStepper
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  min={0}
                  max={100}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= 0 && num <= 100) {
                      updateMaxWastage(num);
                    }
                  }}
                  onIncrement={() => {
                    updateMaxWastage(Math.min(100, maxWastage + PERCENT_STEP));
                  }}
                  onDecrement={() => {
                    updateMaxWastage(Math.max(0, maxWastage - PERCENT_STEP));
                  }}
                  onBlur={() => {
                    updateMaxWastage(Math.max(0, Math.min(100, maxWastage)));
                  }}
                  decrementDisabled={maxWastage <= 0 || isReadOnly}
                  incrementDisabled={maxWastage >= 100 || isReadOnly}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D9DEE8] rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="clipboardSearch" className="size-6 text-text-primary!" />
          <Text variant="h4" className="font-InterSemiBold!">
            Simulation Overview
          </Text>
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
            <div className="grid grid-cols-5 gap-8">
              {overviewItems.map((item: any) => (
                <div key={item.id}>
                  <div className="flex items-start gap-3">
                    <div className={`size-7 rounded-md flex items-center justify-center ${item.iconBg}`}>
                      <Icon name={item.icon} className={`size-3 ${item.iconColor}`} />
                    </div>
                    <div className="flex flex-col">
                      <Text variant="14M" className="text-text-secondary! whitespace-nowrap">
                        {item.title}
                      </Text>
                      <Text variant="h2" className={`mt-1.5 text-h3 xl:text-h2 font-InterSemiBold! ${item.valueClass ?? 'text-text-primary!'}`}>
                        {item.value}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-8">
              <Icon name="clock" className="size-4 text-primary!" />

              <Text variant="12R" className="text-text-secondary!">
                Estimated runtime : <span className="font-medium text-text-primary!">~{formattedRuntime}</span>
              </Text>
            </div>
          </>
        )}
      </div>
      {totalConfigurations > 20000 && (
        <div className="bg-[#FFFBE3]! p-3 mt-3 mx-25 rounded-sm">
          <div className="flex justify-center items-center gap-3">
            <Icon name="warning-triangle-sharp" className="size-5.5! text-warning!" />
            <Text variant="body2" className="text-warning!">
              Configuration limit exceeded
            </Text>
          </div>
          <Text variant="caption" className="font-InterMedium! text-text-primary! text-center! mt-3">
            Max Limit is 20,000 configurations
          </Text>
          <Text variant="caption" className="font-InterRegular! text-text-primary! text-center!">
            {' '}
            {totalConfigurations} configs can't run at once. Reduce the range of Solar max or DG sizes, or increase the step size of Solar.{' '}
          </Text>
        </div>
      )}

      <div className="flex justify-center gap-3 mt-3">
        {!hideSimulationCTAs && !showCompletionProgress && (!greenAnalysisCompleted || hasUserEditedAfterCompletion) && !isReadOnly && (
          <Button
            variant="secondary"
            size="md"
            className="self-center w-30 flex justify-center"
            onClick={handleSave}
            disabled={!isDirty || hasConfigurationError || totalConfigurations > 20000}>
            Save
          </Button>
        )}
        {!hideSimulationCTAs && !showCompletionProgress && (!greenAnalysisCompleted || hasUserEditedAfterCompletion) && (
          <Button
            variant="primary"
            size="md"
            className="w-60 my-6 flex justify-center"
            onClick={handleRunGreenAnalysis}
            disabled={
              runSimulationDisabled ||
              isReadOnly ||
              isDirty ||
              hasConfigurationError ||
              (!greenAnalysis && saveSuccess === false) ||
              totalConfigurations > 20000
            }>
            Run Green Analysis
          </Button>
        )}
      </div>
      {/*
        Next → View Results
      */}

      {(isSimulationRunning || isBlocked || shouldBlock) &&
        createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}

      {(isSimulationRunning || showCompletionProgress || shouldShowCompletionSummary) && (
        <>
          {(isSimulationRunning || showCompletionProgress) && (
            <div ref={progressContainerRef} className={`mt-1 ${isSimulationRunning ? 'bg-white! z-100 relative p-4' : ''}`}>
              <Text variant="h3">{isSimulationRunning ? 'Configuration Under Progress... ' : ' Completed Green Analysis Successfully... '}</Text>
              <div className="h-7 w-full rounded-full border border-[#CCE9E6] bg-white px-2.5 py-1.5 shadow-[0px_2px_8px_0px_rgba(47,156,143,0.16)] mt-3">
                <div className="h-3 rounded-full bg-[#E9FFFD]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7BEEE3_0%,#6DEBDE_25.16%,#2F9C8F_100%)] transition-[width] duration-150 ease-linear"
                    style={{width: `${greenAnalysisProgress}%`}}
                  />
                </div>
              </div>

              {isSimulationRunning && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <Text variant="body2" className="font-InterMedium! text-[#344054]!">
                      Solar : {currentSolar}MW, BESS : {currentBess}MWh ({currentDuration}hr), DG : {currentDg}MW ({currentConfig}/{totalConfig})
                    </Text>
                    <Text variant="body2" className="font-InterSemiBold! text-[#00B99F]!">
                      {greenAnalysisProgress.toFixed(2)}%
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
                      Stop Analysis
                    </Button>
                    <Button variant="primary" size="md" onClick={() => dispatch(setShowGreenAnalysisResults(true))} disabled>
                      Next → View Results
                    </Button>
                  </div>
                  {isStopSimulationOpen && (
                    <StopSimulation
                      title="Stop Green Analysis"
                      subTitle="Are you sure you want to stop the green energy analysis?"
                      warningMessage="Stopping the analysis will halt further processing."
                      infoMessage="Existing configuration remain available, and you can run analysis again anytime."
                      open={isStopSimulationOpen}
                      onCancel={handleCancelStopSimulation}
                      onStop={handleStopGreenAnalysis}
                      status={stopSimulationStatus}
                      onCloseSuccess={handleCloseStoppedPopup}
                    />
                  )}
                </>
              )}

              {!isSimulationRunning && (
                <div className="mt-4 flex gap-6 items-center justify-center">
                  <Button variant="primary" size="md" onClick={() => dispatch(setShowGreenAnalysisResults(true))}>
                    Next → View Results
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {shouldShowCompletionSummary && (
        <>
          <div className="mt-4 flex justify-center">
            <div className="bg-primary-tint-2 p-3 flex items-center gap-3 w-fit rounded-sm">
              <Icon name="circle-check-big" className="text-success! mt-0.5!" size={18} />
              <Text variant="16M" className="font-InterMedium!">
                Green analysis completed <div className="bg-[#44AA6F] inline-block mx-2.5 rounded-full h-2 w-2" /> {completedConfigurationCount} Configurations
                processed
              </Text>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="primary" size="md" onClick={() => dispatch(setShowGreenAnalysisResults(true))}>
              Next → View Results
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

interface ConfigSummaryDataType {
  title: string;
  icon: IconTypes;
  points: Array<{
    label?: string;
    value: string;
  }>;
  bgGradientStart?: string;
  bgGradientEnd?: string;
}

function SimulationConfigurationSummary() {
  /**
   * =======================================
   * Selectors
   * =======================================
   */
  const proSimulData = useSelector(projectSimulationData);

  /**
   * =======================================
   * States
   * =======================================
   */
  const [open, setOpen] = useState(false);

  /**
   * =======================================
   * Derived States
   * =======================================
   */
  const loadConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'square-arrow-out-up',
      label: 'LOAD',
      bgGradientEnd: '#FCF3FF',
    },
    () => {
      const loadConfig = proSimulData?.config?.load;
      const isCustomWindow = loadConfig?.pattern?.label === 'CUSTOM_WINDOW_LOAD';

      const baseItems = [
        {
          label: 'Pattern',
          value: LoadProfilePattern[loadConfig?.pattern?.id ?? 0],
        },
      ];

      if (isCustomWindow) {
        const windowItems =
          loadConfig?.config?.windows?.map((window: any, index: any) => ({
            label: `Custom Window ${index + 1}`,
            value: `${window.load_mw} MW`,
          })) ?? [];

        return [...baseItems, ...windowItems];
      }

      return [
        ...baseItems,
        {
          label: 'Load',
          value: `${loadConfig?.config?.load_mw ?? 0} MW`,
        },
        {
          label: 'Total Hours',
          value: `${loadConfig?.total_hours ?? 0} hrs`,
        },
      ];
    },
  );

  const solarConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'sun',
      label: 'SOLAR',
      bgGradientEnd: '#FFFEE2',
    },
    () => [
      {label: 'Year', value: `${proSimulData?.config?.solar?.source?.year ?? 'N/A'}`},
      {label: 'Profile', value: `${proSimulData?.config?.solar?.source?.name ?? 'N/A'}`},
      {label: 'Peak Generation', value: `${proSimulData?.config?.solar?.peak_generation ?? 0} MW`},
    ],
  );

  const generatorConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'gear-drop',
      label: 'GENERATOR',
      bgGradientEnd: '#F3FFF4',
    },
    () => {
      const dg = proSimulData?.config?.dg;

      // If DG is not included
      if (!dg?.is_included) {
        return [{label: 'Status', value: 'OFF'}];
      }

      const isBinary = dg?.is_binary;

      // Common fields
      const config = [
        {
          label: 'Mode',
          value: isBinary ? 'Binary' : 'Variable',
        },
      ];

      // Variable mode UI
      if (!isBinary) {
        config.push(
          {
            label: 'Fuel Curve',
            value: dg?.advanced_fuel_curve ? 'Advanced' : 'Flat Rate',
          },
          ...(dg?.advanced_fuel_curve
            ? [
                {
                  label: 'F0 (No Load)',
                  value: dg?.no_load_coeff == null ? '-' : `${dg.no_load_coeff} L/hr/kW rated`,
                },
                {
                  label: 'F1 (Load)',
                  value: dg?.load_coeff == null ? '-' : `${dg.load_coeff} L/kWh output`,
                },
              ]
            : [
                {
                  label: 'Fuel Rate',
                  value: dg?.flat_fuel_rate == null ? '-' : `${dg.flat_fuel_rate} L/kWh`,
                },
              ]),
          {
            label: 'Min Load',
            value: dg?.min_stable_load == null ? '-' : `${dg.min_stable_load}%`,
          },
        );
      } else {
        config.push(
          {
            label: 'Fuel Rate',
            value: dg?.flat_fuel_rate == null ? '-' : `${dg.flat_fuel_rate} L/kWh`,
          },
          {
            label: 'Fuel Price',
            value: dg?.fuel_price == null ? '-' : `${dg.fuel_price.toFixed(2)}$/L`,
          },
        );
      }

      return config;
    },
  );

  const batteryConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'big-battery',
      label: 'BATTERY',
      bgGradientEnd: '#F5F9FE',
    },
    () => [
      {label: 'Min SOC', value: `${proSimulData?.config?.bess?.bess_min_soc ?? 0}%`},
      {label: 'Max SOC', value: `${proSimulData?.config?.bess?.bess_max_soc ?? 0}%`},
      {label: 'Init SOC', value: `${proSimulData?.config?.bess?.bess_initial_soc ?? 0}%`},
      {label: 'RTE', value: `${proSimulData?.config?.bess?.bess_efficiency ?? 0}%`},
      {label: 'Cycle Limit', value: `${proSimulData?.config?.bess?.bess_daily_cycle_limit ?? 0}/day`},
    ],
  );

  const dispatchStrategyConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'decision',
      label: 'DISPATCH STRATEGY',
      bgGradientEnd: '#FCF3FB',
    },
    () => {
      const dg = proSimulData?.config?.dg;
      const isTakeoverFullLoad = proSimulData?.config?.dispatch?.is_dg_takeover_full_load;

      // If DG is not included
      if (!dg?.is_included) {
        return [
          {label: 'Mode', value: 'Solar + BESS only'},
          {label: '', value: 'Solar → BESS → Load'},
          {label: '', value: 'No DG Involvement'},
        ];
      }

      // DG included
      return [
        {
          label: 'When DG runs',
          value:
            proSimulData?.config?.dispatch?.dg_run_schedule_mode === DGRunScheduleMode.Anytime
              ? 'Anytime'
              : proSimulData?.config?.dispatch?.dg_run_schedule_mode === DGRunScheduleMode.DayOnly
                ? 'Day Only'
                : proSimulData?.config?.dispatch?.dg_run_schedule_mode === DGRunScheduleMode.NightOnly
                  ? 'Night Only'
                  : 'Custom Blackout',
        },
        {
          label: 'DG Trigger',
          value:
            proSimulData?.config?.dispatch?.dg_trigger_type === DGDriggerType['Battery + Solar deficiency']
              ? 'Solar + BESS cannot meet load'
              : proSimulData?.config?.dispatch?.dg_trigger_type === DGDriggerType['Battery SOC threshold']
                ? 'Battery SOC threshold'
                : 'Pre-emptive night charge',
        },
        {
          label: 'DG Charges BESS',
          value: proSimulData?.config?.dispatch?.is_dg_charging_bess ? 'YES - Excess DG power' : 'NO - Solar only',
        },
        // Show only when Takeover Mode is NO
        ...(!isTakeoverFullLoad
          ? [
              {
                label: 'Load Priority',
                value:
                  proSimulData?.config?.dispatch?.load_serving_priority === LoadServingPriority['BESS First (Solar → BESS → DG)'] ? 'BESS First' : 'DG First',
              },
            ]
          : []),
        {
          label: 'Takeover Mode',
          value: proSimulData?.config?.dispatch?.is_dg_takeover_full_load ? 'Yes - DG serves full load' : 'No - DG fills gap',
        },
        {
          label: 'DG Output Mode',
          value: proSimulData?.config?.dispatch?.is_cycle_charging_enabled ? 'Yes — DG at min load %' : 'No — DG follows load',
        },
      ];
    },
  );

  function summaryPointFactory(
    args: {
      label: string;
      icon: IconTypes;
      bgGradientStart?: string;
      bgGradientEnd?: string;
    },
    callback: () => ConfigSummaryDataType['points'],
  ): ConfigSummaryDataType {
    const {label, icon, bgGradientStart = '#FFFFFF', bgGradientEnd = '#FFFFFF'} = args;
    return {
      title: label,
      icon: icon,
      points: callback(),
      bgGradientStart: bgGradientStart,
      bgGradientEnd: bgGradientEnd,
    };
  }

  return (
    <div className="border rounded-md border-[#B6D7D3] bg-[#F7FDFC] p-4 flex flex-col gap-4">
      <button onClick={() => setOpen(prev => !prev)} className="outline-none cursor-pointer justify-between flex w-full items-center gap-2">
        <Text variant="h4" className="leading-none!">
          Configuration Summary
        </Text>
        <Icon name={open ? 'cheveron-up' : 'cheveron-down'} className="text-text-secondary! mr-2!" />
      </button>
      {open && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <ConfigurationSummaryCard {...loadConfig} />
            <ConfigurationSummaryCard {...solarConfig} />
            <ConfigurationSummaryCard {...generatorConfig} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <ConfigurationSummaryCard {...batteryConfig} />
            <ConfigurationSummaryCard {...dispatchStrategyConfig} />
          </div>
        </>
      )}
    </div>
  );
}

interface ConfigSummaryCardProps extends ConfigSummaryDataType {}

function TruncatedTextWithTooltip({text}: {text: string}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    setIsTruncated(element.scrollWidth > element.clientWidth);
  }, [text]);

  return (
    <div className="relative flex-1 min-w-0 group">
      <Text ref={textRef} variant="12SB" className="block w-full overflow-hidden whitespace-nowrap text-ellipsis">
        {text}
      </Text>

      {isTruncated && (
        <Tooltip
          arrowClassName="hidden"
          textClassName="font-InterMedium!"
          portal
          className="z-999 -translate-x-5! border border-[#9ECBC5]! whitespace-normal!"
          position="top"
          message={text}
        />
      )}
    </div>
  );
}
function ConfigurationSummaryCard(props: Readonly<ConfigSummaryCardProps>) {
  const {title, icon, points, bgGradientStart = '#FFFFFF', bgGradientEnd = '#FFFFFF'} = props;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${bgGradientStart} 0%, ${bgGradientEnd} 100%)`,
      }}
      className="bg-white border border-border rounded-md px-6 py-2 flex flex-col gap-2">
      <div className="flex gap-2 items-center pt-2!">
        <Icon name={icon} />
        <Text variant="14SB" className="uppercase text-primary!">
          {title}
        </Text>
      </div>
      <ul className="list-disc! pl-6 pb-2! flex flex-col gap-1 marker:text-text-secondary marker:text-small">
        {points.map((point, index) => {
          const showTooltip = title === 'SOLAR' && point.label === 'Profile';
          return (
            <li key={`${point.label ?? point.value}-${index}`}>
              {point.label ? (
                <div className="flex items-center gap-1 min-w-0">
                  <Text variant="small" className="text-text-secondary! shrink-0">
                    {point.label}:
                  </Text>
                  {showTooltip ? (
                    <TruncatedTextWithTooltip text={point.value} />
                  ) : (
                    <Text variant="12SB" className="leading-none!">
                      {point.value}
                    </Text>
                  )}
                </div>
              ) : (
                <Text variant="12SB" className="leading-none!">
                  {point.value}
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
