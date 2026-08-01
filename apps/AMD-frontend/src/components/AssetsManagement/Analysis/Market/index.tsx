import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  CalloutDonut,
  CalloutDonutLegendItem,
  CalloutDonutLegendItemProps,
  DivergentBarChart,
  Divider,
  SectionHeader,
  CommentTrigger,
} from '@/components';
import {AssetMarketUtilizationTypes, CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets} from '@/constants';
import {
  assetDetailsFetchLoading,
  assetBestMarketsAnalysisError,
  assetBestMarketsAnalysisLoading,
  assetBestMarketsAnalysisResult,
  assetMarketSummaryAnalysisError,
  assetMarketSummaryAnalysisLoading,
  assetMarketSummaryAnalysisResult,
  assetMarketUtilizationAnalysisError,
  assetMarketUtilizationAnalysisLoading,
  assetMarketUtilizationAnalysisResult,
  assetMarketStatisticsResult,
  assetMarketStatisticsLoading,
  assetMarketRevenueDistributionResult,
  assetMarketRevenueDistributionLoading,
} from '@/services/redux/selectors';
import {
  assetBestMarketsAnalysisRequest,
  assetMarketSummaryAnalysisRequest,
  assetMarketUtilizationAnalysisRequest,
  assetMarketStatisticsRequest,
  assetMarketRevenueDistributionRequest,
} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {cn, formatCurrencyToPound} from '@/utils';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {DataTableColumn, SelectInputItem, AssetMarketAnalytics} from '@/interface';
import {Icon, SelectInput, Text, Tooltip} from '@/ui-kits';
import {AssetAnalysisTabProps} from '../types';
import {MarketKpiCards, MarketSummaryKpi} from './MarketKPI';
import {BestMarketsTable} from './BestMarketTable';
import {StatisticsTable} from './StatisticsTable';

type AssetMarketStrategy = AssetMarketAnalytics['utilization']['market_strategy'];
type BestMarketRow = NonNullable<AssetMarketAnalytics['best_markets']['buying_markets']>[number];
type MarketStatisticsRow = NonNullable<AssetMarketAnalytics['statistics']['rows']>[number];

const marketUtilizationOptions: SelectInputItem[] = [
  {id: AssetMarketUtilizationTypes.MULTI_MARKET, label: 'Multi Market'},
  {id: AssetMarketUtilizationTypes.EPEX_ONLY_DAILY, label: 'EPEX-only (daily)'},
  {id: AssetMarketUtilizationTypes.EPEX_ONLY_EFA, label: 'EPEX-only (EFA)'},
  {id: AssetMarketUtilizationTypes.ACTUAL, label: 'Actual'},
];

const marketUtilizationStrategyMap: Record<number, AssetMarketStrategy> = {
  [AssetMarketUtilizationTypes.MULTI_MARKET]: 'multi',
  [AssetMarketUtilizationTypes.EPEX_ONLY_DAILY]: 'epex_daily',
  [AssetMarketUtilizationTypes.EPEX_ONLY_EFA]: 'epex_efa',
  [AssetMarketUtilizationTypes.ACTUAL]: 'actual',
};

const marketUtilizationColorsPalette = {
  buy: ['#F38A00', '#FCB400', '#F7C627', '#FDB772'],
  sell: ['#14A155', '#00CC3A', '#ACD65A', '#33DE83'],
} as const;

const renderCurrency = (value: number | null | undefined) => (value == null ? '-' : formatCurrencyToPound(value));

const EPEX_BAR_COLORS = {
  EPEX: '#FF859F',
  SFFR: '#999EDD',
} as const;
const MULTI_MARKET_REVENUE_COLORS = {
  positive: '#29C48E',
  negative: '#E04848',
} as const;

function getMarketColor(marketLabel: string) {
  const label = marketLabel.toLowerCase().replace('-', '_');
  const colorMapping = {
    idle: '#B6B3B3',
    sffr: '#999EDD',
    imbalance: '#C99D35',
    ida1: '#6ABECF',
    epex: '#FF859F',

    // sell columns
    sell_ssp: '#14A155',
    sell_sbp: 'var(--color-success)',
    sell_epex: '#00CC3A',
    sell_isem: '#ACD65A',
    sell_da_hh: '#33DE83',
    sell_ida1: '#ACD65A',

    // buys colums
    buy_ssp: '#F38A00',
    buy_sbp: '#FF7681',
    buy_epex: '#FCB400',
    buy_ida1: '#F7C627',
    buy_isem: '#F3C323',
    buy_da_hh: '#FDB772',
  } as Record<string, string>;
  return colorMapping[label] ?? '';
}

function getRevenueBarColor(marketLabel: string, revenue: number, isEpexOnlyView: boolean) {
  const normalized = marketLabel.toLowerCase().replace(/[_\s]+/g, '-');

  if (isEpexOnlyView && normalized.includes('sffr')) return EPEX_BAR_COLORS.SFFR;
  if (isEpexOnlyView && (normalized === 'epex' || normalized.includes('epex'))) {
    return EPEX_BAR_COLORS.EPEX;
  }

  return revenue < 0 ? MULTI_MARKET_REVENUE_COLORS.negative : MULTI_MARKET_REVENUE_COLORS.positive;
}

interface MarketOptimizationProps extends AssetAnalysisTabProps {}
export function AssetMarket(props: MarketOptimizationProps) {
  const {assetId, assetSystemGenerationId, month, year} = props;

  // =================
  // hooks
  // =================
  const dispatch = useDispatch();
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  // =================
  // selectors
  // =================
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const summary = useSelector(assetMarketSummaryAnalysisResult);
  const summaryLoading = useSelector(assetMarketSummaryAnalysisLoading);
  const summaryError = useSelector(assetMarketSummaryAnalysisError);

  const utilization = useSelector(assetMarketUtilizationAnalysisResult);
  const utilizationLoading = useSelector(assetMarketUtilizationAnalysisLoading);
  const utilizationError = useSelector(assetMarketUtilizationAnalysisError);

  const bestMarkets = useSelector(assetBestMarketsAnalysisResult);
  const bestMarketsLoading = useSelector(assetBestMarketsAnalysisLoading);
  const bestMarketsError = useSelector(assetBestMarketsAnalysisError);

  const marketStatistics = useSelector(assetMarketStatisticsResult);
  const marketStatisticsLoading = useSelector(assetMarketStatisticsLoading);

  const revenueDistribution = useSelector(assetMarketRevenueDistributionResult);
  const revenueDistributionLoading = useSelector(assetMarketRevenueDistributionLoading);

  // =================
  // states
  // =================
  const [selectedMarketUtilization, setSelectedMarketUtilization] = useState<SelectInputItem['id']>(
    AssetMarketUtilizationTypes.MULTI_MARKET,
  );
  const marketSummaryError = Boolean(summaryError);
  const marketUtilizationHasError = Boolean(utilizationError);
  const isEpexOnlyView = [
    AssetMarketUtilizationTypes.EPEX_ONLY_DAILY,
    AssetMarketUtilizationTypes.EPEX_ONLY_EFA,
  ].includes(Number(selectedMarketUtilization));
  const selectedStrategy = marketUtilizationStrategyMap[Number(selectedMarketUtilization)];
  const buyingMarkets = useMemo(() => bestMarkets?.buying_markets ?? [], [bestMarkets]);
  const sellingMarkets = useMemo(() => bestMarkets?.selling_markets ?? [], [bestMarkets]);

  const kpiCards: MarketSummaryKpi[] = [
    {
      label: 'Actual Revenue',
      value: summary?.actual_revenue ? renderCurrency(summary?.actual_revenue) : '-',
      description: 'Recorded revenue from actual operation',
      valueColor: '#0086F3',
      bgGradientStartColor: '#E8F7FF',
      borderColor: '#91ABF9',
    },
    {
      label: 'EPEX-Only (Daily) Revenue',
      value: summary?.epex_daily?.total_revenue ? renderCurrency(summary?.epex_daily?.total_revenue) : '-',
      description: 'Baseline optimization',
      deltaLabel: 'vs Actual',
    },
    {
      label: 'EPEX-Only (EFA) Revenue',
      value: summary?.epex_efa?.total_revenue ? renderCurrency(summary.epex_efa?.total_revenue) : '-',
      description: 'Block-level EPEX optimization',
      delta: summary?.epex_efa?.improvement ?? 0,
      deltaLabel: 'vs EPEX-Daily',
    },
    {
      label: 'Multi Market Revenue',
      value: summary?.multi_market?.total_revenue ? renderCurrency(summary.multi_market?.total_revenue) : '-',
      description: 'Cross-market optimization',
      delta: summary?.multi_market?.improvement ?? 0,
      deltaLabel: 'vs EPEX-Daily',
    },
    {
      label: 'Potential Optimised Revenue',
      value: summary?.additional_revenue ? renderCurrency(summary.additional_revenue) : '-',
      description: 'Optimized - EPEX only daily',
      valueColor: 'var(--color-success)',
      bgGradientStartColor: '#E0FFEF',
      borderColor: '#A1E5AB',
    },
  ];

  /**
   * ======================
   * Memoized State
   * ======================
   */

  const revenueChartData = useMemo(() => {
    if (!revenueDistribution) {
      return [];
    }
    return revenueDistribution?.chart_data?.map(row => {
      return {
        label: row.market,
        value: row.revenue,
        color: getRevenueBarColor(row.market, row.revenue, isEpexOnlyView),
      };
    });
  }, [isEpexOnlyView, revenueDistribution]);

  const utilizationDonutData = useMemo(() => {
    return (
      utilization?.data?.map(row => ({
        label: row.market_used,
        value: row.count,
        percentage: row.percentage,
        color: getMarketColor(row.market_used),
      })) ?? []
    );
  }, [utilization]);

  const buyCount = utilizationDonutData.reduce((acc, item) => {
    if (item.label.toLowerCase().includes('buy')) {
      return acc + item.value;
    }
    return acc;
  }, 0);
  const sellCount = utilizationDonutData.reduce((acc, item) => {
    if (item.label.toLowerCase().includes('sell')) {
      return acc + item.value;
    }
    return acc;
  }, 0);

  const renderUtilizationLegend = useCallback((items: CalloutDonutLegendItemProps[], isFullScreen?: boolean) => {
    if (isFullScreen) {
      return (
        <div className="w-full flex flex-wrap gap-x-8 gap-y-8 pt-2 min-[1026px]:pl-10">
          {items.map(item => (
            <CalloutDonutLegendItem {...item} key={item.label} className="w-[calc(20%-1.6rem)] min-w-0! shrink-0" />
          ))}
        </div>
      );
    }

    const isBuyItem = (item: CalloutDonutLegendItemProps) => item.label.toLowerCase().startsWith('buy');
    const isSellItem = (item: CalloutDonutLegendItemProps) => item.label.toLowerCase().startsWith('sell');

    const buyItems = items.filter(isBuyItem);
    const sellItems = items.filter(isSellItem);
    const remainingItems = items.filter(item => !isBuyItem(item) && !isSellItem(item));

    const chunkIntoColumns = <T,>(list: T[], chunkSize: number) => {
      const columns: T[][] = [];
      for (let index = 0; index < list.length; index += chunkSize) {
        columns.push(list.slice(index, index + chunkSize));
      }
      return columns;
    };

    const columns = [buyItems, sellItems, ...chunkIntoColumns(remainingItems, 4)].filter(column => column.length > 0);

    return (
      <div className={cn('flex flex-wrap items-start justify-start gap-x-10 gap-y-8', isTablet && 'gap-x-4 gap-y-4')}>
        {columns.map((column, columnIndex) => (
          <div
            key={`${columnIndex}-${column[0]?.label ?? 'legend'}`}
            className={cn('flex flex-col gap-8', isTablet && 'gap-4')}>
            {column.map(item => (
              <CalloutDonutLegendItem {...item} key={item.label} />
            ))}
          </div>
        ))}
      </div>
    );
  }, []);

  const computedMarketStatistics = (() => {
    if (marketStatisticsLoading && !marketStatistics) {
      return [];
    }
    return marketStatistics?.rows.filter(item => item.market !== 'TOTAL') ?? [];
  })();

  // =================
  // data colums
  // =================
  const bestMarketColumns = useCallback<
    (marketMode: keyof typeof marketUtilizationColorsPalette) => DataTableColumn<BestMarketRow>[]
  >(
    marketMode => [
      {
        name: 'market',
        title: (
          <Text variant="14R" className="text-text-primary!">
            Market
          </Text>
        ),
        align: 'left',
        render: row => (
          <Text variant="14R" className="text-text-primary!">
            {row.market}
          </Text>
        ),
      },
      {
        name: 'percentage',
        title: (
          <div className="flex items-center-safe gap-2 justify-end">
            <Text variant="14R" className="text-text-primary!">
              Percentage
            </Text>
            <div className="relative group">
              <Icon className="text-primary!" name="circle-info" />
              {
                <Tooltip
                  portal
                  message={' % = (Periods in Market / Total Periods) x 100%'}
                  position={marketMode === 'buy' ? 'top' : 'left-top'}
                />
              }
            </div>
          </div>
        ),
        align: 'right',
        renderCell: ({row, index}) => (
          <div className="flex gap-4 items-center-safe">
            <div className="h-1.5 bg-bg-card grow rounded-2xl -translate-x-10">
              <div
                style={{
                  width: `${row.percentage}%`,
                  backgroundColor:
                    marketUtilizationColorsPalette[marketMode][
                      index % marketUtilizationColorsPalette[marketMode].length
                    ],
                }}
                className="h-full rounded-2xl"
              />
            </div>
            <Text variant="14R" className="text-text-primary!">
              {`${Number(row.percentage)?.toFixed(1)}%`}
            </Text>
          </div>
        ),
      },
    ],
    [],
  );

  const statisTicsColums = useMemo<DataTableColumn<MarketStatisticsRow>[]>(
    () => [
      {
        name: 'market',
        title: (
          <Text variant="14R" className="text-text-primary!">
            Market
          </Text>
        ),
        align: 'left',
        render: row => (
          <Text variant="14R" className="text-text-primary!">
            {row.market}
          </Text>
        ),
      },
      {
        name: 'percentage_of_time',
        title: (
          <Text variant="14R" className="text-text-primary!">
            % of Time
          </Text>
        ),
        align: 'center',
        render: row => (
          <Text variant="14R" className="text-text-primary!">
            {`${Number(row.percentage_time)?.toFixed(1)}%`}
          </Text>
        ),
      },
      {
        name: 'revenue',
        title: (
          <Text variant="14R" className="text-text-primary!">
            Revenue
          </Text>
        ),
        align: 'right',
        render: row => (
          <Text variant="14R" className="text-text-primary!">
            {row.revenue}
          </Text>
        ),
      },
      {
        name: 'percentage_of_revenue',
        title: (
          <Text variant="14R" className="text-text-primary!">
            % of Revenue
          </Text>
        ),
        align: 'right',
        render: row => (
          <Text variant="14R" className="text-text-primary!">
            {`${Number(row.percentage_revenue)?.toFixed(1)}%`}
          </Text>
        ),
      },
    ],
    [],
  );

  // =================
  // side effects
  // =================
  useEffect(() => {
    if (!assetId || !month || !year) return;
    dispatch(assetMarketUtilizationAnalysisRequest({assetId, month, year, market_strategy: selectedStrategy}));
    dispatch(assetMarketStatisticsRequest({assetId, month, year, market_strategy: selectedStrategy}));
    dispatch(assetMarketRevenueDistributionRequest({assetId, month, year, market_strategy: selectedStrategy}));
    if (selectedStrategy == 'multi') {
      dispatch(assetBestMarketsAnalysisRequest({assetId, month, year}));
    }
  }, [assetId, month, year, selectedStrategy, dispatch]);

  /**
   * sep api call that does not depends on selectedStratergy
   */
  useEffect(() => {
    if (!assetId || !month || !year) return;
    dispatch(assetMarketSummaryAnalysisRequest({assetId, month, year}));
  }, [assetId, month, year, dispatch]);

  useEffect(() => {
    if (!assetId) return;
    dispatch(
      fetchCommentsRequest({
        assetId: Number(assetId),
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.MarketOptimization,
        context_year: year ?? undefined,
      }),
    );
  }, [assetId, dispatch, year]);

  // =================
  // render guards
  // =================
  if (marketSummaryError && marketUtilizationHasError) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-4">
        <Text variant="free" className="text-[22px] text-error! font-InterMedium">
          Market analysis data not found
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <MarketKpiCards cards={kpiCards} loading={summaryLoading || assetLoading} />

      <Text variant="14R" className="text-text-secondary! -mt-2">
        <span className="font-InterBold text-text-secondary!">Note :</span> All revenue values are shown after deducting
        the 5% GridBeyond revenue share.
      </Text>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader
          icon="bulls-eye"
          title="Market Utilization & Revenue"
          subtitle="Select a strategy to view market and revenue distribution"
        />

        <SelectInput
          isFilter
          value={selectedMarketUtilization}
          options={marketUtilizationOptions}
          onChange={item => setSelectedMarketUtilization(item.id)}
          wrapperClassName="bg-white! border-border!"
          className="w-full lg:w-85"
        />
      </div>

      <div className={cn('grid gap-4', isEpexOnlyView ? 'md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr]' : 'grid-cols-1')}>
        <CalloutDonut
          data={utilizationDonutData}
          title="Market Selection Distribution"
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketOptimization}
              contextWidget={ViewAnalysisWidgets.MarketSelectionDistribution}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_Market_Utilization.png`}
          isLoading={utilizationLoading || assetLoading}
          orientation={!isEpexOnlyView ? 'horizontal' : 'vertical'}
          renderCenterContent
          centerContentLabel="Total Periods"
          legendRenderer={!isEpexOnlyView ? renderUtilizationLegend : undefined}
          customTooltipRenderer={({color, label, percentage, value}) => {
            return (
              <div className="min-w-40 py-2 px-4 rounded-md bg-white! z-99999 flex flex-col gap-2 border border-border">
                <Text variant="16SB">{label}</Text>
                <Text variant="14M">Periods : {value}</Text>
                <Text variant="14M" style={{color}}>
                  {percentage}%
                </Text>
              </div>
            );
          }}
          centerContentChildren={isFullScreen => {
            const Cell = ({color, label, value}: {color: string; label: string; value: number}) => (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <div
                    style={{backgroundColor: color, width: isFullScreen ? 12 : 8, height: isFullScreen ? 12 : 8}}
                    className="border-border border rounded-lg"
                  />
                  <Text
                    style={{
                      fontSize: isFullScreen ? 14 : 10,
                    }}
                    className="text-text-secondary! uppercase">
                    {label}
                  </Text>
                </div>
                <Text variant={isFullScreen ? '18M' : '14M'}>{value}</Text>
              </div>
            );
            return !isEpexOnlyView ? (
              <div className="flex gap-2 items-center">
                <Cell color="#F38A00" label="buy" value={buyCount} />
                <Divider orientation="vertical" className="w-0.5!" />
                <Cell color="#14A155" label="sell" value={sellCount} />
              </div>
            ) : null;
          }}
          shapeConfig={{
            padAngle: 0.01,
            segmentRadius: 4,
          }}
        />
        <DivergentBarChart
          title="Revenue Distribution"
          data={revenueChartData}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketOptimization}
              contextWidget={ViewAnalysisWidgets.RevenueDistribution}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          downloadFileName={`market_utilization_${assetSystemGenerationId ?? assetId ?? 'asset'}_${month}_${year}_${selectedStrategy}_revenue_distribution.png`}
          isLoading={revenueDistributionLoading || assetLoading}
          className={cn(!isEpexOnlyView && 'mt-4', 'shadow-none! pt-6 pb-2 px-4 rounded-md')}
          chartClassName="h-[360px] md:h-[420px]"
          xKey="label"
          yKey="value"
          barWidth={54}
          showValues
          xAxisLabel="Market"
          yAxisLabel="Revenue (£)"
          tooltipXLabel="Market"
          tooltipYLabel="Revenue"
          zeroLineColor="var(--color-border)"
          xAxisLabelProps={{offset: -40}}
          yAxisLabelProps={{offset: 7}}
          negativeValueLabelProps={{offset: 12}}
        />
      </div>

      <div className="mt-2">
        <StatisticsTable
          market_strategy={selectedStrategy}
          rows={computedMarketStatistics ?? []}
          columns={statisTicsColums}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketOptimization}
              contextWidget={ViewAnalysisWidgets.MarketStatistics}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          loading={marketStatisticsLoading || assetLoading}
          assetId={assetId}
          month={month}
          year={year}
          assetSystemGenerationId={assetSystemGenerationId}
        />
      </div>

      {selectedStrategy === 'multi' && (
        <div className="flex flex-col gap-3 mt-4">
          <SectionHeader title="Best Markets by Period" icon="growth" />
          <div className="grid gap-4 lg:grid-cols-2">
            <BestMarketsTable
              title="Market Selected for Charging (Buying)"
              rows={buyingMarkets}
              columns={bestMarketColumns('buy')}
              customActions={
                <CommentTrigger
                  contextModule={CommentModule.ViewAnalysis}
                  contextTab={ViewAnalysisTabs.MarketOptimization}
                  contextWidget={ViewAnalysisWidgets.MarketSelectedCharging}
                  contextType={CommentContextType.Widget}
                  contextAssetId={assetId}
                  contextYear={year}
              contextMonth={month}
                  variant="icon-only"
                  className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
                  iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
                />
              }
              loading={bestMarketsLoading || assetLoading}
              marketType="buy"
              assetId={assetId}
              month={month}
              year={year}
              assetSystemGenerationId={assetSystemGenerationId}
            />
            <BestMarketsTable
              title="Markets Selected for Discharging (selling)"
              rows={sellingMarkets}
              columns={bestMarketColumns('sell')}
              customActions={
                <CommentTrigger
                  contextModule={CommentModule.ViewAnalysis}
                  contextTab={ViewAnalysisTabs.MarketOptimization}
                  contextWidget={ViewAnalysisWidgets.MarketSelectedDischarging}
                  contextType={CommentContextType.Widget}
                  contextAssetId={assetId}
                  contextYear={year}
              contextMonth={month}
                  variant="icon-only"
                  className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
                  iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
                />
              }
              loading={bestMarketsLoading || assetLoading}
              marketType="sell"
              assetId={assetId}
              month={month}
              year={year}
              assetSystemGenerationId={assetSystemGenerationId}
            />
          </div>
          {Boolean(bestMarketsError) && (
            <Text variant="14R" className="text-error!">
              Best markets data could not be loaded.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
