import {
  detailedGreenAnalysisData,
  detailedGreenAnalysisProgressData,
  detailedGreenAnalysisResultData,
  detailedGreenAnalysisSuccess,
  detailedGreenError,
  detailedGreenRunError,
  detailedLoading,
  detailedResultLoading,
  detailedResultSuccess,
  generatorData,
  initiateSimulationData,
  projectSimulationData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {
  clearDetailedGreenErrors,
  detailedGreenAnalysisDataRequest,
  detailedGreenAnalysisProgressRequest,
  detailedGreenAnalysisRequest,
  detailedGreenAnalysisResultRequest,
  getGreenAnalysisProgressSilentRequest,
  refreshProjectSimulationRequest,
  setShowDetailedGreenAnalysis,
  setShowGreenAnalysisResults,
} from '@/services/redux/slice/simulationWizardSlice';
import {Alert, Button, Icon, Text} from '@/ui-kits';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useDetailedGreenEnergySimulation} from './hooks/useDetailedGreenEnergySimulation';
import {createPortal} from 'react-dom';
import {useSimulationStatus} from '../SimulationStatusContext';
import {getGreenAnalysisHourlyExport, getGreenAnalysisMonthlyExport} from '@/services/api';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';
import {Images} from '@lazarus/react-common';
import {allProjectsData, authDataSelector} from '@/services/redux/selectors';
import {ConfigurationOutOfSync} from '../OutOfSyncPopup';

function DetailedAnalysisGhostLoader() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-72 rounded bg-gray-200" />
        <div className="h-12 w-64 rounded-md bg-gray-200" />
      </div>

      {/* Configuration Card */}
      <div className="mt-5 rounded-md border border-border p-5">
        <div className="flex items-start gap-3">
          <div className="h-6 w-6 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-6 w-56 rounded bg-gray-200" />
            <div className="h-4 w-96 rounded bg-gray-200" />
          </div>
        </div>

        <div className="mt-6 rounded-md border border-border p-5">
          <div className="grid grid-cols-4 gap-8">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
                <div className="h-14 w-full rounded-md bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-4 gap-5">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
              </div>

              <div className="mt-4 h-7 w-32 rounded bg-gray-200" />
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <div className="h-10 w-32 rounded-md bg-gray-200" />
          <div className="h-10 w-48 rounded-md bg-gray-200" />
        </div>
      </div>

      {/* Results Skeleton */}
      <div className="mt-8 rounded-2xl border border-border p-6">
        <div className="h-7 w-56 rounded bg-gray-200 mb-8" />

        <div className="grid grid-cols-4 gap-6">
          {Array.from({length: 12}).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-3 h-6 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Files */}
      <div className="mt-6 rounded-lg border border-border p-6">
        <div className="h-7 w-48 rounded bg-gray-200 mb-8" />

        {Array.from({length: 2}).map((_, i) => (
          <div key={i} className={i ? 'mt-6' : ''}>
            <div className="h-5 w-44 rounded bg-gray-200 mb-3" />

            <div className="rounded-lg border border-border p-4">
              <div className="flex justify-between">
                <div>
                  <div className="h-5 w-64 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-20 rounded bg-gray-200" />
                </div>

                <div className="h-5 w-5 rounded bg-gray-200" />
              </div>

              <div className="mt-5 h-12 w-full rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ProjectOption = {
  id?: number | string;
  name?: string;
};

export const DetailedAnalysis = () => {
  const dispatch = useDispatch();
  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus() ?? {};
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();

  const dgData = useSelector(generatorData);
  const detailedData = useSelector(detailedGreenAnalysisData);
  const detailedResult = useSelector(detailedGreenAnalysisResultData);
  const saveSuccess = useSelector(detailedGreenAnalysisSuccess);
  const resultSuccess = useSelector(detailedResultSuccess);
  const progressData = useSelector(detailedGreenAnalysisProgressData);
  const isLoading = useSelector(detailedResultLoading);
  const saveError = useSelector(detailedGreenError);
  const runError = useSelector(detailedGreenRunError);
  const isDataLoading = useSelector(detailedLoading);

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const shouldBlock = isAnySimulationRunning && runningSimulationId === simulation_id;

  const authData = useSelector(authDataSelector);
  const allProjData = useSelector(allProjectsData);
  const projectId = simulData?.project_id ?? proSimulData?.project_id;
  const currentProject = allProjData?.find((project: any) => Number(project?.id) === projectId);
  const isAssignedUser = Boolean(authData?.id && currentProject?.assigned_users?.some((user: any) => user.id === authData.id));
  const isProjectAssignmentPending = Boolean(authData?.id && projectId && !currentProject);
  const isReadOnly = isAssignedUser || isProjectAssignmentPending;
  const allProjects = useSelector(allProjectsData);
  const project_id = proSimulData?.project_id;

  const projectName = currentProject?.name || (allProjects as ProjectOption[] | undefined)?.find(project => project.id === project_id)?.name || '';
  const [solarPeak, setSolarPeak] = useState(50);
  const [bessCapacity, setBessCapacity] = useState(5);
  const [dgCapacity, setDgCapacity] = useState(200);
  const [saveEnabled, setSaveEnabled] = useState(true);
  const [runEnabled, setRunEnabled] = useState(false);
  const [runClicked, setRunClicked] = useState(false);

  const [selectedDuration, setSelectedDuration] = useState('2-hour');

  const [initialValues, setInitialValues] = useState({
    duration: '2-hour',
    solarPeak: 50,
    bessCapacity: 5,
    dgCapacity: 200,
  });

  const durationClass = selectedDuration === '2-hour' ? 1 : 2;

  const hasGenerator = dgData?.is_included;

  const {handleRunSimulation, isBlocked, isSimulationRunning, setIsSimulationRunning}: any = useDetailedGreenEnergySimulation({
    simulationId: simulation_id,
    onSimulationCompleted: () => {
      if (simulation_id) {
        dispatch(
          detailedGreenAnalysisDataRequest({
            simulation_id,
          }),
        );
        dispatch(detailedGreenAnalysisResultRequest({simulation_id}));
        dispatch(detailedGreenAnalysisProgressRequest({simulation_id}));
        dispatch(
          refreshProjectSimulationRequest({
            simulation_id: Number(simulation_id),
          }),
        );
      }
    },
  });

  const shouldShowExternalSimulationMessage = !isSimulationRunning && (isBlocked || shouldBlock);

  const hasChanges =
    selectedDuration !== initialValues.duration ||
    solarPeak !== initialValues.solarPeak ||
    bessCapacity !== initialValues.bessCapacity ||
    dgCapacity !== initialValues.dgCapacity;

  useEffect(() => {
    if (simulation_id) {
      dispatch(
        detailedGreenAnalysisDataRequest({
          simulation_id,
        }),
      );
      dispatch(detailedGreenAnalysisResultRequest({simulation_id}));
      dispatch(detailedGreenAnalysisProgressRequest({simulation_id}));
    }
  }, [simulation_id]);

  useEffect(() => {
    if (saveSuccess === 'S-20052' || saveSuccess === 'S-20051') {
      setSaveEnabled(false);
      setRunEnabled(true);
    }
  }, [saveSuccess]);

  useEffect(() => {
    if (hasChanges) {
      setSaveEnabled(true);
      setRunEnabled(false);
    }
  }, [hasChanges]);

  useEffect(() => {
    if (detailedData) {
      setSelectedDuration(detailedData?.duration_class === 2 ? '4-hour' : '2-hour');
      setSolarPeak(Number(detailedData?.solar_peak));
      setBessCapacity(Number(detailedData?.bess_capacity));
      setDgCapacity(Number(detailedData?.dg_capacity));

      setInitialValues({
        duration: detailedData.duration_class === 2 ? '4-hour' : '2-hour',
        solarPeak: Number(detailedData.solar_peak),
        bessCapacity: Number(detailedData.bess_capacity),
        dgCapacity: Number(detailedData.dg_capacity),
      });
    }
  }, [detailedData]);

  useEffect(() => {
    if (resultSuccess === 'S-20055' || progressData?.status === 2) {
      setRunClicked(false);
    }
  }, [resultSuccess, progressData]);

  useEffect(() => {
    if (saveError === 'E-20059' || runError === 'E-20059') {
      setRunClicked(false);
      setIsSimulationRunning(false);
    }
  }, [saveError, runError]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    return {
      updatedDate: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      updatedTime: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  };

  const {updatedDate, updatedTime} = formatDateTime(String(detailedResult?.created_at));

  const LIMITS = {
    solar: {
      min: 10,
      max: 500,
      step: 10,
    },
    bess: {
      min: 5,
      max: 1000,
      step: 5,
    },
    dg: {
      min: 0,
      max: 200,
      step: 5,
    },
  };

  // Stat icon mapping
  const statIconMap: Record<string, string> = {
    'Load Met (%)': 'gisLayerUpload',
    'Green Hours (%)': 'dotted-clock',
    'Green Hours (Mar–Oct) (%)': 'retry-number',
    'Green Energy (%)': 'leaf',
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

  const durationOptions = [
    {label: '2-hour', value: '(0.5C)', active: true},
    {label: '4-hour', value: '(0.25C)', active: false},
  ];

  const summaryCards = [
    {
      title: 'Load',
      value: `${proSimulData?.config?.load?.config?.load_mw} MW`,
      icon: 'bar',
      iconColor: '#10B981',
      border: '#22CE9561',
      background: 'linear-gradient(98.04deg, #FFFFFF 58.19%, #C8FFC5 195.23%)',
      iconBackground: 'linear-gradient(134.3deg, rgba(255,255,255,0.9) -30.04%, rgba(192,255,234,0.9) 166.31%, rgba(255,255,255,0.9) 427.91%)',
    },
    {
      title: 'Solar Peak',
      value: `${proSimulData?.config?.solar?.peak_generation} MWp`,
      icon: 'sun',
      iconColor: '#ED9024',
      border: '#FFE3C2',
      background: 'linear-gradient(111.49deg, #FFFFFF 24.82%, #FFF7ED 119.03%)',
      iconBackground: 'linear-gradient(140.89deg, rgba(255,251,247,0.9) -31.61%, rgba(255,235,212,0.9) 57.86%, rgba(255,226,192,0.9) 136.08%)',
    },
    {
      title: 'BESS',
      value: `${bessCapacity} MWh / ${bessCapacity / durationClass} MW`,
      icon: 'big-battery',
      iconColor: '#811DD8',
      border: '#E7CCFF',
      background: 'linear-gradient(110.83deg, #FFFFFF -1.62%, #F5F3FF 125.41%)',
      iconBackground: '#8B5CF61A',
    },
    {
      title: 'DG',
      value: `${dgCapacity} MW`,
      icon: 'gear-drop',
      iconColor: '#005DFF',
      border: '#C4DAFF',
      background: 'linear-gradient(110.83deg, #FFFFFF -1.62%, #F5F3FF 125.41%)',
      iconBackground: 'linear-gradient(138.61deg, rgba(247,250,255,0.9) -31.06%, rgba(212,225,255,0.9) 153.29%, rgba(116,176,255,0.9) 314.48%)',
    },
  ];

  const stats = hasGenerator
    ? [
        {label: 'Load Met (%)', value: detailedResult?.delivery_pct ?? '-'},
        {label: 'Green Energy (%)', value: detailedResult?.green_energy_pct ?? '-'},
        {label: 'Green Hours (%)', value: detailedResult?.green_pct ?? '-'},
        {label: 'Green Hours (Mar–Oct) (%)', value: detailedResult?.green_hours_mar_oct_pct ?? '-'},
        {label: 'Generator Hours', value: detailedResult?.dg_hours ?? '-'},
        {label: 'Fuel Used (L)', value: detailedResult?.fuel_consumption_l ?? '-'},
        {label: 'Wastage Energy (%)', value: detailedResult?.wastage_pct ?? '-'},
        {label: 'Green Hours', value: detailedResult?.green_hours ?? '-'},
        {label: 'Avg. Battery Cycles/day', value: detailedResult?.bess_cycles ?? '-'},
        {label: 'Unmet Energy (MWh)', value: detailedResult?.unserved_mwh ?? '-'},
        {label: 'Generator Starts', value: detailedResult?.dg_starts ?? '-'},
        {label: 'Hours Fully Served', value: detailedResult?.delivery_hours ?? '-'},
        {label: 'Total Load Hours', value: detailedResult?.load_hours ?? '-'},
      ]
    : [
        {label: 'Load Met (%)', value: detailedResult?.delivery_pct ?? '-'},
        {label: 'Green Energy (%)', value: detailedResult?.green_energy_pct ?? '-'},
        {label: 'Green Hours (%)', value: detailedResult?.green_pct ?? '-'},
        {label: 'Green Hours (Mar–Oct) (%)', value: detailedResult?.green_hours_mar_oct_pct ?? '-'},
        {label: 'Wastage Energy (%)', value: detailedResult?.wastage_pct ?? '-'},
        {label: 'Green Hours', value: detailedResult?.green_hours ?? '-'},
        {label: 'Avg. Battery Cycles/day', value: detailedResult?.bess_cycles ?? '-'},
        {label: 'Unmet Energy (MWh)', value: detailedResult?.unserved_mwh ?? '-'},
        {label: 'Hours Fully Served', value: detailedResult?.delivery_hours ?? '-'},
        {label: 'Total Load Hours', value: detailedResult?.load_hours ?? '-'},
      ];

  const analysisFiles = [
    {
      sectionTitle: 'Monthly Performance',
      fileName: `SIM-${simulation_id}_Monthly_Performance_report.csv`,
      size: '~ 0.001 MB',
      period: `01 Jan ${proSimulData?.config?.solar?.source?.year} - 31 Dec ${proSimulData?.config?.solar?.source?.year}`,
      updatedDate: updatedDate,
      updatedTime: updatedTime,
      onClick: () =>
        getGreenAnalysisMonthlyExport(Number(simulation_id), {
          fileName: `SIM-${simulation_id}_Monthly_Performance_report.csv`,
        }),
    },
    {
      sectionTitle: 'Hourly Data Table',
      fileName: `SIM-${simulation_id}_Hourly_Performance_report.csv`,
      size: '~ 1.2 MB',
      period: `01 Jan ${proSimulData?.config?.solar?.source?.year} - 31 Dec ${proSimulData?.config?.solar?.source?.year}`,
      updatedDate: updatedDate,
      updatedTime: updatedTime,
      onClick: () =>
        getGreenAnalysisHourlyExport(Number(simulation_id), {
          fileName: `SIM-${simulation_id}_Hourly_Performance_report.csv`,
        }),
    },
  ];

  const handleSave = () => {
    if (!simulation_id) return;

    dispatch(
      detailedGreenAnalysisRequest({
        simulation_id,
        duration_class: durationClass,
        solar_peak: solarPeak,
        bess_capacity: bessCapacity,
        dg_capacity: dgCapacity,
      }),
    );
  };

  const showResults = (resultSuccess === 'S-20055' || progressData?.status === 2) && !hasChanges;
  const isOutOfSync = saveError === 'E-20059' || runError === 'E-20059';

  const dismissOutOfSync = () => {
    dispatch(clearDetailedGreenErrors());
  };

  const handleOutOfSyncAction = () => {
    dispatch(setShowDetailedGreenAnalysis(false));
    dispatch(setShowGreenAnalysisResults(false));
    dispatch(getGreenAnalysisProgressSilentRequest({simulation_id: Number(simulation_id)}));
    dismissOutOfSync();
  };

  const showLoader = (runClicked || isLoading || isSimulationRunning) && !showResults && !isOutOfSync;

  const QuantitySelector = ({
    label,
    value,
    unit,
    min,
    max,
    step,
    onChange,
  }: {
    label: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }) => {
    const increase = () => {
      if (value < max) {
        onChange(value + step);
      }
    };

    const decrease = () => {
      if (value > min) {
        onChange(value - step);
      }
    };
    return (
      <div className="flex flex-col gap-3">
        <Text variant="14M" className="text-small! xl:text-[14px]!">
          {label} <span className="text-text-secondary text-[10px]! xl:text-[14px]!">({unit})</span>
        </Text>

        {!hasGenerator && label === 'DG Size Capacity' ? (
          <>
            <div className="flex h-10 w-32 items-center justify-center overflow-hidden rounded-sm border border-border bg-[#F3F3F3]">
              <div className="flex items-center gap-2">
                <Icon name="circle-info" className="size-5! text-[#999999]!" />
                <Text variant="caption" className="text-[#999999]!">
                  DG Disabled
                </Text>
              </div>
            </div>
            <Text variant="12R" className="text-text-placeholder! leading-none! text-center! w-32">
              Enable DG in Setup 1{' '}
            </Text>
          </>
        ) : (
          <div className="flex h-10 w-32 items-center overflow-hidden rounded-sm border border-border bg-[#F6F8FD]">
            <button
              onClick={decrease}
              disabled={isReadOnly}
              className={`
flex h-full w-10 items-center justify-center border-r border-border text-lg
${value <= min || isReadOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
`}>
              <Icon name="minus" size={18} className="text-text-placeholder" />
            </button>

            <div className="flex flex-1 items-center justify-center font-InterSemiBold">{value}</div>

            <button
              disabled={isReadOnly}
              onClick={increase}
              className={`
flex h-full w-10 items-center justify-center border-l border-border text-lg
${value >= max || isReadOnly ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
`}>
              <Icon name="plus" size={18} className="text-text-placeholder" />
            </button>
          </div>
        )}
      </div>
    );
  };
  const updateDuration = (value: string) => {
    if (showResults) {
      setSelectedDuration(value);
      requestChangeConfigurationConfirmation({
        forceOpen: true,
        onStay: () => {
          setSelectedDuration(initialValues.duration);
        },
      });
      return;
    }
    setSelectedDuration(value);
  };

  const updateSolarPeak = (value: number) => {
    if (showResults) {
      setSolarPeak(value);
      requestChangeConfigurationConfirmation({
        forceOpen: true,
        onStay: () => {
          setSolarPeak(initialValues.solarPeak);
        },
      });
      return;
    }
    setSolarPeak(value);
  };
  const updateBessCapacity = (value: number) => {
    if (showResults) {
      setBessCapacity(value);
      requestChangeConfigurationConfirmation({
        forceOpen: true,
        onStay: () => {
          setBessCapacity(initialValues.bessCapacity);
        },
      });
      return;
    }
    setBessCapacity(value);
  };
  const updateDgCapacity = (value: number) => {
    if (showResults) {
      setDgCapacity(value);
      requestChangeConfigurationConfirmation({
        forceOpen: true,
        onStay: () => {
          setDgCapacity(initialValues.dgCapacity);
        },
      });
      return;
    }
    setDgCapacity(value);
  };

  if (isDataLoading) {
    return <DetailedAnalysisGhostLoader />;
  }

  return (
    <div className="main">
      <div className="flex justify-between gap-2">
        <Text variant="h2" className="font-InterBold! text-h3! xl:text-h2">
          Calculate Detailed Analysis{' '}
        </Text>

        <div className="bg-primary-tint-2 p-3.5 rounded-md">
          <Text variant="14M" className="text-text-secondary!">
            Project: <span className="text-text-primary!">{projectName}</span>
          </Text>
        </div>
      </div>
      <div className="border border-border rounded-md mt-5 p-5">
        <div className="flex items-start gap-3">
          <Icon name="call-setting" className="text-black! size-5.75! mt-1" />
          <div className="flex flex-col">
            <Text variant={'h4'} className="font-InterBold!">
              Configuration Setup
            </Text>
            <Text variant="14R" className="text-text-secondary! my-1.3">
              Select a combination of BESS, SOLAR & DG to get detailed analysis of that particular simulation
            </Text>
          </div>
        </div>
        <div className="mt-6 rounded-md border border-border p-5">
          <div className="grid grid-cols-4 gap-8">
            {/* Duration */}
            <div>
              <Text variant="14M" className="mb-3 text-small! xl:text-[14px]!">
                BESS Size Duration <span className="text-text-secondary text-[10px] xl:text-[14px]">(hr)</span>
              </Text>

              <div className="flex gap-3">
                {durationOptions.map(item => {
                  const isSelected = selectedDuration === item.label;

                  return (
                    <button
                      key={item.label}
                      disabled={isReadOnly}
                      onClick={() => updateDuration(item.label)}
                      className={`${isReadOnly ? 'cursor-not-allowed!' : 'cursor-pointer'} 
                      flex h-14 w-18 cursor-pointer flex-col items-center justify-center rounded-md border transition-colors
          ${isSelected ? 'border-primary-tint-1 bg-primary/5 text-primary!' : 'border-border bg-white text-text-primary hover:border-primary'}`}>
                      <Text variant="14M" className={`${isSelected ? 'text-primary!' : 'text-text-primary'}`}>
                        {item.label}
                      </Text>
                      <Text variant="12R" className={`${isSelected ? 'text-primary!' : 'text-text-primary'}`}>
                        {item.value}
                      </Text>
                    </button>
                  );
                })}
              </div>
            </div>

            <QuantitySelector
              label="Solar Size Capacity"
              unit="MWp"
              value={solarPeak}
              min={LIMITS.solar.min}
              max={LIMITS.solar.max}
              step={LIMITS.solar.step}
              onChange={updateSolarPeak}
            />

            <QuantitySelector
              label="BESS Size Capacity"
              unit="MWh"
              value={bessCapacity}
              min={LIMITS.bess.min}
              max={LIMITS.bess.max}
              step={LIMITS.bess.step}
              onChange={updateBessCapacity}
            />

            <QuantitySelector
              label="DG Size Capacity"
              unit="MW"
              value={dgCapacity}
              min={LIMITS.dg.min}
              max={LIMITS.dg.max}
              step={LIMITS.dg.step}
              onChange={updateDgCapacity}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-5">
          {summaryCards.map((card: any) => {
            const showNa = !hasGenerator && card.title === 'DG';
            return (
              <div
                key={card.title}
                className="rounded-lg border p-5"
                style={{
                  background: card.background,
                  borderColor: card.border,
                }}>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{background: card.iconBackground}}>
                    <Icon name={card.icon} size={16} style={{color: card.iconColor}} />
                  </div>

                  <Text variant="14M" className="text-sm! xl:text-[14px]!" style={{color: card.iconColor}}>
                    {card.title}
                  </Text>
                </div>

                <Text variant="largeBody" className={`text-[#333B45]! text-left mt-3 font-InterSemiBold! text-[16px]! xl:text-[18px]! whitespace-nowrap`}>
                  {showNa ? 'N/A' : card.value}
                </Text>
              </div>
            );
          })}
        </div>
        {showLoader ? (
          <div className="flex justify-center gap-3 mt-6">
            <img src={Images.loading} alt="Loading" style={{width: 32, height: 32}} />
          </div>
        ) : (
          !showResults && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {!isReadOnly && (
                <Button variant="secondary" size="md" className="w-30 justify-center" disabled={!saveEnabled || isReadOnly} onClick={handleSave}>
                  Save
                </Button>
              )}

              <Button
                size="md"
                className="w-48 justify-center"
                disabled={!runEnabled || isReadOnly}
                onClick={() => {
                  setRunClicked(true);
                  handleRunSimulation();
                }}>
                Run Simulation
              </Button>
            </div>
          )
        )}
      </div>
      {isOutOfSync && (
        <ConfigurationOutOfSync
          open={isOutOfSync}
          onClose={dismissOutOfSync}
          onAction={handleOutOfSyncAction}
          actionText="Green Energy Analysis"
          recommendationText="Rerun the simulation, then open Green Energy Analysis to view the updated results."
        />
      )}

      {showResults && !hasChanges && (
        <>
          <div className="flex justify-center items-center my-4!">
            <div className="bg-primary-tint-2 p-3 px-6 flex items-center  gap-3 w-fit rounded-md">
              <Icon name="circle-check-big" className="text-success! mt-0.5!" size={18} />
              <Text variant="16M" className="font-InterMedium!">
                Simulation completed
              </Text>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 bg-white p-6 mt-5">
            <div className="flex items-center gap-2 mb-6">
              <Icon name="clipboardSearch" className="text-primary! size-6.75!" />
              <Text variant="h4" className="font-InterBold!">
                Simulation Results
              </Text>
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
                      <Text variant="h4" className=" text-text-primary! font-InterBold!">
                        {item?.value}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border p-6">
            <div className="flex items-center gap-3">
              <Icon name="files-2" size={24} className="text-text-primary!" />

              <Text variant="h4" className="font-InterBold!">
                Analysis Files
              </Text>
            </div>

            <div className="mt-7 space-y-6">
              {analysisFiles.map(file => (
                <div key={file.sectionTitle}>
                  <Text variant="18SB" className="text-primary! text-[16px]! xl:text-[18px]!">
                    {file.sectionTitle}
                  </Text>

                  <div className="mt-3 rounded-lg border border-border bg-[#F8FEFD] p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon name="file-tick" size={24} className="mt-1 text-text-primary!" />

                        <div>
                          <Text variant="16M" className="font-InterMedium!">
                            {file.fileName}
                          </Text>

                          <Text variant="12R" className="mt-1 text-text-secondary!">
                            {file.size}
                          </Text>
                        </div>
                      </div>

                      <button className="cursor-pointer" onClick={file.onClick}>
                        <Icon name="download" size={18} className="text-text-primary!" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-white px-4 py-3">
                      <Text variant="12R">
                        <span className="font-InterMedium!">Simulation period :</span> {file.period}
                      </Text>

                      <Text variant="12R">
                        <span className="font-InterMedium!">Last Updated:</span> {file.updatedDate} • {file.updatedTime}
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {(isSimulationRunning || isBlocked || shouldBlock) &&
        !isOutOfSync &&
        createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
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
    </div>
  );
};
