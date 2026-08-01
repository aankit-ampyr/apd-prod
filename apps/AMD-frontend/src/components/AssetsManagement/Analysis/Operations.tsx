import {Text, Skeleton} from '@/ui-kits';
import {useEffect} from 'react';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {cn, formatCurrencyToPound, formatMegaWatt} from '@/utils';
import {
  AnalyticsTable,
  WithFallback,
  DivergentBarChart,
  LineChart,
  SectionHeader,
  KeyValueCard,
  KeyValueCardItem,
  CommentTrigger,
} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetAnalysisBatteryPowerOverTimeLoading,
  assetAnalysisEnergyPriceComparisonLoading,
  assetAnalysisOperationalRevenueLoading,
  assetAnalysisOperationalSummaryResult,
  assetBatteryPowerOverTimeResult,
  assetEnergyPriceComparisonResult,
  assetOperationalMarketSummaryLoading,
  assetOperationalMarketSummaryResult,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {
  assetMarketSummaryRequest,
  assetOperationalAnalyticsRequest,
  assetEnergyPriceComparisonRequest,
  assetBatteryPowerOverTimeRequest,
} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {CALENDAR_MONTHS_SHORT_NAMES, CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets} from '@/constants';
import {AssetOperationAnalytics, DataTableColumn} from '@/interface';

// ==================== Types ==============================
type Stat = {label: string; value: number | null | undefined};

type AncillaryService = AssetOperationAnalytics['market_summary']['ancillary_services'][number];

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
  const {width: windowWidth} = useWindowDimensions();
  const isTablet = windowWidth <= TABLET_SCREEN_BREAKPOINT;

  // ==============
  // selector
  // ==============
  const currentAsset = useSelector(currentSelectedAsset);

  const summaryData = useSelector(assetAnalysisOperationalSummaryResult);
  const summaryLoading = useSelector(assetAnalysisOperationalRevenueLoading);

  const marketSummaryData = useSelector(assetOperationalMarketSummaryResult);
  const marketSummaryLoading = useSelector(assetOperationalMarketSummaryLoading);

  const energyPriceComparisonData = useSelector(assetEnergyPriceComparisonResult);
  const energyPriceComparisonLoading = useSelector(assetAnalysisEnergyPriceComparisonLoading);

  const batteryPowerOverTimeData = useSelector(assetBatteryPowerOverTimeResult);
  const batteryPowerOverTimeLoading = useSelector(assetAnalysisBatteryPowerOverTimeLoading);



  // ==============
  // data
  // ==============
  const kpiData = ((): Stat[] => {
    return [
      {label: 'SFFR Revenue', value: summaryData?.trading_analysis?.sffr},
      {label: 'IDA1 Revenue', value: summaryData?.trading_analysis?.ida1},
      {label: 'EPEX 30 DA Revenue', value: summaryData?.trading_analysis?.epex_30_da},
      {label: 'Imbalance Revenue', value: summaryData?.trading_analysis?.imbalance_revenue},
      {label: 'Imbalance Charge', value: summaryData?.trading_analysis?.imbalance_charge},
      {label: 'Total Net Revenue', value: summaryData?.trading_analysis?.total_net_revenue},
    ];
  })();

  const revenueDistributionData = ((): any[] => {
    if (!summaryData) return [];
    if (!summaryData?.revenue_distribution) return [];

    return [
      {label: 'SFFR', value: summaryData.trading_analysis?.sffr},
      {label: 'IDA1', value: summaryData.trading_analysis?.ida1},
      {label: 'EPEX 30 DA', value: summaryData.trading_analysis?.epex_30_da},
      {label: 'Imbalance (Net)', value: summaryData.trading_analysis?.net_imbalance},
    ];
  })();

  const dayAheadPriceData: KeyValueCardItem[] = [
    {
      label: 'Average',
      value: renderIfDefined(marketSummaryData?.market_prices?.day_ahead?.avg, formatCurrencyToPound, '-'),
    },
    {
      label: 'Minimum',
      value: renderIfDefined(marketSummaryData?.market_prices?.day_ahead?.min, formatCurrencyToPound, '-'),
    },
    {
      label: 'Maximum',
      value: renderIfDefined(marketSummaryData?.market_prices?.day_ahead?.max, formatCurrencyToPound, '-'),
    },
    {
      label: 'Std Dev',
      value: renderIfDefined(marketSummaryData?.market_prices?.day_ahead?.std_dev, formatCurrencyToPound, '-'),
    },
  ];

  const intraDayPriceData: KeyValueCardItem[] = [
    {
      label: 'Average',
      value: renderIfDefined(marketSummaryData?.market_prices?.intraday?.avg, formatCurrencyToPound, '-'),
    },
    {
      label: 'Minimum',
      value: renderIfDefined(marketSummaryData?.market_prices?.intraday?.min, formatCurrencyToPound, '-'),
    },
    {
      label: 'Maximum',
      value: renderIfDefined(marketSummaryData?.market_prices?.intraday?.max, formatCurrencyToPound, '-'),
    },
  ];

  const ancillaryServiceData = ((): AncillaryService[] => {
    if (!marketSummaryData || !marketSummaryData?.ancillary_services || marketSummaryLoading) {
      // return dummy data for ghost loader to work
      return Array.from({length: 6}).map(
        (_, index): AncillaryService => ({
          avg_availability_mw: index,
          avg_clearing_price: index,
          service: String(index),
        }),
      );
    }
    return marketSummaryData?.ancillary_services ?? [];
  })();

  const avgDaMw = marketSummaryData?.trading_activity?.avg_da_mw ?? 0;
  const avgEpex30DaMw = marketSummaryData?.trading_activity?.avg_epex_30_da_mw ?? 0;
  const avgIda1Mw = marketSummaryData?.trading_activity?.avg_ida1_mw ?? 0;

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

  useEffect(() => {
    if (!assetId) return;
    dispatch(
      fetchCommentsRequest({
        assetId,
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.Operations,
        context_year: year ?? undefined,
      })
    );
  }, [assetId, dispatch, year]);


  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}

      <div className={cn('flex py-4 items-center justify-between', isTablet && 'gap-4 overflow-x-auto no-scrollbar')}>
        {kpiData.map(stat => (
          <AssetOperationStat
            isLoading={summaryLoading}
            key={stat.label}
            label={stat.label}
            value={stat.value ? formatCurrencyToPound(stat.value) : null}
            isActive={stat.label === 'Total Net Revenue'}
          />
        ))}
      </div>

      {/* Graphs */}
      <div
        className={cn(isTablet && 'flex! flex-col!')}
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: isTablet ? undefined : '65% 35%',
        }}>
        <DivergentBarChart
          isLoading={summaryLoading}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.Operations}
              contextWidget={ViewAnalysisWidgets.RevenueSourcesDistribution}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
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
          <SectionHeader
            title="Market Prices Analysis"
            icon="search-analysis"
            action={
              <CommentTrigger
                contextModule={CommentModule.ViewAnalysis}
                contextTab={ViewAnalysisTabs.Operations}
                contextWidget={ViewAnalysisWidgets.MarketPricesAnalysis}
                contextType={CommentContextType.Widget}
                contextAssetId={assetId}
                contextYear={year}
              contextMonth={month}
                variant="icon-only"
                className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
                iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
              />
            }
          />
          <div className={cn('flex flex-col gap-3', isTablet && 'grid grid-cols-2')}>
            <KeyValueCard title="Day Ahead Price (EPEX)" data={dayAheadPriceData} loading={marketSummaryLoading} />
            <KeyValueCard
              title="Intraday Price"
              data={intraDayPriceData}
              loading={marketSummaryLoading}
              className={cn(
                isTablet &&
                  'flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:flex-1 [&>div:last-child>div]:flex-1 [&>div:last-child>div>div]:items-center',
              )}
            />
          </div>
        </div>
      </div>

      {/* Ancillary Services Pricing */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title="Ancillary Services Pricing"
          icon="currency-pound"
          action={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.Operations}
              contextWidget={ViewAnalysisWidgets.AncillaryServicesPricing}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
        />
        <AnalyticsTable
          loading={marketSummaryLoading}
          columns={AncillaryServiceDataColums}
          data={ancillaryServiceData}
          tableClassName="min-w-full!"
        />
      </div>

      {/* Trading Activity */}
      <div className="gap-3 flex flex-col">
        <SectionHeader
          title="Trading Activity"
          icon="candle-stick"
        />

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
            data={energyPriceComparisonData ?? []}
            customActions={
              <CommentTrigger
                contextModule={CommentModule.ViewAnalysis}
                contextTab={ViewAnalysisTabs.Operations}
                contextWidget={ViewAnalysisWidgets.EnergyPricesComparison}
                contextType={CommentContextType.Widget}
                contextAssetId={assetId}
                contextYear={year}
              contextMonth={month}
                variant="icon-only"
                className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
                iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
              />
            }
            downloadFileName={`${currentAsset?.asset_id}_${month}_${year}_energy_price_comparison_graph.png`}
            title="Energy Prices Comparison"
            chartClassName={cn('min-h-120', isTablet && 'min-h-[350px]')}
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
            data={batteryPowerOverTimeData ?? []}
            customActions={
              <CommentTrigger
                contextModule={CommentModule.ViewAnalysis}
                contextTab={ViewAnalysisTabs.Operations}
                contextWidget={ViewAnalysisWidgets.BatteryPowerOverTime}
                contextType={CommentContextType.Widget}
                contextAssetId={assetId}
                contextYear={year}
              contextMonth={month}
                variant="icon-only"
                className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
                iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
              />
            }
            downloadFileName={`${currentAsset?.asset_id}_${month}_${year}_battery_power_graph.png`}
            title="Battery Power Over Time"
            isLoading={batteryPowerOverTimeLoading}
            chartClassName={cn('min-h-120', isTablet && 'min-h-[350px]')}
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
