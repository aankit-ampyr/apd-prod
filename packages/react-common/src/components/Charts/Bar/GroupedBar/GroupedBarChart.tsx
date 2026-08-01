import { useEffect, useMemo, useRef, useState } from "react";
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
import { IconButton, SelectInput, Skeleton, Text, Icon } from "../../../../ui-kit";
import { cn } from "../../../../utils";
import { WithFallback } from "../../../SkelatonWrapper";

type ChartId = string | number;

export type GroupedBarChartCategory = {
  id: ChartId;
  label: string;
};

export type GroupedBarChartSeries = {
  id: string;
  label: string;
  color: string;
  hoverColor?: string;
};

export type GroupedBarChartFilter = {
  id: ChartId;
  label: string;
};

export type GroupedBarChartDataPoint = {
  categoryId: ChartId;
  filterId?: ChartId;
  values: Record<string, number | undefined>;
  commentCounts?: Record<string, number>;
};

export type GroupedBarChartData = {
  categories: GroupedBarChartCategory[];
  series: GroupedBarChartSeries[];
  data: GroupedBarChartDataPoint[];
};

export type GroupedBarChartTooltipItem = {
  seriesId: string;
  label: string;
  color: string;
  value: number;
};

export type GroupedBarChartTooltipDetails = {
  categoryId?: ChartId;
  categoryLabel: string;
  activeSeries: GroupedBarChartTooltipItem | null;
  items: GroupedBarChartTooltipItem[];
};

export type GroupedBarChartLegendRendererProps = {
  series: GroupedBarChartSeries[];
};

export interface GroupedBarChartProps {
  header?: React.ReactNode;
  data: GroupedBarChartData;
  downloadFileName: string;
  filters?: GroupedBarChartFilter[];
  className?: string;
  chartClassName?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  filterLabel?: string;
  showFilter?: boolean;
  defaultFilterId?: ChartId;
  emptyValue?: number;
  formatValue?: (value: number) => string;
  formatYAxisTick?: (value: string | number) => string;
  customActions?: React.ReactNode;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  showBarValues?: boolean;
  tooltipMode?: "bar" | "group";
  renderTooltip?: (details: GroupedBarChartTooltipDetails) => React.ReactNode;
  showLegend?: boolean;
  legendClassName?: string;
  legendItemClassName?: string;
  renderLegend?: (props: GroupedBarChartLegendRendererProps) => React.ReactNode;
  barGap?: number;
  barCategoryGap?: number | string;
  maxBarSize?: number;
  enableHorizontalScroll?: boolean;
  minCategoryWidth?: number;
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
  onBadgeClick?: (categoryId: ChartId, seriesId: string) => void;
}

const EMPTY_FILTERS: GroupedBarChartFilter[] = [];

function hasOwnValue(
  values: Record<string, unknown> | undefined,
  key: string,
) {
  return Object.prototype.hasOwnProperty.call(values ?? {}, key);
}

function defaultFormatValue(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
}

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

function HourTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={14}
        textAnchor="middle"
        fill="var(--color-text-secondary)"
        fontFamily="Inter-Regular"
        fontSize={13}
      >
        {payload?.value}
      </text>
    </g>
  );
}

function ValueLabel({ x, y, width, height, value, formatter }: any) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) return null;
  if (x == null || y == null || width == null || height == null) return null;

  const rawY = Number(y);
  const rawHeight = Number(height);
  const isNegative = numericValue < 0;
  const top = Math.min(rawY, rawY + rawHeight);
  const bottom = Math.max(rawY, rawY + rawHeight);

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={isNegative ? bottom + 14 : top - 8}
      textAnchor="middle"
      dominantBaseline={isNegative ? "hanging" : "auto"}
      fill="var(--color-text-primary)"
      fontFamily="Inter-Regular"
      fontSize={12}
      fontWeight={700}
    >
      {formatter(numericValue)}
    </text>
  );
}

function DefaultTooltip({
  details,
  tooltipMode,
  formatValue,
}: {
  details: GroupedBarChartTooltipDetails;
  tooltipMode: "bar" | "group";
  formatValue: (value: number) => string;
}) {
  const items =
    tooltipMode === "bar"
      ? [details.activeSeries].filter(Boolean)
      : details.items;

  if (!items.length) return null;

  return (
    <div className="w-[192px] rounded-md border border-border bg-white px-4 py-3 shadow-md">
      <Text variant="12SB" className="text-text-primary!">
        {details.categoryLabel}
      </Text>
      <div className="mt-2 flex flex-col gap-1">
        {items.map((item: any) => (
          <Text
            key={item.seriesId}
            variant="12M"
            className="text-nowrap text-text-secondary!"
          >
            {item.label}:{" "}
            <span style={{ color: item.color }} className="font-InterBold">
              {formatValue(item.value)}
            </span>
          </Text>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart(props: GroupedBarChartProps) {
  const {
    header,
    data,
    downloadFileName,
    filters,
    className,
    chartClassName,
    xAxisLabel = "Category",
    yAxisLabel = "Value",
    filterLabel = "Select",
    showFilter = false,
    defaultFilterId,
    emptyValue = 0,
    formatValue = defaultFormatValue,
    formatYAxisTick = (v) => v,
    isLoading = false,
    isFullScreenOverride = false,
    customActions,
    showBarValues = false,
    tooltipMode = "bar",
    renderTooltip,
    showLegend = true,
    legendClassName,
    legendItemClassName,
    renderLegend,
    barGap = 8,
    barCategoryGap = 24,
    maxBarSize = 64,
    enableHorizontalScroll = false,
    minCategoryWidth = 72,
    xAxisLabelProps,
    yAxisLabelProps,
    onBadgeClick,
  } = props;

  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <GroupedBarChart {...props} isFullScreenOverride />
      ),
    });

  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [chartHeight, setChartHeight] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredTooltipDetails, setHoveredTooltipDetails] =
    useState<GroupedBarChartTooltipDetails | null>(null);
  const [hoveredTooltipPosition, setHoveredTooltipPosition] = useState<{
    left: number;
    top: number;
    inside: boolean;
    shiftX: number;
  } | null>(null);
  const resolvedFilters = filters ?? EMPTY_FILTERS;
  const shouldShowFilter = showFilter && resolvedFilters.length > 0;
  const [selectedFilterId, setSelectedFilterId] = useState<ChartId | null>(
    defaultFilterId ?? resolvedFilters[0]?.id ?? null,
  );

  const filterOptions = useMemo<SelectInputItem[]>(
    () =>
      resolvedFilters.map((filter) => ({ id: filter.id, label: filter.label })),
    [resolvedFilters],
  );

  const categoryByLabel = useMemo(() => {
    return new Map(
      data.categories.map((category) => [category.label, category]),
    );
  }, [data.categories]);

  const chartRows = useMemo(() => {
    return data.categories.map((category) => {
      const point = data.data.find((item) => {
        if (item.categoryId !== category.id) return false;
        if (!shouldShowFilter) return true;
        return item.filterId === selectedFilterId;
      });

      return data.series.reduce<Record<string, any>>(
        (row, series) => {
          if (!hasOwnValue(point?.values, series.id)) return row;

          return {
            ...row,
            [series.id]: point?.values?.[series.id] ?? emptyValue,
            commentCounts: point?.commentCounts,
            categoryId: category.id,
          };
        },
        { label: category.label },
      );
    });
  }, [data, emptyValue, selectedFilterId, shouldShowFilter]);

  const activeSeriesByCategoryLabel = useMemo(() => {
    return new Map(
      data.categories.map((category) => {
        const point = data.data.find((item) => {
          if (item.categoryId !== category.id) return false;
          if (!shouldShowFilter) return true;
          return item.filterId === selectedFilterId;
        });

        return [
          category.label,
          data.series
            .map((series) => series.id)
            .filter((seriesId) => hasOwnValue(point?.values, seriesId)),
        ] as const;
      }),
    );
  }, [data, selectedFilterId, shouldShowFilter]);

  useEffect(() => {
    const element = chartHostRef.current;
    if (!element) return;

    const updateSize = () => {
      setChartWidth(element.clientWidth);
      setChartHeight(element.clientHeight);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    setHoveredBar(null);
    setHoveredTooltipDetails(null);
    setHoveredTooltipPosition(null);
  }, [data, selectedFilterId, tooltipMode]);

  useEffect(() => {
    if (!shouldShowFilter) {
      setSelectedFilterId(null);
      return;
    }

    if (
      selectedFilterId == null ||
      !resolvedFilters.some((filter) => filter.id === selectedFilterId)
    ) {
      setSelectedFilterId(defaultFilterId ?? resolvedFilters[0].id);
    }
  }, [defaultFilterId, resolvedFilters, selectedFilterId, shouldShowFilter]);

  const scrollWidth = data.categories.length * minCategoryWidth;
  const renderedChartWidth = enableHorizontalScroll
    ? Math.max(chartWidth, scrollWidth)
    : undefined;

  const resolvedBarSize = useMemo(() => {
    const categoryCount = Math.max(1, data.categories.length);
    const seriesCount = Math.max(1, data.series.length);
    const availableWidth = enableHorizontalScroll
      ? Math.max(chartWidth, scrollWidth)
      : chartWidth || 960;
    const innerWidth = Math.max(0, availableWidth - 130);
    const categoryWidth = innerWidth / categoryCount;
    const totalGap = Math.max(0, (seriesCount - 1) * barGap);
    const idealSize = (categoryWidth - totalGap - 8) / seriesCount;

    return Math.max(8, Math.min(maxBarSize, Math.floor(idealSize)));
  }, [
    barGap,
    chartWidth,
    data.categories.length,
    data.series.length,
    enableHorizontalScroll,
    maxBarSize,
    scrollWidth,
  ]);

  const { yDomain, yTicks } = useMemo(() => {
    const values = chartRows.flatMap((row) =>
      data.series.map((series) => Number(row[series.id] ?? 0)),
    );
    const finiteValues = values.filter(Number.isFinite);

    if (!finiteValues.length) {
      return { yDomain: [0, 1000] as [number, number], yTicks: [0, 1000] };
    }

    const minValue = Math.min(...finiteValues);
    const maxValue = Math.max(...finiteValues);
    const lowerBase = minValue < 0 ? minValue * 1.05 : 0;
    const upperBase = maxValue === 0 ? 1 : maxValue * 1.15;
    const rawStep = Math.max((upperBase - lowerBase) / 5, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    const minTick = Math.floor(lowerBase / step) * step;
    const maxTick = Math.ceil(upperBase / step) * step;
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

    return { yDomain: [minTick, maxTick] as [number, number], yTicks: ticks };
  }, [chartRows, data.series]);

  const maxMagnitude = useMemo(() => {
    const values = chartRows.flatMap((row) =>
      data.series.map((series) => Math.abs(Number(row[series.id] ?? 0))),
    );
    return Math.max(0, ...values.filter(Number.isFinite));
  }, [chartRows, data.series]);

  const xLabelProps = {
    position: "insideBottom" as const,
    offset: -32,
    angle: 0,
    ...xAxisLabelProps,
  };
  const yLabelProps = {
    position: "insideLeft" as const,
    offset: -14,
    angle: -90,
    ...yAxisLabelProps,
  };

  function buildBarPath(x: number, y: number, width: number, height: number) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      return "";
    }

    const radius = Math.min(3, Math.abs(width) / 2, Math.abs(height) / 2);
    if (radius === 0) return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;

    if (height < 0) {
      const top = y + height;
      const bottom = y;
      return [
        `M ${x} ${top}`,
        `H ${x + width}`,
        `V ${bottom - radius}`,
        `Q ${x + width} ${bottom} ${x + width - radius} ${bottom}`,
        `H ${x + radius}`,
        `Q ${x} ${bottom} ${x} ${bottom - radius}`,
        `V ${top}`,
        "Z",
      ].join(" ");
    }

    const bottom = y + height;
    return [
      `M ${x} ${bottom}`,
      `V ${y + radius}`,
      `Q ${x} ${y} ${x + radius} ${y}`,
      `H ${x + width - radius}`,
      `Q ${x + width} ${y} ${x + width} ${y + radius}`,
      `V ${bottom}`,
      "Z",
    ].join(" ");
  }

  function normalizeGeometry(
    value: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (!Number.isFinite(value) || !Number.isFinite(height)) return null;
    if (value === 0 || maxMagnitude === 0) return { x, y, width, height };
    if (Math.abs(value) / maxMagnitude < 0.00005) return null;

    const direction = height < 0 ? -1 : 1;
    const visibleHeight = Math.max(Math.abs(height), 2);
    return {
      x,
      y: height < 0 ? y : y + height - visibleHeight,
      width,
      height: direction * visibleHeight,
    };
  }

  function buildTooltipDetailsFromRow(
    row: Record<string, string | number>,
    activeSeriesId?: string,
  ): GroupedBarChartTooltipDetails {
    const categoryLabel = String(row.label ?? "");
    const category = categoryByLabel.get(categoryLabel);
    const items = data.series.flatMap((series) => {
      if (!hasOwnValue(row, series.id)) return [];

      const value = Number(row[series.id] ?? 0);

      return [
        {
          seriesId: series.id,
          label: series.label,
          color: series.color,
          value: Number.isFinite(value) ? value : 0,
        },
      ];
    });

    return {
      categoryId: category?.id,
      categoryLabel,
      activeSeries:
        items.find((item) => item.seriesId === activeSeriesId) ?? null,
      items,
    };
  }

  function getCompactedBarGeometry(seriesId: string, shapeProps: any) {
    const categoryLabel = String(shapeProps.payload?.label ?? "");
    const activeSeriesIds =
      activeSeriesByCategoryLabel.get(categoryLabel) ?? [];
    const activeIndex = activeSeriesIds.indexOf(seriesId);

    if (activeIndex === -1) return null;

    const x = Number(shapeProps.x);
    const y = Number(shapeProps.y);
    const width = Number(shapeProps.width);
    const height = Number(shapeProps.height);
    const seriesIndex = data.series.findIndex((item) => item.id === seriesId);

    if (seriesIndex === -1 || !Number.isFinite(x) || !Number.isFinite(width)) {
      return { x, y, width, height };
    }

    const seriesCount = Math.max(1, data.series.length);
    const activeCount = Math.max(1, activeSeriesIds.length);
    const originalGroupWidth =
      seriesCount * width + Math.max(0, seriesCount - 1) * barGap;
    const originalGroupX = x - seriesIndex * (width + barGap);
    const compactBarWidth = Math.max(
      8,
      Math.min(
        maxBarSize,
        (originalGroupWidth - Math.max(0, activeCount - 1) * barGap) /
          activeCount,
      ),
    );
    const compactGroupWidth =
      activeCount * compactBarWidth + Math.max(0, activeCount - 1) * barGap;

    return {
      x:
        originalGroupX +
        (originalGroupWidth - compactGroupWidth) / 2 +
        activeIndex * (compactBarWidth + barGap),
      y,
      width: compactBarWidth,
      height,
    };
  }

  function getTooltipDetails(
    payload: any,
    activeSeriesId?: string,
  ): GroupedBarChartTooltipDetails {
    const categoryLabel = String(payload?.label ?? "");
    const category = categoryByLabel.get(categoryLabel);

    const items = data.series.flatMap((series) => {
      const value = Number(payload?.[series.id] ?? 0);
      if (!Number.isFinite(value)) return [];

      return [
        {
          seriesId: series.id,
          label: series.label,
          color: series.color,
          value,
        },
      ];
    });

    return {
      categoryId: category?.id,
      categoryLabel,
      activeSeries:
        items.find((item) => item.seriesId === activeSeriesId) ?? null,
      items,
    };
  }

  function renderTooltipContent(rawTooltipProps: any) {
    if (!rawTooltipProps?.active) return null;

    const details = getTooltipDetails(
      rawTooltipProps.payload[0]?.payload,
      rawTooltipProps.payload[0]?.dataKey,
    );
    if (renderTooltip) return renderTooltip(details);

    return (
      <DefaultTooltip
        details={details}
        tooltipMode={tooltipMode}
        formatValue={formatValue}
      />
    );
  }

  function clearBarTooltip() {
    setHoveredBar(null);
    if (tooltipMode === "bar") {
      setHoveredTooltipDetails(null);
      setHoveredTooltipPosition(null);
    }
  }

  function getBarTooltipPosition(shapeProps: any) {
    const x = Number(shapeProps.x);
    const y = Number(shapeProps.y);
    const width = Number(shapeProps.width);
    const height = Number(shapeProps.height);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width)) {
      return null;
    }

    const tooltipApproxWidth = 192;
    const tooltipApproxHeight = 88;
    const edgePadding = 12;
    const container = chartHostRef.current;
    const scrollLeft = container?.scrollLeft ?? 0;
    const visibleWidth = container?.clientWidth ?? chartWidth;
    const centerX = x + width / 2;
    const tooltipHalfWidth = tooltipApproxWidth / 2;
    const viewportRight = scrollLeft + visibleWidth - edgePadding;
    const tooltipRight = centerX + tooltipHalfWidth;
    const shiftX =
      tooltipRight > viewportRight
        ? Math.max(tooltipRight - viewportRight - 26, 12)
        : 0;
    const left =
      tooltipRight > viewportRight
        ? centerX - Math.max(tooltipRight - viewportRight + 2, 12)
        : centerX;
    const spaceAbove = y;
    const shouldPlaceInside =
      Number.isFinite(height) && spaceAbove < tooltipApproxHeight + edgePadding;
    const insideTop = y + Math.min(Math.max(height * 0.2, 10), 20);
    const maxInsideTop =
      chartHeight > 0
        ? Math.max(edgePadding, chartHeight - tooltipApproxHeight - edgePadding)
        : insideTop;
    const top = shouldPlaceInside
      ? Math.min(insideTop, maxInsideTop)
      : Math.max(edgePadding, y - 8);

    return {
      left,
      top,
      inside: shouldPlaceInside,
      shiftX,
    };
  }

  function renderLegendContent() {
    if (!showLegend) return null;
    if (renderLegend) return renderLegend({ series: data.series });

    return data.series.map((series) => (
      <div
        key={series.id}
        className={cn("flex items-center gap-2", legendItemClassName)}
      >
        <span
          className="h-4 w-6 rounded"
          style={{ backgroundColor: series.color }}
        />
        <Text variant="14SB" className="text-text-primary!">
          {series.label}
        </Text>
      </div>
    ));
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        "rounded-xl border border-border bg-white p-5 sm:p-6 relative flex flex-col gap-8",
        isFullScreenOverride && "grow",
        className,
      )}
    >
      <div className="flex items-start flex-nowrap justify-between gap-4">
        {header}
        {!isLoading && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-4">
            <div className="flex shrink-0 items-center gap-3 flex-nowrap chart-actions">
              {customActions}
              <IconButton
                name="download"
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={handleDownLoad}
              />
              {!isFullScreenOverride ? (
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

      {!isLoading && (shouldShowFilter || showLegend) && (
        <div className="flex gap-8 pr-6">
          {shouldShowFilter ? (
            <div className="flex mr-auto items-center gap-3">
              <Text variant="16R" className="text-text-primary! text-nowrap">
                {filterLabel} :
              </Text>
              <SelectInput
                value={selectedFilterId}
                options={filterOptions}
                onChange={(item) => setSelectedFilterId(item.id)}
                wrapperClassName="min-w-52 border-primary-tint-1!"
                usePortal
              />
            </div>
          ) : null}

          {showLegend ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-8",
                !shouldShowFilter && "mx-auto",
                legendClassName,
              )}
            >
              {renderLegendContent()}
            </div>
          ) : null}
        </div>
      )}

      <WithFallback
        isLoading={isLoading}
        fallback={<GroupedBarChartSkeleton />}
      >
        <div className="flex w-full h-105">
          <div
            className="relative flex mt-3 pb-3.5 gap-3"
          >
            <div className="absolute bg-border top-0 bottom-6.5 w-px right-0" />
            <div className="relative h-full w-6">
              <Text
                style={{ writingMode: "vertical-rl" }}
                className="rotate-180 text-nowrap absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                {yAxisLabel}
              </Text>
            </div>

            <div className="flex flex-col-reverse items-end justify-between">
              {yTicks.slice(0, yTicks.length - 1).map((item) => (
                <Text variant="12R" className="text-text-secondary! mr-3">
                  {formatYAxisTick(item)}
                </Text>
              ))}
            </div>
          </div>
          <div
            ref={chartHostRef}
            data-export-full-width="true"
            className={cn(
              "flex-1 overflow-x-auto overflow-y-hidden group-bar-chart",
              chartClassName,
            )}
            onMouseLeave={clearBarTooltip}
          >
            <div
              className="relative h-full"
              style={{
                width: renderedChartWidth,
                minWidth: enableHorizontalScroll ? "100%" : undefined,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  margin={{ top: 18, right: 24, bottom: 16, left: 0 }}
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
                    tick={<HourTick />}
                  />

                  {tooltipMode === "group" ? (
                    <Tooltip
                      animationDuration={0}
                      content={renderTooltipContent as any}
                      shared
                      cursor={{ fill: "transparent" }}
                      wrapperStyle={{
                        outline: "none",
                        pointerEvents: "auto",
                      }}
                    />
                  ) : null}
                  {data.series.map((series) => (
                    <Bar
                      key={series.id}
                      dataKey={series.id}
                      name={series.label}
                      fill={series.color}
                      maxBarSize={resolvedBarSize}
                      isAnimationActive={false}
                      shape={(shapeProps: any) => {
                        const barKey = `${series.id}-${shapeProps.index}`;
                        const compactedGeometry = getCompactedBarGeometry(
                          series.id,
                          shapeProps,
                        );
                        if (!compactedGeometry) return <g />;

                        const value = Number(
                          shapeProps.value ??
                            shapeProps.payload?.[series.id] ??
                            0,
                        );
                        const geometry = normalizeGeometry(
                          value,
                          compactedGeometry.x,
                          compactedGeometry.y,
                          compactedGeometry.width,
                          compactedGeometry.height,
                        );

                        if (!geometry) return <g />;

                        const path = buildBarPath(
                          geometry.x,
                          geometry.y,
                          geometry.width,
                          geometry.height,
                        );

                        if (!path) return <g />;
  
                        const commentCount = shapeProps.payload?.commentCounts?.[series.id];
  
                        return (
                          <g>
                            <path
                              d={path}
                              fill={
                                hoveredBar === barKey
                                  ? (series.hoverColor ?? series.color)
                                  : series.color
                              }
                              onMouseEnter={() => {
                                setHoveredBar(barKey);
                                if (tooltipMode === "bar") {
                                  const details = getTooltipDetails(
                                    shapeProps.payload,
                                    series.id,
                                  );
                                  setHoveredTooltipDetails(details);
                                  setHoveredTooltipPosition(
                                    getBarTooltipPosition(shapeProps),
                                  );
                                }
                              }}
                              onMouseMove={() => {
                                if (tooltipMode === "bar") {
                                  const details = getTooltipDetails(
                                    shapeProps.payload,
                                    series.id,
                                  );
                                  setHoveredTooltipDetails(details);
                                  setHoveredBar(barKey);
                                  setHoveredTooltipPosition(
                                    getBarTooltipPosition(shapeProps),
                                  );
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredBar(null);
                                if (tooltipMode === "bar") {
                                  setHoveredTooltipDetails(null);
                                  setHoveredTooltipPosition(null);
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                transition: "fill 0.15s ease",
                              }}
                            />
                            {commentCount && commentCount > 0 ? (
                              <g
                                transform={`translate(${geometry.x + geometry.width / 2}, ${geometry.y - 20})`}
                                className={cn("pointer-events-none", {
                                  "cursor-pointer pointer-events-auto": !!props.onBadgeClick,
                                })}
                                onClick={(e) => {
                                  if (props.onBadgeClick) {
                                    e.stopPropagation();
                                    props.onBadgeClick(shapeProps.payload.categoryId, series.id);
                                  }
                                }}
                              >
                                <foreignObject x={-15} y={-15} width="30" height="30" className="overflow-visible">
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
                      }}
                    >
                      {showBarValues ? (
                        <LabelList
                          dataKey={series.id}
                          content={(labelProps: any) => (
                            <ValueLabel
                              {...labelProps}
                              {...(getCompactedBarGeometry(
                                series.id,
                                labelProps,
                              ) ?? {})}
                              formatter={formatValue}
                            />
                          )}
                        />
                      ) : null}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              {tooltipMode === "bar" &&
              hoveredTooltipDetails &&
              hoveredTooltipPosition ? (
                <div
                  className="pointer-events-none absolute z-50"
                  style={{
                    left: hoveredTooltipPosition.left,
                    top: hoveredTooltipPosition.top,
                    transform: hoveredTooltipPosition.inside
                      ? `translate(calc(-50% + ${hoveredTooltipPosition.shiftX}px), 0)`
                      : `translate(calc(-50% + ${hoveredTooltipPosition.shiftX}px), -100%)`,
                  }}
                >
                  {renderTooltip ? (
                    renderTooltip(hoveredTooltipDetails)
                  ) : (
                    <DefaultTooltip
                      details={hoveredTooltipDetails}
                      tooltipMode={tooltipMode}
                      formatValue={formatValue}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="text-center mt-3">
          <Text variant="14M">{xAxisLabel}</Text>
        </div>
      </WithFallback>
    </div>
  );
}

function GroupedBarChartSkeleton() {
  function BarGroup({ values }: { values: number[] }) {
    return (
      <div className="flex gap-2 items-end">
        {values.map((height, index) => (
          <Skeleton key={index} height={height} className="w-7 rounded-t-sm" />
        ))}
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
          {[
            [245, 180, 130],
            [120, 260, 210],
            [290, 140, 190],
            [210, 300, 170],
            [160, 110, 240],
            [275, 220, 150],
          ].map((values, index) => (
            <BarGroup key={index} values={values} />
          ))}
        </div>
        <Skeleton className="h-3! min-h-3! w-40! rounded-lg! self-center! mt-4" />
      </div>
      <Skeleton className="w-3! h-40! rounded-lg!" />
    </div>
  );
}
