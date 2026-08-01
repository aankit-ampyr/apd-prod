import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartsActionV2 } from "../../../../hooks";
import type { SelectInputItem } from "../../../../interface";
import {
  Icon,
  IconButton,
  SelectInput,
  Skeleton,
  Text,
} from "../../../../ui-kit";
import { cn } from "../../../../utils";
import { WithFallback } from "../../../SkelatonWrapper";
import { GroupedBarChartSkeleton } from "./GroupBarSkeleton";

type ChartId = string | number;

export type GroupedBarComparisonCategory = {
  id: ChartId;
  label: string;
};

export type GroupedBarComparisonFilter = {
  id: ChartId;
  label: string;
};

export type GroupedBarComparisonSeries = {
  id: string;
  label: string;
  color?: string;
  hoverColor?: string;
};

export type GroupedBarComparisonDataPoint = {
  categoryId: ChartId;
  filterId: ChartId;
  values: Record<string, number | undefined>;
  commentCounts?: Record<string, number>;
};

export type GroupedBarComparisonData = {
  categories: GroupedBarComparisonCategory[];
  series: GroupedBarComparisonSeries[];
  data: GroupedBarComparisonDataPoint[];
};

export type GroupedBarComparisonTooltipSeries = {
  color: string;
  value: number;
  label: string;
};

export type GroupedBarComparisonTooltipDetails = {
  baseLabel: string;
  categoryId: string;
  baseSeries: GroupedBarComparisonTooltipSeries | null;
  comparisonSeries: GroupedBarComparisonTooltipSeries | null;
  filterId: string;
};

export interface GroupedBarComparisonChartProps {
  header?: React.ReactNode;
  data: GroupedBarComparisonData;
  filters: GroupedBarComparisonFilter[];
  downloadFileName: string;
  className?: string;
  chartClassName?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  filterLabel?: string;
  defaultFilterId?: ChartId;
  emptyValue?: number;
  formatValue?: (value: number) => string;
  formatYAxisTick?: (value: string | number) => string;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  showBarValues?: boolean;
  tooltipInteractionMode?: "hover" | "item";
  customTooltipRenderer?: (
    props: GroupedBarComparisonTooltipDetails,
  ) => React.ReactNode;
  baseSeriesId?: string;
  comparisonSeriesId?: string;
  baseSeriesColor?: string;
  comparisonPositiveColor?: string;
  comparisonNegativeColor?: string;
  comparisonPositiveHoverColor?: string;
  comparisonNegativeHoverColor?: string;
  barGap?: number;
  barCategoryGap?: number | string;
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
  customActions?: React.ReactNode;
  onBadgeClick?: (
    categoryId: string,
    seriesId: string,
    filterId: string,
  ) => void;
}

const DEFAULT_SERIES_COLORS = ["#8376C9", "#F5A62A", "#1C7ED6", "#49A078"];
const DEFAULT_COMPARISON_POSITIVE_COLOR = "#1EC590";
const DEFAULT_COMPARISON_NEGATIVE_COLOR = "#D64545";

function formatCompactNumber(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  if (numericValue === 0) return "0";

  const absoluteValue = Math.abs(numericValue);
  if (absoluteValue >= 1000000) {
    return `${numericValue < 0 ? "-" : ""}${Math.round(absoluteValue / 1000000)}m`;
  }

  if (absoluteValue >= 1000) {
    return `${numericValue < 0 ? "-" : ""}${Math.round(absoluteValue / 1000)}k`;
  }

  return String(Math.round(numericValue));
}

function defaultFormatValue(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
}

function ComparisonTooltip(props: any) {
  const {
    baseLabel,
    baseSeries,
    comparisonSeries,
    formatValue = defaultFormatValue,
  } = props;
  const tooltipItems = [baseSeries, comparisonSeries].filter(Boolean);
  if (!tooltipItems.length) return null;

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-md">
      <Text variant="12SB" className="text-text-primary!">
        {baseLabel}
      </Text>
      <div className="mt-2 flex flex-col gap-1">
        {tooltipItems.map((item: any) => (
          <Text
            key={item.label}
            variant="12M"
            className="text-nowrap"
            style={{ color: item.color }}
          >
            {item.label}: {formatValue(Number(item.value ?? 0))}
          </Text>
        ))}
      </div>
    </div>
  );
}

function GroupedBarValueLabel(props: any) {
  const {
    x,
    y,
    width,
    height,
    value,
    formatter = formatCompactNumber,
    fontSize = 12,
    fontWeight = 700,
  } = props;
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return null;
  if (x == null || y == null || width == null || height == null) return null;

  const rawX = Number(x);
  const rawY = Number(y);
  const rawWidth = Number(width);
  const rawHeight = Number(height);
  const isNegative = numericValue < 0;
  const barTop = Math.min(rawY, rawY + rawHeight);
  const barBottom = Math.max(rawY, rawY + rawHeight);
  const textY = isNegative ? barBottom + 14 : barTop - 8;
  const dominantBaseline = isNegative ? "hanging" : "auto";
  if (numericValue === 0) {
    return null;
  }

  const formattedValue = isNegative
    ? `-${String(formatter(Math.abs(numericValue))).replace(/^-/, "")}`
    : formatter(numericValue);

  return (
    <text
      x={rawX + rawWidth / 2}
      y={textY}
      textAnchor="middle"
      dominantBaseline={dominantBaseline}
      fill="var(--color-text-primary)"
      fontFamily="Inter-Regular"
      fontSize={fontSize}
      fontWeight={fontWeight}
    >
      {formattedValue}
    </text>
  );
}

function CategoryTick(props: any) {
  const { x, y, payload } = props;
  const lines = String(payload?.value ?? "").split("\n");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        fill="var(--color-text-secondary)"
        fontFamily="Inter-Regular"
        fontSize={13}
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 14 : 20}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function GroupedBarComparisonChart(
  props: GroupedBarComparisonChartProps,
) {
  const {
    header,
    data,
    filters,
    downloadFileName,
    className,
    chartClassName,
    xAxisLabel = "Category",
    yAxisLabel = "Value",
    filterLabel = "Select",
    defaultFilterId,
    emptyValue = 0,
    formatValue = defaultFormatValue,
    formatYAxisTick = formatCompactNumber,
    isLoading = false,
    isFullScreenOverride = false,
    showBarValues = false,
    tooltipInteractionMode = "hover",
    barGap = 8,
    barCategoryGap = 24,
    xAxisLabelProps,
    yAxisLabelProps,
    customTooltipRenderer,
    baseSeriesId,
    comparisonSeriesId,
    baseSeriesColor,
    comparisonPositiveColor = DEFAULT_COMPARISON_POSITIVE_COLOR,
    comparisonNegativeColor = DEFAULT_COMPARISON_NEGATIVE_COLOR,
    comparisonPositiveHoverColor,
    comparisonNegativeHoverColor,
    customActions,
    onBadgeClick,
  } = props;

  /**
   * ================================
   * Hooks
   * ================================
   */
  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <GroupedBarComparisonChart {...props} isFullScreenOverride />
      ),
    });

  /**
   * ================================
   *  States
   * ================================
   */
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  /**
   * ================================
   * Direved States
   * ================================
   */

  const filterOptions = useMemo<SelectInputItem[]>(
    () => filters.map((item) => ({ id: item.id, label: item.label })),
    [filters],
  );

  const [selectedFilterId, setSelectedFilterId] = useState<ChartId | null>(
    defaultFilterId ?? filters[0]?.id ?? null,
  );

  const chartData = useMemo(
    () =>
      data.categories.map((category) => {
        const point = data.data.find(
          (item) =>
            item.categoryId === category.id &&
            item.filterId === selectedFilterId,
        );

        return data.series.reduce<Record<string, any>>(
          (row, series) => ({
            ...row,
            [series.id]: point?.values?.[series.id] ?? emptyValue,
          }),
          {
            label: category.label,
            categoryId: category.id,
            commentCounts: point?.commentCounts,
          },
        );
      }),
    [data, emptyValue, selectedFilterId],
  );

  useEffect(() => {
    const element = chartHostRef.current;
    if (!element) return;

    const updateWidth = () => setChartWidth(element.clientWidth);
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const resolvedBarMaxSize = useMemo(() => {
    const categoryCount = Math.max(1, chartData.length);
    const seriesCount = Math.max(1, data.series.length);
    const fallbackWidth = 960;
    const availableWidth = chartWidth > 0 ? chartWidth : fallbackWidth;
    const estimatedInnerWidth = Math.max(0, availableWidth - 28 - 24 - 70 - 8);
    const categoryWidth = estimatedInnerWidth / categoryCount;
    const interBarGap = Math.max(0, (seriesCount - 1) * barGap);
    const idealBarSize = (categoryWidth - interBarGap - 8) / seriesCount;

    return Math.max(16, Math.min(64, Math.floor(idealBarSize)));
  }, [barGap, chartData.length, chartWidth, data.series.length]);

  const resolvedXAxisLabelProps = {
    position: "insideBottom" as const,
    offset: -32,
    angle: 0,
    ...xAxisLabelProps,
  };

  const resolvedYAxisLabelProps = {
    position: "insideLeft" as const,
    offset: -14,
    angle: -90,
    ...yAxisLabelProps,
  };

  const isFullScreen = isFullScreenOverride;
  const resolvedBaseSeriesId = baseSeriesId ?? data.series[0]?.id;
  const resolvedComparisonSeriesId = comparisonSeriesId ?? data.series[1]?.id;

  function getSeriesColor(series: GroupedBarComparisonSeries, index: number) {
    if (series.id === resolvedBaseSeriesId) {
      return (
        baseSeriesColor ??
        series.color ??
        DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]
      );
    }

    return (
      series.color ??
      DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length]
    );
  }

  function getBarColor(
    series: GroupedBarComparisonSeries,
    index: number,
    value: number,
    isHovered: boolean,
  ) {
    if (series.id === resolvedComparisonSeriesId) {
      const isPositive = value >= 0;
      if (isHovered) {
        return isPositive
          ? (comparisonPositiveHoverColor ?? comparisonPositiveColor)
          : (comparisonNegativeHoverColor ?? comparisonNegativeColor);
      }

      return isPositive ? comparisonPositiveColor : comparisonNegativeColor;
    }

    const defaultColor = getSeriesColor(series, index);
    return isHovered ? (series.hoverColor ?? defaultColor) : defaultColor;
  }

  function buildRoundedBarPath(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      return "";
    }

    const safeRadius = Math.max(
      0,
      Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2),
    );

    if (safeRadius === 0) {
      return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
    }

    const isNegative = height < 0;
    const barHeight = Math.abs(height);

    if (isNegative) {
      const top = y + height;
      const bottom = y;

      return [
        `M ${x} ${top}`,
        `H ${x + width}`,
        `V ${bottom - safeRadius}`,
        `Q ${x + width} ${bottom} ${x + width - safeRadius} ${bottom}`,
        `H ${x + safeRadius}`,
        `Q ${x} ${bottom} ${x} ${bottom - safeRadius}`,
        `V ${top}`,
        "Z",
      ].join(" ");
    }

    const top = y;
    const bottom = y + barHeight;

    return [
      `M ${x} ${bottom}`,
      `V ${top + safeRadius}`,
      `Q ${x} ${top} ${x + safeRadius} ${top}`,
      `H ${x + width - safeRadius}`,
      `Q ${x + width} ${top} ${x + width} ${top + safeRadius}`,
      `V ${bottom}`,
      "Z",
    ].join(" ");
  }

  /**
   * Calculate yDomain and yTicks
   */
  const { yDomain, yTicks } = useMemo(() => {
    const values = chartData.flatMap((item) =>
      data.series.map((series) => Number(item[series.id] ?? 0)),
    );

    const finiteValues = values.filter((v) => Number.isFinite(v));
    if (!finiteValues.length)
      return { yDomain: [0, 1000] as [number, number], yTicks: [0, 1000] };

    const minValue = Math.min(...finiteValues);
    const maxValue = Math.max(...finiteValues);

    const rawRange = maxValue * 1.15 - (minValue < 0 ? minValue * 1.05 : 0);

    // Target ~5-6 ticks, pick a clean step
    const rawStep = rawRange / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;

    const minTick =
      Math.floor((minValue < 0 ? minValue * 1.05 : 0) / step) * step;
    const maxTick = Math.ceil((maxValue * 1.15) / step) * step;

    const ticks: number[] = [];
    for (
      let current = minTick;
      current <= maxTick + step / 1000;
      current += step
    ) {
      ticks.push(Math.round(current));
    }

    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }

    return {
      yDomain: [minTick, maxTick] as [number, number],
      yTicks: ticks,
    };
  }, [chartData, data.series]);

  const maxChartMagnitude = useMemo(() => {
    const values = chartData.flatMap((item) =>
      data.series.map((series) => Number(item[series.id] ?? 0)),
    );
    const finiteValues = values.filter((value) => Number.isFinite(value));
    if (!finiteValues.length) return 0;
    return Math.max(...finiteValues.map((value) => Math.abs(value)));
  }, [chartData, data.series]);

  const minVisibleBarRatio = 0.00005;
  const minVisibleBarSize = 2;

  function resolveBarGeometry(
    value: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (!Number.isFinite(value) || !Number.isFinite(height)) {
      return null;
    }

    const magnitude = Math.abs(value);
    if (magnitude <= 0 || maxChartMagnitude <= 0) {
      return { x, y, width, height };
    }

    if (magnitude / maxChartMagnitude < minVisibleBarRatio) {
      return null;
    }

    const direction = height < 0 ? -1 : 1;
    const visibleHeight = Math.max(Math.abs(height), minVisibleBarSize);
    const nextHeight = direction * visibleHeight;
    const nextY = height < 0 ? y : y + (height - visibleHeight);

    return {
      x,
      y: nextY,
      width,
      height: nextHeight,
    };
  }

  function buildTooltipSeries(
    seriesId: string | undefined,
    tooltipPayload: any[],
  ): GroupedBarComparisonTooltipSeries | null {
    if (!seriesId) return null;

    const seriesIndex = data.series.findIndex(
      (series) => series.id === seriesId,
    );
    if (seriesIndex < 0) return null;

    const series = data.series[seriesIndex];
    const payloadItem = tooltipPayload.find(
      (item) => String(item?.dataKey) === series.id,
    );
    const row = payloadItem?.payload ?? tooltipPayload[0]?.payload;
    const value = Number(row?.[series.id] ?? payloadItem?.value ?? 0);

    return {
      color: getBarColor(series, seriesIndex, value, false),
      value,
      label: series.label,
    };
  }

  function renderTooltip(rawTooltipProps: any) {
    if (!rawTooltipProps?.active) return null;

    const tooltipPayload = rawTooltipProps.payload ?? [];
    const details: GroupedBarComparisonTooltipDetails = {
      baseLabel: String(
        rawTooltipProps.label ?? tooltipPayload[0]?.payload?.label ?? "",
      ),
      categoryId: String(tooltipPayload[0]?.payload?.categoryId ?? ""),
      baseSeries: buildTooltipSeries(resolvedBaseSeriesId, tooltipPayload),
      comparisonSeries: buildTooltipSeries(
        resolvedComparisonSeriesId,
        tooltipPayload,
      ),
      filterId: String(selectedFilterId),
    };

    if (customTooltipRenderer) {
      return customTooltipRenderer(details);
    }

    return <ComparisonTooltip {...details} formatValue={formatValue} />;
  }

  /**
   * ================================
   * Side Effects
   * ================================
   */
  useEffect(() => {
    if (!filters.length) {
      setSelectedFilterId(null);
      return;
    }

    if (
      selectedFilterId == null ||
      !filters.some((item) => item.id === selectedFilterId)
    ) {
      setSelectedFilterId(defaultFilterId ?? filters[0].id);
    }
  }, [defaultFilterId, filters, selectedFilterId]);

  const [hoverTooltip, setHoverTooltip] = useState<{
    left: number;
    top: number;
    payload: any[];
  } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showComparisonTooltip = (
    event: React.MouseEvent<SVGPathElement>,
    payload: any[],
  ) => {
    if (tooltipInteractionMode !== "item") return;
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }
    // Use chartHostRef (the relative div containing the chart and tooltip overlay)
    // This stays correct even when the chart is scrolled horizontally
    const containerRect = chartHostRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();
    if (!containerRect || !targetRect) return;
    setHoverTooltip({
      left: targetRect.left - containerRect.left + targetRect.width / 2,
      top: targetRect.top - containerRect.top - 8,
      payload,
    });
  };

  const hideComparisonTooltip = () => {
    if (tooltipInteractionMode !== "item") return;
    if (onBadgeClick) {
      tooltipTimeout.current = setTimeout(() => {
        setHoverTooltip(null);
      }, 300);
    } else {
      setHoverTooltip(null);
    }
  };

  return (
    <div
      ref={chartRef}
      className={cn(
        "rounded-xl border border-border bg-white p-5 sm:p-6 relative flex flex-col gap-8",
        isFullScreen && "grow",
        className,
      )}
    >
      <div className="flex items-start flex-nowrap justify-between gap-4">
        {header}

        {!isLoading && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-3 chart-actions">
              {customActions}
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

      {!isLoading && (
        <div className="flex gap-8 pr-6">
          <div className="flex mr-auto items-center gap-3">
            <Text variant="16R" className="text-text-primary! text-nowrap">
              {filterLabel} :
            </Text>
            <SelectInput
              value={selectedFilterId}
              options={filterOptions}
              onChange={(item) => setSelectedFilterId(item.id)}
              wrapperClassName="min-w-52 border-primary-tint-1!"
              // buttonClassName="debug"
              usePortal
            />
          </div>
          {data.series.map((series, index) =>
            series.id === resolvedComparisonSeriesId ? (
              <ComparisonLegendItem
                key={series.id}
                positiveColor={comparisonPositiveColor}
                negativeColor={comparisonNegativeColor}
                label={series.label}
              />
            ) : (
              <LegendItem
                key={series.id}
                color={getSeriesColor(series, index)}
                label={series.label}
              />
            ),
          )}
        </div>
      )}
      <WithFallback
        isLoading={isLoading}
        fallback={<GroupedBarChartSkeleton />}
      >
        <div
          ref={chartHostRef}
          className={cn("h-105 w-full relative", chartClassName)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 18, right: 24, bottom: 48, left: 28 }}
              barGap={barGap}
              barCategoryGap={barCategoryGap}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                interval={0}
                tick={<CategoryTick />}
              >
                <Label
                  value={xAxisLabel}
                  position={resolvedXAxisLabelProps.position}
                  offset={resolvedXAxisLabelProps.offset}
                  angle={resolvedXAxisLabelProps.angle}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 14,
                    fontWeight: 500,
                    textAnchor: "middle",
                    fontFamily: "Inter-Medium",
                  }}
                />
              </XAxis>
              <YAxis
                width={70}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                ticks={yTicks}
                domain={yDomain}
                padding={{ top: 0, bottom: 0 }}
                tickFormatter={formatYAxisTick}
                tick={{
                  fill: "var(--color-text-secondary)",
                  fontSize: 13,
                  fontFamily: "Inter-Regular",
                }}
              >
                <Label
                  value={yAxisLabel}
                  angle={resolvedYAxisLabelProps.angle}
                  position={resolvedYAxisLabelProps.position}
                  offset={resolvedYAxisLabelProps.offset}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 14,
                    fontWeight: 500,
                    textAnchor: "middle",
                    fontFamily: "Inter-Medium",
                  }}
                />
              </YAxis>
              {tooltipInteractionMode === "hover" && (
                <Tooltip
                  animationDuration={0}
                  content={renderTooltip as any}
                  shared={false}
                  cursor={{ fill: "transparent" }}
                  wrapperStyle={{ outline: "none", pointerEvents: "none" }}
                />
              )}
              {data.series.map((series, index) => {
                return (
                  <Bar
                    key={series.id}
                    dataKey={series.id}
                    name={series.label}
                    fill={getSeriesColor(series, index)}
                    maxBarSize={resolvedBarMaxSize}
                    isAnimationActive={false}
                    shape={(shapeProps: any) => {
                      const {
                        x,
                        y,
                        width,
                        height,
                        value,
                        index: barIndex,
                      } = shapeProps;
                      const barKey = `${series.id}-${barIndex}`;
                      const isHovered = hoveredBar === barKey;
                      const numericX = Number(x);
                      const numericY = Number(y);
                      const numericWidth = Number(width);
                      const numericValue = Number(
                        value ?? shapeProps?.payload?.[series.id] ?? 0,
                      );
                      const resolvedGeometry = resolveBarGeometry(
                        numericValue,
                        numericX,
                        numericY,
                        numericWidth,
                        Number(height),
                      );

                      if (!resolvedGeometry) {
                        return <g />;
                      }

                      const path = buildRoundedBarPath(
                        resolvedGeometry.x,
                        resolvedGeometry.y,
                        resolvedGeometry.width,
                        resolvedGeometry.height,
                        3,
                      );

                      if (!path) return <g />;

                      const barColor = getBarColor(
                        series,
                        index,
                        numericValue,
                        isHovered,
                      );

                      const categoryId = shapeProps?.payload?.categoryId;
                      const commentCount =
                        shapeProps?.payload?.commentCounts?.[series.id];
                      const categoryCommentCount =
                        shapeProps?.payload?.commentCounts?._category;

                      const baseValue = baseSeriesId
                        ? Number(shapeProps?.payload?.[baseSeriesId] ?? 0)
                        : 0;
                      const compValue = comparisonSeriesId
                        ? Number(shapeProps?.payload?.[comparisonSeriesId] ?? 0)
                        : 0;
                      const highestSeriesId =
                        compValue > baseValue
                          ? comparisonSeriesId
                          : baseSeriesId;

                      const showCategoryBadge =
                        categoryCommentCount &&
                        categoryCommentCount > 0 &&
                        series.id === highestSeriesId;
                      const displayCommentCount = showCategoryBadge
                        ? categoryCommentCount
                        : commentCount;
                      const hasBadge =
                        (commentCount && commentCount > 0) || showCategoryBadge;

                      const badgeXOffset = showCategoryBadge
                        ? series.id === baseSeriesId
                          ? numericWidth + barGap / 2
                          : -barGap / 2
                        : numericWidth / 2;

                      // Build payload for tooltip
                      const tooltipPayload = [
                        {
                          dataKey: series.id,
                          payload: shapeProps.payload,
                          value: numericValue,
                          name: series.label,
                        },
                      ];

                      return (
                        <g>
                          <path
                            d={path}
                            fill={barColor}
                            onMouseEnter={(e) => {
                              setHoveredBar(barKey);
                              showComparisonTooltip(e, tooltipPayload);
                            }}
                            onMouseLeave={() => {
                              setHoveredBar(null);
                              hideComparisonTooltip();
                            }}
                            style={{
                              cursor: "pointer",
                              transition: "fill 0.15s ease",
                            }}
                          />
                          {hasBadge ? (
                            <g
                              transform={`translate(${numericX + badgeXOffset}, ${numericY - (showBarValues ? 44 : 20)})`}
                              className={cn("pointer-events-none", {
                                "cursor-pointer pointer-events-auto":
                                  !!onBadgeClick,
                              })}
                              onClick={(e) => {
                                if (onBadgeClick && categoryId) {
                                  e.stopPropagation();
                                  onBadgeClick(
                                    String(categoryId),
                                    String(series.id),
                                    String(selectedFilterId),
                                  );
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
                                    {displayCommentCount > 99
                                      ? "99+"
                                      : displayCommentCount}
                                  </span>
                                </div>
                              </foreignObject>
                            </g>
                          ) : null}
                        </g>
                      );
                    }}
                  >
                    {showBarValues ? (
                      <LabelList
                        dataKey={series.id}
                        content={(labelProps: any) => (
                          <GroupedBarValueLabel
                            {...labelProps}
                            formatter={formatValue}
                          />
                        )}
                      />
                    ) : null}
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>

          {tooltipInteractionMode === "item" && hoverTooltip && (
            <div
              className="absolute z-50"
              style={{
                left: hoverTooltip.left,
                top: hoverTooltip.top,
                transform: "translate(-50%, -100%)",
                pointerEvents: onBadgeClick ? "auto" : "none",
              }}
              onMouseEnter={() => {
                if (tooltipTimeout.current) {
                  clearTimeout(tooltipTimeout.current);
                  tooltipTimeout.current = null;
                }
              }}
              onMouseLeave={() => {
                setHoverTooltip(null);
              }}
            >
              {renderTooltip({
                active: true,
                payload: hoverTooltip.payload,
                label: hoverTooltip.payload[0]?.payload?.label,
              })}
            </div>
          )}
        </div>
      </WithFallback>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-6 rounded" style={{ backgroundColor: color }} />
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

function ComparisonLegendItem({
  positiveColor,
  negativeColor,
  label,
}: ComparisonLegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-4 w-6 items-center justify-center rounded text-base font-bold leading-none text-white"
        style={{ backgroundColor: positiveColor }}
      >
        <Icon name="plus" className="size-3" />
      </div>
      <span
        className="flex h-4 w-6 items-center justify-center rounded text-base font-bold leading-none text-white"
        style={{ backgroundColor: negativeColor }}
      >
        <Icon name="minus" className="size-3" />
      </span>
      <Text variant="14SB" className="text-text-primary!">
        {label}
      </Text>
    </div>
  );
}

export type RevenueStreamComparisonStream = GroupedBarComparisonCategory;
export type RevenueStreamComparisonMonth = GroupedBarComparisonFilter & {
  month: number;
  year: number;
};
export type RevenueStreamComparisonDataPoint = {
  stream_id: ChartId;
  iarProjection: number;
  actual: number;
  month: number;
  year: number;
};
export type RevenueStreamComparisonData = {
  streams: RevenueStreamComparisonStream[];
  data: RevenueStreamComparisonDataPoint[];
};
export interface RevenueStreamComparisonChartProps {
  header?: React.ReactNode;
  data: RevenueStreamComparisonData;
  availableMonths: RevenueStreamComparisonMonth[];
  downloadFileName: string;
  className?: string;
  chartClassName?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  iarLabel?: string;
  actualLabel?: string;
  iarColor?: string;
  actualColor?: string;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  showBarValues?: boolean;
  tooltipInteractionMode?: "hover" | "item";
}

export function RevenueStreamComparisonChart({
  data,
  availableMonths,
  iarLabel = "IAR Projection (£)",
  actualLabel = "Actual (£)",
  iarColor = DEFAULT_SERIES_COLORS[0],
  actualColor = DEFAULT_SERIES_COLORS[1],
  ...props
}: RevenueStreamComparisonChartProps) {
  const comparisonData: GroupedBarComparisonData = {
    categories: data.streams,
    series: [
      {
        id: "iarProjection",
        label: iarLabel,
        color: iarColor,
      },
      {
        id: "actual",
        label: actualLabel,
        color: actualColor,
      },
    ],
    data: data.data.map((item) => ({
      categoryId: item.stream_id,
      filterId: `${item.year}-${item.month}`,
      values: {
        iarProjection: item.iarProjection,
        actual: item.actual,
      },
    })),
  };

  return (
    <GroupedBarComparisonChart
      {...props}
      data={comparisonData}
      filters={availableMonths.map((item) => ({
        id: item.id,
        label: item.label,
      }))}
      filterLabel="Select month"
    />
  );
}
