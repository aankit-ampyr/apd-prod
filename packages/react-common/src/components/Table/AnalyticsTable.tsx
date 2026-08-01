import { useMemo, useState } from "react";
import { DataTableColumn } from "../../interface";
import { cn } from "../../utils";
import { Skeleton, Text } from "../../ui-kit";
import { getColumnWidthStyles } from "./utils";
import { WithFallback } from "../SkelatonWrapper";

interface AnalyticsTableProps {
  data: any[];
  columns: DataTableColumn<any>[];
  title?: React.ReactNode;
  loading?: boolean;
  errorMessage?: string;
  stickyHeader?: boolean;
  headerColor?: string;
  rowAlign?: "items-center" | "items-start" | "items-end";
  className?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  rowHover?: boolean;
  titleClassName?:string;
  titleContainerClassName?:string;
  tableHeightWhenScrollable?: number;
  noDataMessage?: string | React.ReactNode;
  rowClassName?: string | ((props: {row: any; index: number; isHovered: boolean}) => string | undefined);
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = (props) => {
  const {
    data = [],
    columns = [],
    title,
    loading = false,
    errorMessage,
    stickyHeader,
    rowAlign = "center",
    className,
    headerColor,
    tableClassName,
    wrapperClassName,
    titleClassName,
    titleContainerClassName,
    rowHover,
    tableHeightWhenScrollable = 600,
    noDataMessage,
    rowClassName,
  } = props;

  const getAlignClass = (align: DataTableColumn<any>["align"]) => {
    switch (align) {
      case "center":
        return "text-center justify-center mx-auto!";
      case "right":
        return "text-right justify-end ml-auto!";
      default:
        return "text-left justify-start mr-auto!";
    }
  };

  const getGhostAlignClass = (align: DataTableColumn<any>["align"]) => {
    switch (align) {
      case "center":
        return "justify-center";
      case "right":
        return "justify-end";
      default:
        return "justify-start";
    }
  };

  const getRowAlignClass = (
    align: "items-center" | "items-start" | "items-end",
  ) => {
    switch (align) {
      case "items-start":
        return "align-top";
      case "items-end":
        return "align-bottom";
      default:
        return "align-middle";
    }
  };

  const empty = useMemo(() => {
    return data.length === 0;
  }, [data.length]);

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  const getRowClassName = (row: any, index: number) => {
    if (typeof rowClassName === "function") {
      return rowClassName({
        row,
        index,
        isHovered: hoveredRowIndex === index,
      });
    }

    return rowClassName;
  };

  const getCellClassName = (
    col: DataTableColumn<any>,
    row: any,
    index: number,
  ) => {
    if (typeof col.cellClassName === "function") {
      return col.cellClassName({
        row,
        index,
        width: col.width,
        isHovered: hoveredRowIndex === index,
      });
    }

    return col.cellClassName;
  };

  return (
    <div className={cn("w-full ", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-md border border-border",
          wrapperClassName,
        )}
      >
        {title && (
          <div className={cn("border-b border-border px-5 py-3", titleContainerClassName)}>
            {typeof title === "string" ? (
              <Text variant="body2" className={cn("text-text-primary!", titleClassName)}>
                {title}
              </Text>
            ) : (
              title
            )}
          </div>
        )}
        <div
          className={cn(
            "relative overflow-x-auto",
            stickyHeader && "overflow-y-auto",
            
          )}
          style={stickyHeader ? { maxHeight: tableHeightWhenScrollable } : {}}
        >
          <table className={cn("w-full table-fixed", tableClassName)}>
            <thead
              className={cn(
                "border-b border-border text-xs font-bold tracking-wider",
                stickyHeader && "sticky top-0 z-10",
              )}
              style={{ backgroundColor: headerColor || "#EEF0F5" }}
            >
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`px-5 py-3 text-nowrap! font-InterSemiBold! text-secondary! ${getAlignClass(col.headerAlign || col.align)} ${col.headerClassName || ""}`}
                    style={
                      empty
                        ? {
                            textWrap: "nowrap",
                          }
                        : getColumnWidthStyles(col.width)
                    }
                  >
                    {typeof col.title === "string" ? (
                      <Text
                        variant="small"
                        className={cn(
                          "flex size-full items-center",
                          getAlignClass(col.headerAlign || col.align),
                          empty && "text-nowrap",
                        )}
                      >
                        {col.title}
                      </Text>
                    ) : (
                      col.title
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white">
              {data.length === 0 && loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-3">
                    <Text
                      variant="12M"
                      className="text-text-secondary! text-center "
                    >
                      Loading...
                    </Text>
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr
                  key={rowIndex}
                  onMouseEnter={() => setHoveredRowIndex(rowIndex)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                  className={cn(
                      "border-b border-border  last:border-b-0",
                      rowHover && "hover:bg-slate-50",
                      getRowClassName(row, rowIndex),
                    )}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className={cn(
                          `px-5 py-3 text-small text-secondary font-InterRegular whitespace-nowrap ${getAlignClass(col.align)} ${getRowAlignClass(rowAlign as any)}`,
                          getCellClassName(col, row, rowIndex),
                        )}
                        style={getColumnWidthStyles(col.width)}
                      >
                        <WithFallback
                          isLoading={loading}
                          fallback={
                            <div
                              className={cn(
                                "w-full flex justify-center",
                                getGhostAlignClass(col.align),
                              )}
                            >
                              <Skeleton
                                animation="wave"
                                variant="rectangular"
                                className={cn("rounded-full")}
                                width={60}
                                height={16}
                              />
                            </div>
                          }
                        >
                          {col.render ? col.render(row, col.width, hoveredRowIndex === rowIndex) : col.renderCell ? col.renderCell({row, index: rowIndex, width: col.width, isHovered: hoveredRowIndex === rowIndex}) : null}
                        </WithFallback>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-3">
                    <Text
                      variant="12M"
                      className="text-text-secondary! text-center"
                    >
                      {noDataMessage || errorMessage || "No data available"}
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
