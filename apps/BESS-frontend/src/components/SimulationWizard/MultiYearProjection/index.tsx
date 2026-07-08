import {BessContainerTypes, LoadProfilePattern} from '@/constants';
import type {GetMultiYearProjection, IconTypes} from '@/interface';
import {
  customConfigData,
  initiateSimulationData,
  multiYearProgressData,
  multiYearProjectionComputeData,
  multiYearProjectionResultLoading,
  multiYearProjectionResultData,
  multiYearProjectionSaveSuccess,
  multiYearRunSuccess,
  projectSimulationData,
  showDetailedMultiYearProjectionAnalysisSelector,
  simulationProgressData,
  simulationResultsData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {IOSSingleSlider} from '@lazarus/react-common/components';
import {Button, Icon, Radio, Skeleton, Text, Tooltip} from '@/ui-kits';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useDispatch, useSelector} from 'react-redux';
import {
  clearMultiYearProjectionProgressData,
  getMultiYearProgressSilentRequest,
  getMultiYearSilentRequest,
  multiYearProjectionComputeRequest,
  multiYearProjectionProgressRequest,
  multiYearProjectionRequest,
  multiYearProjectionResultRequest,
  refreshProjectSimulationRequest,
  simulationProgressRequest,
  setShowDetailedMultiYearProjectionAnalysis,
} from '@/services/redux/slice/simulationWizardSlice';
import {MultiYearSizingStrategy, SimulationSetupProgress} from '@/constants/enums';
import {Images} from '@lazarus/react-common';
import {StopSimulation} from '../DGSizing/StopSimulation';
import {useMultiYearProjectionSimulation} from './hooks/useMultiYearProjectionSimulation';
import {ViewDetailedAnalysis} from './ViewDetailedAnalysis';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {useSimulationStatus} from '../SimulationStatusContext';

interface MultiYearProjectionProps {
  setIsStepsHidden?: (hidden: boolean) => void;
}

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

type SizingStrategy = 'year1' | 'year10' | 'year20';

const FACTORY_DEGRADATION_SCALE_MARKS = [0, 4, 6, 8, 10];

const getNearestScaleMark = (value: number, scaleMarks: number[]) =>
  scaleMarks.reduce(
    (nearestValue, markValue) => (Math.abs(markValue - value) < Math.abs(nearestValue - value) ? markValue : nearestValue),
    scaleMarks[0] ?? value,
  );

function MultiYearProjectionGhostLoader() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton animation="wave" variant="rounded" width={280} height={18} className="rounded-full!" />
      <Skeleton animation="wave" variant="rounded" width="100%" height={130} className="rounded-lg!" />
      <Skeleton animation="wave" variant="rounded" width="100%" height={180} className="rounded-lg!" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton animation="wave" variant="rounded" width="100%" height={180} className="rounded-lg!" />
        <Skeleton animation="wave" variant="rounded" width="100%" height={180} className="rounded-lg!" />
      </div>
      <Skeleton animation="wave" variant="rounded" width="100%" height={220} className="rounded-2xl!" />
      <div className="flex justify-center gap-3 mt-3">
        <Skeleton animation="wave" variant="rounded" width={120} height={44} className="rounded-md!" />
        <Skeleton animation="wave" variant="rounded" width={200} height={44} className="rounded-md!" />
      </div>
    </div>
  );
}

export const MultiYearProjection = ({setIsStepsHidden}: MultiYearProjectionProps) => {
  const dispatch = useDispatch();

  const simulData = useSelector(initiateSimulationData);
  const simulResData = useSelector(simulationResultsData);
  const proSimulData = useSelector(projectSimulationData);
  const customData = useSelector(customConfigData);
  const projectionData = useSelector(multiYearProjectionResultData) as GetMultiYearProjection['response']['data'] | null;
  const projectionComputeData = useSelector(multiYearProjectionComputeData);
  const projectionSaveSuccess = useSelector(multiYearProjectionSaveSuccess);
  const projectionResultLoading = useSelector(multiYearProjectionResultLoading);
  const showDetailedMultiYearProjectionAnalysis = useSelector(showDetailedMultiYearProjectionAnalysisSelector);
  const simulProgressData = useSelector(simulationProgressData);
  const projectionProgressData = useSelector(multiYearProgressData);
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find((project: any) => Number(project?.id) === projectId);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some((user: any) => user.id === authData.id));
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isReadOnly = isAssignedUser || isProjectAssignmentPending;

  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();
  const {isAnySimulationRunning, runningSimulationId} = useSimulationStatus();

  const multiYearProjectionRunSuccess = useSelector(multiYearRunSuccess);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const simulationProgress = simulData?.progress ?? proSimulData?.progress;
  const simulationData = simulData ?? proSimulData;

  const [open, setOpen] = useState(true);
  const [factoryDegradation, setFactoryDegradation] = useState(0);
  const [annualDegradation, setAnnualDegradation] = useState(2.5);
  const [sizingStrategy, setSizingStrategy] = useState<SizingStrategy>('year1');
  const [isSaved, setIsSaved] = useState(false);
  const [hasUserEditedAfterProjectionCompletion, setHasUserEditedAfterProjectionCompletion] = useState(false);
  const projectionRefreshPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopProjectionRefreshPolling = useCallback(() => {
    if (projectionRefreshPollingRef.current) {
      clearTimeout(projectionRefreshPollingRef.current);
      projectionRefreshPollingRef.current = null;
    }
  }, []);

  const handleProjectionCompleted = useCallback(
    (_processedYears: number) => {
      setIsSaved(true);
      setHasUserEditedAfterProjectionCompletion(false);
      if (simulation_id) {
        dispatch(refreshProjectSimulationRequest({simulation_id: Number(simulation_id)}));
        dispatch(getMultiYearSilentRequest({simulation_id: Number(simulation_id)}));
        dispatch(getMultiYearProgressSilentRequest({simulation_id: Number(simulation_id)}));
      }
    },
    [dispatch, simulation_id],
  );

  const handleProjectionStopped = useCallback(() => {
    setHasUserEditedAfterProjectionCompletion(false);
    dispatch(clearMultiYearProjectionProgressData());
  }, [dispatch]);

  const {
    currentYear,
    handleCancelStopSimulation,
    handleOpenStopSimulation,
    handleRunProjection,
    handleStopProjection,
    isBlocked,
    isSimulationRunning,
    isStopSimulationOpen,
    processedYears,
    progressContainerRef,
    runSimulationDisabled,
    showCompletionProgress,
    showCompletionSummary,
    simulationProgress: projectionProgress,
    totalConfig,
  } = useMultiYearProjectionSimulation({
    simulationId: simulation_id ? Number(simulation_id) : undefined,
    onSimulationCompleted: handleProjectionCompleted,
    onSimulationStopped: handleProjectionStopped,
  });

  const loadConfig = projectionData?.config?.load ?? proSimulData?.config?.load;
  const solarConfig = projectionData?.config?.solar ?? proSimulData?.config?.solar;
  const dgConfig = projectionData?.config?.dg ?? proSimulData?.config?.dg;
  const customResult = simulResData?.results?.[0];

  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  const shouldShowExternalSimulationMessage = !isSimulationRunning && (isBlocked || isAnySimulationRunning);

  const bessCapacity =
    projectionData?.config?.bess?.bess_capacity ?? customData?.bess_capacity ?? customResult?.bess_mwh ?? proSimulData?.config?.bess_dg_sizing?.bess_max ?? 0;

  const calculateBessPower = () => {
    if (!customData?.duration_class) {
      return 0;
    }
    return customData.duration_class === BessContainerTypes['5 MWh / 2.5 MW (2-hour, 0.5C)'] ? Number(bessCapacity) / 2 : Number(bessCapacity) / 4;
  };

  const bessPower = projectionData?.config?.bess?.bess_power ?? customResult?.power_mw ?? calculateBessPower();
  const dgCapacity = projectionData?.config?.dg?.size ?? customData?.dg_capacity ?? customResult?.dg_mw ?? proSimulData?.config?.bess_dg_sizing?.dg_max ?? 0;
  const projectionOutput = projectionComputeData?.output ?? projectionData?.output;
  const sizingMargin = Number(projectionOutput?.sizing_margin_pct ?? 10);
  const orderBessCapacity = Number(projectionOutput?.nameplate_size_mwh ?? Number(bessCapacity) * (1 + sizingMargin / 100));
  const orderBessPower = Number(projectionOutput?.power_mw ?? Number(bessPower) * (1 + sizingMargin / 100));
  const containerCount = Number(projectionOutput?.containers ?? Math.ceil(orderBessCapacity / 5));

  const mapSizingStrategyToEnum = (strategy: SizingStrategy) => {
    if (strategy === 'year10') return MultiYearSizingStrategy['Year 10 EOL'];
    if (strategy === 'year20') return MultiYearSizingStrategy['Year 20 EOL'];
    return MultiYearSizingStrategy['Year 1 BOL'];
  };

  const mapEnumToSizingStrategy = (strategy: number | null | undefined): SizingStrategy => {
    if (strategy === MultiYearSizingStrategy['Year 10 EOL']) return 'year10';
    if (strategy === MultiYearSizingStrategy['Year 20 EOL']) return 'year20';
    return 'year1';
  };

  const projectionPayload = {
    simulation_id: Number(simulation_id),
    factory_degradation: Number(factoryDegradation),
    annual_degradation: Number(annualDegradation),
    sizing_strategy: mapSizingStrategyToEnum(sizingStrategy),
  };

  useEffect(() => {
    if (showDetailedMultiYearProjectionAnalysis) {
      setIsStepsHidden?.(true);
    } else {
      setIsStepsHidden?.(false);
    }
  }, [showDetailedMultiYearProjectionAnalysis, setIsStepsHidden]);

  useEffect(() => {
    if (!simulation_id) return;
    dispatch(refreshProjectSimulationRequest({simulation_id: Number(simulation_id)}));
    dispatch(multiYearProjectionResultRequest({simulation_id: Number(simulation_id)}));
  }, [dispatch, simulation_id]);

  useEffect(() => {
    if (!simulation_id) return;
    dispatch(simulationProgressRequest({simulation_id: Number(simulation_id)}));
  }, [dispatch, simulation_id]);

  useEffect(() => {
    setIsSaved(false);
    setHasUserEditedAfterProjectionCompletion(false);
  }, [simulation_id]);

  useEffect(() => {
    if (!projectionData) return;
    setFactoryDegradation(getNearestScaleMark(Number(projectionData.factory_degradation ?? 8), FACTORY_DEGRADATION_SCALE_MARKS));
    setAnnualDegradation(Number(projectionData.annual_degradation ?? 3));
    setSizingStrategy(mapEnumToSizingStrategy(projectionData.sizing_strategy));
    setIsSaved(projectionProgressData?.status === 2);
  }, [projectionData || projectionProgressData?.status]);

  useEffect(() => {
    if (!simulation_id) return;
    dispatch(multiYearProjectionComputeRequest(projectionPayload));
  }, [simulation_id, factoryDegradation, annualDegradation, sizingStrategy]);

  useEffect(() => {
    if (!simulation_id) return;
    dispatch(multiYearProjectionProgressRequest({simulation_id: Number(simulation_id)}));
  }, [simulation_id]);

  useEffect(() => {
    if (projectionSaveSuccess === 'S-20041') {
      setIsSaved(true);
    }
  }, [projectionSaveSuccess]);

  useEffect(() => {
    if (!simulation_id) {
      stopProjectionRefreshPolling();
      return;
    }

    const isStep5Completed = Number(simulProgressData?.status) === 2;

    if (isStep5Completed && projectionData) {
      stopProjectionRefreshPolling();
      return;
    }

    const pollProjectionState = () => {
      dispatch(refreshProjectSimulationRequest({simulation_id: Number(simulation_id)}));
      dispatch(simulationProgressRequest({simulation_id: Number(simulation_id)}));
      dispatch(getMultiYearSilentRequest({simulation_id: Number(simulation_id)}));
      projectionRefreshPollingRef.current = setTimeout(pollProjectionState, 5000);
    };

    projectionRefreshPollingRef.current = setTimeout(pollProjectionState, 5000);

    return stopProjectionRefreshPolling;
  }, [dispatch, projectionData, simulProgressData?.status, simulation_id, stopProjectionRefreshPolling]);

  const shouldShowProjectionCompletionSummary = !isSimulationRunning && !showCompletionProgress && showCompletionSummary;
  const isStep5Completed = Number(simulProgressData?.status) === 2;
  const isProjectionReady =
    isStep5Completed &&
    (Boolean(projectionData) || projectionProgressData?.status === 2 || shouldShowProjectionCompletionSummary || multiYearProjectionRunSuccess === 'S-20043');

  const wasProjectionCompleted =
    !isSimulationRunning && isProjectionReady;

  const handleProjectionInputChange = (onStay: () => void) => {
    if (!wasProjectionCompleted) {
      return;
    }

    setHasUserEditedAfterProjectionCompletion(true);
    requestChangeConfigurationConfirmation({
      onStay: () => {
        onStay();
        setHasUserEditedAfterProjectionCompletion(false);
      },
    });
  };

  const handleFactoryDegradationChange = (value: number) => {
    const previousValue = factoryDegradation;
    setFactoryDegradation(getNearestScaleMark(value, FACTORY_DEGRADATION_SCALE_MARKS));
    setIsSaved(false);
    handleProjectionInputChange(() => {
      setFactoryDegradation(previousValue);
      setIsSaved(true);
    });
  };

  const handleAnnualDegradationChange = (value: number) => {
    const previousValue = annualDegradation;
    setAnnualDegradation(value);
    setIsSaved(false);
    handleProjectionInputChange(() => {
      setAnnualDegradation(previousValue);
      setIsSaved(true);
    });
  };

  const handleSizingStrategyChange = (strategy: SizingStrategy) => {
    const previousValue = sizingStrategy;
    setSizingStrategy(strategy);
    setIsSaved(false);
    handleProjectionInputChange(() => {
      setSizingStrategy(previousValue);
      setIsSaved(true);
    });
  };
  const degradationControls = [
    {
      title: 'Factory Degradation (%)',
      label: 'Initial Capacity Loss From Nameplate -',
      min: 0,
      max: 10,
      step: 2,
      value: factoryDegradation,
      onChange: handleFactoryDegradationChange,
      scaleMarks: FACTORY_DEGRADATION_SCALE_MARKS,
      snapToScaleMarks: true,
    },
    {
      title: 'Annual Degradation (% per Year)',
      label: 'Yearly Capacity Loss (Compound) -',
      min: 1,
      max: 4,
      step: 0.5,
      value: annualDegradation,
      onChange: handleAnnualDegradationChange,
      scaleMarks: [1, 1.5, 2, 2.5, 3, 3.5, 4],
    },
  ];

  const configSummaryData: ConfigSummaryDataType[] = [
    summaryPointFactory(
      {
        icon: 'square-arrow-out-up',
        label: 'LOAD',
        bgGradientEnd: '#FCF3FF',
      },
      () => {
        const isCustomWindow = loadConfig?.pattern?.label === 'CUSTOM_WINDOW_LOAD';

        const baseItems = [
          {
            label: 'Pattern',
            value: LoadProfilePattern[loadConfig?.pattern?.id ?? 0] ?? 'N/A',
          },
        ];

        if (isCustomWindow) {
          const windowItems =
            (loadConfig?.config as any)?.windows?.map((window: any, index: number) => ({
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
    ),
    summaryPointFactory(
      {
        icon: 'sun',
        label: 'SOLAR',
        bgGradientEnd: '#FFFEE2',
      },
      () => [
        {label: 'Year', value: `${solarConfig?.source?.year ?? 'N/A'}`},
        {label: 'Profile', value: `${solarConfig?.source?.name ?? 'N/A'}`},
        {label: 'Peak Generation', value: `${solarConfig?.peak_generation ?? 0} MW`},
      ],
    ),
    summaryPointFactory(
      {
        icon: 'big-battery',
        label: 'BESS',
        bgGradientEnd: '#F5F9FE',
      },
      () => [
        {label: 'Battery', value: `${bessCapacity} MWh`},
        {label: 'Power', value: `${formatNumber(Number(bessPower))} MW`},
      ],
    ),
    summaryPointFactory(
      {
        icon: 'gear-drop',
        label: 'DG',
        bgGradientEnd: '#F3FFF4',
      },
      () =>
        dgConfig?.is_included
          ? [
              {label: 'Status', value: 'ON'},
              {label: 'DG Size', value: `${dgCapacity} MW`},
            ]
          : [{label: 'Status', value: 'OFF'}],
    ),
  ];

  const degradationData = [
    {
      title: 'Nameplate',
      value: formatMwhMwValue(orderBessCapacity, orderBessPower),
      subText: `${containerCount} Containers`,
      icon: 'document',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      subTextColor: 'text-gray-500!',
    },
    {
      title: 'Year 1 BOL',
      value: formatMwhMwValue(
        Number(projectionOutput?.capacity_breakdown?.year_1_bol?.mwh ?? 0),
        Number(projectionOutput?.capacity_breakdown?.year_1_bol?.mw ?? 0),
      ),
      subText: `${formatNumber(Number(projectionOutput?.capacity_breakdown?.year_1_bol?.bol_pct ?? 0))}% Factory`,
      icon: 'rocket1',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      titleColor: 'text-red-500',
      subTextColor: 'text-red-500!',
    },
    {
      title: 'Year 5',
      value: formatMwhMwValue(Number(projectionOutput?.capacity_breakdown?.year_5?.mwh ?? 0), Number(projectionOutput?.capacity_breakdown?.year_5?.mw ?? 0)),
      subText: `${formatNumber(Number(projectionOutput?.capacity_breakdown?.year_5?.bol_pct ?? 0))}% BOL`,
      icon: 'zap',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
      titleColor: 'text-teal-700',
      subTextColor: 'text-green-600!',
    },
    {
      title: 'Year 10',
      value: formatMwhMwValue(Number(projectionOutput?.capacity_breakdown?.year_10?.mwh ?? 0), Number(projectionOutput?.capacity_breakdown?.year_10?.mw ?? 0)),
      subText: `${formatNumber(Number(projectionOutput?.capacity_breakdown?.year_10?.bol_pct ?? 0))}% of BOL`,
      icon: 'gear1',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      titleColor: 'text-teal-700',
      subTextColor: 'text-green-600!',
    },
    {
      title: 'Year 20',
      value: formatMwhMwValue(Number(projectionOutput?.capacity_breakdown?.year_20?.mwh ?? 0), Number(projectionOutput?.capacity_breakdown?.year_20?.mw ?? 0)),
      subText: `${formatNumber(Number(projectionOutput?.capacity_breakdown?.year_20?.bol_pct ?? 0))}% of BOL`,
      icon: 'degradation',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      titleColor: 'text-orange-500',
      subTextColor: 'text-orange-500!',
    },
  ];

  const handleViewDetailedAnalysis = () => {
    dispatch(setShowDetailedMultiYearProjectionAnalysis(true));
  };

  if (projectionResultLoading) {
    return <MultiYearProjectionGhostLoader />;
  }

  const shouldShowEmptyState =
    Number(simulationProgress) < SimulationSetupProgress['Run Custom Config Simulation'] ||
    simulationData?.edited_step === 6 ||
    simulationData?.edited_step === 7 ||
    simulationData?.edited_step === 8;

  if (shouldShowEmptyState || !isProjectionReady) {
    return (
      <>
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
        <div className="flex flex-col items-center justify-center min-h-full! gap-4 py-10">
          <img src={Images.websitePreview} alt="No Simulations" className="w-22" />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            Run the Simulation Results in Step 5 to generate and yearly projection results.
          </Text>
        </div>

        {(isSimulationRunning || isBlocked || shouldBlock) &&
          createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
      </>
    );
  }

  if (showDetailedMultiYearProjectionAnalysis) {
    return <ViewDetailedAnalysis />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Text variant="14R" className="text-text-secondary!">
        Multi-Year Performance Analysis
      </Text>
      <div className="border rounded-md border-[#B6D7D3] bg-[#F7FDFC] p-4 flex flex-col gap-4">
        <button type="button" onClick={() => setOpen(prev => !prev)} className="outline-none cursor-pointer justify-between flex w-full items-center gap-2">
          <Text variant="h4" className="leading-none!">
            Configuration Summary
          </Text>
          <Icon name={open ? 'cheveron-up' : 'cheveron-down'} className="text-text-secondary! mr-2!" />
        </button>

        {open && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {configSummaryData.map(data => (
              <ConfigurationSummaryCard key={data.title} {...data} />
            ))}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-white px-7 py-6">
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          {degradationControls.map(control => (
            <div key={control.title}>
              <Text variant="18SB" className="text-primary! font-InterSemiBold!">
                {control.title}
              </Text>
              <div className="mt-3">
                <IOSSingleSlider
                  label={control.label}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={control.value}
                  onChange={control.onChange}
                  valueLabel
                  valueLabelOnThumb="off"
                  scaleMarks={control.scaleMarks}
                  scaleDistribution="even"
                  snapToScaleMarks={control.snapToScaleMarks}
                  labelClassName="text-text-secondary! font-InterMedium!"
                  scaleWrapperClassName="bottom-2!"
                  scaleClassName="text-text-primary!"
                  readOnly={isAssignedUser}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white px-7 py-6">
          <Text variant="18SB" className="text-primary!">
            Sizing Strategy
          </Text>
          <Text variant="caption" className="mt-2 text-text-secondary!">
            When should BESS meet target?
          </Text>

          <div className="mt-5 xl:mt-7 flex items-center gap-3 xl:gap-11">
            <Radio
              checked={sizingStrategy === 'year1'}
              onCheckedChange={() => handleSizingStrategyChange('year1')}
              label="Year 1 BOL"
              labelClassName="text-text-primary! font-InterMedium!"
              disabled={isAssignedUser}
            />
            <Radio
              checked={sizingStrategy === 'year10'}
              onCheckedChange={() => handleSizingStrategyChange('year10')}
              label="Year 10 EOL"
              labelClassName="text-text-primary! font-InterMedium!"
              disabled={isAssignedUser}
            />
            <Radio
              checked={sizingStrategy === 'year20'}
              onCheckedChange={() => handleSizingStrategyChange('year20')}
              label="Year 20 EOL"
              labelClassName="text-text-primary! font-InterMedium!"
              disabled={isAssignedUser}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white px-7 py-6">
          <Text variant="18SB" className="text-primary!">
            Order Size
          </Text>
          <Text variant="caption" className="mt-2 text-text-secondary!">
            Nameplate to order
          </Text>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <Text variant="largeBody" className="text-text-primary! font-InterSemiBold!">
                {formatNumber(orderBessCapacity)} <span className="text-[14px]"> MWh</span>/ {formatNumber(orderBessPower)}
                <span className="text-[14px] "> MW</span>
              </Text>
              <Text variant="caption" className="mt-2 text-text-secondary!">
                Sizing Margin -&gt; {sizingMargin.toFixed(2)}%
              </Text>
            </div>

            <div className="shrink-0 rounded-full bg-[#F3F3F3] px-5 py-2">
              <Text variant="caption" className="text-text-secondary! font-InterMedium!">
                {containerCount} Container
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-8">
        <div className="flex items-center gap-2 mb-6">
          <Icon name="clipboardSearch" className="text-primary! size-6.75!" />
          <Text variant="h4"> Capacity Degradation Breakdown</Text>
        </div>

        <div className="grid grid-cols-3 xl:grid-cols-5 gap-10">
          {degradationData.map((item: any) => {
            return (
              <div key={item.title}>
                <div className="flex items-start gap-2 mb-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${item.iconBg}`}>
                    <Icon name={item?.icon} className={`size-4.5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <Text variant="14M" className={`${item.titleColor || 'text-text-secondary!'}`}>
                      {item.title}
                    </Text>
                    <Text variant="largeBody" className="font-InterSemiBold! text-text-primary! leading-none!">
                      {item.value}
                    </Text>
                    <Text variant="12SB" className={`mt-2 font-InterSemiBold! ${item.subTextColor}`}>
                      {item.subText}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(!isProjectionReady || hasUserEditedAfterProjectionCompletion) && !isSimulationRunning && (
        <div className="flex justify-center gap-3 mt-3">
          {!isReadOnly && (
            <Button
              variant="secondary"
              size="md"
              className="self-center w-30 flex justify-center"
              onClick={() => {
                if (!simulation_id) return;
                dispatch(multiYearProjectionRequest(projectionPayload));
                setIsSaved(true);
              }}
              disabled={!simulation_id || isSaved}>
              Save
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            className="w-50 my-6 flex justify-center"
            onClick={() => {
              if (!simulation_id) return;
              handleRunProjection();
            }}
            disabled={!isSaved || isReadOnly || runSimulationDisabled || isSimulationRunning || isBlocked}>
            Run Projection
          </Button>
        </div>
      )}

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

      {(isSimulationRunning || isBlocked || shouldBlock) &&
        createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}

      {(isSimulationRunning || showCompletionProgress || shouldShowProjectionCompletionSummary) && (
        <>
          {(isSimulationRunning || showCompletionProgress) && (
            <div ref={progressContainerRef} className={`mt-1 ${isSimulationRunning ? 'bg-white! z-100 relative p-4' : ''}`}>
              <Text variant="h3">{isSimulationRunning ? ' Projection Under Progress... ' : ' Completed Projection Successfully... '}</Text>
              <div className="h-7 w-full rounded-full border border-[#CCE9E6] bg-white px-2.5 py-1.5 shadow-[0px_2px_8px_0px_rgba(47,156,143,0.16)] mt-3">
                <div className="h-3 rounded-full bg-[#E9FFFD]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7BEEE3_0%,#6DEBDE_25.16%,#2F9C8F_100%)] transition-[width] duration-150 ease-linear"
                    style={{width: `${projectionProgress}%`}}
                  />
                </div>
              </div>

              {isSimulationRunning && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <Text variant="body2" className="font-InterMedium! text-[#344054]!">
                      Simulating Year {currentYear}...
                    </Text>
                    <Text variant="body2" className="font-InterSemiBold! text-[#00B99F]!">
                      {projectionProgress.toFixed(2)}%
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
                      Stop Projection
                    </Button>
                  </div>

                  {isStopSimulationOpen && (
                    <StopSimulation
                      title="Stop Projection"
                      subTitle="Are you sure you want to stop the projection?"
                      warningMessage="Stopping the projection will halt further processing."
                      infoMessage="Existing configuration remain available, and you can run projection again anytime."
                      open={isStopSimulationOpen}
                      onCancel={handleCancelStopSimulation}
                      onStop={handleStopProjection}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
      {(shouldShowProjectionCompletionSummary || (isProjectionReady && !isBlocked)) &&
        !isSimulationRunning &&
        !hasUserEditedAfterProjectionCompletion && (
          <div className="mt-4 flex justify-center">
            <div className="bg-primary-tint-2 p-3 flex items-center gap-3 w-fit rounded-sm">
              <Icon name="circle-check-big" className="text-success! mt-0.5!" size={18} />
              <Text variant="16M" className="font-InterMedium!">
                Projection completed <div className="bg-[#44AA6F] inline-block mx-2.5 rounded-full h-2 w-2" />{' '}
                {processedYears || currentYear || totalConfig || 20} {''}
                Years Projection processed
              </Text>
            </div>
          </div>
        )}
      {(shouldShowProjectionCompletionSummary || (isProjectionReady && !isBlocked)) &&
        !isSimulationRunning &&
        !hasUserEditedAfterProjectionCompletion && (
          <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-[#F9F9FA] px-6 py-3">
            <div className="flex items-center gap-4 w-[65%]! xl:w-full">
              <Icon name="analysis" className="text-black! size-6.75!" />{' '}
              <Text variant="caption" className="font-normal text-text-secondary!">
                Explore detailed insights through monthly performance and hourly data summary.
              </Text>
            </div>
            <Button
              variant="secondary"
              size="sm"
              rightIcon="chevron-right"
              iconClassName="size-3!"
              className="flex items-center justify-center gap-2 self-center border bg-white px-6 py-3"
              onClick={handleViewDetailedAnalysis}>
              View Detailed Analysis
            </Button>
          </div>
        )}
    </div>
  );
};

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

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toFixed(1);
}

function formatMwhMwValue(mwh: number, mw: number) {
  return (
    <>
      {formatNumber(mwh)}
      <span className="text-[14px] font-InterSemiBold! text-text-placeholder!"> MWh</span> / {formatNumber(mw)}
      <span className="text-[14px] font-InterSemiBold! text-text-placeholder!"> MW</span>
    </>
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
      className="bg-white border border-border rounded-md px-6 py-2 flex flex-col gap-2 min-h-33.5">
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
              <div className="flex items-center gap-1 min-w-0">
                <Text variant="small" className="text-text-secondary! shrink-0">
                  {point.label} :
                </Text>
                {showTooltip ? <TruncatedTextWithTooltip text={point.value} /> : <Text variant="12SB">{point.value}</Text>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
