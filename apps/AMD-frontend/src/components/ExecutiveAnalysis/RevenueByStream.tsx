import {CALENDAR_MONTHS_SHORT_NAMES} from '@/constants';
import {useChartsActionV2} from '@/hooks';
import {AssetExecutiveAnalysis, HorizontalTableMetric, SelectInputItem} from '@/interface';
import {cn} from '@/utils';
import {Text, IconButton, Alert, MultiSelectInput, Icon, Tooltip} from '@/ui-kits';
import React, {useState} from 'react';
import {AnalyticsHorizontalTable, ClearFilterButton, SectionHeader} from '../common';

type ExecutiveRevenueByStreamEntries = AssetExecutiveAnalysis['revenue_by_stream']['monthly_comparison'][number];

interface RevenueByStreamProps {
  className?: string;
  actionWrapperClassName?: string;
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
  onDownload?: (months: number[]) => void;
  loading?: boolean;
  selectedMonths?: SelectInputItem['id'][] | null;
  data: ExecutiveRevenueByStreamEntries[];
  year: number;
  customActions?: React.ReactNode;
}

export function RevenueByStream(props: RevenueByStreamProps) {
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
    customActions,
  } = props;

  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <RevenueByStream {...props} isFullScreenOverride selectedMonths={selectedMonths}/>,
  });

  /**
   * ===========================
   * States & Constants
   * ===========================
   */
  const [selectedMonths, setSelectedMonths] = useState<SelectInputItem['id'][] | null>(selectedMonthsFromProps);
  const tablesRows: HorizontalTableMetric<ExecutiveRevenueByStreamEntries>[] = [
    {
      key: 'sffr',
      rowHeader: <Text variant="14M">SFFR (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.sffr?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'epex',
      rowHeader: <Text variant="14M">EPEX (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.epex?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'iia1',
      rowHeader: <Text variant="14M">IDA1 (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.ida1?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'idc',
      rowHeader: <Text variant="14M">IDC (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.idc?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'imbalance',
      rowHeader: (
        <div className="flex gap-2 items-center">
          <Text variant="14M">Imbalance (£)</Text>
          <span className="relative group">
            <Icon name="circle-info-2" />
            <Tooltip
              position="top"
              portal
              message={
                <Text variant="14R">
                  <span className="font-InterBold!">Imbalance =</span> (Imbalance revenue - Imbalance charge (net) ) *
                  0.95
                </Text>
              }
            />
          </span>
        </div>
      ),
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.imbalance?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'sub_total',
      rowHeader: (
        <div className="flex gap-2 items-center">
          <Text variant="14M">Asset Sub Total (£)</Text>
          <span className="relative group">
            <Icon name="circle-info-2" />
            <Tooltip
              position="top"
              portal
              message={
                <Text variant="14R">
                  <span className="font-InterBold!">Asset Sub Total =</span> SFFR Net + EPEX Net + IDA1 Net + IDC Net +
                  Imbalance Net Revenue
                </Text>
              }
            />
          </span>
        </div>
      ),
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.asset_sub_total?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'capacity_market',
      rowHeader: <Text variant="14M">Capacity Market (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.capacity_market?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      key: 'duos_net',
      rowHeader: <Text variant="14M">DUoS net (£)</Text>,
      render: col => (
        <Text variant="14R" className="text-center">
          {col?.duos_net_credit?.toLocaleString() ?? '-'}
        </Text>
      ),
    },
    {
      rowHeaderClassName: 'bg-[#FEFFE9]',
      cellClassName: 'bg-[#FEFFE9]',
      key: 'total',
      rowHeader: (
        <div className="flex gap-2 items-center">
          <Text variant="14SB">TOTAL (All streams)</Text>
          <span className="relative group">
            <Icon name="circle-info-2" />
            <Tooltip
              position="top"
              portal
              message={
                <Text variant="14R">
                  <span className="font-InterBold!">Total (All streams) =</span> Asset Sub-Total + Capacity Market +
                  DUoS Credit − DUoS Fixed Charge
                </Text>
              }
            />
          </span>
        </div>
      ),
      render: col => (
        <Text variant="14SB" className="text-center">
          {col?.total_revenue?.toLocaleString() ?? '-'}
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

  return (
    <div ref={chartRef} className={cn('rounded-xl border border-border bg-white p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          icon="calendar-coins"
          title="Monthly Revenue by Stream"
          subtitle="Review and compare actual revenue contribution from each stream across available months."
        />
        {!loading && (
          <div className={cn('flex shrink-0 items-center gap-3 chart-actions', actionWrapperClassName)}>
            {customActions}
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
          <span className='flex gap-1 items-center'>
            <Text variant='14R'>Choose Month to Compare</Text>
            <div className="relative group">
              <Tooltip message="Select any month range to view actual revenue by streams." portal position="top" />
              <Icon name="circle-info-2" />
            </div>
            <Text variant='14R'>:</Text>
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
