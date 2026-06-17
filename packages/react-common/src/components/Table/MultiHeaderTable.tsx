import React from "react";
import { cn } from "../../utils";
import { Skeleton, Text } from "../../ui-kit";
import {
  Align,
  GroupedTableBaseColumn,
  GroupedTableBaseSubColumn,
} from "../../interface";

interface ColumnGroup {
  title: React.ReactNode;
  accessor: string;
}

interface AnalyticsGroupedTableProps<T> {
  data: T[];
  columns: GroupedTableBaseColumn<T>[];
  groups: ColumnGroup[];
  subColumns: GroupedTableBaseSubColumn[];
  loading?: boolean;
  title?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  headerColor?: string;
  errorMessage?: string;
}

export function AnalyticsGroupedTable<T>({
  data,
  columns,
  groups,
  subColumns,
  loading,
  title,
  className,
  wrapperClassName,
  tableClassName,
  headerColor = "#EEF5F5",
  errorMessage,
}: AnalyticsGroupedTableProps<T>) {
  const ghostRows = 3;

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
          <table className={cn("w-full border-collapse", tableClassName)}>
            <thead style={{ backgroundColor: headerColor }}>
              {/* Row 1 */}
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    rowSpan={2}
                    className={cn(
                      "border-b border-r border-border px-4 py-3 font-semibold",
                      getAlignClass(column.align),
                    )}
                    style={{
                      width: column.width,
                    }}
                  >
                    {column.title}
                  </th>
                ))}

                {groups.map((group) => (
                  <th
                    key={group.accessor}
                    colSpan={subColumns.length}
                    className="border-b border-r border-border px-4 py-3 text-center font-semibold"
                  >
                    {group.title}
                  </th>
                ))}
              </tr>

              {/* Row 2 */}
              <tr>
                {groups.flatMap((group) =>
                  subColumns.map((sub) => (
                    <th
                      key={`${group.accessor}-${sub.key}`}
                      className={cn(
                        "border-b border-r border-border px-4 py-3 font-medium",
                        getAlignClass(sub.align),
                      )}
                    >
                      {sub.title}
                    </th>
                  )),
                )}
              </tr>
            </thead>

            <tbody>
              {data.length ? (
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-border last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "border-r border-border px-4 py-3",
                          getAlignClass(column.align),
                        )}
                      >
                        {loading ? (
                          <div
                            className={cn(
                              "w-full",
                              getAlignClass(column.align),
                            )}
                          >
                            <Skeleton
                              animation="wave"
                              variant="rectangular"
                              className={cn("mx-auto h-4 w-20 rounded-full", {
                                "mr-auto ml-0":
                                  column.align === "left" || !column.align,
                                "ml-auto mr-0": column.align === "right",
                              })}
                            />
                          </div>
                        ) : column.renderCell ? (
                          column.renderCell(row)
                        ) : (
                          (row as any)[column.key]
                        )}
                      </td>
                    ))}

                    {groups.flatMap((group) =>
                      subColumns.map((sub) => {
                        const value = (row as any)?.[group.accessor]?.[sub.key];

                        return (
                          <td
                            key={`${rowIndex}-${group.accessor}-${sub.key}`}
                            className={cn(
                              "border-r border-border px-4 py-3",
                              getAlignClass(sub.align),
                            )}
                          >
                            {loading ? (
                              <div
                                className={cn(
                                  "w-full",
                                  getAlignClass(sub.align),
                                )}
                              >
                                <Skeleton
                                  animation="wave"
                                  variant="rectangular"
                                  className={cn(
                                    "mx-auto h-4 w-20 rounded-full",
                                    {
                                      "mr-auto ml-0":
                                        sub.align === "left" || !sub.align,
                                      "ml-auto mr-0": sub.align === "right",
                                    },
                                  )}
                                />
                              </div>
                            ) : sub.renderCell ? (
                              sub.renderCell(value, row)
                            ) : (
                              value
                            )}
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))
              ) : loading ? (
                Array.from({ length: ghostRows }).map((_, rowIndex) => (
                  <tr
                    key={`ghost-${rowIndex}`}
                    className="border-b border-border last:border-b-0"
                  >
                    {columns.map((column) => (
                      <td
                        key={`ghost-column-${rowIndex}-${column.key}`}
                        className={cn(
                          "border-r border-border px-4 py-3",
                          getAlignClass(column.align),
                        )}
                      >
                        <div
                          className={cn("w-full", getAlignClass(column.align))}
                        >
                          <Skeleton
                            animation="wave"
                            variant="rectangular"
                            className={cn("mx-auto h-4 w-20 rounded-full", {
                              "mr-auto ml-0":
                                column.align === "left" || !column.align,
                              "ml-auto mr-0": column.align === "right",
                            })}
                          />
                        </div>
                      </td>
                    ))}

                    {groups.flatMap((group) =>
                      subColumns.map((sub) => (
                        <td
                          key={`ghost-sub-${rowIndex}-${group.accessor}-${sub.key}`}
                          className={cn(
                            "border-r border-border px-4 py-3",
                            getAlignClass(sub.align),
                          )}
                        >
                          <div
                            className={cn("w-full", getAlignClass(sub.align))}
                          >
                            <Skeleton
                              animation="wave"
                              variant="rectangular"
                              className={cn("mx-auto h-4 w-20 rounded-full", {
                                "mr-auto ml-0":
                                  sub.align === "left" || !sub.align,
                                "ml-auto mr-0": sub.align === "right",
                              })}
                            />
                          </div>
                        </td>
                      )),
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + groups.length * subColumns.length}
                    className="py-6 text-center"
                  >
                    {errorMessage ?? "No data available"}
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
