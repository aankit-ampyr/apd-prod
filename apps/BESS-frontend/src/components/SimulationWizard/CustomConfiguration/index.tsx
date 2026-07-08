import {Button, Icon, Radio, Skeleton, Text, TextInput} from '@/ui-kits';
import {useState, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {ViewDetailedAnalysis} from './ViewDetailedAnalysis';
import {
  customConfigRequest,
  customSimulationResultRequest,
  getCustomConfigRequest,
  getCustomConfigSilentRequest,
  refreshProjectSimulationRequest,
  setShowDetailedAnalysis,
} from '@/services/redux/slice/simulationWizardSlice';
import {
  customConfigData,
  customConfigLoading,
  customConfigSuccess,
  customSimulationLoading,
  customSimulationResults,
  customSimulationSuccess,
  generatorData,
  initiateSimulationData,
  loadProfileData,
  projectSimulationData,
  runSimulationSuccess,
  savedSolarProfileData,
  showDetailedAnalysisSelector,
  simulationProgressData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {BessContainerTypes} from '@/constants';
import {useCustomSimulation} from './useCustomSimulation';
import {Images} from '@lazarus/react-common/assets';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {RootState} from '@/services/redux/rootReducer';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {useSimulationStatus} from '../SimulationStatusContext';
import {createPortal} from 'react-dom';

interface CustomConfigurationProps {
  setIsStepsHidden?: (hidden: boolean) => void;
}

function CustomConfigurationEmptyStateIcon() {
  return (
    <div className="flex h-30 w-30 items-center justify-center rounded-xl bg-[#E3F7F3]">
      <div className="flex flex-col gap-4">
        <div className="relative h-2 w-22 rounded-full bg-white">
          <span className="absolute -top-2 left-0 h-6 w-6 rounded-full border-[5px] border-white bg-[#B8E8E2]" />
        </div>
        <div className="relative h-2 w-22 rounded-full bg-white">
          <span className="absolute -top-2 left-7 h-6 w-6 rounded-full border-[5px] border-white bg-[#B8E8E2]" />
        </div>
        <div className="relative h-2 w-22 rounded-full bg-white">
          <span className="absolute -top-2 right-0 h-6 w-6 rounded-full border-[5px] border-white bg-[#B8E8E2]" />
        </div>
      </div>
    </div>
  );
}

function CustomConfigurationGhostLoader() {
  return (
    <div className="main">
      <div className="flex gap-3">
        <Skeleton animation="wave" variant="rounded" width="70%" height={340} className="rounded-lg!" />
        <Skeleton animation="wave" variant="rounded" width="30%" height={340} className="rounded-2xl!" />
      </div>
      <div className="flex justify-center gap-3 mt-4">
        <Skeleton animation="wave" variant="rounded" width={120} height={44} className="rounded-md!" />
        <Skeleton animation="wave" variant="rounded" width={180} height={44} className="rounded-md!" />
      </div>
      <Skeleton animation="wave" variant="rounded" width="100%" height={260} className="rounded-2xl! mt-5" />
    </div>
  );
}

export const CustomConfiguration = ({setIsStepsHidden}: CustomConfigurationProps) => {
  const dispatch = useDispatch();
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const simulationData = simulData ?? proSimulData;
  const customData = useSelector(customConfigData);
  const isCustomConfigLoading = useSelector(customConfigLoading);
  const loadData = useSelector(loadProfileData);
  const solarData = useSelector(savedSolarProfileData);
  const dgData = useSelector(generatorData);
  const customSimulResult = useSelector(customSimulationResults);
  const customResultSuccess = useSelector(customSimulationSuccess);
  const customSaveSuccess = useSelector(customConfigSuccess);
  const sizingSimulationSuccess = useSelector(runSimulationSuccess);
  const isLoading = useSelector(customSimulationLoading);
  const simulProgressData = useSelector(simulationProgressData);
  const isSimulationProgressLoading = useSelector((state: RootState) => state.simulationWizard.simulationProgressLoading);
  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find(project => Number(project?.id) === projectId);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some(user => user.id === authData.id));
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isReadOnly = isAssignedUser || isProjectAssignmentPending;

  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();
  const {isAnySimulationRunning, runningSimulationId} = useSimulationStatus();

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  const showDetailedAnalysis = useSelector(showDetailedAnalysisSelector);

  const [durationClass, setDurationClass] = useState<'2-hour' | '4-hour'>('2-hour');
  const [bessCapacity, setBessCapacity] = useState<number>(5);
  const [dgCapacity, setDgCapacity] = useState<number>(200);
  const [showSimulationResults, setShowSimulationResults] = useState(false);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  // Polling logic for simulation result
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  };

  const {handleRunSimulation, isBlocked, isSimulationRunning}: any = useCustomSimulation({
    simulationId: simulation_id,
    onSimulationCompleted: () => {
      setShowSimulationResults(true);
      setSimulationCompleted(true);
      setIsEditable(false);
      if (simulation_id) {
        dispatch(customSimulationResultRequest({simulation_id}));
        dispatch(
          refreshProjectSimulationRequest({
            simulation_id: Number(simulation_id),
          }),
        );
        dispatch(getCustomConfigSilentRequest({simulation_id}));
      }
      // Stop polling if socket completes
      stopPolling();
    },
  });
  const shouldShowExternalSimulationMessage = !isSimulationRunning && (isBlocked || shouldBlock);

  const hasGenerator = dgData?.is_included;

  // Stat icon mapping
  const statIconMap: Record<string, string> = {
    'Load Met (%)': 'gisLayerUpload',
    'Green Hours (%)': 'leaf',
    'Generator Hours': 'clock2',
    'Fuel Used (L)': 'fuel',
    'Wastage Energy (%)': 'radioactive-waste',
    'Green Hours': 'empty-hourglass',
    'Total Battery Cycles': 'recycle',
    'Avg. Battery Cycles/day': 'recycle',
    'Unmet Energy (MWh)': 'thunder',
    'Generator Starts': 'right-arrow',
    'Hours Fully Served': 'settings-done',
    'Total Load Hours': 'phone-signal',
  };

  useEffect(() => {
    if (simulation_id) {
      dispatch(getCustomConfigRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    if (simulation_id) {
      dispatch(customSimulationResultRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    if (showDetailedAnalysis) {
      setIsStepsHidden?.(true);
    } else {
      setIsStepsHidden?.(false);
    }
  }, [showDetailedAnalysis, setIsStepsHidden]);

  // Initial state: disable Run Simulation, enable Save
  const [saveEnabled, setSaveEnabled] = useState(true);
  const [runEnabled, setRunEnabled] = useState(false);

  // After Save Success: enable Run Simulation, disable Save (keep editable)
  useEffect(() => {
    if (customSaveSuccess === 'S-20025') {
      setSaveEnabled(false);
      setRunEnabled(true);
      // Do NOT set isEditable false here; keep editable until simulation is run
    }
  }, [customSaveSuccess]);

  // After Simulation Completion: hide both buttons, show results
  useEffect(() => {
    // If this step has been edited after a previous run, keep results hidden until user runs again.
    if (customResultSuccess === 'S-20038' && simulationData?.edited_step !== 8) {
      setShowSimulationResults(true);
      setSimulationCompleted(true);
      setIsEditable(false);
      dispatch(
        refreshProjectSimulationRequest({
          simulation_id: Number(simulation_id),
        }),
      );
    }
  }, [customResultSuccess, simulationData?.edited_step, simulation_id]);

  // If Step 3 sizing simulation is run again, clear stale custom simulation result UI.
  useEffect(() => {
    if (sizingSimulationSuccess === 'S-20033') {
      setShowSimulationResults(false);
      setSimulationCompleted(false);
      setIsEditable(true);
      setSaveEnabled(true);
      setRunEnabled(false);
    }
  }, [sizingSimulationSuccess]);

  // Loader state: show loader if simulation is running (isLoading true and not completed)
  // Also, hide Save/Run CTAs immediately after clicking Run Simulation
  const [runClicked, setRunClicked] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setRunClicked(false);
    }
  }, [isLoading]);
  const showLoader = (isLoading || runClicked || isPolling) && !simulationCompleted;

  // Stop polling when success code is received
  useEffect(() => {
    if (customResultSuccess === 'S-20038') {
      stopPolling();
    }
  }, [customResultSuccess]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Start polling function
  const startPolling = () => {
    if (!simulation_id) return;
    setIsPolling(true);
    const poll = () => {
      dispatch(customSimulationResultRequest({simulation_id}));
      pollingRef.current = setTimeout(poll, 3000);
    };
    // Start first poll after 3 seconds
    pollingRef.current = setTimeout(poll, 3000);
  };

  // Guard function for change configuration confirmation
  const guardLocalChange = (restore: () => void) => {
    requestChangeConfigurationConfirmation({onStay: restore});
  };

  // Handler for duration class change with confirmation
  const handleDurationClassChange = (newDurationClass: '2-hour' | '4-hour') => {
    const previousDurationClass = durationClass;
    setDurationClass(newDurationClass);
    setSaveEnabled(true);
    setRunEnabled(false);
    // Enable save button and hide simulation results when field is edited
    if (simulationCompleted || showSimulationResults) {
      setIsEditable(true);
      setShowSimulationResults(false);
      setSimulationCompleted(false);
    }
    // Show change configuration confirmation if simulation results exist
    if (simulationCompleted || customResultSuccess === 'S-20038') {
      guardLocalChange(() => {
        setDurationClass(previousDurationClass);
        // Restore simulation results block if results exist for reverted value
        if (customSimulResult?.data) {
          setShowSimulationResults(true);
          setSimulationCompleted(true);
        }
      });
    }
  };

  // Handler for BESS capacity change with confirmation
  const handleBessCapacityChange = (newValue: number) => {
    const previousValue = bessCapacity;
    setBessCapacity(newValue);
    setSaveEnabled(true);
    setRunEnabled(false);
    // Enable save button and hide simulation results when field is edited
    if (simulationCompleted || showSimulationResults) {
      setIsEditable(true);
      setShowSimulationResults(false);
      setSimulationCompleted(false);
    }
    // Show change configuration confirmation if simulation results exist
    if (simulationCompleted || customResultSuccess === 'S-20038') {
      guardLocalChange(() => {
        setBessCapacity(previousValue);
        if (customSimulResult?.data) {
          setShowSimulationResults(true);
          setSimulationCompleted(true);
          setIsEditable(false); // Keep non-editable if results exist for reverted value
        }
      });
    }
  };

  // Handler for DG capacity change with confirmation
  const handleDgCapacityChange = (newValue: number) => {
    const previousValue = dgCapacity;
    setDgCapacity(newValue);
    setSaveEnabled(true);
    setRunEnabled(false);
    // Enable save button and hide simulation results when field is edited
    if (simulationCompleted || showSimulationResults) {
      setIsEditable(true);
      setShowSimulationResults(false);
      setSimulationCompleted(false);
    }
    // Show change configuration confirmation if simulation results exist
    if (simulationCompleted || customResultSuccess === 'S-20038') {
      guardLocalChange(() => {
        setDgCapacity(previousValue);
        if (customSimulResult?.data) {
          setShowSimulationResults(true);
          setSimulationCompleted(true);
          setIsEditable(false); // Keep non-editable if results exist for reverted value
        }
      });
    }
  };

  // Removed redundant useEffect for customSimulationResultRequest on simulation_id change

  useEffect(() => {
    if (!customData) return;

    setDurationClass(customData.duration_class === BessContainerTypes['5 MWh / 2.5 MW (2-hour, 0.5C)'] ? '2-hour' : '4-hour');

    setBessCapacity(customData.bess_capacity ?? 5);

    setDgCapacity(customData.dg_capacity ?? 200);
  }, [customData]);

  const handleViewDetailedAnalysis = () => {
    dispatch(setShowDetailedAnalysis(true));
  };

  const handleBackFromDetailedAnalysis = () => {
    dispatch(setShowDetailedAnalysis(false));
  };

  const step = 5;
  const format: any = (val: number) => Number(val.toFixed(2));

  const bessPower = durationClass === '2-hour' ? bessCapacity / 2 : bessCapacity / 4;
  const configData = [
    {label: 'Load', value: `${loadData?.config?.load_mw ?? 0} MW`},
    {label: 'Solar Peak', value: `${solarData?.peak_generation ?? 0} MW`},
    {label: 'BESS', value: `${bessCapacity ?? 0} MWh / ${format(bessPower)} MW`},
    {label: 'DG', value: hasGenerator ? `${dgCapacity ?? 0} MW` : 'OFF'},
  ];

  const stats = hasGenerator
    ? [
        {label: 'Load Met (%)', value: customSimulResult?.data?.delivery_percentage ?? '-'},
        {label: 'Green Hours (%)', value: customSimulResult?.data?.green_percentage ?? '-'},
        {label: 'Generator Hours', value: customSimulResult?.data?.dg_hrs ?? '-'},
        {label: 'Fuel Used (L)', value: customSimulResult?.data?.fuel_l ?? '-'},
        {label: 'Wastage Energy (%)', value: customSimulResult?.data?.wastage_percentage ?? '-'},
        {label: 'Green Hours', value: customSimulResult?.data?.green_hrs ?? '-'},
        {label: 'Avg. Battery Cycles/day', value: customSimulResult?.data?.bess_cycles ?? '-'},
        {label: 'Unmet Energy (MWh)', value: customSimulResult?.data?.unserved_mwh ?? '-'},
        {label: 'Generator Starts', value: customSimulResult?.data?.dg_starts ?? '-'},
        {label: 'Hours Fully Served', value: customSimulResult?.data?.delivery_hrs ?? '-'},
        {label: 'Total Load Hours', value: customSimulResult?.data?.load_hrs ?? '-'},
      ]
    : [
        {label: 'Load Met (%)', value: customSimulResult?.data?.delivery_percentage ?? '-'},
        {label: 'Green Hours (%)', value: customSimulResult?.data?.green_percentage ?? '-'},
        {label: 'Wastage Energy (%)', value: customSimulResult?.data?.wastage_percentage ?? '-'},
        {label: 'Green Hours', value: customSimulResult?.data?.green_hrs ?? '-'},
        {label: 'Avg. Battery Cycles/day', value: customSimulResult?.data?.bess_cycles ?? '-'},
        {label: 'Unmet Energy (MWh)', value: customSimulResult?.data?.unserved_mwh ?? '-'},
        {label: 'Hours Fully Served', value: customSimulResult?.data?.delivery_hrs ?? '-'},
        {label: 'Total Load Hours', value: customSimulResult?.data?.load_hrs ?? '-'},
      ];

  const handleSave = () => {
    if (!simulation_id) return;

    const payload = {
      simulation_id,
      duration_class: durationClass === '2-hour' ? BessContainerTypes['5 MWh / 2.5 MW (2-hour, 0.5C)'] : BessContainerTypes['5 MWh / 1.25 MW (4-hour, 0.25C)'],
      bess_capacity: bessCapacity ?? null,
      dg_capacity: dgCapacity ?? null,
    };

    dispatch(customConfigRequest(payload));
  };

  // Keep the loader only while the request is in flight or the wizard progress
  // data is still missing. A missing custom config should fall back to defaults
  // instead of trapping the page in the skeleton state.
  const isInitialLoad = isCustomConfigLoading || isSimulationProgressLoading;

  if (isInitialLoad) {
    return <CustomConfigurationGhostLoader />;
  }

  if (showDetailedAnalysis) {
    return <ViewDetailedAnalysis onBack={handleBackFromDetailedAnalysis} />;
  }

  // Empty state logic: only show if there is truly no result and simulation is not completed
  const shouldShowEmptyState1 = !simulProgressData || simulProgressData?.status !== 2;

  if (shouldShowEmptyState1) {
    return (
      <>
        {shouldShowExternalSimulationMessage && (
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <Icon name="infoCircle" className="size-4.5! text-warning!" />
              <Text variant="14M" className="text-warning!">
                Another simulation is currently running. You'll be able to start a new one once it finishes.
              </Text>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center min-h-full! gap-4 py-10">
          <CustomConfigurationEmptyStateIcon />
          <Text variant="h4" className="text-text-secondary! font-InterMedium!">
            Run the sizing simulation in Step 3 to generate and view configuration results.
          </Text>
        </div>
        {(isSimulationRunning || isBlocked || shouldBlock) &&
          createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
      </>
    );
  }

  return (
    <div className="main">
      <div className="flex gap-3">
        <div className="bg-[#F7FDFC] p-4 mt-5 border-[1.4px] border-[#B6D7D3] rounded-lg w-[65%]">
          <div className="flex items-center gap-3">
            <Icon name="call-setting" className="text-black! size-6.75!" />
            <Text variant={'h4'} className="font-SpaceGroteskBold">
              Configuration Setup
            </Text>
          </div>
          <div className="flex gap-4 mt-1 items-stretch">
            <div className="bg-white p-4 mt-5 border-[1.4px] border-border rounded-md w-full xl:w-[60%] tabular-nums">
              <Text variant={'18SB'} className="text-primary! font-InterSemiBold!">
                BESS Size
              </Text>
              <Text variant={'14R'} className="text-text-secondary! mt-7!">
                Duration Class:
              </Text>
              <div className="flex lg:flex-col xl:flex-row gap-6 mt-7">
                <Radio
                  checked={durationClass === '2-hour'}
                  onCheckedChange={() => handleDurationClassChange('2-hour')}
                  label="2-hour (0.5C)"
                  size="sm"
                  disabled={isAssignedUser}
                />
                <Radio
                  checked={durationClass === '4-hour'}
                  onCheckedChange={() => handleDurationClassChange('4-hour')}
                  label="4-hour (0.25C)"
                  size="sm"
                  disabled={isAssignedUser}
                />
              </div>
              <div className="mt-9 w-full">
                <TextInput
                  label="BESS Capacity (MWh)"
                  labelClassName="text-text-secondary! font-InterMedium!"
                  value={String(bessCapacity)}
                  showStepper
                  readonly
                  readOnlyClassName="bg-white border-1!"
                  integer
                  min={5}
                  max={1000}
                  onChange={val => {
                    const num = Number(val);
                    if (!Number.isNaN(num) && num >= 5 && num <= 1000) {
                      handleBessCapacityChange(num);
                    }
                  }}
                  onIncrement={() => {
                    handleBessCapacityChange(format(Math.min(1000, bessCapacity + step)));
                  }}
                  onDecrement={() => {
                    handleBessCapacityChange(format(Math.max(5, bessCapacity - step)));
                  }}
                  onBlur={() => {
                    handleBessCapacityChange(format(Math.max(5, Math.min(1000, bessCapacity))));
                  }}
                  className="w-full! tabular-nums"
                  decrementDisabled={bessCapacity <= 5 || isReadOnly}
                  incrementDisabled={bessCapacity >= 1000 || isReadOnly}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="bg-white p-4 mt-5 border-[1.4px] border-border rounded-md w-full xl:w-[60%] tabular-nums flex flex-col">
              <Text variant={'18SB'} style={{color: '#2F9C8F', fontSize: '18px', lineHeight: '30px'}} className="font-InterSemiBold!">
                DG Size
              </Text>

              {hasGenerator ? (
                <div className="mt-4 w-full">
                  <TextInput
                    label="DG Capacity (MW)"
                    labelClassName="text-text-secondary! font-InterMedium!"
                    value={String(dgCapacity)}
                    readonly
                    readOnlyClassName="bg-white border-1!"
                    integer
                    min={0}
                    max={200}
                    showStepper
                    onChange={val => {
                      const num = Number(val);
                      if (!Number.isNaN(num) && num >= 0 && num <= 200) {
                        handleDgCapacityChange(num);
                      }
                    }}
                    onIncrement={() => {
                      handleDgCapacityChange(format(Math.min(200, dgCapacity + step)));
                    }}
                    onDecrement={() => {
                      handleDgCapacityChange(format(Math.max(0, dgCapacity - step)));
                    }}
                    onBlur={() => {
                      handleDgCapacityChange(format(Math.max(0, Math.min(200, dgCapacity))));
                    }}
                    className="w-full! tabular-nums"
                    decrementDisabled={dgCapacity <= 0 || isReadOnly}
                    incrementDisabled={dgCapacity >= 200 || isReadOnly}
                    disabled={isReadOnly}
                  />
                </div>
              ) : (
                <div className="bg-[#F8FCFF] border border-[#E2E4EA] rounded-md flex flex-1 items-center justify-center w-full px-[14px] py-4 mt-4">
                  <div className="flex flex-col items-center text-center w-full max-w-90 gap-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
        <div className="w-[35%] mt-5 rounded-2xl p-6 shadow-sm border-l-4 border-primary!">
          <Text variant="18SB" className="font-InterSemiBold! leading-none! text-primary! mb-5">
            Configuration Summary
          </Text>

          {configData.map((item, index) => (
            <div key={item.label}>
              <div className="flex items-center justify-between py-5">
                <Text variant="body1" className="text-text-primary! font-InterMedium!">
                  {item.label}
                </Text>

                <Text
                  variant="body1"
                  className={item.label === 'DG' && item.value === 'OFF' ? 'font-InterMedium! text-text-placeholder!' : 'font-InterMedium! text-[#0F6E62]!'}>
                  {item?.value}
                </Text>
              </div>

              {index !== configData.length - 1 && <div className="border-b border-[#D7DCDD]" />}
            </div>
          ))}
        </div>
      </div>
      {(isSimulationRunning || isBlocked || shouldBlock) &&
        createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
      {/* Button workflow logic */}
      {/* Show loader if simulation is running, else show Save/Run CTAs if editable */}
      {showLoader ? (
        <div className="flex justify-center gap-3 mt-4">
          <img src={Images.loading} alt="Loading" className="text-text-primary!" style={{width: 32, height: 32}} />
        </div>
      ) : (
        isEditable && (
          <div className="flex justify-center gap-3 mt-4">
            {!isReadOnly && (
              <Button variant="secondary" size="md" className="self-center w-30 flex justify-center" onClick={handleSave} disabled={!saveEnabled}>
                Save
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-50 my-6 flex justify-center"
              onClick={() => {
                setShowSimulationResults(false);
                setRunClicked(true);
                handleRunSimulation();
                // Start polling after 3s if socket doesn't complete
                startPolling();
              }}
              disabled={!runEnabled || isReadOnly}>
              Run Simulation
            </Button>
          </div>
        )
      )}
      {/* Simulation completed block */}
      {simulationCompleted && (
        <div className="flex justify-center items-center my-4!">
          <div className="bg-primary-tint-2 p-3 px-6 flex items-center  gap-3 w-fit rounded-md">
            <Icon name="circle-check-big" className="text-success! mt-0.5!" size={18} />
            <Text variant="16M" className="font-InterMedium!">
              Simulation completed
            </Text>
          </div>
        </div>
      )}
      {/* Simulation results block */}
      {(showSimulationResults || customResultSuccess === 'S-20038') && simulationCompleted && (
        <>
          <div className="rounded-2xl border border-gray-300 bg-white p-6">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="clipboardSearch" className="text-primary! size-6.75!" />
              <Text variant="h4">Simulation Results</Text>
            </div>

            <div className="grid grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6.5">
              {stats?.map(item => (
                <div key={item?.label}>
                  <div className="flex items-start gap-1.5">
                    {statIconMap[item?.label] && <Icon name={statIconMap[item?.label] as any} className="text-text-primary! mt-0.5!" size={24} />}
                    <div>
                      <Text variant="14M" className="mb-0 text-[#0F6E62]!">
                        {item?.label}
                      </Text>
                      <Text variant="h4" className=" text-text-primary! ">
                        {item?.value}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-[#F9F9FA] px-6 py-3">
            <div className="flex items-center gap-4 w-[65%]! xl:w-full">
              <Icon name="analysis" className="text-black! size-6.75!" />{' '}
              <Text variant="caption" className="font-normal text-text-secondary! flex flex-wrap">
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
        </>
      )}
      {shouldShowExternalSimulationMessage && (
        <div className="flex justify-center mt-3">
          <div className="flex items-center gap-3">
            <Icon name="infoCircle" className="size-4.5! text-warning!" />
            <Text variant="14M" className="text-warning!">
              Another simulation is currently running. You'll be able to start a new one once it finishes.
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};
