import {Icon, IconTypes, SelectInput, Text} from '@/ui-kits';
import {useEffect, useRef, useState} from 'react';
import {StorableSolarAnalysis} from './StorableSolarAnalysis';
import {useDispatch, useSelector} from 'react-redux';
import {getSolarProfileSourceRequest, solarProfileRequest} from '@/services/redux/slice/simulationWizardSlice';
import {
  initiateSimulationData,
  projectSimulationData,
  savedSolarProfileData,
  solarProfileData,
  solarProfileSourceListSelector,
} from '@/services/redux/selectors/simulationWizardSelector';
import {useDropdownValues} from '@/hooks';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';
import {HourlyGenerationChart} from './HourlyGenerationChart';
import {MonthlyGenerationChart} from './MonthlyGenerationChart';
import {useChartsActionV2} from '@/hooks';

export const SelectSolarProfile = ({
  setIsStepsHidden,
  data,
  isFileMode = true,
  isExpanded: controlledIsExpanded,
  setIsExpanded: setControlledIsExpanded,
  readOnly,
  onProfileChange,
}: Readonly<{
  setIsStepsHidden?: (hidden: boolean) => void;
  data?: any;
  isFileMode?: boolean;
  isExpanded?: boolean;
  setIsExpanded?: (val: boolean) => void;
  readOnly?: boolean;
  onProfileChange?: () => void;
}>) => {
  const dispatch = useDispatch();
  const {requestChangeConfigurationConfirmation} = useChangeConfigurationConfirmation();
  const SOURCE_PROFILE_OPTIONS = useDropdownValues({
    selector: solarProfileSourceListSelector,
    fetchAction: getSolarProfileSourceRequest,
  });

  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);

  // Use controlled expanded state if provided
  const isExpanded = typeof controlledIsExpanded === 'boolean' ? controlledIsExpanded : false;
  const setIsExpanded = setControlledIsExpanded || (() => {});

  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const simulation_id = simulData?.id ?? proSimulData?.id;
  const previewSolar = useSelector(solarProfileData);
  const savedSolar = useSelector(savedSolarProfileData);
  const hydratedSolarData = previewSolar ?? data ?? savedSolar;
  const currentSolarSourceId = hydratedSolarData?.source?.id ? Number(hydratedSolarData.source.id) : null;

  const solarData = isFileMode && !selectedProfile ? null : hydratedSolarData;

  const lastSimulationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (simulation_id) {
      dispatch(getSolarProfileSourceRequest());
    }
  }, [simulation_id]);

  useEffect(() => {
    if (simulation_id) {
      const selectedSourceId = selectedProfile ? Number(selectedProfile) : null;

      if (!selectedSourceId || selectedSourceId === currentSolarSourceId) {
        return;
      }

      dispatch(
        solarProfileRequest({
          simulation_id,
          payload: {
            type: 'file',
            source_id: selectedSourceId,
          },
        }),
      );
    }
  }, [currentSolarSourceId, dispatch, selectedProfile, simulation_id]);

  useEffect(() => {
    const initialProfileId = hydratedSolarData?.source?.id;
    if (initialProfileId) {
      setSelectedProfile(Number(initialProfileId));
    }
  }, [hydratedSolarData?.source?.id]);

  useEffect(() => {
    const currentId = simulation_id ?? null;
    if (currentId !== lastSimulationIdRef.current) {
      lastSimulationIdRef.current = currentId;
      setSelectedProfile(hydratedSolarData?.source?.id ? Number(hydratedSolarData.source.id) : null);
    }
  }, [simulation_id, hydratedSolarData]);

  const {onMaximize: onHourlyMaximize, onMinimize: onHourlyMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <HourlyGenerationChart setIsStepsHidden={setIsStepsHidden} hourlyData={hourlyData} isFullScreen onMinimize={onHourlyMinimize} />,
  });

  const {onMaximize: onMonthlyMaximize, onMinimize: onMonthlyMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => (
      <MonthlyGenerationChart setIsStepsHidden={setIsStepsHidden} monthlyData={monthlyData} isFullScreen onMinimize={onMonthlyMinimize} />
    ),
  });

  // Clear the saved tick only when user edits the profile (not on mount/remount)
  const handleProfileChange = (item: any) => {
    const selected = item?.id;
    const previousSelectedProfile = selectedProfile;
    setSelectedProfile(selected ? Number(selected) : null);
    if (onProfileChange) onProfileChange();
    if (!simulation_id) return;
    dispatch(
      solarProfileRequest({
        simulation_id,
        payload: {
          type: 'file',
          source_id: Number(selected),
        },
      }),
    );
    requestChangeConfigurationConfirmation({
      onStay: () => {
        setSelectedProfile(previousSelectedProfile);
        if (!previousSelectedProfile) return;
        dispatch(
          solarProfileRequest({
            simulation_id,
            payload: {
              type: 'file',
              source_id: Number(previousSelectedProfile),
            },
          }),
        );
      },
    });
  };

  const generationHours = solarData?.generation_hours;
  const generationPercentage = generationHours !== undefined && generationHours !== null ? ((generationHours / 8760) * 100).toFixed(1) : null;
  const formatValue = (value: any, formatter?: (val: number) => string) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return formatter ? formatter(value) : value;
  };

  const stats: {label: string; value: React.ReactNode; icon: IconTypes}[] = [
    {
      label: 'Total Generation',
      value:
        (selectedProfile || !isFileMode) && solarData
          ? `${formatValue(
              solarData?.total_generation,
              val =>
                `${val.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })} MWh/yr`,
            )}`
          : '--',
      icon: 'sun',
    },
    {
      label: 'Peak Generation',
      value: (selectedProfile || !isFileMode) && solarData ? `${formatValue(solarData?.peak_generation, val => `${val.toFixed(1)} MW`)}` : '--',
      icon: 'rocket',
    },
    {
      label: 'Avg Generation',
      value: (selectedProfile || !isFileMode) && solarData ? `${formatValue(solarData?.avg_generation, val => `${val.toFixed(1)} MW`)}` : '--',
      icon: 'signal-high',
    },
    {
      label: 'Generation Hours',
      value:
        (selectedProfile || !isFileMode) && solarData && generationHours !== undefined && generationHours !== null ? (
          <>
            {generationHours.toLocaleString()}/8760 <span className="text-primary!">({generationPercentage}%)</span>
          </>
        ) : (
          '--'
        ),
      icon: 'watch',
    },
  ];

  const hourlyData =
    solarData?.hourly_generation_graph_points?.map((item: any) => ({
      hour: item?.hour,
      value: Number(item?.value?.toFixed(2)),
    })) || [];

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyData =
    solarData?.monthly_generation_graph_points?.map((item: any) => ({
      month: MONTH_LABELS[item?.month - 1], // 1–12 -> Jan–Dec
      value: Number(item?.value?.toFixed(2)),
    })) || [];

  return (
    <div className="mt-5">
      {isFileMode && (
        <>
          <Text variant={'body1'} className=" text-primary! font-InterSemiBold! mb-4">
            Select Solar Profile
          </Text>
          <SelectInput
            placeholder="Select Solar Profile"
            options={SOURCE_PROFILE_OPTIONS}
            value={selectedProfile}
            disabled={!!readOnly}
            onChange={handleProfileChange}
            className="w-[50%]"
          />
          {selectedProfile && (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-6 h-6 bg-[#D1FADF]! rounded-full flex items-center justify-center">
                <Icon name="circle-check-big" size={16} className="text-success!" />
              </div>
              <Text variant={'body1'} className=" text-text-primary! font-InterRegular!">
                Loaded: {solarData?.source?.metadata?.rows || 0} hours
              </Text>
            </div>
          )}
        </>
      )}

      {true && (
        <>
          <div className="mt-6 border border-border rounded-lg bg-white overflow-hidden">
            {/* Top Stats Row */}
            <div className="grid grid-cols-4 divide-x border-b divide-gray-300  border-border">
              {stats.map((item, index) => (
                <div key={item.label} className="p-4 flex flex-col gap-2">
                  {/* Label + Icon */}
                  <div className="flex items-center justify-between">
                    <Text variant="small" className="text-sm text-text-secondary">
                      {item.label}
                    </Text>

                    {item.icon ? <Icon name={item.icon} size={18} className="text-text-primary" /> : <div className="w-4 h-4 rounded-full bg-gray-300" />}
                  </div>

                  {/* Value */}
                  <Text className="text-lg font-semibold">{item.value}</Text>
                </div>
              ))}
            </div>

            {/* Expand Section */}
            <div className="flex items-center justify-between p-4">
              <Text variant="caption2" className="text-primary! font-InterBold!">
                {isExpanded ? 'Hourly and Monthly Generation Graph' : 'Preview Hourly and Monthly Generation Graph'}
              </Text>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 cursor-pointer ${(!selectedProfile && isFileMode) || !solarData ? 'opacity-50 pointer-events-none' : ''}`}
                disabled={(!selectedProfile && isFileMode) || !solarData}>
                <Text variant="caption2" className="text-primary! font-InterBold!">
                  Click to Expand graph
                </Text>

                <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-primary!">
                  <Icon name={isExpanded ? 'cheveron-up' : 'cheveron-down'} size={12} className="text-white" />
                </div>
              </button>
            </div>

            {/* Expand Content */}
            {isExpanded && solarData && (
              <>
                <div className="border-t border-gray-200 pt-4"></div>

                <div className="flex flex-col xl:flex-row relative">
                  {/* ===== LEFT (Hourly) ===== */}

                  <div className="w-full xl:w-[50%]">
                    <HourlyGenerationChart hourlyData={hourlyData} onMaximize={onHourlyMaximize} />
                  </div>

                  {/* ===== DIVIDER ===== */}
                  <div
                    className="
    absolute
    left-0 right-0 top-1/2 h-px bg-gray-300
    xl:left-1/2
    xl:right-auto
    xl:-top-3.75
    xl:bottom-1
    xl:w-px
    xl:h-[calc(100%+1rem)]
  "
                  />
                  {/* ===== RIGHT (Monthly) ===== */}
                  <div className="w-full xl:w-[50%]">
                    <MonthlyGenerationChart monthlyData={monthlyData} onMaximize={onMonthlyMaximize} />
                  </div>
                </div>
              </>
            )}
          </div>
          <hr className="text-gray-300 my-5" />

          <StorableSolarAnalysis data={solarData} />
        </>
      )}
    </div>
  );
};
