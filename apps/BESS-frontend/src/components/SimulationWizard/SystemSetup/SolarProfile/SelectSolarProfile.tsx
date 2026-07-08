import {Badge, Icon, IconTypes, SelectInput, Text} from '@/ui-kits';
import {downloadElementAsImage} from '@/utils';
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
import {CustomBarChart} from '@/components';
import {useDropdownValues} from '@/hooks';
import {useChangeConfigurationConfirmation} from '../../ChangeConfigurationContext';

export const SelectSolarProfile = ({
  data,
  isFileMode = true,
  maximizedChart,
  onMaximize,
  onMinimize,
  isExpanded: controlledIsExpanded,
  setIsExpanded: setControlledIsExpanded,
  readOnly,
  onProfileChange,
}: Readonly<{
  data?: any;
  isFileMode?: boolean;
  maximizedChart?: 'hourly' | 'monthly' | null;
  onMaximize?: (chart: 'hourly' | 'monthly') => void;
  onMinimize?: () => void;
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

  // Ensure expanded state is preserved when maximizing/minimizing
  useEffect(() => {
    if (maximizedChart && setIsExpanded) {
      setIsExpanded(true);
    }
  }, [maximizedChart, setIsExpanded]);
  const chartRef = useRef<HTMLDivElement>(null);
  const monthlyChartRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadHourlyGeneration = async () => {
    const elements = chartRef.current?.querySelectorAll('.no-export');

    elements?.forEach(el => {
      (el as HTMLElement).style.visibility = 'visible';
    });
    await downloadElementAsImage(chartRef.current, 'hourly_generation.png');

    elements?.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  };

  const handleDownloadMonthlyGeneration = async () => {
    const elements = monthlyChartRef.current?.querySelectorAll('.no-export');

    elements?.forEach(el => {
      (el as HTMLElement).style.visibility = 'visible';
    });

    await downloadElementAsImage(monthlyChartRef.current, 'monthly_generation.png');

    elements?.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  };

  const CustomTooltip = ({active, payload}: any) => {
    if (active && payload?.length) {
      const item = payload[0]?.payload;
      if (!item || item.value === 0) return null;

      return (
        <div className="bg-[#F1F0FF] px-4 py-2 rounded-xl shadow-md no-export">
          <Text variant="btnMedium" className=" font-InterSemibold! text-text-secondary!">
            Hour {item?.hour}
          </Text>
          <Text variant="btnMedium" className=" font-InterSemibold! text-blue!">
            Load {item?.value.toFixed(2)} MW
          </Text>
        </div>
      );
    }
    return null;
  };

  // If a specific chart is maximized, render only that chart fullscreen
  if (maximizedChart === 'hourly') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 h-full flex flex-col">
        {/* Wrap heading and chart together for download */}
        <div ref={chartRef} className="flex-1 flex flex-col bg-white">
          <div className="flex items-center justify-between mb-3 mr-4">
            <div className="ml-11.5">
              <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1">
                Hourly Generation Profile
              </Text>
              <Text variant="small" className="text-sm text-text-secondary!">
                AVERAGE MW BY HOUR OF DAY
              </Text>
            </div>
            <Badge size="sm" className="w-20 border-[1.4px] border-blue" message="Avg Day" color="blue" />
          </div>
          <div className="flex justify-end mr-4">
            <div className="flex items-center gap-3 no-export">
              <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownloadHourlyGeneration} />
              <Icon
                name="minimize"
                size={20}
                className="text-primary-tint-1! cursor-pointer"
                onClick={() => {
                  setIsExpanded(true);
                  onMinimize?.();
                }}
              />
            </div>
          </div>
          <div className="bg-white flex-1">
            <CustomBarChart
              hoverColor="#025681"
              data={hourlyData}
              xKey="hour"
              yKey="value"
              xAxisLabel="Hour of Day"
              yAxisLabel="Average MW"
              barColor="#0284C7"
              barWidth={18}
              tooltipComponent={<CustomTooltip />}
              enableCellHover={true}
            />
          </div>
        </div>
      </div>
    );
  }

  if (maximizedChart === 'monthly') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 h-full flex flex-col">
        {/* Wrap heading and chart together for download */}
        <div ref={monthlyChartRef} className="flex-1 flex flex-col bg-white">
          <div className="flex items-center justify-between mb-3 mr-4">
            <div className="ml-11.5">
              <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1">
                Monthly Solar Generation
              </Text>
              <Text variant="small" className="text-sm text-text-secondary!">
                TOTAL MWh PER MONTH
              </Text>
            </div>
            <Badge size="sm" className="w-20 border-[1.4px] border-primary" message={new Date().getFullYear().toString()} color="primary" />
          </div>
          <div className="flex justify-end mr-4">
            <div className="flex items-center gap-3 no-export">
              <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownloadMonthlyGeneration} />
              <Icon
                name="minimize"
                size={20}
                className="text-primary-tint-1! cursor-pointer"
                onClick={() => {
                  setIsExpanded(true);
                  onMinimize?.();
                }}
              />
            </div>
          </div>
          <div className="bg-white flex-1">
            <CustomBarChart
              data={monthlyData}
              showValues
              xKey="month"
              yKey="value"
              xAxisLabel="Month"
              yAxisLabel="Total MWh"
              barColor="#2F9C8F"
              barWidth={50}
            />
          </div>
        </div>
      </div>
    );
  }

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
                    {/* Wrap heading and chart together for download */}
                    <div ref={chartRef} className="bg-white">
                      <div className="flex items-center justify-between mb-3 mr-4">
                        <div className="ml-11.5">
                          <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1">
                            Hourly Generation Profile
                          </Text>
                          <Text variant="small" className="text-sm text-text-secondary!">
                            AVERAGE MW BY HOUR OF DAY
                          </Text>
                        </div>
                        <Badge size="sm" className="w-20 border-[1.4px] border-blue" message="Avg Day" color="blue" />
                      </div>

                      <div className="flex justify-end mr-4">
                        <div className="flex gap-3 items-center no-export">
                          <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownloadHourlyGeneration} />

                          <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={() => onMaximize?.('hourly')} />
                        </div>
                      </div>

                      <CustomBarChart
                        hoverColor="#025681"
                        data={hourlyData}
                        xKey="hour"
                        yKey="value"
                        xAxisLabel="Hour of Day"
                        yAxisLabel="Average MW"
                        barColor="#0284C7"
                        barWidth={18}
                        tooltipComponent={<CustomTooltip />}
                        enableCellHover={true}
                      />
                    </div>
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
                    {/* Wrap heading and chart together for download */}
                    <div ref={monthlyChartRef} className="bg-white">
                      <div className="flex items-center justify-between mb-3 mr-4">
                        <div className="ml-11.5 mt-4">
                          <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1!">
                            Monthly Solar Generation
                          </Text>
                          <Text variant="small" className="text-sm text-text-secondary!">
                            TOTAL MWh PER MONTH
                          </Text>
                        </div>
                        <Badge size="sm" className="w-20 border-[1.4px] border-primary" message={new Date().getFullYear().toString()} color="primary" />
                      </div>

                      <div className="flex justify-end mr-4">
                        <div className="flex gap-3 items-center no-export">
                          <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownloadMonthlyGeneration} />

                          <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={() => onMaximize?.('monthly')} />
                        </div>
                      </div>

                      <CustomBarChart
                        data={monthlyData}
                        showValues
                        xKey="month"
                        yKey="value"
                        xAxisLabel="Month"
                        yAxisLabel="Total MWh"
                        barColor="#2F9C8F"
                        barWidth={50}
                      />
                    </div>
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
