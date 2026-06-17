import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  useChartTooltip,
  useChartsActionV2,
  useWindowDimensions,
} from "../../../../hooks";
import { cn, formatCurrencyToPound } from "../../../../utils";
import { IconButton, Skeleton, Text } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";

export type DivergentBarDataPoint = {
  label: string;
  value: number;
  color?: string;
} & Record<string, string | number | undefined>;

type DivergentBarTooltipProps = {
  payload?: DivergentBarDataPoint;
  xKey: string;
  xLabel: string;
  yLabel: string;
  valueColor: string;
};

interface DivergentBarProps {
  data: DivergentBarDataPoint[];
  xKey: string;
  yKey: string;
  headerNote?: React.ReactNode;
  downloadFileName: string;
  title?: string;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  actionWrapperClassName?: string;
  chartClassName?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
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
  positiveBarColor?: string;
  negativeBarColor?: string;
  hoverColor?: string;
  zeroLineColor?: string;
  barRadius?: number;
  barWidth?: number;
  yAxisWidth?: number;
  yAxisTicks?: number[];
  yAxisTickCount?: number;
  yAxisDomain?: [number, number];
  xTickFormatter?: (value: string | number, index: number) => string;
  tooltipLabelKey?: string;
  tooltipXLabel?: string;
  tooltipYLabel?: string;
  valueLabelProps?: {
    dx?: number;
    dy?: number;
    offset?: number;
    fontSize?: number;
    fontWeight?: number;
  };
  positiveValueLabelProps?: {
    dx?: number;
    dy?: number;
    offset?: number;
    fontSize?: number;
    fontWeight?: number;
  };
  negativeValueLabelProps?: {
    dx?: number;
    dy?: number;
    offset?: number;
    fontSize?: number;
    fontWeight?: number;
  };
  showValues?: boolean;
  isLoading: boolean;
  isFullScreenOverride?: boolean;
  showTooltip?: boolean;
}

const DEFAULT_POSITIVE_COLOR = "#1EC590";
const DEFAULT_NEGATIVE_COLOR = "var(--color-error)";
const DEFAULT_HOVER_COLOR = "#7CC6F0";
const DEFAULT_ZERO_LINE_COLOR = "var(--color-border)";

function DivergentBarTooltip({
  payload,
  xKey,
  xLabel,
  yLabel,
  valueColor,
}: DivergentBarTooltipProps) {
  if (!payload) return null;

  const xValue = payload[xKey] ?? payload.label;

  return (
    <div className="min-w-30 rounded-lg border border-border bg-white px-4 py-3 shadow-md">
      <Text variant="small" className="text-text-secondary! text-nowrap">
        {xLabel}: {xValue}
      </Text>
      <Text
        variant="caption"
        className="font-InterSemiBold! text-nowrap"
        style={{ color: valueColor }}
      >
        {yLabel}: {formatCurrencyToPound(payload.value)}
      </Text>
    </div>
  );
}

function DivergentBarValueLabel(props: any) {
  const {
    x,
    y,
    width,
    height,
    value,
    isNegative,
    baseOffset,
    dx = 0,
    dy = 0,
    fontSize = 12,
    fontWeight = 700,
  } = props;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const labelIsNegative = isNegative ?? numericValue < 0;
  const resolvedOffset = typeof baseOffset === "number" ? baseOffset : 12;
  const rawY = Number(y);
  const rawHeight = Number(height);
  const barTop = Math.min(rawY, rawY + rawHeight);
  const barBottom = Math.max(rawY, rawY + rawHeight);
  const barSize = Math.abs(rawHeight);
  const gap = labelIsNegative
    ? Math.min(resolvedOffset, Math.max(10, barSize * 0.18))
    : resolvedOffset;
  const textY = labelIsNegative
    ? barBottom + gap + dy
    : barTop - resolvedOffset + dy;
  const xPos = x + width / 2;
  const dominantBaseline = labelIsNegative ? "hanging" : "auto";

  return (
    <text
      x={xPos + dx}
      y={textY}
      fill="var(--color-text-primary)"
      textAnchor="middle"
      dominantBaseline={dominantBaseline}
      fontFamily="Inter-Regular"
      fontSize={fontSize}
      fontWeight={fontWeight}
    >
      {formatCurrencyToPound(numericValue)}
    </text>
  );
}

export function DivergentBarChart(props: DivergentBarProps) {
  const {
    data,
    xKey,
    headerNote,
    yKey,
    downloadFileName,
    title,
    className,
    headerClassName,
    titleClassName,
    actionWrapperClassName,
    chartClassName,
    xAxisLabel = "Sources",
    yAxisLabel = "Revenue (£)",
    xAxisLabelProps,
    yAxisLabelProps,
    positiveBarColor = DEFAULT_POSITIVE_COLOR,
    negativeBarColor = DEFAULT_NEGATIVE_COLOR,
    hoverColor = DEFAULT_HOVER_COLOR,
    zeroLineColor = DEFAULT_ZERO_LINE_COLOR,
    barRadius = 4,
    yAxisWidth = 56,
    barWidth = 100,
    yAxisTicks,
    yAxisTickCount,
    yAxisDomain,
    xTickFormatter,
    tooltipLabelKey,
    tooltipXLabel,
    tooltipYLabel,
    valueLabelProps,
    positiveValueLabelProps,
    negativeValueLabelProps,
    showValues = true,
    isLoading,
    isFullScreenOverride = false,
    showTooltip = false,
  } = props;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();

  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <DivergentBarChart {...props} isFullScreenOverride />
      ),
    });

  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<DivergentBarDataPoint>(chartRef as any);

  const resolvedTooltipXLabel =
    tooltipXLabel || xAxisLabel.replace(/\s*\(.*?\)\s*/g, "").trim() || "Label";
  const resolvedTooltipYLabel = tooltipYLabel || yAxisLabel;
  const isFullScreen = isFullScreenOverride;
  const resolvedXAxisLabelProps = {
    position: "insideBottom" as const,
    offset: -10,
    angle: 0,
    ...xAxisLabelProps,
  };
  const resolvedYAxisLabelProps = {
    position: "insideLeft" as const,
    offset: -4,
    angle: -90,
    ...yAxisLabelProps,
  };
  const isCompactViewport = width < 1100;
  const hasDenseCategories = data.length > 5;
  const shouldTiltLabels = isCompactViewport && hasDenseCategories;
  const resolvedBarWidth = shouldTiltLabels
    ? Math.min(barWidth, 34)
    : isCompactViewport
      ? Math.min(barWidth, 42)
      : barWidth;
  const resolvedYAxisWidth = isCompactViewport
    ? Math.max(44, yAxisWidth - 8)
    : yAxisWidth;
  const resolvedTickFontSize = isCompactViewport ? 11 : 12;
  const resolvedBottomMargin = shouldTiltLabels ? 76 : 48;
  const resolvedXAxisHeight = shouldTiltLabels ? 72 : 40;

  const computedDomain = useMemo<[number, number]>(() => {
    if (yAxisDomain) return yAxisDomain;

    const values = data.map((item) => Number(item?.[yKey] ?? item?.value ?? 0));
    const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
    const padding = Math.ceil(maxAbs * 0.2);

    return [-maxAbs - padding, maxAbs + padding];
  }, [data, yAxisDomain, yKey]);

  const computedTicks = useMemo(() => {
    if (yAxisTicks?.length) return yAxisTicks;

    const [lower, upper] = computedDomain;
    const positiveTick = Math.round(upper / 2);
    const negativeTick = Math.round(lower / 2);

    return [upper, positiveTick, 0, negativeTick, lower];
  }, [computedDomain, yAxisTicks]);

  const formatAxisTick = (value: string | number): string => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    if (numeric === 0) return "0";

    const absolute = Math.abs(numeric);
    if (absolute >= 1000000) {
      return `${numeric < 0 ? "-" : ""}${Math.round(absolute / 1000000)}m`;
    }

    if (absolute >= 1000) {
      return `${numeric < 0 ? "-" : ""}${Math.round(absolute / 1000)}k`;
    }

    return String(Math.round(numeric));
  };

  const getBarColor = (item: DivergentBarDataPoint, index: number) => {
    const rawValue = Number(item?.[yKey] ?? item?.value ?? 0);
    const baseColor = rawValue < 0 ? negativeBarColor : positiveBarColor;

    if (activeIndex === index && showTooltip) {
      return hoverColor;
    }

    return item.color || baseColor;
  };

  const getValueLabelProps = (value: number, item?: DivergentBarDataPoint) => {
    const rawValue = Number(item?.[yKey] ?? item?.value ?? value ?? 0);
    const isNegative = rawValue < 0;
    const sideProps = isNegative
      ? negativeValueLabelProps
      : positiveValueLabelProps;

    return {
      isNegative,
      baseOffset:
        sideProps?.offset ?? valueLabelProps?.offset ?? (isNegative ? 14 : 12),
      dx: sideProps?.dx ?? valueLabelProps?.dx ?? 0,
      dy: sideProps?.dy ?? valueLabelProps?.dy ?? 0,
      fontSize: sideProps?.fontSize ?? valueLabelProps?.fontSize ?? 12,
      fontWeight: sideProps?.fontWeight ?? valueLabelProps?.fontWeight ?? 700,
    };
  };

  return (
    <div
      ref={chartRef}
      onMouseLeave={() => {
        handleMouseLeave();
        setActiveIndex(null);
      }}
      className={cn(
        "rounded-xl border border-border bg-white pt-6 px-6 relative flex flex-col gap-5",
        isFullScreen && "grow",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 ",
          headerClassName,
        )}
      >
        {title && (
          <Text
            variant="h4"
            className={cn("text-text-primary!", titleClassName)}
          >
            {title}
          </Text>
        )}

        {!isLoading && (
          <div
            className={cn(
              "flex items-center gap-4 chart-actions",
              actionWrapperClassName,
            )}
          >
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
      {!isLoading && headerNote}

      <div className={cn("w-full grow", chartClassName)}>
        <WithFallback isLoading={isLoading} fallback={<DivergentBarSkeleton />}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="px-4 pb-6 relative"
          >
            <BarChart
              data={data}
              margin={{
                top: 28,
                right: isCompactViewport ? 8 : 24,
                bottom: resolvedBottomMargin,
                left: 8,
              }}
              barCategoryGap={isCompactViewport ? 16 : 28}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
              <ReferenceLine y={0} stroke={zeroLineColor} strokeWidth={1} />
              <XAxis
                dataKey={xKey}
                axisLine={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                tickLine={false}
                interval={0}
                height={resolvedXAxisHeight}
                angle={shouldTiltLabels ? -24 : 0}
                textAnchor={shouldTiltLabels ? "end" : "middle"}
                tick={{
                  fontSize: resolvedTickFontSize,
                  fill: "var(--color-text-secondary)",
                  fontWeight: 500,
                }}
                tickFormatter={xTickFormatter}
                dy={10}
              >
                <Label
                  value={xAxisLabel}
                  position={resolvedXAxisLabelProps.position}
                  offset={resolvedXAxisLabelProps.offset}
                  angle={resolvedXAxisLabelProps.angle}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </XAxis>
              <YAxis
                axisLine={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                tickLine={false}
                tick={{
                  fontSize: resolvedTickFontSize,
                  fill: "var(--color-text-secondary)",
                  fontWeight: 500,
                }}
                width={resolvedYAxisWidth}
                ticks={computedTicks}
                tickCount={yAxisTickCount}
                domain={computedDomain}
                tickFormatter={formatAxisTick}
              >
                <Label
                  value={yAxisLabel}
                  angle={resolvedYAxisLabelProps.angle}
                  position={resolvedYAxisLabelProps.position}
                  offset={resolvedYAxisLabelProps.offset}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 16,
                    fontWeight: 500,
                    textAnchor: "middle",
                  }}
                />
              </YAxis>
              <Bar
                maxBarSize={resolvedBarWidth}
                dataKey={yKey}
                isAnimationActive={false}
                radius={[barRadius, barRadius, 0, 0]}
                minPointSize={(value: number | null | undefined) => {
                  if (value == null) return 0; // handles null + undefined
                  if (!Number.isFinite(value) || value >= 0) return 0;
                  const abs = Math.abs(value);
                  if (abs >= 2500) return 24;
                  if (abs >= 1500) return 14;
                  return 9;
                }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((item, index) => {
                  return (
                    <Cell
                      key={`divergent-bar-cell-${index}`}
                      className="cursor-pointer"
                      fill={getBarColor(item, index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseMove={(e) => handleMouseMove(e, item)}
                      onMouseLeave={() => {
                        handleMouseLeave();
                        setActiveIndex(null);
                      }}
                    />
                  );
                })}
                {showValues && (
                  <LabelList
                    dataKey={yKey}
                    content={(labelProps: any) => {
                      return (
                        <DivergentBarValueLabel
                          {...labelProps}
                          {...getValueLabelProps(
                            Number(labelProps?.value ?? 0),
                            labelProps?.payload,
                          )}
                        />
                      );
                    }}
                  />
                )}
              </Bar>
            </BarChart>

            {showTooltip && (
              <>
                {!tooltip ? null : (
                  <div
                    className="absolute pointer-events-none z-50"
                    style={{
                      left: tooltip.x,
                      top: tooltip.y,
                      transform: "translate(-50%, -220%)",
                    }}
                  >
                    <DivergentBarTooltip
                      payload={tooltip.data}
                      xKey={tooltipLabelKey || xKey}
                      xLabel={resolvedTooltipXLabel}
                      yLabel={resolvedTooltipYLabel}
                      valueColor={
                        Number((tooltip.data as DivergentBarDataPoint)?.value) <
                        0
                          ? negativeBarColor
                          : positiveBarColor
                      }
                    />
                  </div>
                )}
              </>
            )}
          </ResponsiveContainer>
        </WithFallback>
      </div>
    </div>
  );
}

function DivergentBarSkeleton() {
  return (
    <div className="h-full min-h-90 pb-4">
      <div className="relative h-full">
        {/* y Label */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          <Skeleton
            animation="wave"
            variant="rounded"
            width={12}
            height={88}
            className="rounded-full!"
          />
        </div>

        {/* x Label */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <Skeleton
            animation="wave"
            variant="rounded"
            width={64}
            height={14}
            className="rounded-full!"
          />
        </div>

        {/* cartesian grid */}
        <div className="absolute inset-x-6 top-0 bottom-8 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "border-t border-border/70",
                index !== 2 && "border-dashed",
              )}
            />
          ))}

          <div className="absolute flex justify-evenly inset-0">
            {[100, 70, 100, 70].map((height, index) => (
              <Skeleton
                key={index}
                animation="wave"
                variant="rounded"
                width={60}
                height={height}
                className={cn(
                  "rounded! top-1/2!",
                  index % 2 !== 0
                    ? "rounded-t-none! bg-[#D7D7D7]!"
                    : "rounded-b-none! -translate-y-full",
                )}
              />
            ))}
          </div>
        </div>

        {/* axis line */}
        {/* y axis */}
        <div className="w-px absolute top-0 left-6 bottom-8 bg-border/70" />
        {/* x axis */}
        {/* <div className="h-px absolute right-6 left-6 bottom-8 bg-border/70" /> */}
      </div>
    </div>
  );
}
