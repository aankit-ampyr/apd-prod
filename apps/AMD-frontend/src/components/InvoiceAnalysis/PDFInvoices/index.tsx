import React, {useEffect} from 'react';
import {InvoiceCategorySummary} from './InvoiceCategorySummary';
import {InvoiceExtractionQualitySummaryCard} from './InvoiceExtractionQualitySummary';
import {useDispatch, useSelector} from 'react-redux';
import {
  invoiceListLoading,
  invoiceSummaryData,
  invoiceSummaryLoading,
} from '@/services/redux/selectors/invoiceSelector';
import {InvoicesListTable} from './InvoicesListTable';
import {getInvoicesSummaryRequest} from '@/services/redux/slice/invoiceSlice';
import {AssetInvoiceAnalysisTab} from '../types';
import {InvoiceSummaryRequest} from '@/interface';
import {useLocation} from 'react-router-dom';
import {matchesRoute} from '@/utils';
import {Routes} from '@/navigation/Routes';
import {CommentTrigger} from '@/components';
import {CommentContextType, CommentModule, InvoiceAnalysisTabs, InvoiceAnalysisWidgets} from '@/constants';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {EmptyState} from '../EmptyState';

interface InvoicesPdfInvoicesProps extends AssetInvoiceAnalysisTab {}
export function InvoicesPdfInvoices(props: InvoicesPdfInvoicesProps) {
  const {assetId, year, assetSystemGenerationId, month} = props;
  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const dispatch = useDispatch();
  const {pathname} = useLocation();

  /**
   * ==============================
   * Selector
   * ==============================
   */
  const summaryData = useSelector(invoiceSummaryData);
  const summaryLoading = useSelector(invoiceSummaryLoading);
  const listLoading = useSelector(invoiceListLoading);

  /**
   * ==============================
   * Derived State
   * ==============================
   */
  const isSeperateInvoiceRoute = matchesRoute(pathname, Routes.INVOICE_ANALYSIS);

  /**
   * ==============================
   * Side Effects
   * ==============================
   */
  useEffect(() => {
    if (!assetId) return;
    const params: InvoiceSummaryRequest['params'] = {
      assetId,
      source: isSeperateInvoiceRoute ? 'left_navigation' : 'asset_management',
    };
    if (year) {
      params.year = [year];
    }
    if (month) {
      params.month = [month];
    }
    dispatch(getInvoicesSummaryRequest(params));
  }, [dispatch, assetId, year, month, isSeperateInvoiceRoute]);

  useEffect(() => {
    if (assetId) {
      dispatch(
        fetchCommentsRequest({
          assetId,
          context_module: CommentModule.InvoiceAnalysis,
          context_tab: InvoiceAnalysisTabs.PdfInvoices,
          context_year: year ?? undefined,
        }),
      );
    }
  }, [assetId, year, dispatch]);

  /**
   * ==============================
   * Render Guard
   * ==============================
   */
  if (!assetId || !year) {
    return null;
  }

  if (
    !summaryLoading &&
    !listLoading &&
    summaryData &&
    (!summaryData.category_summary || summaryData.category_summary.length === 0)
  ) {
    return (
      <EmptyState
        icon="invoice-upload"
        title="No PDF Invoices data available"
        subtitle="Upload PDF invoice and settlement csv file for this asset to view PDF invoices screen"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <InvoiceCategorySummary data={summaryData?.category_summary ?? []} isLoading={summaryLoading || listLoading} />
        <InvoiceExtractionQualitySummaryCard
          data={summaryData?.extraction_quality}
          isLoading={summaryLoading || listLoading}
        />
      </div>

      <InvoicesListTable
        assetId={assetId}
        year={[year]}
        month={month ? [month] : undefined}
        assetSystemGenerationId={assetSystemGenerationId}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.PdfInvoices}
            contextWidget={InvoiceAnalysisWidgets.CapacityAgreementDetails}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />
    </div>
  );
}
