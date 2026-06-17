import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../../utils";
import { useChartsActionV2 } from "../../../../hooks";
import { Icon, IconButton, Text } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";
import { GroupedBarChartSkeleton } from "./GroupBarSkeleton";
import {
  Bar,
  BarChart,
  BarShapeProps,
  CartesianGrid,
  Label,
  LabelProps,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  Rectangle,
  YAxis,
} from "recharts";

/**
 * ===========================
 * Helper Types & Constants
 * ===========================
 */
export enum GroupedBarSeriesMode {
  NORMAL = "normal",
  COMPARISON = "comparison",
}

type NormalSeries = {
  id: string;
  label: string;

  mode?: GroupedBarSeriesMode.NORMAL;

  color: string;
  hoverColor?: string;
};

type ComparisonSeries = {
  id: string;
  label: string;

  mode: GroupedBarSeriesMode.COMPARISON;

  positiveColor: string;
  negativeColor: string;

  positiveHoverColor?: string;
  negativeHoverColor?: string;
};

export type GroupedBarSeries = NormalSeries | ComparisonSeries;

export type GroupedBarDataPoint = {
  categoryId: string | number;
  label: string;
  values: Record<string, number>;
};

interface GroupedBarChartV2Props {
  downloadFileName?: string;
  isFullScreenOverride?: boolean;
  enableHorizontalScroll?: boolean;
  showLegends?: boolean;
  showTooltip?: boolean;
  className?: string;
  header?: string | React.ReactNode;
  isLoading?: boolean;
  data: GroupedBarDataPoint[];
  series: GroupedBarSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  barGap?: number;
  barCategoryGap?: number | string;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  formatYAxisTick?: (value: string | number) => string;
  customTooltipRenderer?: (props: GroupedBarTooltipData) => React.ReactNode;
  categoryWidth?: number;
  xAxisLabelProps?: LabelProps;
  yAxisLabelProps?: LabelProps;
  yAxisWidth?: number;
  barRadius?: number;
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
  barValueLabelFomatter?: (value: number) => string;
  barValueLabelProps?: React.SVGAttributes<SVGTextElement>;
  formatXAxisTick?: (labe: string) => string;
}
export function GroupedBarChartV2(props: GroupedBarChartV2Props) {
  const {
    downloadFileName = "",
    isFullScreenOverride: isFullScreen,
    enableHorizontalScroll = false,
    isLoading = false,
    className,
    header,
    data,
    series,
    barCategoryGap,
    barGap,
    customTooltipRenderer,
    formatXAxisTick,
    showLegends,
    showTooltip,
    showValues,
    xAxisLabel,
    yAxisLabel,
    categoryWidth = 120,
    xAxisLabelProps,
    barRadius = 6,
    barWidth = 30,
    yAxisWidth = 60,
    yAxisLabelProps,
    chartMargins,
    sepYChartMargins,
    barValueLabelFomatter,
    barValueLabelProps,
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
        <GroupedBarChartV2 {...props} isFullScreenOverride />
      ),
    });

  /**
   * ====================================
   * States & Refs
   * ====================================
   */
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const chartHostRef = useRef<HTMLDivElement | null>(null);

  /**
   * ====================================
   * Derived States
   * ====================================
   */
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        label: item.label,
        ...item.values,
      })),
    [data],
  );

  const scrollWidth = chartData.length * categoryWidth;
  const renderedChartWidth = enableHorizontalScroll
    ? Math.max(chartWidth, scrollWidth)
    : undefined;

  /**
   * ====================================
   * Reusable UI
   * ====================================
   */
  const barSeries = series.map((seriesItem) => (
    <Bar
      key={seriesItem.id}
      dataKey={seriesItem.id}
      name={seriesItem.label}
      isAnimationActive={false}
      shape={(shapeProps) => {
        const barKey = `${seriesItem.id}-${shapeProps.index}`;

        return (
          <GroupedBarShape
            {...shapeProps}
            series={seriesItem}
            radius={barRadius}
            barKey={barKey}
            hovered={hoveredBar === barKey}
            onHover={setHoveredBar}
            showValues={showValues}
            barValueLabelFomatter={barValueLabelFomatter}
            barValueLabelProps={barValueLabelProps}
          />
        );
      }}
    />
  ));

  const YAxisComponent = (
    <YAxis
      // no need to data key since we have multiple bar charts. recharts will automatically infer the y ticks domain
      tickLine={false}
      interval={0}
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
        data={chartData}
      >
        {YAxisComponent}
        {barSeries}
      </BarChart>
    </ResponsiveContainer>
  );

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        barSize={barWidth}
        data={chartData}
        barGap={barGap}
        barCategoryGap={barCategoryGap}
        margin={{ top: 20, right: 0, bottom: 20, left: 0, ...chartMargins }}
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeDasharray="4 4"
        />

        <ReferenceLine y={0} stroke="var(--color-border)" />

        <XAxis
          dataKey="label"
          tickLine={false}
          interval={0}
          tickFormatter={formatXAxisTick}
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

        {!enableHorizontalScroll && YAxisComponent}
        {barSeries}
        {showTooltip && (
          <Tooltip
            shared={false}
            cursor={{
              fill: "transparent",
            }}
            isAnimationActive={false}
            animationDuration={0}
            content={({ payload }) => {
              const tooltipData = buildTooltipData(payload as any[]);

              if (!tooltipData) {
                return null;
              }

              if (customTooltipRenderer) {
                return customTooltipRenderer(tooltipData);
              }

              return <DefaultTooltip data={tooltipData} />;
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );

  /**
   * ====================================
   * Function
   * ====================================
   */
  function resolveSeriesColor(
    series: GroupedBarSeries | undefined,
    value: number,
  ) {
    if (!series) {
      return "var(--color-text-secondary)";
    }
    if (series.mode === GroupedBarSeriesMode.COMPARISON) {
      return value < 0 ? series.negativeColor : series.positiveColor;
    }

    return series.color;
  }

  const buildTooltipData = (payload: any[]): GroupedBarTooltipData | null => {
    if (!payload?.length) {
      return null;
    }
    const category = payload[0]?.payload?.label ?? "";
    const tooltipMeta = payload[0]?.payload;
    const hoveredBarId = payload[0]?.dataKey;

    const items = series.reduce((acc: GroupedBarTooltipItem[], seriesItem) => {
      const value = tooltipMeta?.[seriesItem.id];

      if (value == null) {
        return acc;
      }

      acc.push({
        id: seriesItem.id,
        label: seriesItem.label,
        value: Number(value),
        color: resolveSeriesColor(seriesItem, Number(value)),
      });

      return acc;
    }, []);

    return {
      category,
      items,
      tooltipMeta,
      hoveredBarId,
    };
  };

  /**
   * ====================================
   * Side Effects
   * ====================================
   */
  useEffect(() => {
    const element = chartHostRef.current;
    if (!element) return;
    const updateWidth = () => setChartWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
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
          <div className="flex shrink-0 w-full flex-wrap items-center justify-between gap-4">
            {typeof header === "string" ? (
              <Text variant="h4">{header}</Text>
            ) : (
              header
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

      {/* legends */}
      {showLegends && !isLoading && (
        <div className="flex justify-end flex-wrap gap-6">
          {series.map((seriesItem) =>
            seriesItem.mode === GroupedBarSeriesMode.COMPARISON ? (
              <ComparisonLegendItem
                key={seriesItem.id}
                label={seriesItem.label}
                positiveColor={
                  seriesItem.positiveColor ?? "var(--color-primary)"
                }
                negativeColor={seriesItem.negativeColor ?? "var(--color-error)"}
              />
            ) : (
              <LegendItem
                key={seriesItem.id}
                label={seriesItem.label}
                color={seriesItem.color ?? "var(--color-primary-tint)"}
              />
            ),
          )}
        </div>
      )}

      <WithFallback
        isLoading={isLoading}
        fallback={<GroupedBarChartSkeleton />}
      >
        {enableHorizontalScroll ? (
          <div
            className={cn(
              "flex h-105 w-full sm:h-115",
              isFullScreen && "min-h-115 grow",
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
            className={cn("h-105 w-full", isFullScreen && "min-h-115 grow")}
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

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem(props: LegendItemProps) {
  const { color, label } = props;
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-4 w-6 rounded"
        style={{
          backgroundColor: color,
        }}
      />

      <Text variant="14SB" className="text-text-primary!">
        {label}
      </Text>
    </div>
  );
}

interface ComparisonLegendItemProps {
  positiveColor: string;
  negativeColor: string;
  label: string;
}

function ComparisonLegendItem(props: ComparisonLegendItemProps) {
  const { positiveColor, negativeColor, label } = props;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-4 w-6 items-center justify-center rounded text-white"
        style={{
          backgroundColor: positiveColor,
        }}
      >
        <Icon name="plus" className="size-3" />
      </div>

      <div
        className="flex h-4 w-6 items-center justify-center rounded text-white"
        style={{
          backgroundColor: negativeColor,
        }}
      >
        <Icon name="minus" className="size-3" />
      </div>

      <Text variant="14SB" className="text-text-primary!">
        {label}
      </Text>
    </div>
  );
}

interface GroupedBarShapeProps extends BarShapeProps {
  series: GroupedBarSeries;
  hovered: boolean;
  radius: number;
  barKey: string;
  onHover: (key: string | null) => void;
  showValues?: boolean;
  barValueLabelFomatter: GroupedBarChartV2Props["barValueLabelFomatter"];
  barValueLabelProps: GroupedBarChartV2Props["barValueLabelProps"];
}
function GroupedBarShape({
  x,
  y,
  width,
  height,
  value,
  series,
  hovered,
  radius,
  barKey,
  onHover,
  showValues,
  barValueLabelFomatter = (v) => v.toString(),
  barValueLabelProps,
}: GroupedBarShapeProps) {
  const numericValue = Number(value);
  const isNegative = numericValue < 0;
  const fill = useMemo(() => {
    /**
     * Comparision
     */
    if (series.mode === GroupedBarSeriesMode.COMPARISON) {
      // for negative scenario
      if (isNegative) {
        if (hovered) {
          return series.negativeHoverColor ?? series.negativeColor;
        }
        return series.negativeColor;
      }

      // for positive scenarios
      if (hovered) {
        return series.positiveHoverColor ?? series.positiveColor;
      }
      return series.positiveColor;
    }

    /**
     * Normal
     */
    if (hovered) {
      return series.hoverColor ?? series.color;
    }
    return series.color;
  }, [series, hovered, isNegative]);

  // if value is slightly more than 0 then add min height of 1 px
  const normalizedHeight =
    value !== 0 ? Math.max(1, Math.abs(Number(height))) : 0;
  const normalizedY =
    Number(height) < 0 ? Number(y) + Number(height) : Number(y);
  const resolvedRadius = isNegative
    ? [0, 0, radius, radius]
    : [radius, radius, 0, 0];

  const labelY = isNegative
    ? normalizedY + normalizedHeight + 16 // below negative bar
    : normalizedY - 8; // above positive bar

  const hoverPadding = 8;
  return (
    <g>
      <Rectangle
        x={x}
        y={normalizedY}
        width={width}
        height={normalizedHeight}
        radius={resolvedRadius as any}
        fill={fill}
        onMouseEnter={() => onHover(barKey)}
        onMouseLeave={() => onHover(null)}
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
          {barValueLabelFomatter(numericValue)}
        </text>
      )}

      {/* <Rectangle
        x={x - hoverPadding}
        y={normalizedY - hoverPadding}
        width={width + hoverPadding * 2}
        height={normalizedHeight + hoverPadding * 2}
        fill="transparent"
        onMouseEnter={() => onHover(barKey)}
        onMouseLeave={() => onHover(null)}
      /> */}
    </g>
  );
}

type GroupedBarTooltipItem = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type GroupedBarTooltipData = {
  category: string;
  tooltipMeta?: any;
  items: GroupedBarTooltipItem[];
  hoveredBarId: string;
};

function DefaultTooltip({ data }: { data: GroupedBarTooltipData }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-lg">
      <Text variant="14SB">{data.category}</Text>

      <div className="mt-2 flex flex-col gap-2">
        {data.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: item.color,
                }}
              />

              <Text variant="14M">{item.label}</Text>
            </div>

            <Text variant="14SB">{item.value}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}
