import {useState, useEffect, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {DataTable} from '@/components';
import type {DataTableColumn, SortType, CustomHourlyResults, DateRange} from '@/interface';
import {Sort, Text, Tooltip, Icon, Skeleton, DateRangePicker} from '@/ui-kits';
import {customHourlySimulationResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {
  customHourlySimulationResults,
  customConfigData,
  customSimulationSuccess,
  initiateSimulationData,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import type {RootState} from '@/services/redux/rootReducer';
import {format} from 'date-fns';
import {useChartsActionV2, useToast} from '@/hooks';
import {getCustomHourlySimulationResultsExport} from '@/services/api';
import {getErrorMessage} from '@/utils';
import type {ErrorCodes} from '@/utils';
import {allProjectsData} from '@/services/redux/selectors';

const PAGE_SIZE = 100;

// Sortable fields that can be sent to the API
const SORTABLE_FIELDS = new Set([
  'timestamp',
  'hour',
  'day',
  'hour_of_day',
  'load_mw',
  'solar_mw',
  'solar_to_load',
  'solar_to_bess',
  'bess_to_load',
  'bess_mw',
  'bess_state',
  'dg_output_mw',
  'is_dg_running',
  'dg_to_load',
  'dg_to_bess',
  'dg_curtailed',
  'soc_mwh',
  'soc_percent',
  'unmet_mw',
  'delivery',
  'solar_curtailed',
  'daily_cycles',
  'green_energy_to_load_mwh',
]);

interface HourlyDataRow {
  hour: number;
  day: number;
  hourOfDay: number;
  loadMW: number;
  solarMW: number;
  solarToLoad: number;
  solarToBess: number;
  bessToLoad: number;
  bessMW: number;
  bessState: string;
  dgOutputMW: number;
  dgState: string;
  dgToLoad: number;
  dgToBess: number;
  dgCurtailed: number;
  socMWh: number;
  socPercent: number;
  unmetMW: number;
  delivery: string;
  solarCurtailed: number;
  dailyCycles: number;
  greenEnergyToLoadMWh: number;
}

// Ghost loader for table
const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: i}));

function HourlyDataTableGhostLoader() {
  return (
    <div className="bg-white">
      <Skeleton animation="wave" variant="rounded" width={200} height={28} className="mb-2 rounded-full!" />
      <Skeleton animation="wave" variant="rounded" width={300} height={18} className="mb-4 rounded-full!" />
      <div className="mb-4 flex items-center gap-4">
        <Skeleton animation="wave" variant="rounded" width={280} height={44} className="rounded-lg!" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full w-full">
          <thead className="bg-[#E9FAF8]">
            <tr>
              {Array.from({length: 12}).map((_, idx) => (
                <th key={idx} className="py-3 px-2">
                  <Skeleton animation="wave" variant="rounded" width={80} height={18} className="rounded-full!" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ghostTableRows.map(row => (
              <tr key={row.id}>
                {Array.from({length: 12}).map((_, idx) => (
                  <td key={idx} className="py-4 px-2">
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

// Map bess_state number to string
const getBessStateLabel = (state: number): string => {
  switch (state) {
    case 0:
      return 'Idle';
    case 1:
      return 'Charging';
    case 2:
      return 'Discharging';
    default:
      return 'Unknown';
  }
};

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

type DateFilterType = {
  date_range?: {
    start: Date | null;
    end: Date | null;
  };
};

interface HourlyDataTableProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
}

export const HourlyDataTable = (props: HourlyDataTableProps) => {
  const {setIsStepsHidden, isFullScreen = false} = props;
  const dispatch = useDispatch();
  const {showToast} = useToast();
  const [sortFields, setSortFields] = useState<SortField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<DateFilterType>({});
  const [pendingDateRange, setPendingDateRange] = useState<DateRange>({start: null, end: null});

  // Maximize/Minimize hook
  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <HourlyDataTable {...props} isFullScreen />,
  });

  // Selectors
  const hourlyData = useSelector(customHourlySimulationResults);
  const customConfig = useSelector(customConfigData);
  const customSimulationStatus = useSelector(customSimulationSuccess);
  const simulData = useSelector(initiateSimulationData);
  const isLoading = useSelector((state: RootState) => state.simulationWizard.hourlySimulationResultsLoading);
  const proSimulData = useSelector(projectSimulationData);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);
  const simulation_id = customConfig?.simulation_id ?? simulData?.id ?? proSimulData?.id;
  // Get project name and simulation name
  const project_id = proSimulData?.project_id;
  const projectName = currentProject?.name || allProjects?.find(p => p.id === project_id)?.name || '';
  const simulationName = proSimulData?.name || '';

  // Build API request params
  const buildRequestParams = useCallback(() => {
    if (!simulation_id) return null;

    const sortParam = sortFields.filter(f => SORTABLE_FIELDS.has(f.field)).map(f => (f.direction === 'desc' ? `-${f.field}` : f.field));

    // Format dates as ISO string with time (2024-01-01T00:00:00Z)
    const startDate = dateFilter.date_range?.start;
    const endDate = dateFilter.date_range?.end;

    return {
      simulation_id,
      page: currentPage,
      limit: PAGE_SIZE,
      sort: sortParam.length > 0 ? sortParam : undefined,
      start_time: startDate ? format(startDate, "yyyy-MM-dd'T'00:00:00'Z'") : undefined,
      end_time: endDate ? format(endDate, "yyyy-MM-dd'T'23:59:59'Z'") : undefined,
    };
  }, [simulation_id, currentPage, sortFields, dateFilter]);

  // Fetch data on mount and when params change
  useEffect(() => {
    const params = buildRequestParams();
    if (params) {
      dispatch(customHourlySimulationResultsRequest(params));
    }
  }, [buildRequestParams, dispatch]);

  useEffect(() => {
    if (customSimulationStatus !== 'S-20038') return;

    const params = buildRequestParams();
    if (params) {
      dispatch(customHourlySimulationResultsRequest(params));
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
  const resultRows: HourlyDataRow[] = Array.isArray(hourlyData?.results)
    ? hourlyData.results.map((item: CustomHourlyResults) => ({
        hour: item.hour,
        day: item.day,
        hourOfDay: item.hour_of_day,
        loadMW: Number(item.load_mw?.toFixed(2)),
        solarMW: Number(item.solar_mw?.toFixed(2)),
        solarToLoad: Number(item.solar_to_load?.toFixed(2)),
        solarToBess: Number(item.solar_to_bess?.toFixed(2)),
        bessToLoad: Number(item.bess_to_load?.toFixed(2)),
        bessMW: Number(item.bess_power_mw?.toFixed(2)),
        bessState: getBessStateLabel(item.bess_state),
        dgOutputMW: Number(item.dg_output_mw?.toFixed(2)),
        dgState: item.is_dg_running ? 'ON' : 'OFF',
        dgToLoad: Number(item.dg_to_load?.toFixed(2)),
        dgToBess: Number(item.dg_to_bess?.toFixed(2)),
        dgCurtailed: Number(item.dg_curtailed?.toFixed(2)),
        socMWh: Number(item.soc_mwh?.toFixed(2)),
        socPercent: Number(item.soc_percent?.toFixed(2)),
        unmetMW: Number(item.unmet_mw?.toFixed(2)),
        delivery: item.delivery ? 'Yes' : 'No',
        solarCurtailed: Number(item.solar_curtailed?.toFixed(2)),
        dailyCycles: Number(item.daily_cycles?.toFixed(2)),
        greenEnergyToLoadMWh: Number(item.green_energy_to_load_mwh?.toFixed(2)),
      }))
    : [];

  const renderCell = (value: number | string, accent = false) => (
    <Text variant="caption2" className={accent ? 'text-teal!' : 'text-text-primary!'}>
      {value}
    </Text>
  );

  const handleSortChange = (field: string) => {
    setSortFields(prev => {
      const existingIndex = prev.findIndex(f => f.field === field);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          return prev.map((f, i) => (i === existingIndex ? {...f, direction: 'desc'} : f));
        } else {
          return prev.filter((_, i) => i !== existingIndex);
        }
      } else {
        return [...prev, {field, direction: 'asc'}];
      }
    });
    setCurrentPage(1);
  };

  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    const found = sortFields.find(f => f.field === field);
    return found ? found.direction : null;
  };

  const handleDateChange = (range: DateRange) => {
    setPendingDateRange(range);
  };

  const handleDateClear = () => {
    setPendingDateRange({start: null, end: null});
    setDateFilter({});
    setCurrentPage(1);
  };

  const handleDateApply = (range: DateRange) => {
    if (range.start && range.end) {
      setDateFilter({date_range: range});
      setCurrentPage(1);
    }
  };

  const handleDownload = async () => {
    const params = buildRequestParams();
    if (!params) return;

    const {simulation_id: resultSimulationId, ...exportParams} = params;

    try {
      await getCustomHourlySimulationResultsExport(resultSimulationId, {
        ...exportParams,
        fileName: `Hourly_Simulation_Results_${resultSimulationId}.csv`,
      });
    } catch (error: unknown) {
      const status_code = (error as {data?: {status_code?: string}})?.data?.status_code;
      showToast(status_code ? getErrorMessage(status_code as ErrorCodes) : 'Failed to download hourly simulation results', 'error');
    }
  };

  const columns: DataTableColumn<HourlyDataRow>[] = [
    {
      name: 'hour',
      title: <ColumnHeader label="Hour" sort={getSortDirection('hour')} onSortChange={() => handleSortChange('hour')} tooltip="Hour of simulation" />,
      width: {minWidth: '80px'},
      align: 'center',
      render: row => renderCell(row.hour),
    },
    {
      name: 'day',
      title: <ColumnHeader label="Day" sort={getSortDirection('day')} onSortChange={() => handleSortChange('day')} tooltip="Day of simulation" />,
      width: {minWidth: '80px'},
      align: 'center',
      render: row => renderCell(row.day),
    },
    {
      name: 'hourOfDay',
      title: (
        <ColumnHeader
          label="Hour of Day"
          sort={getSortDirection('hour_of_day')}
          onSortChange={() => handleSortChange('hour_of_day')}
          tooltip="Hour of day (0-23)"
        />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.hourOfDay),
    },
    {
      name: 'loadMW',
      title: <ColumnHeader label="Load (MW)" sort={getSortDirection('load_mw')} onSortChange={() => handleSortChange('load_mw')} tooltip="Load power demand" />,
      width: {minWidth: '100px'},
      align: 'center',
      render: row => renderCell(row.loadMW),
    },
    {
      name: 'solarMW',
      title: (
        <ColumnHeader label="Solar (MW)" sort={getSortDirection('solar_mw')} onSortChange={() => handleSortChange('solar_mw')} tooltip="Solar power output" />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.solarMW),
    },
    {
      name: 'solarToLoad',
      title: (
        <ColumnHeader
          label="Solar to Load (MW)"
          sort={getSortDirection('solar_to_load')}
          onSortChange={() => handleSortChange('solar_to_load')}
          tooltip="Solar power directly to load"
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.solarToLoad),
    },
    {
      name: 'solarToBess',
      title: (
        <ColumnHeader
          label="Solar to BESS (MW)"
          sort={getSortDirection('solar_to_bess')}
          onSortChange={() => handleSortChange('solar_to_bess')}
          tooltip="Solar power to battery"
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.solarToBess),
    },
    {
      name: 'bessToLoad',
      title: (
        <ColumnHeader
          label="BESS to Load (MW)"
          sort={getSortDirection('bess_to_load')}
          onSortChange={() => handleSortChange('bess_to_load')}
          tooltip="Battery power to load"
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.bessToLoad),
    },
    {
      name: 'bessMW',
      title: (
        <ColumnHeader label="BESS (MW)" sort={getSortDirection('bess_mw')} onSortChange={() => handleSortChange('bess_mw')} tooltip="Battery power capacity" />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.bessMW),
    },
    {
      name: 'bessState',
      title: (
        <ColumnHeader label="BESS State" sort={getSortDirection('bess_state')} onSortChange={() => handleSortChange('bess_state')} tooltip="Battery state" />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => {
        const getBessStateClass = () => {
          if (row.bessState === 'Charging') return 'text-success!';
          if (row.bessState === 'Discharging') return 'text-warning!';
          return 'text-text-primary!';
        };
        return (
          <Text variant="caption2" className={getBessStateClass()}>
            {row.bessState}
          </Text>
        );
      },
    },
    {
      name: 'dgOutputMW',
      title: (
        <ColumnHeader
          label="DG Output (MW)"
          sort={getSortDirection('dg_output_mw')}
          onSortChange={() => handleSortChange('dg_output_mw')}
          tooltip="Generator output power"
        />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.dgOutputMW),
    },
    {
      name: 'dgState',
      title: (
        <ColumnHeader
          label="DG State"
          sort={getSortDirection('is_dg_running')}
          onSortChange={() => handleSortChange('is_dg_running')}
          tooltip="Generator running state"
        />
      ),
      width: {minWidth: '100px'},
      align: 'center',
      render: row => (
        <Text variant="caption2" className={row.dgState === 'ON' ? 'text-success!' : 'text-text-secondary!'}>
          {row.dgState}
        </Text>
      ),
    },
    {
      name: 'dgToLoad',
      title: (
        <ColumnHeader
          label="DG to Load (MW)"
          sort={getSortDirection('dg_to_load')}
          onSortChange={() => handleSortChange('dg_to_load')}
          tooltip="Generator power to load"
        />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.dgToLoad),
    },
    {
      name: 'dgToBess',
      title: (
        <ColumnHeader
          label="DG to BESS (MW)"
          sort={getSortDirection('dg_to_bess')}
          onSortChange={() => handleSortChange('dg_to_bess')}
          tooltip="Generator power to battery"
        />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.dgToBess),
    },
    {
      name: 'dgCurtailed',
      title: (
        <ColumnHeader
          label="DG Curtailed (MW)"
          sort={getSortDirection('dg_curtailed')}
          onSortChange={() => handleSortChange('dg_curtailed')}
          tooltip="Generator curtailed power"
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.dgCurtailed),
    },
    {
      name: 'socMWh',
      title: (
        <ColumnHeader label="SOC (MWh)" sort={getSortDirection('soc_mwh')} onSortChange={() => handleSortChange('soc_mwh')} tooltip="State of charge in MWh" />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.socMWh),
    },
    {
      name: 'socPercent',
      title: (
        <ColumnHeader
          label="SOC (%)"
          sort={getSortDirection('soc_percent')}
          onSortChange={() => handleSortChange('soc_percent')}
          tooltip="State of charge percentage"
        />
      ),
      width: {minWidth: '100px'},
      align: 'center',
      render: row => renderCell(row.socPercent),
    },
    {
      name: 'unmetMW',
      title: (
        <ColumnHeader label="Unmet (MW)" sort={getSortDirection('unmet_mw')} onSortChange={() => handleSortChange('unmet_mw')} tooltip="Unmet energy demand" />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => (
        <Text variant="caption2" className={row.unmetMW > 0 ? 'text-error!' : 'text-text-primary!'}>
          {row.unmetMW}
        </Text>
      ),
    },
    {
      name: 'delivery',
      title: (
        <ColumnHeader label="Delivery" sort={getSortDirection('delivery')} onSortChange={() => handleSortChange('delivery')} tooltip="Load delivery status" />
      ),
      width: {minWidth: '100px'},
      align: 'center',
      render: row => (
        <Text variant="caption2" className={row.delivery === 'Yes' ? 'text-success!' : 'text-error!'}>
          {row.delivery}
        </Text>
      ),
    },
    {
      name: 'solarCurtailed',
      title: (
        <ColumnHeader
          label="Solar Curtailed (MW)"
          sort={getSortDirection('solar_curtailed')}
          onSortChange={() => handleSortChange('solar_curtailed')}
          tooltip="Solar curtailed power"
        />
      ),
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.solarCurtailed),
    },
    {
      name: 'dailyCycles',
      title: (
        <ColumnHeader
          label="BESS Daily Cycles"
          sort={getSortDirection('daily_cycles')}
          onSortChange={() => handleSortChange('daily_cycles')}
          tooltip="Battery daily cycles"
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.dailyCycles),
    },
    {
      name: 'greenEnergyToLoadMWh',
      title: (
        <ColumnHeader
          label="Green Energy to Load (MWh)"
          sort={getSortDirection('green_energy_to_load_mwh')}
          onSortChange={() => handleSortChange('green_energy_to_load_mwh')}
          tooltip="Green energy delivered to load"
        />
      ),
      width: {minWidth: '180px'},
      align: 'center',
      render: row => renderCell(row.greenEnergyToLoadMWh, true),
    },
  ];

  if (isLoading) {
    return <HourlyDataTableGhostLoader />;
  }

  // Calculate minDate and maxDate for the DateRangePicker based on the year from the API response
  const apiYear = hourlyData?.year;
  const minDate: Date | undefined = apiYear && typeof apiYear === 'number' ? new Date(apiYear, 0, 1, 0, 0, 0, 0) : undefined;
  const maxDate: Date | undefined = apiYear && typeof apiYear === 'number' ? new Date(apiYear, 11, 31, 23, 59, 59, 999) : undefined;

  return (
    <div ref={tableRef} className="bg-white">
      <div className={`flex w-full ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="flex justify-between w-full">
            <div className="flex flex-col">
              <Text variant="h3">Hourly Data Table</Text>
              <Text variant="14R" className="text-text-secondary! my-1.5">
                Delivery and green energy breakdown by Hour
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
            <DateRangePicker
              isFilter
              values={pendingDateRange}
              onDateChange={handleDateChange}
              placeholder="Date Range"
              showActions
              onClear={handleDateClear}
              onApply={handleDateApply}
              usePortal
              className="min-w-58"
              minDate={minDate}
              maxDate={maxDate}
              defaultYear={apiYear}
            />
            {(!!dateFilter.date_range?.start || !!dateFilter.date_range?.end || sortFields.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setPendingDateRange({start: null, end: null});
                  setDateFilter({});
                  setSortFields([]);
                  setCurrentPage(1);
                }}
                className="border-primary cursor-pointer hover:border-primary-hover active:border-primary-active border self-stretch rounded-sm px-4 py-1 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                <Icon name="cross" className="text-text-secondary size-3" />
                <Text variant="caption" className="text-text-secondary!">
                  Clear filters
                </Text>
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

      <div className="[&_.data-table-scroll]:pb-4 [&_table]:min-w-528 [&_thead]:bg-[#E9FAF8]! [&_thead]:text-text-primary! [&_th]:py-3! [&_td]:py-4! [&_tbody]:divide-[#DDE4EA]!">
        <DataTable
          data={resultRows}
          columns={columns}
          totalPages={hourlyData?.total_pages ?? 1}
          currentPage={hourlyData?.current_page ?? currentPage}
          totalResult={hourlyData?.total_configs ?? resultRows.length}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          stickyHeader
        />
      </div>
    </div>
  );
};
