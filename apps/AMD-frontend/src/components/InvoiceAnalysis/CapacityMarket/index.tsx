import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {MonthYear} from '@/interface';
import {
  getCapacityMarketPaymentsRequest,
  getCapacityMarketPaymentTrendRequest,
  getCapacityMarketSummaryRequest,
} from '@/services/redux/slice/invoiceSlice';
import {
  capacityMarketPaymentsData,
  capacityMarketPaymentsLoading,
  capacityMarketPaymentTrendData,
  capacityMarketPaymentTrendLoading,
  capacityMarketSummaryData,
  capacityMarketSummaryLoading,
} from '@/services/redux/selectors';
import {CapacityMarketKPIs} from './CapacityMarketKPIs';
import {PaymentTrendGraph} from './PaymentTrendGraph';
import {CapacityMarketPaymentsTable} from './CapacityMarketPaymentsTable';
import {CommentTrigger} from '@/components';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {useWidgetComments} from '@/hooks';
import {CommentContextType, CommentModule, InvoiceAnalysisTabs, InvoiceAnalysisWidgets} from '@/constants';
import {EmptyState} from '../EmptyState';

interface InvoicesCapacityMarketProps {
  assetId: number | null;
  year: number | null;
  reportingPeriod?: MonthYear;
}

export function InvoicesCapacityMarket(props: InvoicesCapacityMarketProps) {
  const {assetId, year, reportingPeriod} = props;

  /** ================= Hooks ================= */
  const dispatch = useDispatch();

  /** ================= Selectors ================= */

  // summary
  const summaryLoading = useSelector(capacityMarketSummaryLoading);
  const summaryData = useSelector(capacityMarketSummaryData);
  const hasSummaryData = !summaryLoading && summaryData?.has_data;

  // payment trend
  const paymentTrendLoading = useSelector(capacityMarketPaymentTrendLoading);
  const paymentTrendData = useSelector(capacityMarketPaymentTrendData);
  const hasPaymentTrendData = !paymentTrendLoading && paymentTrendData?.has_data;

  // payments table
  const capacityMarketPaymentData = useSelector(capacityMarketPaymentsData);
  const capacityMarketPaymentLoading = useSelector(capacityMarketPaymentsLoading);
  const hasCapacityMarketPaymentData = !capacityMarketPaymentLoading && capacityMarketPaymentData?.has_data;

  const {getCommentCountForDataPoint, handleBadgeClick} = useWidgetComments(
    CommentModule.InvoiceAnalysis,
    InvoiceAnalysisTabs.CapacityMarket,
    assetId,
    year,
  );

  /** ================= Data/Config ================= */

  /** ================= Side Effects ================= */
  useEffect(() => {
    if (assetId && year) {
      dispatch(
        getCapacityMarketSummaryRequest({
          assetId,
          year,
          month: reportingPeriod?.month,
        }),
      );
      dispatch(
        getCapacityMarketPaymentsRequest({
          assetId,
          year,
          month: reportingPeriod?.month,
        }),
      );
      dispatch(
        getCapacityMarketPaymentTrendRequest({
          assetId,
          year,
          month: reportingPeriod?.month,
        }),
      );
    }
  }, [assetId, year, reportingPeriod, dispatch]);

  useEffect(() => {
    if (assetId) {
      dispatch(
        fetchCommentsRequest({
          assetId,
          context_module: CommentModule.InvoiceAnalysis,
          context_tab: InvoiceAnalysisTabs.CapacityMarket,
          context_year: year ?? undefined,
        }),
      );
    }
  }, [assetId, year, dispatch]);

  if (!hasSummaryData || !hasPaymentTrendData || !hasCapacityMarketPaymentData) {
    return (
      <EmptyState
        icon="invoice-upload"
        title="No Capacity Market data available"
        subtitle="Upload PDF invoice and settlement csv file for this asset to view Capacity Market screen"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CapacityMarketKPIs data={summaryData?.kpis} isLoading={summaryLoading} />
      <PaymentTrendGraph
        data={paymentTrendData?.payment_trend ?? []}
        isLoading={paymentTrendLoading}
        year={year}
        assetId={assetId}
        domainMaxMultiplier={1.01}
        handleBadgeClick={handleBadgeClick}
        getCommentCountForDataPoint={getCommentCountForDataPoint}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.CapacityMarket}
            contextWidget={InvoiceAnalysisWidgets.PaymentTrend}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />
      <CapacityMarketPaymentsTable
        data={capacityMarketPaymentData?.capacity_market_payments}
        isLoading={capacityMarketPaymentLoading}
        assetId={assetId}
        year={year}
        reportingPeriod={reportingPeriod}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.CapacityMarket}
            contextWidget={InvoiceAnalysisWidgets.CapacityMarketPaymentsTable}
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
