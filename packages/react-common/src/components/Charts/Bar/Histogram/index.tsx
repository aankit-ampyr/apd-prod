import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts";
import { useChartsActionV2, useChartTooltip } from "../../../../hooks";
import { cn, seededRandom } from "../../../../utils";
import { IconButton, Text, Skeleton } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";

type HistogramValue = string | number;

export type HistogramDataPoint = {
  label: string;
  value: number;
  color?: string;
} & Record<string, HistogramValue | undefined>;

interface HistogramProps {
  data: HistogramDataPoint[];
  xKey: string;
  yKey: string;
  downloadFileName: string;
  title?: string;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  actionWrapperClassName?: string;
  chartClassName?: string;
  xAxisLabel?: string;
  useBuiltInTooltip?: boolean;
  yAxisLabel?: string;
  barColor?: string;
  hoverColor?: string;
  barRadius?: number;
  yAxisWidth?: number;
  yAxisTicks?: number[];
  yAxisTickCount?: number;
  yAxisDomain?: [number, number];
  xTickFormatter?: (value: string | number, index: number) => string;
  tooltipLabelKey?: string;
  tooltipXLabel?: string;
  tooltipYLabel?: string;
  isLoading: boolean;
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
  isFullScreenOverride?: boolean;
}

interface HistogramTooltipProps {
  active?: boolean;
  payload?: HistogramDataPoint;
  xKey: string;
  xLabel: string;
  yLabel: string;
  valueColor: string;
}

export function Histogram(props: HistogramProps) {
  const {
    data,
    xKey,
    yKey,
    downloadFileName,
    title,
    className,
    headerClassName,
    titleClassName,
    actionWrapperClassName,
    chartClassName,
    xAxisLabel = "SOC (%)",
    yAxisLabel = "Frequency",
    barColor = "#97DDF0",
    hoverColor = "#46B3CF",
    barRadius = 4,
    yAxisWidth = 48,
    yAxisTicks,
    yAxisTickCount,
    yAxisDomain,
    xTickFormatter,
    tooltipLabelKey,
    tooltipXLabel,
    tooltipYLabel,
    xAxisLabelProps,
    yAxisLabelProps,
    isLoading,
    isFullScreenOverride = false,
    useBuiltInTooltip = false,
  } = props;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => <Histogram {...props} isFullScreenOverride />,
    });
  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<HistogramDataPoint>(chartRef as any);

  const resolvedTooltipXLabel =
    tooltipXLabel || xAxisLabel.replace(/\s*\(.*?\)\s*/g, "").trim() || "Label";
  const resolvedTooltipYLabel = tooltipYLabel || yAxisLabel;
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

  const defaultTickFormatter = (value: string | number): string => {
    const input = String(value);
    const parts = input.split("-");
    if (parts.length === 2) {
      return parts[1].replace("%", "").trim();
    }
    return String(value);
  };

  const isFullScreen = isFullScreenOverride;

  return (
    <div
      ref={chartRef}
      onMouseLeave={() => {
        handleMouseLeave(); // ✅ add this
        setActiveIndex(null); // 🔥 important
      }}
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

      <div className={cn("w-full grow", chartClassName)}>
        <WithFallback
          isLoading={isLoading}
          fallback={
            <div className="px-4 flex-col pb-4 flex h-full min-h-90">
              <div className="flex items-center grow">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={20}
                  height={88}
                  className="rounded-full!"
                />
                <div className="flex self-stretch gap-px grow border-border items-end border my-2 mx-6 border-t-0! border-r-0!">
                  {Array.from({ length: 10 }).map((_, index) => {
                    const rand = seededRandom(index + 1);
                    const height = Math.ceil(rand * 100);
                    return (
                      <Skeleton
                        key={index}
                        animation="wave"
                        variant="rectangular"
                        style={{ height: `${height}%` }}
                        className="grow m-0! rounded! p-0! flex h-6"
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={88}
                  height={20}
                  className="rounded-full!"
                />
              </div>
            </div>
          }
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="px-4 pb-6 relative"
          >
            <BarChart
              data={data}
              margin={{ top: 12, right: 8, bottom: 28, left: 18 }}
              barCategoryGap={1}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                tickFormatter={xTickFormatter || defaultTickFormatter}
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
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                width={yAxisWidth}
                ticks={yAxisTicks}
                tickCount={yAxisTickCount}
                domain={yAxisDomain}
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
                activeBar={useBuiltInTooltip ? { fill: hoverColor } : undefined}
                dataKey={yKey}
                fill={barColor}
                radius={[barRadius, barRadius, 0, 0]}
                isAnimationActive={false}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((item, index) => (
                  <Cell
                    className="cursor-pointer"
                    key={`histogram-cell-${index}`}
                    fill={
                      useBuiltInTooltip
                        ? barColor
                        : activeIndex === index
                          ? hoverColor
                          : barColor
                    }
                    onMouseEnter={() =>
                      !useBuiltInTooltip && setActiveIndex(index)
                    }
                    onMouseMove={(e) =>
                      !useBuiltInTooltip && handleMouseMove(e, item)
                    }
                    onMouseLeave={() => {
                      if (!useBuiltInTooltip) {
                        handleMouseLeave();
                        setActiveIndex(null);
                      }
                    }}
                  />
                ))}
              </Bar>
              {useBuiltInTooltip && (
                <ReTooltip
                  animationDuration={0}
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <HistogramTooltip
                        payload={data}
                        xKey={tooltipLabelKey || xKey}
                        xLabel={resolvedTooltipXLabel}
                        yLabel={resolvedTooltipYLabel}
                        valueColor={hoverColor}
                      />
                    );
                  }}
                />
              )}
            </BarChart>

            {!useBuiltInTooltip && tooltip && (
              <div
                className="absolute pointer-events-none z-50"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -220%)",
                }}
              >
                <HistogramTooltip
                  payload={tooltip.data}
                  xKey={tooltipLabelKey || xKey}
                  xLabel={resolvedTooltipXLabel}
                  yLabel={resolvedTooltipYLabel}
                  valueColor={hoverColor}
                />
              </div>
            )}
          </ResponsiveContainer>
        </WithFallback>
      </div>
    </div>
  );
}

function HistogramTooltip({
  payload,
  xKey,
  xLabel,
  yLabel,
  valueColor,
}: HistogramTooltipProps) {
  if (!payload) return null;
  const dataPoint = payload;
  const xValue = dataPoint[xKey] ?? dataPoint.label;

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
        {yLabel}: {dataPoint.value}
      </Text>
    </div>
  );
}
