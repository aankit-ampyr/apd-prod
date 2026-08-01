import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Icon, Text, MonthYearPicker, DatePicker, Tooltip, Skeleton} from '@/ui-kits';
import type {MonthYear, DateRange, HouryChart} from '@/interface';
import EnergyAnalyticsChart from './HourlyGraph';
import {useDispatch, useSelector} from 'react-redux';
import {
  customHourlyChart,
  customMonthlySimulationResults,
  customSimulationSuccess,
  dispatchRuleData,
  initiateSimulationData,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {customHourlyChartRequest} from '@/services/redux/slice/simulationWizardSlice';
import {DGDriggerType} from '@/constants';
import {allProjectsData} from '@/services/redux/selectors';
import type {RootState} from '@/services/redux/rootReducer';
import {downloadElementAsImage} from '@/utils';
import {useChartsActionV2} from '@/hooks';

type ChartViewMode = 'day' | 'month' | 'range';

type DispatchThresholdConfig = {
  dg_trigger_type?: number | null;
  dg_soc_on_threshold?: number | null;
  dg_soc_off_threshold?: number | null;
};

interface HourlyDispatchChartProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
  readonly selectedMonthYear: MonthYear | null;
  readonly setSelectedMonthYear: React.Dispatch<React.SetStateAction<MonthYear | null>>;

  readonly tempDateRange: DateRange;
  readonly setTempDateRange: React.Dispatch<React.SetStateAction<DateRange>>;

  readonly appliedDateRange: DateRange;
  readonly setAppliedDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
}

const ghostCardRows = Array.from({length: 5}, (_, i) => ({id: i}));

function HourlyDispatchChartGhostLoader() {
  return (
    <div className="bg-white">
      <Skeleton animation="wave" variant="rounded" width={220} height={28} className="mb-2 rounded-full!" />
      <Skeleton animation="wave" variant="rounded" width={360} height={18} className="mb-4 rounded-full!" />

      <div className="mb-4 flex items-center gap-4">
        <Skeleton animation="wave" variant="rounded" width={220} height={44} className="rounded-lg!" />
        <Skeleton animation="wave" variant="rounded" width={220} height={44} className="rounded-lg!" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ghostCardRows.map(row => (
          <div key={row.id} className="rounded-2xl border border-border px-5 py-4">
            <Skeleton animation="wave" variant="rounded" width={100} height={16} className="mb-3 rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={80} height={24} className="rounded-full!" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border px-4 pb-3 pt-5">
        <Skeleton animation="wave" variant="rounded" width={200} height={24} className="mb-5 rounded-full!" />
        <Skeleton animation="wave" variant="rounded" width="100%" height={410} className="rounded-xl!" />
      </div>
    </div>
  );
}

const toNumber = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const formatNumber = (value: number, digits = 2) => Number(value.toFixed(digits)).toLocaleString();
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const endOfUtcDay = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));

const getFirstTimestampDate = (hourlyData?: HouryChart[] | null) => {
  const firstTimestamp = hourlyData?.find(row => row.timestamp)?.timestamp;
  if (!firstTimestamp) return null;

  const parsed = new Date(firstTimestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDefaultDateRange = (year: number): DateRange => {
  const firstDay = new Date(Date.UTC(year, 0, 1));
  return {start: firstDay, end: firstDay};
};

const getMonthTimestampRange = (monthYear: MonthYear) => {
  const start = new Date(Date.UTC(monthYear.year, monthYear.month - 1, 1));
  const end = new Date(Date.UTC(monthYear.year, monthYear.month, 0, 23, 59, 59, 999));
  return {startTimestamp: start.toISOString(), endTimestamp: end.toISOString()};
};

const isSameUtcDay = (start: Date, end: Date) => dateKey(start) === dateKey(end);

const isSameUtcMonth = (timestamp: string, monthYear: MonthYear) => {
  const rowDate = new Date(timestamp);
  return monthKey(rowDate) === `${monthYear.year}-${monthYear.month}`;
};

const isInsideUtcDateRange = (timestamp: string, range: DateRange) => {
  if (!range.start || !range.end) return false;

  const timestampMs = Date.parse(timestamp);
  return timestampMs >= startOfUtcDay(range.start).getTime() && timestampMs <= endOfUtcDay(range.end).getTime();
};

export const HourlyDispatchChart = (props: HourlyDispatchChartProps) => {
  const {
    setIsStepsHidden,
    isFullScreen = false,
    selectedMonthYear,
    setSelectedMonthYear,

    tempDateRange,
    setTempDateRange,

    appliedDateRange,
    setAppliedDateRange,
  } = props;
  const dispatch = useDispatch();
  const chartImageRef = useRef<HTMLDivElement>(null);
  const {
    chartRef: chartContainerRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => (
      <HourlyDispatchChart
        {...props}
        isFullScreen
        selectedMonthYear={selectedMonthYear}
        setSelectedMonthYear={setSelectedMonthYear}
        tempDateRange={tempDateRange}
        setTempDateRange={setTempDateRange}
        appliedDateRange={appliedDateRange}
        setAppliedDateRange={setAppliedDateRange}
      />
    ),
  });
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const customSimulationStatus = useSelector(customSimulationSuccess);
  const hourData = useSelector(customHourlyChart);
  const isLoading = useSelector((state: RootState) => state.simulationWizard.hourlyChartLoading);
  const monthlyData = useSelector(customMonthlySimulationResults);
  const dispatchData = useSelector(dispatchRuleData);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);

  // Get project name and simulation name
  const project_id = proSimulData?.project_id;
  const projectName = currentProject?.name || allProjects?.find(p => p.id === project_id)?.name || '';
  const simulationName = proSimulData?.name || '';
  const simulation_id = simulData?.id ?? proSimulData?.id;
  const apiYear = monthlyData?.year;
  const minDate = apiYear ? new Date(apiYear, 0, 1) : undefined;
  const maxDate = apiYear ? new Date(apiYear, 11, 31) : undefined;

  const requestTimestampRange = useMemo(() => {
    if (appliedDateRange.start && appliedDateRange.end) {
      return {
        startTimestamp: startOfUtcDay(appliedDateRange.start).toISOString(),
        endTimestamp: endOfUtcDay(appliedDateRange.end).toISOString(),
      };
    }

    if (selectedMonthYear) {
      return getMonthTimestampRange(selectedMonthYear);
    }

    return null;
  }, [appliedDateRange.end, appliedDateRange.start, selectedMonthYear]);

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);

      const scrollContainer = document.querySelector('.screen-wrapper')?.parentElement;
      scrollContainer?.scrollTo({top: 0, behavior: 'auto'});
      globalThis.scrollTo({top: 0, left: 0, behavior: 'auto'});

      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  useEffect(() => {
    if (!simulation_id) return;

    const waitingForDefaultSelection = !selectedMonthYear && !appliedDateRange.start && !appliedDateRange.end && Boolean(apiYear);
    if (waitingForDefaultSelection) return;

    dispatch(
      customHourlyChartRequest({
        simulation_id,
        start_timestamp: requestTimestampRange?.startTimestamp,
        end_timestamp: requestTimestampRange?.endTimestamp,
      }),
    );
  }, [
    apiYear,
    appliedDateRange.end,
    appliedDateRange.start,
    customSimulationStatus,
    dispatch,
    requestTimestampRange?.endTimestamp,
    requestTimestampRange?.startTimestamp,
    selectedMonthYear,
    simulation_id,
  ]);

  useEffect(() => {
    if (selectedMonthYear || appliedDateRange.start || appliedDateRange.end) return;

    const firstDataDate = getFirstTimestampDate(hourData?.hourly_data);
    const defaultYear = apiYear ?? firstDataDate?.getUTCFullYear();
    if (!defaultYear) return;

    const defaultRange = buildDefaultDateRange(defaultYear);
    setSelectedMonthYear({month: 1, year: defaultYear});
    setTempDateRange(defaultRange);
    setAppliedDateRange(defaultRange);
  }, [apiYear, appliedDateRange.end, appliedDateRange.start, hourData?.hourly_data, selectedMonthYear]);

  const handleMonthYearChange = (monthYear: MonthYear) => {
    setSelectedMonthYear(monthYear);
    setTempDateRange({start: null, end: null});
    setAppliedDateRange({start: null, end: null});
  };

  const handleDateRangeClear = () => {
    setTempDateRange({start: null, end: null});
    setAppliedDateRange({start: null, end: null});
  };

  const handleDateRangeApply = (range: DateRange) => {
    setAppliedDateRange(range);
    if (range.start) {
      setSelectedMonthYear({month: range.start.getMonth() + 1, year: range.start.getFullYear()});
    }
  };

  const handleClearFilters = () => {
    const defaultYear = apiYear ?? new Date().getFullYear();
    const defaultRange = buildDefaultDateRange(defaultYear);
    setSelectedMonthYear({month: 1, year: defaultYear});
    setTempDateRange(defaultRange);
    setAppliedDateRange(defaultRange);
  };

  // Check if filters are active (not at default state)
  const hasActiveFilters = useMemo(() => {
    const defaultYear = apiYear ?? new Date().getFullYear();
    const isDefaultMonth = selectedMonthYear?.month === 1 && selectedMonthYear?.year === defaultYear;

    const expectedDefaultStart = new Date(Date.UTC(defaultYear, 0, 1)).getTime();
    const isDefaultDateRange = appliedDateRange.start?.getTime() === expectedDefaultStart && appliedDateRange.end?.getTime() === expectedDefaultStart;

    if (isDefaultMonth && isDefaultDateRange) {
      return false;
    }
    return true;
  }, [apiYear, selectedMonthYear, appliedDateRange]);

  const hourlyRows = hourData?.hourly_data ?? [];
  const viewMode: ChartViewMode =
    appliedDateRange.start && appliedDateRange.end ? (isSameUtcDay(appliedDateRange.start, appliedDateRange.end) ? 'day' : 'range') : 'month';

  const filteredHourlyRows = useMemo(() => {
    if (!hourlyRows.length) return [];

    if (appliedDateRange.start && appliedDateRange.end) {
      return hourlyRows.filter((row: any) => isInsideUtcDateRange(row.timestamp, appliedDateRange));
    }

    if (selectedMonthYear) {
      return hourlyRows.filter((row: any) => isSameUtcMonth(row.timestamp, selectedMonthYear));
    }

    return hourlyRows;
  }, [appliedDateRange, hourlyRows, selectedMonthYear]);

  const totalHours = filteredHourlyRows.length;
  const deliveredHours = filteredHourlyRows.filter((row: any) => toNumber(row.delivery_mwh) > 0).length;
  const dgHours = filteredHourlyRows.filter((row: any) => toNumber(row.dg_output) > 0).length;
  const avgSoc = totalHours ? filteredHourlyRows.reduce((sum, row: any) => sum + toNumber(row.soc_pct), 0) / totalHours : 0;
  const dispatchThresholdConfig = (dispatchData ?? proSimulData?.config?.dispatch ?? {}) as DispatchThresholdConfig;
  const showThresholdLines = dispatchThresholdConfig.dg_trigger_type === DGDriggerType['Battery SOC threshold'];

  const cards = [
    {
      title: 'Delivery Hours',
      value: hourData?.total_delivery_hours ?? '-',
      icon: <Icon name="truck" className="text-primary! size-4.75!" />,
    },
    {
      title: 'DG Hours',
      value: totalHours ? dgHours : '-',
      icon: <Icon name="hourglass" className="text-primary! size-4.75!" />,
    },
    {
      title: 'Avg SOC%',
      value: totalHours ? `${formatNumber(avgSoc)}%` : '-',
      icon: <Icon name="chart" className="text-primary! size-4.75!" />,
    },
    {
      title: 'Curtailed',
      value: hourData?.curtailed_mwh === undefined ? '-' : `${formatNumber(hourData.curtailed_mwh)} MWh`,
      icon: <Icon name="stats" className="text-primary! size-4.75!" />,
    },
    {
      title: 'Wastage',
      value: hourData?.curtailed_pct === undefined ? '-' : `${formatNumber(hourData.curtailed_pct)}%`,
      icon: <Icon name="coronaTrash" className="text-primary! size-4.75!" />,
    },
  ];

  const handleDownload = useCallback(async () => {
    await downloadElementAsImage(chartImageRef.current, 'hourly_dispatch_chart.png');
  }, []);

  const handleMinimize = useCallback(() => {
    onMinimize();
    globalThis.requestAnimationFrame(() => {
      globalThis.dispatchEvent(new Event('resize'));
    });
  }, [onMinimize]);

  if (isLoading && !hasActiveFilters) {
    return <HourlyDispatchChartGhostLoader />;
  }

  return (
    <div ref={chartContainerRef}>
      {!isFullScreen && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Text variant="h3">Hourly Dispatch Graph</Text>
            <Text variant="14R" className="text-text-secondary! my-1.5">
              Delivery and green energy breakdown by hour. Hover the graph for hourly values.
            </Text>
          </div>
          <div className="bg-primary-tint-2 p-3 self-center rounded-md">
            <Text variant="14M" className="text-text-secondary!">
              Project: <span className="text-text-primary!">{projectName}</span>
            </Text>
            <Text variant="14M" className="text-text-secondary!">
              Simulation: <span className="text-text-primary!">{simulationName}</span>
            </Text>
          </div>
        </div>
      )}

      <div className={`flex w-full items-center ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="mb-4 flex items-center gap-4 mt-6.5!">
            <Text variant="14R" className="text-text-secondary! leading-none! whitespace-nowrap!">
              Select Period :{' '}
              <span className="relative inline-flex group">
                <Icon name="circle-info" className="text-text-secondary! cursor-pointer  translate-y-1" />

                <Tooltip
                  arrowClassName="hidden"
                  textClassName="font-InterMedium!"
                  portal
                  className="z-999 -translate-x-5! border border-[#9ECBC5]! whitespace-normal!"
                  position="top"
                  message="Select a month for monthly view or choose a specific date for detailed analysis."
                />
              </span>
            </Text>
            <MonthYearPicker
              label=""
              value={selectedMonthYear}
              onChange={handleMonthYearChange}
              className="w-60"
              placeholder="Select Month"
              defaultYear={apiYear}
              lockYear
              doneText="Apply"
            />
            <DatePicker
              label=""
              className="w-64"
              placeholder="Select Date Range"
              showActions
              actionTopContent={
                <div className="flex items-center gap-2">
                  <Icon name="circle-info" className="text-text-secondary size-4" />
                  <Text variant="small" className="text-text-secondary! font-InterMedium!">
                    Tip: Select Start & End Dates to View the Full Month
                  </Text>
                </div>
              }
              onClear={handleDateRangeClear}
              clearText="Cancel"
              applyText="Apply"
              defaultYear={apiYear}
              minDate={minDate}
              maxDate={maxDate}
              isRange
              rangeValue={tempDateRange}
              onRangeChange={setTempDateRange}
              onRangeApply={handleDateRangeApply}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="border-primary cursor-pointer hover:border-primary-hover active:border-primary-active border self-stretch rounded-sm px-4 py-1 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                <Icon name="cross" className="text-text-secondary size-3" />
                <Text variant="caption" className="text-text-secondary! whitespace-nowrap!">
                  Clear filters
                </Text>
              </button>
            )}
          </div>
        )}

        <div className={`flex  ${isFullScreen ? 'justify-between' : 'justify-end'} gap-5 pt-1 w-full`}>
          {isFullScreen && (
            <div className="flex flex-col">
              <Text variant="h3">Hourly Dispatch Graph</Text>
              <Text variant="14R" className="text-text-secondary! my-1.5">
                Delivery and green energy breakdown by hour. Hover the graph for hourly values.
              </Text>
            </div>
          )}

          {isFullScreen ? (
            <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleMinimize} />
          ) : (
            <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
          )}
        </div>
      </div>
      {!isFullScreen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card, index) => (
            <div key={index} className="min-h-25.5 rounded-2xl border border-border bg-[linear-gradient(100.13deg,#FFFFFF_-2.32%,#F6FFFE_113.43%)]! px-5 py-4">
              <div className="mb-3 flex items-start justify-between">
                <Text variant="small" className="text-[#0C7165]! font-InterMedium!">
                  {card.title}
                </Text>

                <div>{card.icon}</div>
              </div>

              <div className="flex items-center gap-2">
                <Text variant="h4" className="font-InterBold! text-text-primary!">
                  {card.value}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={chartImageRef} className="bg-white">
        <EnergyAnalyticsChart
          hourlyData={filteredHourlyRows}
          viewMode={viewMode}
          showThresholdLines={showThresholdLines}
          dgOnThreshold={hourData?.dg_on_pct ?? null}
          dgOffThreshold={hourData?.dg_off_pct ?? null}
          hideLegendControls={isFullScreen}
        />
      </div>
    </div>
  );
};
