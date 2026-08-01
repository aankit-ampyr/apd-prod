import {IconButton, Skeleton} from '@/ui-kits';
import {cn} from '@/utils';
import {WithFallback} from '../../common';
import {useMemo, useState} from 'react';
import {useChartsActionV2} from '@/hooks';

export type ChartDataPoint = {
  month: string;
  monthNumber: number;
  year: number;
  value: number;
};

export type ChartSeriesKey = 'actual' | 'modo' | 'iar';

export type ChartSeries = {
  key: ChartSeriesKey;
  label: string;
  color: string;
  data: ChartDataPoint[];
};

export type YAxisLabel = {
  label: string;
  level: string;
  value: number;
  color: string;
};

type ChartTooltipSeriesItem = {
  key: ChartSeriesKey;
  label: string;
  color: string;
  value: number;
};

type ChartTooltipData = {
  month: string;
  year: number;
  series: ChartTooltipSeriesItem[];
};

type ChartTooltipState = ChartTooltipData & {
  left: string;
  top: string;
};

type IndustryComparisonGraphProps = {
  chartSeries: ChartSeries[];
  dynamicYAxisLabels: YAxisLabel[];
  downloadFileName: string;
  getTopPosition: (value: number) => string;
  yAxisTicks: number[];
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  customActions?: React.ReactNode;
};

function getLeftPosition(index: number, length: number) {
  return `${((index + 1) / (length + 1)) * 100}%`;
}

function getBenchmarkTopPosition(index: number, length: number) {
  if (length <= 0) return '50%';

  return `${((index + 1) / (length + 1)) * 100}%`;
}

function buildTooltipMonth(month: string, year: number) {
  return `${month} ${year}`;
}

function formatPoundCompact(value: number) {
  return `\u00a3${(value / 1000).toFixed(1)}k`;
}

function getTooltipSeriesLabel(key: ChartSeriesKey) {
  switch (key) {
    case 'actual':
      return 'Actual Revenue (£/MW)';
    case 'modo':
      return 'Modo Benchmark (£/MW)';
    case 'iar':
      return 'IAR Projection (£/MW)';
    default:
      return key;
  }
}

function formatBenchmarkLabel(item: YAxisLabel, upperBound: number, lowerBound: number) {
  if (item.level.includes('High')) {
    return `(≥ ${formatPoundCompact(upperBound)})`;
  }

  if (item.level.includes('Mid')) {
    return `(${formatPoundCompact(lowerBound)} – ${formatPoundCompact(upperBound)})`;
  }

  return `(≤ ${formatPoundCompact(lowerBound)})`;
}

function formatPoundTick(value: number) {
  const valueInThousands = value / 1000;
  const formatted = Number.isInteger(valueInThousands) ? valueInThousands.toFixed(0) : valueInThousands.toFixed(1);

  return `\u00a3${formatted}k`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createLinePath(data: ChartDataPoint[], getTopPosition: (value: number) => string) {
  return data
    .map((item, index) => {
      const x = Number.parseFloat(getLeftPosition(item.monthNumber - 1, MONTH_LABELS.length));
      const y = Number.parseFloat(getTopPosition(item.value));

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

const getMonthLabel = (month: number) =>
  new Date(2025, month - 1).toLocaleString('en-GB', {
    month: 'short',
  });

const MONTH_LABELS = Array.from({length: 12}, (_, index) => getMonthLabel(index + 1));

export function InductryComparisonGraph(props: Readonly<IndustryComparisonGraphProps>) {
  const {
    chartSeries,
    dynamicYAxisLabels,
    downloadFileName,
    getTopPosition,
    yAxisTicks,
    isLoading = false,
    isFullScreenOverride = false,
    customActions,
  } = props;
  const [tooltipState, setTooltipState] = useState<ChartTooltipState | null>(null);

  const {chartRef, handleDownLoad, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <InductryComparisonGraph {...props} isFullScreenOverride />,
  });

  const tooltipByMonth = useMemo(() => {
    const map = new Map<string, ChartTooltipData>();

    chartSeries.forEach(series => {
      series.data.forEach(item => {
        const key = `${item.year}-${item.monthNumber}`;
        const existing = map.get(key);

        if (existing) {
          existing.series.push({
            key: series.key,
            label: series.label,
            color: series.color,
            value: item.value,
          });
          return;
        }

        map.set(key, {
          month: item.month,
          year: item.year,
          series: [
            {
              key: series.key,
              label: series.label,
              color: series.color,
              value: item.value,
            },
          ],
        });
      });
    });

    return map;
  }, [chartSeries]);

  const isFullScreen = isFullScreenOverride;
  const benchmarkValues = dynamicYAxisLabels.map(item => item.value).filter(Number.isFinite);
  const benchmarkUpperBound = benchmarkValues.length ? Math.max(...benchmarkValues) : 0;
  const benchmarkLowerBound = benchmarkValues.length ? Math.min(...benchmarkValues) : 0;

  function handleChartDownload() {
    if (!chartRef.current) return;

    const el = chartRef.current;

    el.classList.add('downloading');

    requestAnimationFrame(() => {
      handleDownLoad();
      el.classList.remove('downloading');
    });
  }

  function showTooltip(item: ChartDataPoint) {
    const key = `${item.year}-${item.monthNumber}`;
    const tooltipData = tooltipByMonth.get(key);
    if (!tooltipData) return;

    const leftPercent = Number.parseFloat(getLeftPosition(item.monthNumber - 1, MONTH_LABELS.length));
    const topPercent = Number.parseFloat(getTopPosition(item.value));
    const adjustedTopPercent = clamp(topPercent - 16, 6, 86);

    setTooltipState({
      ...tooltipData,
      left: `${leftPercent}%`,
      top: `${adjustedTopPercent}%`,
    });
  }

  function hideTooltip() {
    setTooltipState(null);
  }

  return (
    <div
      ref={chartRef}
      className={cn('flex grow flex-col bg-white', isFullScreen && 'grow rounded-xl border border-border pt-6')}>
      {isFullScreen && (
        <div className="flex items-center justify-center">
          <span className="text-[25px] font-InterBold! leading-[30px] tracking-normal text-[#11132B]">
            Revenue <span className="text-primary!">vs</span> Benchmarks
          </span>
        </div>
      )}
      <div className={cn('chart-actions flex items-center justify-end gap-3', isFullScreen ? 'px-6' : '')}>
        {isLoading ? (
          <>
            <Skeleton animation="wave" variant="rounded" width={32} height={32} className="rounded-md!" />
            <Skeleton animation="wave" variant="rounded" width={32} height={32} className="rounded-md!" />
          </>
        ) : (
          <>
            {customActions}
            <IconButton
              name="download"
              size={20}
              onClick={handleChartDownload}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            />
          </>
        )}
        {!isLoading &&
          (!isFullScreen ? (
            <IconButton
              name="maximize"
              size={20}
              onClick={onMaximize}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            />
          ) : (
            <IconButton
              name="minimize"
              size={20}
              onClick={onMinimize}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            />
          ))}
      </div>

      <WithFallback
        isLoading={isLoading}
        fallback={
          <div className="flex grow items-center justify-center px-4 py-4">
            <div className="grid w-full! grid-cols-[112px_minmax(0,1fr)] grid-rows-[446px_36px]">
              <div className="relative row-start-1">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={72}
                  height={14}
                  className="absolute right-3 top-20 rounded-full!"
                />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={82}
                  height={14}
                  className="absolute right-3 top-1/2 rounded-full!"
                />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={68}
                  height={14}
                  className="absolute right-3 bottom-20 rounded-full!"
                />
              </div>
              <Skeleton
                animation="wave"
                variant="rounded"
                width="100%"
                height={446}
                className="row-start-1 rounded-[14px]!"
              />
              <div className="relative col-start-2 row-start-2">
                <div className="flex h-full items-center justify-between pt-2">
                  {MONTH_LABELS.map(month => (
                    <Skeleton
                      key={`ghost-${month}`}
                      animation="wave"
                      variant="rounded"
                      width={26}
                      height={12}
                      className="rounded-full!"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        }>
        <div className="flex grow flex-col items-center justify-center px-4 py-4">
          <div className="mb-7 flex w-full items-center justify-end gap-8 pr-38">
            {chartSeries.map(series => (
              <div key={`legend-${series.key}`} className="flex items-center gap-2.5">
                <span className="block size-2.5 rounded-full" style={{backgroundColor: series.color}} />
                <span className="text-small font-InterMedium leading-none text-[#11132B]">{series.label}</span>
              </div>
            ))}
          </div>

          <div className="grid w-full! grid-cols-[80px_minmax(0,1fr)_104px] grid-rows-[446px_50px]">
            <div className="relative row-start-1">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[13px] font-normal leading-none text-[#172033]">
                {'\u00a3'}/MW (Month)
              </div>

              {yAxisTicks.map(item => (
                <div
                  key={item}
                  className="absolute right-5 -translate-y-1/2 text-small font-InterSemiBold leading-none text-[#050816]"
                  style={{top: getTopPosition(item)}}>
                  {formatPoundTick(item)}
                </div>
              ))}
            </div>

            <div
              className="relative row-start-1 overflow-x-visible overflow-y-visible rounded-t-[14px]"
              onMouseLeave={hideTooltip}
              style={{
                background: `linear-gradient(
                  180deg,
                  rgba(178, 254, 159, 0.75) 0%,
                  rgba(255, 231, 161, 0.75) 49.04%,
                  rgba(255, 131, 131, 0.75) 100%
                )`,
              }}>
              <div className="pointer-events-none absolute inset-x-0 top-full h-4 rounded-b-[14px] bg-[rgba(255,131,131,0.75)]" />

              <svg
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                shapeRendering="crispEdges">
                {dynamicYAxisLabels.map((item, index) => {
                  const y = Number.parseFloat(getBenchmarkTopPosition(index, dynamicYAxisLabels.length));

                  return (
                    <line
                      key={`benchmark-line-${item.level}-${item.value}`}
                      x1="0"
                      x2="100"
                      y1={y}
                      y2={y}
                      stroke={item.color}
                      strokeDasharray="6 6"
                      strokeLinecap="butt"
                      strokeWidth="2"
                      opacity="0.55"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {tooltipState && (
                <div
                  className="pointer-events-none absolute z-20 w-max max-w-none rounded-xl border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_12px_40px_rgba(17,19,43,0.18)] backdrop-blur-sm"
                  style={{
                    left: tooltipState.left,
                    top: tooltipState.top,
                    transform: 'translate(-50%, -100%)',
                    minWidth: '260px',
                  }}>
                  <div className="mb-2 font-InterBold leading-tight text-caption! text-[#11132B]">
                    {buildTooltipMonth(tooltipState.month, tooltipState.year)}
                  </div>
                  <div className="flex flex-col gap-3">
                    {tooltipState.series.map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-6 whitespace-nowrap text-small! leading-tight">
                        <span className="font-InterMedium" style={{color: item.color}}>
                          {getTooltipSeriesLabel(item.key)} :
                        </span>
                        <span className="font-InterSemiBold" style={{color: item.color}}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tooltipState && (
                <div
                  className="pointer-events-none absolute z-10 w-px bg-[#94A3B8]/60"
                  style={{
                    left: tooltipState.left,
                    top: 0,
                    bottom: 0,
                  }}
                />
              )}

              <svg
                className="absolute inset-0 size-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none">
                {chartSeries.map(series => (
                  <path
                    key={`line-${series.key}`}
                    d={createLinePath(series.data, getTopPosition)}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              {chartSeries.flatMap(series =>
                series.data.map(item => (
                  <span
                    key={`${series.key}-${item.year}-${item.monthNumber}`}
                    className="absolute block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 hover:scale-125 cursor-pointer"
                    style={{
                      left: getLeftPosition(item.monthNumber - 1, MONTH_LABELS.length),
                      top: getTopPosition(item.value),
                      backgroundColor: series.color,
                    }}
                    onMouseEnter={() => showTooltip(item)}
                  />
                )),
              )}
            </div>

            <div className="relative col-start-2 row-start-2">
              {MONTH_LABELS.map((month, index) => (
                <div
                  key={`label-${month}`}
                  className="absolute top-6 -translate-x-1/2 text-small font-normal leading-none text-[#172033]"
                  style={{left: getLeftPosition(index, MONTH_LABELS.length)}}>
                  {month}
                </div>
              ))}
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-small font-InterSemiBold leading-none text-[#172033] top-12!">
                Months
              </div>
            </div>

            <div className="relative col-start-3 row-start-1">
              {dynamicYAxisLabels.map((item, index) => (
                <div
                  key={`${item.level}-${item.value}`}
                  className="absolute left-3 flex -translate-y-1/2 flex-col items-start gap-1"
                  style={{top: getBenchmarkTopPosition(index, dynamicYAxisLabels.length)}}>
                  <div className="text-[10px] font-InterBold leading-none" style={{color: item.color}}>
                    {item.level}
                  </div>
                  <div className="text-[10px] font-normal leading-none" style={{color: item.color}}>
                    {formatBenchmarkLabel(item, benchmarkUpperBound, benchmarkLowerBound)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </WithFallback>
    </div>
  );
}
