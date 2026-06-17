import {
  Fragment,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  getNiceTickValues,
  ComposedChart as ReLineChart,
  ReferenceArea,
  ReferenceLine,
  CartesianGridProps,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  type TooltipContentProps,
  XAxis,
  Area,
  YAxis,
  XAxisProps,
  YAxisProps,
} from "recharts";
import { useChartsActionV2 } from "../../../hooks";
import { cn } from "../../../utils";
import { Icon, IconButton, Skeleton, Text } from "../../../ui-kit";
import { WithFallback } from "../../SkelatonWrapper";
import { LineTooltip, type LineTooltipPayload } from "./LineTooltip";

type PrimitiveValue = string | number | null | undefined;

type ChartRow = Record<string, PrimitiveValue>;

type LineActiveDotProps = {
  cx?: number;
  cy?: number;
  color: string;
};

type YAxisTickRange = {
  ticks: number[];
  domain: [number, number];
};

type ChartMouseState = {
  activeLabel?: string | number;
  activeTooltipIndex?: number;
};

type DragSelection = {
  startValue: PrimitiveValue;
  endValue: PrimitiveValue;
  startIndex: number;
  endIndex: number;
};

export type RechartsLineSeriesConfig<T extends ChartRow> = {
  key: Extract<keyof T, string>;
  label?: string;
  color?: string;
  smooth?: boolean;
  showSymbol?: boolean;
  strokeDasharray?: string;
  hidden?: boolean;
  strokeWidth?: number;
  showArea?: boolean;
  areaOpacity?: number;
  gradientColor?: { start: string; end: string };
};

export type RechartsLineReferenceLineConfig = {
  value: number;
  color?: string;
  label?: ReactNode;
  legendLabel?: ReactNode;
  lineStyle?: "solid" | "dotted";
  labelRenderer?: (args: {
    value: number;
    color: string;
    lineStyle: "solid" | "dotted";
    index: number;
    label?: ReactNode;
    legendLabel?: ReactNode;
  }) => ReactNode;
};

export type RechartsLineChartConfig<T extends ChartRow> = {
  xKey: Extract<keyof T, string>;
  lines?: RechartsLineSeriesConfig<T>[];
  referenceLines?: RechartsLineReferenceLineConfig[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  yDomainTopPadding?: number;
  yDomainBottomPadding?: number;
  yTickSpace?: number;
  xAxisLabelProps?: {
    position?:
      | "insideBottom"
      | "insideTop"
      | "insideLeft"
      | "insideRight"
      | "insideStart"
      | "insideEnd"
      | "bottom"
      | "top";
    offset?: number;
    angle?: number;
  };
  yAxisLabelProps?: {
    position?:
      | "insideBottom"
      | "insideTop"
      | "insideLeft"
      | "insideRight"
      | "insideStart"
      | "insideEnd"
      | "left"
      | "right"
      | "center";
    offset?: number;
    angle?: number;
  };
  showLegend?: boolean;
  xTickInterval?: number;
  xTickFormatter?: (value: string | number, index?: number) => string;
  yTickValues?: number[];
  yTickStep?: number;
  hideFirstXAxisTickLabel?: boolean;
  hideFirstYAxisTickLabel?: boolean;
  lineStrokeWidth?: number;
  yTickFormatter?: (value: number) => string;
  formatLabel?: (key: string) => string;
  transformLineData?: (
    data: T[],
    key: Extract<keyof T, string>,
  ) => Array<number | null>;
  tooltipTitleFormatter?: (value: string | number, row?: T) => string;
  tooltipValueFormatter?: (
    value: number,
    seriesName: string,
    row?: T,
  ) => string;
  tooltipCursor?: TooltipProps["cursor"];
  enableZoom?: boolean;
};

export interface RechartsLineChartProps<T extends ChartRow> {
  data: T[];
  config: RechartsLineChartConfig<T>;
  height?: number;
  downloadFileName: string;
  title?: string;
  headerRenderer?: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  tooltipRenderer?: (props: TooltipContentProps<any, any>) => React.ReactNode;
  actionWrapperClassName?: string;
  chartClassName?: string;
  isLoading: boolean;
  isFullScreenOverride?: boolean;
  cartesianGridProps?: CartesianGridProps;
  xAxisProps?: XAxisProps;
  yAxisProps?: YAxisProps;
  chartMargin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

const LINE_COLORS = [
  "var(--color-primary)",
  "#4D9CD1",
  "#FFAC5A",
  "#70EFC3",
  "#BE83FF",
  "#A1E7F6",
  "#FF6565",
  "#FFB6DC",
  "#31E6AD",
  "#BBFF8D",
];

const DEFAULT_Y_TICK_STEP = 10;
const DOTTED_STROKE_DASHARRAY = "6 4";

function roundToPrecision(value: number): number {
  const rounded = Number(value.toFixed(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function alignToStep(
  value: number,
  step: number,
  direction: "floor" | "ceil",
): number {
  const scaled = value / step;
  const aligned =
    direction === "floor"
      ? Math.floor(scaled) * step
      : Math.ceil(scaled) * step;

  return roundToPrecision(aligned);
}

function buildYAxisTickRange(
  values: number[],
  step: number,
): YAxisTickRange | null {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (!finiteValues.length) return null;

  const safeStep = Math.abs(step) > 0 ? Math.abs(step) : DEFAULT_Y_TICK_STEP;
  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);

  let minTick = alignToStep(minValue, safeStep, "floor");
  let maxTick = alignToStep(maxValue, safeStep, "ceil");

  if (minTick === maxTick) {
    minTick = roundToPrecision(minTick - safeStep);
    maxTick = roundToPrecision(maxTick + safeStep);
  }

  const ticks: number[] = [];
  for (
    let current = minTick;
    current <= maxTick + safeStep / 1000;
    current += safeStep
  ) {
    ticks.push(roundToPrecision(current));
  }

  return {
    ticks,
    domain: [minTick, maxTick],
  };
}

function LineActiveDot({ cx, cy, color }: LineActiveDotProps) {
  if (cx == null || cy == null) return null;

  return (
    <g>
      <circle cx={cx} cy={cy} r={15} fill={color} opacity={0.16} />
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={color}
        stroke={color}
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={4} fill="#fff" />
    </g>
  );
}

export function LineChart<T extends ChartRow>(
  props: RechartsLineChartProps<T>,
) {
  const {
    data,
    config,
    downloadFileName,
    title,
    headerRenderer,
    className,
    tooltipRenderer,
    headerClassName,
    titleClassName,
    actionWrapperClassName,
    chartClassName,
    isLoading,
    isFullScreenOverride = false,
    cartesianGridProps,
    xAxisProps,
    yAxisProps,
    chartMargin,
  } = props;

  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => <LineChart {...props} isFullScreenOverride />,
    });

  const yTickSpace = config.yTickSpace ?? 60;
  const enableZoom = config.enableZoom ?? true;

  const isFullScreen = isFullScreenOverride;

  const [zoomedRange, setZoomedRange] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);

  function formatNumericTick(value: number): string {
    if (!Number.isFinite(value)) return "";
    if (value === 0) return "0";

    const absolute = Math.abs(value);
    if (absolute >= 1_000_000) {
      return `${value < 0 ? "-" : ""}${Math.round(absolute / 1_000_000)}m`;
    }

    if (absolute >= 1_000) {
      return `${value < 0 ? "-" : ""}${Math.round(absolute / 1_000)}k`;
    }

    return String(Math.round(value));
  }

  function formatTimeTick(value: string | number): string {
    const rawValue = String(value);
    const date = new Date(rawValue);

    if (Number.isNaN(date.getTime())) {
      const parts = rawValue.split("-");
      return parts.length >= 3 ? parts[2].padStart(2, "0") : rawValue;
    }

    return String(date.getDate()).padStart(2, "0");
  }

  function resolveLineKeys<T extends ChartRow>(
    data: T[],
    xKey: Extract<keyof T, string>,
    explicitLines?: RechartsLineSeriesConfig<T>[],
  ): RechartsLineSeriesConfig<T>[] {
    if (explicitLines?.length) {
      return explicitLines.filter((line) => !line.hidden);
    }

    const keys = new Set<string>();
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (key !== xKey) keys.add(key);
      }
    }

    return Array.from(keys).map((key, index) => ({
      key: key as Extract<keyof T, string>,
      label: key,
      color: LINE_COLORS[index % LINE_COLORS.length],
    }));
  }

  function toNumericSeries<T extends ChartRow>(
    data: T[],
    key: Extract<keyof T, string>,
    transformLineData?: (
      data: T[],
      key: Extract<keyof T, string>,
    ) => Array<number | null>,
  ): Array<number | null> {
    if (transformLineData) {
      return transformLineData(data, key);
    }

    return data.map((item) => {
      const rawValue = item[key];
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        return null;
      }

      const numericValue = Number(rawValue);
      return Number.isFinite(numericValue) ? numericValue : null;
    });
  }

  function buildChartData<T extends ChartRow>(
    data: T[],
    lines: RechartsLineSeriesConfig<T>[],
    xKey: Extract<keyof T, string>,
    transformLineData?: RechartsLineChartConfig<T>["transformLineData"],
  ): Array<Record<string, PrimitiveValue>> {
    const lineSeries = lines.map((line) =>
      toNumericSeries(data, line.key, transformLineData),
    );

    return data.map((row, rowIndex) => {
      const nextRow: Record<string, PrimitiveValue> = { ...row };
      nextRow[xKey] = row[xKey];

      lines.forEach((line, lineIndex) => {
        nextRow[line.key] = lineSeries[lineIndex]?.[rowIndex] ?? null;
      });

      return nextRow;
    });
  }

  const resolvedLines = useMemo(
    () => resolveLineKeys(data, config.xKey, config.lines),
    [config.lines, config.xKey, data],
  );

  const resolvedReferenceLines = useMemo(
    () =>
      (config.referenceLines ?? []).filter((line) =>
        Number.isFinite(line.value),
      ),
    [config.referenceLines],
  );

  const resolvedXAxisLabelProps = {
    position: "insideBottom" as const,
    offset: -10,
    angle: 0,
    ...config.xAxisLabelProps,
  };
  const resolvedYAxisLabelProps = {
    position: "insideLeft" as const,
    offset: -4,
    angle: -90,
    ...config.yAxisLabelProps,
  };

  const chartData = useMemo(
    () =>
      buildChartData(
        data,
        resolvedLines,
        config.xKey,
        config.transformLineData,
      ),
    [config.transformLineData, config.xKey, data, resolvedLines],
  );

  const visibleData = zoomedRange
    ? chartData.slice(zoomedRange.startIndex, zoomedRange.endIndex + 1)
    : chartData;

  const yTickStep = config.yTickStep ?? DEFAULT_Y_TICK_STEP;
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(
    null,
  );
  const dragStateRef = useRef<{
    isDragging: boolean;
    startIndex: number | null;
  }>({
    isDragging: false,
    startIndex: null,
  });
  const dragSelectionRef = useRef<DragSelection | null>(null);

  useEffect(() => {
    dragSelectionRef.current = dragSelection;
  }, [dragSelection]);

  const resolvedYAxisTickRange = useMemo(() => {
    if (config.yTickValues?.length) {
      const minTick = Math.min(...config.yTickValues);
      const maxTick = Math.max(...config.yTickValues);

      return {
        ticks: config.yTickValues,
        domain: [minTick, maxTick] as [number, number],
      };
    }

    const numericValues: number[] = [];
    for (const row of chartData) {
      for (const line of resolvedLines) {
        const value = row[line.key];
        if (typeof value === "number" && Number.isFinite(value)) {
          numericValues.push(value);
        }
      }
    }

    for (const referenceLine of resolvedReferenceLines) {
      numericValues.push(referenceLine.value);
    }

    return buildYAxisTickRange(numericValues, yTickStep);
  }, [
    chartData,
    config.yTickValues,
    resolvedLines,
    resolvedReferenceLines,
    yTickStep,
  ]);

  const yDomainTopPadding = config.yDomainTopPadding ?? 0;
  const yDomainBottomPadding = config.yDomainBottomPadding ?? 0;
  const yDomain: [number, number] | undefined = resolvedYAxisTickRange?.domain
    ? [
        roundToPrecision(
          resolvedYAxisTickRange.domain[0] - yDomainBottomPadding,
        ),
        roundToPrecision(resolvedYAxisTickRange.domain[1] + yDomainTopPadding),
      ]
    : undefined;
  const yTicks = useMemo(() => {
    if (config.yTickValues?.length) {
      return config.yTickValues;
    }

    if (!yDomain) {
      return undefined;
    }

    const tickCount = Math.max(2, resolvedYAxisTickRange?.ticks.length ?? 5);
    return getNiceTickValues(yDomain, tickCount);
  }, [config.yTickValues, yDomain, resolvedYAxisTickRange?.ticks.length]);
  const xTickInterval = config.xTickInterval ?? 143;
  const firstYAxisTick = yTicks?.[0];

  const height = useMemo(() => {
    if (!yDomain) return 420;
    if (!yTickSpace) return 420;

    const tickCount = yTicks?.length ?? 0;
    if (tickCount === 0) return 420;

    const legendPadding = config.showLegend ? 40 : 0;
    // tickCount - 1 gives the number of intervals between ticks
    return (tickCount - 1) * yTickSpace + legendPadding;
  }, [yTicks, config.showLegend, yTickSpace]);

  function resolveXValueFromState(state: ChartMouseState | undefined): {
    index: number | null;
    value: PrimitiveValue;
  } {
    if (!chartData.length) {
      return { index: null, value: null };
    }

    // Primary approach: Use activeTooltipIndex (most reliable for index-based selection)
    const stateIndex =
      typeof state?.activeTooltipIndex === "number" &&
      state.activeTooltipIndex >= 0 &&
      state.activeTooltipIndex < chartData.length
        ? state.activeTooltipIndex
        : null;

    if (stateIndex != null) {
      return {
        index: stateIndex,
        value: chartData[stateIndex]?.[config.xKey] ?? null,
      };
    }

    // Fallback: Search by activeLabel
    // Note: activeLabel might be a formatted value, so we search by value comparison
    const activeLabel = state?.activeLabel;
    if (activeLabel != null) {
      for (let i = 0; i < chartData.length; i++) {
        const rowValue = chartData[i]?.[config.xKey];
        if (rowValue != null && String(rowValue) === String(activeLabel)) {
          return {
            index: i,
            value: rowValue,
          };
        }
      }
    }

    return { index: null, value: null };
  }

  function logDragSelection(
    startIndex: number,
    endIndex: number,
    startValue: PrimitiveValue,
    endValue: PrimitiveValue,
  ) {
    console.log("Selected x range", {
      startIndex,
      endIndex,
      start_x: startValue,
      end_x: endValue,
    });
  }

  function clearDragSelection() {
    dragStateRef.current = {
      isDragging: false,
      startIndex: null,
    };
    setDragSelection(null);
  }

  function handleChartMouseDown(state: ChartMouseState | undefined) {
    const resolved = resolveXValueFromState(state);
    if (resolved.index == null) return;

    dragStateRef.current = {
      isDragging: true,
      startIndex: resolved.index,
    };

    setDragSelection({
      startValue: resolved.value,
      endValue: resolved.value,
      startIndex: resolved.index,
      endIndex: resolved.index,
    });
  }

  function handleChartMouseMove(state: ChartMouseState | undefined) {
    if (
      !dragStateRef.current.isDragging ||
      dragStateRef.current.startIndex == null
    ) {
      return;
    }

    const resolved = resolveXValueFromState(state);
    if (resolved.index == null) return;

    const startIndex = dragStateRef.current.startIndex;
    const fromIndex = Math.min(startIndex, resolved.index);
    const toIndex = Math.max(startIndex, resolved.index);

    setDragSelection({
      startValue: chartData[fromIndex]?.[config.xKey] ?? null,
      endValue: chartData[toIndex]?.[config.xKey] ?? null,
      startIndex: fromIndex,
      endIndex: toIndex,
    });
  }

  function handleChartMouseUp() {
    if (!dragStateRef.current.isDragging) {
      clearDragSelection();
      return;
    }

    const selection = dragSelectionRef.current;
    if (selection) {
      logDragSelection(
        selection.startIndex,
        selection.endIndex,
        selection.startValue,
        selection.endValue,
      );

      if (selection.startIndex !== selection.endIndex) {
        setZoomedRange({
          startIndex: selection.startIndex,
          endIndex: selection.endIndex,
        });
      }
    }

    clearDragSelection();
  }

  const referenceX1 = zoomedRange
    ? dragSelection?.startValue
    : dragSelection?.startIndex;

  const referenceX2 = zoomedRange
    ? dragSelection?.endValue
    : dragSelection?.endIndex;

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (!dragStateRef.current.isDragging) return;
      handleChartMouseUp();
    };

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  return (
    <div
      ref={chartRef}
      className={cn(
        "rounded-xl border border-border bg-white pt-6 relative flex flex-col gap-5",
        isFullScreen && "grow",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-6",
          headerClassName,
        )}
      >
        {headerRenderer ??
          (title && (
            <Text
              variant="h4"
              className={cn("text-text-primary!", titleClassName)}
            >
              {title}
            </Text>
          ))}

        {!isLoading && (
          <div
            className={cn(
              "flex items-center gap-4 chart-actions",
              actionWrapperClassName,
            )}
          >
            {enableZoom && zoomedRange && (
              <button
                type="button"
                onClick={() => {
                  setZoomedRange(null);
                  clearDragSelection();
                }}
                className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2  transition-colors hover:bg-primary-tint-2!"
              >
                <Icon
                  name="rotateCcw"
                  className="text-text-primary! size-3.5"
                />
                <Text variant="12M">Reset zoom</Text>
              </button>
            )}
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

      <div
        className={cn("w-full grow select-none", chartClassName)}
        style={{ height }}
      >
        <WithFallback
          isLoading={isLoading}
          fallback={
            <div className="px-4 flex-col pb-4 flex h-full min-h-90">
              <div className="flex items-start grow pt-2">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={20}
                  height={88}
                  className="rounded-full!"
                />
                <div className="flex flex-col grow gap-4 my-2 mx-6">
                  <Skeleton
                    animation="wave"
                    variant="rounded"
                    width="100%"
                    height={220}
                  />
                  <div className="flex justify-between gap-3">
                    <Skeleton
                      animation="wave"
                      variant="rounded"
                      width={72}
                      height={18}
                      className="rounded-full!"
                    />
                    <Skeleton
                      animation="wave"
                      variant="rounded"
                      width={96}
                      height={18}
                      className="rounded-full!"
                    />
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart
              data={visibleData}
              margin={{
                top: 20,
                right: 24,
                bottom: 42,
                left: 12,
                ...chartMargin,
              }}
              onMouseDown={
                enableZoom ? (handleChartMouseDown as any) : undefined
              }
              onMouseMove={
                enableZoom ? (handleChartMouseMove as any) : undefined
              }
            >
              {enableZoom &&
                dragSelection &&
                referenceX1 != null &&
                referenceX2 != null && (
                  <ReferenceArea
                    x1={referenceX1 as number}
                    x2={referenceX2 as number}
                    fill="#90E5DB2E"
                    stroke="#90E5DB"
                    ifOverflow="hidden"
                  />
                )}
              {resolvedReferenceLines.map((referenceLine, index) => {
                const lineColor =
                  referenceLine.color ||
                  LINE_COLORS[index % LINE_COLORS.length];
                const isDotted = referenceLine.lineStyle === "dotted";
                const resolvedLineStyle = isDotted ? "dotted" : "solid";
                const resolvedLabel =
                  referenceLine.labelRenderer?.({
                    value: referenceLine.value,
                    color: lineColor,
                    lineStyle: resolvedLineStyle,
                    index,
                    label: referenceLine.label,
                    legendLabel: referenceLine.legendLabel,
                  }) ?? referenceLine.label;

                return (
                  <ReferenceLine
                    key={`reference-line-${index}-${referenceLine.value}`}
                    y={referenceLine.value}
                    stroke={lineColor}
                    strokeWidth={2}
                    strokeDasharray={
                      isDotted ? DOTTED_STROKE_DASHARRAY : undefined
                    }
                    label={resolvedLabel as any}
                    ifOverflow="extendDomain"
                  />
                );
              })}
              <defs>
                {resolvedLines.map((lineConfig, index) => {
                  const lineColor =
                    lineConfig.color || LINE_COLORS[index % LINE_COLORS.length];

                  const gradientStart =
                    lineConfig.gradientColor?.start || lineColor;

                  const gradientEnd =
                    lineConfig.gradientColor?.end || lineColor;

                  return (
                    <linearGradient
                      key={`${String(lineConfig.key)}-gradient`}
                      id={`${String(lineConfig.key)}-gradient`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={gradientStart}
                        stopOpacity={lineConfig.areaOpacity ?? 0.4}
                      />

                      <stop
                        offset="100%"
                        stopColor={gradientEnd}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                vertical
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                {...cartesianGridProps}
              />
              <XAxis
                dataKey={config.xKey}
                interval={xTickInterval}
                minTickGap={12}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                {...xAxisProps}
                tick={{
                  fill: "var(--color-text-secondary)",
                  fontFamily: "Inter-Regular",
                  fontSize: 12,
                }}
                tickFormatter={(value, index) =>
                  config.hideFirstXAxisTickLabel && index === 0
                    ? ""
                    : config.xTickFormatter
                      ? config.xTickFormatter(value, index)
                      : formatTimeTick(value)
                }
                label={{
                  value: config.xAxisLabel || "Date",
                  position: resolvedXAxisLabelProps.position,
                  offset: resolvedXAxisLabelProps.offset,
                  angle: resolvedXAxisLabelProps.angle,
                  style: {
                    fill: "var(--color-text-primary)",
                    fontFamily: "Inter-Medium",
                    fontSize: 15,
                    userSelect: "none",
                  },
                }}
              />
              <YAxis
                {...yAxisProps}
                axisLine={{ stroke: "var(--color-border)" }}
                domain={yDomain}
                tickLine={false}
                tick={{
                  fill: "var(--color-text-secondary)",
                  fontFamily: "Inter-Regular",
                  fontSize: 12,
                }}
                tickFormatter={(value) =>
                  config.hideFirstYAxisTickLabel && firstYAxisTick === value
                    ? ""
                    : config.yTickFormatter
                      ? config.yTickFormatter(value)
                      : formatNumericTick(value)
                }
                label={{
                  value: config.yAxisLabel || "Price (£/MWh)",
                  angle: resolvedYAxisLabelProps.angle,
                  position: resolvedYAxisLabelProps.position,
                  offset: resolvedYAxisLabelProps.offset,
                  style: {
                    fill: "var(--color-text-primary)",
                    fontFamily: "Inter-Medium",
                    fontSize: 15,
                    textAnchor: "middle",
                    userSelect: "none",
                  },
                }}
              />
              <Tooltip
                content={(tooltipProps) => {
                  if (tooltipRenderer) {
                    return tooltipRenderer(tooltipProps);
                  }
                  return (
                    <LineTooltip
                      active={tooltipProps.active}
                      payload={
                        (tooltipProps.payload ?? []) as ReadonlyArray<
                          LineTooltipPayload<T>
                        >
                      }
                      label={tooltipProps.label}
                      titleFormatter={config.tooltipTitleFormatter}
                      valueFormatter={config.tooltipValueFormatter}
                    />
                  );
                }}
                cursor={
                  config.tooltipCursor ?? {
                    stroke: "var(--color-border)",
                    strokeWidth: 1,
                  }
                }
                wrapperStyle={{ outline: "none" }}
              />
              {config.showLegend && (
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  content={() => (
                    <div className="flex justify-end gap-8 pb-4">
                      {resolvedLines.map((lineConfig, index) => {
                        const lineColor =
                          lineConfig.color ||
                          LINE_COLORS[index % LINE_COLORS.length];

                        return (
                          <div
                            key={String(lineConfig.key)}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="relative w-9 h-3"
                              aria-hidden="true"
                            >
                              <span
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2"
                                style={{
                                  borderColor: lineColor,
                                  borderStyle: lineConfig.strokeDasharray
                                    ? "dashed"
                                    : "solid",
                                }}
                              />
                              {lineConfig.showSymbol && (
                                <span
                                  className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                                  style={{
                                    borderColor: lineColor,
                                  }}
                                />
                              )}
                            </div>

                            <span
                              style={{
                                color: lineColor,
                                fontFamily: "Inter-Regular",
                                fontSize: 14,
                              }}
                            >
                              {lineConfig.label ||
                                config.formatLabel?.(String(lineConfig.key)) ||
                                String(lineConfig.key)}
                            </span>
                          </div>
                        );
                      })}
                      {resolvedReferenceLines.map((referenceLine, index) => {
                        const lineColor =
                          referenceLine.color ||
                          LINE_COLORS[index % LINE_COLORS.length];
                        const isDotted = referenceLine.lineStyle === "dotted";
                        const resolvedLegendLabel =
                          referenceLine.legendLabel ??
                          referenceLine.label ??
                          String(referenceLine.value);

                        return (
                          <div
                            key={`reference-legend-${index}-${referenceLine.value}`}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="relative w-9 h-3"
                              aria-hidden="true"
                            >
                              <span
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2"
                                style={{
                                  borderColor: lineColor,
                                  borderStyle: isDotted ? "dashed" : "solid",
                                }}
                              />
                            </div>

                            {typeof resolvedLegendLabel === "string" ||
                            typeof resolvedLegendLabel === "number" ? (
                              <span
                                style={{
                                  color: lineColor,
                                  fontFamily: "Inter-Regular",
                                  fontSize: 14,
                                }}
                              >
                                {resolvedLegendLabel}
                              </span>
                            ) : (
                              resolvedLegendLabel
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              )}
              {resolvedLines.map((lineConfig, index) => {
                const lineColor =
                  lineConfig.color || LINE_COLORS[index % LINE_COLORS.length];
                const lineStrokeWidth =
                  lineConfig.strokeWidth ?? config.lineStrokeWidth ?? 2;
                return (
                  <Fragment key={String(lineConfig.key)}>
                    {lineConfig.showArea && (
                      <Area
                        key={`${String(lineConfig.key)}-area`}
                        type={lineConfig.smooth ? "natural" : "linear"}
                        dataKey={lineConfig.key}
                        legendType="none"
                        isAnimationActive={false}
                        connectNulls={false}
                        baseValue="dataMin"
                        fillRule="nonzero"
                        tooltipType="none"
                        stroke="none"
                        fillOpacity={1}
                        fill={`url(#${String(lineConfig.key)}-gradient)`}
                      />
                    )}
                    <Line
                      key={String(lineConfig.key)}
                      type={lineConfig.smooth ? "natural" : "linear"}
                      dataKey={lineConfig.key}
                      name={
                        lineConfig.label ||
                        config.formatLabel?.(String(lineConfig.key)) ||
                        String(lineConfig.key)
                      }
                      stroke={lineColor}
                      strokeWidth={lineStrokeWidth}
                      strokeDasharray={lineConfig.strokeDasharray}
                      dot={
                        lineConfig.showSymbol
                          ? {
                              r: 3,
                              stroke: lineColor,
                              strokeWidth: 2,
                              fill: "#fff",
                            }
                          : false
                      }
                      activeDot={<LineActiveDot color={lineColor} />}
                      connectNulls={false}
                      isAnimationActive={false}
                      hide={lineConfig.hidden}
                    />
                  </Fragment>
                );
              })}
            </ReLineChart>
          </ResponsiveContainer>
        </WithFallback>
      </div>

      {!isLoading && enableZoom && (
        <div className="px-6 pb-4 flex justify-center">
          <Text variant="14M" className="text-text-secondary!">
            Tip: click and drag horizontally to zoom into a date range. Use
            Reset zoom to restore.
          </Text>
        </div>
      )}
    </div>
  );
}
