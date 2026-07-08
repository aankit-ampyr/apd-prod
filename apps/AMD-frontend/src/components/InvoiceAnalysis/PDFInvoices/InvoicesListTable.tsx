import {useEffect, useState} from 'react';
import {IconButton, Text, Badge, Skeleton, Pagination, Icon, Tooltip} from '@/ui-kits';
import {useChartsActionV2} from '@/hooks';
import {AnalyticsTable, DataTable, getPaginationRange, FilterGroup, Sort, WithFallback} from '@lazarus/react-common';
import {enumToSelectOptions, formatCurrencyToPound, parseDate} from '@/utils';
import {CALENDAR_MONTH_NAMES, InvoiceType, InvoiceTypeBadgeVariants, InvoiceTypeLabels} from '@/constants';
import {DataTableColumn, Invoice, InvoiceListExportRequest, InvoiceListRequest, SortType} from '@/interface';
import {formatDate} from 'date-fns';
import {useDispatch, useSelector} from 'react-redux';
import {
  invoiceListCurrentPage,
  invoiceListData,
  invoiceListLoading,
  invoiceListTotalPages,
  invoiceListTotalResults,
} from '@/services/redux/selectors/invoiceSelector';
import {getInvoicesListRequest} from '@/services/redux/slice/invoiceSlice';
import {InvoicePdfPreview} from './InvoicePdfPreview';
import {downloadInvoiceList} from '@/services/api';

/**
 * ==============================
 * Types
 * ==============================
 */

export type InvoiceFilter = {
  search?: string;
  type?: InvoiceType;
};

export type InvoiceSortField = {
  field: string;
  order: NonNullable<SortType>;
};

interface InvoicesListTableProps {
  isFullScreenOverride?: boolean;
  assetId: number;
  year?: number[];
  assetSystemGenerationId?: string;
}

const PAGE_SIZE = 20;
const PREVIEW_PANEL_WIDTH = 400;

export function InvoicesListTable(props: InvoicesListTableProps) {
  const {isFullScreenOverride: isFullScreen, assetId, year = [], assetSystemGenerationId} = props;

  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const dispatch = useDispatch();
  const {chartRef, onMinimize, onMaximize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <InvoicesListTable {...props} isFullScreenOverride />,
  });

  /**
   * ==============================
   * Selector
   * ==============================
   */
  const isLoading = useSelector(invoiceListLoading);
  const invoicesData = useSelector(invoiceListData);
  const currentPage = useSelector(invoiceListCurrentPage);
  const totalPage = useSelector(invoiceListTotalPages);
  const totalResults = useSelector(invoiceListTotalResults);

  /**
   * ==============================
   * State
   * ==============================
   */
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<InvoiceFilter>({});
  const [sortFields, setSortFields] = useState<InvoiceSortField[]>([]);
  const [previewShown, setPreviewShown] = useState(false);
  const [activeInvoiceToPreview, setActiveInvoiceToPreview] = useState<Invoice | null>(null);

  /**
   * ==============================
   * Derived States
   * ==============================
   */
  const [rangeStart, rangeEnd] = getPaginationRange({
    totalResult: totalResults,
    currentPage: currentPage || page,
    pageSize: PAGE_SIZE,
    dataLength: invoicesData.length,
    totalPages: totalPage,
  });
  const activePreiewedInvoiceRow = invoicesData.findIndex(invoice => invoice.id === activeInvoiceToPreview?.id);

  /**
   * ==============================
   * Data Columns
   * ==============================
   */
  const invoiceColumns: DataTableColumn<Invoice>[] = [
    {
      align: 'left',
      name: 'name',
      title: <Text variant="14L">File</Text>,
      render: row => <Text variant="14M">{row.invoice_file_name}</Text>,
    },
    {
      align: 'left',
      name: 'type',
      width: {
        minWidth: '180px',
        maxWidth: '180px',
      },
      title: <Text variant="14L">Type</Text>,
      render: row => (
        <Badge
          message={InvoiceTypeLabels[row.type]}
          size="sm"
          color={(InvoiceTypeBadgeVariants[row.type] ?? 'gray') as any}
          textStyle={{
            fontFamily: 'Inter-Medium',
          }}
        />
      ),
    },
    {
      align: 'left',
      name: 'number',
      title: <Text variant="14L">Invoice #</Text>,
      render: row => renderInvoiceDetailsWithFallback(row.invoice_number),
    },
    {
      align: 'left',
      name: 'date',
      title: (
        <div className="flex items-center justify-between">
          <Text variant="14L">Date</Text>
          <Sort
            sort={getSortFields('date') ?? null}
            onSortChange={order => handleSortChange('date', order)}
            className="h-6!"
          />
        </div>
      ),
      render: row => {
        const date = parseDate(row.invoice_date ?? '', 'dd-MM-yyyy') ?? row.invoice_date;
        const formattedDate = date ? formatDate(date, 'dd MMM yyyy') : null;
        return renderInvoiceDetailsWithFallback(formattedDate);
      },
    },
    {
      align: 'left',
      name: 'amount',
      title: <Text variant="14L">Amount</Text>,
      render: row => {
        const formattedAmount = row.invoice_amount ? formatCurrencyToPound(row.invoice_amount) : null;
        return renderInvoiceDetailsWithFallback(formattedAmount);
      },
    },
    {
      align: 'left',
      name: 'updatedOn',
      width: {
        minWidth: '200px',
        maxWidth: '200px',
      },
      title: (
        <div className="flex items-center justify-between">
          <Text variant="14L">Updated On</Text>
          <Sort
            sort={getSortFields('upload_at') ?? null}
            onSortChange={order => handleSortChange('upload_at', order)}
            className="h-6!"
          />
        </div>
      ),
      render: row => renderInvoiceDetailsWithFallback(formatDate(row.uploaded_on ?? '', 'dd MMM yyyy, hh:mm a')),
    },
    {
      align: 'left',
      name: 'capacity_payment',
      width: {
        minWidth: '200px',
        maxWidth: '200px',
      },
      title: <Text variant="14L">Capacity Payment</Text>,
      render: row => (
        <Text variant="14R">
          {row?.capacity_payment_month ? CALENDAR_MONTH_NAMES[row?.capacity_payment_month - 1] : '-'}{' '}
          {row?.capacity_payment_year ?? '-'}
        </Text>
      ),
    },
  ];

  /**
   * ==============================
   * Functions
   * ==============================
   */

  function handleFilterChange(nextFilter: InvoiceFilter) {
    setPage(1);
    setFilter(nextFilter);
  }

  function handleTableSortChange(nextSortFields: InvoiceSortField[]) {
    setPage(1);
    setSortFields(nextSortFields);
  }

  function getSortFields(field: string): SortType | undefined {
    return sortFields.find(f => f.field === field)?.order;
  }

  function handleSortChange(field: string, order: SortType): void {
    if (!order) {
      handleTableSortChange(sortFields.filter(f => f.field !== field));
      return;
    }

    const exists = sortFields.some(f => f.field === field);

    if (!exists) {
      handleTableSortChange([...sortFields, {field, order}]);
      return;
    }

    handleTableSortChange(sortFields.map(f => (f.field === field ? {...f, order} : f)));
  }

  function renderInvoiceDetailsWithFallback(text: string | null) {
    if (!text) {
      return (
        <Badge
          message={'Not extracted'}
          size="sm"
          icon="infoCircle"
          color="red"
          textStyle={{
            fontFamily: 'Inter-Medium',
          }}
        />
      );
    }
    return <Text variant="14R">{text}</Text>;
  }

  async function handleDownLoad() {
    if (!assetId) return;

    const downloadParams: InvoiceListExportRequest['params'] = {
      assetId,
      fileName: `${assetSystemGenerationId ?? assetId}_pdf_invoices_list.csv`,
      year,
      limit: -1,
    };

    if (filter.search) {
      downloadParams.search = filter.search;
    }

    if (filter.type) {
      downloadParams.type = filter.type;
    }

    if (sortFields.length > 0) {
      downloadParams.sort = sortFields.map(field => (field.order === 'asc' ? field.field : `-${field.field}`));
    }

    await downloadInvoiceList(downloadParams);
  }

  function showPanel() {
    setPreviewShown(true);
    setActiveInvoiceToPreview(invoicesData[0]);
  }

  function hidePanel() {
    setPreviewShown(false);
    setActiveInvoiceToPreview(null);
  }

  function handleRowClick(invoice: Invoice) {
    if (!previewShown) return;
    setActiveInvoiceToPreview(invoice);
  }

  /**
   * ==============================
   * Side Effects
   * ==============================
   */
  useEffect(() => {
    if (!assetId) return;

    const payload: InvoiceListRequest['params'] = {page, limit: PAGE_SIZE, assetId, year};

    if (filter.search) {
      payload.search = filter.search;
    }

    if (filter.type) {
      payload.type = filter.type;
    }

    if (sortFields.length > 0) {
      payload.sort = sortFields.map(field => (field.order === 'asc' ? field.field : `-${field.field}`));
    }

    dispatch(getInvoicesListRequest(payload));
  }, [dispatch, filter, page, sortFields, assetId, year]);

  useEffect(() => {
    if (invoicesData.length === 0) {
      setPreviewShown(false);
      setActiveInvoiceToPreview(null);
    }
  }, [invoicesData]);

  return (
    <WithFallback isLoading={isLoading} fallback={<InvoiceListTableSkeleton />}>
      <div ref={chartRef} className="bg-white p-4 flex grow flex-col gap-2 rounded-md border border-border">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Text variant="h4">Capacity Agreement Details</Text>
            <Text variant="14R" className="text-text-secondary!">
              Review extracted invoice details, filter records, and preview the raw PDF text.
            </Text>
          </div>

          {!isLoading && (
            <div className="flex items-center gap-3 chart-actions">
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

        <div className="flex mb-4 items-center gap-4">
          <FilterGroup
            config={[
              {
                key: 'search',
                placeholder: 'Search by File name, Invoice',
                type: 'search',
                props: {
                  leftIcon: 'search',
                },
              },
              {
                key: 'type',
                placeholder: 'All Types',
                type: 'select',
                props: {
                  buttonClassName: 'mb-0.5',
                  iconClassName: 'mt-0.5',
                  className: 'min-w-40',
                  portal: true,
                  options: enumToSelectOptions(InvoiceType, InvoiceTypeLabels),
                },
              },
            ]}
            onReset={() => handleTableSortChange([])}
            onChange={handleFilterChange}
          />

          {invoicesData.length > 0 && (
            <div className="group relative ml-auto w-fit">
              <button
                onClick={previewShown ? hidePanel : showPanel}
                className="flex cursor-pointer items-center rounded-sm bg-primary h-10 px-3 text-white transition-colors hover:bg-primary-hover active:bg-primary-active border border-transparent">
                {previewShown ? (
                  <>
                    <Icon name="collapse-right" size={18} className="text-white! mr-2" />
                    <Text variant="btnMedium" className="text-white! text-nowrap">
                      Hide Preview
                    </Text>
                  </>
                ) : (
                  <>
                    <Text variant="btnMedium" className="text-white! text-nowrap mr-1.5">
                      Invoice Preview
                    </Text>
                    <Icon name="infoCircle" size={16} className="text-white! mr-3" />
                    <Icon name="collapse-left" size={18} className="text-white!" />
                  </>
                )}
              </button>

              {!previewShown && (
                <Tooltip
                  position="top"
                  className="left-auto! right-0! translate-x-0!"
                  arrowClassName="!left-auto !right-6 !translate-x-0"
                  content={
                    <Text variant='14M' className="block w-max max-w-70 whitespace-normal">
                      Click to open the side panel and preview the selected invoice PDF from the table.
                    </Text>
                  }
                />
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 max-w-full">
          <div
            style={{
              maxWidth: !previewShown ? '100%' : `calc(100% - ${PREVIEW_PANEL_WIDTH}px)`,
            }}
            className="flex flex-col w-full">
            <DataTable
              columns={invoiceColumns}
              data={invoicesData}
              currentPage={currentPage || page}
              totalPages={totalPage}
              totalResult={totalResults}
              stickyHeader
              onRowClick={handleRowClick}
              highlightedRowIndex={activePreiewedInvoiceRow !== -1 ? activePreiewedInvoiceRow : undefined}
              highLightedRowClassName="bg-[#FEFFE9] border-l-4 border-l-[#F5D600]"
              errorMessage="There are currently no invoice records to display. Upload an invoice to get started."
              showFooter={false}
            />
          </div>
          {previewShown && activeInvoiceToPreview && (
            <InvoicePdfPreview
              assetId={assetId}
              style={{width: `${PREVIEW_PANEL_WIDTH}px`}}
              fileId={activeInvoiceToPreview.id}
              fileName={activeInvoiceToPreview.invoice_file_name}
            />
          )}
        </div>

        <div className="border-gray-200 py-4 flex items-center justify-between">
          <Text variant="caption2" className="text-ui_blue font-medium text-text-placeholder!">
            Showing {rangeStart} to {rangeEnd} of {totalResults} results
          </Text>
          <Pagination currentPage={currentPage} totalPages={totalPage} onPageChange={setPage} />
        </div>
      </div>
    </WithFallback>
  );
}

function InvoiceListTableSkeleton() {
  return (
    <div className="flex flex-col gap-4  bg-white rounded-lg border-border border p-4">
      <Skeleton className="h-4! w-[15%] rounded-full bg-[#D7D7D7]!" />
      <Skeleton className="h-3! w-[30%] rounded-full bg-[#F2F3F5]!" />

      <AnalyticsTable
        headerColor="#EFFAF9"
        tableClassName="table-auto"
        data={Array.from({length: 7})}
        columns={[
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-20" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-50" />,
          },
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-10" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-20" />,
          },
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-12" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-12" />,
          },
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-12" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-12" />,
          },
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-12" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-12" />,
          },
          {
            align: 'center',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! rounded-full w-15" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! rounded-full w-20" />,
          },
          {
            align: 'right',
            name: '1',
            title: <Skeleton className="bg-[#D7D7D7]! h-3! ml-auto rounded-full w-15" />,
            render: () => <Skeleton className="bg-[#F2F3F5]! h-3! ml-auto rounded-full w-10" />,
          },
        ]}
      />
    </div>
  );
}
