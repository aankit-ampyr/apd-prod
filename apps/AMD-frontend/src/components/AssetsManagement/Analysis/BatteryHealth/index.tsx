import {useEffect, useRef} from 'react';
import {AssetAnalysisTabProps} from '../types';
import {AnalyticsGroupedTable, Section} from '../../../common';
import {GroupedKpiObj, GroupedKpisSection} from './GroupedKpisSection';
import type {AssetBatteryHealthAnalytics, GroupedTableBaseColumn, GroupedTableBaseSubColumn} from '@/interface';
import {
  assetBatteryHealthCycleComparisonLoading,
  assetBatteryHealthCycleComparisonResult,
  assetBatteryHealthSummaryLoading,
  assetBatteryHealthSummaryResult,
  assetDetailsFetchLoading,
} from '@/services/redux/selectors';
import {useDispatch, useSelector} from 'react-redux';
import {getAssetBatteryHealthCycleComparisonRequest, getAssetBatteryHealthSummaryRequest} from '@/services/redux/slice';
import {AssetBatteryCycleCalculationMethod, BatteryCycleCalculationMethodLabels} from '@/constants';
import {BatteryFormulaKpi} from './CycleMethodInfoBox';
import {Alert, Text} from '@/ui-kits';
import {StratergyComparison} from './StratergyComparison';
import {useContainerDimentions} from '@/hooks';

interface AssetBatteryHealthTabProps extends AssetAnalysisTabProps {}

type CycleComparisonRow = AssetBatteryHealthAnalytics['cycle_comparison']['cycle_comparison'][number];

const cycleComparisonGhostRows: CycleComparisonRow[] = [
  {
    method_key: AssetBatteryCycleCalculationMethod.DISCHARGE_BASED,
    method_name: AssetBatteryCycleCalculationMethod.DISCHARGE_BASED,
    actual_total_cycles: 0,
    multi_market_total_cycles: 0,
    actual_daily_avg: 0,
    multi_market_daily_avg: 0,
  },
  {
    method_key: AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT,
    method_name: AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT,
    actual_total_cycles: 0,
    multi_market_total_cycles: 0,
    actual_daily_avg: 0,
    multi_market_daily_avg: 0,
  },
  {
    method_key: AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED,
    method_name: AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED,
    actual_total_cycles: 0,
    multi_market_total_cycles: 0,
    actual_daily_avg: 0,
    multi_market_daily_avg: 0,
  },
];

export function AssetBatteryHealth(props: AssetBatteryHealthTabProps) {
  const {assetId, month, year} = props;

  /**
   * ===============================
   * Hooks
   * ===============================
   */
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const {width: containerWidth} = useContainerDimentions(containerRef);

  /**
   * ===============================
   * Selector
   * ===============================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const batteryHealthSummary = useSelector(assetBatteryHealthSummaryResult);
  const batteryHealthSummaryLoading = useSelector(assetBatteryHealthSummaryLoading);
  const betteryHealthCycleComparision = useSelector(assetBatteryHealthCycleComparisonResult);
  const betteryHealthCycleComparisionLoading = useSelector(assetBatteryHealthCycleComparisonLoading);

  /**
   * ===============================
   * Derived States & Static values
   * ===============================
   */

  /**
   * battery health Kpis
   */
  const actualDischargeEnergy = batteryHealthSummary?.battery_health?.actual_discharge_energy ?? 0;
  const actualChargeEnergy = batteryHealthSummary?.battery_health?.actual_charge_energy ?? 0;
  const optimizedDischargeEnergy = batteryHealthSummary?.battery_health?.optimized_multi_market_discharge_energy ?? 0;
  const optimizedChargeEnergy = batteryHealthSummary?.battery_health?.optimized_multi_market_charge_energy ?? 0;

  const batteryHealthKpisData: GroupedKpiObj[] = [
    {
      title: 'Discharge / Export Energy',
      subtitle: 'Energy Exported to grid / battery output',
      icon: 'zap',
      secondaryAccentColor: '#B54708',
      accentColor: '#CF4F00',
      backgroundGradientEnd: '#FFF8E3',
      borderColor: '#F8992E',
      iconBgGradientStart: '#FFEFBA',
      subBorderColor: '#F2E4D5',
      iconBgGradientEnd: '#FFFAE9',
      subIconBgColor: '#FEF6E0',
      subKpis: [
        {
          icon: 'zap-solid',
          label: 'Actual Discharge Energy',
          unitLabel: 'MWh',
          value: actualDischargeEnergy.toLocaleString(),
        },
        {
          icon: 'trending-down',
          label: 'Optimized Discharge Energy',
          unitLabel: 'MWh',
          value: optimizedDischargeEnergy.toLocaleString(),
        },
      ],
    },
    {
      title: 'Charge / Import Energy',
      subtitle: 'Energy imported from grid / battery input',
      icon: 'trending-up',
      secondaryAccentColor: '#408DC1',
      accentColor: '#408DC1',
      subIconBgColor: '#F0F9FF',
      subBorderColor: '#CED8FD',
      backgroundGradientEnd: '#F4FCFF',
      borderColor: '#4d9cd1',
      iconBgGradientStart: '#DCF6FF',
      iconBgGradientEnd: '#F6FDFF',
      subKpis: [
        {
          icon: 'zap-solid',
          label: 'Actual Charge Energy',
          unitLabel: 'MWh',
          value: actualChargeEnergy.toLocaleString(),
        },
        {
          icon: 'trending-up',
          label: 'Optimized Charge Energy',
          unitLabel: 'MWh',
          value: optimizedChargeEnergy.toLocaleString(),
        },
      ],
    },
  ];

  const cycleComparision = (() => {
    if (betteryHealthCycleComparisionLoading) {
      return [];
    }
    return betteryHealthCycleComparision?.cycle_comparison ?? [];
  })();

  const cycleComparisonColumns: GroupedTableBaseColumn<CycleComparisonRow>[] = [
    {
      key: 'method_name',
      title: <span className="font-InterLight~">Method</span>,
      align: 'center',
      width: getCycleCycleMethodColumnsWidth(),
      renderCell: row => {
        const methodInfo = BatteryCycleCalculationMethodLabels[row.method_name];
        return (
          <Text variant="14R">
            {methodInfo.formulaCodeName}: {methodInfo.fullLabel}
          </Text>
        );
      },
    },
  ];

  const cycleComparisonGroups = [
    {title: 'Actual Total Cycles', accessor: 'total_cycles'},
    {title: 'Daily Avg. Cycles', accessor: 'daily_avg_cycles'},
  ];

  const cycleComparisonSubColumns: GroupedTableBaseSubColumn[] = [
    {
      key: 'actual',
      title: 'Actual',
      align: 'center',
      renderCell: value => <Text variant="14R">{value}</Text>,
    },
    {
      key: 'multi_market',
      title: 'Optimized',
      align: 'center',
      renderCell: value => <Text variant="14R">{value}</Text>,
    },
  ];

  const cycleComparisonRows =
    betteryHealthCycleComparisionLoading && cycleComparision.length === 0 ? cycleComparisonGhostRows : cycleComparision;

  const cycleComparisonTableData = cycleComparisonRows.map(item => ({
    ...item,
    total_cycles: {
      actual: item.actual_total_cycles.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}),
      multi_market: item.multi_market_total_cycles.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    daily_avg_cycles: {
      actual: item.actual_daily_avg.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3}),
      multi_market: item.multi_market_daily_avg.toLocaleString(undefined, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
    },
  }));

  /**
   * ==============================
   * Functions
   * ==============================
   */
  function getCycleCycleMethodColumnsWidth() {
    const minTriggerWidth = 900;
    const baseWidth = 210;
    const step = 10;
    const maxWidth = 330;

    if (containerWidth <= minTriggerWidth) {
      return 200;
    }

    const increments = Math.floor((containerWidth - minTriggerWidth) / 10);

    return Math.min(baseWidth + increments * step, maxWidth);
  }

  /**
   * ===============================
   * Side Effects
   * ===============================
   */
  useEffect(() => {
    if (!assetId || !year || !month) return;

    dispatch(getAssetBatteryHealthSummaryRequest({assetId, year, month}));
    dispatch(getAssetBatteryHealthCycleComparisonRequest({assetId, year, month}));
  }, [assetId, month, year]);

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      <Section
        icon="recycle-rounded"
        title="Battery Health Analysis"
        subtitle="Battery Cycling and Degradation Assessment">
        <div className="grid grid-cols-2 gap-4 mt-1">
          {batteryHealthKpisData?.map(item => (
            <GroupedKpisSection {...item} key={item.title} isLoading={batteryHealthSummaryLoading || assetLoading} />
          ))}
        </div>
      </Section>

      <div className="flex flex-col gap-4 bg-white border border-border rounded-xl p-4 -mt-3">
        <div className='flex justify-between'>
          <div className='flex flex-col gap-2'>
            <Text variant="18B">Cycle Calculation Methods & Comparison</Text>
            <Text variant="16SB" className="text-text-secondary!">
              Cycle Calculation Methods
            </Text>
          </div>
          <Alert message="Warranty Limit: 1.5 cycles/day (547 cycles/year)" className='self-start' iconName='octagon-alert' iconClassName='rotate-180' />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <BatteryFormulaKpi
            accentColor="#6B4990"
            bgColor="#F2E8FA"
            methodName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.DISCHARGE_BASED].fullLabel
            }
            formula={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.DISCHARGE_BASED].formulaLabel
            }
            formulaCodeName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.DISCHARGE_BASED].formulaCodeName
            }
          />
          <BatteryFormulaKpi
            accentColor="var(--color-warning)"
            bgColor="#FFF3CF"
            methodName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT].fullLabel
            }
            formula={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT].formulaLabel
            }
            formulaCodeName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT].formulaCodeName
            }
          />
          <BatteryFormulaKpi
            accentColor="var(--color-success)"
            bgColor="#E8FAE9"
            methodName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED].fullLabel
            }
            formula={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED].formulaLabel
            }
            formulaCodeName={
              BatteryCycleCalculationMethodLabels[AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED].formulaCodeName
            }
          />
        </div>

        <Text variant="16SB" className="text-text-secondary! mt-4">
          Cycle Comparison
        </Text>
        <AnalyticsGroupedTable
          data={cycleComparisonTableData}
          columns={cycleComparisonColumns}
          groups={cycleComparisonGroups}
          subColumns={cycleComparisonSubColumns}
          loading={betteryHealthCycleComparisionLoading || assetLoading}
          errorMessage="No cycle comparison data available"
          headerColor="#EFFAF9"
        />
      </div>

      <StratergyComparison {...props} />
    </div>
  );
}
