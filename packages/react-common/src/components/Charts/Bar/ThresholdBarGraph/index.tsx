import React, { ReactElement, ReactNode, useState, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useChartsActionV2, useChartTooltip } from "../../../../hooks";
import { cn } from "../../../../utils";
import { IconButton, Text, Skeleton, Icon } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";

type BarValue = string | number;

export type BarDataPoint = {
  label: string;
  value: BarValue;
  color?: string;
  commentCount?: number;
} & Record<string, BarValue | undefined>;

interface ThresholdBarGraphProps {
  data: BarDataPoint[];
  xKey: string;
  yKey: string;
  downloadFileName: string;
  title?: string;

  tooltipYLabel?: string;
  isFullScreenOverride?: boolean;
  customActions?: React.ReactNode;
  isLoading?: boolean;
  useBuiltInTooltip?: boolean;

  // classNames
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  actionWrapperClassName?: string;
  chartClassName?: string;

  // axis
  xAxisLabel?: string;
  xAxisTicks?: (string | number)[];
  xAxisTickCount?: number;
  yAxisLabel?: string;
  yAxisWidth?: number;
  yAxisTicks?: number[];
  yAxisTickCount?: number;
  yAxisDomain?: [number, number];

  // bars
  barColor?: string;
  hoverColor?: string;
  thresholdBarColor?: string;
  thresholdHoverColor?: string;
  barRadius?: number;

  // threshold
  thresholdValue: number;

  // legend
  showLegend?: boolean;
  lowLabel?: string;
  highLabel?: string;
  legendRenderer?: (props: {
    lowLabel: string;
    highLabel: string;
    lowColor: string;
    highColor: string;
  }) => ReactNode;
  thresholdLineColor?: string;
  thresholdLabel?: string;

  // tooltip
  tooltipRenderer?: (
    data: BarDataPoint,
    barData?: {
      color?: string;
      hoverColor?: string;
      isThresholdExceeded: boolean;
    },
  ) => ReactNode;

  xTickFormatter?: (value: string | number, index: number) => string;
  onBadgeClick?: (item: BarDataPoint) => void;

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
  barCategoryGap?: number;
  verticalGridCount?: number;
  thresholdLabelRenderer?: (viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ReactElement;
}

export function ThresholdBarGraph(props: ThresholdBarGraphProps) {
  const {
    downloadFileName,
    className,
    headerClassName,
    title,
    titleClassName,
    tooltipYLabel,
    isFullScreenOverride = false,
    customActions,
    isLoading = false,
    actionWrapperClassName,
    data,
    chartClassName,
    verticalGridCount,
    useBuiltInTooltip = false,
    xAxisLabel = "X Axis",
    xAxisTicks,
    xAxisTickCount,
    yAxisDomain,
    barCategoryGap = 2,
    yAxisLabel = "Y Axis",
    yAxisTicks,
    yAxisTickCount,
    yAxisWidth = 48,
    xKey,
    yKey,
    xTickFormatter,
    xAxisLabelProps,
    yAxisLabelProps,
    barColor = "#97DDF0",
    hoverColor = "#46B3CF",
    thresholdBarColor = "#FF6B6B",
    thresholdHoverColor,
    barRadius = 4,
    thresholdValue,
    thresholdLabelRenderer,
    thresholdLineColor = "#FF4D4F",
    thresholdLabel,
    tooltipRenderer,
    showLegend = false,
    lowLabel = "Normal",
    highLabel = "High",
    legendRenderer,
    onBadgeClick,
  } = props;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    left: number;
    top: number;
    item: BarDataPoint;
    barData?: {
      color?: string;
      hoverColor?: string;
      isThresholdExceeded: boolean;
    };
  } | null>(null);

  // ==================
  // hooks
  // ==================
  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <ThresholdBarGraph {...props} isFullScreenOverride />
      ),
    });

  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<BarDataPoint>(chartRef as any);

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
  const resolvedXAxisLabel =
    xAxisLabel?.replace(/\s*\(.*?\)\s*/g, "").trim() || "Label";

  const resolvedYAxisLabel = tooltipYLabel || yAxisLabel || "Value";

  const evaluatedBarColor = (index: number, isThresholdExceeded: boolean) => {
    // This function can be expanded to evaluate bar color based on more complex conditions
    if (activeIndex === index) {
      return isThresholdExceeded
        ? (thresholdHoverColor ?? hoverColor)
        : hoverColor;
    }
    if (isThresholdExceeded) {
      return thresholdBarColor;
    }
    return barColor;
  };

  function showTooltip(
    event: React.MouseEvent<SVGRectElement>,
    item: BarDataPoint,
    isThresholdExceeded: boolean,
  ) {
    if (!useBuiltInTooltip || !tooltipRenderer) return;

    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }

    const containerRect = chartRef.current?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    if (!containerRect || !targetRect) return;

    setTooltipState({
      left: targetRect.left - containerRect.left + targetRect.width / 2,
      top: targetRect.top - containerRect.top - 10,
      item,
      barData: {
        color: isThresholdExceeded ? thresholdBarColor : barColor,
        hoverColor: isThresholdExceeded ? thresholdHoverColor : hoverColor,
        isThresholdExceeded,
      },
    });
  }

  const renderLegend = () => {
    if (!showLegend) return null;
    if (isLoading) return null;
    if (legendRenderer) {
      return legendRenderer({
        lowLabel,
        highLabel,
        lowColor: barColor,
        highColor: thresholdBarColor,
      });
    }

    return (
      <div className="absolute top-2 right-34 z-10 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-3 rounded"
            style={{ backgroundColor: thresholdBarColor }}
          />
          <Text variant="caption" className="text-text-secondary!">
            {highLabel}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-3 rounded"
            style={{ backgroundColor: barColor }}
          />
          <Text variant="caption" className="text-text-secondary!">
            {lowLabel}
          </Text>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={chartRef}
      onMouseLeave={() => {
        handleMouseLeave();
        setActiveIndex(null);
        setTooltipState(null);
      }}
      className={cn(
        "rounded-xl border border-border bg-white pt-6 relative flex flex-col gap-5",
        isFullScreenOverride && "grow",
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
              "flex shrink-0 items-center gap-3 chart-actions flex-nowrap",
              actionWrapperClassName,
            )}
          >
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
        )}
      </div>

      <div className={cn("w-full grow relative", chartClassName)}>
        {showLegend && (
          <div className="flex justify-center pb-4">{renderLegend()}</div>
        )}
        <WithFallback
          isLoading={isLoading}
          fallback={
            <div className="px-4 flex-col pb-4 flex h-full min-h-90">
              <div className="flex items-center grow relative">
                <div className="absolute top-30 border-dashed left-11 right-6 h-0.5 border-border border" />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={20}
                  height={88}
                  className="rounded-full!"
                />

                <div className="flex self-stretch gap-3 grow border-border items-end border my-2 mx-6 border-t-0! border-r-0!">
                  {Array.from({ length: 30 }).map((_, index) => {
                    const heights = [
                      40, 55, 72, 48, 88, 65, 52, 74, 60, 92, 58, 70,
                    ];
                    const darkIndex = [
                      2, 4, 7, 9, 11, 14, 16, 19, 21, 23, 26, 28,
                    ];

                    return (
                      <Skeleton
                        key={index}
                        animation="wave"
                        variant="rectangular"
                        style={{
                          height: `${heights[index % heights.length]}%`,
                        }}
                        className={cn(
                          "grow rounded-t-sm!",
                          darkIndex.includes(index) && "bg-[#D7D7D7]!",
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={120}
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
            className="px-4 pb-2 relative"
          >
            <BarChart
              data={data}
              margin={{ top: 30, right: 120, bottom: 48, left: 18 }}
              barCategoryGap={barCategoryGap}
            >
              <CartesianGrid
                vertical={true}
                horizontal={true}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
                verticalCoordinatesGenerator={
                  !verticalGridCount
                    ? undefined
                    : ({ width, offset }) => {
                        return Array.from(
                          { length: verticalGridCount },
                          (_, index) =>
                            offset.left +
                            ((width - offset.left - offset.right) /
                              (verticalGridCount - 1)) *
                              index,
                        );
                      }
                }
              />

              <XAxis
                dataKey={xKey}
                axisLine={{
                  stroke: "var(--color-border)",
                  strokeWidth: 1,
                }}
                tickLine={false}
                ticks={xAxisTicks}
                tickCount={xAxisTickCount}
                tick={(tickProps: any) => {
                  const { x, y, payload } = tickProps;
                  const formattedValue = xTickFormatter
                    ? xTickFormatter(payload.value, payload.index)
                    : payload.value;
                  const lines = String(formattedValue).split("\n");

                  return (
                    <g transform={`translate(${x},${y})`}>
                      {lines.map((line, index) => (
                        <text
                          key={index}
                          x={0}
                          y={0}
                          dy={10 + index * 14}
                          textAnchor="middle"
                          fill="var(--color-text-secondary)"
                          fontSize={12}
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                }}
              >
                <Label
                  value={xAxisLabel}
                  position={resolvedXAxisLabelProps.position}
                  offset={resolvedXAxisLabelProps.offset}
                  angle={resolvedXAxisLabelProps.angle}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 16,
                    fontFamily: "Inter-Medium",
                  }}
                />
              </XAxis>

              <YAxis
                axisLine={{
                  stroke: "var(--color-border)",
                  strokeWidth: 1,
                }}
                tickLine={false}
                width={yAxisWidth}
                ticks={yAxisTicks}
                tickCount={yAxisTickCount}
                domain={yAxisDomain}
                tick={{
                  fontSize: 12,
                  fill: "var(--color-text-secondary)",
                }}
              >
                <Label
                  value={yAxisLabel}
                  angle={resolvedYAxisLabelProps.angle}
                  position={resolvedYAxisLabelProps.position}
                  offset={resolvedYAxisLabelProps.offset}
                  style={{
                    fill: "var(--color-text-primary)",
                    fontSize: 16,
                    textAnchor: "middle",
                    fontFamily: "Inter-Medium",
                  }}
                />
              </YAxis>

              <ReferenceLine
                y={thresholdValue}
                stroke={thresholdLineColor}
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
                label={
                  thresholdLabelRenderer ? (
                    <CustomThresholdLabel renderer={thresholdLabelRenderer} />
                  ) : (
                    {
                      value: thresholdLabel || `Threshold: ${thresholdValue}`,
                      position: "right",
                      fill: thresholdLineColor,
                      fontSize: 12,
                    }
                  )
                }
              />

              <Bar
                activeBar={false}
                dataKey={yKey}
                radius={[barRadius, barRadius, 0, 0]}
                isAnimationActive={false}
                shape={(shapeProps: any) => {
                  const { x, y, width, height, index } = shapeProps;
                  const item = data[index];
                  const value = Number(item?.[yKey]);
                  const isThresholdExceeded = value >= thresholdValue;
                  const resolvedColor = evaluatedBarColor(
                    index,
                    isThresholdExceeded,
                  );
                  return (
                    <g>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        rx={barRadius}
                        ry={barRadius}
                        fill={resolvedColor}
                        onMouseEnter={(event) => {
                          setActiveIndex(index);
                          showTooltip(event, item, isThresholdExceeded);
                        }}
                        onMouseMove={(event) => {
                          showTooltip(event, item, isThresholdExceeded);
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(null);
                          tooltipTimeout.current = setTimeout(() => {
                            setTooltipState(null);
                          }, 300);
                        }}
                      />
                      <rect
                        x={x}
                        y={y + height - barRadius}
                        width={width}
                        height={barRadius}
                        fill={resolvedColor}
                        onMouseEnter={(event) => {
                          setActiveIndex(index);
                          showTooltip(event, item, isThresholdExceeded);
                        }}
                        onMouseMove={(event) => {
                          showTooltip(event, item, isThresholdExceeded);
                        }}
                        onMouseLeave={() => {
                          setActiveIndex(null);
                          tooltipTimeout.current = setTimeout(() => {
                            setTooltipState(null);
                          }, 300);
                        }}
                      />
                      {item.commentCount && item.commentCount > 0 ? (
                        <g
                          transform={`translate(${x + width / 2}, ${y - 20})`}
                          className={cn("pointer-events-none", {
                            "cursor-pointer pointer-events-auto":
                              !!onBadgeClick,
                          })}
                          onClick={(e) => {
                            if (onBadgeClick) {
                              e.stopPropagation();
                              onBadgeClick(item);
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
                                {item.commentCount > 99
                                  ? "99+"
                                  : item.commentCount}
                              </span>
                            </div>
                          </foreignObject>
                        </g>
                      ) : null}
                    </g>
                  );
                }}
              ></Bar>
            </BarChart>

            {useBuiltInTooltip && tooltipState && tooltipRenderer && (
              <div
                className="absolute z-50"
                style={{
                  left: tooltipState.left,
                  top: tooltipState.top,
                  transform: "translate(-50%, -100%)",
                  pointerEvents: "auto",
                }}
                onMouseEnter={() => {
                  if (tooltipTimeout.current) {
                    clearTimeout(tooltipTimeout.current);
                    tooltipTimeout.current = null;
                  }
                }}
                onMouseLeave={() => {
                  setTooltipState(null);
                }}
              >
                {tooltipRenderer(tooltipState.item, tooltipState.barData)}
              </div>
            )}

            {!useBuiltInTooltip && tooltip && tooltipRenderer && (
              <div
                className="absolute pointer-events-none z-50"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -220%)",
                }}
              >
                {(() => {
                  const value = Number(tooltip.data[yKey]);
                  const isThresholdExceeded = value > thresholdValue;
                  return tooltipRenderer(tooltip.data, {
                    color: isThresholdExceeded ? thresholdBarColor : barColor,
                    hoverColor: isThresholdExceeded
                      ? thresholdHoverColor
                      : hoverColor,
                    isThresholdExceeded,
                  });
                })()}
              </div>
            )}
          </ResponsiveContainer>
        </WithFallback>
      </div>
    </div>
  );
}

interface CustomThresholdLabelProps {
  renderer: (viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ReactElement;
  viewBox?: { x: number; y: number; width: number; height: number };
}

function CustomThresholdLabel({
  renderer,
  viewBox,
}: CustomThresholdLabelProps) {
  if (!viewBox) return null;
  return renderer(viewBox);
}
