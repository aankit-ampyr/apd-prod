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
import { InvoiceSummaryRequest } from '@/interface';

interface InvoicesPdfInvoicesProps extends AssetInvoiceAnalysisTab {}
export function InvoicesPdfInvoices(props: InvoicesPdfInvoicesProps) {
  const {assetId, year, assetSystemGenerationId} = props;
  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const dispatch = useDispatch();

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
   * Side Effects
   * ==============================
   */
  useEffect(() => {
    if (!assetId) return;
    const params: InvoiceSummaryRequest['params'] = {
      assetId,
    }
    if (year) {
      params.year = [year];
    }
    dispatch(getInvoicesSummaryRequest(params));
  }, [dispatch, assetId, year]);

  /**
   * ==============================
   * Render Guard
   * ==============================
   */
  if (!assetId || !year) {
    return null;
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

      <InvoicesListTable assetId={assetId} year={[year]} assetSystemGenerationId={assetSystemGenerationId} />
    </div>
  );
}
