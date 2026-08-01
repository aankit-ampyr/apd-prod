import React from "react";
import { useChartsActionV2 } from "../../../../hooks";
import { IconButton, Skeleton, Text } from "../../../../ui-kit";
import { cn } from "../../../../utils";
import { WithFallback } from "../../../SkelatonWrapper";

export type ProgressHorizontalBarComparisonData = {
  name: string;
  value: number;
  color?: string;
  smallXtickFormatter?: (value: number | string) => string | number;
  customActions?: React.ReactNode;
};

interface ProgressComparisonHorizontalBarProps {
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
  className?: string;
  header?: string | React.ReactNode;
  isLoading?: boolean;
  scale?: string;
  scaleTextClassName?: string;
  data?: ProgressHorizontalBarComparisonData[];
  barColor?: string;
  barHeight?: number;
  barRadius?: number;
  barGap?: number;
  valueTextColor?: string;
  customActions?: React.ReactNode;
}
export function ProgressComparisonHorizontalBar(
  props: ProgressComparisonHorizontalBarProps,
) {
  const {
    downloadFileName = "",
    className,
    header,
    isLoading = false,
    isFullScreenOverride: isFullScreen,

    scale = "",
    scaleTextClassName = "",
    barColor,
    barGap = 30,
    barHeight = 30,
    barRadius = 4,
    data,
    valueTextColor,
    customActions,
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
        <ProgressComparisonHorizontalBar {...props} isFullScreenOverride />
      ),
    });

  /**
   * ====================================
   * Derived States
   * ====================================
   */
  const maxDataValue = Math.max(...(props.data?.map((d) => d.value) ?? [0]));

  const scaleMax = maxDataValue < 60 ? 60 : Math.ceil(maxDataValue / 20) * 20;

  return (
    <div
      ref={chartRef}
      className={cn(
        "bg-[#FBFBFC] border border-border py-4 px-6 rounded-sm flex flex-col",
        // isFullScreen && "grow",
      )}
    >
      <div className={`flex items-start justify-between mb-4 ${className}`}>
        {header && typeof header === "string" ? (
          <Text variant="h3" className="text-lg font-semibold">
            {header}
          </Text>
        ) : (
          header
        )}

        {!isLoading && (
          <div className="flex shrink-0 items-center flex-nowrap gap-3 chart-actions">
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

      {!isLoading && (
        <Text
          variant="14M"
          className={cn("text-text-secondary! text-end", scaleTextClassName)}
        >
          scale: {scale}
        </Text>
      )}

      {/* bars */}
      <div className="flex flex-col mt-4" style={{ gap: `${barGap}px` }}>
        {data?.map((item) => {
          const width = (item.value / scaleMax) * 100;

          return (
            <div
              key={item.name}
              className="grid grid-cols-[100px_1fr_60px] items-center gap-5"
            >
              {/* Label */}
              <WithFallback
                isLoading={isLoading}
                fallback={<Skeleton className="rounded-full" />}
              >
                <Text
                  variant="16M"
                  className="text-text-primary whitespace-nowrap"
                >
                  {item.name}
                </Text>
              </WithFallback>

              {/* Progress */}

              <WithFallback
                isLoading={isLoading}
                fallback={<Skeleton className="rounded-sm h-8!" />}
              >
                <div
                  className="w-full bg-[#F0F1F3] overflow-hidden"
                  style={{ height: barHeight, borderRadius: barRadius }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${width}%`,
                      backgroundColor: item.color || barColor,
                      borderRadius: barRadius,
                    }}
                  />
                </div>
              </WithFallback>

              {/* Value */}
              <WithFallback
                isLoading={isLoading}
                fallback={<Skeleton className="rounded-full w-10" />}
              >
                <Text
                  variant="14M"
                  style={{ color: item.color || valueTextColor || barColor }}
                  className="text-primary-tint-1 whitespace-nowrap"
                >
                  {item.value} {scale}
                </Text>
              </WithFallback>
            </div>
          );
        })}
      </div>
    </div>
  );
}
