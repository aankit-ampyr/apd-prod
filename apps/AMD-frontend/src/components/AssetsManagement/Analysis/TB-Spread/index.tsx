/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {useEffect, useMemo} from 'react';
import {AssetAnalysisTabProps} from '../types';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetDetailsFetchLoading,
  assetTBSpreadDetailsLoading,
  assetTBSpreadDetailsResult,
  assetTBSpreadSummaryLoading,
  assetTBSpreadSummaryResult,
} from '@/services/redux/selectors';
import {Divider, Section, SectionHeader, CompositeChart, LineChart} from '@/components/common';
import {getAssetTBSpreadDetailsRequest} from '@/services/redux/slice';
import {getAssetTBSpreadSummaryRequest} from '@/services/redux/slice';
import {TBSpreadAnalysisCards, TBSpreadAnalysisCardObject} from './SpeadAnalysisCard';
import {cn, formatCurrencyToPound, formatDate} from '@/utils';
import {Alert, Badge, BadgeVariants, IconTypes, Text} from '@/ui-kits';
import {DataTableColumn} from '@/interface';
import {TBSpreadDetail, TBSpreadDetailsTable} from './TBSpreadDetailsTable';
import {downloadAssetTBSpreadDetails} from '@/services/api';
import { useContainerDimentions } from '@/hooks';

/**
 * ==================================
 * Types and Interfaces
 * ==================================
 */
type TBSpreadCaptureRatePerformance = 'positive' | 'negative' | 'neutral';
type TBSpreadTrendPoint = Pick<TBSpreadDetail, 'date' | 'tb1' | 'tb2' | 'tb3'>;
type TBSpreadRevenueCapturePoint = Pick<TBSpreadDetail, 'date' | 'arbitrage_revenue' | 'capture_rate'>;
type TBSpreadCaptureRateGapColorCodingAndLabel = {
  label: (value: number) => string;
  badgeVariant: BadgeVariants['color'];
  icon?: IconTypes;
};

interface TbSpreadProps extends AssetAnalysisTabProps {}
export function AssetTbSpread(props: TbSpreadProps) {
  const {assetId, assetSystemGenerationId, month, year} = props;
  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const dispatch = useDispatch();
  const ref = React.useRef<HTMLDivElement>(null);
  const {width} = useContainerDimentions(ref);

  /**
   * ===========================
   * Selectors
   * ===========================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);

  const tbSpreadSummary = useSelector(assetTBSpreadSummaryResult);
  const tbSpreadSummaryLoading = useSelector(assetTBSpreadSummaryLoading);

  const tbSpreadDetails = useSelector(assetTBSpreadDetailsResult);
  const tbSpreadDetailsLoading = useSelector(assetTBSpreadDetailsLoading);

  /**
   * ===========================
   * States and Constants
   * ===========================
   */
  const tbCaptureRateGapColorCodingAndLabel: Record<
    TBSpreadCaptureRatePerformance,
    TBSpreadCaptureRateGapColorCodingAndLabel
  > = {
    positive: {
      label: (value: number) => `${value} pts above benchmark`,
      badgeVariant: 'green',
      icon: 'arrow-up',
    },
    negative: {
      label: (value: number) => `${Math.abs(value)} pts below benchmark`,
      badgeVariant: 'red',
      icon: 'arrow-down',
    },
    neutral: {
      label: (_value: number) => 'At Benchmark',
      badgeVariant: 'brown_gray',
    },
  };

  const tbSpreadDetailsTableColumns: DataTableColumn<TBSpreadDetail>[] = [
    {
      title: <Text variant="14R">Date</Text>,
      align: 'left',
      name: 'date',
      render: value => <Text variant="14R">{formatDate(new Date(value.date), 'dd-MMM-yyyy')}</Text>,
    },
    {
      title: <Text variant="14R">TB1 (£/MWh)</Text>,
      align: 'right',
      name: 'tb1',
      render: value => <Text variant="14R">{value.tb1}</Text>,
    },
    {
      title: <Text variant="14R">TB2 (£/MWh)</Text>,
      align: 'right',
      name: 'tb2',
      render: value => <Text variant="14R">{value.tb2}</Text>,
    },
    {
      title: <Text variant="14R">TB3 (£/MWh)</Text>,
      align: 'right',
      name: 'tb3',
      render: value => <Text variant="14R">{value.tb3}</Text>,
    },
    {
      title: <Text variant="14R">Arbitrage (£)</Text>,
      align: 'right',
      name: 'arbitrage',
      render: value => <Text variant="14R">{value.arbitrage_revenue}</Text>,
    },
  ];

  /**
   * ===========================
   * Derived State
   * ===========================
   */
  /**
   * summary kpis
   */
  const averageTB1 = tbSpreadSummary?.avg_tb1 ?? 0;
  const averageTB2 = tbSpreadSummary?.avg_tb2 ?? 0;
  const averageTB3 = tbSpreadSummary?.avg_tb3 ?? 0;
  const averageArbitrageRevenue = tbSpreadSummary?.avg_arbitrage_revenue ?? 0;
  const benchmarkGap = Number((tbSpreadSummary?.benchmark_gap ?? 0).toFixed(0));
  const tb2CaptureRate = (tbSpreadSummary?.tb2_capture_rate ?? 0).toFixed(0);
  const benchmarkTbSpread = tbSpreadSummary?.tb_spread_benchmark ?? 0;
  const tbCaptureRateBadgeVariant = getTbCaptureRateGapColorCodingAndLabel(benchmarkGap);

  const tbSpreadSummaryKpis: TBSpreadAnalysisCardObject[] = [
    {
      title: 'Avg TB1',
      tooltipText: (
        <Text variant="14R">
          <span className="font-InterSemiBold">TB1 =</span> Highest hourly price - Lowest hourly price (for the day)
        </Text>
      ),
      value: formatCurrencyToPound(averageTB1),
      variant: 'orange',
      unit: '/MWh',
    },
    {
      title: 'Avg TB2',
      tooltipText: (
        <Text variant="14R">
          <span className="font-InterSemiBold">TB2 =</span> (Sum of 2 highest hourly prices) − (Sum of 2 lowest hourly
          prices)
        </Text>
      ),
      value: formatCurrencyToPound(averageTB2),
      variant: 'blue',
      unit: '/MWh',
    },
    {
      title: 'Avg TB3',
      tooltipText: (
        <Text variant="14R">
          <span className="font-InterSemiBold">TB3 =</span> (Sum of 3 highest hourly prices) − (Sum of 3 lowest hourly
          prices)
        </Text>
      ),
      value: formatCurrencyToPound(averageTB3),
      variant: 'purple',
      unit: '/MWh',
    },
    {
      title: 'Avg Arbitrage Revenue',
      tooltipText: (
        <Text variant="14R">
          <span className="font-InterSemiBold">Total Monthly Arbitrage Revenue =</span>Σ(EPEX DA Revenue +<br />
          EPEX 30 DA Revenue + IDA1 Revenue + IDC Revenue)
          <br />
          Avg Daily Arbitrage = Total Monthly Arbitrage Revenue ÷<br />
          Number of Days in Selected Month
        </Text>
      ),
      value: formatCurrencyToPound(averageArbitrageRevenue),
      variant: 'green',
    },
    {
      title: 'TB2 Capture Rate',
      tooltipText: (
        <Text variant="14R">
          <span className="font-InterSemiBold">TB2 Capture Rate (%) =</span>Avg Daily Arbitrage ÷ (Avg TB2 Spread x
          Capacity) x 100
        </Text>
      ),
      variant: 'yellow',
      value: (
        <div className="flex justify-between">
          <Text variant="h2" className="self-center text-[26px]!">
            {tb2CaptureRate}%
          </Text>
          <Divider orientation="vertical" className="bg-[#CCCB9D] w-0.2! shrink-0" />
          <div className="flex flex-col gap-3">
            <Text variant="14R" className="text-[#9B9A66]! ml-2">
              Benchmark: <span className="text-warning! font-InterBold">{benchmarkTbSpread}%</span>
            </Text>
            <Badge
              size="sm"
              icon={tbCaptureRateBadgeVariant.icon}
              color={tbCaptureRateBadgeVariant.badgeVariant}
              message={tbCaptureRateBadgeVariant.label(benchmarkGap)}
              textClassName={cn(benchmarkGap === 0 && 'font-InterMedium!')}
            />
          </div>
        </div>
      ),
      tooltipPosition: 'left-top',
    },
  ];

  /**
   * details table data and columns
   */
  const tbSpreadDetailsTableData = (() => {
    if (tbSpreadDetailsLoading || !tbSpreadDetails) {
      // ghost data when loading
      return Array.from(
        {length: 5},
        (_, index): TBSpreadDetail =>
          ({
            arbitrage_revenue: 0,
            date: `2024-06-${index + 1}`,
            tb1: 0,
            tb2: 0,
            tb3: 0,
          }) as TBSpreadDetail,
      );
    }
    return tbSpreadDetails?.tb_spread ?? [];
  })();

  const tbSpreadTrendData = useMemo<TBSpreadTrendPoint[]>(() => {
    if (tbSpreadDetailsLoading || !tbSpreadDetails) {
      return Array.from(
        {length: 5},
        (_, index): TBSpreadTrendPoint => ({
          date: `2024-06-${String(index + 1).padStart(2, '0')}`,
          tb1: 0,
          tb2: 0,
          tb3: 0,
        }),
      );
    }

    return tbSpreadDetails.tb_spread.map(item => ({
      date: item.date,
      tb1: item.tb1,
      tb2: item.tb2,
      tb3: item.tb3,
    }));
  }, [tbSpreadDetails, tbSpreadDetailsLoading]);

  const tbSpreadRevenueCaptureData = useMemo<TBSpreadRevenueCapturePoint[]>(() => {
    if (tbSpreadDetailsLoading || !tbSpreadDetails) {
      return Array.from(
        {length: 5},
        (_, index): TBSpreadRevenueCapturePoint => ({
          date: `2024-06-${String(index + 1).padStart(2, '0')}`,
          arbitrage_revenue: 0,
          capture_rate: 0,
        }),
      );
    }

    return tbSpreadDetails.tb_spread.map(item => ({
      date: item.date,
      arbitrage_revenue: item.arbitrage_revenue,
      capture_rate: item.capture_rate,
    }));
  }, [tbSpreadDetails, tbSpreadDetailsLoading]);

  /**
   * ===========================
   * Functions
   * ===========================
   */
  function getTbCaptureRateGapColorCodingAndLabel(value: number): TBSpreadCaptureRateGapColorCodingAndLabel {
    if (value > 0) {
      return tbCaptureRateGapColorCodingAndLabel.positive;
    } else if (value < 0) {
      return tbCaptureRateGapColorCodingAndLabel.negative;
    } else {
      return tbCaptureRateGapColorCodingAndLabel.neutral;
    }
  }

  async function handleDownload() {
    if (!month || !year || !assetId) return;

    await downloadAssetTBSpreadDetails({
      assetId,
      month,
      year,
      fileName: `${assetSystemGenerationId}-${month}_${year}_TBSpreadDetails.csv`,
    });
  }

  function formatDayTick(value: string | number): string {
    const rawValue = String(value);
    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
      const parts = rawValue.split('-');
      return parts.length >= 3 ? parts[2].padStart(2, '0') : rawValue;
    }

    return String(date.getDate()).padStart(2, '0');
  }

  function formatTooltipDate(value: string | number): string {
    const rawValue = String(value);
    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
      return rawValue;
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * ===========================
   * Side Effects
   * ===========================
   */
  useEffect(() => {
    if (!month || !year || !assetId) return;
    dispatch(getAssetTBSpreadSummaryRequest({assetId, month, year}));
    dispatch(getAssetTBSpreadDetailsRequest({assetId, month, year}));
  }, [month, year, assetId]);

  return (
    <div ref={ref} className="flex flex-col gap-8 @container">
      {/* <p>width: {width}</p> */}
      {/* Top-Bottom Spread Analysis */}
      <Section
        className='pt-3'
        icon="zap-solid"
        title="Top-Bottom Spread Analysis"
        subtitle="View monthly TB spread opportunity, average arbitrage revenue, and capture performance against benchmark.">
        <div className="grid mt-2 grid-cols-[repeat(4,minmax(180px,270px))_minmax(300px,1fr)] gap-4">
          {tbSpreadSummaryKpis.map(kpi => (
            <TBSpreadAnalysisCards renderUnitToBottom={width < 1125} {...kpi} key={kpi.title} isLoading={tbSpreadSummaryLoading || assetLoading} />
          ))}
        </div>

        <Alert
          message="TB Spread Revenue Benchmark value is configured in Settings and apply across views."
          className="w-fit mt-1 items-stretch"
          iconClassName='translate-y-[-2px]!'
        />
      </Section>

      {/* Daily TB Spread Trend  */}
      <LineChart
        chartMargin={{left: 40}}
        xAxisProps={{padding: {left: 20, right: 20}}}
        data={tbSpreadTrendData}
        downloadFileName={`${assetSystemGenerationId}_${month}_${year}_TBSpreadTrend.png`}
        headerRenderer={
          <SectionHeader
            icon="growth"
            title="Daily TB Spread Trend"
            subtitle="Track day-wise TB1, TB2, and TB3 spread opportunity for the selected month."
          />
        }
        cartesianGridProps={{
          vertical: false,
        }}
        tooltipRenderer={({label, payload}) => {
          const labelMapping: any = {
            tb1: 'TB1 Spread',
            tb2: 'TB2 Spread',
            tb3: 'TB3 Spread',
          };
          return (
            <div className="p-4 bg-white rounded-md border border-border">
              <Text variant="14SB" className="font-InterSemiBold">
                {formatDate(new Date(label ?? ''), 'dd MMM yyyy')}
              </Text>

              <div className="flex flex-col -gap-2">
                {payload.map(item => (
                  <div key={item.dataKey?.toString()} className="flex items-center gap-1 mt-2">
                    <Text variant="14R" className="text-text-secondary!">
                      {labelMapping[item.dataKey as keyof typeof labelMapping]}:{' '}
                    </Text>
                    <Text variant="14R" className="font-InterBold!" style={{color: item.stroke}}>
                      {formatCurrencyToPound(item.value as number)}/MWh
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
        chartClassName="min-h-96 px-4"
        isLoading={tbSpreadDetailsLoading || assetLoading}
        config={{
          enableZoom: false,
          xKey: 'date',
          xAxisLabel: 'Date',
          yAxisLabel: 'Spread Value (£/MWh)',
          xTickFormatter: formatDayTick,
          xTickInterval: 0,
          yTickStep: 50,
          yTickSpace: 74,
          showLegend: true,
          lineStrokeWidth: 2,
          hideFirstYAxisTickLabel: false,
          yAxisLabelProps: {
            offset: -10,
          },
          xAxisLabelProps: {
            offset: -20,
          },
          tooltipCursor: {
            stroke: 'var(--color-text-secondary)',
          },
          tooltipTitleFormatter: formatTooltipDate,
          tooltipValueFormatter: value => {
            if (!Number.isFinite(value)) return '-';
            const rounded = Math.round(value * 100) / 100;
            const rendered = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
            return `£${rendered}/MWh`;
          },
          yTickFormatter: value => (value === 0 ? '0' : `£${value}`),
          lines: [
            {
              key: 'tb1',
              label: 'TB1',
              color: '#F68A20',
              smooth: false,
              showSymbol: true,
            },
            {
              key: 'tb2',
              label: 'TB2',
              color: '#4197D9',
              smooth: false,
              showSymbol: true,
            },
            {
              key: 'tb3',
              label: 'TB3',
              color: '#8E6DD1',
              smooth: false,
              showSymbol: true,
            },
          ],
        }}
      />

      {/* Daily Arbitrage Revenue & TB2 Capture Rate */}
      {/* <CompositeChart
        className="mt-2"
        chartClassName="min-h-96 px-4"
        downloadFileName={`${assetSystemGenerationId}_${month}_${year}_DailyArbitrageRevenue_TB2CaptureRate.png`}
        isLoading={tbSpreadDetailsLoading || assetLoading}
        data={tbSpreadRevenueCaptureData}
        xAxisKey="date"
        xAxisLabel="Date"
        header={
          <SectionHeader
            title="Daily Arbitrage Revenue & TB2 Capture Rate"
            subtitle="Compare daily arbitrage revenue with TB2 capture rate against the configured industry benchmark."
            icon="sack"
          />
        }
        formulaRenderer={
          <div className="flex items-center gap-1.5 rounded-md bg-[#F0F8FF] px-4 py-2">
            <Text variant="14SB" className="text-link!">
              Capture Rate % =
            </Text>
            <Text variant="14M" className="text-text-secondary!">
              Avg Daily Arbitrage ÷ (Avg TB2 Spread × Capacity) × 100
            </Text>
          </div>
        }
        axes={{
          left: {
            label: 'Daily Arbitrage Revenue (£/MWh)',
            domainStrategy: 'auto',
            tickFormatter: value => formatCurrencyToPound(value, false),
          },
          right: {
            label: 'Capture Rate (%)',
            domainStrategy: 'positive',
            tickFormatter: value => `${Math.round(value)}%`,
          },
        }}
        xTickFormatter={formatDayTick}
        barGap={0}
        showBarPointValues={false}
        showLinePointValues={false}
        tooltipInteractionMode="item"
        tooltipRenderer={({label, currentData, series}) => {
          if (!currentData) return null;

          return (
            <div className="rounded-md border border-border bg-white px-4 py-3">
              <Text variant="14SB" className="font-InterSemiBold">
                {formatDate(new Date(label ?? ''), 'dd MMM yyyy')}
              </Text>

              <div className="mt-2 flex flex-col gap-1.5">
                <Text variant="14R" className="text-text-secondary!">
                  Daily Arbitrage Revenue:{' '}
                  <span style={{color: "#27BE8E"}} className="font-InterBold text-text-primary">
                    {formatCurrencyToPound(Number(currentData.arbitrage_revenue ?? 0))}
                  </span>
                </Text>
                <Text variant="14R" className="text-text-secondary!">
                  TB2 Capture Rate:{' '}
                  <span style={{color: 'var(--color-link)'}} className="font-InterBold text-text-primary">
                    {`${Math.round(Number(currentData.capture_rate ?? 0) * 100) / 100}%`}
                  </span>
                </Text>
              </div>
            </div>
          );
        }}
        series={[
          {
            key: 'arbitrage_revenue',
            label: 'Daily Arbitrage Revenue',
            color: 'var(--color-mint)',
            type: 'bar',
            yAxisId: 'left',
            tooltipLabel: 'Daily Arbitrage Revenue',
            valueFormatter: value => formatCurrencyToPound(value),
          },
          // {
          //   key: 'capture_rate',
          //   label: 'TB2 Capture Rate',
          //   color: 'var(--color-link)',
          //   type: 'line',
          //   yAxisId: 'right',
          //   tooltipLabel: 'TB2 Capture Rate',
          //   valueFormatter: value => `${Math.round(value * 100) / 100}%`,
          // },
        ]}
      /> */}

      {/* Daily TB Spread Details */}
      <TBSpreadDetailsTable
        columns={tbSpreadDetailsTableColumns}
        data={tbSpreadDetailsTableData}
        loading={tbSpreadDetailsLoading}
        onDownload={handleDownload}
        month={month ?? 1}
      />
    </div>
  );
}
