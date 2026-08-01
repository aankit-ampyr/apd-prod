import React from "react";
import { cn } from "../../../utils";
import { IconButton, Skeleton, Text } from "../../../ui-kit";
import {
  useChartTooltip,
  useChartsActionV2,
  useContainerDimentions,
} from "../../../hooks";

interface CorrelationMatrixProps {
  labels: string[];
  data: number[][];
  showGuidelines?: boolean;
  cellSize?: number;
  className?: string;
  isLoading?: boolean;
  downloadFileName?: string;
  customActions?: React.ReactNode;
}

type ColorAndLabel = {
  color: string;
  textColor: string;
  label: string;
};

type GuideRow = {
  range: string;
  label: string;
  color: string;
  textColor?: string;
};

type CorrelationTooltipData = {
  rowLabel: string;
  colLabel: string;
  value: number;
} & ColorAndLabel;

const getColorAndLabel = (value: number): ColorAndLabel => {
  if (value === 1) {
    return { color: "#00582E", textColor: "white", label: "Perfect Positive" };
  }
  if (value >= 0.8) {
    return { color: "#008A27", textColor: "white", label: "Strong Positive" };
  }
  if (value >= 0.6) {
    return { color: "#47C200", textColor: "white", label: "Moderate Positive" };
  }
  if (value >= 0.4) {
    return { color: "#E1DA00", textColor: "white", label: "Weak Positive" };
  }
  if (value >= 0) {
    return {
      color: "#FFDBD8",
      textColor: "var(--color-error-text)",
      label: "No Correlation",
    };
  }
  if (value >= -0.49) {
    return { color: "#CB3C2B", textColor: "white", label: "Weak Negative" };
  }
  return {
    color: "#8F0000",
    textColor: "white",
    label: "Strong Negative",
  };
};

function formatCorrelationValue(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function getGuideRows() {
  return [
    { range: "1.0", label: "Perfect Positive", color: "#00582E" },
    { range: "0.80 to 0.99", label: "Strong Positive", color: "#008A27" },
    { range: "0.60 to 0.79", label: "Moderate Positive", color: "#47C200" },
    { range: "0.40 to 0.59", label: "Weak Positive", color: "#E1DA00" },
    {
      range: "0.00 to 0.39",
      label: "No Correlation",
      color: "#FFDBD8",
      textColor: "var(--color-error-text)",
    },
    { range: "-0.01 to -0.49", label: "Weak Negative", color: "#CB3C2B" },
    { range: "-0.50 to -1.00", label: "Strong Negative", color: "#8F0000" },
  ] as GuideRow[];
}

function getInterpretation(label: string) {
  switch (label) {
    case "Perfect Positive":
      return "Prices move perfectly together.";
    case "Strong Positive":
      return "Prices move very closely together.";
    case "Moderate Positive":
      return "Prices move in a broadly similar direction.";
    case "Weak Positive":
      return "Prices move together, but only slightly.";
    case "Low Relation":
      return "Prices show little relationship.";
    case "Weak Negative":
      return "Prices move slightly in opposite directions.";
    case "Strong Negative":
      return "Prices move strongly in opposite directions.";
    default:
      return "Relationship is unavailable.";
  }
}

export function CorrelationMatrix(props: CorrelationMatrixProps) {
  const {
    labels,
    data,
    showGuidelines = true,
    className,
    isLoading = false,
    downloadFileName = "correlation_matrix.png",
    customActions,
  } = props;

  /**
   * ===============================
   * Hooks
   * ===============================
   */
  const { chartRef, handleDownLoad } = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <CorrelationMatrix {...props} />,
  });
  const { tooltip, handleMouseMove, handleMouseLeave } =
    useChartTooltip<CorrelationTooltipData>(chartRef as any);

  const { width } = useContainerDimentions(chartRef, {method: 'contentRect'});
  /**
   * ===============================
   * Derived states
   * ===============================
   */
  const cellSize = (() => {
    if (width < 940){
      return 130;
    }
    if (width < 1020) {
      return 100;
    }
    if (width < 1180) {
      return 110;
    }
    if (width < 1200) {
      return 115;
    }
    if (width < 1250) {
      return 120;
    }
    if (width < 1300) {
      return 125;
    }
    if (width < 1350) {
      return 130;
    }
    if (width < 1400) {
      return 135;
    }
    return 140;
  })();
  const resolvedRows = labels.map((rowLabel, rowIndex) => ({
    label: rowLabel,
    values: data[rowIndex] ?? [],
  }));

  const guideRows = getGuideRows();
  const rowLabelWidth = 95;
  const gridTemplateColumns = `${rowLabelWidth}px repeat(${labels.length}, ${cellSize}px)`;

  return (
    <div
      ref={chartRef}
      style={{
        padding: (() => {
          if (width < 1020) {
            return 16;
          }
          if (width < 1180) {
            return 20;
          }
          if (width < 1200) {
            return 28;
          }
          if (width < 1250) {
            return 32;
          }
          if (width < 1300) {
            return 36;
          }
          return 40;
        })(),
      }}
      className={cn(
        "flex flex-col @container gap-2 bg-white border border-border rounded-lg",
        className,
      )}
    >
      {!isLoading && (
        <div className="flex justify-end gap-3 items-center shrink-0 flex-nowrap chart-actions -translate-y-2">
          {customActions}
          {downloadFileName && (
            <IconButton
              name="download"
              size={16}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={handleDownLoad}
            />
          )}
        </div>
      )}
      <div
        onMouseLeave={handleMouseLeave}
        className={cn(
          "flex gap-6 @[1180px]:gap-10 flex-col @[960px]:flex-row items-start relative",
        )}
      >
        <div className="overflow-x-auto self-center @[960px]:self-auto shrink-0 ">
          <div className="inline-flex flex-col gap-2 min-w-max shrink-0">
            <div
              className="grid gap-1.5 w-max shrink-0"
              style={{
                gridTemplateColumns,
              }}
            >
              <div />
              {labels.map((label, labelIndex) => (
                <div
                  key={`${label}-${labelIndex}`}
                  className="flex items-center justify-center px-2 text-center shrink-0"
                  style={{ width: cellSize, minHeight: 48 }}
                >
                  <Text
                    variant="16SB"
                    className="text-text-primary! uppercase leading-tight"
                  >
                    {label}
                  </Text>
                </div>
              ))}

              {resolvedRows.map((row, rowIndex) => (
                <React.Fragment key={`${row.label}-${rowIndex}`}>
                  <div
                    className="flex items-center justify-end pr-2 text-right shrink-0"
                    style={{ width: rowLabelWidth, minHeight: cellSize }}
                  >
                    <Text
                      variant="16SB"
                      className="text-text-primary! uppercase leading-tight whitespace-nowrap"
                    >
                      {row.label}
                    </Text>
                  </div>

                  {labels.map((colLabel, colIndex) => {
                    const value = row.values[colIndex];
                    const isValidValue =
                      typeof value === "number" && Number.isFinite(value);
                    const resolved = isValidValue
                      ? getColorAndLabel(value)
                      : {
                          color: "var(--color-background-secondary)",
                          textColor: "var(--color-text-secondary)",
                          label: "Unavailable",
                        };
                    const isLoadingCell = isLoading;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="rounded-xl border border-white/80 shadow-sm flex items-center justify-center text-center transition-transform duration-150 shrink-0 cursor-pointer"
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isLoadingCell
                            ? undefined
                            : resolved.color,
                          color: resolved.textColor,
                        }}
                        onMouseMove={(event) => {
                          if (!isValidValue || isLoadingCell) return;
                          const containerRect =
                            chartRef.current?.getBoundingClientRect();
                          const cellRect =
                            event.currentTarget.getBoundingClientRect();

                          const tooltipPosition =
                            containerRect && cellRect
                              ? {
                                  x:
                                    cellRect.left -
                                    containerRect.left +
                                    cellRect.width / 2 -
                                    48,
                                  y: cellRect.top - containerRect.top - 10,
                                }
                              : undefined;

                          handleMouseMove(
                            event,
                            {
                              rowLabel: row.label,
                              colLabel,
                              value,
                              ...resolved,
                            },
                            tooltipPosition,
                          );
                        }}
                        onMouseLeave={handleMouseLeave}
                      >
                        {isLoadingCell ? (
                          <Skeleton
                            variant="rounded"
                            width={cellSize - 20}
                            height={cellSize - 20}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center px-2 leading-tight">
                            <Text
                              variant="18SB"
                              style={{ color: resolved.textColor }}
                            >
                              {isValidValue
                                ? formatCorrelationValue(value)
                                : "-"}
                            </Text>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {!isLoading && tooltip && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <CorrelationMatrixTooltip data={tooltip.data} />
          </div>
        )}

        {!isLoading && showGuidelines && (
          <div className="w-full grow rounded-2xl border border-border bg-white p-5 shadow-sm">
            <Text variant="h4" className="text-text-primary! mb-4">
              Correlation Range Guide
            </Text>

            <div className="flex flex-col gap-x-6 gap-y-4">
              {/* header for guidelines */}
              <div className="grid grid-cols-[1fr_180px] items-center mr-6">
                <Text variant="14SB" className="text-text-secondary!">
                  Correlation Range
                </Text>
                <Text
                  variant="14SB"
                  className="text-text-secondary! text-center"
                >
                  Label
                </Text>
              </div>

              {guideRows.map((row) => (
                <div
                  className="flex px-4 justify-between border-border border-t"
                  key={row.label}
                >
                  <div className="flex items-center gap-2 border-border pt-4">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <Text variant="14R" className="text-text-primary!">
                      {row.range}
                    </Text>
                  </div>
                  <div className="pt-4 flex items-center justify-end">
                    <Text
                      variant="caption"
                      className="rounded-full w-[180px] text-center! px-4 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor:
                          row.color === "#FFDBD8" ? "#ffd8d4" : row.color,
                        color: row.textColor ?? "white",
                      }}
                    >
                      {row.label}
                    </Text>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div
                className="h-3 rounded-full overflow-hidden"
                style={{
                  background:
                    "linear-gradient(90deg, #8F0000 0%, #CB3C2B 25%, #FFDBD8 50%, #E1DA00 62.5%, #47C200 75%, #008A27 87.5%, #00582E 100%)",
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                {["-1.0", "-0.5", "0", "0.5", "1.0"].map((tick) => (
                  <Text
                    key={tick}
                    variant="caption"
                    className="text-text-secondary!"
                  >
                    {tick}
                  </Text>
                ))}
              </div>
              <Text
                variant="14R"
                className="text-text-secondary! text-center mt-2"
              >
                Scale: -1 to 1
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CorrelationMatrixTooltip({ data }: { data: CorrelationTooltipData }) {
  return (
    <div
      className="relative rounded-lg bg-white p-4 shadow-md border max-w-70"
      style={{ borderColor: data.color }}
    >
      <div
        className="absolute left-1/2 top-full size-6 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white border-b border-r"
        style={{ borderColor: data.color }}
      />

      <Text variant="14M" className="text-text-secondary!">
        Market Pair :{" "}
        <span className="text-text-primary! font-InterSemiBold">
          {data.rowLabel} vs {data.colLabel}
        </span>
      </Text>

      <Text variant="14M" className=" leading-h4 text-text-secondary!">
        Correlation :{" "}
        <span className="text-text-primary! font-InterSemiBold">
          {formatCorrelationValue(data.value)}
        </span>
      </Text>

      <Text
        variant="14M"
        className="leading-h4 font-InterMedium!"
        style={{ color: data.color }}
      >
        Label : {data.label}
      </Text>

      <Text variant="14M" className="text-text-secondary!">
        Interpretation :{" "}
        <span className="text-text-primary! font-InterSemiBold">
          {getInterpretation(data.label)}
        </span>
      </Text>
    </div>
  );
}
