import {
  BarChart,
  CartesianGrid,
  Label,
  LabelProps,
  getNiceTickValues,
  XAxisProps,
  YAxisProps,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Bar,
  BarShapeProps,
  Rectangle,
  ReferenceLine,
} from "recharts";
import { useChartsActionV2, useContainerDimentions } from "../../../../hooks";
import { cn, seededRandom } from "../../../../utils";
import { IconButton, Text, Skeleton } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";
import React from "react";

export type BarData = {
  label: string;
  value: number;
  color?: string;
};

interface SimpleBarChartProps {
  data: BarData[];
  isLoading?: boolean;
  actionWrapperClassName?: string;
  downloadFileName?: string;
  isFullScreenOverride?: boolean;
  showValuesOnBar?: boolean;
  barValueLabelProps?: React.SVGProps<SVGTextElement>;
  barValueFormatter?: (value: number) => string | number;
  barColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  className?: string;
  YAxisLabel?: string;
  XAxisLabel?: string;
  header?: string | React.ReactNode;
  chartMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  chartClassName?: string;
  yAxisLabelProps?: LabelProps;
  xAxisLabelProps?: LabelProps;
  yAxisProps?: YAxisProps;
  xAxisProps?: XAxisProps;
  tickCount?: number;
  refferenceLine?: {
    value: number;
    label: string;
    color: string;
  };
  customActions?: React.ReactNode;
  yDomainMax?: number;
  yDomainUpperPadding?: number;
  xTickFormatter?: (value: string) => string;
  shortNamesMap?: Record<string, string>;
  smallXtickFormatter?: (value: string) => string;
}
export function SimpleBarChart(props: SimpleBarChartProps) {
  const {
    isLoading = false,
    actionWrapperClassName,
    downloadFileName = "",
    isFullScreenOverride: isFullScreen = false,
    data,
    barValueFormatter = (value) => value.toString(),
    barValueLabelProps,
    showValuesOnBar = false,
    barColor,
    barWidth = 30,
    barGap = 10,
    barRadius = 4,
    className,
    XAxisLabel,
    YAxisLabel,
    header,
    chartClassName,
    tickCount = 5,
    xAxisLabelProps,
    yAxisLabelProps,
    chartMargins,
    xAxisProps,
    yAxisProps,
    refferenceLine,
    customActions,
    yDomainMax = 1,
    yDomainUpperPadding = 0,
    xTickFormatter = v => v,
    shortNamesMap = {},
    smallXtickFormatter = v => v,
  } = props;
  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const { onMaximize, onMinimize, handleDownLoad, chartRef } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => (
        <SimpleBarChart {...props} isFullScreenOverride={true} />
      ),
    });
  const { width: visualizationContainerWidth } = useContainerDimentions(chartRef);

  /**
   * ===========================
   * Derived States
   * ===========================
   */
  const yMax =
    Math.max(...data.map((d) => d.value), yDomainMax) + yDomainUpperPadding;
  const yAxisDomain: [number, number] = [0, yMax];
  const yTicks = getNiceTickValues(yAxisDomain, tickCount);
  const showRefferenceLine =
    refferenceLine !== undefined && typeof refferenceLine === "object";

  /**
   * ====================================
   * Reusable UI
   * ====================================
   */
  const barShape = (props: BarShapeProps) => {
    const { x, y, width, height, payload } = props;
    const normalizedHeight = Math.max(1, Math.abs(height));
    const normalizedY = height < 0 ? y + height : y;
    const radius = [barRadius, barRadius, 0, 0];
    const labelY = normalizedY - 8;

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
          fill={barColor}
        />
        {showValuesOnBar && (
          <text
            fill={barColor}
            x={x + width / 2}
            y={labelY}
            textAnchor="middle"
            {...barValueLabelProps}
          >
            {barValueFormatter(payload.value)}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      ref={chartRef}
      className={cn(
        "flex flex-col border border-border py-4 px-2 gap-4 rounded-sm",
        className,
      )}
    >
      {/* header */}
      <div
        className={cn(
          "flex items-center pr-6 pl-4",
          header ? "justify-between" : "justify-end",
        )}
      >
        {header &&
          (typeof header === "string" ? (
            <Text variant="largeBody" className="font-InterSemiBold!">{header}</Text>
          ) : (
            header
          ))}
        {!isLoading && (
          <div
            className={cn(
              "flex items-center flex-nowrap gap-3 shrink-0 chart-actions",
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
            {!isFullScreen ? (
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
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMinimize}
              />
            )}
          </div>
        )}
      </div>

      {/* legends */}
      {!isLoading && showRefferenceLine && (
        <div className="flex justify-end  px-6">
          <span className="flex gap-4 items-center">
            <span
              className="h-0.5 w-5"
              style={{ backgroundColor: refferenceLine?.color }}
            />
            <Text variant="14R" className="text-text-secondary!">
              {refferenceLine?.label}
            </Text>
          </span>
        </div>
      )}
      <WithFallback isLoading={isLoading} fallback={<SimpleBarSkeleton />}>
        <div
          className={cn(
            "h-105 w-full sm:h-115",
            isFullScreen && "min-h-115 grow",
            chartClassName,
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              barGap={barGap}
              barSize={barWidth}
              data={data}
              margin={{
                top: 20,
                right: 0,
                bottom: 20,
                left: 0,
                ...chartMargins,
              }}
            >
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              {showRefferenceLine && (
                <ReferenceLine
                  y={refferenceLine.value}
                  label={{
                    value: refferenceLine.value,
                    position: "right",
                    fill: refferenceLine.color,
                    fontSize: 14,
                    offset: 15,
                  }}
                  stroke={refferenceLine.color}
                  strokeDasharray="3 3"
                />
              )}
              <YAxis
                tickLine={false}
                interval={0}
                axisLine={false}
                ticks={yTicks}
                tick={{
                  fill: "var(--color-text-secondary)",
                  fontSize: 12,
                  fontFamily: "Inter-Regular",
                }}
                {...yAxisProps}
              >
                {YAxisLabel && (
                  <Label
                    value={YAxisLabel}
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
                )}
              </YAxis>
              <XAxis
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                dataKey={"label"}
                tick={{
                  fill: "var(--color-text-primary)",
                  fontSize: 14,
                  fontFamily: "Inter-Regular",
                }}
                dy={8}
                tickFormatter={visualizationContainerWidth < 430 ? smallXtickFormatter : xTickFormatter}
                {...xAxisProps}
              >
                {XAxisLabel && (
                  <Label
                    value={XAxisLabel}
                    position="bottom"
                    offset={-10}
                    {...xAxisLabelProps}
                  />
                )}
              </XAxis>
              <Bar
                color={barColor}
                barSize={barWidth}
                dataKey="value"
                isAnimationActive={false}
                shape={barShape}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WithFallback>
    </div>
  );
}

function SimpleBarSkeleton() {
  return (
    <div className="h-full flex min-h-90 gap-3">
      {/* y axis label */}
      <Skeleton className="h-30! self-center w-3! rounded-sm" />
      <div className="flex grow flex-col gap-3">
        {/* x axis label */}
        <div className="flex relative grow border-l border-b border-border">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={cn("border-t border-border/70")} />
            ))}
          </div>

          <div className="flex size-full items-end justify-evenly">
            {Array.from({ length: 5 }).map((_, index) => {
              const rand = seededRandom(index + 6.003);
              const height = Math.ceil(rand * 100);
              return (
                <Skeleton
                  key={index}
                  animation="wave"
                  variant="rectangular"
                  style={{ height: `${height}%` }}
                  className="w-20 m-0! rounded! p-0! flex h-6"
                />
              );
            })}
          </div>
        </div>
        <Skeleton className="w-20! self-center h-3! rounded-sm" />
      </div>
    </div>
  );
}
