import {useState, useEffect, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable} from '@/components';
import type {DataTableColumn, SortType, CustomMonthlyResults, MonthYear} from '@/interface';
import {Sort, Text, Tooltip, Icon, MultiMonthYearPicker, Skeleton} from '@/ui-kits';
import {customMonthlySimulationResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {getCustomMonthlySimulationResultsExport} from '@/services/api';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type LabelProps,
  type TooltipContentProps,
} from 'recharts';
import {
  customMonthlySimulationResults,
  customConfigData,
  initiateSimulationData,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData} from '@/services/redux/selectors';
import type {RootState} from '@/services/redux/rootReducer';
import {useChartsActionV2} from '@/hooks';
import {downloadElementAsImage} from '@/utils';

interface MonthlyPerformanceRow {
  month: string;
  loadMet: number;
  greenEnergy: number;
  wastedEnergy: number;
  hoursFullyServed: number;
  totalLoadHours: number;
  generatorHours: number;
  greenEnergyToLoad: number;
  dgToLoad: number;
  curtailed: number;
}

interface MonthlyPerformanceChartRow extends MonthlyPerformanceRow {
  axisMonth: string;
  tooltipMonth: string;
}

// Ghost loader for table
const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: `ghost-row-${i}`}));

const PAGE_SIZE = 100;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const chartColors = {
  wastedEnergy: '#FF646A',
  loadMet: '#12A9E8',
  activeLoadMet: '#0A87BD',
  greenHours: '#009F4D',
  labelBg: 'bg-[linear-gradient(180deg,#BEFFD9_0%,#DFFFEC_100%)]!',
  axis: '#CBD5E1',
  grid: '#E2E8F0',
  text: '#111827',
  tick: '#475569',
};

const formatPercent = (value: number | string | boolean | null | undefined) => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return '0%';

  return `${Number.isInteger(numericValue) ? numericValue.toFixed(0) : numericValue.toFixed(1)}%`;
};

const getMonthMeta = (month: string, fallbackYear?: number | string) => {
  const normalizedMonth = String(month ?? '').trim();
  const numericMonth = Number(normalizedMonth);
  const monthIndex =
    Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12
      ? numericMonth - 1
      : MONTH_NAMES.findIndex(name => normalizedMonth.toLowerCase().includes(name.toLowerCase()));
  const axisMonth = monthIndex >= 0 ? MONTH_LABELS[monthIndex] : normalizedMonth.slice(0, 3) || '-';
  const fullMonth = monthIndex >= 0 ? MONTH_NAMES[monthIndex] : normalizedMonth;
  const yearMatch = normalizedMonth.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch?.[0] ?? fallbackYear;

  return {
    axisMonth,
    tooltipMonth: year ? `${fullMonth}, ${year}` : fullMonth,
  };
};

const MonthlyPerformanceLegend = () => (
  <div className="mb-8 flex justify-end">
    <div className="flex flex-wrap items-center justify-end gap-8 text-small font-InterMedium text-[#0F172A]">
      <div className="flex items-center gap-2">
        <div className="w-4.25 h-3.5 rounded-xs bg-[linear-gradient(180deg,#FF6767_6.98%,#FF808E_126.16%)]"></div>
        <span>Wasted Energy (%)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4.25 h-3.5 rounded-xs bg-[linear-gradient(180deg,#00A8FA_0%,#7EC9EE_161.91%)]"></div>
        <span>Load Met (%)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="relative h-4 w-8">
          <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" style={{backgroundColor: chartColors.greenHours}} />

          <span
            className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-[3px]"
            style={{borderColor: chartColors.greenHours}}
          />
        </span>

        <span>Green Hours (%)</span>
      </div>
    </div>
  </div>
);

const MonthlyPerformanceTooltip = ({active, payload}: TooltipContentProps<any, any>) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as MonthlyPerformanceChartRow | undefined;
  if (!row) return null;

  return (
    <div className="min-w-45 rounded-md border border-[#E5E7EB] bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
      <p className="mb-3 text-sm font-InterSemiBold text-[#111827]">{row.tooltipMonth}</p>
      <div className="space-y-2 text-small font-InterMedium">
        <p style={{color: chartColors.loadMet}}>
          Load met : <span className="font-InterSemiBold">{formatPercent(row.loadMet)}</span>
        </p>
        <p style={{color: chartColors.greenHours}}>
          Green Hours : <span className="font-InterSemiBold">{formatPercent(row.greenEnergy)}</span>
        </p>
        <p style={{color: '#FF1F2D'}}>
          Wasted Energy : <span className="font-InterSemiBold">{formatPercent(row.wastedEnergy)}</span>
        </p>
      </div>
    </div>
  );
};

const GreenHoursLabel = ({x, y, value}: LabelProps) => {
  if (x === undefined || y === undefined || value === undefined) return null;

  const label = formatPercent(value);
  const width = Math.max(28, label.length * 7 + 10);
  const numericX = Number(x);
  const numericY = Number(y);

  return (
    <g transform={`translate(${numericX - width / 2}, ${numericY - 30})`}>
      <rect width={width} height={22} rx={6} fill="url(#labelGradient)" />
      <text x={width / 2} y={14} textAnchor="middle" fill="#0F172A" fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}>
        {label}
      </text>
    </g>
  );
};

function MonthlyPerformanceTableGhostLoader() {
  return (
    <div className="bg-white">
      <Skeleton animation="wave" variant="rounded" width={200} height={28} className="mb-2 rounded-full!" />
      <Skeleton animation="wave" variant="rounded" width={300} height={18} className="mb-4 rounded-full!" />
      <div className="mb-4 flex items-center gap-4">
        <Skeleton animation="wave" variant="rounded" width={240} height={44} className="rounded-lg!" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full w-full">
          <thead className="bg-[#E9FAF8]">
            <tr>
              {[
                'month',
                'loadMet',
                'greenEnergy',
                'wastedEnergy',
                'hoursFullyServed',
                'totalLoadHours',
                'generatorHours',
                'greenEnergyToLoad',
                'dgToLoad',
                'curtailed',
              ].map(col => (
                <th key={`ghost-th-${col}`} className="py-3 px-2">
                  <Skeleton animation="wave" variant="rounded" width={80} height={18} className="rounded-full!" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ghostTableRows.map(row => (
              <tr key={row.id}>
                {[
                  'month',
                  'loadMet',
                  'greenEnergy',
                  'wastedEnergy',
                  'hoursFullyServed',
                  'totalLoadHours',
                  'generatorHours',
                  'greenEnergyToLoad',
                  'dgToLoad',
                  'curtailed',
                ].map(col => (
                  <td key={`${row.id}-td-${col}`} className="py-4 px-2">
                    <Skeleton animation="wave" variant="rounded" width={60} height={16} className="rounded-full!" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SortField = {
  field: string;
  direction: 'asc' | 'desc';
};

interface ColumnHeaderProps {
  label: string;
  sort?: SortType;
  onSortChange?: (sort: SortType) => void;
  tooltip?: string;
}

const ColumnHeader = ({label, sort, onSortChange, tooltip}: ColumnHeaderProps) => {
  return (
    <div className="flex items-center justify-center gap-2 relative">
      <Text variant="caption2" className="font-InterSemiBold! text-text-primary!">
        {label}
      </Text>
      {tooltip && (
        <div className="flex items-center gap-0.5 -mr-2 relative group">
          <Icon name="circle-info" className="text-text-secondary!" />
          <Tooltip message={tooltip} position="top" portal />
        </div>
      )}
      {onSortChange && <Sort sort={sort ?? null} onSortChange={onSortChange} />}
    </div>
  );
};

interface MonthlyDataTableProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
  readonly pendingMonths?: MonthYear[];
  readonly appliedMonths?: MonthYear[];
  readonly onPendingMonthsChange?: (months: MonthYear[]) => void;
  readonly onAppliedMonthsChange?: (months: MonthYear[]) => void;
  readonly sortDirection?: 'asc' | 'desc' | null;
  readonly onSortDirectionChange?: (direction: 'asc' | 'desc' | null) => void;
  showChart?: boolean;
}

export const MonthlyPerformanceTable = (props: MonthlyDataTableProps) => {
  const {
    setIsStepsHidden,
    isFullScreen = false,
    pendingMonths: controlledPendingMonths,
    appliedMonths: controlledAppliedMonths,
    onPendingMonthsChange,
    onAppliedMonthsChange,
    sortDirection: controlledSortDirection,
    onSortDirectionChange,
    showChart = true,
  } = props;
  const dispatch = useDispatch();
  const monthlyData = useSelector(customMonthlySimulationResults);
  const customConfig = useSelector(customConfigData);
  const simulData = useSelector(initiateSimulationData);
  const isLoading = useSelector((state: RootState) => state.simulationWizard.monthlySimulationResultsLoading);
  const proSimulData = useSelector(projectSimulationData);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);

  // Get project name and simulation name
  const project_id = proSimulData?.project_id;
  const projectName = currentProject?.name || allProjects?.find(p => p.id === project_id)?.name || '';
  const simulationName = proSimulData?.name || '';

  // Only month column is sortable
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [localPendingMonths, setLocalPendingMonths] = useState<MonthYear[]>([]);
  const [localAppliedMonths, setLocalAppliedMonths] = useState<MonthYear[]>([]);

  const pendingMonths = controlledPendingMonths ?? localPendingMonths;
  const appliedMonths = controlledAppliedMonths ?? localAppliedMonths;
  const sortDirection = controlledSortDirection ?? localSortDirection;

  const setPendingMonths = onPendingMonthsChange ?? setLocalPendingMonths;
  const setAppliedMonths = onAppliedMonthsChange ?? setLocalAppliedMonths;
  const setSortDirection = onSortDirectionChange ?? setLocalSortDirection;

  // Maximize/Minimize hook
  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => (
      <MonthlyPerformanceTable
        {...props}
        isFullScreen
        showChart={false}
        pendingMonths={pendingMonths}
        appliedMonths={appliedMonths}
        onPendingMonthsChange={setPendingMonths}
        onAppliedMonthsChange={setAppliedMonths}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
      />
    ),
  });

  const {
    chartRef,
    onMaximize: onChartMaximize,
    onMinimize: onChartMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => (
      <MonthlyPerformanceChartSection chartRows={chartRows} isFullScreen onMinimize={onChartMinimize} onDownload={handleDownloadGraph} chartRef={chartRef} />
    ),
  });

  const handleDownloadGraph = useCallback(async () => {
    await downloadElementAsImage(chartRef.current, 'monthly_dispatch_chart.png');
  }, []);

  // Track active modifications (filters or sorting)
  const hasActiveModifications = Boolean(appliedMonths.length > 0 || sortDirection !== null);

  const simulation_id = customConfig?.simulation_id ?? simulData?.id ?? proSimulData?.id;

  // Build API request params
  const buildRequestParams = useCallback(() => {
    if (!simulation_id) return null;

    // Convert applied months to API format (array of month numbers)
    const monthNumbers = appliedMonths.map(m => m.month);

    // Build sort param for month only
    let sortParam = undefined;
    if (sortDirection) {
      sortParam = sortDirection === 'asc' ? 'month' : '-month';
    }

    return {
      simulation_id,
      ...(monthNumbers.length > 0 ? {month: monthNumbers} : {}),
      ...(sortParam ? {sort: sortParam} : {}),
    };
  }, [simulation_id, appliedMonths, sortDirection]);

  // Fetch data on mount and when params change

  useEffect(() => {
    const params = buildRequestParams();

    if (!params) {
      return;
    }

    // Skip API calls in full screen mode only if no modifications are active
    if (isFullScreen && !hasActiveModifications) {
      return;
    }

    dispatch(customMonthlySimulationResultsRequest(params));
  }, [buildRequestParams, isFullScreen, hasActiveModifications]);

  // Handle full-screen mode
  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);
      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  // Map API response to table rows
  const resultRows: MonthlyPerformanceRow[] = Array.isArray(monthlyData?.result)
    ? monthlyData.result.map((item: CustomMonthlyResults) => ({
        month: item.month,
        loadMet: Number(item.load_met_pct?.toFixed(2)),
        greenEnergy: Number(item.green_energy_pct?.toFixed(2)),
        wastedEnergy: Number(item.wastage_energy_pct?.toFixed(2)),
        hoursFullyServed: item.hours_fully_served,
        totalLoadHours: item.total_load_hours,
        generatorHours: item.generator_hours,
        greenEnergyToLoad: Number(item.green_energy_to_load_mwh?.toFixed(2)),
        dgToLoad: Number(item.dg_to_load_mwh?.toFixed(2)),
        curtailed: Number(item.curtailed_mwh?.toFixed(2)),
      }))
    : [];

  // Get API year for MonthYearPicker
  const apiYear = monthlyData?.year;

  const [chartRows, setChartRows] = useState<MonthlyPerformanceChartRow[]>([]);

  useEffect(() => {
    if (resultRows.length > 0 && chartRows.length === 0) {
      setChartRows(
        resultRows.map(row => ({
          ...row,
          ...getMonthMeta(row.month, apiYear),
        })),
      );
    }
  }, [resultRows, apiYear, chartRows.length]);

  // Handle month selection change (from Done button)
  const handleMonthsChange = (months: MonthYear[]) => {
    setPendingMonths(months);
    setAppliedMonths(months);
  };

  // Handle sort change for month column only

  const handleMonthSortChange = (sort: 'asc' | 'desc' | null) => {
    setSortDirection(sort);
  };
  // Handle download using backend export API
  const handleDownload = async () => {
    if (!simulation_id) return;

    // Convert applied months to API format (array of month numbers)
    const monthNumbers = appliedMonths.map(m => m.month);
    let sortParam = undefined;
    if (sortDirection) {
      sortParam = sortDirection === 'asc' ? 'month' : '-month';
    }

    const params: any = {
      ...(monthNumbers.length > 0 ? {month: monthNumbers} : {}),
      ...(sortParam ? {sort: sortParam} : {}),
      fileName: `Monthly_Performance_${simulation_id}.csv`,
    };

    try {
      await getCustomMonthlySimulationResultsExport(Number(simulation_id), params);
    } catch (e) {
      // Optionally show error toast here
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setPendingMonths([]);
    setAppliedMonths([]);
    setSortDirection(null);
  };

  const renderCell = (value: number | string, accent = false) => (
    <Text variant="caption2" className={accent ? 'text-teal!' : 'text-text-primary!'}>
      {value}
    </Text>
  );

  // Remove generic sort handlers, only month is sortable

  const columns: DataTableColumn<MonthlyPerformanceRow>[] = [
    {
      name: 'month',
      title: <ColumnHeader label="Month" sort={sortDirection} onSortChange={handleMonthSortChange} tooltip="Calendar month" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.month),
    },
    {
      name: 'loadMet',
      title: <ColumnHeader label="Load Met (%)" tooltip="Percentage of load demand met" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.loadMet, false),
    },
    {
      name: 'greenEnergy',
      title: <ColumnHeader label="Green Hours (%)" tooltip="Percentage of energy from renewable sources" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.greenEnergy),
    },
    {
      name: 'wastedEnergy',
      title: <ColumnHeader label="Wasted Energy (%)" tooltip="Percentage of energy wasted" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => <Text variant="caption2">{row.wastedEnergy}</Text>,
    },
    {
      name: 'hoursFullyServed',
      title: <ColumnHeader label="Hours Fully Served" tooltip="Total hours with full load met" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.hoursFullyServed),
    },
    {
      name: 'totalLoadHours',
      title: <ColumnHeader label="Total Load Hours" tooltip="Total hours of load demand" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.totalLoadHours),
    },
    {
      name: 'generatorHours',
      title: <ColumnHeader label="Generator Hours" tooltip="Hours generator was running" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.generatorHours),
    },
    {
      name: 'greenEnergyToLoad',
      title: <ColumnHeader label="Green Energy To Load (MWh)" tooltip="Green energy delivered to load" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.greenEnergyToLoad),
    },
    {
      name: 'dgToLoad',
      title: <ColumnHeader label="DG To Load (MWh)" tooltip="Generator energy delivered to load" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.dgToLoad),
    },
    {
      name: 'curtailed',
      title: <ColumnHeader label="Curtailed (MWh)" tooltip="Energy curtailed" />,
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.curtailed),
    },
  ];

  // Check if filters are active
  const hasActiveFilters = appliedMonths.length > 0;

  if (isLoading && resultRows.length === 0) {
    return <MonthlyPerformanceTableGhostLoader />;
  }

  return (
    <div className="bg-white">
      <div className={`flex w-full ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="flex justify-between w-full">
            <div className="flex flex-col">
              <Text variant="h3">Monthly Performance</Text>
              <Text variant="14R" className="text-text-secondary! my-1.5">
                Delivery and green energy breakdown by month
              </Text>
            </div>
            <div className="bg-primary-tint-2 p-3.5 rounded-md">
              <Text variant="14M" className="text-text-secondary!">
                Project: <span className="text-text-primary!">{projectName}</span>
              </Text>
              <Text variant="14M" className="text-text-secondary!">
                Simulation: <span className="text-text-primary!">{simulationName}</span>
              </Text>
            </div>
          </div>
        )}
      </div>
      {showChart && (
        <div>
          <MonthlyPerformanceChartSection
            chartRows={chartRows}
            isFullScreen={false}
            onMaximize={onChartMaximize}
            onMinimize={onChartMinimize}
            onDownload={handleDownloadGraph}
            chartRef={chartRef}
          />
        </div>
      )}
      <div ref={tableRef}>
        <div className={`flex w-full items-center ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
          {!isFullScreen && (
            <div className="flex items-center gap-4">
              <MultiMonthYearPicker
                label=""
                value={pendingMonths}
                onChange={handleMonthsChange}
                className="min-w-60"
                placeholder="Select Months"
                defaultYear={apiYear}
                doneText="Apply"
                lockYear
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="border-primary w-full! cursor-pointer hover:border-primary-hover active:border-primary-active border self-stretch rounded-sm px-4 py-1 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="cross" className="text-text-secondary size-3" />
                  <Text variant="caption" className="whitespace-nowrap!">
                    Clear Filters
                  </Text>
                </button>
              )}
            </div>
          )}
          <div className={`flex ${isFullScreen ? 'justify-between' : 'justify-end'} w-full gap-5`}>
            {isFullScreen && (
              <div className="flex flex-col">
                <Text variant="h3">Monthly Performance</Text>
                <Text variant="14R" className="text-text-secondary! my-1.5">
                  Delivery and green energy breakdown by month
                </Text>
              </div>
            )}
            <div className="flex items-center gap-5">
              <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownload} />
              {isFullScreen ? (
                <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
              ) : (
                <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
              )}
            </div>
          </div>
        </div>
        <DataTable
          data={resultRows}
          columns={columns}
          totalPages={monthlyData?.total_pages ?? 1}
          currentPage={monthlyData?.current_page ?? 1}
          totalResult={resultRows.length}
          pageSize={PAGE_SIZE}
          stickyHeader
          tableHeightWhenScrollable={700}
          showFooter={false}
          persistHorizontalScrollKey={simulation_id ? `bess-monthly-results-${simulation_id}` : undefined}
        />
      </div>
    </div>
  );
};

const MonthlyPerformanceChartSection = ({chartRows, isFullScreen, onMaximize, onMinimize, onDownload, chartRef}: any) => {
  return (
    <>
      <div className="flex items-start gap-3 mb-4 mt-1.3">
        <div className="bg-[#C8FFF8] size-8.75 rounded-sm flex justify-center items-center">
          <Icon name="difference" className="text-secondary! size-4.75" />{' '}
        </div>
        <div>
          <Text variant={'subtitle1'} className="text-secondary! font-InterSemiBold!">
            Monthly breakdown
          </Text>
          <Text variant={'12R'} className="text-text-secondary!">
            Bars compare monthly Delivery and Wastage, while the line shows Green Energy percentage achieved for each month.
          </Text>
        </div>
      </div>

      <div ref={chartRef} className="mb-8 rounded-xl border border-[#E2E8F0] bg-white px-5 pb-5 pt-5">
        <div className="mb-8 flex justify-end">
          <div className="flex items-center gap-5 no-export">
            <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={onDownload} />
            {isFullScreen ? (
              <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
            ) : (
              <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
            )}
          </div>
        </div>

        <MonthlyPerformanceLegend />

        {chartRows.length ? (
          <ResponsiveContainer width="100%" height={310}>
            <ComposedChart reverseStackOrder={false} data={chartRows} margin={{top: 8, right: 14, left: 8, bottom: 30}} barCategoryGap="18%" barGap={8}>
              <defs>
                <defs>
                  <linearGradient id="labelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BEFFD9" />
                    <stop offset="100%" stopColor="#DFFFEC" />
                  </linearGradient>
                </defs>
                <linearGradient id="loadMetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A8FA" />
                  <stop offset="100%" stopColor="#7EC9EE" />
                </linearGradient>

                <linearGradient id="wastedEnergyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6767" />
                  <stop offset="100%" stopColor="#FF808E" />
                </linearGradient>

                <linearGradient id="loadMetHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047CB7" />
                  <stop offset="100%" stopColor="#1FA2E4" />
                </linearGradient>

                <linearGradient id="wastedEnergyHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="6.98%" stopColor="#BD1010" />
                  <stop offset="100%" stopColor="#FD465B" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="axisMonth"
                axisLine={{stroke: chartColors.axis}}
                tickLine={false}
                tick={{fontSize: 12, fill: chartColors.tick, fontFamily: 'Inter, sans-serif'}}
                tickMargin={12}
                label={{
                  value: 'Months',
                  position: 'insideBottom',
                  offset: -22,
                  style: {fill: chartColors.text, fontSize: 12, fontWeight: 600, textAnchor: 'middle'},
                }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={{stroke: chartColors.axis}}
                tickLine={false}
                tick={{fontSize: 12, fill: chartColors.tick, fontFamily: 'Inter, sans-serif'}}
                label={{
                  value: 'Percentage (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -2,
                  style: {fill: chartColors.text, fontSize: 12, fontWeight: 600, textAnchor: 'middle'},
                }}
              />
              <RechartsTooltip content={props => <MonthlyPerformanceTooltip {...props} />} cursor={{fill: 'transparent'}} />
              <Bar
                dataKey="wastedEnergy"
                name="Wasted Energy (%)"
                fill="url(#wastedEnergyGradient)"
                activeBar={{fill: 'url(#wastedEnergyHoverGradient)'}}
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="loadMet"
                name="Load Met (%)"
                fill="url(#loadMetGradient)"
                activeBar={{fill: 'url(#loadMetHoverGradient)'}}
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Line
                type="monotone"
                dataKey="greenEnergy"
                name="Green Hours (%)"
                stroke={chartColors.greenHours}
                strokeWidth={2}
                dot={{r: 4, fill: '#FFFFFF', stroke: chartColors.greenHours, strokeWidth: 2}}
                activeDot={{r: 5, fill: '#FFFFFF', stroke: chartColors.greenHours, strokeWidth: 2}}>
                <LabelList dataKey="greenEnergy" content={props => <GreenHoursLabel {...props} />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-72 items-center justify-center rounded-sm border border-dashed border-border bg-bg-card/40">
            <Text variant="14R" className="text-text-secondary!">
              No monthly performance data available.
            </Text>
          </div>
        )}
      </div>
    </>
  );
};
