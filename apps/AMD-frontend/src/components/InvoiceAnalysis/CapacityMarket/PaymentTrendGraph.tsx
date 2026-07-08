import {CompositeChart, formatCurrencyToPound, CompositeChartSeries} from '@lazarus/react-common';
import {SectionHeader} from '@/components/common';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT, CALENDAR_MONTH_NAMES} from '@/constants';
import type {AssetCapacityMarketAnalytics} from '@/interface';
import {Text} from '@/ui-kits';

interface PaymentTrendGraphProps {
  data?: AssetCapacityMarketAnalytics['payment_trend'];
  isLoading?: boolean;
  year?: number | null;
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
  const {data = [], isLoading = false, year} = props;
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  const chartData =
    data?.map(item => {
      const monthStrRaw = typeof item.month === 'number' ? CALENDAR_MONTH_NAMES[item.month - 1] : item.month || '';
      const monthStr = monthStrRaw.substring(0, 3);
      const resolvedYear = item.year || year || '';
      return {
        ...item,
        month_year: `${monthStr}\n${resolvedYear}`.trim(),
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
      </div>
    );
  };

  return (
    <>
      <style>{`
        .payment-trend-chart .recharts-bar-rectangle path,
        .payment-trend-chart .recharts-bar-rectangle rect {
          transition: fill 0.2s ease;
        }
        .payment-trend-chart .recharts-bar-rectangle:hover path,
        .payment-trend-chart .recharts-bar-rectangle:hover rect {
          fill: #f6be17ff !important;
        }
      `}</style>
      <CompositeChart
        className="payment-trend-chart"
        header={header}
        data={chartData}
        isLoading={isLoading}
        tooltipRenderer={customTooltipRenderer}
        xAxisKey="month_year"
        series={series}
        downloadFileName="payment_trend"
        showBarPointValues={false}
        showLinePointValues={false}
        showTooltipCursor={false}
        tooltipInteractionMode="item"
        axes={{
          left: {
            label: 'Monthly Payment(£)',
            tickFormatter: val => formatCurrencyToPound(val, false, true),
            width: isTablet ? 60 : 75,
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
