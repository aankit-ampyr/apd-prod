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
  Tooltip,
  getNiceTickValues,
} from "recharts";
import { useChartsActionV2 } from "../../../../hooks";
import { IconButton, Skeleton, Text } from "../../../../ui-kit";
import { cn } from "../../../../utils";
import { WithFallback } from "../../../SkelatonWrapper";
import { useEffect, useRef, useState } from "react";

export type DivergentBarData = {
  value: number;
  label: string;
  color?: string;
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
  headerClassName?: string;
  yAxisTickFormtter?: (tick: string) => string;

  customTooltipRenderer?: (
    props: DivergentBarChartTooltipProps,
  ) => React.ReactNode;
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
    yDomainPadding = 0,
    headerClassName,
    yAxisTickFormtter = (v) => v.toString(),
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

    if (max > 0) {
      max += yDomainPadding;
    }
    if (min < 0) {
      min -= yDomainPadding;
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
          onMouseEnter={() => setHoveredLabel(payload.label)}
          onMouseLeave={() => setHoveredLabel(null)}
        />
        {showValues && (
          <text
            x={x + width / 2}
            y={labelY}
            textAnchor="middle"
            fontSize={12}
            fill="var(--color-text-primary)"
            fontFamily="Inter-Medium"
            {...barValueLabelProps}
          >
            {barValueLabelFomatter(props.value as number)}
          </text>
        )}
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

  const TooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload as DivergentBarData;
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
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 0, bottom: 20, left: 0, ...chartMargins }}
      >
        <CartesianGrid
          yAxisId={'yaxis'}
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

        {showTooltip && (
          <Tooltip
            shared={false}
            cursor={{ fill: "transparent" }}
            isAnimationActive={false}
            animationDuration={0}
            content={<TooltipContent />}
          />
        )}

        <Bar
          yAxisId={'yaxis'}
          barSize={barWidth}
          dataKey="value"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
          shape={barShape}
        />
      </BarChart>
    </ResponsiveContainer>
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
            <div className="flex items-center gap-3 chart-actions">
              <IconButton
                name="download"
                size={20}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={handleDownLoad}
              />
              {!isFullScreen ? (
                <IconButton
                  name="maximize"
                  size={20}
                  className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={onMaximize}
                />
              ) : (
                <IconButton
                  name="minimize"
                  size={20}
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
