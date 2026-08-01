import React, {useMemo, useRef, type ReactNode} from 'react';
import {IconButton, Text} from '../../../ui-kit';
import {useChartTooltip, useChartsActionV2} from '../../../hooks';
import {cn} from '../../../utils';
import {WithFallback} from '../../SkelatonWrapper';
import {arc, pie, PieArcDatum} from 'd3-shape';
import {Divider, DonutSegment} from '../../..';

/**
 * Extended DonutSegment with color for pie generator
 */
type DonutDataSegment = {
  color: string;
} & DonutSegment;

type GhostDonutSegment = {
  value: number;
  color: string;
};

export type CalloutDonutLegendItem = {
  label: string;
  value: number;
  percentage?: number;
  color: string;
};

/**
 * Defaults for Donut Chart
 */
const SEGMENTED_DONUT_SIZE = 240;
const SEGMENTED_DONUT_STROKE_WIDTH = 20;
const SEGMENTED_DONUT_SEGMENT_RADIUS = 8;
const GHOST_DONUT_SEGMENTS: GhostDonutSegment[] = [
  {value: 42, color: '#E9EAF0'},
  {value: 58, color: '#DADADA'},
];

const degToRad = (deg: number) => (deg * Math.PI) / 180;

function chunkIntoColumns<T>(items: T[], rowsPerColumn: number) {
  const columns: T[][] = [];
  for (let i = 0; i < items.length; i += rowsPerColumn) {
    columns.push(items.slice(i, i + rowsPerColumn));
  }
  return columns;
}

function CalloutDonutGhostLoader({
  size,
  radius,
  innerRadius,
  segmentRadius,
}: {
  size: number;
  radius: number;
  innerRadius: number;
  segmentRadius: number;
}) {
  const ghostPieGenerator = pie<GhostDonutSegment>()
    .value(d => d.value)
    .sort(null)
    .padAngle(0.045)
    .startAngle(0)
    .endAngle(2 * Math.PI);

  const ghostArcGenerator = arc<any>().innerRadius(innerRadius).outerRadius(radius).cornerRadius(segmentRadius);

  const ghostArcs = ghostPieGenerator(GHOST_DONUT_SEGMENTS);

  return (
    <div className="mx-auto animate-pulse" style={{width: size, height: size}}>
      <svg width={size} height={size}>
        <g transform={`translate(${radius}, ${radius})`}>
          {ghostArcs.map((arcData, index) => (
            <path
              key={GHOST_DONUT_SEGMENTS[index].color}
              d={ghostArcGenerator(arcData) ?? undefined}
              fill={GHOST_DONUT_SEGMENTS[index].color}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * CalloutDonut Props
 */
interface CalloutDonutProps {
  title?: string;
  downloadFileName?: string;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  orientation?: 'vertical' | 'horizontal';

  // className
  actionWrapperClassName?: string;
  className?: string;
  headerClassName?: string;
  chartWrapperClassName?: string;
  legendWrapperClassName?: string;
  legendColumnClassName?: string;
  legendItemClassName?: string;
  centerContentClassName?: string;
  customActions?: ReactNode;

  // shapeConfig,
  shapeConfig?: {
    size?: number;
    strokeWidth?: number;
    radius?: number;
    offset?: number;
    segmentRadius?: number;
    padAngle: number;
  };

  // data
  data: DonutDataSegment[];

  // centerContent
  renderCenterContent?: boolean;
  centerContentLabel?: string;
  centerContentChildren?: (isFullScreen?: boolean) => React.ReactNode;
  legendRenderer?: (items: CalloutDonutLegendItem[], isFullScreen?: boolean) => ReactNode | null;
  renderTooltip?: (tooltip: {label: string; value: number; percentage: number; color: string}) => ReactNode;
  customTooltipRenderer?: (tooltip: {label: string; value: number; percentage: number; color: string}) => ReactNode;
}
export function CalloutDonut(props: CalloutDonutProps) {
  const {
    title,
    isLoading = false,
    downloadFileName,
    isFullScreenOverride,
    orientation = 'vertical',

    // className
    actionWrapperClassName,
    className,
    headerClassName,
    chartWrapperClassName,
    legendWrapperClassName,
    legendColumnClassName,
    legendItemClassName,
    centerContentClassName,
    customActions,

    // shapeConfig,
    shapeConfig,

    // data
    data = [],

    // centerContent
    renderCenterContent = false,
    centerContentLabel = '',
    centerContentChildren,
    legendRenderer,
    renderTooltip,
    customTooltipRenderer,
  } = props;

  /**
   * ===================
   * Hooks
   * ===================
   */
  const {chartRef, handleDownLoad, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: downloadFileName ?? 'chart.png',
    renderFullScreen: () => {
      return <CalloutDonut {...props} isFullScreenOverride />;
    },
  });
  const donutWrapperRef = useRef<HTMLDivElement | null>(null);
  const {tooltip, handleMouseMove, handleMouseLeave} = useChartTooltip<DonutDataSegment>(donutWrapperRef as any);

  /**
   * ===================
   * Derived Values
   * ===================
   */
  /**
   * size: the overall size of the SVG element, which determines the width and height of the chart. It defaults to a predefined constant but can be overridden by the shapeConfig prop.
   */
  const size = shapeConfig?.size || getSizeUnits(SEGMENTED_DONUT_SIZE);

  /**
   * strokeWidth: the thickness of the donut segments, which affects the inner radius of the arcs. It also defaults to a predefined constant and can be customized via shapeConfig.
   */
  const strokeWidth = shapeConfig?.strokeWidth || getSizeUnits(SEGMENTED_DONUT_STROKE_WIDTH);

  /**
   * resolvedPadAngle: the padding angle between each segment of the donut chart. It defaults to a predefined constant but can be overridden by the shapeConfig prop.
   */
  const resolvedPadAngle = shapeConfig?.padAngle ?? 0.04;

  /**
   * radius and innerRadius: the outer and inner radii of the donut chart, which determine the size of the arcs. The radius is calculated based on the size and strokeWidth, while the innerRadius is derived from the radius by subtracting the strokeWidth.
   */
  const radius = shapeConfig?.radius || getSizeUnits(SEGMENTED_DONUT_SIZE) / 2;

  /**
   * innerRadius is calculated by subtracting the strokeWidth from the radius, which creates the hollow center of the donut chart. This allows for a clear visual distinction between the segments and the center, enhancing readability and aesthetics of the chart.
   */
  const innerRadius = radius - strokeWidth;

  /**
   * normalizedData: the input data is normalized to ensure that all values are positive and to calculate the percentage representation of each segment. This is important for the pie generator to correctly compute the angles for each segment based on their relative values. The normalization process also allows for consistent rendering of the chart, regardless of the original data format.
   */
  const normalizedData = useMemo(() => {
    return data?.map(item => ({
      ...item,
      value: Math.abs(item.value),
    }));
  }, [data]);

  const legendItems = useMemo<CalloutDonutLegendItem[]>(
    () =>
      normalizedData.map(item => ({
        label: item.label,
        value: item.value,
        percentage: item.percentage,
        color: item.color,
      })),
    [normalizedData],
  );

  /**
   * total periods
   */

  const total = useMemo(() => {
    return normalizedData.reduce((s, d) => s + Math.abs(d.value), 0);
  }, [normalizedData]);

  const tooltipRenderer = customTooltipRenderer ?? renderTooltip;
  // In fullscreen always stack vertically (donut top, legend bottom)
  const isHorizontal = !isFullScreenOverride && orientation === 'horizontal';
  const legendColumns = useMemo(() => chunkIntoColumns(legendItems, 4), [legendItems]);

  /**
   * optimalStart: the optimal starting angle for the first segment of the donut chart, which is calculated to minimize visual imbalance. If the shapeConfig does not specify an offset, the findOptimalStartAngle function is used to determine the best starting angle based on the distribution of the data segments. This helps to ensure that the chart is visually balanced and that segments are distributed in a way that enhances readability and aesthetics.
   */
  const optimalStart = useMemo(
    () => (shapeConfig?.offset === undefined ? findOptimalStartAngle(normalizedData, resolvedPadAngle) : null),
    [normalizedData, resolvedPadAngle, shapeConfig?.offset],
  );

  /**
   * startAngleRad: the starting angle for the pie generator, which is determined based on either the optimal starting angle calculated from the data or a specified offset from the shapeConfig. This angle is crucial for the correct rendering of the donut chart, as it sets the initial position of the first segment and influences the overall layout and balance of the chart.
   */
  const startAngleRad = optimalStart !== null ? optimalStart : degToRad(shapeConfig?.offset ?? 0);

  /**
   * D3 Generators
    - pieGenerator: creates the data structure for the arcs based on the input data and configuration
   */
  const pieGenerator = pie<DonutDataSegment>()
    .value(d => d.value)
    .sort(null)
    .padAngle(shapeConfig?.padAngle || 0.04)
    .startAngle(startAngleRad)
    .endAngle(startAngleRad + 2 * Math.PI);

  /**
   * D3 Generators
    - arcGenerator: creates the SVG path for each arc based on the calculated angles and radii
   */
  const arcGenerator = arc<any>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(shapeConfig?.segmentRadius || SEGMENTED_DONUT_SEGMENT_RADIUS); // rounded edges

  /**
   * D3 Generators
    - arcs is the result of the pie generator, which takes the input data and transforms it into an array of arc data that includes startAngle, endAngle, and other properties needed to render each segment of the donut chart
   */
  const arcs = pieGenerator(normalizedData);

  /**
   * insideSquarePadding: calculates the padding inside the square that contains the donut chart. This padding is based on the stroke width of the segments, ensuring that the chart is properly centered and that the strokes do not overflow the container.
   */

  const insideSquarePadding = useMemo(() => {
    // need to calculate the padding such that the inner circle inscribed in the square
    const offset = innerRadius - innerRadius / Math.sqrt(2);
    const strokeWidth = shapeConfig?.strokeWidth || SEGMENTED_DONUT_STROKE_WIDTH;

    const padding = offset + strokeWidth;
    return padding;
  }, [shapeConfig?.strokeWidth, innerRadius]);

  /**
   * ===================
   * Functions
   * ===================
   */
  function getSizeUnits(unit: number) {
    if (isFullScreenOverride) {
      return unit * 1.7;
    }
    return unit;
  }

  function findOptimalStartAngle(data: DonutDataSegment[], padAngle: number): number {
    const n = data.length;
    const total = data.reduce((s, d) => s + Math.abs(d.value), 0);
    if (!total || !n) return 0;

    const unitSweep = (2 * Math.PI - padAngle * n) / total;
    let bestAngle = 0,
      bestScore = Infinity;

    for (let i = 0; i < 3600; i++) {
      const start = (i / 3600) * 2 * Math.PI;
      let lc = 0,
        rc = 0,
        lv = 0,
        rv = 0,
        cur = start;

      for (const d of data) {
        const sweep = Math.abs(d.value) * unitSweep;
        const mid = cur + sweep / 2;
        if (Math.cos(mid - Math.PI / 2) >= 0) {
          rc++;
          rv += Math.abs(d.value);
        } else {
          lc++;
          lv += Math.abs(d.value);
        }
        cur += sweep + padAngle;
      }

      const score =
        Math.abs(lc - rc) * 1000 + // primary  : count
        (Math.abs(lv - rv) / total) * 100; // secondary: value
      if (score < bestScore) {
        bestScore = score;
        bestAngle = start;
      }
    }
    return bestAngle;
  }

  function buildArc(arcData: PieArcDatum<DonutDataSegment>, i: number) {
    const path = arcGenerator(arcData);
    const segment = normalizedData[i];
    return (
      <g>
        <path
          key={i}
          d={path!}
          fill={segment.color}
          className="cursor-pointer"
          onMouseMove={e => handleMouseMove(e, segment)}
          onMouseLeave={handleMouseLeave}
        />
      </g>
    );
  }

  function DefaultTooltip({
    label,
    value,
    percentage,
    color,
  }: {
    label: string;
    value: number;
    percentage: number;
    color: string;
  }) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-md">
        <Text variant="12SB" className="text-text-primary!">
          {label}
        </Text>
        <div className="mt-2 flex flex-col gap-1">
          <Text variant="12M" className="text-text-secondary!">
            Periods: <span className="font-InterMedium text-text-primary">{value}</span>
          </Text>
          <Text variant="12M" style={{color}}>
            Share: {Math.abs(percentage).toFixed(1)}%
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        'bg-white px-6 lg:px-12 py-6 flex flex-col gap-4 border border-border rounded-md',
        isFullScreenOverride && 'flex-1 max-[1025px]:flex-none',
        className,
      )}>
      <div className={cn('justify-between flex gap-6', headerClassName)}>
        {title && <Text variant="h4">{title}</Text>}
        {!isLoading && (
          <div className={cn('gap-4 flex items-center shrink-0 flex-nowrap chart-actions', actionWrapperClassName)}>
            {customActions}
            <IconButton
              name="download"
              size={16}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
              onClick={handleDownLoad}
            />
            {!isFullScreenOverride ? (
              <IconButton
                name="maximize"
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={isFullScreenOverride ? undefined : onMaximize}
              />
            ) : (
              <IconButton
                name="minimize"
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMinimize}
              />
            )}
          </div>
        )}
      </div>

      {/* renderFullScreen will handle the full screen view, so we only need to render the children when it's not in full screen mode */}
      <WithFallback
        isLoading={isLoading}
        fallback={
          <CalloutDonutGhostLoader
            size={size}
            radius={radius}
            innerRadius={innerRadius}
            segmentRadius={shapeConfig?.segmentRadius || SEGMENTED_DONUT_SEGMENT_RADIUS}
          />
        }>
        <div
          className={cn(
            'flex w-full gap-8',
            isFullScreenOverride && 'min-[1026px]:gap-18',
            isHorizontal ? 'flex-row items-center justify-evenly' : 'flex-col items-center',
            chartWrapperClassName,
          )}>
          <div
            ref={donutWrapperRef}
            className={cn('relative shrink-0', !isHorizontal && 'mt-1')}
            style={{width: size, height: size}}>
            <svg width={size} height={size}>
              <g transform={`translate(${radius}, ${radius})`}>{arcs.map(buildArc)}</g>
            </svg>

            {renderCenterContent && (
              <div
                style={{
                  top: insideSquarePadding,
                  left: insideSquarePadding,
                  right: insideSquarePadding,
                  bottom: insideSquarePadding,
                }}
                className={cn('absolute flex flex-col items-center justify-center', centerContentClassName)}>
                <Text variant={isFullScreenOverride ? '16M' : 'caption'} className="text-text-secondary!">
                  {centerContentLabel || 'Total Periods'}
                </Text>
                <Text variant={isFullScreenOverride ? 'h2' : 'h3'}>{total}</Text>

                {centerContentChildren && (
                  <>
                    <Divider className="my-2 px-4" />
                    {centerContentChildren(isFullScreenOverride)}
                  </>
                )}
              </div>
            )}

            {!isLoading && tooltip && (
              <div
                className="pointer-events-none absolute z-50"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: 'translate(-50%, -120%)',
                }}>
                {tooltipRenderer ? (
                  tooltipRenderer({
                    label: tooltip.data.label,
                    value: tooltip.data.value,
                    percentage: tooltip.data.percentage ?? (total > 0 ? (tooltip.data.value / total) * 100 : 0),
                    color: tooltip.data.color,
                  })
                ) : (
                  <DefaultTooltip
                    label={tooltip.data.label}
                    value={tooltip.data.value}
                    percentage={tooltip.data.percentage ?? (total > 0 ? (tooltip.data.value / total) * 100 : 0)}
                    color={tooltip.data.color}
                  />
                )}
              </div>
            )}
          </div>

          <div className={cn('shrink-0', isFullScreenOverride && 'w-full', legendWrapperClassName)}>
            {legendRenderer ? (
              legendRenderer(legendItems, isFullScreenOverride)
            ) : isFullScreenOverride ? (
              <div className="w-full flex flex-wrap gap-x-8 gap-y-8 pt-2 min-[1026px]:pl-10">
                {legendItems.map(item => (
                  <CalloutDonutLegendItem
                    {...item}
                    key={item.label}
                    className={cn('w-[calc(20%-1.6rem)] min-w-0! shrink-0', legendItemClassName)}
                  />
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  'flex w-full',
                  isHorizontal ? 'gap-8 justify-start' : 'flex-wrap items-start justify-between gap-x-20 gap-y-8 pt-2',
                )}>
                {isHorizontal
                  ? legendColumns.map((column, columnIndex) => (
                      <div key={columnIndex} className={cn('flex flex-col gap-10', legendColumnClassName)}>
                        {column.map(item => (
                          <CalloutDonutLegendItem className={legendItemClassName} {...item} key={item.label} />
                        ))}
                      </div>
                    ))
                  : legendItems.map(item => (
                      <CalloutDonutLegendItem
                        className={cn('min-w-fit!', legendItemClassName)}
                        {...item}
                        key={item.label}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>
      </WithFallback>
    </div>
  );
}

export interface CalloutDonutLegendItemProps extends CalloutDonutLegendItem {
  className?: string;
}
export function CalloutDonutLegendItem(props: CalloutDonutLegendItemProps) {
  const {color, label, value, className} = props;
  return (
    <div key={label} className={cn('flex min-[1025px]:min-w-42.5 min-w-fit items-center gap-3', className)}>
      <span className="h-10 w-1.5 shrink-0 rounded-r-lg" style={{backgroundColor: color}} />
      <div className="flex flex-col gap-0.5">
        <Text variant="14M" className="text-text-primary! leading-none">
          {label}
        </Text>
        <Text variant="12R" className="text-text-secondary! leading-none">
          Periods : {value}
        </Text>
      </div>
    </div>
  );
}
