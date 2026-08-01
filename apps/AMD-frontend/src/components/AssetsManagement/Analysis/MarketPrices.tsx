import {ThresholdBarGraph, LineChart, Section, CorrelationMatrix, CommentTrigger} from '@/components';
import {CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets, WidgetDataPointPayload} from '@/constants';
import {Text} from '@/ui-kits';
import {formatCurrencyToPound} from '@/utils';
import {useEffect, useMemo} from 'react';
import {AssetAnalysisTabProps} from './types';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetMarketHourlyPricePatternsRequest,
  getAssetMarketPriceCorrelationMatrixRequest,
  getAssetMarketPriceSpreadRequest,
  getAssetMarketPriceVolatilityRequest,
} from '@/services/redux/slice';
import {setActiveContext, setPanelOpen, fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {
  assetDetailsFetchLoading,
  assetMarketHourlyPricePatternsLoading,
  assetMarketHourlyPricePatternsResult,
  assetMarketPriceCorrelationMatrixLoading,
  assetMarketPriceCorrelationMatrixResult,
  assetMarketPriceSpreadLoading,
  assetMarketPriceSpreadResult,
  assetMarketPriceVolatilityLoading,
  assetMarketPriceVolatilityResult,
} from '@/services/redux/selectors';
import {GradientKPIObject, GradientKPI} from '../common';
import {BarDataPoint} from '@lazarus/react-common';

interface TopMissedOpportunityDays {
  date: string;
  periods: number;
}

interface AssetMarketPricesProps extends AssetAnalysisTabProps {}
export function AssetMarketPrices(props: AssetMarketPricesProps) {
  const {assetId, assetSystemGenerationId, month, year} = props;

  // ===================
  // hooks
  // ===================
  const dispatch = useDispatch();

  // ===================
  // selectors
  // ===================
  const assetLoading = useSelector(assetDetailsFetchLoading);

  const marketPriceSpreadData = useSelector(assetMarketPriceSpreadResult);
  const marketPriceSpreadLoading = useSelector(assetMarketPriceSpreadLoading);

  const marketHourlyPricePatternsData = useSelector(assetMarketHourlyPricePatternsResult);
  const marketHourlyPricePatternsLoading = useSelector(assetMarketHourlyPricePatternsLoading);

  const marketPriceVolatilityData = useSelector(assetMarketPriceVolatilityResult);
  const marketPriceVolatilityLoading = useSelector(assetMarketPriceVolatilityLoading);

  const marketPriceCorrelationMatrixData = useSelector(assetMarketPriceCorrelationMatrixResult);
  const marketPriceCorrelationMatrixLoading = useSelector(assetMarketPriceCorrelationMatrixLoading);

  const allComments = useSelector((state: any) => state.comment.comments || []);
  const getCommentCountForDataPoint = <W extends WidgetDataPointPayload['context_widget']>(
    widgetId: W,
    label: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
  ) => {
    return allComments.reduce((acc: number, c: any) => {
      if (c.context_widget !== widgetId) return acc;
      if (c.context_data_point !== label) return acc;
      return acc + 1 + (c.replies?.length || 0);
    }, 0);
  };

  const handleBadgeClick = <W extends WidgetDataPointPayload['context_widget']>(
    widgetId: W,
    label: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
  ) => {
    dispatch(
      setActiveContext({
        context_type: CommentContextType.DataPoint,
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.MarketPrices,
        context_widget: widgetId,
        context_data_point: label,
        context_asset_id: assetId,
        context_year: year,
        context_month: month,
      })
    );
    dispatch(setPanelOpen(true));
  };

  // ===================
  // states and data
  // ===================
  const epexSpreadBarThresholdColor = '#6FC6D9';
  const epexSpreadBarColor = 'var(--color-light-blue)';
  const epexSpreadBarHoverColor = 'var(--color-blue-2)';
  const epexSpreadLineColor = '#018CA8';
  const epexSpreadThreshold = marketPriceSpreadData?.spread_analysis?.epex_avg_daily_spread_per_mwh || 0;
  const epexSpreadThresholdLabel = (viewBox: any) => (
    <g>
      <text
        x={viewBox.x + 8 + viewBox.width + 28}
        y={viewBox.y - 20}
        fill="var(--color-text-secondary)"
        fontSize={14}
        className="font-InterRegular">
        Average
      </text>
      <text
        x={viewBox.x + 8 + viewBox.width + 12}
        y={viewBox.y - 4}
        fill="var(--color-text-secondary)"
        fontSize={14}
        className="font-InterRegular">
        Daily Spread:
      </text>
      <text
        x={viewBox.x + 8 + viewBox.width + 8}
        y={viewBox.y + 16}
        fill={epexSpreadLineColor}
        fontSize={14}
        fontWeight={600}
        className="font-InterRegular">
        {formatCurrencyToPound(marketPriceSpreadData?.spread_analysis?.epex_avg_daily_spread_per_mwh || 0)}(£/MWh)
      </text>
    </g>
  );

  const volatilityBarThresholdColor = 'var(--color-red-data)';
  const volatilityBarColor = 'var(--color-mint)';
  const volatilityBarHoverColor = '#17B986';
  const volatilityThresholdBarHoverColor = 'var(--color-error)';
  const volatilityLineColor = 'var(--color-error)';
  const volatilityThreshold = marketPriceVolatilityData?.threshold; // Example threshold value for high volatility
  const marketVolatilityThresholdLabel = (viewBox: any) => (
    <g>
      <text
        x={viewBox.x + 10 + viewBox.width + 0}
        y={viewBox.y - 20}
        fill="var(--color-text-secondary)"
        fontSize={14}
        className="font-InterRegular">
        High volatility
      </text>
      <text
        x={viewBox.x + 10 + viewBox.width + 12}
        y={viewBox.y - 2}
        fill="var(--color-text-secondary)"
        fontSize={14}
        className="font-InterRegular">
        threshold :
      </text>
      <text
        x={viewBox.x + 24 + viewBox.width + 8}
        y={viewBox.y + 18}
        fill={volatilityLineColor}
        fontSize={14}
        fontWeight={600}
        className="font-InterRegular">
        £{volatilityThreshold}
      </text>
      <text
        x={viewBox.x + 12 + viewBox.width + 8}
        y={viewBox.y + 36}
        fill={volatilityLineColor}
        fontSize={14}
        fontWeight={500}
        className="font-InterRegular">
        (Top 25%)
      </text>
    </g>
  );

  const averagePriceHourlyData = marketHourlyPricePatternsData?.hourly_price_patterns || [];

  const marketPriceKpis: GradientKPIObject[] = [
    {
      icon: 'zap',
      title: 'EPEX DA Average',
      value: formatCurrencyToPound(marketPriceSpreadData?.price_summary?.epex_da_avg_price_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'orange',
    },
    {
      icon: 'trending-up',
      title: 'EPEX DA Maximum',
      value: formatCurrencyToPound(marketPriceSpreadData?.price_summary?.epex_da_max_price_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'blue',
    },
    {
      icon: 'trending-up',
      title: 'SSP Maximum',
      value: formatCurrencyToPound(marketPriceSpreadData?.price_summary?.ssp_max_price_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'yellow',
    },
    {
      icon: 'trending-up',
      title: 'SBP Maximum',
      value: formatCurrencyToPound(marketPriceSpreadData?.price_summary?.sbp_max_price_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'green',
    },
  ];

  const priceSpreadKpis: GradientKPIObject[] = [
    {
      icon: 'scale',
      title: 'Avg Daily EPEX Spread',
      value: formatCurrencyToPound(marketPriceSpreadData?.spread_analysis?.epex_avg_daily_spread_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'blue',
    },
    {
      icon: 'award',
      title: 'Best EPEX Spread Day',
      value: formatCurrencyToPound(marketPriceSpreadData?.spread_analysis?.epex_max_daily_spread_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'orange',
    },
    {
      icon: 'chart-wave',
      title: 'Avg SSP/SBP Spread',
      value: formatCurrencyToPound(marketPriceSpreadData?.spread_analysis?.avg_ssp_sbp_spread_per_mwh || 0),
      subLabel: '/ MWh',
      variant: 'purple',
      bgGradientEnd: '#F0FFED',
    },
  ];

  const hourlyMarketKpis: GradientKPIObject[] = [
    {
      icon: 'shopping-cart',
      title: 'Best Buy Hour',
      value: `${String(marketHourlyPricePatternsData?.best_buy_hour || 0).padStart(2, '0')}:00`,
      subLabel: `Avg ${formatCurrencyToPound(marketHourlyPricePatternsData?.lowest_avg_epex_price_per_mwh || 0)} / MWh`,
      variant: 'purple',
    },
    {
      icon: 'shopping-cart-arrow-up',
      title: 'Best Sell Hour',
      value: `${String(marketHourlyPricePatternsData?.best_sell_hour || 0).padStart(2, '0')}:00`,
      subLabel: `Avg ${formatCurrencyToPound(marketHourlyPricePatternsData?.highest_avg_epex_price_per_mwh || 0)} / MWh`,
      variant: 'blue',
    },
    {
      icon: 'clock',
      title: 'Hourly Arbitrage',
      value: `${formatCurrencyToPound(marketHourlyPricePatternsData?.hourly_arbitrage_per_mwh || 0)}`,
      subLabel: '/ MWh',
      variant: 'yellow',
    },
  ];

  const priceVolatilityKpis: GradientKPIObject[] = [
    {
      icon: 'activity',
      title: 'Avg Daily Volatility',
      value: formatCurrencyToPound(marketPriceVolatilityData?.kpi?.average_daily_volatility || 0),
      variant: 'blue',
    },
    {
      icon: 'fire',
      title: 'High Volatility Days',
      value: `${marketPriceVolatilityData?.kpi?.high_volatility_days || 0}`,
      subLabel: 'Days',
      variant: 'orange',
    },
    {
      icon: 'octagon-alert',
      title: 'Max Volatility Day',
      value: formatCurrencyToPound(marketPriceVolatilityData?.kpi?.max_volatility?.value || 0),
      variant: 'purple',
    },
  ];

  const missedOpportunityKpis: GradientKPIObject[] = [
    {
      title: 'Idle During High Spread',
      value: '18',
      subLabel: 'Periods',
      icon: 'shopping-cart',
      variant: 'purple',
    },
    {
      title: 'Missed Hours',
      value: '42',
      subLabel: 'hrs',
      icon: 'shopping-cart-arrow-up',
      variant: 'blue',
    },
    {
      title: 'Estimated Missed Revenue',
      value: '£12,480',
      icon: 'shopping-cart-arrow-up',
      variant: 'yellow',
    },
  ];

  const missedDays: TopMissedOpportunityDays[] = [
    {
      date: '07-Sep-2025',
      periods: 6,
    },
    {
      date: '14-Sep-2025',
      periods: 2,
    },
    {
      date: '18-Sep-2025',
      periods: 7,
    },
    {
      date: '26-Sep-2025',
      periods: 3,
    },
    {
      date: '29-Sep-2025',
      periods: 4,
    },
  ];

  const spreadChartData =
    marketPriceSpreadData?.spread_analysis?.daily_epex_spread.map(item => ({
      label: item.date,
      value: item.spread,
      commentCount: getCommentCountForDataPoint(ViewAnalysisWidgets.DailyEpexSpread, item.date),
    })) ?? [];

  const volatilityChartData =
    marketPriceVolatilityData?.chart_data.map(item => ({
      label: item.date,
      value: item.std_deviation,
      commentCount: getCommentCountForDataPoint(ViewAnalysisWidgets.DailyVolatility, item.date),
    })) ?? [];

  const customTooltipRenderer = (widgetId: string, yAxisLabel: string) => (data: BarDataPoint, barData?: any) => {
    return (
      <div className="min-w-[200px] rounded-md border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,19,41,0.14)] flex flex-col gap-2">
        <Text variant="14SB" className="mb-1 block text-[17px] font-bold text-text-primary">
          {data.label}
        </Text>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{backgroundColor: barData?.color || 'var(--color-primary)'}} />
          <Text variant="14R" className="text-text-secondary">
            {yAxisLabel}
          </Text>
          <Text variant="14SB" className="ml-auto font-bold text-text-primary">
            {formatCurrencyToPound(Number(data.value))}
          </Text>
        </div>
          <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
            <CommentTrigger
              contextType={CommentContextType.DataPoint}
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketPrices}
              contextWidget={widgetId}
              contextDataPoint={data.label}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-with-text"
              label="Add Comments"
              className="text-[#088477] w-full flex items-center justify-center hover:bg-transparent!"
              iconClassName="text-[#088477] !w-[12px] !h-[12px]"
              labelClassName="text-[#088477] text-[12px] leading-none"
            />
          </div>
      </div>
    );
  };

  const isCorrelationMatrixLoading = marketPriceCorrelationMatrixLoading || assetLoading;

  const correlationLabels = useMemo(() => {
    if (isCorrelationMatrixLoading) {
      return Array.from({length: 4}, () => '');
    }

    return marketPriceCorrelationMatrixData?.correlation_matrix?.markets ?? [];
  }, [marketPriceCorrelationMatrixData?.correlation_matrix?.markets, isCorrelationMatrixLoading]);

  const correlationData = useMemo(() => {
    if (isCorrelationMatrixLoading) {
      return Array.from({length: 4}, () => Array.from({length: 4}, () => 0));
    }

    return marketPriceCorrelationMatrixData?.correlation_matrix?.matrix ?? [];
  }, [marketPriceCorrelationMatrixData?.correlation_matrix?.matrix, isCorrelationMatrixLoading]);
  // ==============
  // side effects
  // ==============
  useEffect(() => {
    if (assetId && year && month) {
      dispatch(
        getAssetMarketPriceSpreadRequest({
          assetId,
          year,
          month,
        }),
      );
      dispatch(
        assetMarketHourlyPricePatternsRequest({
          assetId,
          year,
          month,
        }),
      );
      dispatch(
        getAssetMarketPriceVolatilityRequest({
          assetId,
          year,
          month,
        }),
      );
      dispatch(
        getAssetMarketPriceCorrelationMatrixRequest({
          assetId,
          year,
          month,
        }),
      );
    }
    if (assetId) {
      dispatch(
        fetchCommentsRequest({
          assetId,
          context_module: CommentModule.ViewAnalysis,
          context_tab: ViewAnalysisTabs.MarketPrices,
          context_year: year ?? undefined,
        })
      );
    }
  }, [assetId, year, month, dispatch]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <Section
        icon="currency-pound"
        subtitle="Snapshot of key market price levels for the selected period."
        title="Price Summary">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {marketPriceKpis.map((kpi, index) => (
            <GradientKPI key={index} {...kpi} isLoading={marketPriceSpreadLoading || assetLoading} />
          ))}
        </div>
      </Section>

      <Section icon="move" title="Price Spread Analysis" subtitle="Arbitrage opportunities">
        <div className="grid grid-cols-3 gap-4 mb-2">
          {priceSpreadKpis.map((kpi, index) => (
            <GradientKPI key={index} {...kpi} isLoading={marketPriceSpreadLoading || assetLoading} />
          ))}
        </div>

        <ThresholdBarGraph
          title="Daily EPEX Spread (Max - Min)"
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketPrices}
              contextWidget={ViewAnalysisWidgets.DailyEpexSpread}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          className="h-120 p-4 mb-4"
          data={spreadChartData}
          xKey="label"
          yKey="value"
          headerClassName="mt-2"
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_daily_epex_spread.png`}
          xAxisLabel="Date"
          yAxisLabel="Spread (£/MWh)"
          thresholdValue={epexSpreadThreshold}
          thresholdBarColor={epexSpreadBarThresholdColor}
          hoverColor={epexSpreadBarHoverColor}
          barColor={epexSpreadBarColor}
          thresholdLineColor={epexSpreadLineColor}
          thresholdLabelRenderer={epexSpreadThresholdLabel}
          useBuiltInTooltip={true}
          tooltipRenderer={customTooltipRenderer(ViewAnalysisWidgets.DailyEpexSpread, 'Price Spread (£/MWh)')}
          onBadgeClick={(item) => handleBadgeClick(ViewAnalysisWidgets.DailyEpexSpread, item.label as string)}
          xAxisTicks={(() => {
            if (!spreadChartData.length) return [];
            const targetDays = [7, 15, 21, 28];
            return spreadChartData
              .filter(item => {
                const day = new Date(item.label).getDate();
                return targetDays.includes(day);
              })
              .map(item => item.label);
          })()}
          xTickFormatter={(value: string | number) => {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}\n${year}`;
          }}
          xAxisLabelProps={{
            offset: -40,
          }}
          isLoading={marketPriceSpreadLoading || assetLoading}
          barRadius={6}
          barCategoryGap={6}
          verticalGridCount={15}
        />
      </Section>

      <Section
        icon="recent"
        title="Hourly Price Patterns"
        subtitle="Best trading windows — buy low, sell high across the day.">
        <div className="grid grid-cols-3 gap-4 mb-2">
          {hourlyMarketKpis.map((kpi, index) => (
            <GradientKPI key={index} {...kpi} isLoading={marketHourlyPricePatternsLoading || assetLoading} />
          ))}
        </div>
        <LineChart
          data={averagePriceHourlyData}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketPrices}
              contextWidget={ViewAnalysisWidgets.AveragePriceHourDay}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_average_hourly_prices.png`}
          title="Average price by hour of day"
          chartClassName="min-h-120 pl-8 pr-12"
          className="mb-4"
          isLoading={marketHourlyPricePatternsLoading || assetLoading}
          chartMargin={{left: 15}}
          config={{
            enableZoom: false,
            yAxisLabelProps: {
              offset: 0,
            },
            xAxisLabelProps: {
              offset: -35,
            },
            yTickSpace: 90,
            xKey: 'hour',
            xAxisLabel: 'Hours',
            yAxisLabel: 'Price (£/MWh)',
            showLegend: true,
            xTickFormatter: (value: string | number): string => {
              return `${String(value).padStart(2, '0')}:00`;
            },
            xTickInterval: 2,
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
                key: 'epex_da',
                label: 'EPEX DA',
                color: 'var(--color-warning)',
                smooth: true,
                showSymbol: false,
                strokeWidth: 2,
                showArea: true,
                areaOpacity: 0.45,
                gradientColor: {
                  start: 'var(--color-warning)',
                  end: '#F6C99575',
                },
              },
              {
                key: 'ssp',
                label: 'SSP',
                color: 'var(--color-blue-2)',
                smooth: true,
                showSymbol: false,
                strokeWidth: 2,
              },
              {
                key: 'sbp',
                label: 'SBP',
                color: 'var(--color-success)',
                smooth: true,
                showSymbol: false,
                strokeWidth: 2,
              },
            ],
          }}
          tooltipRenderer={tooltipProps => {
            const payload = tooltipProps.payload ?? [];

            if (!tooltipProps.active || !payload.length) {
              return null;
            }
            return (
              <div className="rounded-md border border-border bg-white px-4 py-3 shadow-lg min-w-56">
                <Text variant="18SB" className="text-text-primary! mb-3">
                  {String(tooltipProps.label).padStart(2, '0')}:00
                </Text>

                {payload.map((entry, index) => {
                  const value = Number(entry.value ?? 0);
                  if (entry.name === 'epex_da') return null;
                  return (
                    <div key={index} className="flex items-center gap-1 mb-2 last:mb-0">
                      <Text variant="16M" className="text-text-secondary!">
                        {entry.name} :
                      </Text>

                      <Text
                        variant="16SB"
                        style={{
                          color: entry.color,
                        }}>
                        £{value.toFixed(0)}
                      </Text>

                      <Text
                        variant="16M"
                        style={{
                          color: entry.color,
                        }}>
                        £/MWh
                      </Text>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </Section>

      <Section
        icon="waves"
        title="Price Volatility"
        subtitle="High-value trading days — daily price standard deviation.">
        <div className="grid grid-cols-3 gap-4 mb-2">
          {priceVolatilityKpis.map((kpi, index) => (
            <GradientKPI key={index} {...kpi} isLoading={marketPriceVolatilityLoading || assetLoading} />
          ))}
        </div>

        <ThresholdBarGraph
          title="Daily volatility (£/MWh Std Dev)"
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketPrices}
              contextWidget={ViewAnalysisWidgets.DailyVolatility}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          className="h-120 p-4"
          headerClassName="mt-5"
          data={volatilityChartData}
          xKey="label"
          yKey="value"
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_price_volatility.png`}
          xAxisLabel="Date"
          yAxisLabel="Volatility (£/MWh Std Dev)"
          thresholdValue={volatilityThreshold ?? 0}
          thresholdBarColor={volatilityBarThresholdColor}
          hoverColor={volatilityBarHoverColor}
          barColor={volatilityBarColor}
          thresholdLineColor={volatilityLineColor}
          thresholdHoverColor={volatilityThresholdBarHoverColor}
          thresholdLabelRenderer={marketVolatilityThresholdLabel}
          xAxisTicks={(() => {
            if (!volatilityChartData.length) return [];
            const targetDays = [7, 15, 21, 28];
            return volatilityChartData
              .filter(item => {
                const day = new Date(item.label).getDate();
                return targetDays.includes(day);
              })
              .map(item => item.label);
          })()}
          xTickFormatter={(value: string | number) => {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}\n${year}`;
          }}
          xAxisLabelProps={{
            offset: -30,
          }}
          useBuiltInTooltip
          isLoading={marketPriceVolatilityLoading || assetLoading}
          tooltipRenderer={(data, barData) => (
            <div className="rounded-sm bg-white border border-border px-4 py-3 shadow-md pointer-events-auto">
              <Text variant="14SB">{data.label}</Text>

              <Text variant="caption" className="text-text-secondary! mb-2 block">
                Std Dev :{' '}
                <span
                  style={{
                    color: barData?.isThresholdExceeded ? volatilityLineColor : '#15AA7C',
                  }}>
                  <b className="font-InterBold!">{formatCurrencyToPound(Number(data.value))}</b> A£/MWh
                </span>
              </Text>
              
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                  contextType={CommentContextType.DataPoint}
                  contextModule={CommentModule.ViewAnalysis}
                  contextTab={ViewAnalysisTabs.MarketPrices}
                  contextWidget={ViewAnalysisWidgets.DailyVolatility}
                  contextDataPoint={data.label}
                  contextAssetId={assetId}
                  contextYear={year}
                  contextMonth={month}
                  variant="icon-with-text"
                  label="Add Comments"
                  className="text-[#088477] w-full flex items-center justify-center hover:bg-transparent!"
                  iconClassName="text-[#088477] !w-[12px] !h-[12px]"
                  labelClassName="text-[#088477] text-[12px] leading-none"
                />
              </div>
            </div>
          )}
          onBadgeClick={(item) => handleBadgeClick(ViewAnalysisWidgets.DailyVolatility, item.label as string)}
          barRadius={6}
          barCategoryGap={6}
          verticalGridCount={15}
          showLegend
        />
      </Section>

      <Section
        icon="move"
        title="Missed Opportunity Tracker"
        className="hidden" // keep it hidden for now, will use it when need
        subtitle="Where the asset stayed idle during high-spread windows.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {missedOpportunityKpis.map((kpi, index) => (
            <GradientKPI
              key={index}
              {...kpi}
              isLoading={marketPriceVolatilityLoading || assetLoading}
              showTooltip
              tooltipMessage=""
            />
          ))}
        </div>

        <div className="mt-8 border border-[#E5E7EB] rounded-2xl p-5 bg-white">
          <Text variant="18SB" className="mb-5 font-InterBold!">
            Top 5 days with missed opportunities
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {missedDays.map((item, index) => (
              <TopMissedDaysCard {...item} key={item.date} index={index + 1} />
            ))}
          </div>
        </div>
      </Section>

      <Section
        icon="move"
        title="Market Price Correlation Matrix"
        subtitle="Pearson correlation across price streams (-1 to +1)."
        className="mt-4">
        <CorrelationMatrix
          labels={correlationLabels}
          data={correlationData}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.MarketPrices}
              contextWidget={ViewAnalysisWidgets.MarketPriceCorrelation}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          isLoading={isCorrelationMatrixLoading}
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_market_price_correlation_matrix.png`}
          // className="py-10 px-10"
        />
      </Section>
    </div>
  );
}

interface TopMissedDaysCardProps extends TopMissedOpportunityDays {
  index: number;
}

const TopMissedDaysCard = (props: TopMissedDaysCardProps) => {
  const {index, date, periods} = props;
  return (
    <div className="border border-[#E5E7EB] rounded-2xl px-5 py-4 flex gap-4 bg-[#f6f9f9]">
      <div className="size-8 rounded-md bg-text-primary mt-px flex relative items-center justify-center">
        <Text variant="18SB" className="text-white!">
          {index}
        </Text>
      </div>

      <div className="flex flex-col gap-2">
        <Text variant="14SB">{date}</Text>
        <Text variant="14SB" className="text-primary!">
          {periods} idle periods
        </Text>
      </div>
    </div>
  );
};
