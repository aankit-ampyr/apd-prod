import React, {PropsWithChildren, useEffect, useRef, useState} from 'react';
import {AssetAnalysisTabProps} from '../../types';
import {
  ProgressComparisonHorizontalBar,
  type ProgressHorizontalBarComparisonData,
  type BarData,
  Section,
  SectionHeader,
  HorizontalBarChart,
  SimpleBarChart,
  HorizontalBarData,
  LineChart,
} from '@/components/common';
import {
  AssetBatteryCycleCalculationMethod,
  AssetMarketFullLabels,
  AssetMarketLabels,
  BatteryCycleCalculationMethodLabels,
  CALENDAR_MONTH_NAMES,
} from '@/constants';
import {Badge, Button, Icon, Text} from '@/ui-kits';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetBatteryHealthAnnualProjectionReportLoading,
  assetBatteryHealthAnnualProjectionReportResult,
  assetBatteryHealthDailyCyclesLoading,
  assetBatteryHealthDailyCyclesResult,
  assetBatteryHealthStrategyCyclingComparisonLoading,
  assetBatteryHealthStrategyCyclingComparisonResult,
  assetDetailsFetchLoading,
} from '@/services/redux/selectors';
import {
  getAssetBatteryHealthAnnualProjectionReportRequest,
  getAssetBatteryHealthStrategyCyclingComparisonRequest,
  getAssetBatteryHealthWarrantyExceedanceRequest,
  getAssetBatteryHealthDailyCyclesRequest,
} from '@/services/redux/slice';
import {AssetBatteryHealthAnalytics, AssetMarket, DataTableColumn} from '@/interface';
import {StratergyEnergyThroughputSummary} from '../StratergyEnergyThroughputSummary';
import {cn, formatDate, parseDate} from '@/utils';
import {GradientKPI, GradientKPIObject} from '../../../common';
import {AnnualProjectionReportKPIObject, AnnualProjectionReportKpi} from './AnnualProjectionReportKpi';
import {useContainerDimentions} from '@/hooks';
import {WrrantyLimitExcedance} from './WrrantyLimitExcedance';

interface AssetBatteryCycleStrategyComparisonProps extends AssetAnalysisTabProps {}
export function StratergyComparison(props: AssetBatteryCycleStrategyComparisonProps) {
  const {assetId, month, year, assetSystemGenerationId} = props;

  /**
   * ===============================
   * hooks
   * ===============================
   */
  const dispatch = useDispatch();

  /**
   * ===============================
   * selector
   * ===============================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const stratergyCompasionSummary = useSelector(assetBatteryHealthStrategyCyclingComparisonResult);
  const stratergyCompasionSummaryLoading = useSelector(assetBatteryHealthStrategyCyclingComparisonLoading);
  const annualProjectionReportResult = useSelector(assetBatteryHealthAnnualProjectionReportResult);
  const annualProjectionReportResultLoading = useSelector(assetBatteryHealthAnnualProjectionReportLoading);

  const dailyCycleData = useSelector(assetBatteryHealthDailyCyclesResult);
  const dailyCycleDataLoading = useSelector(assetBatteryHealthDailyCyclesLoading);

  const visualizationContainer = useRef<HTMLDivElement | null>(null);
  const {width: visualizationContainerWidth} = useContainerDimentions(visualizationContainer, {
    method: 'contentRect',
  });

  /**
   * ===============================
   * States and Constants
   * ===============================
   */
  const [stratergy, setStratergy] = useState<AssetBatteryCycleCalculationMethod>(
    AssetBatteryCycleCalculationMethod.DISCHARGE_BASED,
  );
  const anualKPICardColors: Record<
    AssetMarket,
    {
      bgGradientEnd: AnnualProjectionReportKPIObject['bgGradientEnd'];
      badgeColor: AnnualProjectionReportKPIObject['badgeColor'];
      helperText?: AnnualProjectionReportKPIObject['helperText'];
    }
  > = {
    actual: {
      badgeColor: 'light_brown',
      bgGradientEnd: '#FFFAE9',
    },
    epex_daily: {
      badgeColor: 'blue_gray',
      bgGradientEnd: '#F4FCFF',
      helperText: 'Baseline optimization',
    },
    epex_efa: {
      badgeColor: 'light_brown',
      bgGradientEnd: '#FFFFE6',
      helperText: 'Block-level EPEX optimization',
    },
    multi: {
      badgeColor: 'blue_gray',
      bgGradientEnd: '#F4FCFF',
      helperText: 'Cross-market optimization',
    },
  };

  const dailyCycleVisualizationSmallXTicks: any = {
    Actual: 'Actual',
    'EPEX Daily': 'Daily',
    'EPEX EFA': 'EFA',
    'Optimized': 'Opt',
  };

  /**
   * ===============================
   * Direvided States and Variables
   * ===============================
   */
  const annualProjectionReportKpis: AnnualProjectionReportKPIObject[] = (() => {
    if (annualProjectionReportResultLoading || !annualProjectionReportResult) {
      return Array.from({length: 4}).map((_, index) => ({
        id: `loading-${index}`,
        title: '---',
        badgeText: '---',
        value: 0,
        unit: 'proj. annual cycles',
        bgGradientEnd: '#E0E0E0',
        badgeColor: 'gray',
      }));
    }
    return annualProjectionReportResult.annual_projection_report.map(item => ({
      id: item.strategy,
      title: AssetMarketFullLabels[item.strategy],
      badgeText: (
        <p className="text-center!">
          {item.projected_annual_degradation.toFixed(2)}%
          <br />
          <span style={{position: 'relative', top: '-6px'}}>degradation/yr</span>
        </p>
      ),
      value: item.projected_annual_cycles.toLocaleString(),
      unit: 'proj. annual cycles',
      ...anualKPICardColors[item.strategy],
    }));
  })();

  const currentMonthDays = (() => {
    return new Date(year ?? 0, month ?? 0, 0).getDate();
  })();

  const summaryKpis: GradientKPIObject[] = [
    {
      title: 'Warranty Limit',
      value: '1.5',
      subLabel: 'cycles/day',
      icon: 'empty-hourglass',
      variant: 'green',
      iconBgGradientStart: '#E6D7FF',
      iconBgGradientEnd: '#F7F2FF',
      iconColor: '#5F2EB4',
    },
    {
      title: 'Annual Degradation at Limit',
      value: '2.5%',
      subLabel: '/ year',
      icon: 'trending-down',
      variant: 'orange',
    },
    {
      title: 'Analysis Period',
      value: currentMonthDays.toString(),
      subLabel: 'days',
      icon: 'zap',
      variant: 'blue',
    },
  ];

  const currentStratergyData = (() => {
    if (stratergyCompasionSummaryLoading || !stratergyCompasionSummary) {
      return Array.from({length: 4}).map(
        (): AssetBatteryHealthAnalytics['stratergy_cycle_comparison']['strategy_cycling_comparison'][number] => ({
          daily_cycle: 0,
          degradation_percent: 0,
          is_warranty_exceeded: false,
          strategy: '---' as any,
          total_cycle: 0,
          total_discharge_mwh: 0,
        }),
      );
    }
    return stratergyCompasionSummary.strategy_cycling_comparison;
  })();

  const estimatedLifespanData = ((): ProgressHorizontalBarComparisonData[] => {
    if (annualProjectionReportResultLoading || !annualProjectionReportResult) {
      return [
        {name: 'Actual', value: 0},
        {name: 'EPEX Daily', value: 0},
        {name: 'EPEX EFA', value: 0},
        {name: 'Optimized', value: 0},
      ];
    }
    return annualProjectionReportResult?.annual_projection_report?.map(item => ({
      name: AssetMarketLabels[item.strategy],
      value: item.estimated_battery_lifespan,
    }));
  })();

  const energyThroughputData = ((): BarData[] => {
    if (stratergyCompasionSummaryLoading || !stratergyCompasionSummary) {
      return Array.from({length: 4}).map(() => ({label: '---', value: 0}));
    }
    return stratergyCompasionSummary.strategy_cycling_comparison.map(item => ({
      label: AssetMarketFullLabels[item.strategy],
      value: item.total_discharge_mwh,
    }));
  })();

  const dailyCycleComparisonData = ((): BarData[] => {
    if (stratergyCompasionSummaryLoading || !stratergyCompasionSummary) {
      return Array.from({length: 4}).map(() => ({label: '---', value: 0}));
    }
    return stratergyCompasionSummary.strategy_cycling_comparison.map(item => ({
      label: AssetMarketLabels[item.strategy],
      value: item.daily_cycle,
    }));
  })();

  const monthlyDegradationData = ((): HorizontalBarData[] => {
    if (stratergyCompasionSummaryLoading || !stratergyCompasionSummary) {
      return Array.from({length: 4}).map(() => ({label: '---', value: 0}));
    }
    return stratergyCompasionSummary.strategy_cycling_comparison.map(item => ({
      label: AssetMarketLabels[item.strategy],
      value: item.degradation_percent,
    }));
  })();

  const energyThroughputGraphBarWidth = (() => {
    if (visualizationContainerWidth >= 1200) return 90;
    if (visualizationContainerWidth >= 1100) return 80;
    if (visualizationContainerWidth >= 1000) return 70;
    if (visualizationContainerWidth >= 900) return 60;
    if (visualizationContainerWidth >= 800) return 50;
    return 40;
  })();

  const cycleAnalaysisKpis: GradientKPIObject[] = [
    {
      title: 'Actual Avg Daily Cycles',
      value: dailyCycleData?.actual?.avg_cycles?.toString() ?? '0',
      variant: 'orange',
      icon: 'recycle-rounded',
      subLabel: 'cycle',
    },
    {
      title: 'Optimized Avg Daily',
      value: dailyCycleData?.multi_market?.avg_cycles?.toString() ?? '0',
      variant: 'blue',
      icon: 'chart-wave',
      subLabel: 'cycle',
    },
    {
      title: 'Actual Max Day',
      value: dailyCycleData?.actual?.max_cycles?.toString() ?? '0',
      variant: 'yellow',
      icon: 'zap',
      subLabel: (
        <Badge
          className="ml-auto border-[#D0BB00] border bg-[#FFFED3]!"
          textClassName="text-text-secondary!"
          message={formatDate(parseDate(dailyCycleData?.actual?.max_cycles_date ?? '', 'dd-MM-yyyy') ?? '', 'dd-MMM yyyy')}
        />
      ),
      helperLabel: (
        <Text variant="14R" className="-mt-0.5 text-text-secondary!">
          cycle
        </Text>
      ),
    },
    {
      title: 'Optimized Max Day',
      value: dailyCycleData?.multi_market?.max_cycles?.toString() ?? '0',
      variant: 'green',
      icon: 'trending-up',
      subLabel: (
        <Badge
          className="ml-auto border-[#05CC59] border bg-[#EAFFE1]!"
          textClassName="text-text-secondary!"
          message={formatDate(
            parseDate(dailyCycleData?.multi_market?.max_cycles_date ?? '', 'dd-MM-yyyy') ?? '',
            'dd-MMM yyyy',
          )}
        />
      ),
      helperLabel: (
        <Text variant="14R" className="-mt-0.5 text-text-secondary!">
          cycle
        </Text>
      ),
    },
  ];

  const dailyCycleChartData = dailyCycleData?.daily_cycles;

  /**
   * ===============================
   * Data Colums
   * ===============================
   */
  const stratergyEnergtThroughputSummary: DataTableColumn<
    AssetBatteryHealthAnalytics['stratergy_cycle_comparison']['strategy_cycling_comparison'][number]
  >[] = [
    {
      align: 'left',
      name: 'stratergy',
      title: <Text variant="14M">Strategy</Text>,
      render: row => <Text variant="14M">{AssetMarketFullLabels[row.strategy]}</Text>,
      width: {minWidth: '150px'},
    },
    {
      align: 'center',
      name: 'total_discharge',
      title: <Text variant="14M">Total Discharge</Text>,
      render: row => <Text variant="14R">{row.total_discharge_mwh} MWh</Text>,
      width: {minWidth: '150px'},
    },
    {
      align: 'center',
      name: 'total_cycle',
      title: <Text variant="14M">Total Cycle</Text>,
      render: row => <Text variant="14R">{row.total_cycle}</Text>,
      width: {minWidth: '150px'},
    },
    {
      align: 'center',
      name: 'daily_cycle',
      title: <Text variant="14M">Daily Cycle</Text>,
      render: row => <Text variant="14R">{row.daily_cycle}</Text>,
      width: {minWidth: '150px'},
    },
    {
      align: 'center',
      name: 'degradation',
      title: <Text variant="14M">Degradation %</Text>,
      render: row => (
        <Text variant="14R" className="text-error-text!">
          {row.degradation_percent}
        </Text>
      ),
      width: {minWidth: '150px'},
    },
    {
      align: 'center',
      name: 'warranty',
      title: <Text variant="14M">Warranty Status</Text>,
      render: row => (
        <Text variant="14R" className={cn(row.is_warranty_exceeded && 'text-error-text!')}>
          {row.is_warranty_exceeded ? 'Limit Exceeded' : 'Within Limit'}
        </Text>
      ),
      width: {minWidth: '200px'},
    },
  ];
  /**
   * ===============================
   * function
   * ===============================
   */

  const getCurrentStratergyLabel = (stratergy: AssetBatteryCycleCalculationMethod) =>
    `${BatteryCycleCalculationMethodLabels[stratergy].formulaCodeName} — ${BatteryCycleCalculationMethodLabels[stratergy].label}`;

  /**
   * ===============================
   * Side Effects
   * ===============================
   */
  useEffect(() => {
    if (!assetId || !year || !month || !stratergy) return;

    dispatch(getAssetBatteryHealthStrategyCyclingComparisonRequest({assetId, cycle_method: stratergy, month, year}));
    dispatch(getAssetBatteryHealthAnnualProjectionReportRequest({assetId, cycle_method: stratergy, month, year}));
    dispatch(getAssetBatteryHealthDailyCyclesRequest({assetId, cycle_method: stratergy, month, year}));
    dispatch(getAssetBatteryHealthWarrantyExceedanceRequest({assetId, cycle_method: stratergy, month, year}));
  }, [assetId, month, year, stratergy]);

  return (
    <div className="flex flex-col gap-3 bg-white px-4 py-3 rounded-lg border border-border">
      {/* header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
        <SectionHeader
          icon="scale"
          title="Strategy Cycling Comparison"
          subtitle="Select a cycle calculation method to update strategy data"
        />

        <div className="flex gap-2 self-end lg:self-auto">
          {[
            AssetBatteryCycleCalculationMethod.DISCHARGE_BASED,
            AssetBatteryCycleCalculationMethod.FULL_EQUIVALENT,
            AssetBatteryCycleCalculationMethod.THROUGHPUT_BASED,
          ].map(item => (
            <Button
              size="sm"
              onClick={() => setStratergy(item)}
              variant={stratergy !== item ? 'tab-secondary' : 'tab-primary'}
              text={getCurrentStratergyLabel(item)}
            />
          ))}
        </div>
      </div>

      <div className="grid-cols-3 my-4 grid gap-4">
        {summaryKpis.map(item => (
          <GradientKPI {...item} key={item.title} isLoading={assetLoading} />
        ))}
      </div>

      <div
        ref={visualizationContainer}
        className="flex @container min-h-100 border-l-2 flex-col gap-8 border-[#9CA0AB]">

        {/* header pill */}
        <div className="border-disabled border mx-5 rounded-full w-fit px-4 py-1 bg-linear-to-r from-[#F3F6F9] to-[#F7F7F7] flex gap-2 items-center">
          <Icon name="chevron-right" className="size-2.5 text-text-secondary!" />
          <Text variant="12R" className="text-text-secondary! ">
            Sections below derive from cycle method{' '}
            <span className="text-text-primary! font-InterSemiBold!">{getCurrentStratergyLabel(stratergy)}</span>
          </Text>
        </div>

        {/* Visual Comparisons */}
        <VisualizationWrapper>
          <div className="bg-white px-4 py-3 gap-4 flex flex-col border border-border rounded-lg">
            <Section
              icon="search-analysis"
              title="Visual Comparisons"
              subtitle="Daily cycling and monthly degradation across strategies ">
              <div className="grid grid-cols-1 @[780px]:grid-cols-2 gap-4">
                {/* Daily Cycling Comparison */}
                <SimpleBarChart
                  tickCount={4}
                  refferenceLine={{
                    value: 1.5,
                    label: 'Warranty Limit',
                    color: 'var(--color-error)',
                  }}
                  yDomainMax={1.6}
                  className="bg-[#FBFBFC]"
                  header={<Text variant="16SB">Daily Cycle Comparison</Text>}
                  data={dailyCycleComparisonData}
                  barColor="#4D9CD1"
                  chartClassName={
                    'max-h-80! @[780px]:max-h-60! @[880px]:max-h-65! @[980px]:max-h-70! @[1040px]:max-h-75! @[1080px]:max-h-80! @[1110px]:max-h-85! @[1200px]:max-h-90! @[1300px]:max-h-95! @[1390px]:max-h-100! @[1470px]:max-h-105! @[1570px]:max-h-110! @[1680px]:max-h-115!'
                  }
                  showValuesOnBar
                  smallXtickFormatter={value => dailyCycleVisualizationSmallXTicks[value] || value}
                  isLoading={stratergyCompasionSummaryLoading || assetLoading}
                  barWidth={40}
                  yAxisProps={{
                    tick: {
                      fill: 'var(--color-text-primary)',
                      fontFamily: 'Inter-Regular',
                      fontSize: 14,
                    },
                  }}
                  chartMargins={{left: 10, right: 40}}
                  downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_daily_cycle_comparison.png`}
                  yAxisLabelProps={{
                    offset: 0,
                    fontFamily: 'Inter-Light',
                    fontWeight: 200,
                  }}
                  barValueLabelProps={{
                    fill: '#3877A1',
                    fontSize: 14,
                    fontFamily: 'Inter-Medium',
                  }}
                  YAxisLabel="Cycles/day"
                />

                {/* Monthly Degradation Comparison */}
                <HorizontalBarChart
                  header={<Text variant="16SB">Monthly Degradation Comparison</Text>}
                  data={monthlyDegradationData}
                  className="bg-[#FBFBFC]"
                  xDomainUpperPadding={0.1}
                  xAxisTickCount={5}
                  isLoading={stratergyCompasionSummaryLoading || assetLoading}
                  barColor="var(--color-warning)"
                  showValuesOnBar
                  chartClassName={
                    'max-h-85! @[780px]:max-h-65! @[880px]:max-h-70! @[980px]:max-h-75! @[1040px]:max-h-80! @[1080px]:max-h-85! @[1110px]:max-h-90! @[1200px]:max-h-95! @[1200px]:max-h-100! @[1390px]:max-h-105! @[1470px]:max-h-110! @[1570px]:max-h-115! @[1680px]:max-h-120!'
                  }
                  barWidth={28}
                  yAxisWidth={110}
                  chartMargins={{left: 0, right: 5, bottom: 30}}
                  downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_monthly_degradation_comparison.png`}
                  XAxisLabel="% / Month"
                  xDomainMax={0.16}
                  xAxisProps={{
                    tick: {
                      fill: 'var(--color-text-primary)',
                      fontFamily: 'Inter-Regular',
                      fontSize: 14,
                    },
                    padding: {right: 20},
                    dy: 5,
                  }}
                  xAxisLabelProps={{
                    offset: 15,
                    fontFamily: 'Inter-Light',
                    fontWeight: 200,
                  }}
                  yAxisProps={{
                    tick: {
                      fill: 'var(--color-text-primary)',
                      fontFamily: 'Inter-Regular',
                      fontSize: 14,
                    },
                    dx: -5,
                  }}
                  yAxisLabelProps={{
                    offset: 0,
                    fontFamily: 'Inter-Light',
                    fontWeight: 200,
                  }}
                  barValueLabelProps={{
                    fill: '#DA7500',
                    fontSize: 14,
                    fontFamily: 'Inter-Medium',
                  }}
                  barValueFormatter={value => `${value}%`}
                  xAxisTickFormatter={value => Number(value).toFixed(Number(value) < 0.1 ? 2 : 2)}
                />
              </div>
            </Section>
          </div>
        </VisualizationWrapper>

        {/* Energy Throughput Analysis */}
        <VisualizationWrapper>
          <div className="bg-white px-4 py-3 gap-4 flex flex-col border border-border rounded-lg">
            <Section
              icon="growth"
              title="Energy Throughput Analysis"
              subtitle={`Total discharge energy by strategy · ${CALENDAR_MONTH_NAMES[month ? month - 1 : 0]} ${year}`}>
              <SimpleBarChart
                data={energyThroughputData}
                className="bg-[#FBFBFC]"
                barWidth={energyThroughputGraphBarWidth}
                yDomainUpperPadding={50}
                barColor="#1EC590"
                isLoading={stratergyCompasionSummaryLoading || assetLoading}
                downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_total_discharge_comparison.png`}
                chartMargins={{left: 30}}
                yAxisProps={{
                  tick: {
                    fill: 'var(--color-text-primary)',
                    fontFamily: 'Inter-Regular',
                    fontSize: 14,
                  },
                }}
                yAxisLabelProps={{
                  offset: -5,
                  style: {
                    fontSize: 14,
                    fontFamily: 'Inter-Regular',
                    textAnchor: 'middle',
                    fill: 'var(--color-text-primary)',
                  },
                }}
                showValuesOnBar
                barValueLabelProps={{
                  fill: '#029063',
                  fontFamily: 'Inter-Medium',
                  fontSize: 14,
                }}
                YAxisLabel="Total Discharge (MWh)"
                barValueFormatter={v => `${v} MWh`}
              />
            </Section>
          </div>
        </VisualizationWrapper>

        {/* Strategy Energy Throughput Summary */}
        <VisualizationWrapper>
          <StratergyEnergyThroughputSummary
            columns={stratergyEnergtThroughputSummary}
            data={currentStratergyData}
            isLoading={stratergyCompasionSummaryLoading || assetLoading}
            downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_strategy_energy_throughput_summary.png`}
          />
        </VisualizationWrapper>

        {/* Annual Projection Report */}
        <VisualizationWrapper>
          <div className="bg-white px-4 py-3 gap-4 flex flex-col border border-border rounded-lg">
            <SectionHeader
              icon="bar"
              iconClassName="rotate-90"
              title="Annual Projection Report"
              subtitle="Projected annual cycles, degradation, and estimated battery lifespan by strategy"
            />

            <div className="grid grid-cols-2 @[965px]:grid-cols-4 gap-2 @[920px]:gap-4 ">
              {annualProjectionReportKpis.map(item => (
                <AnnualProjectionReportKpi
                  {...item}
                  key={item.id}
                  isLoading={annualProjectionReportResultLoading || assetLoading}
                />
              ))}
            </div>

            <ProgressComparisonHorizontalBar
              header={
                <div>
                  <Text variant="largeBody" className="font-InterSemiBold!">
                    Estimated Battery Lifespan
                  </Text>
                  <Text variant="14R" className="text-text-secondary!">
                    Shows how long the battery is expected to last before reaching 80% SOH.
                  </Text>
                </div>
              }
              scale="yrs"
              isLoading={annualProjectionReportResultLoading || assetLoading}
              downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_Estimated_battery_lifespan.png`}
              barColor="#56D4D7"
              valueTextColor="#00A4A7"
              data={estimatedLifespanData}
            />
          </div>
        </VisualizationWrapper>

        {/* Daily Cycles Analysis */}
        <VisualizationWrapper>
          <div className="bg-white @container flex flex-col px-4 py-3 gap-4 border border-border rounded-lg">
            <Section
              title="Daily Cycles Analysis"
              icon="chart-trend-up"
              subtitle="Actual Operation vs Optimized">
              <div className="grid grid-cols-2 min-[1136px]:grid-cols-4 gap-3">
                {cycleAnalaysisKpis.map(item => (
                  <GradientKPI className="pb-1.5! px-4" key={item.title} {...item} isLoading={dailyCycleDataLoading} />
                ))}
              </div>

              <LineChart
                title="Actual Operation vs Optimized"
                data={dailyCycleChartData ?? []}
                chartMargin={{left: 40}}
                isLoading={dailyCycleDataLoading || assetLoading}
                downloadFileName={`${assetSystemGenerationId}_${getCurrentStratergyLabel(stratergy)}_${month}_${year}_daily_cycles_analysis.png`}
                chartClassName="min-h-120"
                className="pb-0!"
                tooltipRenderer={({payload, label}) => {
                  const [actual, multimarket] = payload;
                  return (
                    <div className="bg-white! p-4 flex flex-col gap-1 rounded-md border border-border">
                      <Text variant="16M" className='mb-1'>
                        {formatDate(parseDate(label?.toString() ?? '', 'dd-MM-yyyy')!, 'dd MMM yyyy')}
                      </Text>
                      <Text variant="14R" className="text-text-secondary!">
                        Actual Daily Cycle : <span style={{color: actual?.color}} className='font-InterBold!'>{Number(actual?.value).toFixed(2) ?? 0} cycles/day</span>
                      </Text>
                      <Text variant="14R" className="text-text-secondary!">
                        Optimized Daily Cycle : <span style={{color: multimarket?.color}} className='font-InterBold!'>{Number(multimarket?.value).toFixed(2) ?? 0} cycles/day</span>
                      </Text>
                      <Text variant="14R" className="text-text-secondary!">
                        Method : <span className='font-InterBold! text-text-primary!'>{getCurrentStratergyLabel(stratergy)}</span>
                      </Text>
                    </div>
                  );
                }}
                config={{
                  showLegend: true,
                  enableZoom: false,
                  xKey: 'date',
                  xAxisLabel: 'Date',
                  yDomainTopPadding: 0.5,
                  yDomainBottomPadding: 0.5,
                  referenceLines: [
                    {
                      value: 1.5,
                      label: '',
                      color: 'var(--color-error)',
                      legendLabel: <Text variant="14R" className="text-text-secondary!">
                        Warranty Limit: <span className='font-InterBold! text-error!'>(1.5 cycles/day)</span>
                      </Text>,
                      lineStyle: 'dotted'
                    }
                  ],
                  yAxisLabel: 'Cycles per Day',

                  xTickInterval: 0,
                  xTickFormatter: value => {
                    const parsed = parseDate(String(value), 'dd-MM-yyyy');
                    return parsed?.getDate().toString() ?? '0';
                  },
                  yTickStep: 0.5,
                  yTickSpace: 100,
                  yTickFormatter: value => Number(value).toFixed(2),
                  yAxisLabelProps: {
                    offset: -4,
                  },
                  xAxisLabelProps: {
                    offset: -20,
                  },
                  lines: [
                    {
                      key: 'actual_daily_cycles',
                      label: 'Actual',
                      color: 'var(--color-warning)',
                      smooth: true,
                    },
                    {
                      key: 'multi_market_daily_cycles',
                      label: 'Optimized',
                      color: 'var(--color-blue-data)',
                      smooth: true,
                    },
                  ],
                }}
              />
            </Section>
          </div>
        </VisualizationWrapper>

        {/* Warranty Limit Exceedance Analysis */}
        <VisualizationWrapper>
          <WrrantyLimitExcedance />
        </VisualizationWrapper>
      </div>
    </div>
  );
}

function VisualizationWrapper({children}: PropsWithChildren) {
  return (
    <div className="relative w-full flex flex-col px-5">
      <div className="absolute top-5 left-0 w-5 h-0.5 bg-[#9CA0AB]" />
      {children}
    </div>
  );
}
