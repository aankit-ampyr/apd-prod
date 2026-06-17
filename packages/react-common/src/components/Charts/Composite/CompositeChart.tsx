import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  getNiceTickValues,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Rectangle,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { useChartsActionV2 } from "../../../hooks";
import { cn } from "../../../utils";
import { IconButton, Skeleton, Text } from "../../../ui-kit";
import { WithFallback } from "../../SkelatonWrapper";

type ChartAxisId = "left" | "right";
type ChartSeriesType = "bar" | "line";
type ChartDomainStrategy = "auto" | "positive" | "symmetric";
type ChartReferenceLineAxis = "x" | "y";
type ChartReferenceLineStyle = "dotted" | "plain";

export type CompositeChartReferenceLine = {
  id?: string;
  axis: ChartReferenceLineAxis;
  value: string | number;
  yAxisId?: ChartAxisId;
  color?: string;
  style?: ChartReferenceLineStyle;
  strokeWidth?: number;
  label?: string;
  labelColor?: string;
  labelFontSize?: number;
  labelPosition?:
    | "top"
    | "left"
    | "right"
    | "bottom"
    | "inside"
    | "insideLeft"
    | "insideRight"
    | "insideTop"
    | "insideBottom"
    | "insideTopLeft"
    | "insideTopRight"
    | "insideBottomLeft"
    | "insideBottomRight"
    | "insideStart"
    | "insideEnd"
    | "middle"
    | "center";
  ifOverflow?: "discard" | "hidden" | "visible" | "extendDomain";
  showInLegend?: boolean;
  legendLabel?: string;
};

type CompositeChartReferenceLegendItem = {
  id: string;
  label: string;
  color: string;
  style: ChartReferenceLineStyle;
};

export type CompositeChartSeries<TData extends Record<string, unknown>> = {
  key: Extract<keyof TData, string>;
  label: string;
  tooltipLabel?: string;
  color: string;
  type: ChartSeriesType;
  yAxisId?: ChartAxisId;
  valueFormatter?: (value: number, row: TData) => string;
  barSize?: number;
};

export type CompositeChartAxisConfig = {
  label?: ReactNode;
  tickFormatter?: (value: number) => string;
  domainStrategy?: ChartDomainStrategy;
  width?: number;
};

export type CompositeChartProps<TData extends Record<string, unknown>> = {
  header?: ReactNode;
  downloadFileName: string;
  data?: TData[];
  xAxisKey: Extract<keyof TData, string>;
  xTickFormatter?: (value: string | number) => string;
  series: CompositeChartSeries<TData>[];
  axes?: Partial<Record<ChartAxisId, CompositeChartAxisConfig>>;
  className?: string;
  chartClassName?: string;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  xAxisLabel?: ReactNode;
  tooltipRenderer?: (props: CompositeChartTooltipProps<TData>) => ReactNode;
  tooltipInteractionMode?: "axis" | "item";
  legendRenderer?: (
    items: CompositeChartSeries<TData>[],
    referenceLines: CompositeChartReferenceLegendItem[],
  ) => ReactNode;
  legend?: ReactNode;
  formulaRenderer?: ReactNode;
  showZeroReferenceLine?: boolean;
  showBarPointValues?: boolean;
  showLinePointValues?: boolean;
  barGap?: number;
  barCategoryGap?: number | string;
  referenceLines?: CompositeChartReferenceLine[];
};

export type CompositeChartTooltipProps<TData extends Record<string, unknown>> =
  TooltipContentProps<any, any> & {
    series: CompositeChartSeries<TData>[];
    axes: Partial<Record<ChartAxisId, CompositeChartAxisConfig>>;
    currentData?: TData;
    currentPayload?: any;
  };

const DEFAULT_Y_TICK_COUNT = 5;

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";

  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000000) {
    return `${sign}${Math.round(absolute / 1000000)}m`;
  }

  if (absolute >= 1000) {
    return `${sign}${Math.round(absolute / 1000)}k`;
  }

  return `${sign}${Math.round(absolute)}`;
}

function getAxisLabelPosition(axisId: ChartAxisId) {
  return axisId === "left" ? "insideLeft" : "insideRight";
}

function getAxisLabelAngle(axisId: ChartAxisId) {
  return axisId === "left" ? -90 : 90;
}

function getAxisLabelOffset(axisId: ChartAxisId) {
  return axisId === "left" ? 1 : -8;
}

function BarValueLabel({
  x,
  y,
  width,
  value,
  formatter,
}: {
  x?: number;
  y?: number;
  width?: number;
  value?: number | string;
  formatter: (value: number) => string;
}) {
  const numericValue = Number(value);
  if (
    !Number.isFinite(numericValue) ||
    x == null ||
    y == null ||
    width == null
  ) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill="var(--color-text-primary)"
      fontFamily="Inter-Medium"
      fontSize={12}
    >
      {formatter(numericValue)}
    </text>
  );
}

function LineValueBadge({
  x,
  y,
  value,
  formatter,
}: {
  x?: number;
  y?: number;
  value?: number | string;
  formatter: (value: number) => string;
}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || x == null || y == null) {
    return null;
  }

  const label = formatter(numericValue);
  const width = Math.max(42, label.length * 7 + 12);
  const height = 22;
  const rx = 11;
  const offsetY = 10;

  const badgeX = x - width / 2;
  const badgeY = y + offsetY;

  return (
    <g>
      <rect
        x={badgeX}
        y={badgeY}
        width={width}
        height={height}
        rx={rx}
        ry={rx}
        fill="rgba(255,255,255,0.85)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={1}
        style={{ filter: "drop-shadow(0 2px 4px rgba(16,19,41,0.08))" }}
      />
      <text
        x={x}
        y={badgeY + height / 2 + 4}
        textAnchor="middle"
        fill="var(--color-text-primary)"
        fontSize={11}
        fontFamily="Inter-Medium"
        fontWeight={500}
      >
        {label}
      </text>
    </g>
  );
}

function DefaultTooltip<TData extends Record<string, unknown>>({
  active,
  payload,
  label,
  series,
  axes,
  currentData,
}: CompositeChartTooltipProps<TData>) {
  if (!active || !payload?.length) return null;

  const seriesByKey = new Map(series.map((item) => [item.key, item]));

  return (
    <div className="min-w-52 rounded-xl border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,19,41,0.14)]">
      <Text variant="14SB" className="mb-2 text-text-primary!">
        {label}
      </Text>

      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any) => {
          const dataKey = String(entry.dataKey ?? "");
          const seriesItem = seriesByKey.get(dataKey as any);
          const rawValue = Number(
            Array.isArray(entry.value) ? entry.value[1] : (entry.value ?? 0),
          );
          const axisId = (entry.yAxisId ??
            seriesItem?.yAxisId ??
            "left") as ChartAxisId;
          const axisFormatter =
            axes[axisId]?.tickFormatter ?? formatCompactNumber;
          const valueFormatter =
            seriesItem?.valueFormatter ??
            ((value: number) => axisFormatter(value));
          const row = (currentData ?? entry.payload ?? {}) as TData;

          return (
            <div
              key={dataKey}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    seriesItem?.type === "line" && "h-3 w-3 rounded-sm",
                  )}
                  style={{
                    backgroundColor: entry.color || seriesItem?.color || "#999",
                  }}
                />
                <Text variant="12M" className="text-text-secondary!">
                  {seriesItem?.tooltipLabel ?? seriesItem?.label ?? dataKey}
                </Text>
              </div>
              <Text variant="12SB" className="text-text-primary!">
                {valueFormatter(rawValue, row)}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  type,
}: {
  color: string;
  label: string;
  type: ChartSeriesType;
}) {
  if (type === "line") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex items-center justify-center">
          <span
            className="h-0.5 w-8 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            className="absolute h-2.5 w-2.5 rounded-full border-2 bg-white"
            style={{ borderColor: color }}
          />
        </span>
        <Text variant="14SB" className="text-text-primary!">
          {label}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-5 rounded" style={{ backgroundColor: color }} />
      <Text variant="14SB" className="text-text-primary!">
        {label}
      </Text>
    </div>
  );
}

function ReferenceLegendItem({
  color,
  label,
  style,
}: {
  color: string;
  label: string;
  style: ChartReferenceLineStyle;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-8 items-center">
        <span
          className="w-full border-t-2"
          style={{
            borderTopColor: color,
            borderTopStyle: style === "dotted" ? "dashed" : "solid",
          }}
        />
      </span>
      <Text variant="14SB" className="text-text-primary!">
        {label}
      </Text>
    </div>
  );
}

function getChartDensity(count: number) {
  if (count <= 1) {
    return {
      barCategoryGap: 96,
      barGap: 18,
      barSize: 34,
      xAxisPadding: { left: 84, right: 84 },
      margin: { top: 28, right: 32, bottom: 54, left: 12 },
    };
  }

  if (count <= 4) {
    return {
      barCategoryGap: 72,
      barGap: 18,
      barSize: 34,
      xAxisPadding: { left: 36, right: 36 },
      margin: { top: 28, right: 32, bottom: 54, left: 12 },
    };
  }

  return {
    barCategoryGap: 24,
    barGap: 18,
    barSize: 28,
    xAxisPadding: { left: 12, right: 12 },
    margin: { top: 24, right: 28, bottom: 52, left: 8 },
  };
}

export function CompositeChart<TData extends Record<string, unknown>>(
  props: CompositeChartProps<TData>,
) {
  const {
    header,
    downloadFileName,
    data = [],
    xAxisKey,
    xTickFormatter,
    series,
    axes = {},
    className,
    chartClassName,
    isLoading = false,
    isFullScreenOverride: isFullScreen,
    xAxisLabel,
    formulaRenderer,
    tooltipRenderer: customTooltipRenderer,
    tooltipInteractionMode = "axis",
    legendRenderer,
    legend,
    showZeroReferenceLine = true,
    showBarPointValues = true,
    showLinePointValues = true,
    barGap,
    barCategoryGap,
    referenceLines = [],
  } = props;

  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <CompositeChart<TData> {...props} isFullScreenOverride />
      ),
    });

  const chartData = useMemo(() => data, [data]);
  const chartDensity = useMemo(
    () => getChartDensity(chartData.length),
    [chartData.length],
  );
  const [hoverTooltip, setHoverTooltip] = useState<any>(null);

  const resolvedSeries = useMemo(
    () =>
      series.map((item) => ({
        ...item,
        yAxisId: item.yAxisId ?? "left",
        barSize: item.barSize ?? chartDensity.barSize,
      })),
    [chartDensity.barSize, series],
  );

  const axisIdsInUse = useMemo(() => {
    const ids = new Set<ChartAxisId>();
    for (const item of resolvedSeries) {
      ids.add(item.yAxisId ?? "left");
    }
    return ids;
  }, [resolvedSeries]);

  const barSize = (() => {
    if (chartData.length <= 2) {
      return 165;
    }
    if (chartData.length <= 3) {
      return 130;
    }
    if (chartData.length <= 4) {
      return 105;
    }
    if (chartData.length <= 5) {
      return 85;
    }
    if (chartData.length <= 6) {
      return 75;
    }
    if (chartData.length <= 8) {
      return 60;
    }
    if (chartData.length <= 10) {
      return 45;
    }
    if (chartData.length <= 12) {
      return 35;
    }
  })();

  const axisScale = useMemo(() => {
    const valuesByAxis: Record<ChartAxisId, number[]> = {
      left: [],
      right: [],
    };

    for (const row of chartData) {
      for (const item of resolvedSeries) {
        const rawValue = Number(row[item.key]);
        if (Number.isFinite(rawValue)) {
          valuesByAxis[item.yAxisId ?? "left"].push(rawValue);
        }
      }
    }

    const leftValues = valuesByAxis.left;
    const rightValues = valuesByAxis.right;

    const leftYDomain: [number, number] = leftValues.length
      ? [
          Math.min(...leftValues),
          Math.max(...leftValues) === Math.min(...leftValues)
            ? Math.min(...leftValues) + 1
            : Math.max(...leftValues),
        ]
      : [0, 1];

    const rightYDomain: [number, number] = rightValues.length
      ? [
          Math.min(...rightValues),
          Math.max(...rightValues) === Math.min(...rightValues)
            ? Math.min(...rightValues) + 1
            : Math.max(...rightValues),
        ]
      : [0, 1];

    const leftTicks = getNiceTickValues(leftYDomain, DEFAULT_Y_TICK_COUNT);
    const rightTicks = getNiceTickValues(rightYDomain, DEFAULT_Y_TICK_COUNT);

    const normalizedLeftDomain: [number, number] = [
      leftTicks[0],
      leftTicks[leftTicks.length - 1],
    ];
    const normalizedRightDomain: [number, number] = [
      rightTicks[0],
      rightTicks[rightTicks.length - 1],
    ];

    return {
      left: {
        domain: normalizedLeftDomain,
        ticks: leftTicks,
      },
      right: {
        domain: normalizedRightDomain,
        ticks: rightTicks,
      },
    };
  }, [chartData, resolvedSeries]);

  const axisConfig = useMemo(() => {
    return {
      left: {
        label: axes.left?.label,
        tickFormatter: axes.left?.tickFormatter ?? formatCompactNumber,
        width: axes.left?.width ?? 70,
      },
      right: {
        label: axes.right?.label,
        tickFormatter: axes.right?.tickFormatter ?? formatCompactNumber,
        width: axes.right?.width ?? 70,
      },
    };
  }, [axes.left, axes.right]);

  const rightAxisSeriesColor = useMemo(
    () => resolvedSeries.find((item) => item.yAxisId === "right")?.color,
    [resolvedSeries],
  );
  const rightAxisColor = rightAxisSeriesColor ?? "var(--color-text-secondary)";

  const resolvedReferenceLineItems = useMemo(
    () =>
      referenceLines.map((line, index) => ({
        ...line,
        id: line.id ?? `reference-line-${index}`,
        color: line.color ?? "var(--color-text-secondary)",
        style: line.style ?? "dotted",
        yAxisId: line.yAxisId ?? "left",
      })),
    [referenceLines],
  );

  const legendReferenceLines = useMemo(
    () =>
      resolvedReferenceLineItems
        .filter((line) => line.showInLegend !== false)
        .map((line) => ({
          id: line.id,
          color: line.color,
          style: line.style,
          label:
            line.legendLabel ??
            line.label ??
            `${line.axis.toUpperCase()} = ${line.value}`,
        })),
    [resolvedReferenceLineItems],
  );

  function buildTooltipPayload(row: TData | undefined) {
    return resolvedSeries.map((item) => {
      const value = Number(row?.[item.key] ?? 0);
      return {
        dataKey: item.key,
        value,
        color: item.color,
        yAxisId: item.yAxisId ?? "left",
        payload: row,
      };
    });
  }

  function createTooltipProps(row: TData | undefined) {
    const payload = buildTooltipPayload(row);
    const currentPayload = payload[0];

    return {
      active: true,
      payload,
      label: row?.[xAxisKey] as any,
      series: resolvedSeries,
      axes,
      currentData: row,
      currentPayload,
    };
  }

  function showItemTooltip(row: TData | undefined, x: number, y: number) {
    setHoverTooltip({
      ...createTooltipProps(row),
      coordinate: { x, y },
    });
  }

  function hideItemTooltip() {
    setHoverTooltip(null);
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        "relative flex flex-col gap-8 rounded-xl border border-border bg-white p-5 sm:p-6",
        isFullScreen && "grow",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}

        <div className="flex flex-wrap items-center justify-end gap-4">
          {!isLoading && (
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
          )}
        </div>
      </div>

      <div className={cn("flex w-full flex-col gap-5", chartClassName)}>
        {!isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-3">
            {formulaRenderer}
            <div className="flex-1" />
            {legend ||
              (legendRenderer ? (
                legendRenderer(resolvedSeries, legendReferenceLines)
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-6">
                  {resolvedSeries.map((item) => (
                    <LegendItem
                      key={item.key}
                      color={item.color}
                      label={item.label}
                      type={item.type}
                    />
                  ))}
                  {legendReferenceLines.map((line) => (
                    <ReferenceLegendItem
                      key={line.id}
                      color={line.color}
                      label={line.label}
                      style={line.style}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}

        <WithFallback
          isLoading={isLoading}
          fallback={<CompositeChartSkeleton />}
        >
          <div
            className={cn(
              "relative h-105 w-full sm:h-115",
              isFullScreen && "min-h-115 grow",
            )}
            onMouseLeave={
              tooltipInteractionMode === "item" ? hideItemTooltip : undefined
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={chartDensity.margin}
                barCategoryGap={barCategoryGap ?? chartDensity.barCategoryGap}
                barGap={barGap ?? chartDensity.barGap}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  yAxisId={"left"}
                />
                <XAxis
                  dataKey={xAxisKey}
                  tickFormatter={xTickFormatter}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                  interval={0}
                  padding={chartDensity.xAxisPadding}
                  tick={{
                    fill: "var(--color-text-secondary)",
                    fontSize: 13,
                    fontFamily: "Inter-Regular",
                  }}
                >
                  {xAxisLabel ? (
                    <Label
                      value={xAxisLabel as any}
                      position="insideBottom"
                      offset={-30}
                      style={{
                        fill: "var(--color-text-primary)",
                        fontSize: 14,
                        fontWeight: 500,
                        textAnchor: "middle",
                        fontFamily: "Inter-Medium",
                      }}
                    />
                  ) : null}
                </XAxis>

                {axisIdsInUse.has("left") ? (
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                    ticks={axisScale.left.ticks}
                    domain={axisScale.left.domain}
                    tickFormatter={axisConfig.left.tickFormatter}
                    tick={{
                      fill: "var(--color-text-secondary)",
                      fontSize: 13,
                      fontFamily: "Inter-Regular",
                    }}
                    width={axisConfig.left.width}
                  >
                    {axisConfig.left.label ? (
                      <Label
                        value={axisConfig.left.label as any}
                        angle={getAxisLabelAngle("left")}
                        position={getAxisLabelPosition("left")}
                        offset={getAxisLabelOffset("left")}
                        style={{
                          fill: "var(--color-text-primary)",
                          fontSize: 14,
                          fontWeight: 500,
                          textAnchor: "middle",
                          fontFamily: "Inter-Medium",
                        }}
                      />
                    ) : null}
                  </YAxis>
                ) : null}

                {axisIdsInUse.has("right") ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickLine={false}
                    ticks={axisScale.right.ticks}
                    domain={axisScale.right.domain}
                    tickFormatter={axisConfig.right.tickFormatter}
                    tick={{
                      fill: rightAxisColor,
                      fontSize: 13,
                      fontFamily: "Inter-Regular",
                    }}
                    width={axisConfig.right.width}
                  >
                    {axisConfig.right.label ? (
                      <Label
                        value={axisConfig.right.label as any}
                        angle={getAxisLabelAngle("right")}
                        position={getAxisLabelPosition("right")}
                        offset={getAxisLabelOffset("right")}
                        style={{
                          fill: rightAxisColor,
                          fontSize: 14,
                          fontWeight: 500,
                          textAnchor: "middle",
                          fontFamily: "Inter-Medium",
                        }}
                      />
                    ) : null}
                  </YAxis>
                ) : null}

                {showZeroReferenceLine ? (
                  <ReferenceLine
                    y={0}
                    yAxisId="left"
                    stroke="var(--color-border)"
                    strokeDasharray="0"
                  />
                ) : null}

                {resolvedReferenceLineItems.map((line) => (
                  <ReferenceLine
                    key={line.id}
                    x={line.axis === "x" ? line.value : undefined}
                    y={line.axis === "y" ? line.value : undefined}
                    yAxisId={line.axis === "y" ? line.yAxisId : undefined}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth ?? 2}
                    strokeDasharray={line.style === "dotted" ? "6 6" : "0"}
                    ifOverflow={line.ifOverflow ?? "extendDomain"}
                    label={
                      line.label
                        ? {
                            value: line.label,
                            position:
                              line.labelPosition ??
                              (line.axis === "y" ? "right" : "top"),
                            fill: line.labelColor ?? line.color,
                            fontSize: line.labelFontSize ?? 12,
                          }
                        : undefined
                    }
                  />
                ))}

                {tooltipInteractionMode === "axis" ? (
                  <Tooltip
                    animationDuration={0}
                    content={(tooltipProps) =>
                      (() => {
                        const currentPayload = tooltipProps?.payload?.[0];
                        const currentData = currentPayload?.payload as
                          | TData
                          | undefined;

                        const resolvedTooltipProps = {
                          ...tooltipProps,
                          series: resolvedSeries,
                          axes,
                          currentData,
                          currentPayload,
                        } satisfies CompositeChartTooltipProps<TData>;

                        return customTooltipRenderer ? (
                          customTooltipRenderer(resolvedTooltipProps)
                        ) : (
                          <DefaultTooltip {...resolvedTooltipProps} />
                        );
                      })()
                    }
                    cursor={{ fill: "transparent" }}
                    wrapperStyle={{ outline: "none", pointerEvents: "none" }}
                  />
                ) : null}

                {resolvedSeries.map((item) => {
                  if (item.type === "line") {
                    return (
                      <Line
                        key={item.key}
                        yAxisId={item.yAxisId}
                        dataKey={item.key}
                        name={item.label}
                        type="monotone"
                        stroke={item.color}
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "#fff",
                          stroke: item.color,
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 7,
                          fill: item.color,
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                        label={
                          showLinePointValues
                            ? (labelProps: any) => (
                                <LineValueBadge
                                  {...labelProps}
                                  formatter={(value) =>
                                    item.valueFormatter
                                      ? item.valueFormatter(
                                          value,
                                          (labelProps?.payload ?? {}) as TData,
                                        )
                                      : axisConfig[
                                          item.yAxisId ?? "left"
                                        ].tickFormatter(value)
                                  }
                                />
                              )
                            : false
                        }
                      />
                    );
                  }

                  return (
                    <Bar
                      key={item.key}
                      yAxisId={item.yAxisId}
                      dataKey={item.key}
                      name={item.label}
                      fill={item.color}
                      radius={[4, 4, 0, 0]}
                      barSize={barSize}
                      isAnimationActive={false}
                      shape={
                        tooltipInteractionMode === "item"
                          ? (shapeProps: any) => {
                              const { x, y, width, height, payload } =
                                shapeProps;
                              if (
                                x == null ||
                                y == null ||
                                width == null ||
                                height == null
                              ) {
                                return null;
                              }

                              const row = payload as TData | undefined;
                              const numericX = Number(x);
                              const numericY = Number(y);
                              const numericWidth = Number(width);
                              const numericHeight = Number(height);

                              return (
                                <Rectangle
                                  {...shapeProps}
                                  radius={[4, 4, 0, 0]}
                                  fill={item.color}
                                  onMouseEnter={() =>
                                    showItemTooltip(
                                      row,
                                      numericX + numericWidth / 2,
                                      numericY,
                                    )
                                  }
                                  onMouseLeave={hideItemTooltip}
                                  onClick={() =>
                                    showItemTooltip(
                                      row,
                                      numericX + numericWidth / 2,
                                      numericY,
                                    )
                                  }
                                  style={{
                                    cursor: "pointer",
                                    transition: "fill 0.15s ease",
                                  }}
                                />
                              );
                            }
                          : undefined
                      }
                      label={
                        showBarPointValues
                          ? (labelProps: any) => (
                              <BarValueLabel
                                {...labelProps}
                                formatter={(value) =>
                                  item.valueFormatter
                                    ? item.valueFormatter(
                                        value,
                                        (labelProps?.payload ?? {}) as TData,
                                      )
                                    : axisConfig[
                                        item.yAxisId ?? "left"
                                      ].tickFormatter(value)
                                }
                              />
                            )
                          : false
                      }
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>

            {tooltipInteractionMode === "item" && hoverTooltip ? (
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: (hoverTooltip.coordinate as any)?.x ?? 0,
                  top: (hoverTooltip.coordinate as any)?.y ?? 0,
                  transform: "translate(-50%, calc(-100% - 10px))",
                }}
              >
                {customTooltipRenderer ? (
                  customTooltipRenderer(hoverTooltip)
                ) : (
                  <DefaultTooltip {...hoverTooltip} />
                )}
              </div>
            ) : null}
          </div>
        </WithFallback>
      </div>
    </div>
  );
}

function CompositeChartSkeleton() {
  function BarGroup({ data }: { data: [number, number] }) {
    return (
      <div className="flex gap-2 items-end">
        <Skeleton height={data[0]} className="w-10 rounded-t-sm" />
        <Skeleton height={data[1]} className="w-10 rounded-t-sm" />
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

          {/* Curved Line */}
          <svg
            className="absolute inset-0 w-full h-full z-0"
            viewBox="0 0 1000 320"
            preserveAspectRatio="none"
          >
            <path
              d="
                M 40 210
                C 100 120, 160 120, 220 170
                S 340 260, 400 180
                S 520 80, 580 140
                S 700 240, 760 170
                S 880 90, 960 140
              "
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="4"
              strokeDasharray="10 8"
              strokeLinecap="round"
            />

            {[
              [40, 210],
              [220, 170],
              [400, 180],
              [580, 140],
              [760, 170],
              [960, 140],
            ].map(([cx, cy], index) => (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r="8"
                fill="white"
                stroke="var(--color-border)"
                strokeWidth="4"
              />
            ))}
          </svg>

          {[
            [245, 180],
            [120, 260],
            [290, 140],
            [210, 300],
            [160, 110],
            [275, 220],
            [190, 250],
            [300, 170],
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
