import {AssetFileUploadError, Invoice, InvoiceSettlement, MonthYear, InvoiceStatementSummary} from '@/interface';
import {Routes} from '@/navigation/Routes';
import {AssetStatus} from '@/constants';
import {
  assetInvoiceUploadErrorMessage,
  currentSelectedAsset,
  assetInvoiceUploadLoading,
  assetInvoiceSettlementUploadLoading,
  assetInvoiceSettlementUploadErrorMessage,
  assetInvoiceSummaryStatementUploadErrorMessage,
  assetInvoiceSummaryStatementUploadLoading,
} from '@/services/redux/selectors';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {Alert, Badge, Icon, Text} from '@/ui-kits';
import {DragAndDrop2} from '../DragDropFileUpload';
import {
  deleteInvoiceRequest,
  deleteInvoiceSettlementRequest,
  uploadInvoiceSettlementRequest,
  uploadInvoicesRequest,
  uploadInvoiceSummaryStatementRequest,
  deleteInvoiceSummaryStatementRequest,
} from '@/services/redux/slice';
import {formatCurrencyToPound, getErrorMessage} from '@/utils';
import {Accept} from 'react-dropzone';

/**
 * =============================
 * Types
 * =============================
 */
interface InvoiceUploadSectionProps {
  monthYearReportingPeriod?: MonthYear;
}

const missingBadge = (
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

export function InvoiceUploadSection(props: InvoiceUploadSectionProps) {
  const {monthYearReportingPeriod} = props;

  /**
   * =============================
   * Hooks
   * =============================
   */
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /**
   * =============================
   * Selectors
   * =============================
   */
  const currentAsset = useSelector(currentSelectedAsset);

  /**
   * =============================
   * Derived States
   * =============================
   */
  const bothFilePresent = Boolean(currentAsset?.invoice_file) && Boolean(currentAsset?.invoice_settlement_file);
  const summaryStatementFilePresent = Boolean(currentAsset?.invoice_summary_statement);
  const analysisCtaVisible = bothFilePresent || summaryStatementFilePresent;
  const isUploadDisabled = currentAsset?.status !== AssetStatus.Active || !monthYearReportingPeriod;

  /**
   * =============================
   * Function
   * =============================
   */
  function viewAnalysis() {
    if (!currentAsset?.id) return;
    navigate(Routes.VIEW_INVOICE_ANALYSIS.replace(':id', String(currentAsset.id)), {
      state: {reportingPeriod: monthYearReportingPeriod},
    });
  }

  function uploadInvoice(file: File) {
    if (!currentAsset?.id) return;
    if (!monthYearReportingPeriod) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', String(monthYearReportingPeriod.month));
    formData.append('year', String(monthYearReportingPeriod.year));

    dispatch(uploadInvoicesRequest({assetId: currentAsset.id, formData}));
  }

  function removeInvoice(invoiceId: number) {
    if (!currentAsset?.id) return;
    dispatch(deleteInvoiceRequest({assetId: currentAsset.id, invoiceId}));
  }

  function removeInvoiceSettlement(settlementId: number) {
    if (!currentAsset?.id) return;
    dispatch(deleteInvoiceSettlementRequest({assetId: currentAsset.id, settlementId}));
  }

  function uploadInvoiceSettle(file: File) {
    if (!currentAsset?.id) return;
    if (!monthYearReportingPeriod) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', String(monthYearReportingPeriod.month));
    formData.append('year', String(monthYearReportingPeriod.year));

    dispatch(uploadInvoiceSettlementRequest({assetId: currentAsset.id, formData}));
  }

  function uploadInvoiceSummaryStatement(file: File) {
    if (!currentAsset?.id) return;
    if (!monthYearReportingPeriod) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', String(monthYearReportingPeriod.month));
    formData.append('year', String(monthYearReportingPeriod.year));

    dispatch(uploadInvoiceSummaryStatementRequest({assetId: currentAsset.id, formData}));
  }

  function removeSummaryStatement(statementId: number) {
    if (!currentAsset?.id) return;

    dispatch(deleteInvoiceSummaryStatementRequest({assetId: currentAsset.id, statementId}));
  }

  return (
    <div className="gap-10 flex-col flex">
      <InvoiceUpload<Invoice>
        title="Invoice Upload"
        disabled={isUploadDisabled}
        onUpload={uploadInvoice}
        onRemove={removeInvoice}
        fileUploadLoadingSelector={assetInvoiceUploadLoading}
        fileUploadErrorSelector={assetInvoiceUploadErrorMessage}
        file={currentAsset?.invoice_file ?? undefined}
        fileNameSelector={file => file?.invoice_file_name ?? ''}
        allowedFileTypes={{
          'application/pdf': ['.pdf'],
        }}
        invaliFileFormatErrorMessage={getErrorMessage('E-10232')}
        fileSizeExceedErrorMessage={getErrorMessage('E-10230')}
        fileSizeSelector={file => file?.invoice_file_size ?? 0}
        filePoints={[
          {
            label: 'Invoice ID',
            value: invoice => invoice?.invoice_number ?? missingBadge,
          },
          {
            label: 'Amount',
            value: invoice => (invoice?.invoice_amount ? formatCurrencyToPound(invoice?.invoice_amount) : missingBadge),
          },
          {
            label: 'Date',
            value: invoice => invoice?.invoice_date ?? missingBadge,
          },
        ]}
      />
      <InvoiceUpload<InvoiceSettlement>
        title="Settlement File Upload"
        disabled={isUploadDisabled}
        onUpload={uploadInvoiceSettle}
        onRemove={removeInvoiceSettlement}
        fileUploadLoadingSelector={assetInvoiceSettlementUploadLoading}
        fileUploadErrorSelector={assetInvoiceSettlementUploadErrorMessage}
        file={currentAsset?.invoice_settlement_file ?? undefined}
        fileNameSelector={file => file?.settlement_file_name ?? ''}
        fileSizeSelector={file => file?.settlement_file_size ?? 0}
        allowedFileTypes={{
          'text/csv': ['.csv'],
        }}
        invaliFileFormatErrorMessage={getErrorMessage('E-10229')}
        fileSizeExceedErrorMessage={getErrorMessage('E-10231')}
        filePoints={[
          {
            label: 'Invoice Payment Date',
            value: settlement => settlement?.invoice_payment_date ?? missingBadge,
          },
        ]}
      />

      <InvoiceUpload<InvoiceStatementSummary>
        title="Summary Statement File Upload"
        notice="Summary Statement file is optional for opening Invoice Analysis. If not uploaded, Revenue Reconciliation data will remain unavailable until the file is uploaded."
        disabled={isUploadDisabled}
        onUpload={uploadInvoiceSummaryStatement}
        onRemove={removeSummaryStatement}
        fileUploadLoadingSelector={assetInvoiceSummaryStatementUploadLoading}
        fileUploadErrorSelector={assetInvoiceSummaryStatementUploadErrorMessage}
        file={currentAsset?.invoice_summary_statement ?? undefined}
        fileNameSelector={file => file?.file_name ?? ''}
        fileSizeSelector={file => file?.file_size ?? 0}
        allowedFileTypes={{
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        }}
        invaliFileFormatErrorMessage={getErrorMessage('E-10250')}
        fileSizeExceedErrorMessage={getErrorMessage('E-10249')}
        filePoints={[
          {
            label: 'Energy Revenue',
            value: settlement =>
              settlement?.revenue_values.total_energy_revenue
                ? formatCurrencyToPound(settlement?.revenue_values.total_energy_revenue)
                : missingBadge,
          },
          {
            label: 'Ancillary Revenue',
            value: settlement =>
              settlement?.revenue_values.total_ancillary_revenue
                ? formatCurrencyToPound(settlement?.revenue_values.total_ancillary_revenue)
                : missingBadge,
          },
          {
            label: 'Reported Net Revenue',
            value: settlement =>
              settlement?.revenue_values.reported_net_revenue
                ? formatCurrencyToPound(settlement?.revenue_values.reported_net_revenue)
                : missingBadge,
          },
        ]}
      />

      {analysisCtaVisible && (
        <button
          disabled={!analysisCtaVisible}
          onClick={viewAnalysis}
          className="flex w-1/2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed items-center gap-3 rounded-md bg-white shadow-sm justify-between border-border border px-6 py-4">
          <Text variant="18M" className={`text-primary!`}>
            View invoice analysis
          </Text>

          <Icon name="link" className="text-primary! size-5" />
        </button>
      )}
    </div>
  );
}

interface InvoiceUploadProps<T extends {id: number}> {
  title?: string;
  notice?: string;
  disabled?: boolean;
  onUpload?: (file: File) => void;
  onRemove: (invoiceId: number) => void;
  fileUploadLoadingSelector: (state: any) => boolean;
  fileUploadErrorSelector: (state: any) => AssetFileUploadError | null;
  filePoints?: Array<{
    label: string;
    value: (file: T) => string | React.ReactNode;
  }>;
  fileNameSelector?: (file: T) => string;
  fileSizeSelector?: (file: T) => number;
  file: T | undefined;
  allowedFileTypes?: Accept;
  fileSizeExceedErrorMessage?: string;
  invaliFileFormatErrorMessage?: string;
}
function InvoiceUpload<T extends {id: number}>(props: InvoiceUploadProps<T>) {
  const {
    title,
    notice,
    disabled,
    onUpload,
    onRemove,
    fileUploadLoadingSelector,
    fileUploadErrorSelector,
    filePoints,
    fileNameSelector,
    fileSizeSelector,
    file,
    allowedFileTypes,
    fileSizeExceedErrorMessage,
    invaliFileFormatErrorMessage,
  } = props;

  /**
   * =============================
   * Selectors
   * =============================
   */
  const isLoading = useSelector(fileUploadLoadingSelector);
  const error = useSelector(fileUploadErrorSelector);
  const messages =
    error?.validation_errors?.map(item => {
      const value = typeof item === 'string' ? item : String(item);
      return value.startsWith('E-') ? getErrorMessage(value as any) : value;
    }) || [];

  /**
   * =============================
   * Derived States
   * =============================
   */
  return (
    <div className="flex flex-col gap-3">
      <Text variant="16SB">{title}</Text>

      {notice && (
        <Alert message={notice} className="w-full" textClassName="whitespace-normal break-words" />
      )}

      <DragAndDrop2<T>
        onFileAccepted={onUpload}
        disabled={disabled}
        maxSizeInBytes={100 * 1024 * 1024}
        onRemove={() => {
          if (!file?.id) return;
          onRemove(file.id);
        }}
        fileSizeExceedErrorMessage={fileSizeExceedErrorMessage}
        invaliFileFormatErrorMessage={invaliFileFormatErrorMessage}
        allowedFileTypes={allowedFileTypes}
        file={file}
        fileNameSelector={fileNameSelector}
        fileSizeSelector={fileSizeSelector}
        isLoading={isLoading}
        uploadError={
          error
            ? {
                file_name: error?.file?.name ?? '',
                validation_errors: messages,
              }
            : undefined
        }
        fileInfoPoints={filePoints}
      />
    </div>
  );
}
