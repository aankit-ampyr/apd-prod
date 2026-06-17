import React from "react";
import {
  Bar,
  BarChart,
  BarShapeProps,
  CartesianGrid,
  getNiceTickValues,
  Label,
  LabelProps,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  XAxisProps,
  YAxis,
  YAxisProps,
} from "recharts";
import { useChartsActionV2 } from "../../../../hooks";
import { cn, seededRandom } from "../../../../utils";
import { IconButton, Skeleton, Text } from "../../../../ui-kit";
import { WithFallback } from "../../../SkelatonWrapper";

export type HorizontalBarData = {
  label: string;
  value: number;
  color?: string;
};

interface HorizontalBarChartProps {
  data: HorizontalBarData[];
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
  yAxisLabelProps?: LabelProps;
  xAxisLabelProps?: LabelProps;
  yAxisProps?: YAxisProps;
  xAxisProps?: XAxisProps;
  xDomainMax?: number;
  xDomainUpperPadding?: number;
  yAxisWidth?: number;
  chartClassName?: string;
  xAxisTickFormatter?: (value: string | number) => string;
  xAxisTickCount?: number;
}

export function HorizontalBarChart(props: HorizontalBarChartProps) {
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
    xAxisLabelProps,
    yAxisLabelProps,
    chartMargins,
    xAxisProps,
    yAxisProps,
    xDomainMax = 1,
    xDomainUpperPadding = 0,
    yAxisWidth = 120,
    xAxisTickFormatter,
    xAxisTickCount = 5,
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
        <HorizontalBarChart {...props} isFullScreenOverride={true} />
      ),
    });

  /**
   * ===========================
   * Derived States
   * ===========================
   */
  const xMax =
    Math.max(...data.map((d) => d.value), xDomainMax) + xDomainUpperPadding;
  const xAxisDomain: [number, number] = [0, xMax];
  const ticks = getNiceTickValues(xAxisDomain, xAxisTickCount);
  const customVerticalGridPoints = ticks.slice(0, -1);

  /**
   * ====================================
   * Reusable UI
   * ====================================
   */
  const barShape = (shapeProps: BarShapeProps) => {
    const { x, y, width, height, payload } = shapeProps;
    const normalizedWidth = Math.max(1, Math.abs(width));
    const normalizedX = width < 0 ? x + width : x;
    const radius = [0, barRadius, barRadius, 0];
    const resolvedBarColor = payload.color ?? barColor;
    const labelX = normalizedX + normalizedWidth + 8;

    return (
      <g>
        <Rectangle
          x={normalizedX}
          y={y}
          width={normalizedWidth}
          height={height}
          radius={radius as any}
          style={{
            cursor: "pointer",
          }}
          fill={resolvedBarColor}
        />
        {showValuesOnBar && (
          <text
            fill={resolvedBarColor}
            x={labelX}
            y={y + height / 2 + 4}
            textAnchor="start"
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
            <Text variant="largeBody">{header}</Text>
          ) : (
            header
          ))}
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

      <WithFallback isLoading={isLoading} fallback={<HorizontalBarSkeleton />}>
        <div
          className={cn(
            "h-105 w-full sm:h-115 grow",
            isFullScreen && "min-h-115 grow",
            chartClassName,
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              // className="debug"
              data={data}
              layout="vertical"
              barGap={barGap}
              barCategoryGap={barGap}
              barSize={barWidth}
              margin={{
                top: 0,
                right: 28,
                bottom: 20,
                left: 0,
                ...chartMargins,
              }}
            >
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                tick={{
                  fill: "var(--color-text-secondary)",
                  fontSize: 12,
                  fontFamily: "Inter-Regular",
                }}
                ticks={ticks}
                domain={xAxisDomain}
                tickFormatter={xAxisTickFormatter}
                {...xAxisProps}
              >
                {XAxisLabel && (
                  <Label
                    value={XAxisLabel}
                    position="bottom"
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
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                width={yAxisWidth}
                tick={{
                  fill: "var(--color-text-primary)",
                  fontSize: 14,
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

function HorizontalBarSkeleton() {
  return (
    <div className="flex h-full min-h-90 flex-col gap-4 px-4 pb-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5! w-28! rounded-sm" />
      </div>

      <div className="flex grow gap-4">
        <div className="flex w-28 shrink-0 flex-col justify-between gap-6 py-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4! w-full rounded-sm" />
          ))}
        </div>

        <div className="flex grow flex-col justify-between gap-6 border-l border-b border-border py-4 pl-4">
          {Array.from({ length: 4 }).map((_, index) => {
            const rand = seededRandom(index + 2.17);
            const width = Math.ceil(45 + rand * 50);

            return (
              <div key={index} className="flex items-center gap-3">
                <Skeleton
                  animation="wave"
                  variant="rectangular"
                  className="h-7! rounded! p-0!"
                  style={{ width: `${width}%` }}
                />
                <Skeleton className="h-4! w-12! rounded-sm" />
              </div>
            );
          })}
        </div>
      </div>

      <Skeleton className="h-4! w-24! self-center rounded-sm" />
    </div>
  );
}
