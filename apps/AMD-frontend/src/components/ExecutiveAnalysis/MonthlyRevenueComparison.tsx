import React, {useState} from 'react';
import {AnalyticsHorizontalTable, ClearFilterButton, SectionHeader} from '../common';
import {cn} from '@/utils';
import {Alert, Icon, IconButton, MultiSelectInput, Text, Tooltip} from '@/ui-kits';
import {useChartsActionV2} from '@/hooks';
import {AssetExecutiveAnalysis, HorizontalTableMetric, SelectInputItem} from '@/interface';
import {CALENDAR_MONTHS_SHORT_NAMES} from '@/constants';

type ExecutiveMonthlyRevenueComparisonEntries =
  AssetExecutiveAnalysis['monthly_revenue_comparison']['monthly_comparison'][number];

interface MonthlyRevenueComparisonProps {
  className?: string;
  actionWrapperClassName?: string;
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
  onDownload?: (months: number[]) => void;
  loading?: boolean;
  selectedMonths?: SelectInputItem['id'][] | null;
  data: ExecutiveMonthlyRevenueComparisonEntries[];
  year: number;
}
export function MonthlyRevenueComparison(props: MonthlyRevenueComparisonProps) {
  const {
    className,
    actionWrapperClassName,
    isFullScreenOverride = false,
    downloadFileName = '',
    data,
    onDownload,
    loading,
    selectedMonths: selectedMonthsFromProps = null,
    year,
  } = props;

  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <MonthlyRevenueComparison {...props} isFullScreenOverride selectedMonths={selectedMonths}/>,
  });

  /**
   * ===========================
   * States & Constants
   * ===========================
   */
  const [selectedMonths, setSelectedMonths] = useState<SelectInputItem['id'][] | null>(selectedMonthsFromProps);
  const tablesRows: HorizontalTableMetric<ExecutiveMonthlyRevenueComparisonEntries>[] = [
    {
      rowHeader: getRowHeader(
        'Actual Revenue (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Actual Revenue =</span> 0.95 × (SFFR + EPEX30DA + EPEXDA + IDA1 + IDC +
          ImbalanceRev − ImbalanceCharge)
        </Text>,
      ),
      key: 'actual_revenue',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.actual_revenue?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: <Text variant="14M">Capacity Market (£)</Text>,
      key: 'capacity_market',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.capacity_market?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: getRowHeader(
        'DUoS Net Credit (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">DUoS Net Credit =</span> DUoS fixed charge − DUoS Net Credit
        </Text>,
      ),
      key: 'dous_net_credit',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.duos_net_credit?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: getRowHeader(
        'Total Revenue (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Total Revenue =</span> Actual Revenue + Capacity Market + DUoS Net Credit
        </Text>,
      ),
      key: 'total_revenue',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.total_revenue?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: getRowHeader(
        'Optimal Revenue (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Optimal Revenue =</span> 0.95 × ∑(Optimised_Revenue_Multi)
        </Text>,
      ),
      key: 'optimal_revenue',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.optimized_revenue?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: getRowHeader(
        'Imbalance (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Imbalance =</span> ( Imbalance revenue - Imbalance charge (net) ) * 0.95
        </Text>,
      ),
      key: 'net_imbalance',
      render: row => (
        <Text variant="14R" className="text-center">
          {row?.net_imbalance?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeader: getRowHeader(
        'Revenue Gap (£)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Revenue Gap =</span> Optimal revenue - Actual Revenue
        </Text>,
        true,
      ),
      key: 'revenue_gap',
      rowHeaderClassName: 'bg-[#FEFFE9]!',
      cellClassName: 'relative',
      render: row => (
        <div
          className={cn(
            'absolute inset-0 flex justify-center items-center',
            row?.revenue_gap && row?.revenue_gap < 0 ? 'bg-[#D64A54]' : 'bg-[#009580]',
          )}>
          <Text variant="14SB" className="text-center text-white!">
            {row?.revenue_gap?.toLocaleString() ?? '-'}
          </Text>
        </div>
      ),
    },
    {
      rowHeader: getRowHeader(
        'Capture Rate (%)',
        <Text variant="14R">
          <span className="font-InterSemiBold">Capture Rate =</span> (Actual revenue / Optimal Revenue ) * 100 %
        </Text>,
        true,
      ),
      key: 'capture_rate',
      cellClassName: 'bg-[#FEFFE9]!',
      rowHeaderClassName: 'bg-[#FEFFE9]!',
      render: row => (
        <Text variant="14SB" className="text-center">
          {row?.capture_rate ? `${row?.capture_rate.toLocaleString()}%` : '-'}
        </Text>
      ),
    },
  ];

  /**
   * ===========================
   * Derived States
   * ===========================
   */
  const monthOptions = (() => {
    return data.map(entry => ({
      id: entry.month,
      label: `${CALENDAR_MONTHS_SHORT_NAMES[entry.month - 1]} ${year}`,
    }));
  })();
  const selectedMonthCount = selectedMonths?.length ?? 0;
  const filteredData = React.useMemo(() => {
    if (!selectedMonths?.length) return data;

    return data.filter(monthEntry => selectedMonths.includes(monthEntry.month));
  }, [data, selectedMonths]);

  /**
   * ===========================
   * function
   * ===========================
   */
  function getRowHeader(title: string, tooltipMessage: string | React.ReactNode, footerCol: boolean = false) {
    return (
      <div className={cn('flex gap-2 items-center')}>
        <Text variant={footerCol ? '14SB' : '14M'}>{title}</Text>
        <span className="group relative">
          <Tooltip message={tooltipMessage} position="top" portal />
          <Icon name="circle-info-2" />
        </span>
      </div>
    );
  }

  return (
    <div ref={chartRef} className={cn('rounded-xl border border-border bg-white p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          icon="bi-directional-circle"
          title="Monthly Revenue Comparison"
          subtitle="Review Actual and Optimal Revenue, Revenue Gap, Capture Rate, and supporting financial metrics by month."
        />
        {!loading && (
          <div className={cn('flex shrink-0 items-center gap-3 chart-actions', actionWrapperClassName)}>
            <IconButton
              name="download"
              size={20}
              className="cursor-pointer hover:bg-primary-tint-2! charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={() => {
                const months = selectedMonths?.map(Number) ?? [] as number[];
                onDownload?.(months);
              }}
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
        )}
      </div>

      {!loading && (
        <div className="flex justify-end mt-4 items-center gap-3">
          <span className="flex gap-1 items-center">
            <Text variant="14R">Choose Month to Compare</Text>
            <div className="relative group">
              <Tooltip message="Select any month range to view monthly actual revenue." portal position="top" />
              <Icon name="circle-info-2" />
            </div>
            <Text variant="14R">:</Text>
          </span>
          <MultiSelectInput
            labelClassName="text-caption! text-text-secondary! text-nowrap absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterRegular! mr-1"
            values={selectedMonths}
            onChange={values => setSelectedMonths(values.map(item => item.id))}
            className="w-56"
            isFilter
            wrapperClassName="min-h-[36px] border-primary-tint-1"
            selectedValueDisplay={() => (
              <div className="flex items-center justify-between gap-3">
                <Text variant="12R">Selected Months</Text>
                <span className="flex px-3 items-center justify-center rounded-md bg-primary-tint-2">
                  <Text variant="12SB">{selectedMonthCount}</Text>
                </span>
              </div>
            )}
            options={monthOptions}
          />
          {selectedMonths !== null && <ClearFilterButton onClick={() => setSelectedMonths(null)} />}
        </div>
      )}

      <AnalyticsHorizontalTable
        metrics={tablesRows}
        className="mt-4"
        data={filteredData}
        loading={loading}
        metricTitle={
          <Text variant="14R" className="font-InterLight! text-start">
            Metric Name
          </Text>
        }
        headerColor="var(--color-primary-tint-2)"
        columnHeader={{
          render(column) {
            return (
              <Text variant="free" className="font-InterLight text-sm text-text-primary! text-center">
                {CALENDAR_MONTHS_SHORT_NAMES[column.month - 1]} {year}
              </Text>
            );
          },
        }}
      />

      <Alert
        className="mt-6"
        message="Capacity Market, DUoS Net Credit, and DUoS Fixed Charges are taken from the monthly values configured in Settings. These values remain consistent across all applicable views for the selected month."
      />
    </div>
  );
}
