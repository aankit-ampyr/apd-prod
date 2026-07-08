import {AnalyticsTable, formatCurrencyToPound} from '@lazarus/react-common';
import type {DataTableColumn} from '@lazarus/react-common';
import {IconButton, Badge, Text} from '@/ui-kits';
import {SectionHeader} from '@/components/common';
import {useChartsActionV2} from '@/hooks';
import {CALENDAR_MONTH_NAMES} from '@/constants';
import type {AssetCapacityMarketAnalytics, MonthYear} from '@/interface';
import {downloadAssetCapacityMarketAnalytics} from '@/services/api';

interface CapacityMarketPaymentsTableProps {
  data?: AssetCapacityMarketAnalytics['capacity_market_payments'];
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  assetId?: number | null;
  year?: number | null;
  reportingPeriod?: MonthYear;
}

function renderInvoiceDetailsWithFallback(text: string | null | undefined, centerBadge?: boolean) {
  if (!text) {
    const badge = (
      <Badge
        message="Not extracted"
        size="sm"
        icon="infoCircle"
        color="red"
        textStyle={{
          fontFamily: 'Inter-Medium',
        }}
      />
    );
    return centerBadge ? <div className="flex w-full justify-center">{badge}</div> : badge;
  }
  return <Text variant="14R">{text}</Text>;
}

const columns: DataTableColumn<AssetCapacityMarketAnalytics['capacity_market_payments'][0]>[] = [
  {
    name: 'capacity_month_year',
    title: 'Capacity Month-Year',
    align: 'left',
    render: row => {
      const monthStr =
        typeof row.capacity_month === 'number'
          ? CALENDAR_MONTH_NAMES[row.capacity_month - 1]
          : row.capacity_month || '';
      const text = `${monthStr} ${row.capacity_year || ''}`.trim();
      return renderInvoiceDetailsWithFallback(text);
    },
  },
  {
    name: 'invoice_id',
    title: 'Invoice ID',
    align: 'center',
    render: row => renderInvoiceDetailsWithFallback(row.invoice_number, true),
  },
  {
    name: 'invoice_date',
    title: 'Invoice Date',
    align: 'center',
    render: row => renderInvoiceDetailsWithFallback(row.invoice_date, true),
  },
  {
    name: 'payment_date',
    title: 'Payment Date',
    align: 'center',
    render: row => renderInvoiceDetailsWithFallback(row.payment_date, true),
  },
  {
    name: 'amount',
    title: 'Amount(£)',
    align: 'center',
    render: row => {
      const text = row.amount != null ? formatCurrencyToPound(row.amount, true, false) : null;
      return renderInvoiceDetailsWithFallback(text, true);
    },
  },
  {
    name: 'absolute_amount',
    title: 'Absolute Amount(£)',
    align: 'center',
    render: row => {
      const text = row.absolute_amount != null ? formatCurrencyToPound(row.absolute_amount, true, false) : null;
      return renderInvoiceDetailsWithFallback(text, true);
    },
  },
];

export function CapacityMarketPaymentsTable(props: CapacityMarketPaymentsTableProps) {
  const {data = [], isLoading = false, isFullScreenOverride = false} = props;

  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: 'capacity_market_payments',
    renderFullScreen: () => <CapacityMarketPaymentsTable {...props} isFullScreenOverride />,
  });

  const handleExport = async () => {
    if (!props.assetId || !props.year) return;
    try {
      await downloadAssetCapacityMarketAnalytics({
        assetId: props.assetId,
        year: props.year,
        month: props.reportingPeriod?.month,
        fileName: 'capacity_market_payments.csv',
      });
    } catch (error) {
      console.error('Failed to download capacity market payments table', error);
    }
  };

  return (
    <div ref={chartRef} className="rounded-xl border border-border bg-white p-5 sm:p-6 mt-6">
      {!isLoading && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <SectionHeader
            title="Capacity Market Payments"
            subtitle="Review monthly capacity payment history, invoice dates, payment dates, and settlement amounts."
            icon="table-gbp"
          />
          <div className="flex shrink-0 items-center gap-3 chart-actions">
            <IconButton
              name="download"
              size={20}
              className="cursor-pointer hover:bg-primary-tint-2! charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={handleExport}
            />
            {!isFullScreenOverride ? (
              <IconButton
                name="maximize"
                size={20}
                className="cursor-pointer hover:bg-primary-tint-2! charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMaximize}
              />
            ) : (
              <IconButton
                name="minimize"
                size={20}
                className="cursor-pointer hover:bg-primary-tint-2! charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMinimize}
              />
            )}
          </div>
        </div>
      )}

      <AnalyticsTable
        data={data}
        columns={columns}
        loading={isLoading}
        headerColor="#F4FBF9"
        wrapperClassName="border-0! overflow-x-auto"
        tableClassName="w-full"
      />
    </div>
  );
}
