import {AssetReportFile, DataTableColumn, Invoice, InvoiceSettlement, MonthYear} from '@/interface';
import {currentAssetFilesLoading, currentSelectedAsset, currentSelectedAssetFiles} from '@/services/redux/selectors';
import {currentAssetFilesRequest} from '@/services/redux/slice';
import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Text, Icon, Badge, MultiMonthYearSelector} from '@/ui-kits';
import {
  AssetFileBadgeVariants,
  AssetFileLabel,
  AssetFileType,
  InvoiceType,
  InvoiceTypeBadgeVariants,
  InvoiceTypeLabels,
} from '@/constants';
import {formatDate} from '@/utils';
import {AnalyticsTable, ClearFilterButton} from '@lazarus/react-common';
import {downloadAssetFile, downloadInvoice, exportInvoiceSettlement} from '@/services/api';
import {
  invoiceListData,
  invoiceListLoading,
  invoiceSettlementListData,
  invoiceSettlementListLoading,
} from '@/services/redux/selectors/invoiceSelector';
import {getInvoicesListRequest, getInvoicesSettlementListRequest} from '@/services/redux/slice/invoiceSlice';

/**
 * ===============
 * Types & Interfaces
 * ===============
 */

type BaseFileHistoryRow = {
  id: number;
  assetId?: number;
  name: string;
  uploadedAt?: string;
  month?: number;
  year?: number;
};

export type AssetFileHistoryRow = BaseFileHistoryRow & {
  source: 'asset-files';
  type: AssetFileType;
  original: AssetReportFile;
};

export type InvoiceFileHistoryRow = BaseFileHistoryRow & {
  source: 'invoice';
  type: InvoiceType;
  original: Invoice;
};

export type InvoiceSettlementFileHistoryRow = BaseFileHistoryRow & {
  source: 'invoice-settlement';
  type: null;
  original: InvoiceSettlement;
};

export type FileHistoryRow = AssetFileHistoryRow | InvoiceFileHistoryRow | InvoiceSettlementFileHistoryRow;

interface UploadFileHistoryProps {}

export function UploadFileHistory(_props: UploadFileHistoryProps) {
  /**
   * ==============
   * Hooks
   * ==============
   */
  const dispatch = useDispatch();

  /**
   * ==============
   * Selectors
   * ==============
   */
  const files = useSelector(currentSelectedAssetFiles);
  const isLoading = useSelector(currentAssetFilesLoading);
  const currentAsset = useSelector(currentSelectedAsset);

  const invoices = useSelector(invoiceListData);
  const invoicesLoading = useSelector(invoiceListLoading);

  const invoiceSettlements = useSelector(invoiceSettlementListData);
  const invoiceSettlementsLoading = useSelector(invoiceSettlementListLoading);

  /**
   * ==============
   * States & Constants
   * ==============
   */
  const [open, setOpen] = useState<boolean>(false);
  const [monthYear, setMonthYear] = useState<MonthYear[]>([]);
  const [monthYearPickerOpen, setMonthYearPickerOpen] = useState<boolean>(false);

  const columns: DataTableColumn<FileHistoryRow>[] = [
    {
      name: 'month-year',
      title: (
        <div className="relative inline-flex items-center gap-2">
          <button
            className="flex items-center gap-2 cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              setMonthYearPickerOpen(true);
            }}>
            <Text variant="14R">Month & Year </Text>
            <span>
              <Icon name="list-filter" />
            </span>
          </button>
          {monthYearPickerOpen && (
            <MultiMonthYearSelector
              className="absolute top-full translate-y-4 z-100! left-0 -translate-x-4 rounded-sm"
              onClose={(action, e) => {
                e?.stopPropagation();
                if (action == 'forceClose') {
                  setMonthYear([]);
                }
                setMonthYearPickerOpen(false);
              }}
              onChange={val => {
                setMonthYear(val);
              }}
              value={monthYear ?? undefined}
            />
          )}
        </div>
      ),
      width: {minWidth: '100px', maxWidth: '150px'},
      align: 'left',
      render: row => {
        if (row.type === AssetFileType.IAR) {
          return '-';
        }
        return (
          <Text variant="14M" className="text-text-primary!">
            {formatProjectionRange(row.month, row.year)}
          </Text>
        );
      },
    },
    {
      name: 'file-name',
      title: <Text variant="14R">File Name</Text>,
      width: {minWidth: '400px', maxWidth: '1500px'},
      align: 'left',
      render: (row, _, ishovered) => (
        <div className="flex items-start gap-2 w-full relative">
          <Icon name="file-grid" className="text-text-placeholder mt-1" />
          <Text variant="14R" className="text-text-primary! inline gap-4 grow! break-all whitespace-normal">
            {row.name}
          </Text>
          {ishovered && (
            <button
              className="cursor-pointer absolute right-0 translate-x-[150%]"
              onClick={() => handleFileDownload(row.source, row.assetId, row.id, row.name)}>
              <Icon name="download" className="text-text-placeholder" />
            </button>
          )}
        </div>
      ),
    },
    {
      name: 'type',
      title: (
        <Text variant="14R" className="ml-2">
          Type
        </Text>
      ),
      width: {minWidth: '90px', maxWidth: '200px'},
      align: 'left',
      render: row => {
        if (row.source === 'asset-files') {
          return (
            <Badge
              size="sm"
              textClassName="font-InterSemibold!"
              message={AssetFileLabel[row.type]}
              color={AssetFileBadgeVariants[row.type] as any}
              className="text-text-secondary! min-w-26"
              textStyle={{
                fontFamily: 'Inter-Medium',
              }}
            />
          );
        }
        if (row.source === 'invoice') {
          return (
            <Badge
              message={`${InvoiceTypeLabels[row.type]} invoice`}
              size="sm"
              color={(InvoiceTypeBadgeVariants[row.type] ?? 'gray') as any}
              className="text-text-secondary! min-w-26"
              textStyle={{
                fontFamily: 'Inter-Medium',
              }}
            />
          );
        }
        if (row.source === 'invoice-settlement') {
          return (
            <Badge
              message={`Settlement`}
              size="sm"
              color={'gray'}
              className="text-text-secondary! min-w-26"
              textStyle={{
                fontFamily: 'Inter-Medium',
              }}
            />
          );
        }
        return null;
      },
    },
    {
      name: 'last-updated',
      title: <Text variant="14R">Last Updated</Text>,
      width: {minWidth: '90px', maxWidth: '200px'},
      align: 'center',
      render: row => (
        <Text variant="caption" className="text-text-secondary!">
          {formatDate(row.uploadedAt ?? '', 'dd MMM yyyy')}
        </Text>
      ),
    },
  ];

  /**
   * ==============
   * Direved States
   * ==============
   */
  const modifiedAssetReportFiles = files.map(
    (file): AssetFileHistoryRow => ({
      id: file.id,
      assetId: file.asset_id,
      name: file.name,
      type: file.type!,
      uploadedAt: file.uploaded_at,
      month: file.month,
      year: file.year,
      source: 'asset-files',
      original: file,
    }),
  );

  const modifiedInvoiceFiles = invoices.map(
    (invoice): InvoiceFileHistoryRow => ({
      id: invoice.id,
      assetId: currentAsset?.id,
      name: invoice.invoice_file_name,
      type: invoice.type,
      uploadedAt: invoice.uploaded_on,
      month: invoice.month ?? undefined,
      year: invoice.year ?? undefined,
      source: 'invoice',
      original: invoice,
    }),
  );

  const modifiedInvoiceSettlementFiles = invoiceSettlements.map(
    (settlement): InvoiceSettlementFileHistoryRow => ({
      id: settlement.id,
      assetId: currentAsset?.id,
      name: settlement.settlement_file_name,
      type: null,
      uploadedAt: settlement.uploaded_on,
      month: settlement.month ?? undefined,
      year: settlement.year ?? undefined,
      source: 'invoice-settlement',
      original: settlement,
    }),
  );

  const combinedFiles: FileHistoryRow[] = [
    ...modifiedAssetReportFiles,
    ...modifiedInvoiceFiles,
    ...modifiedInvoiceSettlementFiles,
  ].sort((a, b) => {
    const isFileAIar = a.source === 'asset-files' && a.type === AssetFileType.IAR;
    const isFileBIar = b.source === 'asset-files' && b.type === AssetFileType.IAR;

    if (isFileAIar) {
      return 1; // a comes after b
    }
    if (!isFileBIar) {
      return -1; // b comes after a
    }

    const dateA = new Date(a.uploadedAt ?? '');
    const dateB = new Date(b.uploadedAt ?? '');
    return dateB.getTime() - dateA.getTime();
  });

  /**
   * ===============
   * Functions
   * ===============
   */
  function toMonthYearArray(months: MonthYear[]) {
    return {
      month: months?.map(item => item?.month),
      year: [...new Set(months?.map(item => item?.year))],
    };
  }
  function handleToggleOpen() {
    setOpen(p => !p);
  }

  function formatProjectionRange(month?: number, year?: number) {
    if (!month || !year) {
      return '-';
    }

    return formatDate(new Date(year, month - 1), 'MMMM yyyy');
  }

  function handleFileDownload(
    fileSource: FileHistoryRow['source'],
    assetId?: number,
    fileId?: number,
    fileName?: string,
  ) {
    if (!fileId) return;
    if (!assetId) return;
    if (fileSource === 'asset-files') {
      downloadAssetFile({fileId, assetId, fileName});
    }
    if (fileSource === 'invoice') {
      downloadInvoice({assetId, invoiceId: fileId, fileName});
    }
    if (fileSource === 'invoice-settlement') {
      exportInvoiceSettlement({assetId, settlementId: fileId, fileName});
    }
  }

  /**
   * ===============
   * Side Effects
   * ===============
   */
  useEffect(() => {
    if (open) {
      if (!currentAsset?.id) return;
      const payload = monthYear.length ? toMonthYearArray(monthYear) : {month: [], year: []};
      dispatch(
        currentAssetFilesRequest({
          assetId: currentAsset?.id,
          month: payload.month,
          year: payload.year,
        }),
      );
      dispatch(
        getInvoicesListRequest({
          limit: -1,
          assetId: currentAsset?.id,
          month: payload.month,
          year: payload.year,
        }),
      );
      dispatch(
        getInvoicesSettlementListRequest({
          assetId: currentAsset?.id,
          month: payload.month,
          year: payload.year,
        }),
      );
    }
  }, [currentAsset?.id, open, monthYear]);

  return (
    <div className="flex flex-col bg-white rounded-md border overflow-x-auto border-border shadow-lg shadow-border/50">
      <div className="flex items-center p-4 gap-4">
        <Icon name="clock-arrow" className="size-5" />
        <Text variant="free" className="font-SpaceGroteskBold grow text-lg">
          File History
        </Text>

        {monthYear.length > 0 && (
          <ClearFilterButton
            onClick={() => {
              setMonthYearPickerOpen(false);
              setMonthYear([]);
            }}
          />
        )}
        <button className="cursor-pointer" onClick={handleToggleOpen}>
          <Icon name={open ? 'cheveron-up' : 'cheveron-down'} className="size-3" />
        </button>
      </div>
      <div className="flex flex-col bg-white rounded-md border overflow-x-auto border-border shadow-lg shadow-border/50">
        {open && (
          <AnalyticsTable
            rowHover
            rowAlign="items-start"
            loading={isLoading || invoicesLoading || invoiceSettlementsLoading}
            tableClassName="table-auto! min-w-[1200px] shrink-0"
            wrapperClassName="border-none rounded-none! overflow-x-auto"
            data={combinedFiles}
            columns={columns}
          />
        )}
      </div>
    </div>
  );
}
