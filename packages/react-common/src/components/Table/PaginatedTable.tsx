import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {DataTableColumn} from '../../interface';
import {cn} from '../../utils';
import {getColumnWidthStyles} from './utils';
import {Pagination, Text, Icon, Skeleton} from '../../ui-kit';
import {useWindowDimensions} from '../../hooks';
import {TABLET_SCREEN_BREAKPOINT} from '../../constants/defaults';
import {WithFallback} from '../SkelatonWrapper';

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
  tableHeightWhenScrollable?: number | string;
  rowAlign?: 'items-center' | 'items-start' | 'items-end';
  persistHorizontalScrollKey?: string;
  onRowClick?: (row: any, rowIndex: number) => void;
  collapsibleOnTablet?: boolean;
  tabletVisibleColumns?: string[];
  ghostRowCount?: number;
  hideScrollbarWhenLoading?: boolean;
}

export function getPaginationRange(args: {
  totalResult: number;
  currentPage: number;
  pageSize: number;
  dataLength: number;
  totalPages: number;
}) {
  const {totalResult, currentPage, pageSize, dataLength, totalPages} = args;
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

export const DataTable: React.FC<DataTableProps> = props => {
  const {
    data = [],
    columns: originalColumns = [],
    stickyHeader,
    rowAlign = 'center',
    onPageChange,
    currentPage,
    totalPages,
    totalResult,
    highlightedRowIndex,
    highLightedRowClassName,
    pageSize = 10,
    onRowClick,
    errorMessage,
    loading = false,
    showFooter = true,
    persistHorizontalScrollKey,
    collapsibleOnTablet,
    tabletVisibleColumns,
    tableHeightWhenScrollable,
    ghostRowCount = 0,
    hideScrollbarWhenLoading = false,
  } = props;

  /**
   * ==========================
   *  Hooks
   * ==========================
   */
  const {width} = useWindowDimensions();
  const location = useLocation();

  /**
   * ==========================
   *  Refs and States
   * ==========================
   */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const prevPageSize = useRef(pageSize);

  /**
   * ==========================
   *  Derived/Memoized Values
   * ==========================
   */
  const skeletonRowCount = ghostRowCount ?? pageSize;

  const columns = useMemo(() => {
    if (width <= TABLET_SCREEN_BREAKPOINT && !isTableExpanded && tabletVisibleColumns) {
      return originalColumns.filter(col => tabletVisibleColumns.includes(col.name));
    }
    return originalColumns;
  }, [width, isTableExpanded, tabletVisibleColumns, originalColumns]);

  const [rangeStart, rangeEnd] = useMemo(
    () =>
      getPaginationRange({
        totalResult,
        currentPage,
        pageSize,
        dataLength: data.length,
        totalPages,
      }),
    [currentPage, totalPages, data.length, totalResult, pageSize],
  );

  const empty = useMemo(() => {
    return data.length === 0;
  }, [data.length]);

  /**
   * ==========================
   *  Functions
   * ==========================
   */
  function getAlignClass(align: DataTableColumn<any>['align']) {
    if (loading) {
      return '';
    }
    switch (align) {
      case 'center':
        return 'text-center justify-center';
      case 'right':
        return 'text-right justify-end';
      default:
        return 'text-left justify-start';
    }
  }

  function getRowAlignClass(align: 'items-center' | 'items-start' | 'items-end') {
    if (loading) {
      return '';
    }
    switch (align) {
      case 'items-start':
        return 'align-top';
      case 'items-end':
        return 'align-bottom';
      default:
        return 'align-middle';
    }
  }

  function saveHorizontalScroll() {
    if (!persistHorizontalScrollKey || typeof window === 'undefined') {
      return;
    }

    const scrollLeft = scrollContainerRef.current?.scrollLeft;
    if (typeof scrollLeft === 'number') {
      sessionStorage.setItem(persistHorizontalScrollKey, String(scrollLeft));
    }
  }

  /**
   * ==========================
   *  Side Effects
   * ==========================
   */
  useLayoutEffect(() => {
    if (!persistHorizontalScrollKey || typeof window === 'undefined') {
      return;
    }

    const scrollLeft = Number(sessionStorage.getItem(persistHorizontalScrollKey));
    if (!Number.isNaN(scrollLeft) && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft;
    }
  }, [persistHorizontalScrollKey]);

  useEffect(() => {
    return () => {
      if (persistHorizontalScrollKey) {
        sessionStorage.removeItem(persistHorizontalScrollKey);
      }
    };
  }, [location.pathname, persistHorizontalScrollKey]);

  useEffect(() => {
    return () => {
      saveHorizontalScroll();
    };
  }, [persistHorizontalScrollKey]);

  useEffect(() => {
    if (prevPageSize.current !== pageSize) {
      prevPageSize.current = pageSize;
      if (currentPage !== 1) {
        onPageChange?.(1);
      }
    }
  }, [pageSize, currentPage, onPageChange]);

  return (
    <div className="flex flex-col h-full w-full relative">
      {collapsibleOnTablet && width <= TABLET_SCREEN_BREAKPOINT && (
        <div className="absolute top-7 -right-3.5 -translate-y-1/2 z-20">
          <button
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
            <Icon
              name={isTableExpanded ? 'expand-admin-users-table-compress' : 'expand-admin-users-table-compressed'}
              size={34}
              className="text-primary!"
            />
          </button>
        </div>
      )}
      <div className="w-full flex-1 flex flex-col border border-bg-card rounded-lg overflow-hidden shadow-sm font-sans">
        <div
          ref={scrollContainerRef}
          onScroll={persistHorizontalScrollKey ? saveHorizontalScroll : undefined}
          className={cn(
            'relative data-table-scroll flex-1',
            loading && hideScrollbarWhenLoading ? 'overflow-hidden' : 'overflow-x-auto',
            stickyHeader && !(loading && hideScrollbarWhenLoading) && 'overflow-y-auto',
          )}
          style={stickyHeader && tableHeightWhenScrollable ? {maxHeight: tableHeightWhenScrollable} : undefined}>
          <table className="w-full table-auto">
            {/* Header */}
            <thead
              className={cn(
                'bg-primary-tint-2 border-b border-gray-200 text-ui_blue text-xs font-bold tracking-wider',
                stickyHeader && 'sticky top-0 z-10',
              )}>
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`px-2 h-14 text-nowrap! font-InterSemiBold! text-secondary! ${getAlignClass(col.headerAlign || col.align)} ${col.headerClassName || ''}`}
                    style={
                      empty
                        ? {
                            textWrap: 'nowrap',
                          }
                        : getColumnWidthStyles(col.width)
                    }>
                    <WithFallback
                      isLoading={loading}
                      fallback={<Skeleton variant="rectangular" className="rounded-full" width={60} height={16} />}>
                      {typeof col.title === 'string' ? (
                        <Text
                          variant="caption"
                          className={cn(
                            'flex size-full items-center ',
                            getAlignClass(col.headerAlign || col.align),
                            empty && 'text-nowrap',
                          )}>
                          {col.title}
                        </Text>
                      ) : (
                        col.title
                      )}
                    </WithFallback>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-bg-card">
              {loading ? (
                Array.from({length: skeletonRowCount}).map((_, rowIndex) => (
                  <tr key={`ghost-${rowIndex}`}>
                    {columns.map((col, colIndex) => (
                      <td
                        key={`ghost-${rowIndex}-${colIndex}`}
                        className={`px-2 h-14 ${getAlignClass(col.align)} ${getRowAlignClass(rowAlign as any)}`}
                        style={getColumnWidthStyles(col.width)}>
                        <div className={cn('flex w-full', getAlignClass(col.align))}>
                          <Skeleton variant="rectangular" className="rounded-full" width={60} height={16} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'hover:bg-slate-50 transition-colors duration-150',
                      highlightedRowIndex === rowIndex && (highLightedRowClassName || 'bg-primary-tint-2'),
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}>
                    {columns.map((col, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className={`px-2 h-14 text-sm text-secondary font-FigtreeSemiBold break-words ${getAlignClass(col.align)} ${getRowAlignClass(rowAlign as any)}`}
                        style={getColumnWidthStyles(col.width)}>
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
                    className="font-InterRegular px-6 py-10 text-center text-text-secondary text-subtitle-2">
                    {errorMessage || 'No data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
      </div>
      {showFooter && (
        <div className="border-gray-200 py-4 flex items-center justify-between shrink-0">
          <Text variant="caption2" className="text-ui_blue font-medium text-text-placeholder!">
            Showing {rangeStart} to {rangeEnd} of {totalResult} results
          </Text>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={page => onPageChange?.(page)} />
        </div>
      )}
    </div>
  );
};
