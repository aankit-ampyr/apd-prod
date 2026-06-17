import type { ReactNode } from "react";
import { cn, formatCurrencyToPound } from "../../../utils";
import { arc, pie } from "d3-shape";
import { IconButton, Text, Skeleton } from "../../../ui-kit";
import { useChartsActionV2, useChartTooltip } from "../../../hooks";
import { DonutSegment } from "../../../interface";
import { WithFallback } from "../../SkelatonWrapper";

/**
 * Defaults for Donut Chart
 */
const SEGMENTED_DONUT_SIZE = 240;
const SEGMENTED_DONUT_STROKE_WIDTH = 20;
const SEGMENTED_DONUT_SEGMENT_RADIUS = 8;

type DonutDataSegment = {
  color: string;
} & DonutSegment;

type ShapeConfig = {
  size?: number;
  strokeWidth?: number;
  radius?: number;
  offset?: number;
  segmentRadius?: number;
  padAngle: number;
};
type DonutOrientation = "vertical" | "horizontal";
interface SegmentedDonutChartProps {
  data: DonutDataSegment[];
  className?: string;
  headerClassName?: string;
  actionWrapperClassName?: string;
  downloadFileName: string;
  title?: string;
  titleClassName?: string;
  shapeConfig?: ShapeConfig;
  graphContainerClassName?: string;
  graphWrapperClassName?: string;
  isFullScreenOverride?: boolean;
  legendContainerClassName?: string;
  orientation?: DonutOrientation;
  isLoading?: boolean;
  renderTooltip?: (tooltip: {
    label: string;
    value: number;
    percentage: number;
    color: string;
  }) => ReactNode;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export function SegmentedDonutChart(props: SegmentedDonutChartProps) {
  const {
    data,
    className,
    headerClassName,
    downloadFileName,
    actionWrapperClassName,
    titleClassName,
    title,
    shapeConfig,
    graphContainerClassName,
    isFullScreenOverride,
    legendContainerClassName,
    graphWrapperClassName,
    orientation = "vertical",
    isLoading = false,
    renderTooltip,
  } = props;

  // =============
  // hooks
  // =============
  const { chartRef, handleDownLoad, onMaximize, onMinimize } =
    useChartsActionV2({
      downloadFileName,
      renderFullScreen: () => {
        return <SegmentedDonutChart {...props} isFullScreenOverride />;
      },
    });

  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<DonutDataSegment>(chartRef as any);

  const isFullScreen = isFullScreenOverride;
  const isHorizontal = orientation === "horizontal";

  // Chart config
  function getSizeUnits(unit: number) {
    if (isFullScreen) {
      return unit * 1.7;
    }
    return unit;
  }
  const size = shapeConfig?.size || getSizeUnits(SEGMENTED_DONUT_SIZE);
  const strokeWidth =
    shapeConfig?.strokeWidth || getSizeUnits(SEGMENTED_DONUT_STROKE_WIDTH);
  const radius = shapeConfig?.radius || getSizeUnits(SEGMENTED_DONUT_SIZE) / 2;
  const innerRadius = radius - strokeWidth;

  const pieGenerator = pie<DonutDataSegment>()
    .value((d) => d.value)
    .sort(null)
    .padAngle(shapeConfig?.padAngle || 0.04)
    .startAngle(degToRad(shapeConfig?.offset || 0))
    .endAngle(degToRad(shapeConfig?.offset || 0) + 360);

  const arcGenerator = arc<any>()
    .innerRadius(innerRadius)
    .outerRadius(radius)  
    .cornerRadius(shapeConfig?.segmentRadius || SEGMENTED_DONUT_SEGMENT_RADIUS); // rounded edges

  /**
   * convert negative values into positive
   */
  const arcs = pieGenerator(
    data?.map((item) => ({
      ...item,
      value: Math.abs(item.value),
    })),
  );

  return (
    <div
      ref={chartRef}
      className={cn(
        "p-4 border relative border-border rounded-xl grow flex flex-col gap-1 bg-white overflow-x-auto",
        className,
      )}
    >
      <div className="flex flex-col gap-1 min-w-70 grow">
        <div
          className={cn(
            "flex justify-between gap-2",
            headerClassName,
            isFullScreen && "flex-row! p-4",
          )}
        >
          {title && (
            <Text variant="h4" className={titleClassName}>
              {title}
            </Text>
          )}
          {!isLoading && (
            <div
              className={cn(
                "gap-4 flex items-center chart-actions",
                actionWrapperClassName,
              )}
            >
              <IconButton
                name="download"
                size={20}
                className="hover:bg-primary-tint-2! cursor-pointer"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
                onClick={handleDownLoad}
              />
              {!isFullScreen ? (
                <IconButton
                  name="maximize"
                  size={20}
                  className="hover:bg-primary-tint-2! cursor-pointer"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={isFullScreen ? undefined : onMaximize}
                />
              ) : (
                <IconButton
                  name="minimize"
                  size={20}
                  className="hover:bg-primary-tint-2! cursor-pointer"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={onMinimize}
                />
              )}
            </div>
          )}
        </div>

        {/* chart + legend ui */}
        <div
          className={cn(
            "flex gap-4",
            isHorizontal ? "flex-row items-center justify-between gap-10" : "flex-col",
            graphWrapperClassName,
          )}
        >
          {/* Donut Chart */}
          <div
            className={cn(
              "flex justify-center items-center mt-6 shrink-0",
              isHorizontal && "mt-0",
              graphContainerClassName,
            )}
          >
            <WithFallback
              isLoading={isLoading}
              fallback={
                <div
                  style={{ position: "relative", width: size, height: size }}
                >
                  <Skeleton
                    animation="wave"
                    variant="circular"
                    width={size}
                    height={size}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: SEGMENTED_DONUT_STROKE_WIDTH,
                      left: SEGMENTED_DONUT_STROKE_WIDTH,
                      width: size - SEGMENTED_DONUT_STROKE_WIDTH * 2,
                      height: size - SEGMENTED_DONUT_STROKE_WIDTH * 2,
                      borderRadius: "50%",
                      background: "#fff", // cut out center
                    }}
                  />
                </div>
              }
            >
              <svg width={size} height={size}>
                <g transform={`translate(${radius}, ${radius})`}>
                  {arcs.map((arcData, i) => {
                    const item = data[i];
                    return (
                      <path
                        key={i}
                        d={arcGenerator(arcData)!}
                        fill={data[i].color}
                        onMouseMove={(e) => handleMouseMove(e, item)}
                        onMouseLeave={handleMouseLeave}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </g>
              </svg>
            </WithFallback>
          </div>

          {!isLoading && tooltip && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -120%)",
              }}
            >
              <SegmentedDonutToolTip
                label={tooltip.data.label}
                value={tooltip.data.value}
                percentage={
                  (tooltip.data.value / data.reduce((a, b) => a + b.value, 0)) *
                  100
                }
                color={tooltip.data.color}
                renderTooltip={renderTooltip}
              />
            </div>
          )}

          {/* Legend */}
          <WithFallback
            isLoading={isLoading}
            fallback={
              <div
                className={cn(
                  "grid grid-cols-2 mt-2",
                  isHorizontal ? "gap-x-16 gap-y-6" : "gap-x-4 gap-y-6",
                )}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="flex gap-4 justify-start">
                    <Skeleton
                      animation="wave"
                      variant="circular"
                      width={16}
                      height={16}
                    />
                    <Skeleton
                      animation="wave"
                      variant="rounded"
                      width={90}
                      height={16}
                      className="rounded-full! justify-self-center"
                    />
                  </span>
                ))}
              </div>
            }
          >
            <div
              className={cn(
                "grid grid-cols-2 gap-4",
                isHorizontal ? "mt-2 gap-x-16 gap-y-6 content-start" : "mt-8",
                legendContainerClassName,
                isFullScreen &&
                  "grid-cols-none grid-rows-none flex flex-wrap mb-auto justify-evenly",
              )}
            >
              {data.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <Text variant="body2" className="text-text-primary!">
                    {item.label}
                  </Text>
                </div>
              ))}
            </div>
          </WithFallback>
        </div>
      </div>
    </div>
  );
}

const SegmentedDonutToolTip = ({
  label,
  value,
  percentage,
  color,
  className,
  renderTooltip,
}: any) => {
  if (renderTooltip) {
    return <>{renderTooltip({label, value, percentage, color})}</>;
  }

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg shadow-md bg-[#FAFDFF] min-w-30 flex flex-col gap-1 border border-border",
        className,
      )}
    >
      {/* Label */}
      <Text variant="small" className="text-text-secondary! text-nowrap">
        Source: {label}
      </Text>

      {/* Value */}
      <Text
        variant="small"
        className="text-text-primary! text-nowrap font-InterMedium!"
      >
        Value: {formatCurrencyToPound(value)}
      </Text>

      {/* Percentage */}
      {percentage !== undefined && (
        <Text
          variant="small"
          className="font-semibold! text-primary! text-nowrap"
        >
          Share: {Math.abs(percentage.toFixed(1))}%
        </Text>
      )}
    </div>
  );
};
