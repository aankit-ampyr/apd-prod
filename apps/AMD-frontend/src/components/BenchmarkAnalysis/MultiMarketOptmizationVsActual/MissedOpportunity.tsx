import {useMemo} from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {Divider, SectionHeader} from '../../common';
import {MonthlyEntry} from './types';
import {cn, formatCurrencyToPound, formatNumber} from '@/utils';
import {useChartsActionV2} from '@/hooks';
import {IconButton, Skeleton, Text} from '@/ui-kits';

interface MissedOpportunityProps {
  data: MonthlyEntry[];
  isFullScreenOverride?: boolean;
  downloadFileName: string;
  className?: string;
  actionWrapperClassName?: string;
  loading?: boolean;
}

type captureRateColorCoding = {
  min: number;
  max: number;
  bgColor: string;
  label: string;
};

const captureRateColorCodingMap: captureRateColorCoding[] = [
  {
    min: 100,
    max: Infinity,
    bgColor: 'var(--color-success)',
    label: 'Outperforming optimization',
  },
  {
    min: 80,
    max: 100,
    bgColor: '#87D652',
    label: 'Good performance',
  },
  {
    min: 60,
    max: 80,
    bgColor: 'var(--color-warning)',
    label: 'Room for improvement',
  },
  {
    min: -Infinity,
    max: 60,
    bgColor: 'var(--color-error)',
    label: 'Significant opportunity gap',
  },
];

export function MissedOpportunity(props: MissedOpportunityProps) {
  const {data, isFullScreenOverride = false, downloadFileName, className, actionWrapperClassName, loading} = props;

  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const {chartRef, handleDownLoad, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <MissedOpportunity {...props} isFullScreenOverride />,
  });

  /**
   * ============================
   * Derived States
   * ============================
   */

  // KPIs
  const totalMonths = data?.length;

  // actual revenue
  const totalCaptureRevenue = data.reduce((acc, item) => {
    return acc + (item.totals.total_actual_revenue ?? 0);
  }, 0);
  const averageCaptureRevenue = totalCaptureRevenue / totalMonths;

  // revenue gap
  const totalRevenueGap = data.reduce((acc, item) => {
    return acc + (item.totals.revenue_gap ?? 0);
  }, 0);
  const averageRevenueGap = totalRevenueGap / totalMonths;

  // capture rate
  const totalOptimizizedRevenue = data.reduce((acc, item) => {
    return acc + (item.totals.total_optimized_revenue ?? 0);
  }, 0);
  const overallCaptureRate = Math.round((totalCaptureRevenue / totalOptimizizedRevenue) * 100).toFixed();

  const valueSubLabel = `Across ${totalMonths} months`;

  /**
   * KPIS array
   */
  const KPIS: KPICardProps[] = [
    {
      label: 'Total Captured Revenue',
      value: formatCurrencyToPound(totalCaptureRevenue),
      valueSubLabel,
      bgGradientStart: '#F6F9FA',
      borderColor: '#91ABF9',
      footer: {
        label: 'Average per month: ',
        value: formatCurrencyToPound(averageCaptureRevenue),
      },
      textColor: '#5276B4',
    },
    {
      label: 'Total Missed Opportunity',
      value: formatCurrencyToPound(totalRevenueGap),
      valueSubLabel,
      bgGradientStart: '#FFF4F0',
      borderColor: '#FFB7B7',
      footer: {
        label: 'Average per month: ',
        value: formatCurrencyToPound(averageRevenueGap),
      },
      textColor: '#CC4141',
    },
    {
      label: 'Overall Capture Rate',
      value: `${overallCaptureRate} %`,
      valueSubLabel,
      bgGradientStart: '#F5FFFA',
      borderColor: '#A1E5AB',
      textColor: 'var(--color-success)',
    },
  ];

  return (
    <div ref={chartRef} className={cn('rounded-xl border border-border bg-white p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Captured vs Missed Optimized Revenue"
          icon="chart-trend-up"
          subtitle="Shows how much of the optimized monthly revenue was actually captured and how much was left as opportunity gap."
        />

        {!loading && (
          <div className={cn('flex shrink-0 items-center gap-3 chart-actions', actionWrapperClassName)}>
            <IconButton
              name="download"
              size={20}
              className="cursor-pointer hover:bg-primary-tint-2! charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={handleDownLoad}
            />
            {!isFullScreenOverride ? (
              <IconButton
                name="maximize"
                size={20}
                className="cursor-pointer hover:bg-primary-tint-2! charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMaximize}
              />
            ) : (
              <IconButton
                name="minimize"
                size={20}
                className="cursor-pointer hover:bg-primary-tint-2! charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMinimize}
              />
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 mt-5 gap-4 mb-4">
        {KPIS.map((item) => (
          <KPICard {...item} key={item.label} loading={loading} />
        ))}
      </div>
      {/* graph */}
      <StackedBarGraph data={data} loading={loading}/>

      {/* legend */}
      {!loading && <div className="mt-6 rounded-md border border-border bg-white shadow-2xl/3 p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Content */}
          <div className="flex flex-col gap-2">
            <Text variant="14M" className="text-text-primary!">
              About this chart
            </Text>

            <Text variant="14R" className="text-text-secondary!">
              Each bar represents the total optimized revenue for the month (Captured + Missed Opportunity). It shows
              how much revenue was actually captured and how much opportunity was left on the table.
            </Text>
          </div>

          {/* Right Legend */}
          <div className="rounded-md bg-[#F7F7FA] px-6 py-3 flex flex-col gap-2 border-l-4 border-[#26224D]">
            {[
              {
                label: 'Captured Revenue = ',
                value: 'Actual Revenue',
                render: <span className="h-4 w-5 rounded bg-[#6D84B5]" />,
              },
              {
                label: 'Missed Opportunity =',
                value: 'Optimized Revenue - Actual Revenue',
                render: <span className="h-4 w-5 rounded bg-[#CC4141]" />,
              },
              {
                label: 'Capture Rate =',
                value: '(Actual ÷ Optimized) x 100',
                render: (
                  <>
                    <span className="h-1 w-8 bg-[#F0E000] relative">
                      <span className="size-3 absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 rounded-lg bg-[#F0E000]" />
                    </span>
                  </>
                ),
              },
            ].map(item => (
              <div className="flex gap-2 items-center">
                {item.render}
                <Text variant="14R" className="text-text-secondary!">
                  {item.label}
                  <span className="ml-1 font-InterMedium text-text-primary">{item.value}</span>
                </Text>
              </div>
            ))}
          </div>
        </div>

        <Text variant="16M" className="mb-3 text-text-primary!">
          Capture Rate Guide
        </Text>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          {captureRateColorCodingMap.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{backgroundColor: item.bgColor}} />

              <Text variant="14R" className="text-text-secondary!">
                {item.min === -Infinity
                  ? `< ${item.max}%`
                  : item.max === Infinity
                    ? `> ${item.min}%`
                    : `${item.min}% – ${item.max}%`}
                {' : '}
                <span className="font-InterMedium text-text-primary">{item.label}</span>
              </Text>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

type ChartEntry = {
  label: string;
  month: number;
  year: number;
  actualRevenue: number;
  missedOpportunity: number;
  revenueGap: number;
  optimizedRevenue: number;
  captureRate: number | null;
};

function formatMonthLabel(month: number, year?: number, includeYear = false) {
  const date = new Date(year ?? 2025, month - 1);
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    ...(includeYear ? {year: 'numeric'} : {}),
  }).format(date);
}

function formatMonthYearLabel(month: number, year: number) {
  return `${formatMonthLabel(month, year)} ${year}`;
}

function formatCompactPound(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    const scaled = absValue / 1_000_000;
    return `£${sign}${scaled.toFixed(scaled >= 10 || scaled % 1 === 0 ? 0 : 1)} m`;
  }

  if (absValue >= 1_000) {
    const scaled = absValue / 1_000;
    return `£${sign}${scaled.toFixed(scaled >= 10 || scaled % 1 === 0 ? 0 : 1)} k`;
  }

  return `£${sign}${absValue.toFixed(absValue % 1 === 0 ? 0 : 1)}`;
}

function getCaptureRateStyle(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return {
      color: '#64748B',
      label: 'NA',
    };
  }

  if (value > 100) {
    return {
      color: 'var(--color-success)',
      label: `${Math.round(value)}%`,
    };
  }

  if (value >= 80) {
    return {
      color: '#87D652',
      label: `${Math.round(value)}%`,
    };
  }

  if (value >= 60) {
    return {
      color: 'var(--color-warning)',
      label: `${Math.round(value)}%`,
    };
  }

  return {
    color: 'var(--color-error)',
    label: `${Math.round(value)}%`,
  };
}

interface KPICardProps {
  label: string;
  value: string;
  valueSubLabel: string;
  footer?: {
    label: string;
    value: string;
  };
  bgGradientStart: string;
  bgGradientEnd?: string;
  borderColor: string;
  textColor: string;
  loading?: boolean;
}

function KPICard(props: KPICardProps) {
  const {
    loading = false,
    label,
    value,
    valueSubLabel,
    textColor,
    footer,
    borderColor,
    bgGradientStart,
    bgGradientEnd = '#fff',
  } = props;

  if (loading){
    return <div className='border border-border rounded-md py-4 px-6 flex flex-col gap-4'>
      <Skeleton className='w-[40%] rounded-2xl'/>
      <Skeleton className='mt-3 h-6! w-[70%] rounded-2xl'/>
      <Divider orientation="horizontal"/>
      <Skeleton className='w-[30%] rounded-2xl'/>
    </div>
  }

  return (
    <div
      style={{borderColor, background: `linear-gradient(to bottom right, ${bgGradientStart}, ${bgGradientEnd})`}}
      className="border rounded-md py-4 px-6 flex flex-col gap-4">
      <Text variant="14M" className="text-text-secondary!">
        {label}
      </Text>
      <span className="flex gap-2 items-end">
        <Text variant="free" className="font-InterBold text-xl" style={{color: textColor}}>
          {value}
        </Text>
        <Text variant="14R" className="italic text-text-secondary!">
          {valueSubLabel}
        </Text>
      </span>

      {footer && (
        <>
          <Divider
            orientation="horizontal"
            style={{
              background: `linear-gradient(to right, ${borderColor}, ${bgGradientEnd})`,
            }}
          />
          <span className="flex gap-2 items-end">
            <Text variant="14R">{footer.label}</Text>
            <Text variant="14R">{footer.value}</Text>
          </span>
        </>
      )}
    </div>
  );
}

interface StackedBarGraphProps {
  data: MonthlyEntry[];
  loading?: boolean;
}
function StackedBarGraph(props: StackedBarGraphProps) {
  const {data, loading=false} = props;

  const chartData = useMemo<ChartEntry[]>(() => {
    return data.map(entry => {
      const actualRevenue = entry.totals.total_actual_revenue ?? 0;
      const optimizedRevenue = entry.totals.total_optimized_revenue ?? 0;
      const revenueGap = entry.totals.revenue_gap ?? 0;
      const missedOpportunity = revenueGap > 0 ? revenueGap : 0;
      const captureRate = optimizedRevenue > 0 ? (actualRevenue / optimizedRevenue) * 100 : null;

      return {
        label: formatMonthLabel(entry.month),
        month: entry.month,
        year: entry.year,
        actualRevenue,
        missedOpportunity,
        revenueGap,
        optimizedRevenue,
        captureRate,
      };
    });
  }, [data]);

  const leftAxisMax = useMemo(() => {
    const maxValue = chartData.reduce((max, entry) => {
      const stackedTotal = entry.actualRevenue + entry.missedOpportunity;
      return Math.max(max, entry.actualRevenue, entry.optimizedRevenue, stackedTotal);
    }, 0);

    return maxValue > 0 ? maxValue * 1.12 : 1;
  }, [chartData]);

  const rightAxisMax = useMemo(() => {
    const maxCaptureRate = chartData.reduce((max, entry) => {
      if (entry.captureRate === null) return max;
      return Math.max(max, entry.captureRate);
    }, 100);

    return maxCaptureRate > 100 ? Math.ceil(maxCaptureRate / 10) * 10 : 100;
  }, [chartData]);

  const barSize = (() => {
    if (chartData.length < 3) {
      return 250;
    }
    if (chartData.length < 6) {
      return 150;
    }
    if (chartData.length < 9) {
      return 75;
    }
    if (chartData.length <= 12) {
      return 35;
    }
  })();

  function getRoundedBarRadius(hasSegmentAbove: boolean): number[] {
    return hasSegmentAbove ? [0, 0, 0, 0] : [4, 4, 0, 0];
  }

  function renderCaptureRateLabel(labelProps: any) {
    const {x, y, value} = labelProps;
    if (value === null || value === undefined || Number.isNaN(value)) return null;

    const numericValue = Number(value);
    const positionY = numericValue > 90 ? y - 22 : y + 24;
    const fill = '#FFFAC9';
    const textColor = 'var(--color-secondary)';

    return (
      <g transform={`translate(${x}, ${positionY})`}>
        <rect x={-16} y={-11} rx={7} ry={7} width={32} height={18} fill={fill} />
        <text x={0} y={3} fill={textColor} fontSize={11} fontWeight={600} textAnchor="middle">
          {`${Math.round(numericValue)}%`}
        </text>
      </g>
    );
  }

  function renderTooltip({active, payload}: any) {
    if (!active || !payload?.length) return null;

    const current = payload[0]?.payload as ChartEntry | undefined;
    if (!current) return null;

    const captureRateStyle = getCaptureRateStyle(current.captureRate);
    const isOutperformance = current.revenueGap < 0;
    const varianceLabel = isOutperformance ? 'Outperformance' : 'Missed Opportunity';
    const varianceValue = formatCompactPound(Math.abs(current.revenueGap));
    const optimizedRevenueIsZero = current.optimizedRevenue === 0;

    return (
      <div className="rounded-md border border-border bg-white px-4 py-3 shadow-[0_10px_35px_rgba(16,24,40,0.12)]">
        <Text variant="16M" className="text-text-primary!">
          {formatMonthYearLabel(current.month, current.year)}
        </Text>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-start gap-1">
            <Text variant="14R" className="text-text-secondary!">
              Captured Revenue (Actual) :{' '}
            </Text>
            <Text variant="14M" className="text-[#5276B4]!">
              {formatCompactPound(current.actualRevenue)}
            </Text>
          </div>

          <div className="flex items-start gap-1">
            <Text variant="14R" className="text-text-secondary!">
              {varianceLabel} :{' '}
            </Text>
            <Text variant="14M" className="text-[#CC4141]!">
              {varianceValue}
            </Text>
          </div>

          <div className="flex items-start gap-1 mt-2">
            <Text variant="14R">Total Optimized Revenue : </Text>
            <Text variant="14M">{formatCompactPound(current.optimizedRevenue)}</Text>
          </div>

          <div className="flex items-start gap-1 border-t border-border pt-3">
            <Text variant="14R" className="text-text-secondary!">
              Capture Rate :{' '}
            </Text>
            <Text variant="14M" style={{color: captureRateStyle.color}}>
              {captureRateStyle.label}
            </Text>
          </div>

          {optimizedRevenueIsZero && (
            <Text variant="12R" className="mt-1 text-text-secondary!">
              Optimized revenue is zero, so capture rate cannot be calculated.
            </Text>
          )}
        </div>
      </div>
    );
  }

  function renderLegendItem(color: string, label: string, type: 'bar' | 'line' = 'bar') {
    return (
      <div className="flex items-center gap-2">
        {type === 'bar' ? (
          <span className="h-4 w-6 rounded" style={{backgroundColor: color}} />
        ) : (
          <span className="h-1 w-8 bg-[#F0E000] relative">
            <span className="size-3 absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 rounded-lg bg-[#F0E000]" />
          </span>
        )}
        <Text variant="12M">{label}</Text>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="mt-6 rounded-md border border-border bg-white p-4 shadow-2xl/3">
        <div className="flex h-80 items-center justify-center">
          <Text variant="14R" className="text-text-secondary!">
            No chart data available.
          </Text>
        </div>
      </div>
    );
  }

  if (loading){
    return <StackedBarGraphSekleton />
  }

  return (
    <div className="mt-6 rounded-md bg-white  py-y shadow-2xl/3">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-x-12 gap-y-2">
        {renderLegendItem('#6D84B5', 'Captured Revenue (Actual)')}
        {renderLegendItem('#CC4141', 'Missed Opportunity')}
        {renderLegendItem('#F0E000', 'Capture Rate (%)', 'line')}
      </div>

      <div className={cn('h-105 w-full sm:h-115')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} className="pr-4" margin={{top: 10, right: 30, left: 24, bottom: 8}}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} yAxisId={'left'} />
            <XAxis
              dataKey="label"
              axisLine={{stroke: 'var(--color-border)'}}
              tickLine={false}
              tickMargin={12}
              interval={0}
              tick={{fill: '#64748B', fontSize: 12}}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={{stroke: 'var(--color-border)'}}
              tickLine={false}
              tickMargin={10}
              width={44}
              domain={[0, leftAxisMax]}
              tickFormatter={value => formatNumber(Number(value))}
              tick={{fill: '#64748B', fontSize: 12}}
              label={{
                value: 'Revenue (£)',
                angle: -90,
                position: 'insideLeft',
                offset: -15,
                style: {
                  fill: 'var(--color-text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textAnchor: 'middle',
                  fontFamily: 'Inter-Medium',
                },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={{stroke: 'var(--color-border)'}}
              tickLine={false}
              tickMargin={10}
              width={44}
              domain={[0, rightAxisMax]}
              tickFormatter={value => `${Math.round(Number(value))}%`}
              tick={{fill: '#64748B', fontSize: 12}}
              label={{
                value: 'Capture Rate (%)',
                angle: 90,
                position: 'insideRight',
                offset: -22,
                style: {
                  fill: 'var(--color-text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textAnchor: 'middle',
                  fontFamily: 'Inter-Medium',
                },
              }}
            />
            <Tooltip content={renderTooltip} cursor={{fill: 'rgba(17, 21, 43, 0.04)'}} />
            <Bar
              yAxisId="left"
              dataKey="actualRevenue"
              name="Captured Revenue (Actual)"
              stackId="revenue"
              fill="#6D84B5"
              barSize={barSize}>
              {chartData.map(entry => (
                <Cell
                  key={`actual-${entry.year}-${entry.month}`}
                  radius={getRoundedBarRadius(entry.missedOpportunity > 0) as any}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="missedOpportunity"
              name="Missed Opportunity"
              stackId="revenue"
              fill="#CC4141"
              barSize={barSize}>
              {chartData.map(entry => (
                <Cell key={`missed-${entry.year}-${entry.month}`} radius={[4, 4, 0, 0] as any} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="captureRate"
              name="Capture Rate (%)"
              stroke="#F0E000"
              strokeWidth={2}
              dot={{r: 4, fill: '#F0E000', stroke: '#F0E000', strokeWidth: 1}}
              activeDot={{r: 5, fill: '#F0E000', stroke: '#F0E000'}}
              connectNulls={false}>
              <LabelList content={renderCaptureRateLabel} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function StackedBarGraphSekleton() {
  function BarGroup({ data }: { data: [number, number] }) {
    return (
      <div className="flex flex-col items-end">
        <Skeleton height={data[0]} className="w-20 rounded-t bg-[#D7D7D7]!" />
        <Skeleton height={data[1]} className="w-20" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="w-3! h-40! rounded-lg!" />
      <div className="h-80 flex flex-col grow">
        <div className="flex grow justify-evenly items-end relative border-l border-r border-b border-border ">
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-0" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-1/4" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-1/2" />
          <div className="border border-dashed translate-y-4 border-border w-full absolute top-3/4" />

          {[
            [20, 120],
            [24, 150],
            [70, 35],
            [48, 182],
            [160, 78],
            [120, 91],
            [132, 40],
          ].map((item) => (
            <BarGroup data={item as any} />
          ))}
        </div>
        <Skeleton className="h-3! min-h-3! w-40! rounded-lg! self-center! mt-4" />
      </div>
      <Skeleton className="w-3! h-40! rounded-lg!" />
    </div>
  );
}
