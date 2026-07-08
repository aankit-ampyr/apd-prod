import {Text, Skeleton, Icon} from '@/ui-kits';
import {useEffect, useMemo} from 'react';
import {cn, formatCurrencyToPound, formatMegaWatt} from '@/utils';
import {
  AnalyticsTable,
  WithFallback,
  DivergentBarChart,
  LineChart,
  SectionHeader,
  KeyValueCard,
  KeyValueCardItem,
} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetAnalysisOperationalRevenueLoading,
  assetOperationalAnalyticsResult,
  assetAnalysisOperationalMarketSummaryLoading,
  assetAnalysisOperationalRevenueError,
  assetAnalysisOperationalMarketSummaryError,
  assetAnalysisEnergyPriceComparisonLoading,
  assetAnalysisEnergyPriceComparisonError,
  assetAnalysisBatteryPowerOverTimeLoading,
  assetAnalysisBatteryPowerOverTimeError,
  assetEnergyPriceComparisonResult,
  assetBatteryPowerOverTimeResult,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {
  assetMarketSummaryRequest,
  assetOperationalAnalyticsRequest,
  assetEnergyPriceComparisonRequest,
  assetBatteryPowerOverTimeRequest,
} from '@/services/redux/slice';
import {CALENDAR_MONTHS_SHORT_NAMES} from '@/constants';
import {AssetOperationAnalytics, DataTableColumn} from '@/interface';

// ==================== Types ==============================
type Stat = {label: string; value: number | null | undefined};

type AncillaryService = AssetOperationAnalytics['ancillary_services_revenue'][number];

interface AssetOperationProps {
  assetId?: number | null;
  assetSystemGenerationId?: string;
  year?: number;
  month?: number;
}

const renderIfDefined = (value: any, renderFn: (value: any) => any, fallback?: React.ReactNode) => {
  return value != null ? renderFn(value) : fallback || value;
};

const formatTimeSeriesTick = (value: string | number): string => {
  const rawValue = String(value);
  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    const parts = rawValue.split('-');
    return parts.length >= 3 ? parts[2] : rawValue;
  }

  return String(date.getDate()).padStart(2, '0');
};

// ==================== colums ====================
const AncillaryServiceDataColums: DataTableColumn<AncillaryService>[] = [
  {
    name: 'service',
    title: <Text variant="caption">Service</Text>,
    width: {minWidth: '100px'},
    align: 'left',
    headerAlign: 'left',
    render: row => row.service,
  },
  {
    name: 'avg_price',
    title: <Text variant="caption">Avg Clearing Price (£)</Text>,
    width: {minWidth: '100px'},
    align: 'center',
    headerAlign: 'center',
    render: row => <span className="ml-30">{row.avg_clearing_price.toFixed(2).toString()}</span>,
  },
  {
    name: 'avg_availiblity',
    title: <Text variant="caption">Avg Availability (MW)</Text>,
    width: {minWidth: '100px'},
    align: 'right',
    headerAlign: 'right',
    render: row => row.avg_availability_mw.toFixed(2).toString(),
  },
];

export function AssetOperations(props: AssetOperationProps) {
  const {month, year, assetId, assetSystemGenerationId} = props;
  // ==============
  // hooks
  // ==============
  const dispatch = useDispatch();

  // ==============
  // selector
  // ==============
  const revenueLoading = useSelector(assetAnalysisOperationalRevenueLoading);
  const marketSummaryLoading = useSelector(assetAnalysisOperationalMarketSummaryLoading);
  const analytics = useSelector(assetOperationalAnalyticsResult);
  const energyPriceComparisonLoading = useSelector(assetAnalysisEnergyPriceComparisonLoading);
  const batteryPowerOverTimeLoading = useSelector(assetAnalysisBatteryPowerOverTimeLoading);
  const energyPriceComparisonError = useSelector(assetAnalysisEnergyPriceComparisonError);
  const batteryPowerOverTimeError = useSelector(assetAnalysisBatteryPowerOverTimeError);
  const energyPriceComparisonData = useSelector(assetEnergyPriceComparisonResult) ?? [];
  const batteryPowerOverTimeData = useSelector(assetBatteryPowerOverTimeResult) ?? [];
  const currentAsset = useSelector(currentSelectedAsset);

  const revenueError = useSelector(assetAnalysisOperationalRevenueError);
  const marketError = useSelector(assetAnalysisOperationalMarketSummaryError);

  // ==============
  // data
  // ==============
  const revenueData = ((): Stat[] => {
    return [
      {label: 'SFFR Revenue', value: analytics?.revenue_metrics?.sffr},
      {label: 'IDA1 Revenue', value: analytics?.revenue_metrics?.ida1},
      {label: 'EPEX 30 DA Revenue', value: analytics?.revenue_metrics?.epex_30_da},
      {label: 'Imbalance Revenue', value: analytics?.revenue_metrics?.imbalance_revenue},
      {label: 'Imbalance Charge', value: analytics?.revenue_metrics?.imbalance_charge},
      {label: 'Total Net Revenue', value: analytics?.revenue_metrics?.total_net_revenue},
    ];
  })();

  //
  const revenueDistributionData = ((): any[] => {
    if (!analytics) return [];
    if (!analytics?.revenue_metrics) return [];

    return [
      {label: 'SFFR', value: analytics.revenue_metrics?.sffr},
      {label: 'IDA1', value: analytics.revenue_metrics?.ida1},
      {label: 'EPEX 30 DA', value: analytics.revenue_metrics?.epex_30_da},
      {label: 'Imbalance (Net)', value: analytics.revenue_metrics?.net_imbalance},
    ];
  })();

  const dayAheadPriceData: KeyValueCardItem[] = [
    {
      label: 'Average',
      value: renderIfDefined(analytics?.market_prices?.day_ahead?.avg, formatCurrencyToPound, '-'),
    },
    {
      label: 'Minimum',
      value: renderIfDefined(analytics?.market_prices?.day_ahead?.min, formatCurrencyToPound, '-'),
    },
    {
      label: 'Maximum',
      value: renderIfDefined(analytics?.market_prices?.day_ahead?.max, formatCurrencyToPound, '-'),
    },
    {
      label: 'Std Dev',
      value: renderIfDefined(analytics?.market_prices?.day_ahead?.std_dev, formatCurrencyToPound, '-'),
    },
  ];

  const intraDayPriceData: KeyValueCardItem[] = [
    {
      label: 'Average',
      value: renderIfDefined(analytics?.market_prices?.intraday?.avg, formatCurrencyToPound, '-'),
    },
    {
      label: 'Minimum',
      value: renderIfDefined(analytics?.market_prices?.intraday?.min, formatCurrencyToPound, '-'),
    },
    {
      label: 'Maximum',
      value: renderIfDefined(analytics?.market_prices?.intraday?.max, formatCurrencyToPound, '-'),
    },
  ];

  const ancillaryServiceData = ((): AncillaryService[] => {
    if (!analytics || !analytics?.ancillary_services_revenue) {
      // return dummy data for ghost loader to work
      return Array.from({length: 6}).map(
        (_, index): AncillaryService => ({
          avg_availability_mw: index,
          avg_clearing_price: index,
          service: String(index),
        }),
      );
    }
    return analytics.ancillary_services_revenue;
  })();

  const avgDaMw = analytics?.trading_activity?.avg_da_mw ?? 0;
  const avgEpex30DaMw = analytics?.trading_activity?.avg_epex_30_da_mw ?? 0;
  const avgIda1Mw = analytics?.trading_activity?.avg_ida1_mw ?? 0;

  const energyPriceLineData = useMemo(() => energyPriceComparisonData, [energyPriceComparisonData]);
  const batteryPowerLineData = useMemo(() => batteryPowerOverTimeData, [batteryPowerOverTimeData]);

  // ==============
  // side effects
  // ==============
  useEffect(() => {
    if (!assetId) return;
    if (!month) return;
    if (!year) return;
    dispatch(assetOperationalAnalyticsRequest({assetId, month, year}));
    dispatch(assetMarketSummaryRequest({assetId, month, year}));
    dispatch(assetEnergyPriceComparisonRequest({assetId, month, year}));
    dispatch(assetBatteryPowerOverTimeRequest({assetId, month, year}));
  }, [assetId, month, year]);

  if (revenueError && marketError) {
    return (
      <div className="w-full h-full gap-4 flex justify-center items-center">
        <Icon name="infoCircle" className="size-6 text-error" />
        <Text variant="free" className="text-[22px] text-error! font-InterMedium">
          Analysis data not found
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}

      <div className="flex py-4 items-center justify-between">
        {revenueData.map(stat => (
          <AssetOperationStat
            isLoading={revenueLoading}
            key={stat.label}
            label={stat.label}
            value={stat.value ? formatCurrencyToPound(stat.value) : null}
            isActive={stat.label === 'Total Net Revenue'}
          />
        ))}
      </div>

      {/* Graphs */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: '65% 35%',
        }}>
        <DivergentBarChart
          isLoading={revenueLoading}
          downloadFileName={`Revenue_Sources_Distribution_${assetSystemGenerationId}_${CALENDAR_MONTHS_SHORT_NAMES[(month ?? 1) - 1]}_${year}`}
          data={revenueDistributionData}
          xKey="label"
          barWidth={60}
          yKey="value"
          title="Revenue Sources Distribution"
          className="h-full"
          chartClassName="h-[420px]"
          xAxisLabel="Sources"
          yAxisLabel="Revenue (£)"
          xAxisLabelProps={{
            offset: -35,
          }}
          yAxisLabelProps={{
            offset: 2,
          }}
          negativeValueLabelProps={{
            offset: 12,
          }}
          tooltipXLabel="Source"
          tooltipYLabel="Value"
        />

        {/* Market Prices Analysis */}
        <div className="flex flex-col gap-3 border border-border bg-white p-4 rounded-lg">
          <SectionHeader title="Market Prices Analysis" icon="search-analysis" />
          <KeyValueCard title="Day Ahead Price (EPEX)" data={dayAheadPriceData} loading={marketSummaryLoading} />
          <KeyValueCard title="Intraday Price" data={intraDayPriceData} loading={marketSummaryLoading} />
        </div>
      </div>

      {/* Ancillary Services Pricing */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Ancillary Services Pricing" icon="currency-pound" />
        <AnalyticsTable
          loading={marketSummaryLoading}
          columns={AncillaryServiceDataColums}
          data={ancillaryServiceData}
          tableClassName="min-w-full!"
        />
      </div>

      {/* Trading Activity */}
      <div className="gap-3 flex flex-col">
        <SectionHeader title="Trading Activity" icon="candle-stick" />

        <div className="grid grid-cols-3 gap-4">
          <AssetOperationStat
            isLoading={marketSummaryLoading}
            className="bg-white h-30 py-4 justify-evenly! px-8 rounded-md border-border border"
            label="Average DA MW"
            value={formatMegaWatt(avgDaMw)}
          />
          <AssetOperationStat
            isLoading={marketSummaryLoading}
            className="bg-white h-30 py-4 justify-evenly! px-8 rounded-md border-border border"
            label="Average EPEX 30 DA MW"
            value={formatMegaWatt(avgEpex30DaMw)}
          />
          <AssetOperationStat
            isLoading={marketSummaryLoading}
            className="bg-white h-30 py-4 justify-evenly! px-8 rounded-md border-border border"
            label="Average IDA1 MW"
            value={formatMegaWatt(avgIda1Mw)}
          />
        </div>
      </div>

      <div className="gap-3 flex flex-col">
        <SectionHeader icon="line-box" title="Time Series Analysis" />

        <div className="grid grid-cols-1 gap-4">
          <LineChart
            data={energyPriceLineData}
            downloadFileName={`${currentAsset?.asset_id}_${month}_${year}_energy_price_comparison_graph.png`}
            title="Energy Prices Comparison"
            chartClassName="min-h-120"
            isLoading={energyPriceComparisonLoading}
            chartMargin={{left: 50}}
            config={{
              yAxisLabelProps: {
                offset: 0,
              },
              xAxisLabelProps: {
                offset: -20,
              },
              yTickSpace: 90,
              xKey: 'timestamp',
              xAxisLabel: 'Date',
              yAxisLabel: 'Price (£/MWh)',
              showLegend: true,
              xTickFormatter: formatTimeSeriesTick,
              xTickInterval: 143,
              yTickStep: 40,
              lineStrokeWidth: 1,

              // hideFirstXAxisTickLabel: true,
              hideFirstYAxisTickLabel: true,
              tooltipCursor: {
                stroke: 'var(--color-text-secondary)',
              },
              tooltipValueFormatter: value => {
                if (!Number.isFinite(value)) return '-';
                const rounded = Math.round(value * 100) / 100;
                const rendered = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
                return `£${rendered}/MWh`;
              },
              lines: [
                {
                  key: 'day_ahead_price',
                  label: 'Day Ahead Price',
                  color: '#B81C00',
                  smooth: false,
                  showSymbol: false,
                },
                {
                  key: 'intraday_price',
                  label: 'Intraday Price',
                  color: 'var(--color-link)',
                  smooth: false,
                  showSymbol: false,
                },
              ],
            }}
          />

          <LineChart
            data={batteryPowerLineData}
            downloadFileName={`${currentAsset?.asset_id}_${month}_${year}_battery_power_graph.png`}
            title="Battery Power Over Time"
            isLoading={batteryPowerOverTimeLoading}
            chartMargin={{left: 50}}
            config={{
              yTickStep: 2,
              xKey: 'timestamp',
              hideFirstYAxisTickLabel: true,
              yAxisLabelProps: {
                offset: 0,
              },
              xAxisLabelProps: {
                offset: -20,
              },
              tooltipCursor: {
                stroke: 'var(--color-text-secondary)',
              },
              yTickSpace: 90,
              xAxisLabel: 'Date',
              yAxisLabel: 'Battery Power (MW)',
              xTickFormatter: formatTimeSeriesTick,
              xTickInterval: 143,
              lineStrokeWidth: 1,
              lines: [
                {
                  key: 'battery_power',
                  label: 'Battery Power',
                  color: 'var(--color-warning)',
                  smooth: false,
                  showSymbol: false,
                },
              ],
            }}
          />
        </div>

        {(energyPriceComparisonError || batteryPowerOverTimeError) && (
          <Text variant="small" className="text-error-text!">
            Some time series analysis data could not be loaded.
          </Text>
        )}
      </div>
    </div>
  );
}

interface AssetOperationStatInterface {
  label: string;
  value: string | null;
  valueTextClassName?: string;
  isActive?: boolean;
  className?: string;
  isLoading?: boolean;
}

function AssetOperationStat(props: AssetOperationStatInterface) {
  const {label, value, valueTextClassName, isActive, className, isLoading = false} = props;

  const isNegative = value?.includes('-');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Text variant="caption" className="text-text-secondary!">
        {label}
      </Text>
      <WithFallback
        isLoading={isLoading}
        fallback={
          <Skeleton animation="wave" variant="rectangular" width={114} height={24} className="rounded-full! -ml-1" />
        }>
        {value && (
          <Text
            variant="free"
            className={cn(
              'font-InterBold text-[22px] leading-[30px] text text-text-primary',
              isActive && 'text-primary!',
              isNegative && 'text-error-text!',
              valueTextClassName,
            )}>
            {value}
          </Text>
        )}
      </WithFallback>
    </div>
  );
}
