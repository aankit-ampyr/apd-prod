import {
  BarChart,
  CartesianGrid,
  Label,
  LabelProps,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Bar,
  BarShapeProps,
  Rectangle,
  getNiceTickValues,
} from "recharts";
import { useChartsActionV2 } from "../../../../hooks";
import { IconButton, Skeleton, Text, Icon } from "../../../../ui-kit";
import { cn } from "../../../../utils";
import { WithFallback } from "../../../SkelatonWrapper";
import { useEffect, useRef, useState } from "react";

export type DivergentBarData = {
  value: number;
  label: string;
  color?: string;
  commentCount?: number;
};

export type DivergentBarChartTooltipProps = {
  data: DivergentBarData;
};

interface DivergantBarChartsV2Props {
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
  className?: string;
  headerNote?: React.ReactNode;
  isLoading?: boolean;
  title?: string | React.ReactNode;
  data: DivergentBarData[];
  yAxisWidth?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisLabelProps?: LabelProps;
  yAxisLabelProps?: LabelProps;
  barRadius?: number;
  barRoomWidth?: number;
  enableHorizontalScroll?: boolean;
  positiveBarColor?: string;
  positiveBarHoverColor?: string;
  negativeBarColor?: string;
  negativeBarHoverColor?: string;

  barWidth?: number;
  chartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  sepYChartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  showTooltip?: boolean;
  showValues?: boolean;
  barValueLabelFomatter?: (value: number) => string;
  barValueLabelProps?: React.SVGAttributes<SVGTextElement>;
  yBottomDomainPadding?: number;
  yDomainPadding?: number;
  yDomainMaxMultiplier?: number;
  headerClassName?: string;
  yAxisTickFormtter?: (tick: string) => string;
  customActions?: React.ReactNode;

  customTooltipRenderer?: (
    props: DivergentBarChartTooltipProps,
  ) => React.ReactNode;
  onBadgeClick?: (label: string) => void;
}

export function DivergentBarChartV2(props: DivergantBarChartsV2Props) {
  const {
    downloadFileName = "",
    isFullScreenOverride: isFullScreen,
    className,
    headerNote,
    isLoading = false,
    title,
    showTooltip = false,
    showValues = false,
    data,
    barRadius = 6,
    yAxisWidth = 60,
    chartMargins,
    sepYChartMargins,
    barWidth = 30,
    barRoomWidth = 60,
    enableHorizontalScroll,
    xAxisLabel,
    yAxisLabel,
    positiveBarColor = "var(--color-primary)",
    negativeBarColor = "var(--color-error)",
    positiveBarHoverColor,
    negativeBarHoverColor,
    xAxisLabelProps,
    yAxisLabelProps,
    barValueLabelProps,
    barValueLabelFomatter = (v) => v.toString(),
    customTooltipRenderer,
    onBadgeClick,
    yDomainPadding = 0,
    headerClassName,
    yAxisTickFormtter = (v) => v.toString(),
    customActions,
    yDomainMaxMultiplier,
  } = props;

  /**
   * ====================================
   * Hooks
   * ====================================
   */
  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <DivergentBarChartV2 {...props} isFullScreenOverride />
      ),
    });

  /**
   * =================================
   * States & Refs
   * =================================
   */
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const innerChartRef = useRef<HTMLDivElement | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{
    left: number;
    top: number;
    transform: string;
    data: DivergentBarData;
  } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBarTooltip = (
    event: React.MouseEvent<SVGRectElement>,
    barData: DivergentBarData,
  ) => {
    if (!customTooltipRenderer && !showTooltip) return;
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }
    // Use the inner relative div — stays correct even when chart is scrolled horizontally
    const containerRect = innerChartRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();
    const container = innerChartRef.current;
    
    if (!containerRect || !targetRect || !container) return;

    let left = targetRect.left - containerRect.left + targetRect.width / 2;
    let top = targetRect.top - containerRect.top - 8;
    let transform = "translate(-50%, -100%)";

    const host = chartHostRef.current;
    const scrollLeft = host ? host.scrollLeft : 0;
    const visibleWidth = host ? host.clientWidth : containerRect.width;
    const visibleLeft = scrollLeft;
    const visibleRight = scrollLeft + visibleWidth;

    const tooltipEstimatedWidth = 240;
    const tooltipEstimatedHeight = 120;

    // Horizontal collision
    if (left - tooltipEstimatedWidth / 2 < visibleLeft) {
      left = visibleLeft + tooltipEstimatedWidth / 2 + 12;
    } else if (left + tooltipEstimatedWidth / 2 > visibleRight) {
      left = visibleRight - tooltipEstimatedWidth / 2 - 12;
    }

    // Vertical collision (Top edge clipping for high bars)
    if (top - tooltipEstimatedHeight < 0) {
      top = targetRect.top - containerRect.top + 16;
      transform = "translate(-50%, 0)";
    }

    setHoverTooltip({
      left,
      top,
      transform,
      data: barData,
    });
  };

  const hideBarTooltip = () => {
    if (!customTooltipRenderer && !showTooltip) return;
    tooltipTimeout.current = setTimeout(() => {
      setHoverTooltip(null);
    }, 300);
  };

  /**
   * =================================
   * Derived States
   * =================================
   */
  const scrollWidth = data.length * barRoomWidth;
  const niceTickDomain: [number, number] = (() => {
    const values = data.map((item) => item.value);
    let max = Math.max(...values);
    let min = Math.min(...values);

    if (yDomainMaxMultiplier) {
      max = max > 0 ? Math.ceil(max * yDomainMaxMultiplier) : max;
      min = min < 0 ? Math.floor(min * yDomainMaxMultiplier) : min;
    } else {
      if (max > 0) {
        max += yDomainPadding;
      }
      if (min < 0) {
        min -= yDomainPadding;
      }
    }

    return [min, max];
  })();

  const ticks: Array<number> = getNiceTickValues(niceTickDomain, 5);
  const yDomain = [ticks[0], ticks[ticks.length - 1]];

  const renderedChartWidth = enableHorizontalScroll
    ? Math.max(chartWidth, scrollWidth)
    : undefined;

  /**
   * ====================================
   * Reusable UI
   * ====================================
   */
  const barShape = (props: BarShapeProps) => {
    const { x, y, width, height, payload } = props;
    const rawValue = Number(payload?.value ?? 0);

    if (rawValue === 0) {
      return null;
    }

    // derived states
    const isNegative = rawValue < 0;
    const isHovered = hoveredLabel === payload.label;
    const normalizedHeight = Math.max(1, Math.abs(height));
    const normalizedY = height < 0 ? y + height : y;
    const radius = isNegative
      ? [0, 0, barRadius, barRadius]
      : [barRadius, barRadius, 0, 0];
    const resolvedBarColor =
      payload.color ??
      (isNegative
        ? isHovered
          ? (negativeBarHoverColor ?? negativeBarColor)
          : negativeBarColor
        : isHovered
          ? (positiveBarHoverColor ?? positiveBarColor)
          : positiveBarColor);

    const labelY = isNegative
      ? normalizedY + normalizedHeight + 16 // below negative bar
      : normalizedY - 8; // above positive bar

    const commentCount = payload?.commentCount;

    return (
      <g>
        <Rectangle
          x={x}
          y={normalizedY}
          width={width}
          height={normalizedHeight}
          radius={radius as any}
          style={{
            cursor: "pointer",
          }}
          fill={resolvedBarColor}
          onMouseEnter={(e) => {
            setHoveredLabel(payload.label);
            const barData: DivergentBarData = {
              ...payload,
              color:
                payload.color ??
                (rawValue > 0
                  ? (positiveBarHoverColor ?? positiveBarColor)
                  : (negativeBarHoverColor ?? negativeBarColor)),
            };
            showBarTooltip(
              e as unknown as React.MouseEvent<SVGRectElement>,
              barData,
            );
          }}
          onMouseMove={(e) => {
            const barData: DivergentBarData = {
              ...payload,
              color:
                payload.color ??
                (rawValue > 0
                  ? (positiveBarHoverColor ?? positiveBarColor)
                  : (negativeBarHoverColor ?? negativeBarColor)),
            };
            showBarTooltip(
              e as unknown as React.MouseEvent<SVGRectElement>,
              barData,
            );
          }}
          onMouseLeave={() => {
            setHoveredLabel(null);
            hideBarTooltip();
          }}
        />
        {showValues && (
          <text
            x={Number(x) + Number(width) / 2}
            y={labelY}
            textAnchor="middle"
            fontSize={12}
            fill="var(--color-text-primary)"
            fontFamily="Inter-Medium"
            {...barValueLabelProps}
          >
            {barValueLabelFomatter?.(rawValue) ?? rawValue}
          </text>
        )}

        {commentCount && commentCount > 0 ? (
          <g
            transform={`translate(${Number(x) + Number(width) / 2}, ${normalizedY - 20})`}
            className={cn("pointer-events-none", {
              "cursor-pointer pointer-events-auto": !!onBadgeClick,
            })}
            onClick={(e) => {
              if (onBadgeClick) {
                e.stopPropagation();
                onBadgeClick(payload.label);
              }
            }}
          >
            <foreignObject
              x={-15}
              y={-15}
              width="30"
              height="30"
              className="overflow-visible"
            >
              <div className="relative flex items-center justify-center w-full h-full rounded-full border-[0.8px] border-[#E5F2F0] bg-white shadow-sm group hover:opacity-80 transition-opacity">
                <Icon
                  name="message"
                  className="w-[14px] h-[14px] text-[#088477]"
                />
                <span className="absolute -top-1.5 -right-1.5 bg-[#2F9C8F] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm z-10 leading-none">
                  {commentCount > 99 ? "99+" : commentCount}
                </span>
              </div>
            </foreignObject>
          </g>
        ) : null}
      </g>
    );
  };

  const YAxisComponent = (
    <YAxis
      dataKey={"value"}
      type="number"
      tickLine={false}
      interval={0}
      yAxisId={"yaxis"}
      ticks={ticks}
      domain={yDomain}
      tickFormatter={yAxisTickFormtter}
      axisLine={{ stroke: "var(--color-border)", strokeWidth: 2 }}
      tick={{
        fill: "var(--color-text-secondary)",
        fontSize: 12,
        fontFamily: "Inter-Regular",
      }}
    >
      <Label
        value={yAxisLabel}
        angle={-90}
        position="insideLeft"
        offset={10}
        style={{
          fill: "var(--color-text-primary)",
          fontSize: 14,
          fontWeight: 500,
          textAnchor: "middle",
          fontFamily: "Inter-Medium",
        }}
        {...yAxisLabelProps}
      />
    </YAxis>
  );

  const yAxisChart = (
    <ResponsiveContainer width={yAxisWidth} height="100%">
      <BarChart
        margin={{ top: 20, right: 0, bottom: 50, left: 0, ...sepYChartMargins }}
        data={data}
      >
        {YAxisComponent}
      </BarChart>
    </ResponsiveContainer>
  );

  const TooltipContent = ({ data }: { data: DivergentBarData }) => {
    const toolTipData = {
      ...data,
      color:
        data.color ??
        (data.value > 0
          ? positiveBarHoverColor || positiveBarColor
          : negativeBarHoverColor || negativeBarColor),
    };

    if (customTooltipRenderer) {
      return customTooltipRenderer({ data: toolTipData });
    }

    return (
      <div className="min-w-40 rounded-xl border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,19,41,0.14)]">
        <Text variant="12SB">{data.label}</Text>

        <Text variant="12M">
          {barValueLabelFomatter?.(data.value) ?? data.value}
        </Text>
      </div>
    );
  };

  const chartContent = (
    <div ref={innerChartRef} className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 0, bottom: 20, left: 0, ...chartMargins }}
        >
          <CartesianGrid
            yAxisId={"yaxis"}
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="4 4"
          />
          <ReferenceLine y={0} stroke={"var(--color-border)"} strokeWidth={1} />
          {!enableHorizontalScroll && YAxisComponent}

          <XAxis
            dataKey={"label"}
            tickLine={false}
            interval={0}
            axisLine={{ stroke: "var(--color-border)" }}
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 12,
              fontFamily: "Inter-Regular",
            }}
          >
            {!enableHorizontalScroll && (
              <Label
                value={xAxisLabel}
                position="insideBottom"
                offset={-10}
                style={{
                  fill: "var(--color-text-primary)",
                  fontSize: 14,
                  fontWeight: 500,
                  textAnchor: "middle",
                  fontFamily: "Inter-Medium",
                }}
                {...xAxisLabelProps}
              />
            )}
          </XAxis>

          <Bar
            yAxisId={"yaxis"}
            barSize={barWidth}
            dataKey="value"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            shape={barShape}
          />
        </BarChart>
      </ResponsiveContainer>

      {showTooltip && hoverTooltip && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            left: hoverTooltip.left,
            top: hoverTooltip.top,
            transform: hoverTooltip.transform,
          }}
          onMouseEnter={() => {
            if (tooltipTimeout.current) {
              clearTimeout(tooltipTimeout.current);
              tooltipTimeout.current = null;
            }
          }}
          onMouseLeave={() => setHoverTooltip(null)}
        >
          <TooltipContent data={hoverTooltip.data} />
        </div>
      )}
    </div>
  );

  /**
   * =================================
   * Side Effects
   * =================================
   */
  useEffect(() => {
    const element = chartHostRef.current;
    if (!element) return;

    const updateWidth = () => setChartWidth(element.clientWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={chartRef}
      onMouseLeave={hideBarTooltip}
      className={cn(
        "rounded-lg border border-border p-4 bg-white relative flex flex-col gap-4",
        isFullScreen && "grow",
        enableHorizontalScroll && "overflow-x-auto",
        className,
      )}
    >
      {/* header */}
      <div className="flex items-start flex-nowrap justify-between gap-4">
        {!isLoading && (
          <div
            className={cn(
              "flex shrink-0 w-full items-center justify-between gap-4",
              headerClassName,
            )}
          >
            {typeof title === "string" ? (
              <Text variant="h4" className="my-1">
                {title}
              </Text>
            ) : (
              title
            )}
            <div className="flex items-center gap-3 chart-actions flex-nowrap">
              {customActions}
              <IconButton
                name="download"
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={handleDownLoad}
              />
              {!isFullScreen ? (
                <IconButton
                  name="maximize"
                  size={16}
                  className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={onMaximize}
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
          </div>
        )}
      </div>
      {!isLoading && headerNote}

      {/* graph */}
      <WithFallback isLoading={isLoading} fallback={<DivergentBarSkeleton />}>
        {enableHorizontalScroll ? (
          <div
            className={cn(
              "flex min-h-105 h-full w-full sm:h-115 overflow-y-hidden",
              isFullScreen && "min-h-115 grow ",
            )}
          >
            {/* Fixed Y Axis */}
            <div
              className="shrink-0"
              style={{
                width: yAxisWidth,
              }}
            >
              {yAxisChart}
            </div>

            {/* Scrollable Plot */}
            <div
              ref={chartHostRef}
              data-export-full-width="true"
              className="flex-1 overflow-x-auto overflow-y-hidden group-bar-chart"
            >
              <div
                style={{
                  width: renderedChartWidth,
                  minWidth: enableHorizontalScroll ? "100%" : undefined,
                  height: "100%",
                }}
              >
                {chartContent}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn("min-h-105 w-full", isFullScreen && "min-h-115 grow")}
            style={{
              width: renderedChartWidth,
              minWidth: enableHorizontalScroll ? "100%" : undefined,
            }}
          >
            {chartContent}
          </div>
        )}
        {enableHorizontalScroll && (
          <div className="flex justify-center mt-4">
            <Text variant="14M">{xAxisLabel}</Text>
          </div>
        )}
      </WithFallback>
    </div>
  );
}

function DivergentBarSkeleton() {
  return (
    <div className="h-full flex min-h-90 gap-3">
      {/* y axis label */}
      <Skeleton className="h-30! self-center w-3! rounded-sm" />
      <div className="flex grow flex-col gap-3">
        {/* x axis label */}
        <div className="flex relative grow border-l border-b border-border">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "border-t border-border/70",
                  index !== 3 && "border-dashed",
                )}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-evenly">
            {[
              { height: 140, positive: true },
              { height: 90, positive: false },
              { height: 140, positive: true },
              { height: 90, positive: false },
            ].map((bar, index) => (
              <div key={index} className="flex h-full items-center">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={80}
                  height={bar.height}
                  className={cn(
                    "rounded!",
                    bar.positive
                      ? "rounded-b-none! -translate-y-1/4"
                      : "rounded-t-none! translate-y-[85%] bg-[#D7D7D7]!",
                  )}
                />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="w-20! self-center h-3! rounded-sm" />
      </div>
    </div>
  );
}
