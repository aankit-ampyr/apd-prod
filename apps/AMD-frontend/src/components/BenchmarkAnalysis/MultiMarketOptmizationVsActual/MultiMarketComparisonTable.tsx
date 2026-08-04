import {Fragment, useMemo, useState} from 'react';
import {IconButton, MultiSelectInput, Skeleton, Text} from '@/ui-kits';
import {useChartsActionV2} from '@/hooks';
import {cn} from '@/utils';
import {ClearFilterButton, getHeatmapTone, SectionHeader, WithFallback} from '../../common';
import type {AssetBenchmarkMultiMarketOptmizationVsActual, IconTypes, SelectInputItem} from '@/interface';

type MonthlyEntry = {
  month: number;
  year: number;
  streams: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['revenue_streams'];
  totals: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['totals'];
};

interface MultiMarketComparisonTableProps {
  title: string;
  subtitle: string;
  icon: IconTypes;
  monthlyEntries: MonthlyEntry[];
  loading?: boolean;
  className?: string;
  downloadFileName?: string;
  isFullScreenOverride?: boolean;
  actionWrapperClassName?: string;
  onDownload?: (months?: number[]) => void;

  // states
  selectedMonths?: SelectInputItem['id'][] | null;
  customActions?: React.ReactNode;
}

function formatMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('en-GB', {month: 'short', year: 'numeric'}).format(new Date(year, month - 1));
}

function getMonthKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatRevenue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString();
}

function formatCaptureRate(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value}%`;
}

export function MultiMarketComparisonTable(props: MultiMarketComparisonTableProps) {
  const {
    icon,
    subtitle,
    title,
    downloadFileName = '',
    isFullScreenOverride = false,
    actionWrapperClassName,
    monthlyEntries,
    loading = false,
    className,
    onDownload,
    selectedMonths: selectedMonthsFromProps = null,
    customActions,
  } = props;

  /**
   * ===============================
   * States
   * ===============================
   */
  const [selectedMonths, setSelectedMonths] = useState<SelectInputItem['id'][] | null>(selectedMonthsFromProps);

  /**
   * ===============================
   * Hooks
   * ===============================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <MultiMarketComparisonTable {...props} isFullScreenOverride selectedMonths={selectedMonths}/>,
  });

  /**
   * ===============================
   * Deried States
   * ===============================
   */
  const monthOptions = useMemo<SelectInputItem[]>(
    () =>
      monthlyEntries.map(entry => ({
        id: getMonthKey(entry.month, entry.year),
        label: formatMonthLabel(entry.month, entry.year),
      })),
    [monthlyEntries],
  );

  const filteredEntries = useMemo(() => {
    if (!selectedMonths?.length) return monthlyEntries;
    return monthlyEntries.filter(entry => selectedMonths.includes(getMonthKey(entry.month, entry.year)));
  }, [monthlyEntries, selectedMonths]);

  const streamOrder = useMemo(() => {
    const order: string[] = [];
    for (const monthEntry of filteredEntries) {
      for (const stream of monthEntry.streams) {
        if (!order.includes(stream.revenue_stream)) {
          order.push(stream.revenue_stream);
        }
      }
    }
    return order;
  }, [filteredEntries]);

  function handleDownload() {
    if (!onDownload) return;
    const months = selectedMonths?.map(montKey => {
      const monthStr = String(montKey).split('-')[1];
      return Number(monthStr);
    });
    onDownload(months);
  }

  const hasData = filteredEntries.length > 0;
  const selectedMonthCount = selectedMonths?.length ?? 0;
  const isCompactSelection = filteredEntries.length > 0 && filteredEntries.length <= 4;
  const labelColumnWidth = isCompactSelection ? 220 : 250;
  const monthColumnMinWidth = '100px';
  const tableClassName = cn('border-separate border-spacing-0 min-w-max w-full');

  return (
    <div ref={chartRef} className={cn('rounded-xl border border-border bg-white p-5 sm:p-6', className)}>
      {!loading && (
        <div className="flex items-start justify-between gap-4">
          <SectionHeader title={title} subtitle={subtitle} icon={icon} />
          <div className={cn('flex shrink-0 items-center gap-3 chart-actions', actionWrapperClassName)}>
            {customActions}
            <IconButton
              name="download"
              size={20}
              className="cursor-pointer hover:bg-primary-tint-2! charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={handleDownload}
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

      {!loading && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <MultiSelectInput
            labelClassName="text-caption! text-text-secondary! text-nowrap absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterRegular! mr-1"
            info
            label="Choose Months to Compare"
            infoMessage={'Select any month range to view Actual, Optimized,\nRevenue Gap, and Capture Rate values.'}
            values={selectedMonths}
            onChange={values => setSelectedMonths(values.map(item => item.id))}
            className="w-56"
            isFilter
            wrapperClassName="min-h-[36px] border-primary-tint-1"
            selectedValueDisplay={() => (
              <div className="flex items-center justify-between gap-3">
                <Text variant="12R">Selected Months</Text>
                <span className="flex size-5 items-center justify-center rounded-md bg-primary-tint-2">
                  <Text variant="12SB">{selectedMonthCount}</Text>
                </span>
              </div>
            )}
            options={monthOptions}
          />
          {selectedMonths !== null && <ClearFilterButton onClick={() => setSelectedMonths(null)} />}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className={tableClassName} style={isCompactSelection ? {tableLayout: 'fixed'} : undefined}>
            <colgroup>
              <col style={{width: `${labelColumnWidth}px`}} />
              {filteredEntries.map(entry => (
                <Fragment key={getMonthKey(entry.month, entry.year)}>
                  <col style={{width: monthColumnMinWidth}} />
                  <col style={{width: monthColumnMinWidth}} />
                </Fragment>
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 top-0 z-30 border-b border-r border-border bg-[#EEF7F7] px-4 py-4 text-left"
                  style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                  <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md!" />}>
                    <Text variant="14SB">Metric Name</Text>
                  </WithFallback>
                </th>
                {filteredEntries.map(entry => (
                  <th
                    key={getMonthKey(entry.month, entry.year)}
                    colSpan={2}
                    className="border-b border-r border-border bg-[#EEF7F7] px-4 py-3 text-center"
                    style={isCompactSelection ? {width: `calc(${monthColumnMinWidth} * 2)`} : undefined}>
                    <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto max-w-40! rounded-md!" />}>
                      <Text variant="14SB">{formatMonthLabel(entry.month, entry.year)}</Text>
                    </WithFallback>
                  </th>
                ))}
              </tr>
              <tr>
                {filteredEntries.map(entry => (
                  <FragmentHeader loading={loading} key={`${getMonthKey(entry.month, entry.year)}-sub`} />
                ))}
              </tr>
            </thead>
            <tbody>
              {hasData ? (
                <>
                  {streamOrder.map(streamName => (
                    <tr key={streamName}>
                      <td
                        className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-border bg-white px-4 py-4"
                        style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                        <WithFallback
                          isLoading={loading}
                          fallback={<Skeleton className="h-4! max-w-30! rounded-md!" />}>
                          <Text variant="14M">{streamName}</Text>
                        </WithFallback>
                      </td>
                      {filteredEntries.map(entry => {
                        const stream = entry.streams.find(item => item.revenue_stream === streamName);
                        return (
                          <StreamRowCells
                            loading={loading}
                            key={`${streamName}-${getMonthKey(entry.month, entry.year)}`}
                            stream={stream}
                          />
                        );
                      })}
                    </tr>
                  ))}

                  <tr className="bg-[#FEFFE9]">
                    <td
                      className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-border px-4 py-4"
                      style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                      <WithFallback isLoading={loading} fallback={<Skeleton className="h-4! max-w-30! rounded-md!" />}>
                        <Text variant="14M">Total</Text>
                      </WithFallback>
                    </td>
                    {filteredEntries.map(entry => (
                      <TotalCells
                        loading={loading}
                        key={`${getMonthKey(entry.month, entry.year)}-total`}
                        data={entry.totals}
                      />
                    ))}
                  </tr>

                  <tr className="bg-[#FEFFE9]">
                    <td
                      className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-border px-4 py-4"
                      style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                      <WithFallback isLoading={loading} fallback={<Skeleton className="h-4! max-w-30! rounded-md!" />}>
                        <Text variant="14M">Revenue Gap</Text>
                      </WithFallback>
                    </td>
                    {filteredEntries.map(entry => (
                      <RevenueGapCells
                        loading={loading}
                        key={`${getMonthKey(entry.month, entry.year)}-gap`}
                        data={entry.totals}
                      />
                    ))}
                  </tr>

                  <tr className="bg-[#FEFFE9]">
                    <td
                      className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-border px-4 py-4"
                      style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                      <WithFallback isLoading={loading} fallback={<Skeleton className="h-4! max-w-30! rounded-md!" />}>
                        <Text variant="14M">Capture Rate</Text>
                      </WithFallback>
                    </td>
                    {filteredEntries.map(entry => (
                      <CaptureRateCells
                        loading={loading}
                        key={`${getMonthKey(entry.month, entry.year)}-capture`}
                        data={entry.totals}
                      />
                    ))}
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={1 + filteredEntries.length * 2} className="px-4 py-10 text-center text-text-secondary">
                    No month data available for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentHeader({loading}: {loading: boolean}) {
  return (
    <>
      <th className="whitespace-nowrap border-b border-r border-border bg-[#EEF7F7] px-4 py-3 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14R" className="font-InterLight!">
            Actual (£)
          </Text>
        </WithFallback>
      </th>
      <th className="whitespace-nowrap border-b border-r border-border bg-[#EEF7F7] px-4 py-3 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14R" className="font-InterLight!">
            Opt (£)
          </Text>
        </WithFallback>
      </th>
    </>
  );
}

function StreamRowCells({
  stream,
  loading,
}: Readonly<{
  stream: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['revenue_streams'][number] | undefined;
  loading: boolean;
}>) {
  return (
    <>
      <td className="whitespace-nowrap border-b border-r border-border bg-white px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14R">{formatRevenue(stream?.actual_revenue)}</Text>
        </WithFallback>
      </td>
      <td className="whitespace-nowrap border-b border-r border-border bg-white px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14R">{formatRevenue(stream?.optimized_revenue)}</Text>
        </WithFallback>
      </td>
    </>
  );
}

function TotalCells({
  data,
  loading,
}: Readonly<{
  data: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['totals'];
  loading: boolean;
}>) {
  return (
    <>
      <td className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14M">{formatRevenue(data.total_actual_revenue)}</Text>
        </WithFallback>
      </td>
      <td className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14M">{formatRevenue(data.total_optimized_revenue)}</Text>
        </WithFallback>
      </td>
    </>
  );
}

function RevenueGapCells({
  data,
  loading,
}: Readonly<{
  data: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['totals'];
  loading: boolean;
}>) {
  const actual = getHeatmapTone(null);
  const optimized = getHeatmapTone(data?.revenue_gap);
  return (
    <>
      <td
        style={{backgroundColor: actual.bgColor}}
        className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text style={{color: actual.textColor}} variant="14M">
            -
          </Text>
        </WithFallback>
      </td>
      <td
        style={{backgroundColor: optimized.bgColor}}
        className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text style={{color: optimized.textColor}} variant="14M">
            {formatRevenue(data.revenue_gap)}
          </Text>
        </WithFallback>
      </td>
    </>
  );
}

function CaptureRateCells({
  data,
  loading,
}: Readonly<{
  data: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['totals'];
  loading: boolean;
}>) {
  const actual = getHeatmapTone(null);
  return (
    <>
      <td
        style={{backgroundColor: actual.bgColor}}
        className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text style={{color: actual.textColor}} variant="14M">
            -
          </Text>
        </WithFallback>
      </td>
      <td className="whitespace-nowrap border-b border-r border-border px-4 py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="mx-auto h-4! max-w-10! rounded-md!" />}>
          <Text variant="14M">{formatCaptureRate(data.capture_rate)}</Text>
        </WithFallback>
      </td>
    </>
  );
}
