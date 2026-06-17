import {DataTable} from '@/components';
import {useChartsActionV2, useToast} from '@/hooks';
import type {DataTableColumn, MultiYearProjectionResults as ApiMultiYearProjectionResult, SortType} from '@/interface';
import {getMultiYearResultsExport} from '@/services/api';
import {allProjectsData} from '@/services/redux/selectors';
import {initiateSimulationData, multiYearResults, multiYearResultsLoading, projectSimulationData, simulationProject} from '@/services/redux/selectors/simulationWizardSelector';
import {multiYearProjectionResultsRequest} from '@/services/redux/slice/simulationWizardSlice';
import {Icon, Skeleton, Sort, Text} from '@/ui-kits';
import {cn, getErrorMessage} from '@/utils';
import type {ErrorCodes} from '@/utils';
import {useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

type YearRange = 20 | 10 | 5;
type SortDirection = 'asc' | 'desc';

type SortField = {
  field: string;
  direction: SortDirection;
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
  finalSocPct: number;
  capacity: number;
  loadSolar: number;
  loadCurtailed: number;
  solarCurtailed: number;
}

interface ViewDetailedAnalysisProps {
  readonly setIsStepsHidden?: (hidden: boolean) => void;
  readonly isFullScreen?: boolean;
}

interface ColumnHeaderProps {
  label: string;
  sort?: SortType;
  onSortChange?: (sort: SortType) => void;
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
  const {setIsStepsHidden, isFullScreen = false} = props;
  const dispatch = useDispatch();
  const {showToast} = useToast();

  const initSimulData = useSelector(initiateSimulationData);
  const proSimulData = useSelector(projectSimulationData);
  const currentProject = useSelector(simulationProject);
  const allProjects = useSelector(allProjectsData);
  const detailedResults = useSelector(multiYearResults);
  const isLoading = useSelector(multiYearResultsLoading);

  const [activeYearRange, setActiveYearRange] = useState<YearRange>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortFields, setSortFields] = useState<SortField[]>([]);

  const {
    chartRef: tableRef,
    onMaximize,
    onMinimize,
  } = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <ViewDetailedAnalysis {...props} isFullScreen />,
  });

  const project_id = proSimulData?.project_id;
  const simulation_id = initSimulData?.id ?? proSimulData?.id;
  const projectName = currentProject?.name || allProjects?.find((p:any) => p.id === project_id)?.name || '';
  const simulationName = proSimulData?.name || '';

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

    const sortParam = sortFields.filter(sort => SORTABLE_FIELDS.has(sort.field)).map(sort => (sort.direction === 'desc' ? `-${sort.field}` : sort.field));

    dispatch(
      multiYearProjectionResultsRequest({
        simulation_id,
        until_year: activeYearRange,
        sort: sortParam.length > 0 ? sortParam : undefined,
      }),
    );
  }, [activeYearRange, dispatch, simulation_id, sortFields]);

  const handleSortChange = (field: string) => {
    setSortFields(prev => {
      const index = prev.findIndex(item => item.field === field);

      if (index === -1) {
        return [{field, direction: 'asc'}];
      }

      const current = prev[index];
      if (current?.direction === 'asc') {
        return [{field, direction: 'desc'}];
      }

      return [];
    });

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

    return rows.map((item: ApiMultiYearProjectionResult) => ({
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
      solarGen: Number((item as any).solar_mw ?? item.solar_generation ?? 0),
      dgGen: Number((item as any).dg_mw ?? item.dg_generation ?? 0),
      solarToLoad: Number(item.solar_to_load ?? 0),
      bessToLoad: Number(item.bess_to_load ?? 0),
      dgToLoad: Number(item.dg_to_load ?? 0),
      dgCurtailed: Number(item.dg_curtailed ?? 0),
      energyToLoad: Number(item.energy_to_load ?? 0),
      deliveryMetMWh: Number(item.delivery_met_mwh ?? 0),
      chargingLoss: Number(item.charging_loss ?? 0),
      dischargingLoss: Number(item.discharging_loss ?? 0),
      finalSocPct: Number(item.final_soc_pct ?? 0),
      capacity: Number(item.bess_mwh ?? 0),
      loadSolar: Number(item.solar_gen_during_load ?? 0),
      loadCurtailed: Number(item.solar_curtailed_during_load ?? 0),
      solarCurtailed: Number(item.solar_curtailed ?? 0),
    }));
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
      title: <ColumnHeader label="Year" sort={getSortDirection('year')} onSortChange={() => handleSortChange('year')} />,
      width: {minWidth: '80px'},
      align: 'center',
      render: row => renderCell(row.year),
    },
    {
      name: 'capacityMWh',
      title: <ColumnHeader label="Capacity (MWh)" sort={getSortDirection('bess_mwh')} onSortChange={() => handleSortChange('bess_mwh')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.capacityMWh),
    },
    {
      name: 'capacityPercent',
      title: <ColumnHeader label="Capacity %" sort={getSortDirection('capacity_percent')} onSortChange={() => handleSortChange('capacity_percent')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.capacityPercent),
    },
    {
      name: 'deliveryHrs',
      title: <ColumnHeader label="Delivery Hrs" sort={getSortDirection('delivery_hours')} onSortChange={() => handleSortChange('delivery_hours')} />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.deliveryHrs),
    },
    {
      name: 'loadHrs',
      title: <ColumnHeader label="Load Hrs" sort={getSortDirection('load_hours')} onSortChange={() => handleSortChange('load_hours')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.loadHrs),
    },
    {
      name: 'deliveryPercent',
      title: <ColumnHeader label="Delivery %" sort={getSortDirection('delivery_pct')} onSortChange={() => handleSortChange('delivery_pct')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.deliveryPercent),
    },
    {
      name: 'dgHrs',
      title: <ColumnHeader label="DG Hrs" sort={getSortDirection('dg_hours')} onSortChange={() => handleSortChange('dg_hours')} />,
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
          onSortChange={() => handleSortChange('green_energy_to_load_mwh')}
        />
      ),
      width: {minWidth: '200px'},
      align: 'center',
      render: row => renderCell(row.greenEnergyToLoadMWh),
    },
    {
      name: 'solarHrs',
      title: <ColumnHeader label="Solar Hrs" sort={getSortDirection('solar_hrs')} onSortChange={() => handleSortChange('solar_hrs')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.solarHrs),
    },
    {
      name: 'bessHrs',
      title: <ColumnHeader label="BESS Hrs" sort={getSortDirection('bess_hrs')} onSortChange={() => handleSortChange('bess_hrs')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.bessHrs),
    },
    {
      name: 'curtailedMWh',
      title: <ColumnHeader label="Curtailed (MWh)" sort={getSortDirection('wastage_mw')} onSortChange={() => handleSortChange('wastage_mw')} />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.curtailedMWh),
    },
    {
      name: 'totalWastagePercent',
      title: <ColumnHeader label="Total Wastage %" sort={getSortDirection('wastage_pct')} onSortChange={() => handleSortChange('wastage_pct')} />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.totalWastagePercent),
    },
    {
      name: 'loadWastagePercent',
      title: <ColumnHeader label="Load Wastage %" sort={getSortDirection('load_solar_wastage_pct')} onSortChange={() => handleSortChange('load_solar_wastage_pct')} />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.loadWastagePercent),
    },
    {
      name: 'bessLossMWh',
      title: <ColumnHeader label="BESS Loss (MWh)" sort={getSortDirection('bess_loss_mwh')} onSortChange={() => handleSortChange('bess_loss_mwh')} />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.bessLossMWh),
    },
    {
      name: 'solarGen',
      title: <ColumnHeader label="Solar Gen" sort={getSortDirection('solar_generation')} onSortChange={() => handleSortChange('solar_generation')} />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.solarGen),
    },
    {
      name: 'dgGen',
      title: <ColumnHeader label="DG Gen" sort={getSortDirection('dg_generation')} onSortChange={() => handleSortChange('dg_generation')} />,
      width: {minWidth: '110px'},
      align: 'center',
      render: row => renderCell(row.dgGen),
    },
    {
      name: 'solarToLoad',
      title: <ColumnHeader label="Solar To Load" sort={getSortDirection('solar_to_load')} onSortChange={() => handleSortChange('solar_to_load')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.solarToLoad),
    },
    {
      name: 'bessToLoad',
      title: <ColumnHeader label="BESS To Load" sort={getSortDirection('bess_to_load')} onSortChange={() => handleSortChange('bess_to_load')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.bessToLoad),
    },
    {
      name: 'dgToLoad',
      title: <ColumnHeader label="DG To Load" sort={getSortDirection('dg_to_load')} onSortChange={() => handleSortChange('dg_to_load')} />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.dgToLoad),
    },
    {
      name: 'dgCurtailed',
      title: <ColumnHeader label="DG Curtailed" sort={getSortDirection('dg_curtailed')} onSortChange={() => handleSortChange('dg_curtailed')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.dgCurtailed),
    },
    {
      name: 'energyToLoad',
      title: <ColumnHeader label="Energy To Load" sort={getSortDirection('energy_to_load')} onSortChange={() => handleSortChange('energy_to_load')} />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.energyToLoad),
    },
    {
      name: 'deliveryMetMWh',
      title: <ColumnHeader label="Delivery Met MWh" sort={getSortDirection('delivery_met_mwh')} onSortChange={() => handleSortChange('delivery_met_mwh')} />,
      width: {minWidth: '150px'},
      align: 'center',
      render: row => renderCell(row.deliveryMetMWh),
    },
    {
      name: 'chargingLoss',
      title: <ColumnHeader label="Charging Loss" sort={getSortDirection('charging_loss')} onSortChange={() => handleSortChange('charging_loss')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.chargingLoss),
    },
    {
      name: 'dischargingLoss',
      title: <ColumnHeader label="Discharging Loss" sort={getSortDirection('discharging_loss')} onSortChange={() => handleSortChange('discharging_loss')} />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.dischargingLoss),
    },
    {
      name: 'finalSocPct',
      title: <ColumnHeader label="Final SOC Pct" sort={getSortDirection('final_soc_pct')} onSortChange={() => handleSortChange('final_soc_pct')} />,
      width: {minWidth: '130px'},
      align: 'center',
      render: row => renderCell(row.finalSocPct),
    },
    {
      name: 'loadSolar',
      title: <ColumnHeader label="Load Solar" sort={getSortDirection('solar_gen_during_load')} onSortChange={() => handleSortChange('solar_gen_during_load')} />,
      width: {minWidth: '120px'},
      align: 'center',
      render: row => renderCell(row.loadSolar),
    },
    {
      name: 'loadCurtailed',
      title: <ColumnHeader label="Load Curtailed" sort={getSortDirection('solar_curtailed_during_load')} onSortChange={() => handleSortChange('solar_curtailed_during_load')} />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.loadCurtailed),
    },
    {
      name: 'solarCurtailed',
      title: <ColumnHeader label="Solar Curtailed" sort={getSortDirection('solar_curtailed')} onSortChange={() => handleSortChange('solar_curtailed')} />,
      width: {minWidth: '140px'},
      align: 'center',
      render: row => renderCell(row.solarCurtailed),
    },
  ];

  if (isLoading) {
    return <ProjectionDetailedAnalysisGhostLoader />;
  }

  return (
    <div ref={tableRef} className="bg-white">
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
          <div className="flex flex-wrap items-center gap-3">
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
                  <Text variant="caption" className={cn('font-InterRegular', isActive ? 'text-white! font-InterSemiBold!' : 'text-text-secondary! font-InterRegular!')}>
                    {filter.label}
                  </Text>
                </button>
              );
            })}
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
          showFooter = {false}
        />
      </div>
    </div>
  );
};
