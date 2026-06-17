import React, { HTMLProps } from "react";
import { useChartTooltip, useChartsActionV2 } from "../../../hooks";
import { IconTypes } from "../../../interface";
import { Icon, IconButton, Skeleton, Text } from "../../../ui-kit";
import { cn, formatPercentage } from "../../../utils";
import { Divider } from "../../Divider";
import { WithFallback } from "../../SkelatonWrapper";
import * as ScrollArea from "@radix-ui/react-scroll-area";

export type MetricHeatmapCell = {
  value: number | null | undefined;
} & Record<string, string | number | boolean | null | undefined>;

export type MetricHeatmapRow = {
  data: MetricHeatmapCell[];
  label: string;
} & Record<string, string | number | boolean | null | undefined>;

export type MetricHeatmapTooltipData = {
  row: MetricHeatmapRow;
  rowIndex: number;
  colLabel: string;
  colIndex: number;
  cell: MetricHeatmapCell | undefined;
  value: number | null | undefined;
};

export interface MetricHeatmapProps {
  title?: string;
  icon?: IconTypes;
  subTitle?: string;
  header?: React.ReactNode;

  showScale?: boolean;
  labelTitle?: string;
  labels?: string[];

  matrixData?: MetricHeatmapRow[];
  tooltipRenderer?: (data: MetricHeatmapTooltipData) => React.ReactNode;

  isFullScreenOverride?: boolean;
  downloadFileName?: string;

  className?: string;
  isLoading?: boolean;
}

type HeatMapColorCoding = {
  min: number;
  max: number;
  bgColor: string;
  textColor: string;
  label: string;
};

type HeatmapTone = Pick<HeatMapColorCoding, "bgColor" | "textColor">;

const heatMapColorCodingMap: HeatMapColorCoding[] = [
  {
    min: -Infinity,
    max: -50,
    bgColor: "#D64A54",
    textColor: "white",
    label: "High Negative",
  },
  {
    min: -50,
    max: -0.5,
    bgColor: "#FFBFB9",
    textColor: "var(--color-text-primary)",
    label: "Negative",
  },
  {
    min: -0.5,
    max: 0.5,
    bgColor: "#F8F2EB",
    textColor: "var(--color-text-primary)",
    label: "Neutral",
  },
  {
    min: 0.5,
    max: 50,
    bgColor: "#B9E9D3",
    textColor: "var(--color-text-primary)",
    label: "Positive",
  },
  {
    min: 50,
    max: Infinity,
    bgColor: "#009580",
    textColor: "white",
    label: "High Positive",
  },
];

const noDataColorCoding: Omit<HeatMapColorCoding, "min" | "max"> = {
  bgColor: "#F4F4F4",
  textColor: "var(--color-text-secondary)",
  label: "No Data",
};

export function getHeatmapTone(value: number | null | undefined): HeatmapTone {
  if (value != null) {
    for (let i = 0; i < heatMapColorCodingMap?.length; i++) {
      const colorCoding = heatMapColorCodingMap[i];
      if (value >= colorCoding.min && value <= colorCoding.max) {
        return {
          bgColor: colorCoding.bgColor,
          textColor: colorCoding.textColor,
        };
      }
    }
  }
  return {
    bgColor: noDataColorCoding.bgColor,
    textColor: noDataColorCoding.textColor,
  };
}

function formatCellValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

export function MetricHeatmap(props: MetricHeatmapProps) {
  const {
    title,
    icon,
    subTitle,
    header,
    showScale = true,
    labelTitle = "Stream",
    labels = [],
    matrixData = [],
    tooltipRenderer,
    downloadFileName = "metric_heatmap.png",
    className,
    isLoading = false,
    isFullScreenOverride: isFullScreen,
  } = props;

  /**
   * ============================
   * Hooks
   * ============================
   */
  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => <MetricHeatmap {...props} isFullScreenOverride />,
    });
  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<MetricHeatmapTooltipData>(chartRef as any);

  return (
    <div
      ref={chartRef}
      className={cn(
        "rounded-xl border border-border bg-white p-4 relative flex flex-col gap-7",
        isFullScreen && "grow",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {header ? (
          header
        ) : (
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint-2">
                <Icon name={icon} size={22} className="text-primary-tint-1!" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {title && (
                <Text variant="h4" className="text-text-primary!">
                  {title}
                </Text>
              )}
              {subTitle && (
                <Text variant="14R" className="text-text-secondary!">
                  {subTitle}
                </Text>
              )}
            </div>
          </div>
        )}

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
      <WithFallback
        isLoading={isLoading}
        fallback={
          <MetricHeatmapSkeleton
            labels={labels}
            rowCount={matrixData.length}
            showScale={showScale}
          />
        }
      >
        <div
          className="flex overflow-x-hidden pb-4"
          onMouseLeave={handleMouseLeave}
        >
          {/* stream colums */}
          <div className="grid gap-2 min-w-fit">
            <TextWrapper>
              <Text
                variant="12SB"
                className="uppercase tracking-widest text-text-secondary!"
              >
                {labelTitle}
              </Text>
            </TextWrapper>
            {matrixData.map((row) => (
              <TextWrapper key={row.label}>
                <Text variant="14M" className="text-text-primary!">
                  {row.label}
                </Text>
              </TextWrapper>
            ))}
          </div>

          {/* matrix */}
          {/* using Radix ui lib for ScrollArea for custom scroll */}
          <ScrollArea.Root className="relative w-full overflow-x-hidden overflow-y-clip">
            <ScrollArea.Viewport className="w-full">
              <div className="flex justify-center">
                <div
                  style={{
                    gridTemplateColumns: `repeat(${labels.length}, minmax(96px, 1fr))`,
                  }}
                  className="grid gap-2 min-w-max px-auto"
                >
                  {labels.map((label) => (
                    <TextWrapper
                      key={label}
                      className={cn(
                        "flex items-center justify-center rounded-xl px-3 minx-w-40 max-w-70",
                      )}
                    >
                      <Text
                        variant="12SB"
                        className="text-center uppercase text-text-secondary!"
                      >
                        {label}
                      </Text>
                    </TextWrapper>
                  ))}

                  {matrixData.map((row, rowIndex) =>
                    labels.map((label, index) => {
                      const cell = row.data[index];
                      const value = cell?.value;
                      const tone = getHeatmapTone(value);

                      return (
                        <TextWrapper
                          key={`${row.label}-${label}`}
                          style={{
                            backgroundColor: tone.bgColor,
                          }}
                          className={cn(
                            "flex items-center justify-center rounded-sm px-3 minx-w-40 max-w-70 relative",
                          )}
                          onMouseMove={(event) => {
                            if (!tooltipRenderer) return;
                            handleMouseMove(event, {
                              row,
                              rowIndex,
                              colLabel: label,
                              colIndex: index,
                              cell,
                              value,
                            });
                          }}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Text
                            variant="14SB"
                            style={{
                              color: tone.textColor,
                            }}
                            className={cn("text-center")}
                          >
                            {formatCellValue(value)}
                          </Text>
                        </TextWrapper>
                      );
                    }),
                  )}
                </div>
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              forceMount
              orientation="horizontal"
              className="flex h-2 absolute bg-[#EBEDF1] rounded-full! touch-none select-none"
            >
              <ScrollArea.Thumb className="relative bg-[#B7B8B8] rounded-full!" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
          {!isLoading && tooltip && tooltipRenderer && (
            <div
              className="absolute p-2 rounded-md bg-white border pointer-events-none z-50"
              style={{
                left: tooltip.x,
                borderColor: getHeatmapTone(tooltip.data.value).bgColor,
                top: tooltip.y,
                transform: "translate(-50%, -112%)",
              }}
            >
              <div
                className="absolute left-1/2 top-full size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white border-b border-r"
                style={{
                  borderColor: getHeatmapTone(tooltip.data.value).bgColor,
                }}
              />

              {tooltipRenderer(tooltip.data)}
            </div>
          )}
        </div>

        {showScale && <HeatVarianceLabels />}
      </WithFallback>
    </div>
  );
}

export function HeatVarianceLabels() {
  /**
   * ============================
   * function
   * ============================
   */
  function getColorCodingLabel(min: number, max: number) {
    if (min === -Infinity && max !== Infinity) {
      return `< ${formatPercentage(max)}`;
    }
    if (min === -0.5 && max == 0.5) {
      return `${formatPercentage(min)} TO ${formatPercentage(max)}`;
    }
    if (min === -50 && max == -0.5) {
      return `${formatPercentage(min)} TO < ${formatPercentage(max)}`;
    }
    if (min === 0.5 && max == 50) {
      return `> ${formatPercentage(min)} TO ${formatPercentage(max)}`;
    }
    return `> ${formatPercentage(min)}`;
  }
  return (
    <div className="flex flex-col border-border px-8 py-6">
      <Text variant="12SB" className="uppercase text-text-secondary!">
        Variance Scale
      </Text>

      <div className="flex gap-4 mt-5 items-center justify-between">
        {heatMapColorCodingMap.map((item) => (
          <React.Fragment key={`${item.label}-${item.min}-${item.max}`}>
            <LegendItem
              valueLabel={getColorCodingLabel(item.min, item.max)}
              color={item.bgColor}
              label={item.label}
            />
            <Divider orientation="vertical" className="w-0.5 bg-border" />
          </React.Fragment>
        ))}
        <LegendItem
          color={noDataColorCoding.bgColor}
          label={noDataColorCoding.label}
          valueLabel="-"
        />
      </div>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
  valueLabel?: string;
}
function LegendItem(props: LegendItemProps) {
  const { color, label, valueLabel } = props;
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          backgroundColor: color,
        }}
        className="h-7.5 w-10 rounded"
      />
      <div>
        <Text variant="12M" className="text-text-primary!">
          {label}
        </Text>
        <Text variant="12M" className="text-text-secondary!">
          {valueLabel}
        </Text>
      </div>
    </div>
  );
}

interface TextWrapperPropd extends React.PropsWithChildren<
  React.HTMLProps<HTMLDivElement>
> {}

function TextWrapper(props: TextWrapperPropd) {
  const { children, className, ...rest } = props;
  return (
    <div
      className={cn("h-10 px-4 py-2 flex items-center", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

type MetricHeatmapSkeletonProps = {
  labels: string[];
  rowCount: number;
  showScale: boolean;
};

function MetricHeatmapSkeleton(props: MetricHeatmapSkeletonProps) {
  const { labels, rowCount, showScale } = props;
  const skeletonRows = Math.max(rowCount, 4);
  const skeletonCols = Math.max(labels.length, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex overflow-x-hidden pb-4">
        <div className="grid gap-2 min-w-fit">
          <TextWrapper>
            <Skeleton width={72} height={14} className="rounded-sm" />
          </TextWrapper>

          {Array.from({ length: skeletonRows }).map((_, index) => (
            <TextWrapper key={`heatmap-row-skeleton-${index}`}>
              <Skeleton
                width={`${60 + (index % 3) * 12}%`}
                height={16}
                className="rounded-sm"
              />
            </TextWrapper>
          ))}
        </div>

        <ScrollArea.Root className="relative w-full overflow-x-hidden overflow-y-clip">
          <ScrollArea.Viewport className="w-full">
            <div className="flex justify-center">
              <div
                style={{
                  gridTemplateColumns: `repeat(${skeletonCols}, minmax(96px, 1fr))`,
                }}
                className="grid gap-2 min-w-max px-auto"
              >
                {Array.from({ length: skeletonCols }).map((_, index) => (
                  <TextWrapper
                    key={`heatmap-col-skeleton-${index}`}
                    className="flex items-center justify-center rounded-xl px-3 minx-w-40 max-w-70"
                  >
                    <Skeleton width="100%" height={14} className="rounded-sm" />
                  </TextWrapper>
                ))}

                {Array.from({ length: skeletonRows }).map((_, rowIndex) =>
                  Array.from({ length: skeletonCols }).map((__, colIndex) => (
                    <TextWrapper
                      key={`heatmap-cell-skeleton-${rowIndex}-${colIndex}`}
                      className="flex items-center justify-center rounded-xl px-3 minx-w-40 max-w-70"
                    >
                      <Skeleton
                        width="100%"
                        height={24}
                        className="rounded-sm"
                      />
                    </TextWrapper>
                  )),
                )}
              </div>
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            forceMount
            orientation="horizontal"
            className="flex h-2 absolute bg-[#EBEDF1] rounded-full! touch-none select-none"
          >
            <ScrollArea.Thumb className="relative bg-[#B7B8B8] rounded-full!" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>

      {showScale && (
        <div className="flex flex-col border-t border-border px-8 py-6">
          <Skeleton width={96} height={14} className="mb-5" />
          <div className="flex gap-4 items-center justify-between flex-wrap">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`heatmap-scale-skeleton-${index}`}
                className="flex items-center gap-2"
              >
                <Skeleton width={40} height={28} className="rounded!" />
                <div className="flex flex-col gap-2">
                  <Skeleton width={84} height={12} />
                  <Skeleton width={54} height={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
