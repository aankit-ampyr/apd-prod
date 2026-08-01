import {DataTable} from '@/components';
import {useChartsActionV2, useToast} from '@/hooks';
import type {DataTableColumn, MultiYearProjectionResults as ApiMultiYearProjectionResult, SortType, MultiYearProjectionRequest} from '@/interface';
import {getMultiYearResultsExport} from '@/services/api';
import {allProjectsData} from '@/services/redux/selectors';
import {
  generatorData,
  initiateSimulationData,
  multiYearResults,
  multiYearResultsLoading,
  projectSimulationData,
  simulationProject,
} from '@/services/redux/selectors/simulationWizardSelector';
import {multiYearProjectionResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {Alert, Icon, Skeleton, Sort, Text, Tooltip} from '@/ui-kits';
import {cn, downloadElementAsImage, formatNumberWithCommas, getErrorMessage} from '@/utils';
import type {ErrorCodes} from '@/utils';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {SimulationStatusProvider, useSimulationStatus} from '../SimulationStatusContext';
import {createPortal} from 'react-dom';

type YearRange = 20 | 10 | 5;
type SortDirection = 'asc' | 'desc';

type SortField = {
  field: string;
  direction: SortDirection;
};

type ProjectOption = {
  id?: string | number;
  name?: string;
};

type MultiYearProjectionResultWithAliases = ApiMultiYearProjectionResult & {
  solar_mw?: unknown;
  dg_mw?: unknown;
};

interface ProjectionAnalysisRow {
  year: number;
  capacityMWh: number;
  capacityPercent: number;
  deliveryHrs: number;
  loadHrs: number;
  deliveryPercent: number;
  dgHrs: number;
  greenEnergyToLoadMWh: number;
  dgToLoadMWh: number;
  solarHrs: number;
  bessHrs: number;
  curtailedMWh: number;
  totalWastagePercent: number;
  loadWastagePercent: number;
  bessLossMWh: number;
  solarGen: number;
  dgGen: number;
  solarToLoad: number;
  bessToLoad: number;
  dgToLoad: number;
  dgCurtailed: number;
  energyToLoad: number;
  deliveryMetMWh: number;
  chargingLoss: number;
  dischargingLoss: number;
  unmetEnergy: number;
  finalSocPct: number;
  capacity: number;
  loadSolar: number;
  loadCurtailed: number;
  solarCurtailed: number;
}

interface ViewDetailedAnalysisProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
  activeYearRange: YearRange;
  setActiveYearRange: React.Dispatch<React.SetStateAction<YearRange>>;

  sortFields: SortField[];
  setSortFields: React.Dispatch<React.SetStateAction<SortField[]>>;

  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

interface ColumnHeaderProps {
  label: string;
  sort?: SortType;
  onSortChange?: (sort: SortType) => void;
}

type EnergyBalanceTone = 'in' | 'out';

interface EnergySummaryRow {
  item: string;
  formula: string;
  details: ReactNode;
  value: string;
}

const ColumnHeader = ({label, sort, onSortChange}: ColumnHeaderProps) => (
  <div className="flex items-center gap-2">
    <Text variant="caption2" className="font-InterSemiBold! text-text-primary!">
      {label}
    </Text>
    {onSortChange && <Sort sort={sort ?? null} onSortChange={onSortChange} />}
  </div>
);

const YEAR_FILTERS: {label: string; value: YearRange}[] = [
  {label: '20 Years', value: 20},
  {label: '10 Years', value: 10},
  {label: '5 Years', value: 5},
];

const PAGE_SIZE = 100;

const ghostTableRows = Array.from({length: 8}, (_, i) => ({id: i}));
const ghostColumnIds = [
  'col-1',
  'col-2',
  'col-3',
  'col-4',
  'col-5',
  'col-6',
  'col-7',
  'col-8',
  'col-9',
  'col-10',
  'col-11',
  'col-12',
  'col-13',
  'col-14',
  'col-15',
  'col-16',
  'col-17',
  'col-18',
  'col-19',
  'col-20',
  'col-21',
  'col-22',
  'col-23',
  'col-24',
  'col-25',
  'col-26',
  'col-27',
  'col-28',
  'col-29',
  'col-30',
];

const SORTABLE_FIELDS = new Set([
  'year',
  'bess_mwh',
  'capacity_percent',
  'delivery_hours',
  'load_hours',
  'delivery_pct',
  'dg_hours',
  'green_energy_to_load_mwh',
  'dg_to_load_mwh',
  'solar_hrs',
  'bess_hrs',
  'wastage_mw',
  'wastage_pct',
  'load_solar_wastage_pct',
  'bess_loss_mwh',
  'solar_generation',
  'dg_generation',
  'solar_to_load',
  'bess_to_load',
  'dg_to_load',
  'dg_curtailed',
  'energy_to_load',
  'delivery_met_mwh',
  'charging_loss',
  'discharging_loss',
  'final_soc_pct',
  'solar_gen_during_load',
  'solar_curtailed_during_load',
  'solar_curtailed',
]);

const renderCell = (value: number | string) => (
  <Text variant="caption2" className="text-text-primary! font-InterRegular!">
    {value}
  </Text>
);

// const energySummaryGridClass = 'grid-cols-[260px_380px_360px_180px]';
const energySummaryGridClass = 'grid grid-cols-[18%_40%_32%_18%]';
function ProjectionDetailedAnalysisGhostLoader() {
  return (
    <div className="bg-white">
      <div className="flex w-full justify-between mb-4">
        <div className="flex justify-between w-full">
          <div className="flex flex-col">
            <Skeleton animation="wave" variant="rounded" width={190} height={28} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={250} height={18} className="mt-2 rounded-full!" />
          </div>
          <div className="p-3.5 rounded-md bg-primary-tint-2">
            <Skeleton animation="wave" variant="rounded" width={220} height={18} className="rounded-full!" />
            <Skeleton animation="wave" variant="rounded" width={220} height={18} className="mt-2 rounded-full!" />
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton animation="wave" variant="rounded" width={105} height={32} className="rounded-full!" />
          <Skeleton animation="wave" variant="rounded" width={105} height={32} className="rounded-full!" />
          <Skeleton animation="wave" variant="rounded" width={105} height={32} className="rounded-full!" />
        </div>
        <div className="flex items-center gap-5 pt-1">
          <Skeleton animation="wave" variant="circular" width={20} height={20} />
          <Skeleton animation="wave" variant="circular" width={20} height={20} />
        </div>
      </div>

      <div className="[&_table]:min-w-720 [&_thead]:bg-[#E9FAF8]!">
        <div className="overflow-x-auto">
          <table className="min-w-720 w-full">
            <thead className="bg-[#E9FAF8]">
              <tr>
                {ghostColumnIds.map(columnId => (
                  <th key={columnId} className="py-3 px-2">
                    <Skeleton animation="wave" variant="rounded" width={90} height={18} className="rounded-full!" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ghostTableRows.map(row => (
                <tr key={row.id}>
                  {ghostColumnIds.map(columnId => (
                    <td key={`${row.id}-${columnId}`} className="py-4 px-2">
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

export const ViewDetailedAnalysis = (props: ViewDetailedAnalysisProps) => {
  const {setIsStepsHidden, isFullScreen = false, activeYearRange, setActiveYearRange, sortFields, setSortFields, currentPage, setCurrentPage} = props;
  const dispatch = useDispatch();
  const {showToast} = useToast();
  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus();

  const initSimulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);
  const detailedResults = useSelector(multiYearResults);
  const isLoading = useSelector(multiYearResultsLoading);
  const currentSimulationId = proSimulData?.id ?? null;

  const shouldBlock = isAnySimulationRunning && runningSimulationId === currentSimulationId;

  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => (
      <SimulationStatusProvider>
        <ViewDetailedAnalysis
          {...props}
          isFullScreen
          activeYearRange={activeYearRange}
          setActiveYearRange={setActiveYearRange}
          sortFields={sortFields}
          setSortFields={setSortFields}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />{' '}
      </SimulationStatusProvider>
    ),
  });

  const project_id = proSimulData?.project_id;
  const simulation_id = initSimulData?.id ?? proSimulData?.id;
  const projectName = currentProject?.name || allProjects?.find((p: ProjectOption) => p.id === project_id)?.name || '';
  const simulationName = proSimulData?.name || '';

  // Track active modifications (year range filter or sorting)
  // Default year range is 20, so if it's anything else, it's a filter
  const hasActiveModifications = Boolean(activeYearRange !== 20 || sortFields.length > 0);

  useEffect(() => {
    const container = document.querySelector('.screen-wrapper')?.parentElement;
    container?.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!shouldBlock) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [shouldBlock]);

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);
      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeYearRange]);

  useEffect(() => {
    if (!simulation_id) {
      return;
    }

    // Skip API calls in full screen mode only if no modifications are active
    if (isFullScreen && !hasActiveModifications) {
      return;
    }

    const sortParam = sortFields.filter(sort => SORTABLE_FIELDS.has(sort.field)).map(sort => (sort.direction === 'desc' ? `-${sort.field}` : sort.field));

    dispatch(
      multiYearProjectionResultsRequest({
        simulation_id,
        until_year: activeYearRange,
        sort: sortParam.length > 0 ? sortParam : undefined,
      }),
    );
  }, [activeYearRange, dispatch, simulation_id, sortFields, isFullScreen, hasActiveModifications]);

  const handleSortChange = (field: string, direction: 'asc' | 'desc' | null) => {
    setSortFields(direction ? [{field, direction}] : []);
    setCurrentPage(1);
  };

  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    const found = sortFields.find(item => item.field === field);
    return found ? found.direction : null;
  };

  const resultRows = useMemo((): ProjectionAnalysisRow[] => {
    const rows = detailedResults?.results;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((item: ApiMultiYearProjectionResult) => {
      const result = item as MultiYearProjectionResultWithAliases;

      return {
        year: Number(item.year ?? 0),
        capacityMWh: Number(item.bess_mwh ?? 0),
        capacityPercent: Number(item.capacity_percent ?? 0),
        deliveryHrs: Number(item.delivery_hours ?? 0),
        loadHrs: Number(item.load_hours ?? 0),
        deliveryPercent: Number(item.delivery_pct ?? 0),
        dgHrs: Number(item.dg_hours ?? 0),
        greenEnergyToLoadMWh: Number(item.green_energy_to_load_mwh ?? 0),
        dgToLoadMWh: Number(item.dg_to_load_mwh ?? 0),
        solarHrs: Number(item.solar_hrs ?? 0),
        bessHrs: Number(item.bess_hrs ?? 0),
        curtailedMWh: Number(item.wastage_mw ?? 0),
        totalWastagePercent: Number(item.wastage_pct ?? 0),
        loadWastagePercent: Number(item.load_solar_wastage_pct ?? 0),
        bessLossMWh: Number(item.bess_loss_mwh ?? 0),
        solarGen: Number(result.solar_mw ?? item.solar_generation ?? 0),
        dgGen: Number(result.dg_mw ?? item.dg_generation ?? 0),
        solarToLoad: Number(item.solar_to_load ?? 0),
        bessToLoad: Number(item.bess_to_load ?? 0),
        dgToLoad: Number(item.dg_to_load ?? 0),
        dgCurtailed: Number(item.dg_curtailed ?? 0),
        energyToLoad: Number(item.energy_to_load ?? 0),
        deliveryMetMWh: Number(item.delivery_met_mwh ?? 0),
        chargingLoss: Number(item.charging_loss ?? 0),
        dischargingLoss: Number(item.discharging_loss ?? 0),
        unmetEnergy: Number(item.unserved_mwh ?? 0),
        finalSocPct: Number(item.final_soc_pct ?? 0),
        capacity: Number(item.bess_mwh ?? 0),
        loadSolar: Number(item.solar_gen_during_load ?? 0),
        loadCurtailed: Number(item.solar_curtailed_during_load ?? 0),
        solarCurtailed: Number(item.solar_curtailed ?? 0),
      };
    });
  }, [detailedResults?.results]);

  const handleDownload = async () => {
    if (!simulation_id) return;

    const sortParam = sortFields.filter(sort => SORTABLE_FIELDS.has(sort.field)).map(sort => (sort.direction === 'desc' ? `-${sort.field}` : sort.field));

    try {
      await getMultiYearResultsExport(simulation_id, {
        until_year: activeYearRange,
        sort: sortParam.length > 0 ? sortParam : undefined,
        fileName: `Multi_Year_Projection_${simulation_id}.csv`,
      });
    } catch (error: unknown) {
      const status_code = (error as {data?: {status_code?: string}})?.data?.status_code;
      showToast(status_code ? getErrorMessage(status_code as ErrorCodes) : 'Failed to download multi-year results', 'error');
    }
  };

  const columns: DataTableColumn<ProjectionAnalysisRow>[] = [
    {
      name: 'year',
      title: <ColumnHeader label="Year" sort={getSortDirection('year')} onSortChange={direction => handleSortChange('year', direction)} />,
      width: {minWidth: '80px'},
      align: 'center',
      render: row => renderCell(row.year),
    },
    {
      name: 'capacityMWh',
      title: <ColumnHeader label="Capacity (MWh)" sort={getSortDirection('bess_mwh')} onSortChange={direction => handleSortChange('bess_mwh', direction)} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.capacityMWh),
    },
    {
      name: 'capacityPercent',
      title: (
        <ColumnHeader
          label="Capacity %"
          sort={getSortDirection('capacity_percent')}
          onSortChange={direction => handleSortChange('capacity_percent', direction)}
        />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.capacityPercent),
    },
    {
      name: 'deliveryHrs',
      title: (
        <ColumnHeader
          label="Delivery Hrs"
          sort={getSortDirection('delivery_hours')}
          onSortChange={direction => handleSortChange('delivery_hours', direction)}
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.deliveryHrs),
    },
    {
      name: 'loadHrs',
      title: <ColumnHeader label="Load Hrs" sort={getSortDirection('load_hours')} onSortChange={direction => handleSortChange('load_hours', direction)} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.loadHrs),
    },
    {
      name: 'deliveryPercent',
      title: (
        <ColumnHeader label="Delivery %" sort={getSortDirection('delivery_pct')} onSortChange={direction => handleSortChange('delivery_pct', direction)} />
      ),
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.deliveryPercent),
    },
    {
      name: 'dgHrs',
      title: <ColumnHeader label="DG Hrs" sort={getSortDirection('dg_hours')} onSortChange={direction => handleSortChange('dg_hours', direction)} />,
      width: {minWidth: '100px'},
      align: 'center',
      render: row => renderCell(row.dgHrs),
    },
    {
      name: 'greenEnergyToLoadMWh',
      title: (
        <ColumnHeader
          label="Green Energy To Load (MWh)"
          sort={getSortDirection('green_energy_to_load_mwh')}
          onSortChange={direction => handleSortChange('green_energy_to_load_mwh', direction)}
        />
      ),
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.greenEnergyToLoadMWh),
    },
    {
      name: 'solarHrs',
      title: <ColumnHeader label="Solar Hrs" sort={getSortDirection('solar_hrs')} onSortChange={direction => handleSortChange('solar_hrs', direction)} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.solarHrs),
    },
    {
      name: 'bessHrs',
      title: <ColumnHeader label="BESS Hrs" sort={getSortDirection('bess_hrs')} onSortChange={direction => handleSortChange('bess_hrs', direction)} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.bessHrs),
    },
    {
      name: 'curtailedMWh',
      title: (
        <ColumnHeader label="Curtailed (MWh)" sort={getSortDirection('wastage_mw')} onSortChange={direction => handleSortChange('wastage_mw', direction)} />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.curtailedMWh),
    },
    {
      name: 'totalWastagePercent',
      title: (
        <ColumnHeader label="Total Wastage %" sort={getSortDirection('wastage_pct')} onSortChange={direction => handleSortChange('wastage_pct', direction)} />
      ),
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.totalWastagePercent),
    },
    {
      name: 'loadWastagePercent',
      title: (
        <ColumnHeader
          label="Load Wastage %"
          sort={getSortDirection('load_solar_wastage_pct')}
          onSortChange={direction => handleSortChange('load_solar_wastage_pct', direction)}
        />
      ),

      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.loadWastagePercent),
    },
    {
      name: 'bessLossMWh',
      title: (
        <ColumnHeader
          label="BESS Loss (MWh)"
          sort={getSortDirection('bess_loss_mwh')}
          onSortChange={direction => handleSortChange('bess_loss_mwh', direction)}
        />
      ),
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.bessLossMWh),
    },
    {
      name: 'solarGen',
      title: (
        <ColumnHeader
          label="Solar Gen"
          sort={getSortDirection('solar_generation')}
          onSortChange={direction => handleSortChange('solar_generation', direction)}
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.solarGen),
    },
    {
      name: 'dgGen',
      title: <ColumnHeader label="DG Gen" sort={getSortDirection('dg_generation')} onSortChange={direction => handleSortChange('dg_generation', direction)} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.dgGen),
    },
    {
      name: 'solarToLoad',
      title: (
        <ColumnHeader label="Solar To Load" sort={getSortDirection('solar_to_load')} onSortChange={direction => handleSortChange('solar_to_load', direction)} />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.solarToLoad),
    },
    {
      name: 'bessToLoad',
      title: (
        <ColumnHeader label="BESS To Load" sort={getSortDirection('bess_to_load')} onSortChange={direction => handleSortChange('bess_to_load', direction)} />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.bessToLoad),
    },
    {
      name: 'dgToLoad',
      title: <ColumnHeader label="DG To Load" sort={getSortDirection('dg_to_load')} onSortChange={direction => handleSortChange('dg_to_load', direction)} />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.dgToLoad),
    },
    {
      name: 'dgCurtailed',
      title: (
        <ColumnHeader label="DG Curtailed" sort={getSortDirection('dg_curtailed')} onSortChange={direction => handleSortChange('dg_curtailed', direction)} />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.dgCurtailed),
    },
    {
      name: 'energyToLoad',
      title: (
        <ColumnHeader
          label="Energy To Load"
          sort={getSortDirection('energy_to_load')}
          onSortChange={direction => handleSortChange('energy_to_load', direction)}
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.energyToLoad),
    },
    {
      name: 'deliveryMetMWh',
      title: (
        <ColumnHeader
          label="Delivery Met MWh"
          sort={getSortDirection('delivery_met_mwh')}
          onSortChange={direction => handleSortChange('delivery_met_mwh', direction)}
        />
      ),
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.deliveryMetMWh),
    },
    {
      name: 'chargingLoss',
      title: (
        <ColumnHeader label="Charging Loss" sort={getSortDirection('charging_loss')} onSortChange={direction => handleSortChange('charging_loss', direction)} />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.chargingLoss),
    },
    {
      name: 'dischargingLoss',
      title: (
        <ColumnHeader
          label="Discharging Loss"
          sort={getSortDirection('discharging_loss')}
          onSortChange={direction => handleSortChange('discharging_loss', direction)}
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.dischargingLoss),
    },
    {
      name: 'unmetEnergy',
      title: (
        <ColumnHeader
          label="Unmet Energy (MWh)"
          sort={getSortDirection('unserved_mwh')}
          onSortChange={direction => handleSortChange('unserved_mwh', direction)}
        />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.unmetEnergy),
    },
    {
      name: 'finalSocPct',
      title: (
        <ColumnHeader label="Final SOC Pct" sort={getSortDirection('final_soc_pct')} onSortChange={direction => handleSortChange('final_soc_pct', direction)} />
      ),
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.finalSocPct),
    },
    {
      name: 'loadSolar',
      title: (
        <ColumnHeader
          label="Load Solar"
          sort={getSortDirection('solar_gen_during_load')}
          onSortChange={direction => handleSortChange('solar_gen_during_load', direction)}
        />
      ),
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.loadSolar),
    },
    {
      name: 'loadCurtailed',
      title: (
        <ColumnHeader
          label="Load Curtailed"
          sort={getSortDirection('solar_curtailed_during_load')}
          onSortChange={direction => handleSortChange('solar_curtailed_during_load', direction)}
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.loadCurtailed),
    },
    {
      name: 'solarCurtailed',
      title: (
        <ColumnHeader
          label="Solar Curtailed"
          sort={getSortDirection('solar_curtailed')}
          onSortChange={direction => handleSortChange('solar_curtailed', direction)}
        />
      ),
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.solarCurtailed),
    },
  ];

  if (isLoading && resultRows.length === 0) {
    return <ProjectionDetailedAnalysisGhostLoader />;
  }

  return (
    <div ref={tableRef} className="bg-white">
      {shouldBlock && (
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
      <div className={`flex w-full ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="flex justify-between w-full">
            <div className="flex flex-col">
              <Text variant="h3">Projection in Years</Text>
              <Text variant="14R" className="text-text-secondary! my-1.5">
                Delivery and green energy breakdown by year
              </Text>
            </div>
            <div className="bg-primary-tint-2 p-3.5 rounded-md">
              <Text variant="14M" className="text-text-secondary!">
                Project: <span className="text-text-primary!">{projectName}</span>
              </Text>
              <Text variant="14M" className="text-text-secondary! mt-2!">
                Simulation: <span className="text-text-primary!">{simulationName}</span>
              </Text>
            </div>
          </div>
        )}
      </div>

      <div className={`flex w-full items-center ${isFullScreen ? 'justify-end' : 'justify-between'} mb-4`}>
        {!isFullScreen && (
          <div className="flex flex-nowrap items-center gap-3">
            {YEAR_FILTERS.map(filter => {
              const isActive = activeYearRange === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setActiveYearRange(filter.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'h-8 min-w-27 rounded-full border px-6 text-center transition-colors cursor-pointer',
                    isActive ? 'border-primary bg-primary text-white' : 'border-border bg-white font-InterRegular! text-text-secondary hover:border-primary',
                  )}>
                  <Text
                    variant="caption"
                    className={cn(
                      'font-InterRegular whitespace-nowrap',
                      isActive ? 'text-white! font-InterSemiBold!' : 'text-text-secondary! font-InterRegular!',
                    )}>
                    {filter.label}
                  </Text>
                </button>
              );
            })}
          </div>
        )}
        <div className={`flex  ${isFullScreen ? 'justify-between' : 'justify-end'} gap-5 pt-1 w-full`}>
          {isFullScreen && (
            <div className="flex flex-col">
              <Text variant="h3">Projection in Years</Text>
              <Text variant="14R" className="text-text-secondary! my-1.5">
                Delivery and green energy breakdown by year
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

      <div className="[&_.data-table-scroll]:pb-4 [&_table]:min-w-720 [&_thead]:bg-[#E9FAF8]! [&_thead]:text-text-primary! [&_th]:py-3! [&_td]:py-4! [&_tbody]:divide-[#DDE4EA]!">
        <DataTable
          data={resultRows}
          columns={columns}
          totalPages={1}
          currentPage={currentPage}
          totalResult={resultRows.length}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          stickyHeader
          tableHeightWhenScrollable={700}
          persistHorizontalScrollKey={simulation_id ? `bess-projection-detailed-${simulation_id}` : undefined}
          showFooter={false}
        />
      </div>
      {!isFullScreen && <EnergyBalanceSummary detailedResults={detailedResults} setIsStepsHidden={setIsStepsHidden} />}
      {shouldBlock && createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
    </div>
  );
};

interface EnergyBalanceSummaryProps {
  detailedResults: MultiYearProjectionRequest['response']['data'] | null;
  setIsStepsHidden?: (hidden: boolean) => void;
  isFullScreen?: boolean;
}
function EnergyBalanceSummary({detailedResults, setIsStepsHidden, isFullScreen = false}: Readonly<EnergyBalanceSummaryProps>) {
  const dgData = useSelector(generatorData);

  const hasGenerator = dgData?.is_included;

  const ENERGY_IN_SUMMARY_ROWS: EnergySummaryRow[] = [
    {
      item: 'Solar Generated',
      formula: '_solar_gen',
      details: (
        <>
          {formatNumberWithCommas(Number(detailedResults?.summary?.energy_in?.solar_avg))} MWh/year avg{' '}
          <InfoTooltip message="Avg = Total_solar_generated / Number of Years simulated" />
        </>
      ),
      value: `${formatNumberWithCommas(Number(detailedResults?.summary?.energy_in?.solar_total))}`,
    },
    {
      item: 'DG Generated',
      formula: '_dg_gen',
      details: (
        <>
          {hasGenerator ? (
            <>
              {formatNumberWithCommas(Number(detailedResults?.summary?.energy_in?.dg_avg))} MWh/year avg{' '}
              <InfoTooltip message="Avg = Total_DG_generated / Number of Years simulated" />
            </>
          ) : (
            <span className="text-text-primary!">N/A</span>
          )}
        </>
      ),
      value: `${formatNumberWithCommas(Number(detailedResults?.summary?.energy_in?.dg_total))}`,
    },
    {
      item: 'Initial BESS',
      formula: 'Year 1 _capacity x initial_soc% / 100',
      details: `${detailedResults?.summary?.energy_in?.initial_capacity} MWh x ${detailedResults?.summary?.energy_in?.initial_bess_soc}% SOC`,
      value: `${detailedResults?.summary?.energy_in?.initial_bess_energy}`,
    },
  ];

  const ENERGY_OUT_SUMMARY_ROWS: EnergySummaryRow[] = [
    {
      item: 'Energy to Load',
      formula: '_solar_to_load + _bess_to_load + _dg_to_load',
      details: (
        <>
          <span className="text-text-secondary!">Energy: </span>
          {formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.total_solar_to_load))} +{' '}
          {formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.total_bess_to_load))} +{' '}
          {formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.total_dg_to_load))}
        </>
      ),
      value: `${formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.total_energy_to_load))}`,
    },
    {
      item: 'Solar Curtailed',
      formula: '_solar_curtailed',
      details: (
        <>
          {detailedResults?.summary?.energy_out?.solar_curtailed_pct}% of solar{' '}
          <InfoTooltip message={`Solar Curtailed% = Solar Curtailed ÷ Solar Generated_${detailedResults?.summary?.no_of_years}_years × 100`} />
        </>
      ),
      value: `${formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.solar_curtailed_mwh))}`,
    },
    {
      item: 'DG Curtailed',
      formula: '_dg_curtailed',
      details: (
        <>
          {hasGenerator ? (
            <>
              {detailedResults?.summary?.energy_out?.dg_curtailed_pct}% of DG{' '}
              <InfoTooltip message={`DG Curtailed% = DG Curtailed ÷ DG Generated_${detailedResults?.summary?.no_of_years}_years × 100`} />
            </>
          ) : (
            <span className="text-text-primary!">N/A</span>
          )}
        </>
      ),
      value: `${formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.dg_curtailed_mwh))}`,
    },
    {
      item: 'BESS Losses',
      formula: '_charging_loss + _discharging_loss + _degradation_loss',
      details: (
        <>
          <span className="text-text-secondary!">Loss: </span>
          {detailedResults?.summary?.energy_out?.charging_loss_mwh} + {detailedResults?.summary?.energy_out?.discharging_loss_mwh} +{' '}
          {detailedResults?.summary?.energy_out?.degradation_loss_mwh}
        </>
      ),
      value: `${detailedResults?.summary?.energy_out?.cycle_loss}`,
    },
    {
      item: 'Final BESS',
      formula: `Year ${detailedResults?.summary?.no_of_years} _capacity x Year ${detailedResults?.summary?.no_of_years} _final_soc_pct / 100`,
      details: `${detailedResults?.summary?.energy_out?.total_bess_energy}  MWh x ${detailedResults?.summary?.energy_out?.final_bess_soc}% SOC (Year ${detailedResults?.summary?.no_of_years} end)`,
      value: `${detailedResults?.summary?.energy_out?.final_bess_energy}`,
    },
  ];

  const {
    chartRef: energySummaryRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <EnergyBalanceSummary detailedResults={detailedResults} setIsStepsHidden={setIsStepsHidden} isFullScreen />,
  });

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);

      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  const handleDownloadSummary = useCallback(async () => {
    await downloadElementAsImage(energySummaryRef.current, 'energy_summary.png');
  }, []);

  const handleMaximize = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    onMaximize();
  };

  return (
    <div className="mt-8 bg-white" ref={energySummaryRef}>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex flex-col">
          <Text variant="h3" className="text-secondary! font-InterBold! leading-tight!">
            {detailedResults?.summary?.no_of_years}-Year Energy Summary
          </Text>
          <Text variant="14R" className="mt-1.5 text-text-secondary! font-InterRegular!">
            Sources, flows and validation across simulation years
          </Text>
        </div>
        <div className="flex items-center gap-5 no-export">
          <Icon name="download" className="size-5 cursor-pointer text-[#6BCDC6]!" onClick={handleDownloadSummary} />
          {isFullScreen ? (
            <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
          ) : (
            <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleMaximize} />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#DDE4EA] bg-white">
        <EnergyBalanceSection
          tone="in"
          title="Energy In"
          subtitle="Inputs to the system"
          headerClassName="bg-[#FFFDEE]"
          rows={ENERGY_IN_SUMMARY_ROWS}
          total={
            <EnergyTotalBand tone="in">
              <Text variant="caption" className="mb-5 text-text-primary! font-InterSemiBold!">
                Total Energy IN
              </Text>
              <div className="flex flex-wrap items-center gap-4">
                <FormulaToken tone="in" toneClassName="bg-white!">
                  _solar_gen
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="in" toneClassName="bg-white!">
                  _dg_gen
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="in" toneClassName="bg-white!">
                  initial_bess
                </FormulaToken>
                <MathSymbol>=</MathSymbol>
                <Text variant="caption" className="text-text-primary! font-InterSemiBold!">
                  {formatNumberWithCommas(Number(detailedResults?.summary?.energy_in?.total_energy))} <span className="text-text-secondary!">MWh</span>
                </Text>
              </div>
            </EnergyTotalBand>
          }
        />

        <EnergyBalanceSection
          tone="out"
          title="Energy Out"
          subtitle="Output from the system"
          headerClassName="bg-[#F0FFF8]"
          rows={ENERGY_OUT_SUMMARY_ROWS}
          total={
            <EnergyTotalBand tone="out">
              <Text variant="18SB" className="mb-5 text-text-primary!">
                Total Energy OUT
              </Text>
              <div className="flex flex-wrap items-center gap-4">
                <FormulaToken tone="out" toneClassName="bg-white! border-[#C9CCD6]!">
                  energy_to_load
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="out" toneClassName="bg-white! border-[#C9CCD6]!">
                  solar_curtailed
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="out" toneClassName="bg-white! border-[#C9CCD6]!">
                  dg_curtailed
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="out" toneClassName="bg-white! border-[#C9CCD6]!">
                  bess_losses
                </FormulaToken>
                <MathSymbol>+</MathSymbol>
                <FormulaToken tone="out" toneClassName="bg-white! border-[#C9CCD6]!">
                  final_bess
                </FormulaToken>
                <MathSymbol>=</MathSymbol>
                <Text variant="caption" className="text-text-primary! font-InterSemiBold!">
                  {formatNumberWithCommas(Number(detailedResults?.summary?.energy_out?.total_energy))} <span className="text-text-secondary!">MWh</span>
                </Text>
              </div>
            </EnergyTotalBand>
          }
        />

        <div className="border-t border-[#DDE4EA] px-6 py-8 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-4">
            <div className="rounded-md border border-[#C9CCD6] bg-[#F2F3F5] px-7 py-3">
              <Text variant="caption" className="text-text-secondary! font-InterSemiBold!">
                Balance
              </Text>
            </div>
            <MathSymbol>=</MathSymbol>
            <Text variant="caption" className="text-[#D67200]! font-InterSemiBold!">
              Energy IN
            </Text>
            <MathSymbol>-</MathSymbol>
            <Text variant="caption" className="text-[#106F38]! font-InterSemiBold!">
              Energy OUT
            </Text>
            <MathSymbol>=</MathSymbol>
            <Text variant="caption" className="text-text-primary! font-InterSemiBold!">
              {detailedResults?.summary?.balance} <span className="text-text-secondary!">MWh</span>
            </Text>
          </div>
          <Text variant="small" className="mt-4 text-text-secondary!">
            (Difference should be approx. &lt; 1MWh if balanced)
          </Text>
        </div>
      </div>
    </div>
  );
}

function EnergyBalanceSection({
  tone,
  title,
  subtitle,
  headerClassName,
  rows,
  total,
}: Readonly<{
  tone: EnergyBalanceTone;
  title: string;
  subtitle: string;
  headerClassName: string;
  rows: EnergySummaryRow[];
  total: ReactNode;
}>) {
  return (
    <section className="border-b border-[#DDE4EA] last:border-b-0">
      <div className="bg-[#FAFBFC] px-19 py-6">
        <Text variant="largeBody" className="text-secondary! font-InterBold!">
          {title}
        </Text>
        <Text variant="small" className="mt-1 text-text-secondary! font-InterRegular!">
          {subtitle}
        </Text>
      </div>

      <div className="overflow-x-auto thin-scrollbar">
        <div className="min-w-295! w-full!">
          <div className={`grid ${energySummaryGridClass} ${headerClassName} border-y border-[#DDE4EA] px-19 py-2.5`}>
            <EnergyHeaderCell>ITEM</EnergyHeaderCell>
            <EnergyHeaderCell>FORMULA</EnergyHeaderCell>
            <EnergyHeaderCell>DETAILS</EnergyHeaderCell>
            <EnergyHeaderCell>VALUE (MWh)</EnergyHeaderCell>
          </div>

          <div className="divide-y divide-[#DDE4EA]">
            {rows.map(row => (
              <div key={`${tone}-${row.item}`} className={`grid ${energySummaryGridClass} items-center px-19 py-4.5`}>
                <Text variant="caption" className="text-text-primary! font-InterMedium!">
                  {row.item}
                </Text>
                <div>
                  <FormulaToken tone={tone}>{row.formula}</FormulaToken>
                </div>
                <Text variant="caption" className="text-text-primary! font-InterMedium!">
                  {row.details}
                </Text>
                <Text variant="caption" className="text-text-primary! font-InterMedium!">
                  {row.value}
                </Text>
              </div>
            ))}
          </div>

          {total}
        </div>
      </div>
    </section>
  );
}

function EnergyTotalBand({tone, children}: Readonly<{tone: EnergyBalanceTone; children: ReactNode}>) {
  return <div className={`${tone === 'in' ? 'bg-[#FFFFE8]' : 'bg-[#F0FFF8]'} border-t border-[#DDE4EA] px-19 py-6`}>{children}</div>;
}

function FormulaToken({tone, toneClassName, children}: Readonly<{tone: EnergyBalanceTone; toneClassName?: string; children: ReactNode}>) {
  const toneClasses = tone === 'in' ? 'border-[#E1C38E] bg-[#FDFFE4] text-[#D67200]!' : 'border-[#1CBD60] bg-[#F2FFF7] text-[#106F38]!';

  return (
    <span
      className={`inline-flex whitespace-nowrap! w-fit! min-h-10 items-center rounded-md border px-3 text-[14px]! font-InterMedium! ${toneClasses} ${toneClassName}`}>
      {children}
    </span>
  );
}

function EnergyHeaderCell({children}: Readonly<{children: ReactNode}>) {
  return (
    <Text variant="small" className="text-text-secondary! font-InterMedium!">
      {children}
    </Text>
  );
}

function MathSymbol({children}: Readonly<{children: ReactNode}>) {
  return (
    <Text variant="18SB" className="text-text-primary!">
      {children}
    </Text>
  );
}

function InfoTooltip({message}: Readonly<{message: string}>) {
  return (
    <span className="relative group ml-1 inline-flex align-middle">
      <Icon name="circle-info" className="size-4.5 text-text-secondary!" />
      <Tooltip
        message={message}
        position="top"
        portal
        className="z-999 border border-[#CAE2F0]! bg-[#F0FAFF]! whitespace-nowrap!"
        textClassName="font-InterSemiBold! text-text-primary!"
      />
    </span>
  );
}
