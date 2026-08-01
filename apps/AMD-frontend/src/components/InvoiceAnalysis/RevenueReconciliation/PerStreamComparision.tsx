import {SectionHeader} from '@/components/common';
import {CALENDAR_MONTH_NAMES} from '@/constants';
import {useChartsActionV2} from '@/hooks';
import type {AssetInvoiceRevenueReconciliation} from '@/interface';
import {downloadAssetInvoiceRevenueReconciliation} from '@/services/api';
import {cn, formatCurrencyToPound, formatNumber} from '@/utils';
import {AnalyticsTable} from '@lazarus/react-common';
import type {DataTableColumn} from '@lazarus/react-common';
import {IconButton, Text, Icon} from '@/ui-kits';
import {useMemo, useState} from 'react';

type PerStreamComparisonData = NonNullable<AssetInvoiceRevenueReconciliation['per_stream_comparison']['per_stream_comparison']>[number];
type PerStreamComparisonMonthlyBreakdown = PerStreamComparisonData['monthly_breakdown'][number];
type PerStreamComparisonTotal = AssetInvoiceRevenueReconciliation['per_stream_comparison']['total_stream_data'];
type PerStreamComparisonRow =
  | (Omit<PerStreamComparisonData, 'monthly_breakdown'> & {
      id: string;
      type: 'normal';
      hasMonthlyBreakdown: boolean;
    })
  | (PerStreamComparisonMonthlyBreakdown & {
      id: string;
      type: 'monthly_breakdown';
      parentStreamId: string;
      stream: string;
    })
  | (PerStreamComparisonTotal & {
      id: 'total';
      type: 'total';
      stream: 'Total';
    });

interface PerStreamComparisionProps {
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
  assetId?: number;
  selectedMonths?: number[];
  year?: number;
  data?: PerStreamComparisonData[];
  total?: PerStreamComparisonTotal;
  loading?: boolean;
  customActions?: React.ReactNode;
}
export function PerStreamComparision(props: PerStreamComparisionProps) {
  const {
    isFullScreenOverride: isFullScreen = false,
    downloadFileName = '',
    assetId,
    selectedMonths,
    year,
    data = [],
    total,
    loading = false,
    customActions,
  } = props;

  /**
   * ====================================
   * Hooks
   * ====================================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <PerStreamComparision {...props} isFullScreenOverride />,
  });

  /**
   * ====================================
   * States
   * ====================================
   */
  const [expandedStreams, setExpandedStreams] = useState<string[]>([]);

  /**
   * ====================================
   * Derived States
   * ====================================
   */
  const expandableStreamIds = useMemo(
    () =>
      data
        .map((stream, index) => ({
          id: `${stream.stream}-${index}`,
          hasMonthlyBreakdown: stream.monthly_breakdown.length > 0,
        }))
        .filter(stream => stream.hasMonthlyBreakdown)
        .map(stream => stream.id),
    [data],
  );

  const tableData = useMemo<PerStreamComparisonRow[]>(
    () => {
      const streamRows = data.flatMap((stream, streamIndex) => {
        const id = `${stream.stream}-${streamIndex}`;
        const hasMonthlyBreakdown = stream.monthly_breakdown.length > 0;
        const streamRow: PerStreamComparisonRow = {
          ...stream,
          id,
          type: 'normal',
          hasMonthlyBreakdown,
        };

        if (!hasMonthlyBreakdown || !expandedStreams.includes(id)) return [streamRow];

        return [
          streamRow,
          ...stream.monthly_breakdown.map((monthlyBreakdown, monthIndex) => ({
            ...monthlyBreakdown,
            id: `${id}-${monthlyBreakdown.month}-${monthIndex}`,
            type: 'monthly_breakdown' as const,
            parentStreamId: id,
            stream: CALENDAR_MONTH_NAMES[monthlyBreakdown.month - 1] ?? `Month ${monthlyBreakdown.month}`,
          })),
        ];
      });

      return total
        ? [
            ...streamRows,
            {
              ...total,
              id: 'total',
              type: 'total',
              stream: 'Total',
            },
          ]
        : streamRows;
    },
    [data, expandedStreams, total],
  );

  const allExpanded =
    expandableStreamIds.length > 0 && expandableStreamIds.every(streamId => expandedStreams.includes(streamId));

  const getVarianceColorClass = (row: PerStreamComparisonRow) =>
    row.type !== 'total' && row.variance > 0 ? 'text-error-text' : undefined;

  const columns: DataTableColumn<PerStreamComparisonRow>[] = [
    {
      name: 'stream',
      title: <Text variant="14L">Stream</Text>,
      align: 'left',
      render: row => {
        if (row.type === 'monthly_breakdown') {
          return <Text variant="14R" className="pl-10!">{row.stream}</Text>;
        }

        if (row.type === 'total') {
          return <Text variant="14M">Total</Text>;
        }

        const isExpanded = expandedStreams.includes(row.id);
        return (
          <div className="flex items-center gap-3">
            {row.hasMonthlyBreakdown ? (
              <button
                type="button"
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.stream}`}
                className="size-6 bg-[#F6F7F8] cursor-pointer flex justify-center items-center rounded"
                onClick={() => toggleStream(row.id)}>
                <Icon name={isExpanded ? 'minus' : 'plus'} />
              </button>
            ) : (
              <span className="size-6" />
            )}
            <Text variant="14M">{row.stream}</Text>
          </div>
        );
      },
    },
    {
      name: 'gross_revenue',
      title: <Text variant="14L">Gross Revenue</Text>,
      align: 'right',
      cellClassName: ({row}) => getVarianceColorClass(row),
      render: row => (
        <Text variant={row.type === 'monthly_breakdown' ? '14R' : '14M'} className={cn(getVarianceColorClass(row))}>
          {formatCurrencyToPound(row.gross_revenue)}
        </Text>
      ),
    },
    {
      name: 'expected_net',
      title: <Text variant="14L">Expected Net (x0.95)</Text>,
      align: 'right',
      cellClassName: ({row}) => getVarianceColorClass(row),
      render: row => (
        <Text variant={row.type === 'monthly_breakdown' ? '14R' : '14M'} className={cn(getVarianceColorClass(row))}>
          {formatCurrencyToPound(row.expected_net)}
        </Text>
      ),
    },
    {
      name: 'reported_net',
      title: <Text variant="14L">Reported Net</Text>,
      align: 'right',
      cellClassName: ({row}) => getVarianceColorClass(row),
      render: row => (
        <Text variant={row.type === 'monthly_breakdown' ? '14R' : '14M'} className={cn(getVarianceColorClass(row))}>
          {formatCurrencyToPound(row.reported_net)}
        </Text>
      ),
    },
    {
      name: 'variance',
      title: <Text variant="14L">Variance (£)</Text>,
      align: 'right',
      cellClassName: ({row}) => getVarianceColorClass(row),
      render: row => (
        <Text variant={row.type === 'monthly_breakdown' ? '14R' : '14M'} className={cn(getVarianceColorClass(row))}>
          {formatCurrencyToPound(row.variance)}
        </Text>
      ),
    },
    {
      name: 'variance_percentage',
      title: <Text variant="14L">Variance %</Text>,
      align: 'right',
      cellClassName: ({row}) => getVarianceColorClass(row),
      render: row => (
        <Text
          variant={row.type === 'monthly_breakdown' ? '14R' : '14M'}
          className={cn(getVarianceColorClass(row))}>{`${formatNumber(row.variance_percentage)}%`}</Text>
      ),
    },
  ];

  /**
   * ====================================
   * functions
   * ====================================
   */
  function toggleStream(streamId: string) {
    setExpandedStreams(prev => {
      if (prev.includes(streamId)) return prev.filter(id => id !== streamId);
      return [...prev, streamId];
    });
  }

  async function handleDownload() {
    if (!assetId) return;
    await downloadAssetInvoiceRevenueReconciliation({
      assetId,
      months: selectedMonths ?? [],
      year: year ?? 0,
      fileName: downloadFileName,
    });
  }

  return (
    <div ref={chartRef} className="flex flex-col gap-3  rounded-md p-4 bg-white border border-border">
      <div className="flex items-center">
        <SectionHeader
          icon="bi-directional-circle"
          title="Per-Stream Comparison"
          subtitle="Detailed reconciliation across all revenue streams"
        />

        <div className="flex items-center gap-3 chart-actions ml-auto">
          {customActions}
          <IconButton
            name="download"
            size={20}
            className="hover:bg-primary-tint-2! cursor-pointer charts-action"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            onClick={handleDownload}
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
        <button
          type="button"
          aria-label={allExpanded ? 'Collapse all streams' : 'Expand all streams'}
          className="ml-4 box-border h-10 w-[118px] shrink-0 rounded-[8px] bg-white px-4 flex items-center justify-center whitespace-nowrap cursor-pointer text-[#151735] shadow-[inset_0_0_0_0.6px_#151735] transition-colors hover:bg-[#F8F9FB]"
          onClick={() => {
            if (allExpanded) {
              setExpandedStreams([]);
            } else {
              setExpandedStreams(expandableStreamIds);
            }
          }}>
          <Text variant="16M" className="text-inherit">
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Text>
        </button>
      </div>

      <AnalyticsTable
        data={tableData}
        columns={columns}
        loading={loading}
        headerColor="#F4FBF9"
        tableClassName="table-auto"
        rowClassName={({row}) =>
          cn(
            row.type === 'total' && 'bg-[#F6F7F8]',
          )
        }
        rowHover
      />
    </div>
  );
}
