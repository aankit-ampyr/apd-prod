import {DataTable} from '@/components';
import {DGDriggerType, DGRunScheduleMode, LoadProfilePattern, LoadServingPriority} from '@/constants';
import {useChartsActionV2, useToast, useWindowDimensions} from '@/hooks';
import type {DataTableColumn, GreenAnalysisResults as ApiGreenAnalysisResult, SortType} from '@/interface';
import type {RootState} from '@/services/redux/rootReducer';
import {allProjectsData} from '@/services/redux/selectors';
import {
  detailedGreenAnalysis,
  greenaAnalysisResultsData,
  greenAnalysisData,
  initiateSimulationData,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {getGreenAnalysisExport} from '@/services/api';
import {greenAnalysisResultsRequest, setShowDetailedGreenAnalysis, setShowGreenAnalysisResults} from '@/services/redux/slice/simulationWizardSlice';
import {Button, Checkbox, Icon, IconTypes, MultiSelectInput, SearchableMultiSelectInput, Skeleton, Sort, Text, Tooltip} from '@/ui-kits';
import {getErrorMessage} from '@/utils';
import type {ErrorCodes} from '@/utils';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';
import {DetailedAnalysis} from './DetailedAnalysis';

const FILTER_INLINE_CHIP_CLASS = 'rounded-[8px] px-3 py-1 bg-primary-tint-2';
const FILTER_INLINE_CHIP_TEXT_CLASS = 'text-[12px]! leading-[16px]! font-InterMedium!';
const SEARCHABLE_FILTER_WRAPPER_CLASS = 'gap-1';
const PAGE_SIZE = 100;

const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: i}));

function GreenAnalysisResultsGhostLoader() {
  return (
    <div className="main">
      <Text variant="14R" className="text-text-secondary! mt-3">
        <Skeleton animation="wave" variant="rounded" width={180} height={18} className="mb-2 rounded-full!" />
      </Text>
      <div className="w-full rounded-lg border border-[#D9E1E7] bg-white px-5 py-6 mt-3">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton animation="wave" variant="circular" width={24} height={24} className="mr-2" />
            <Skeleton animation="wave" variant="rounded" width={220} height={36} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={220} height={36} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={220} height={36} className="rounded-full!" />
          </div>
          <div className="flex items-center gap-5 pt-1">
            <Skeleton animation="wave" variant="circular" width={20} height={20} />
            <Skeleton animation="wave" variant="circular" width={20} height={20} />
          </div>
        </div>
        <div className="mt-7 flex items-center gap-10">
          <Skeleton animation="wave" variant="rounded" width={220} height={24} className="rounded-full!" />
          <Skeleton animation="wave" variant="rounded" width={220} height={24} className="rounded-full!" />
          <Skeleton animation="wave" variant="rounded" width={220} height={24} className="rounded-full!" />
        </div>
      </div>
      <div className="mt-4 h-full">
        <div className="overflow-x-auto">
          <table className="min-w-640 w-full">
            <thead className="bg-[#E9FAF8]">
              <tr>
                {Array.from({length: 19}).map((_, idx) => (
                  <th key={idx} className="py-3 px-2">
                    <Skeleton animation="wave" variant="rounded" width={90} height={18} className="rounded-full!" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ghostTableRows.map(row => (
                <tr key={row.id}>
                  {Array.from({length: 19}).map((_, idx) => (
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

const SORTABLE_FIELDS = new Set([
  'solar_mwp',
  'bess_mwh',
  'duration_hr',
  'power_mw',
  'containers',
  'dg_mw',
  'delivery_pct',
  'green_pct',
  'green_energy_pct',
  'green_hours_pct',
  'green_hours_mar_oct_pct',
  'wastage_pct',
  'delivery_hours',
  'load_hours',
  'green_hours',
  'dg_hours',
  'dg_starts',
  'bess_cycles',
  'unserved_mwh',
  'fuel_consumption_l',
]);

type GreenAnalysisFilter = {
  solar_capacity?: number[];
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

type ProjectOption = {
  id?: number | string;
  name?: string;
};

type CustomLoadWindow = {
  load_mw?: number | string;
};

interface GreenAnalysisRow {
  solarSize: number;
  batterySize: number;
  duration: number;
  batteryPower: number;
  containers: number;
  generatorSize: number;
  loadMet: number;
  greenEnergy: number;
  greenHoursPercent: number;
  greenHoursMarOct: number;
  wastageEnergy: number;
  hoursFullyServed: number;
  totalLoadHours: number;
  greenHours: number;
  generatorHours: number;
  generatorStarts: number;
  avgBatteryCycles: number;
  unmetEnergy: number;
  fuelUsed: number;
}

interface ColumnHeaderProps {
  label: string;
  sort?: SortType;
  onSortChange?: (sort: SortType) => void;
  tooltip?: string;
}

const ColumnHeader = ({label, sort, onSortChange, tooltip}: ColumnHeaderProps) => (
  <div className="flex items-center justify-center gap-2">
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

const renderCell = (value: number | string, className = 'text-text-primary!') => (
  <Text variant="caption2" className={`${className} font-InterRegular!`}>
    {value}
  </Text>
);

const mergeFilterOptions = (existing: FilterOption[], values: number[], unit: string): FilterOption[] => {
  const uniqueValues = [...new Set([...existing.map(item => item.id), ...values])].sort((a, b) => a - b);
  return uniqueValues.map(value => ({id: value, label: `${value} ${unit}`}));
};

const scrollWizardViewportToTop = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const screenWrapper = document.querySelector('.screen-wrapper');
  let scrollContainer: HTMLElement | null = screenWrapper?.parentElement ?? null;

  while (scrollContainer) {
    const {overflow, overflowY} = window.getComputedStyle(scrollContainer);
    if (/(auto|scroll)/.test(`${overflow}${overflowY}`) && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
      scrollContainer.scrollTo({top: 0, left: 0, behavior: 'auto'});
      return;
    }

    scrollContainer = scrollContainer.parentElement;
  }

  window.scrollTo({top: 0, left: 0, behavior: 'auto'});
};

type GreenAnalysisResultsParams = {
  simulation_id: number;
  page?: number;
  limit?: number;
  solar_capacity?: number[];
  duration_hr?: number[];
  dg_capacity?: number[];
  bess_capacity?: number[];
  viable_only?: boolean;
  delivery_100_only?: boolean;
  zero_dg_hours_only?: boolean;
  sort?: string[];
};

interface GreenEnergyAnalysisResultProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
}

export const GreenEnergyAnalysisResult = (props: GreenEnergyAnalysisResultProps = {}) => {
  const dispatch = useDispatch();
  const {showToast} = useToast();
  const {setIsStepsHidden, isFullScreen = false} = props;
  const {id: simulationIdFromUrl} = useParams();
  const currentProject = useSelector(simulationProject);
  const simulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);

  const {width} = useWindowDimensions();

  const maxVisibleChips = width >= 1280 ? 3 : 2; // xl breakpoint = 1280px

  const greenAnalysisResults = useSelector(greenaAnalysisResultsData);
  const greenAnalysis = useSelector(greenAnalysisData);
  const detailedScreen = useSelector(detailedGreenAnalysis);
  const isResultsLoading = useSelector((state: RootState) => state.simulationWizard.greenAnalysisResultsLoading);
  const [filter, setFilter] = useState<GreenAnalysisFilter>({});
  const [showViableOnly, setShowViableOnly] = useState(false);
  const [showFullDeliveryOnly, setShowFullDeliveryOnly] = useState(false);
  const [showZeroDgHoursOnly, setShowZeroDgHoursOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortFields, setSortFields] = useState<SortField[]>([]);
  const [solarCapacityOptions, setSolarCapacityOptions] = useState<FilterOption[]>([]);
  const [durationOptions, setDurationOptions] = useState<FilterOption[]>([]);
  const [dgCapacityOptions, setDgCapacityOptions] = useState<FilterOption[]>([]);
  const [bessCapacityOptions, setBessCapacityOptions] = useState<FilterOption[]>([]);

  const allProjects = useSelector(allProjectsData);
  const project_id = proSimulData?.project_id;
  const simulation_id = simulData?.id ?? proSimulData?.id ?? (simulationIdFromUrl ? Number(simulationIdFromUrl) : undefined);

  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <GreenEnergyAnalysisResult {...props} isFullScreen />,
  });

  useEffect(() => {
    if (isFullScreen || detailedScreen) {
      setIsStepsHidden?.(true);
      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden, detailedScreen]);

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(scrollWizardViewportToTop);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  const projectName = currentProject?.name || (allProjects as ProjectOption[] | undefined)?.find(project => project.id === project_id)?.name || '';

  const updateFilter = (key: keyof GreenAnalysisFilter, values?: number[]) => {
    setFilter(prev => ({
      ...prev,
      [key]: values && values.length > 0 ? values : undefined,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilter({});
    setShowViableOnly(false);
    setShowFullDeliveryOnly(false);
    setShowZeroDgHoursOnly(false);
    setCurrentPage(1);
  };

  const handleSortChange = (field: string) => {
    setSortFields(prev => {
      const index = prev.findIndex(item => item.field === field);

      if (index === -1) {
        return [...prev, {field, direction: 'asc'}];
      }

      if (prev[index].direction === 'asc') {
        return [...prev.slice(0, index), {field, direction: 'desc'}, ...prev.slice(index + 1)];
      }

      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
    setCurrentPage(1);
  };

  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    const found = sortFields.find(item => item.field === field);
    return found ? found.direction : null;
  };

  const buildResultsParams = useCallback((): GreenAnalysisResultsParams | null => {
    if (!simulation_id) {
      return null;
    }

    const sort = sortFields.filter(item => SORTABLE_FIELDS.has(item.field)).map(item => (item.direction === 'desc' ? `-${item.field}` : item.field));

    return {
      simulation_id,
      page: currentPage,
      limit: PAGE_SIZE,
      solar_capacity: filter.solar_capacity && filter.solar_capacity.length > 0 ? filter.solar_capacity : undefined,
      duration_hr: filter.duration_hr && filter.duration_hr.length > 0 ? filter.duration_hr : undefined,
      dg_capacity: filter.dg_capacity && filter.dg_capacity.length > 0 ? filter.dg_capacity : undefined,
      bess_capacity: filter.bess_capacity && filter.bess_capacity.length > 0 ? filter.bess_capacity : undefined,
      viable_only: showViableOnly || undefined,
      delivery_100_only: showFullDeliveryOnly || undefined,
      zero_dg_hours_only: showZeroDgHoursOnly || undefined,
      sort: sort.length > 0 ? sort : undefined,
    };
  }, [currentPage, filter, showViableOnly, showFullDeliveryOnly, showZeroDgHoursOnly, simulation_id, sortFields]);

  const resultRows = useMemo(() => {
    if (!Array.isArray(greenAnalysisResults?.results)) {
      return [];
    }

    return greenAnalysisResults.results.map((row: ApiGreenAnalysisResult) => ({
      solarSize: Number(row.solar_mwp),
      batterySize: Number(row.bess_mwh),
      duration: Number(row.duration_hr),
      batteryPower: Number(row.power_mw),
      containers: Number(row.containers),
      generatorSize: Number(row.dg_mw),
      loadMet: Number(row.delivery_pct),
      greenEnergy: Number(row.green_energy_pct ?? row.green_pct),
      greenHoursPercent: Number(row.green_pct ?? row.green_hours_pct),
      greenHoursMarOct: Number(row.green_hours_mar_oct_pct),
      wastageEnergy: Number(row.wastage_pct),
      hoursFullyServed: Number(row.delivery_hours),
      totalLoadHours: Number(row.load_hours),
      greenHours: Number(row.green_hours),
      generatorHours: Number(row.dg_hours),
      generatorStarts: Number(row.dg_starts),
      avgBatteryCycles: Number(row.bess_cycles),
      unmetEnergy: Number(row.unserved_mwh),
      fuelUsed: Number(row.fuel_consumption_l),
    }));
  }, [greenAnalysisResults?.results]);

  const hasActiveFilters = Boolean(
    filter.solar_capacity?.length ||
    filter.duration_hr?.length ||
    filter.dg_capacity?.length ||
    filter.bess_capacity?.length ||
    showViableOnly ||
    showFullDeliveryOnly ||
    showZeroDgHoursOnly,
  );

  const columns: DataTableColumn<GreenAnalysisRow>[] = [
    {
      name: 'solarSize',
      title: (
        <ColumnHeader
          label="Solar Size (MWp)"
          sort={getSortDirection('solar_mwp')}
          onSortChange={() => handleSortChange('solar_mwp')}
          tooltip="Installed solar PV capacity"
        />
      ),
      width: {minWidth: '132px'},
      align: 'center',
      render: row => renderCell(row.solarSize),
    },
    {
      name: 'batterySize',
      title: (
        <ColumnHeader
          label="Battery Size (MWh)"
          sort={getSortDirection('bess_mwh')}
          onSortChange={() => handleSortChange('bess_mwh')}
          tooltip="Total battery storage capacity"
        />
      ),
      width: {minWidth: '144px'},
      align: 'center',
      render: row => renderCell(row.batterySize),
    },
    {
      name: 'duration',
      title: (
        <ColumnHeader
          label="Discharge Duration (hr)"
          sort={getSortDirection('duration_hr')}
          onSortChange={() => handleSortChange('duration_hr')}
          tooltip="Battery runtime at rated power"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.duration),
    },
    {
      name: 'batteryPower',
      title: (
        <ColumnHeader
          label="Battery Power (MW)"
          sort={getSortDirection('power_mw')}
          onSortChange={() => handleSortChange('power_mw')}
          tooltip="Battery charge/discharge power"
        />
      ),
      width: {minWidth: '144px'},
      align: 'center',
      render: row => renderCell(row.batteryPower),
    },
    {
      name: 'containers',
      title: (
        <ColumnHeader
          label="Containers"
          sort={getSortDirection('containers')}
          onSortChange={() => handleSortChange('containers')}
          tooltip="Estimated battery container count"
        />
      ),
      width: {minWidth: '112px'},
      align: 'center',
      render: row => renderCell(row.containers),
    },
    {
      name: 'generatorSize',
      title: (
        <ColumnHeader
          label="Generator Size (MW)"
          sort={getSortDirection('dg_mw')}
          onSortChange={() => handleSortChange('dg_mw')}
          tooltip="Backup generator capacity"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.generatorSize),
    },
    {
      name: 'loadMet',
      title: (
        <ColumnHeader
          label="Load Met (%)"
          sort={getSortDirection('delivery_pct')}
          onSortChange={() => handleSortChange('delivery_pct')}
          tooltip="Percentage of load demand served"
        />
      ),
      width: {minWidth: '116px'},
      align: 'center',
      render: row => renderCell(row.loadMet, 'text-teal!'),
    },
    {
      name: 'greenEnergy',
      title: (
        <ColumnHeader
          label="Green Energy (%)"
          sort={getSortDirection('green_energy_pct')}
          onSortChange={() => handleSortChange('green_energy_pct')}
          tooltip="Share of served energy from solar and battery"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.greenEnergy),
    },
    {
      name: 'greenHoursPercent',
      title: (
        <ColumnHeader
          label="Green Hours (%)"
          sort={getSortDirection('green_pct')}
          onSortChange={() => handleSortChange('green_pct')}
          tooltip="Percentage of hours served without generator"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.greenHoursPercent),
    },
    {
      name: 'greenHoursMarOct',
      title: (
        <ColumnHeader
          label="Green Hours (Mar-Oct) (%)"
          sort={getSortDirection('green_hours_mar_oct_pct')}
          onSortChange={() => handleSortChange('green_hours_mar_oct_pct')}
          tooltip="Green hours percentage during March to October"
        />
      ),
      width: {minWidth: '188px'},
      align: 'center',
      render: row => renderCell(row.greenHoursMarOct),
    },
    {
      name: 'wastageEnergy',
      title: (
        <ColumnHeader
          label="Wastage Energy (%)"
          sort={getSortDirection('wastage_pct')}
          onSortChange={() => handleSortChange('wastage_pct')}
          tooltip="Renewable energy that could not be used"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.wastageEnergy, 'text-warning!'),
    },
    {
      name: 'hoursFullyServed',
      title: (
        <ColumnHeader
          label="Hours Fully Served"
          sort={getSortDirection('delivery_hours')}
          onSortChange={() => handleSortChange('delivery_hours')}
          tooltip="Hours where full load was met"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.hoursFullyServed),
    },
    {
      name: 'totalLoadHours',
      title: (
        <ColumnHeader
          label="Total Load Hours"
          sort={getSortDirection('load_hours')}
          onSortChange={() => handleSortChange('load_hours')}
          tooltip="Total modeled hours with load demand"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.totalLoadHours),
    },
    {
      name: 'greenHours',
      title: (
        <ColumnHeader
          label="Green Hours"
          sort={getSortDirection('green_hours')}
          onSortChange={() => handleSortChange('green_hours')}
          tooltip="Total hours served without generator"
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.greenHours),
    },
    {
      name: 'generatorHours',
      title: (
        <ColumnHeader
          label="Generator Hours"
          sort={getSortDirection('dg_hours')}
          onSortChange={() => handleSortChange('dg_hours')}
          tooltip="Total generator runtime hours"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.generatorHours),
    },
    {
      name: 'generatorStarts',
      title: (
        <ColumnHeader
          label="Generator Starts"
          sort={getSortDirection('dg_starts')}
          onSortChange={() => handleSortChange('dg_starts')}
          tooltip="Number of generator start events"
        />
      ),
      width: {minWidth: '136px'},
      align: 'center',
      render: row => renderCell(row.generatorStarts),
    },
    {
      name: 'avgBatteryCycles',
      title: (
        <ColumnHeader
          label="Avg. Battery Cycles per Day"
          sort={getSortDirection('bess_cycles')}
          onSortChange={() => handleSortChange('bess_cycles')}
          tooltip="Average daily equivalent battery cycles"
        />
      ),
      width: {minWidth: '196px'},
      align: 'center',
      render: row => renderCell(row.avgBatteryCycles),
    },
    {
      name: 'unmetEnergy',
      title: (
        <ColumnHeader
          label="Unmet Energy (MWh)"
          sort={getSortDirection('unserved_mwh')}
          onSortChange={() => handleSortChange('unserved_mwh')}
          tooltip="Load energy not served"
        />
      ),
      width: {minWidth: '152px'},
      align: 'center',
      render: row => renderCell(row.unmetEnergy),
    },
    {
      name: 'fuelUsed',
      title: (
        <ColumnHeader
          label="Fuel Used (L)"
          sort={getSortDirection('fuel_consumption_l')}
          onSortChange={() => handleSortChange('fuel_consumption_l')}
          tooltip="Total generator fuel consumed"
        />
      ),
      width: {minWidth: '124px'},
      align: 'center',
      render: row => renderCell(row.fuelUsed),
    },
  ];

  useEffect(() => {
    const params = buildResultsParams();

    if (!params) {
      return;
    }

    dispatch(greenAnalysisResultsRequest(params));
  }, [buildResultsParams, dispatch]);

  useEffect(() => {
    setSolarCapacityOptions([]);
    setDurationOptions([]);
    setDgCapacityOptions([]);
    setBessCapacityOptions([]);
  }, [simulation_id]);

  useEffect(() => {
    if (!Array.isArray(greenAnalysisResults?.results)) {
      return;
    }

    const solarValues = greenAnalysisResults.results.map(item => Number(item.solar_mwp)).filter(value => !Number.isNaN(value));
    const durationValues = greenAnalysisResults.results.map(item => Number(item.duration_hr)).filter(value => !Number.isNaN(value));
    const dgValues = greenAnalysisResults.results.map(item => Number(item.dg_mw)).filter(value => !Number.isNaN(value));
    const bessValues = greenAnalysisResults.results.map(item => Number(item.bess_mwh)).filter(value => !Number.isNaN(value));

    setSolarCapacityOptions(prev => mergeFilterOptions(prev, solarValues, 'MWp'));
    setDurationOptions(prev => mergeFilterOptions(prev, durationValues, 'hr'));
    setDgCapacityOptions(prev => mergeFilterOptions(prev, dgValues, 'MW'));
    setBessCapacityOptions(prev => mergeFilterOptions(prev, bessValues, 'MWh'));
  }, [greenAnalysisResults?.results]);

  const handleDownload = async () => {
    const params = buildResultsParams();
    if (!params) {
      return;
    }

    const {simulation_id: exportSimulationId, ...exportParams} = params;

    try {
      await getGreenAnalysisExport(exportSimulationId, {
        ...exportParams,
        fileName: `Green_Analysis_Results_${exportSimulationId}.csv`,
      });
    } catch (error: unknown) {
      const statusCode = (error as {data?: {status_code?: string}})?.data?.status_code;
      showToast(statusCode ? getErrorMessage(statusCode as ErrorCodes) : 'Failed to download green analysis results', 'error');
    }
  };

  if (isResultsLoading && !greenAnalysisResults) {
    return <GreenAnalysisResultsGhostLoader />;
  }

  if (detailedScreen) {
    return <DetailedAnalysis />;
  }

  return (
    <div className="main">
      {!isFullScreen && (
        <>
          <div className="flex items-center justify-between mb-5.5">
            <div className="flex items-start gap-2">
              <button
                onClick={() => {
                  dispatch(setShowGreenAnalysisResults(false));
                }}
                className="flex items-center gap-1 text-text-primary! mr-5 mt-3 cursor-pointer">
                <Icon name="arrow-left" size={20} />
              </button>
              <div className="flex flex-col">
                <Text variant="h2" className="text-h3! xl:text-h2!">
                  Simulation Result{' '}
                </Text>
                <Text variant="14R" className="text-text-secondary! my-1.3">
                  Completed {greenAnalysisResults?.total_configs ?? 0} Configurations
                </Text>
              </div>
            </div>
            <div className="bg-primary-tint-2 p-3.5 rounded-md">
              <Text variant="14M" className="text-text-secondary!">
                Project: <span className="text-text-primary!">{projectName}</span>
              </Text>
            </div>
          </div>

          <div className="my-5 flex items-center justify-between rounded-lg border border-border bg-[#F9F9FA] px-6 py-3">
            <div className="flex items-center gap-4 w-[65%]! xl:w-full">
              <Icon name="analysis" className="text-black! size-6.75!" />{' '}
              <Text variant="caption" className="font-normal text-text-secondary!">
                Explore detailed insights of a single configuration through Custom Selection{' '}
              </Text>
            </div>
            <Button
              variant="secondary"
              size="sm"
              rightIcon="chevron-right"
              iconClassName="size-3!"
              className="flex items-center justify-center gap-2 self-center border bg-white px-6 py-3"
              onClick={() => dispatch(setShowDetailedGreenAnalysis(true))}>
              Calculate Detailed Analysis
            </Button>
          </div>

          <SimulationConfigurationSummary />

          <div className="rounded-md border border-l-3 border-primary bg-[#F6FFFE] p-5 mt-5.5">
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

              <div className="mt-2 rounded-md border border-border bg-white p-5">
                <div className="flex items-center gap-2">
                  <Icon name="bulb" className="text-[#168E80]!" size={20} />

                  <Text variant="caption" className="font-InterSemiBold! text-[#0B7D70]!">
                    For Example:
                  </Text>
                </div>

                <Text variant="caption" className="mt-2 font-InterRegular! text-text-primary!">
                  <strong>100 MW </strong> solar tested with <strong>50 MWh battery</strong> at <strong>2-hour and 4-hour</strong> discharge durations results
                  in <strong>25 MW and 12.5 MW</strong>
                  battery power respectively. With <strong>2</strong> generator sizes also being tested, this gives <strong>4</strong> combinations for this
                  solar size alone. If <strong>3</strong> solar sizes are tested (e.g. 50 MW, 100 MW, 150 MW), the total becomes <strong>12</strong>{' '}
                  combinations in this table.
                </Text>
              </div>
            </div>
          </div>
        </>
      )}

      <div ref={tableRef} className={`${isFullScreen ? 'mt-1.5' : 'mt-5.5'}`}>
        {!isFullScreen && (
          <div className="w-full rounded-lg border border-[#D9E1E7] bg-white px-5 py-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-11 shrink-0 items-center">
                  <Icon name="funnel" className="size-6 text-[#475467]!" />
                </div>

                <div className="flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <SearchableMultiSelectInput
                      isFilter
                      className="xl:w-100 xl:min-w-100 xl:max-w-100 flex-none w-75 min-w-75 max-w-75"
                      wrapperClassName={SEARCHABLE_FILTER_WRAPPER_CLASS}
                      values={filter.solar_capacity ?? null}
                      options={solarCapacityOptions}
                      rightIconClassName={'ml-auto'}
                      onChange={items =>
                        updateFilter(
                          'solar_capacity',
                          items.map(item => Number(item.id)),
                        )
                      }
                      placeholder="Solar Capacity (MWp)"
                      placeholderClassName="placeholder:text-text-primary!"
                      showSelectAll={false}
                      showChipsInInput
                      maxVisibleChips={maxVisibleChips}
                      overflowChipLabel={() => '...'}
                      renderOverflowIndicatorAsChip={false}
                      overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                      inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
                      inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                      inlineChipTextVariant="14M"
                    />

                    <MultiSelectInput
                      isFilter
                      className="xl:w-100 xl:min-w-100 xl:max-w-100 flex-none w-75 min-w-75 max-w-75"
                      values={filter.duration_hr ?? null}
                      options={durationOptions}
                      onChange={items =>
                        updateFilter(
                          'duration_hr',
                          items.map(item => Number(item.id)),
                        )
                      }
                      placeholder="Select Duration (Hr)"
                      showChipsInInput
                      maxVisibleChips={maxVisibleChips}
                      overflowChipLabel={() => '...'}
                      renderOverflowIndicatorAsChip={false}
                      overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                      inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
                      inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                      inlineChipTextVariant="14M"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <SearchableMultiSelectInput
                      isFilter
                      className="xl:w-100 xl:min-w-100 xl:max-w-100 flex-none w-75 min-w-75 max-w-75"
                      wrapperClassName={SEARCHABLE_FILTER_WRAPPER_CLASS}
                      values={filter.dg_capacity ?? null}
                      rightIconClassName={'ml-auto'}
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
                      maxVisibleChips={maxVisibleChips}
                      overflowChipLabel={() => '...'}
                      renderOverflowIndicatorAsChip={false}
                      overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                      inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
                      inlineChipTextClassName={FILTER_INLINE_CHIP_TEXT_CLASS}
                      inlineChipTextVariant="14M"
                    />

                    <SearchableMultiSelectInput
                      isFilter
                      className="xl:w-100 xl:min-w-100 xl:max-w-100 flex-none w-75 min-w-75 max-w-75"
                      wrapperClassName={SEARCHABLE_FILTER_WRAPPER_CLASS}
                      values={filter.bess_capacity ?? null}
                      options={bessCapacityOptions}
                      rightIconClassName={'ml-auto'}
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
                      maxVisibleChips={maxVisibleChips}
                      overflowChipLabel={() => '...'}
                      renderOverflowIndicatorAsChip={false}
                      overflowIndicatorClassName="text-[18px]! leading-none! px-0.5 text-[#475467]!"
                      inlineChipClassName={FILTER_INLINE_CHIP_CLASS}
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
                <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
              </div>
            </div>

            <div className="mt-7 ml-7 flex flex-wrap items-center gap-10">
              <Checkbox
                checked={showViableOnly}
                onCheckedChange={setShowViableOnly}
                label={
                  <Text variant="caption" className="font-InterMedium!">
                    <span className="text-[#129383]!">Viable Only</span> (
                    <span className="text-success">Green Energy : {greenAnalysisResults?.min_green_energy}% </span>
                    {greenAnalysisResults?.max_wastage && <span>, </span>}{' '}
                    {greenAnalysisResults?.max_wastage && <span className="text-error">Wastage : {greenAnalysisResults?.max_wastage}%</span>})
                  </Text>
                }
                className="border-[#CBD5E1]!"
                labelClassName="text-[#129383]! font-InterMedium!"
              />
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
          <div className="flex justify-between w-full">
            <div className="flex flex-col">
              <Text variant="h2" className="text-h3! xl:text-h2!">
                Simulation Result{' '}
              </Text>
              <Text variant="14R" className="text-text-secondary! my-1.3">
                Completed {greenAnalysisResults?.total_configs ?? 0} Configurations
              </Text>
            </div>
            <div className="flex items-center gap-5 pt-1">
              <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownload} />
              <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
            </div>
          </div>
        )}

        <div className="mt-4 h-full [&_.data-table-scroll]:pb-4 [&_table]:min-w-640 [&_thead]:bg-[#E9FAF8]! [&_thead]:text-text-primary! [&_th]:py-3! [&_td]:py-4! [&_tbody]:divide-[#DDE4EA]!">
          <DataTable
            columns={columns}
            data={resultRows}
            totalPages={greenAnalysisResults?.total_pages ?? 1}
            currentPage={currentPage}
            totalResult={greenAnalysisResults?.total_configs ?? resultRows.length}
            onPageChange={setCurrentPage}
            stickyHeader
            persistHorizontalScrollKey={simulation_id ? `bess-green-analysis-${simulation_id}` : undefined}
          />
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
  const greenAnalysis = useSelector(greenAnalysisData);
  console.log('proSimulData: ', proSimulData);

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
          (loadConfig?.config?.windows as CustomLoadWindow[] | undefined)?.map((window, index) => ({
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
      {label: 'Year', value: `${proSimulData?.config?.solar?.source?.year ?? 'N/A'}`},
      {label: 'Profile', value: `${proSimulData?.config?.solar?.source?.name ?? 'N/A'}`},
      {label: 'Peak Generation', value: `${proSimulData?.config?.solar?.peak_generation ?? 0} MW`},
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
          value: proSimulData?.config?.dispatch?.is_cycle_charging_enabled ? 'Yes — DG at min load %' : 'No — DG follows load',
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
      // Prefer the Green Analysis config because it is the source of truth for this screen.
      // Fall back to the project snapshot so older flows still render if the analysis payload
      // has not arrived yet.
      const sizingSource = greenAnalysis ?? proSimulData?.config?.green_energy_config;
      const isDGTurnedOn = proSimulData?.config?.dg?.is_included ?? false;
      const DGStats = isDGTurnedOn
        ? [
            {label: 'DG Min', value: `${sizingSource?.dg_min ?? 0} MW`},
            {label: 'DG Max', value: `${sizingSource?.dg_max ?? 0} MW`},
          ]
        : [];
      return [
        {
          label: 'Solar Min',
          value: `${sizingSource?.solar_min ?? 0} MWp`,
        },
        {
          label: 'Solar Max',
          value: `${sizingSource?.solar_max ?? 0} MWp`,
        },
        {label: 'Battery Min', value: `${sizingSource?.bess_min ?? 0} MWh`},
        {label: 'Battery Max', value: `${sizingSource?.bess_max ?? 0} MWh`},
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
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {configSummaryData.map((data, index) => (
            <ConfigurationSummaryCard key={index} {...data} />
          ))}
        </div>
      )}
    </div>
  );
}

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
function ConfigurationSummaryCard(props: Readonly<ConfigSummaryDataType>) {
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
