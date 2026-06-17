import {DataTable} from '@/components';
import type {DataTableColumn, SimulationResults as ApiSimulationResult, SortType, IconTypes} from '@/interface';
import {Checkbox, Icon, Sort, Text, Skeleton, Tooltip, MultiSelectInput, SearchableMultiSelectInput} from '@/ui-kits';
// Ghost loader row data for table skeleton
const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: i}));

// Ghost loader for filter and table UI
function SimulationResultsGhostLoader() {
  return (
    <div>
      <Text variant="14R" className="text-text-secondary! mt-3">
        <Skeleton animation="wave" variant="rounded" width={180} height={18} className="mb-2 rounded-full!" />
      </Text>
      <div className="w-full rounded-lg border border-[#D9E1E7] bg-white px-5 py-6 mt-3">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton animation="wave" variant="circular" width={24} height={24} className="mr-2" />
            <Skeleton animation="wave" variant="rounded" width={180} height={36} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={180} height={36} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={180} height={36} className="rounded-full!" />
          </div>
          <div className="flex items-center gap-5 pt-1">
            <Skeleton animation="wave" variant="circular" width={20} height={20} />
            <Skeleton animation="wave" variant="circular" width={20} height={20} />
          </div>
        </div>
        <div className="mt-7 flex items-center gap-10">
          <Skeleton animation="wave" variant="rounded" width={200} height={24} className="rounded-full!" />
          <Skeleton animation="wave" variant="rounded" width={200} height={24} className="rounded-full!" />
        </div>
      </div>
      <div className="mt-4 h-full">
        <div className="overflow-x-auto">
          <table className="min-w-528 w-full">
            <thead className="bg-[#E9FAF8]">
              <tr>
                {Array.from({length: 17}).map((_, idx) => (
                  <th key={idx} className="py-3 px-2">
                    <Skeleton animation="wave" variant="rounded" width={90} height={18} className="rounded-full!" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ghostTableRows.map(row => (
                <tr key={row.id}>
                  {Array.from({length: 17}).map((_, idx) => (
                    <td key={idx} className="py-4 px-2">
                      <Skeleton animation="wave" variant="rounded" width={70} height={16} className="rounded-full!" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useChartsActionV2, useToast} from '@/hooks';
import {useDispatch, useSelector} from 'react-redux';
import {
  bessContainerConfigData,
  initiateSimulationData,
  projectSimulationData,
  simulationResultError,
  simulationResultLoading,
  simulationResultsData,
} from '@/services/redux/selectors/simulationWizardSelector';
import {simulationResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {getSimulationResultsExport} from '@/services/api';
import {cn, getErrorMessage} from '@/utils';
import type {ErrorCodes} from '@/utils';
import {Images} from '@lazarus/react-common/assets';
import {DGDriggerType, DGRunScheduleMode, LoadProfilePattern, LoadServingPriority} from '@/constants';
import {useChangeConfigurationConfirmation} from '../ChangeConfigurationContext';

const SIMULATION_RESULTS_REQUEST_DEDUPE_WINDOW_MS = 1000;
const simulationResultsRequestCache = new Map<string, number>();

const shouldDispatchSimulationResultsRequest = (requestKey: string) => {
  const now = Date.now();

  for (const [cachedKey, timestamp] of simulationResultsRequestCache.entries()) {
    if (now - timestamp > SIMULATION_RESULTS_REQUEST_DEDUPE_WINDOW_MS) {
      simulationResultsRequestCache.delete(cachedKey);
    }
  }

  const lastRequestedAt = simulationResultsRequestCache.get(requestKey);
  if (lastRequestedAt && now - lastRequestedAt < SIMULATION_RESULTS_REQUEST_DEDUPE_WINDOW_MS) {
    return false;
  }

  simulationResultsRequestCache.set(requestKey, now);
  return true;
};

const PAGE_SIZE = 100;
const DURATION_FILTER_CONTROL_CLASS = 'w-[230px] min-w-[230px] max-w-[230px] flex-none';
const DG_FILTER_CONTROL_CLASS = 'w-[310px] min-w-[310px] max-w-[310px] flex-none';
const BESS_FILTER_CONTROL_CLASS = 'w-[320px] min-w-[320px] max-w-[320px] flex-none';
const FILTER_INLINE_CHIP_CLASS = 'rounded-[8px] px-3 py-1 bg-primary-tint-2';
const BESS_FILTER_INLINE_CHIP_CLASS = 'rounded-[8px] px-2 py-1 bg-primary-tint-2';
const FILTER_INLINE_CHIP_TEXT_CLASS = 'text-[12px]! leading-[16px]! font-InterMedium!';
const SEARCHABLE_FILTER_WRAPPER_CLASS = 'gap-1 pr-3';
const DG_FILTER_RIGHT_ICON_CLASS = 'ml-1';
const BESS_FILTER_RIGHT_ICON_CLASS = 'ml-0';

const SORTABLE_FIELDS = new Set([
  'bess_mwh',
  'duration_hr',
  'power_mw',
  'containers',
  'dg_mw',
  'delivery_percentage',
  'green_percentage',
  'wastage_percentage',
  'delivery_hrs',
  'load_hrs',
  'green_hrs',
  'dg_hrs',
  'dg_starts',
  'bess_cycles',
  'unserved_mwh',
  'fuel_l',
]);

type SimulationResultFilter = {
  duration_hr?: number[];
  dg_capacity?: number[];
  bess_capacity?: number[];
};

type SortField = {
  field: string;
  direction: 'asc' | 'desc';
};

type FilterOption = {
  id: number;
  label: string;
};

type BessContainerOption = {
  label?: string;
};

type SimulationResultsParams = {
  simulation_id: number;
  page?: number;
  limit?: number;
  duration_hr?: number[];
  dg_capacity?: number[];
  bess_capacity?: number[];
  delivery_percentage?: number;
  dg_runtime_hours?: number;
  sort?: string[];
};

const mergeCapacityOptions = (existing: FilterOption[], values: number[], unit: string) => {
  const capacities = [...new Set([...existing.map(option => option.id), ...values])];
  const sortedCapacities = capacities.slice().sort((a, b) => a - b);
  return sortedCapacities.map(capacity => ({id: capacity, label: `${capacity} ${unit}`}));
};

interface SimulationResultRow {
  bess: number;
  duration: number;
  power: number;
  containers: number;
  dg: number;
  delivery: number;
  green: number;
  wastage: number;
  deliveryHrs: number;
  loadHrs: number;
  greenHrs: number;
  dgHrs: number;
  dgStarts: number;
  bessCycles: number;
  unserved: number;
  fuel: number;
}

interface ColumnHeaderProps {
  label: string;
  sort?: SortType;
  onSortChange?: (sort: SortType) => void;
  tooltip?: string;
}
const ColumnHeader = (props: ColumnHeaderProps) => {
  const {label, sort, onSortChange, tooltip} = props;
  return (
    <div className="flex items-center gap-2 relative">
      <Text variant="caption2" className="font-InterSemiBold! text-text-primary!">
        {label}
      </Text>
      <div className="flex items-center gap-0.5 -mr-2 relative group">
        <Icon name="circle-info" className="text-text-secondary!" />
        <Tooltip message={tooltip ?? ''} position="top" portal />
      </div>
      {onSortChange && <Sort sort={sort ?? null} onSortChange={onSortChange} />}
    </div>
  );
};

interface SimulationResultsProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
}

export const SimulationResults = (props: SimulationResultsProps) => {
  /**
   * =======================================
   * Hooks
   * =======================================
   */
  const dispatch = useDispatch();
  const {showToast} = useToast();
  const {setIsStepsHidden, isFullScreen = false} = props;
  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <SimulationResults {...props} isFullScreen />,
  });

  /**
   * =======================================
   * Selectors
   * =======================================
   */
  const isLoading = useSelector(simulationResultLoading);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const bessSavedData = useSelector(bessContainerConfigData);
  const simulResErr = useSelector(simulationResultError);
  const simulResData = useSelector(simulationResultsData);
  const {activeSimulationJobId, isSimulationRunning, isSimulationRunningByAnotherUser, simulationRunningMessage} = useChangeConfigurationConfirmation();

  const simulation_id = simulData?.id ?? proSimulData?.id;

  const [showFullDeliveryOnly, setShowFullDeliveryOnly] = useState(false);
  const [showZeroDgHoursOnly, setShowZeroDgHoursOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Multi-column sort state
  const [sortFields, setSortFields] = useState<SortField[]>([]);
  const [filter, setFilter] = useState<SimulationResultFilter>({});
  const [dgCapacityOptions, setDgCapacityOptions] = useState<FilterOption[]>([]);
  const [bessCapacityOptions, setBessCapacityOptions] = useState<FilterOption[]>([]);

  /**
   * =======================================
   * Derived States
   * =======================================
   */
  const renderCell = (value: number | string, accent = false) => (
    <Text variant="caption2" className={accent ? 'text-teal!' : 'text-text-primary!'}>
      {value}
    </Text>
  );

  const resultRows: SimulationResultRow[] = Array.isArray(simulResData?.results)
    ? simulResData.results.map((item: ApiSimulationResult) => ({
        bess: Number(item.bess_mwh),
        duration: Number(item.duration_hr),
        power: Number(item.power_mw),
        containers: Number(item.containers),
        dg: Number(item.dg_mw),
        delivery: Number(item.delivery_percentage),
        green: Number(item.green_percentage),
        wastage: Number(item.wastage_percentage),
        deliveryHrs: Number(item.delivery_hrs),
        loadHrs: Number(item.load_hrs),
        greenHrs: Number(item.green_hrs),
        dgHrs: Number(item.dg_hrs),
        dgStarts: Number(item.dg_starts),
        bessCycles: Number(item.bess_cycles),
        unserved: Number(item.unserved_mwh),
        fuel: Number(item.fuel_l),
      }))
    : [];

  const durationOptions = useMemo(() => {
    const durations =
      bessSavedData?.containers?.reduce<number[]>((items: number[], container: BessContainerOption) => {
        const duration = Number(container?.label?.match(/(\d+)-hour/)?.[1]);

        if (duration && !items.includes(duration)) {
          items.push(duration);
        }

        return items;
      }, []) ?? [];

    return durations.sort((a: any, b: any) => a - b).map((duration: any) => ({id: duration, label: String(duration)}));
  }, [bessSavedData?.containers]);
  const durationFilterOptions = useMemo(() => durationOptions.map(option => ({...option, label: `${option.label}h`})), [durationOptions]);

  const updateFilter = (key: keyof SimulationResultFilter, values?: number[]) => {
    setFilter(prev => ({
      ...prev,
      [key]: values && values.length > 0 ? values : undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilter({});
    setShowFullDeliveryOnly(false);
    setShowZeroDgHoursOnly(false);
    setCurrentPage(1);
  };

  // Called when user clicks a column header to sort
  const handleSortChange = (field: string) => {
    setSortFields(prev => {
      // If already sorted by this field, toggle direction or remove
      const idx = prev.findIndex(f => f.field === field);
      if (idx === -1) {
        // Add as ascending
        return [...prev, {field, direction: 'asc'}];
      } else {
        const current = prev[idx];
        if (current.direction === 'asc') {
          // Switch to desc
          return [...prev.slice(0, idx), {field, direction: 'desc'}, ...prev.slice(idx + 1)];
        } else {
          // Remove from sort
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
      }
    });
    setCurrentPage(1);
  };

  // Helper to get current sort direction for a field
  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    const found = sortFields.find(f => f.field === field);
    return found ? found.direction : null;
  };

  const buildSimulationResultsParams = useCallback((): SimulationResultsParams | null => {
    if (!simulation_id) {
      return null;
    }

    const sortParam = sortFields.filter(f => SORTABLE_FIELDS.has(f.field)).map(f => (f.direction === 'desc' ? `-${f.field}` : f.field));

    // Always send arrays for multi-select params
    const duration_hr = Array.isArray(filter.duration_hr) && filter.duration_hr.length > 0 ? filter.duration_hr : undefined;
    const dg_capacity = Array.isArray(filter.dg_capacity) && filter.dg_capacity.length > 0 ? filter.dg_capacity : undefined;
    const bess_capacity = Array.isArray(filter.bess_capacity) && filter.bess_capacity.length > 0 ? filter.bess_capacity : undefined;

    return {
      simulation_id,
      page: currentPage,
      limit: PAGE_SIZE,
      duration_hr,
      dg_capacity,
      bess_capacity,
      delivery_percentage: showFullDeliveryOnly ? 100 : undefined,
      dg_runtime_hours: showZeroDgHoursOnly ? 0 : undefined,
      sort: sortParam.length > 0 ? sortParam : undefined,
    };
  }, [currentPage, filter, showFullDeliveryOnly, showZeroDgHoursOnly, simulation_id, sortFields]);

  // Track if any filters are active
  const hasActiveFilters = Boolean(
    (filter.duration_hr && filter.duration_hr.length > 0) ||
    (filter.dg_capacity && filter.dg_capacity.length > 0) ||
    (filter.bess_capacity && filter.bess_capacity.length > 0) ||
    showFullDeliveryOnly ||
    showZeroDgHoursOnly,
  );
  const hasResultRows = Array.isArray(simulResData?.results);
  const shouldShowEmptyState =
    !hasActiveFilters &&
    !isLoading &&
    (!simulation_id ||
      simulResErr === 'E-20046' ||
      (hasResultRows && simulResData.results.length === 0) ||
      (!simulResData && activeSimulationJobId === null && !isSimulationRunning && !isSimulationRunningByAnotherUser));

  const handleDownload = async () => {
    const params = buildSimulationResultsParams();
    if (!params) return;

    const {simulation_id: resultSimulationId, ...exportParams} = params;

    try {
      await getSimulationResultsExport(resultSimulationId, {
        ...exportParams,
        fileName: `Simulation_Results_${resultSimulationId}.csv`,
      });
    } catch (error: unknown) {
      const status_code = (error as {data?: {status_code?: string}})?.data?.status_code;
      showToast(status_code ? getErrorMessage(status_code as ErrorCodes) : 'Failed to download simulation results', 'error');
    }
  };

  /**
   * =======================================
   * Table Columns
   * =======================================
   */
  // Map UI columns to API fields
  const columns: DataTableColumn<SimulationResultRow>[] = [
    {
      name: 'bess',
      title: (
        <ColumnHeader
          label="Battery Size (MWh)"
          sort={getSortDirection('bess_mwh')}
          onSortChange={() => handleSortChange('bess_mwh')}
          tooltip="Total battery storage capacity"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.bess),
    },
    {
      name: 'duration',
      title: (
        <ColumnHeader
          label="Discharge Duration (hr)"
          sort={getSortDirection('duration_hr')}
          onSortChange={() => handleSortChange('duration_hr')}
          tooltip="Battery runtime at full power"
        />
      ),
      width: {minWidth: '132px'},
      align: 'center',
      render: row => renderCell(row.duration),
    },
    {
      name: 'power',
      title: (
        <ColumnHeader
          label="Battery Power (MW)"
          sort={getSortDirection('power_mw')}
          onSortChange={() => handleSortChange('power_mw')}
          tooltip="Charge/discharge speed"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.power),
    },
    {
      name: 'containers',
      title: (
        <ColumnHeader
          label="Containers"
          sort={getSortDirection('containers')}
          onSortChange={() => handleSortChange('containers')}
          tooltip="Installed battery units"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.containers),
    },
    {
      name: 'dg',
      title: (
        <ColumnHeader
          label="Generator Size (MW)"
          sort={getSortDirection('dg_mw')}
          onSortChange={() => handleSortChange('dg_mw')}
          tooltip="Backup generator capacity"
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.dg),
    },
    {
      name: 'delivery',
      title: (
        <ColumnHeader
          label="Load Met (%)"
          sort={getSortDirection('delivery_percentage')}
          onSortChange={() => handleSortChange('delivery_percentage')}
          tooltip="% hours fully powered"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.delivery, true),
    },
    {
      name: 'green',
      title: (
        <ColumnHeader
          label="Green Energy (%)"
          sort={getSortDirection('green_percentage')}
          onSortChange={() => handleSortChange('green_percentage')}
          tooltip="% hours without generator"
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.green),
    },
    {
      name: 'wastage',
      title: (
        <ColumnHeader
          label="Wastage Energy (%)"
          sort={getSortDirection('wastage_percentage')}
          onSortChange={() => handleSortChange('wastage_percentage')}
          tooltip="Unused solar energy"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => (
        <Text variant="caption2" className="text-warning!">
          {row.wastage}
        </Text>
      ),
    },
    {
      name: 'deliveryHrs',
      title: (
        <ColumnHeader
          label="Hours Fully Served"
          sort={getSortDirection('delivery_hrs')}
          onSortChange={() => handleSortChange('delivery_hrs')}
          tooltip="Hours with full load met"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.deliveryHrs),
    },
    {
      name: 'loadHrs',
      title: (
        <ColumnHeader
          label="Total Load Hours"
          sort={getSortDirection('load_hrs')}
          onSortChange={() => handleSortChange('load_hrs')}
          tooltip="Hours covered without DG"
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.loadHrs),
    },
    {
      name: 'greenHrs',
      title: (
        <ColumnHeader label="Green Hours" sort={getSortDirection('green_hrs')} onSortChange={() => handleSortChange('green_hrs')} tooltip="DG running hours" />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.greenHrs),
    },
    {
      name: 'dgHrs',
      title: (
        <ColumnHeader label="Generator Hours" sort={getSortDirection('dg_hrs')} onSortChange={() => handleSortChange('dg_hrs')} tooltip="DG running hours" />
      ),
      width: {minWidth: '112px'},
      align: 'center',
      render: row => renderCell(row.dgHrs),
    },
    {
      name: 'dgStarts',
      title: (
        <ColumnHeader
          label="Generator Starts"
          sort={getSortDirection('dg_starts')}
          onSortChange={() => handleSortChange('dg_starts')}
          tooltip="Number of DG startups"
        />
      ),
      width: {minWidth: '128px'},
      align: 'center',
      render: row => renderCell(row.dgStarts),
    },
    {
      name: 'bessCycles',
      title: (
        <ColumnHeader
          label="Avg. Battery Cycles per day"
          sort={getSortDirection('bess_cycles')}
          onSortChange={() => handleSortChange('bess_cycles')}
          tooltip="Battery usage cycles per day"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.bessCycles),
    },
    {
      name: 'unserved',
      title: (
        <ColumnHeader
          label="Unmet Energy (MWh)"
          sort={getSortDirection('unserved_mwh')}
          onSortChange={() => handleSortChange('unserved_mwh')}
          tooltip="Unserved energy"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.unserved),
    },
    {
      name: 'fuel',
      title: (
        <ColumnHeader label="Fuel Used (L)" sort={getSortDirection('fuel_l')} onSortChange={() => handleSortChange('fuel_l')} tooltip="Total diesel consumed" />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.fuel),
    },
  ];

  /**
   * =======================================
   * Side Effects
   * =======================================
   */
  useEffect(() => {
    const params = buildSimulationResultsParams();

    if (!params || isSimulationRunningByAnotherUser || activeSimulationJobId !== null || isSimulationRunning) {
      return;
    }

    const requestKey = JSON.stringify(params);
    if (!shouldDispatchSimulationResultsRequest(requestKey)) {
      return;
    }

    dispatch(simulationResultsRequest(params));
  }, [activeSimulationJobId, buildSimulationResultsParams, dispatch, isSimulationRunning, isSimulationRunningByAnotherUser]);

  useEffect(() => {
    setDgCapacityOptions([]);
    setBessCapacityOptions([]);
  }, [simulation_id]);

  useEffect(() => {
    if (!Array.isArray(simulResData?.results)) return;

    const dgValues = simulResData.results.map((item: ApiSimulationResult) => Number(item.dg_mw)).filter((value: any) => !Number.isNaN(value));
    const bessValues = simulResData.results.map((item: ApiSimulationResult) => Number(item.bess_mwh)).filter((value: any) => !Number.isNaN(value));

    setDgCapacityOptions(prev => mergeCapacityOptions(prev, dgValues, 'MW'));
    setBessCapacityOptions(prev => mergeCapacityOptions(prev, bessValues, 'MWh'));
  }, [simulResData?.results]);

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);
      // Reset when full-screen component unmounts (on minimize)
      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  /**
   * =======================================
   * Gaurd Renders
   * =======================================
   */
  if (isLoading && !hasActiveFilters) {
    return <SimulationResultsGhostLoader />;
  }
  if (shouldShowEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full! gap-4 py-10">
        <img src={Images.noBatteryPlay} alt="No Simulations" className="w-22" />
        <Text variant="h4" className="text-text-secondary! font-InterMedium!">
          Run the sizing simulation in Step 3 to generate and view configuration results.
        </Text>
      </div>
    );
  }

  /**
   * =======================================
   * Render
   * =======================================
   */
  return (
    <div>
      {isSimulationRunningByAnotherUser && simulationRunningMessage && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-md border border-[#F7C9C4] bg-[#FFF6F4] px-4 py-3">
            <Icon name="infoCircle" className="size-4.5! text-warning!" />
            <Text variant="14M" className="text-warning!">
              {simulationRunningMessage}
            </Text>
          </div>
        </div>
      )}

      {!isFullScreen && (
        <Text variant="14R" className="text-text-secondary! mt-3">
          Completed {simulResData?.total_configs} Configurations
        </Text>
      )}
      {/* Stack summary and table vertically so table always appears below summary (expanded or not) */}
      <div className="flex flex-col gap-4 mt-4">
        {!isFullScreen && <SimulationConfigurationSummary />}
        {!isFullScreen && (
          <div className="rounded-md border border-l-3 border-primary bg-[#F6FFFE] p-5">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-start gap-3">
                <Icon name="questionCircle" className="text-[#0B7D70]! mt-1.5" size={20} />
                <div>
                  <Text variant="largeBody" className="font-InterSemiBold! text-[#0B7D70]!">
                    How to read this table
                  </Text>

                  <Text variant="caption" className="mt-1 font-InterMedium! text-text-primary!">
                    This table displays the battery configuration combinations tested for different battery sizes, discharge durations, and generator sizes.
                  </Text>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-white p-5">
                <div className="flex items-center gap-2">
                  <Icon name="bulb" className="text-[#168E80]!" size={20} />

                  <Text variant="caption" className="font-InterSemiBold! text-[#0B7D70]!">
                    For Example:
                  </Text>
                </div>

                <Text variant="caption" className="mt-2 font-InterRegular! text-text-primary!">
                  <strong>50 MWh battery</strong> tested with <strong>2-hour</strong> and <strong>4-hour</strong> discharge durations results in{' '}
                  <strong>25 MW</strong> and <strong>12.5 MW</strong> battery power respectively. In total, <strong>10 combinations</strong> were tested using{' '}
                  <strong>2 discharge durations</strong> and <strong>5 generator sizes</strong>.
                </Text>
              </div>
            </div>
          </div>
        )}

        <div ref={tableRef}>
          {!isFullScreen && (
            <div className="w-full rounded-lg border border-[#D9E1E7] bg-white px-5 py-6 mt-3">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-[44px] shrink-0 items-center">
                    <Icon name="funnel" className="size-6 text-[#475467]!" />
                  </div>

                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-start gap-4 min-w-0 flex-nowrap">
                      <MultiSelectInput
                        isFilter
                        className={DURATION_FILTER_CONTROL_CLASS}
                        values={filter.duration_hr ?? null}
                        options={durationFilterOptions}
                        onChange={items =>
                          updateFilter(
                            'duration_hr',
                            items.map(item => Number(item.id)),
                          )
                        }
                        placeholder="Select Duration (Hr)"
                        showChipsInInput
                        maxVisibleChips={3}
                        overflowChipLabel={() => '...'}
                        renderOverflowIndicatorAsChip={false}
                        overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                        inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
                        inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                        inlineChipTextVariant="14M"
                      />

                      <SearchableMultiSelectInput
                        isFilter
                        className={DG_FILTER_CONTROL_CLASS}
                        wrapperClassName={SEARCHABLE_FILTER_WRAPPER_CLASS}
                        rightIconClassName={DG_FILTER_RIGHT_ICON_CLASS}
                        values={filter.dg_capacity ?? null}
                        options={dgCapacityOptions}
                        onChange={items =>
                          updateFilter(
                            'dg_capacity',
                            items.map(item => Number(item.id)),
                          )
                        }
                        placeholder="DG Capacity (MW)"
                        placeholderClassName="placeholder:text-text-primary!"
                        showSelectAll={false}
                        showChipsInInput
                        maxVisibleChips={3}
                        overflowChipLabel={() => '...'}
                        renderOverflowIndicatorAsChip={false}
                        overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                        inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
                        inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                        inlineChipTextVariant="14M"
                      />

                      <SearchableMultiSelectInput
                        isFilter
                        className={BESS_FILTER_CONTROL_CLASS}
                        wrapperClassName={SEARCHABLE_FILTER_WRAPPER_CLASS}
                        rightIconClassName={BESS_FILTER_RIGHT_ICON_CLASS}
                        values={filter.bess_capacity ?? null}
                        options={bessCapacityOptions}
                        onChange={items =>
                          updateFilter(
                            'bess_capacity',
                            items.map(item => Number(item.id)),
                          )
                        }
                        placeholder="BESS Capacity (MWh)"
                        placeholderClassName="placeholder:text-text-primary!"
                        showSelectAll={false}
                        showChipsInInput
                        maxVisibleChips={3}
                        overflowChipLabel={() => '...'}
                        renderOverflowIndicatorAsChip={false}
                        overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                        inlineChipClassName={BESS_FILTER_INLINE_CHIP_CLASS}
                        inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                        inlineChipTextVariant="14M"
                      />
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="border-primary hover:border-primary-hover active:border-primary-active flex h-[44px] w-fit items-center gap-2 rounded-sm border px-4">
                        <Icon name="cross" className="size-3 text-text-secondary!" />
                        <Text variant="caption" className="text-text-secondary!">
                          Clear filters
                        </Text>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-5 pt-1">
                  <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownload} />
                  {isFullScreen ? (
                    <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
                  ) : (
                    <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
                  )}
                </div>
              </div>

              <div className="mt-7 flex items-center gap-10">
                <Checkbox
                  checked={showFullDeliveryOnly}
                  onCheckedChange={setShowFullDeliveryOnly}
                  label="Show only 100% delivery"
                  className="border-[#CBD5E1]!"
                  labelClassName="text-[#129383]! font-InterMedium!"
                />
                <Checkbox
                  checked={showZeroDgHoursOnly}
                  onCheckedChange={setShowZeroDgHoursOnly}
                  label="Show only zero DG hours"
                  className="border-[#CBD5E1]!"
                  labelClassName="text-[#129383]! font-InterMedium!"
                />
              </div>
            </div>
          )}
          {isFullScreen && (
            <div className="flex justify-end">
              <div className="flex items-center gap-5 pt-1">
                <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownload} />
                {isFullScreen ? (
                  <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
                ) : (
                  <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
                )}
              </div>
            </div>
          )}

          <div className="mt-4 h-full [&_.data-table-scroll]:pb-4 [&_table]:min-w-528 [&_thead]:bg-[#E9FAF8]! [&_thead]:text-text-primary! [&_th]:py-3! [&_td]:py-4! [&_tbody]:divide-[#DDE4EA]!">
            <DataTable
              columns={columns}
              data={resultRows}
              totalPages={simulResData?.total_pages ?? 1}
              currentPage={simulResData?.current_page ?? currentPage}
              totalResult={simulResData?.total_configs ?? resultRows.length}
              onPageChange={setCurrentPage}
              stickyHeader
            />
          </div>
        </div>
      </div>
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
      {label: 'Year', value: `${proSimulData?.config?.solar.source.year ?? 'N/A'}`},
      {label: 'Profile', value: `${proSimulData?.config?.solar.source.name ?? 'N/A'}`},
      {label: 'Peak Generation', value: `${proSimulData?.config?.solar.peak_generation ?? 0} MW`},
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
        {
          label: 'Load Priority',
          value: proSimulData?.config?.dispatch?.load_serving_priority === LoadServingPriority['BESS First (Solar → BESS → DG)'] ? 'BESS First' : 'DG First',
        },
        {
          label: 'Takeover Mode',
          value: proSimulData?.config?.dispatch?.is_dg_takeover_full_load ? 'Yes - DG serves full load' : 'No - DG fills gap',
        },
        {
          label: 'DG Output Mode',
          value: proSimulData?.config?.dispatch.is_cycle_charging_enabled ? 'Yes — DG at min load %' : 'No — DG follows load',
        },
      ];
    },
  );

  const sizingConfig: ConfigSummaryDataType = summaryPointFactory(
    {
      icon: 'square',
      label: 'SIZING',
      bgGradientEnd: '#F3FFF4',
    },
    () => {
      const isDGTurnedOn = proSimulData?.config?.dg.is_included ?? false;
      const DGStats = isDGTurnedOn
        ? [
            {label: 'DG Min', value: `${proSimulData?.config?.bess_dg_sizing.dg_min ?? 0} MW`},
            {label: 'DG Max', value: `${proSimulData?.config?.bess_dg_sizing.dg_max ?? 0} MW`},
          ]
        : [];
      return [
        {label: 'Battery Min', value: `${proSimulData?.config?.bess_dg_sizing.bess_min ?? 0} MWh`},
        {label: 'Battery Max', value: `${proSimulData?.config?.bess_dg_sizing.bess_max ?? 0} MWh`},
        ...DGStats,
      ];
    },
  );

  const configSummaryData: ConfigSummaryDataType[] = [loadConfig, solarConfig, generatorConfig, batteryConfig, dispatchStrategyConfig, sizingConfig];
  /**
   * =======================================
   * Functions and handlers
   * =======================================
   */
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
    <div className="border rounded-md border-[#B6D7D3] bg-[#F7FDFC] p-4 flex flex-col gap-2">
      <button onClick={() => setOpen(prev => !prev)} className="outline-none cursor-pointer justify-between flex w-full items-center gap-2">
        <Text variant="h4" className="leading-none!">
          Configuration Summary
        </Text>
        <Icon name={open ? 'cheveron-up' : 'cheveron-down'} className="text-text-secondary! mr-2!" />
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-4">
          {configSummaryData.map((data, index) => (
            <ConfigurationSummaryCard key={index} {...data} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ConfigSummaryCardProps extends ConfigSummaryDataType {}
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
        {points.map((point, index) => (
          <li key={index}>
            <div className="flex whitespace-nowrap gap-2">
              {point.label && (
                <Text variant="small" className="text-text-secondary!">
                  {point.label}:
                </Text>
              )}

              <Text variant="12SB">{point.value}</Text>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
