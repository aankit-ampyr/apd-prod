import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarShapeProps,
} from "recharts";
import { useChartsAction, useChartTooltip } from "../../../hooks";
import { cn } from "../../../utils";
import { IconButton, Text } from "../../../ui-kit";

type Props = {
  readonly data: any[];
  readonly xKey: string;
  readonly yKey: string;
  readonly xAxisLabel?: string;
  readonly yAxisLabel?: string;
  readonly barColor?: string;
  readonly barWidth?: number;
  readonly hoverColor?: string;
  readonly showValues?: boolean;
  readonly tooltipComponent?: any;
  readonly enableCellHover?: boolean;
};

export function CustomBarChart({
  data,
  xKey,
  yKey,
  xAxisLabel,
  yAxisLabel,
  barColor = "#1C7ED6",
  hoverColor = "",
  barWidth = 24,
  showValues = false,
  tooltipComponent,
  enableCellHover = false,
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartMargin = showValues
    ? { top: 28, right: 20, left: 20, bottom: 28 }
    : { top: 10, right: 20, left: 20, bottom: 20 };
  return (
    <div className="w-full h-75">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={chartMargin}
          onMouseLeave={() => setActiveIndex(null)}
          onMouseMove={(state: any) => {
            if (enableCellHover) {
              setActiveIndex(state?.activeTooltipIndex ?? null);
            }
          }}
        >
          {/* X Axis */}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -5,
                    style: { fontSize: 12, fill: "#475467", fontWeight: 500 },
                  }
                : undefined
            }
          />

          {/* Y Axis */}
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "left",
                    offset: 0,
                    style: {
                      fontSize: 12,
                      fill: "#475467",
                      textAnchor: "middle",
                      fontWeight: 500,
                    },
                  }
                : undefined
            }
          />

          {tooltipComponent && (
            <Tooltip
              content={tooltipComponent}
              cursor={false}
              wrapperStyle={{ pointerEvents: "none" }}
            />
          )}

          {/* Bars */}
          <Bar
            dataKey={yKey}
            fill={barColor}
            barSize={barWidth}
            radius={[6, 6, 0, 0]}
            onMouseMove={
              !enableCellHover
                ? (state: any) => {
                    if (
                      state?.activeTooltipIndex !== undefined &&
                      state.activeTooltipIndex !== activeIndex
                    ) {
                      setActiveIndex(state.activeTooltipIndex);
                    }
                  }
                : undefined
            }
            onMouseLeave={() => setActiveIndex(null)}
            label={
              showValues
                ? {
                    position: "top",
                    offset: 8,
                    fontSize: 12,
                    fill: "#475467",
                    formatter: (value: any) => Math.round(Number(value)),
                  }
                : false
            }
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  hoverColor
                    ? index === activeIndex
                      ? hoverColor
                      : barColor
                    : barColor
                }
                onMouseEnter={
                  enableCellHover ? () => setActiveIndex(index) : undefined
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type BarChatDataPoint = {
  label: string;
  value: number;
  color?: string;
};

interface BarChartProps {
  data: BarChatDataPoint[];
  xKey: string;
  yKey: string;
  barColor?: string;
  barWidth?: number;
  hoverColor?: string;
  showValues?: boolean;
  tooltipComponent?: any;
  enableCellHover?: boolean;
  downloadFileName: string;
  className?: string;
  headerClassName?: string;
  title?: string;
  titleClassName?: string;
  actionWrapperClassName?: string;
}

export const BarGraphChart: React.FC<BarChartProps> = (props) => {
  const {
    data,
    xKey,
    yKey,
    barColor,
    barWidth,
    enableCellHover,
    hoverColor,
    showValues,
    tooltipComponent,
    downloadFileName,
    className,
    headerClassName,
    title,
    actionWrapperClassName,
    titleClassName,
  } = props;

  // =============
  // hooks
  // =============
  const {
    chartRef,
    handleDownLoad,
    isFullScreen,
    onMaximize,
    onMinimize,
    fullScreenStyle,
  } = useChartsAction({ downloadFileName });
  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<BarChatDataPoint>(chartRef as any);
  return (
    <div
      ref={chartRef}
      style={fullScreenStyle}
      className={cn(
        "p-4 border relative border-border  rounded-xl flex flex-col gap-1 bg-white",
        className,
      )}
    >
      <div
        className={cn(
          "flex justify-between gap-2",
          headerClassName,
          isFullScreen && "flex-row!",
        )}
      >
        {title && (
          <Text variant="h4" className={titleClassName}>
            {title}
          </Text>
        )}
        <div className={cn("gap-4 flex items-center", actionWrapperClassName)}>
          <IconButton
            name="download"
            size={20}
            className="hover:bg-primary-tint-2! cursor-pointer chart-actions"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            onClick={handleDownLoad}
          />
          {!isFullScreen ? (
            <IconButton
              name="maximize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer chart-actions"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onMaximize}
            />
          ) : (
            <IconButton
              name="minimize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer chart-actions"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onMinimize}
            />
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          {/* X Axis */}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Y Axis */}
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />

          {tooltipComponent && (
            <Tooltip content={tooltipComponent} cursor={false} />
          )}

          {/* Bars */}
          <Bar
            dataKey={yKey}
            fill={barColor}
            barSize={barWidth}
            radius={[6, 6, 0, 0]}
            shape={(props: BarShapeProps) => {
              return (
                <CustomCell
                  {...props}
                  fill={barColor}
                  onMouseMove={handleMouseMove as any}
                  onMouseLeave={handleMouseLeave}
                />
              );
            }}
            label={
              showValues
                ? {
                    position: "top",
                    fontSize: 12,
                    fill: "#475467",
                    formatter: (value: any) => Math.round(Number(value)),
                  }
                : false
            }
          ></Bar>

          {tooltip && (
            <div
              className="absolute pointer-events-none bg-white shadow-md border rounded-md px-3 py-2 text-sm"
              style={{
                top: tooltip.y + 10,
                left: tooltip.x + 10,
              }}
            >
              <div className="text-gray-500">{tooltip?.data?.label}</div>
              <div className="text-primary font-semibold">
                Frequency : {tooltip?.data?.value}
              </div>
            </div>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CustomCellProps extends BarShapeProps {
  payload: any;
  onMouseMove: any;
  onMouseLeave: any;
}
const CustomCell = (props: BarShapeProps) => {
  const {
    x,
    y,
    width,
    height,
    payload,
    index,
    fill,
    onMouseMove,
    onMouseLeave,
  } = props;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={6}
      ry={6}
      fill={fill}
      onMouseMove={(e) => onMouseMove?.(e)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
    />
  );
};
