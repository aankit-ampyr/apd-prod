import {useState, useEffect, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable} from '@/components';
import type {DataTableColumn, SortType, CustomMonthlyResults, MonthYear} from '@/interface';
import {Sort, Text, Tooltip, Icon, MultiMonthYearPicker, Skeleton} from '@/ui-kits';
import {customMonthlySimulationResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {getCustomMonthlySimulationResultsExport} from '@/services/api';
import {
  customMonthlySimulationResults,
  customConfigData,
  customSimulationSuccess,
  initiateSimulationData,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {allProjectsData} from '@/services/redux/selectors';
import type {RootState} from '@/services/redux/rootReducer';
import {useChartsActionV2} from '@/hooks';

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

// Ghost loader for table
const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: `ghost-row-${i}`}));

const PAGE_SIZE = 100;

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
    <div className="flex items-center gap-2 relative">
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
  } = props;
  const dispatch = useDispatch();
  const monthlyData = useSelector(customMonthlySimulationResults);
  const customConfig = useSelector(customConfigData);
  const customSimulationStatus = useSelector(customSimulationSuccess);
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
  const [currentPage, setCurrentPage] = useState(1);
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
        pendingMonths={pendingMonths}
        appliedMonths={appliedMonths}
        onPendingMonthsChange={setPendingMonths}
        onAppliedMonthsChange={setAppliedMonths}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
      />
    ),
  });

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
    if (params) {
      dispatch(customMonthlySimulationResultsRequest(params));
    }
  }, [buildRequestParams, dispatch]);

  useEffect(() => {
    if (customSimulationStatus !== 'S-20038') return;

    const params = buildRequestParams();
    if (params) {
      dispatch(customMonthlySimulationResultsRequest(params));
    }
  }, [buildRequestParams, customSimulationStatus, dispatch]);

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

  // Handle month selection change (from Done button)
  const handleMonthsChange = (months: MonthYear[]) => {
    setPendingMonths(months);
    setAppliedMonths(months);
    setCurrentPage(1);
  };

  // Handle sort change for month column only
  const handleMonthSortChange = () => {
    const nextSortDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
    setSortDirection(nextSortDirection);
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
    setCurrentPage(1);
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
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.month),
    },
    {
      name: 'loadMet',
      title: <ColumnHeader label="Load Met (%)" tooltip="Percentage of load demand met" />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.loadMet, false),
    },
    {
      name: 'greenEnergy',
      title: <ColumnHeader label="Green Energy (%)" tooltip="Percentage of energy from renewable sources" />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.greenEnergy),
    },
    {
      name: 'wastedEnergy',
      title: <ColumnHeader label="Wasted Energy (%)" tooltip="Percentage of energy wasted" />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => <Text variant="caption2">{row.wastedEnergy}</Text>,
    },
    {
      name: 'hoursFullyServed',
      title: <ColumnHeader label="Hours Fully Served" tooltip="Total hours with full load met" />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.hoursFullyServed),
    },
    {
      name: 'totalLoadHours',
      title: <ColumnHeader label="Total Load Hours" tooltip="Total hours of load demand" />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.totalLoadHours),
    },
    {
      name: 'generatorHours',
      title: <ColumnHeader label="Generator Hours" tooltip="Hours generator was running" />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.generatorHours),
    },
    {
      name: 'greenEnergyToLoad',
      title: <ColumnHeader label="Green Energy To Load (MWh)" tooltip="Green energy delivered to load" />,
      width: {minWidth: '180px'},
      align: 'center',
      render: row => renderCell(row.greenEnergyToLoad),
    },
    {
      name: 'dgToLoad',
      title: <ColumnHeader label="DG To Load (MWh)" tooltip="Generator energy delivered to load" />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.dgToLoad),
    },
    {
      name: 'curtailed',
      title: <ColumnHeader label="Curtailed (MWh)" tooltip="Energy curtailed" />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.curtailed),
    },
  ];

  // Check if filters are active
  const hasActiveFilters = appliedMonths.length > 0 || !!sortDirection;

  if (isLoading) {
    return <MonthlyPerformanceTableGhostLoader />;
  }

  return (
    <div ref={tableRef} className="bg-white">
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

      <div className={`flex w-full items-center ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="mb-4 flex items-center gap-4">
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
                className="border-primary cursor-pointer hover:border-primary-hover active:border-primary-active border self-stretch rounded-sm px-4 py-1 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                <Icon name="cross" className="text-text-secondary size-3" />
                <Text variant="caption">Clear Filters</Text>
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-5 pt-1">
          <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownload} />
          {isFullScreen ? (
            <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
          ) : (
            <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
          )}
        </div>
      </div>
      <DataTable
        data={resultRows}
        columns={columns}
        totalPages={monthlyData?.total_pages ?? 1}
        currentPage={monthlyData?.current_page ?? 1}
        totalResult={resultRows.length}
        onPageChange={setCurrentPage}
        pageSize={PAGE_SIZE}
        stickyHeader
      />
    </div>
  );
};
