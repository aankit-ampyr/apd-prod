import {CompositeChart, formatCurrencyToPound, CompositeChartSeries} from '@lazarus/react-common';
import {SectionHeader} from '@/components/common';
import {useWindowDimensions} from '@/hooks';
import {CALENDAR_MONTH_NAMES, InvoiceAnalysisTabs, InvoiceAnalysisWidgets, TABLET_SCREEN_BREAKPOINT} from '@/constants';
import type {AssetCapacityMarketAnalytics2} from '@/interface';
import {Text} from '@/ui-kits';

import {CommentTrigger} from '@/components';
import {CommentContextType, CommentModule, WidgetDataPointPayload} from '@/constants';

interface PaymentTrendGraphProps {
  data: AssetCapacityMarketAnalytics2['payment_trend']['payment_trend'];
  isLoading?: boolean;
  year?: number | null;
  assetId?: number | null;
  domainMaxMultiplier?: number;
  customActions?: React.ReactNode;
  handleBadgeClick?: (
    widgetId: InvoiceAnalysisWidgets.PaymentTrend,
    categoryId: Extract<WidgetDataPointPayload, {context_widget: InvoiceAnalysisWidgets.PaymentTrend}>['context_data_point'],
    monthIndex?: number
  ) => void;
  getCommentCountForDataPoint?: (
    widget: InvoiceAnalysisWidgets.PaymentTrend,
    dataPointId: Extract<WidgetDataPointPayload, {context_widget: InvoiceAnalysisWidgets.PaymentTrend}>['context_data_point'],
    month?: number
  ) => number;
}

const series: CompositeChartSeries<any>[] = [
  {
    key: 'monthly_payment',
    label: 'Monthly Payment',
    type: 'bar',
    color: '#F4C713',
    yAxisId: 'left',
    valueFormatter: val => formatCurrencyToPound(val, false, false),
  },
  {
    key: 'cumulative_payment',
    label: 'Cumulative',
    type: 'line',
    color: '#2070A6',
    yAxisId: 'right',
    valueFormatter: val => formatCurrencyToPound(val, false, false),
    dot: {r: 4, fill: '#3B82F6', stroke: '#3B82F6', strokeWidth: 0},
    activeDot: false,
  },
];

export function PaymentTrendGraph(props: PaymentTrendGraphProps) {
  const {data = [], isLoading = false, year, assetId, domainMaxMultiplier, customActions, handleBadgeClick, getCommentCountForDataPoint} = props;
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  const chartData =
    data?.map(item => {
      const monthStrRaw = typeof item.month === 'number' ? CALENDAR_MONTH_NAMES[item.month - 1] : item.month || '';
      const monthStr = monthStrRaw.substring(0, 3);
      const resolvedYear = year || '';
      const label = `${monthStr}\n${resolvedYear}`.trim();
      const monthIndex = typeof item.month === 'number' ? item.month : 0;
      return {
        ...item,
        month_year: label,
        commentCounts: {
          _category: getCommentCountForDataPoint?.(InvoiceAnalysisWidgets.PaymentTrend, String(monthIndex) as Extract<WidgetDataPointPayload, {context_widget: InvoiceAnalysisWidgets.PaymentTrend}>['context_data_point']) ?? 0,
        },
      };
    }) || [];

  const header = (
    <SectionHeader
      title="Payment Trend"
      subtitle="Track monthly capacity payments and cumulative payment progress for the selected year."
      icon="growth"
    />
  );

  const customTooltipRenderer = (tooltipProps: any) => {
    const {active, payload, label} = tooltipProps;
    if (!active || !payload?.length) return null;

    const title = String(label).replace('\n', ' ');

    return (
      <div className="min-w-[200px] rounded-md border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,19,41,0.14)]">
        <Text variant="14SB" className="mb-3 block text-[17px] font-bold text-text-primary">
          {title}
        </Text>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any) => {
            const seriesItem = series.find(s => s.key === entry.dataKey);
            const rawValue = Number(Array.isArray(entry.value) ? entry.value[1] : (entry.value ?? 0));
            const formattedValue = seriesItem?.valueFormatter
              ? seriesItem.valueFormatter(rawValue, {} as any)
              : rawValue;

            const textColor = entry.dataKey === 'monthly_payment' ? '#F4C713' : '#2070A6';

            return (
              <div key={entry.dataKey} className="flex items-center gap-1.5">
                <Text variant="14R" className="text-text-secondary!">
                  {seriesItem?.label}(£):
                </Text>
                <Text variant="14B" style={{color: textColor}}>
                  {formattedValue}
                </Text>
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.CapacityMarket}
            contextWidget={InvoiceAnalysisWidgets.PaymentTrend}
            contextType={CommentContextType.DataPoint}
            contextAssetId={assetId ?? 0}
            contextYear={year ?? 0}
            contextDataPoint={(() => {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const [monthStr] = title.split(' ');
              const monthIdx = months.indexOf(monthStr) + 1;
              return monthIdx ? String(monthIdx) : title;
            })()}
            variant="icon-with-text"
            label="Add Comment"
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
            iconClassName="w-4 h-4 text-[#088477]"
            labelClassName="text-[#088477]"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .payment-trend-chart .recharts-bar-rectangle path.recharts-rectangle,
        .payment-trend-chart .recharts-bar-rectangle rect.recharts-rectangle {
          transition: fill 0.2s ease;
        }
        .payment-trend-chart .recharts-bar-rectangle:hover path.recharts-rectangle,
        .payment-trend-chart .recharts-bar-rectangle:hover rect.recharts-rectangle {
          fill: #f6be17ff !important;
        }
      `}</style>
      <CompositeChart
        className="payment-trend-chart"
        header={header}
        data={chartData}
        customActions={customActions}
        isLoading={isLoading}
        tooltipRenderer={customTooltipRenderer}
        xAxisKey="month_year"
        series={series}
        downloadFileName="payment_trend"
        showBarPointValues={false}
        showLinePointValues={false}
        showTooltipCursor={false}
        tooltipInteractionMode="item"
        onBadgeClick={(categoryId, _seriesId) => {
          const [monthStr] = String(categoryId).split('\n');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.indexOf(monthStr) + 1;
          handleBadgeClick?.(InvoiceAnalysisWidgets.PaymentTrend, String(monthIndex || categoryId) as Extract<WidgetDataPointPayload, {context_widget: InvoiceAnalysisWidgets.PaymentTrend}>['context_data_point']);
        }}
        axes={{
          left: {
            label: 'Monthly Payment(£)',
            tickFormatter: val => formatCurrencyToPound(val, false, true),
            width: isTablet ? 60 : 75,
            ...(domainMaxMultiplier ? {domainMaxMultiplier} : {}),
          },
          right: {
            label: 'Cumulative(£)',
            tickFormatter: val => formatCurrencyToPound(val, false, true),
            width: isTablet ? 60 : 75,
          },
        }}
      />
    </>
  );
}
