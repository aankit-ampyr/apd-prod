import React from "react";
import {
  Align,
  HorizontalTableColumn,
  HorizontalTableMetric,
} from "../../interface";
import { cn } from "../../utils";
import { Skeleton, Text } from "../../ui-kit";

interface AnalyticsHorizontalTableProps<T> {
  data: T[];
  metrics: HorizontalTableMetric<T>[];
  columnHeader: HorizontalTableColumn<T>;
  loading?: boolean;
  title?: React.ReactNode;
  className?: string;
  metricTitle?: string | React.ReactNode;
  wrapperClassName?: string;
  tableClassName?: string;
  headerColor?: string;
  errorMessage?: string;
  metricColumnWidth?: number;
  dataColumnMinWidth?: number;
  noDataMessage?: string;
}

export function AnalyticsHorizontalTable<T>(
  props: AnalyticsHorizontalTableProps<T>,
) {
  const {
    data,
    metrics,
    columnHeader,
    loading,
    title,
    className,
    wrapperClassName,
    tableClassName,
    headerColor = "#EEF0F5",
    errorMessage,
    noDataMessage,
    metricTitle,
    metricColumnWidth = 240,
    dataColumnMinWidth = 120,
  } = props;
  const ghostColumns = 6;

  const getAlignClass = (align?: Align) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const totalColumns = (loading ? ghostColumns : data.length) + 1;

  const equalWidth = `${100 / totalColumns}%`;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-border",
          wrapperClassName,
        )}
      >
        {title && (
          <div className="border-b border-border px-5 py-3">
            {typeof title === "string" ? (
              <Text variant="body2">{title}</Text>
            ) : (
              title
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            className={cn("w-full border-collapse table-fixed", tableClassName)}
          >
            <colgroup>
              <col
                style={{
                  width: equalWidth,
                  minWidth: metricColumnWidth,
                }}
              />

              {(loading ? Array.from({ length: ghostColumns }) : data).map(
                (_, index) => (
                  <col
                    key={index}
                    style={{
                      width: equalWidth,
                      minWidth: dataColumnMinWidth,
                    }}
                  />
                ),
              )}
            </colgroup>
            <thead style={{ backgroundColor: headerColor }}>
              <tr>
                <th
                  className="sticky left-0 z-30 border-b border-r border-border bg-inherit px-4 py-3 font-semibold"
                  style={{
                    backgroundColor: headerColor,
                    minWidth: metricColumnWidth,
                  }}
                >
                  {metricTitle || "Metrics"}
                </th>

                {(loading ? Array.from({ length: ghostColumns }) : data).map(
                  (column: any, index) => (
                    <th
                      key={index}
                      className={cn(
                        "border-b border-r border-border px-4 py-3 font-semibold whitespace-nowrap",
                        getAlignClass(columnHeader.align),
                        columnHeader.className,
                      )}
                    >
                      {loading ? (
                        <Skeleton
                          animation="wave"
                          variant="rectangular"
                          className="mx-auto h-4 w-20 rounded-full"
                        />
                      ) : (
                        columnHeader.render(column, index)
                      )}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="">
              {metrics.length > 0 ? (
                metrics.map((metric) => (
                  <tr
                    key={metric.key}
                    className="border-b border-border last:border-b-0"
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-20 border-r border-border bg-white px-4 py-3 font-medium",
                        metric.rowHeaderClassName,
                      )}
                      style={{
                        minWidth: metricColumnWidth,
                      }}
                    >
                      {metric.rowHeader}
                    </td>

                    {(loading
                      ? Array.from({ length: ghostColumns })
                      : data
                    ).map((column: any, index) => (
                      <td
                        key={`${metric.key}-${index}`}
                        className={cn(
                          "border-r border-border px-4 py-3 whitespace-nowrap",
                          getAlignClass(metric.align),
                          metric.cellClassName,
                        )}
                      >
                        {loading ? (
                          <Skeleton
                            animation="wave"
                            variant="rectangular"
                            className="mx-auto h-4 w-20 rounded-full"
                          />
                        ) : metric.render ? (
                          metric.render(column, index)
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={data.length + 1} className="py-6 text-center">
                    {noDataMessage ?? errorMessage ?? "No data available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
