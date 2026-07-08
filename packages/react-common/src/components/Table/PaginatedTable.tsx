import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { DataTableColumn } from "../../interface";
import { cn } from "../../utils";
import { getColumnWidthStyles } from "./utils";
import { Pagination, Text } from "../../ui-kit";
import { Loader2 } from "lucide-react";

interface DataTableProps {
  data: any[];
  columns: DataTableColumn<any>[];
  totalPages: number;
  currentPage: number;
  totalResult: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  errorMessage?: string;
  highlightedRowIndex?: number;
  highLightedRowClassName?: string;
  loading?: boolean;
  showFooter?: boolean;
  stickyHeader?: boolean;
  rowAlign?: "items-center" | "items-start" | "items-end";
  persistHorizontalScrollKey?: string;
  onRowClick?: (row: any, rowIndex: number) => void;
}

export function getPaginationRange(args: {
  totalResult: number;
  currentPage: number;
  pageSize: number;
  dataLength: number;
  totalPages: number;
}) {
  const { totalResult, currentPage, pageSize, dataLength, totalPages } = args;
  if (totalResult === 0) {
    return [0, 0];
  }
  let start = (currentPage - 1) * pageSize + 1;
  let end = (currentPage - 1) * pageSize + dataLength;
  if (currentPage === totalPages || totalResult <= pageSize) {
    end = totalResult;
  }
  return [start, end];
}

export const DataTable: React.FC<DataTableProps> = (props) => {
  const {
    data = [],
    columns = [],
    stickyHeader,
    rowAlign = "center",
    onPageChange,
    currentPage,
    totalPages,
    totalResult,
    highlightedRowIndex,
    highLightedRowClassName,
    pageSize = 10,
    onRowClick,
    errorMessage,
    loading,
    showFooter = true,
    persistHorizontalScrollKey,
  } = props;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getAlignClass = (align: DataTableColumn<any>["align"]) => {
    switch (align) {
      case "center":
        return "text-center justify-center";
      case "right":
        return "text-right justify-end";
      default:
        return "text-left justify-start";
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

  const [rangeStart, rangeEnd] = useMemo(() => getPaginationRange({
    totalResult,
    currentPage,
    pageSize,
    dataLength: data.length,
    totalPages,
  }), [currentPage, totalPages, data.length, totalResult, pageSize]);

  const empty = useMemo(() => {
    return data.length === 0;
  }, [data.length]);

  const saveHorizontalScroll = () => {
    if (!persistHorizontalScrollKey || typeof window === "undefined") {
      return;
    }

    const scrollLeft = scrollContainerRef.current?.scrollLeft;
    if (typeof scrollLeft === "number") {
      sessionStorage.setItem(persistHorizontalScrollKey, String(scrollLeft));
    }
  };

  useLayoutEffect(() => {
    if (!persistHorizontalScrollKey || typeof window === "undefined") {
      return;
    }

    const scrollLeft = Number(
      sessionStorage.getItem(persistHorizontalScrollKey),
    );
    if (!Number.isNaN(scrollLeft) && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft;
    }
  }, [persistHorizontalScrollKey]);

  useEffect(() => {
    return () => {
      saveHorizontalScroll();
    };
  }, [persistHorizontalScrollKey]);

  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="w-full flex-1 flex flex-col border border-bg-card rounded-lg overflow-hidden shadow-sm font-sans">
        <div
          ref={scrollContainerRef}
          onScroll={
            persistHorizontalScrollKey ? saveHorizontalScroll : undefined
          }
          className={cn(
            "overflow-x-auto relative data-table-scroll flex-1",
            stickyHeader && "overflow-y-auto",
          )}
        >
          <table className="w-full table-auto">
            {/* Header */}
            <thead
              className={cn(
                "bg-primary-tint-2 border-b border-gray-200 text-ui_blue text-xs font-bold tracking-wider",
                stickyHeader && "sticky top-0 z-10",
              )}
            >
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`px-4 h-14 text-nowrap! font-InterSemiBold! text-secondary! ${getAlignClass(col.headerAlign || col.align)} ${col.headerClassName || ""}`}
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
                        variant="caption"
                        className={cn(
                          "flex size-full items-center ",
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

            {/* Body */}
            <tbody className="bg-white divide-y divide-bg-card">
              {data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn("hover:bg-slate-50 transition-colors duration-150", highlightedRowIndex === rowIndex && (highLightedRowClassName || "bg-primary-tint-2"))}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className={`px-4 h-14 text-sm text-secondary font-FigtreeSemiBold whitespace-nowrap ${getAlignClass(col.align)} ${getRowAlignClass(rowAlign as any)}`}
                        style={getColumnWidthStyles(col.width)}
                      >
                        {col.render
                          ? col.render(row, col.width)
                          : col.renderCell
                            ? col.renderCell({
                                row,
                                index: rowIndex,
                                width: col.width,
                              })
                            : null}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="font-InterRegular px-6 py-10 text-center text-text-secondary text-subtitle-2"
                  >
                    {errorMessage || "No data available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-text-primary" />
            </div>
          )}
        </div>

        {/* Footer */}
      </div>
      {showFooter && (
        <div className="border-gray-200 py-4 flex items-center justify-between shrink-0">
          <Text
            variant="caption2"
            className="text-ui_blue font-medium text-text-placeholder!"
          >
            Showing {rangeStart} to {rangeEnd} of {totalResult} results
          </Text>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => onPageChange?.(page)}
          />
        </div>
      )}
    </div>
  );
};
