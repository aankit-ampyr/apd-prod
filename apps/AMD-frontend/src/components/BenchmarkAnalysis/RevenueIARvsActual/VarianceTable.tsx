import {Fragment, useMemo, useState} from 'react';
import {Alert, IconButton, MultiSelectInput, Skeleton, Text} from '@/ui-kits';
import {useChartsActionV2} from '@/hooks';
import {cn, formatPercentage} from '@/utils';
import {ClearFilterButton, SectionHeader, WithFallback, getHeatmapTone, HeatVarianceLabels} from '../../common';
import type {IconTypes, SelectInputItem} from '@/interface';
import type {AssetBenchmarkRevenueActualvsIAR} from '@/interface';

type MonthlyEntry = {
  month: number;
  year: number;
  streams: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['streams'];
  total_excluding_bm_tnuos: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['total_excluding_bm_tnuos'];
  total_all_streams: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['total_all_streams'];
};

interface VarianceTableProps {
  title: string;
  subtitle: string;
  icon: IconTypes;
  isFullScreenOverride?: boolean;
  monthlyEntries: MonthlyEntry[];
  loading?: boolean;

  className?: string;
  downloadFileName?: string;
  onDownload?: () => void;
  actionWrapperClassName?: string;

  // states
  selectedMonths?: SelectInputItem['id'][] | null;
}

function formatMonthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat('en-GB', {month: 'short', year: 'numeric'}).format(new Date(year, month - 1));
}

function getMonthKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function VarianceTable(props: VarianceTableProps) {
  const {
    icon,
    subtitle,
    title,
    downloadFileName = '',
    isFullScreenOverride = false,
    actionWrapperClassName,
    monthlyEntries,
    onDownload,
    loading = false,
    className,
    selectedMonths: selectedMonthsFromProps = null
  } = props;
  /**
   * ===========================
   * States
   * ===========================
   */
  const [selectedMonths, setSelectedMonths] = useState<SelectInputItem['id'][] | null>(selectedMonthsFromProps);
  
  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <VarianceTable {...props} isFullScreenOverride selectedMonths={selectedMonths}/>,
  });


  /**
   * ===========================
   * Derived States
   * ===========================
   */

  /**
   * we are calculating which month to display based on the api data, only those months whose data is available in apis response
   */
  const monthOptions = useMemo<SelectInputItem[]>(
    () =>
      monthlyEntries.map(entry => ({
        id: getMonthKey(entry.month, entry.year),
        label: formatMonthLabel(entry.month, entry.year),
      })),
    [monthlyEntries],
  );

  /**
   * The filter is happening locally only since all the month data is comming for the asset
   */
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

  const hasData = filteredEntries.length > 0;
  const selectedMonthCount = selectedMonths?.length ?? 0;
  const isCompactSelection = filteredEntries.length > 0 && filteredEntries.length <= 3;
  const labelColumnWidth = isCompactSelection ? 180 : 230;
  const monthColumnMinWidth = '100px';
  const tableClassName = cn('border-separate border-spacing-0 min-w-max w-full');

  return (
    <div ref={chartRef} className={cn('rounded-xl border border-border bg-white p-5 sm:p-6', className)}>
      {!loading && (
        <div className="flex items-start justify-between gap-4">
          <SectionHeader title={title} subtitle={subtitle} icon={icon} />
          <div className={cn('flex shrink-0 items-center gap-3 chart-actions', actionWrapperClassName)}>
            <IconButton
              name="download"
              size={20}
              className="cursor-pointer hover:bg-primary-tint-2! charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onDownload}
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
        <div className="flex justify-end mt-4 items-center gap-3">
          <MultiSelectInput

            labelClassName="text-caption! text-text-secondary! text-nowrap absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 font-InterRegular! mr-1"
            info
            label="Choose Months to Compare"
            infoMessage={'Select any month range to view IAR, Actual, and\nvariance values for the selected months.'}
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

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className={tableClassName} style={isCompactSelection ? {tableLayout: 'fixed'} : undefined}>
            <colgroup>
              <col style={{width: `${labelColumnWidth}px`}} />
              {filteredEntries.map(entry => (
                <Fragment key={getMonthKey(entry.month, entry.year)}>
                  <col key={`${getMonthKey(entry.month, entry.year)}-iar`} style={{width: monthColumnMinWidth}} />
                  <col key={`${getMonthKey(entry.month, entry.year)}-actual`} style={{width: monthColumnMinWidth}} />
                  <col key={`${getMonthKey(entry.month, entry.year)}-var`} style={{width: monthColumnMinWidth}} />
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
                    colSpan={3}
                    className="border-b border-r border-border bg-[#EEF7F7] px-4 py-4 text-center"
                    style={isCompactSelection ? {width: `calc(${monthColumnMinWidth} * 3)`} : undefined}>
                    <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-40! mx-auto" />}>
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
                    <tr key={streamName} className="group">
                      <td
                        className="sticky whitespace-nowrap left-0 z-20 border-b border-r border-border bg-white px-4 py-4"
                        style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                        <WithFallback
                          isLoading={loading}
                          fallback={<Skeleton className="rounded-md! max-w-30! h-4!" />}>
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
                      className="sticky whitespace-nowrap left-0 z-20 border-b border-r border-border bg-[#FEFFE9] px-4 py-4"
                      style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                      <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-30! h-4!" />}>
                        <Text variant="14M">Total (excl. BM, TNUoS)</Text>
                      </WithFallback>
                    </td>
                    {filteredEntries.map(entry => (
                      <TotalCells
                        loading={loading}
                        key={`${getMonthKey(entry.month, entry.year)}-excluding`}
                        data={entry.total_excluding_bm_tnuos}
                      />
                    ))}
                  </tr>

                  <tr className="bg-[#FEFFE9]">
                    <td
                      className="sticky whitespace-nowrap left-0 z-20 border-b border-r border-border bg-[#FEFFE9] px-4 py-4"
                      style={{width: `${labelColumnWidth}px`, minWidth: `${labelColumnWidth}px`}}>
                      <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-30! h-4!" />}>
                        <Text variant="14M">Total (all streams)</Text>
                      </WithFallback>
                    </td>
                    {filteredEntries.map(entry => (
                      <TotalCells
                        loading={loading}
                        key={`${getMonthKey(entry.month, entry.year)}-all`}
                        data={entry.total_all_streams}
                      />
                    ))}
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={1 + filteredEntries.length * 3} className="px-4 py-10 text-center text-text-secondary">
                    No month data available for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <HeatVarianceLabels />
      {!loading && (
        <Alert
          className="mt-4"
          message="Capacity Market, DUoS Battery, and DUoS Fixed Charges are taken from the monthly values configured in Settings. These values remain consistent across all applicable views for the selected month."
        />
      )}
    </div>
  );
}

function FragmentHeader({loading}: {loading: boolean}) {
  return (
    <>
      <th className="border-b border-r border-border bg-[#EEF7F7] whitespace-nowrap px-4 py-3 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14R" className="font-InterLight!">
            IAR (£)
          </Text>
        </WithFallback>
      </th>
      <th className="border-b border-r border-border bg-[#EEF7F7] whitespace-nowrap px-4 py-3 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14R" className="font-InterLight!">
            Actual (£)
          </Text>
        </WithFallback>
      </th>
      <th className="border-b border-r border-border bg-[#EEF7F7] whitespace-nowrap px-4 py-3 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14R" className="font-InterLight!">
            Var (%)
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
  stream: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['streams'][number] | undefined;
  loading: boolean;
}>) {
  const {bgColor, textColor} = getHeatmapTone(stream?.variance_percentage);

  return (
    <>
      <td className="border-b border-r border-border bg-white px-4 whitespace-nowrap py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14R">{stream ? stream.iar_revenue?.toLocaleString() : '-'}</Text>
        </WithFallback>
      </td>
      <td className="border-b border-r border-border bg-white px-4 whitespace-nowrap py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14R">{stream ? stream.actual_revenue?.toLocaleString() : '-'}</Text>
        </WithFallback>
      </td>
      <td style={{backgroundColor: bgColor}} className="border-b border-r border-border bg-white px-4 whitespace-nowrap py-4 text-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text style={{color: textColor}} variant="14R">{stream ? formatPercentage(stream.variance_percentage) : '-'}</Text>
        </WithFallback>
      </td>
    </>
  );
}

function TotalCells({
  data,
  loading,
}: Readonly<{
  data: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['total_all_streams'];
  loading: boolean;
}>) {
  return (
    <>
      <td className="border-b border-r border-border text-center whitespace-nowrap px-4 py-4">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14M">{data.iar_revenue?.toLocaleString()}</Text>
        </WithFallback>
      </td>
      <td className="border-b border-r border-border text-center whitespace-nowrap px-4 py-4">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14M">{data.actual_revenue?.toLocaleString()}</Text>
        </WithFallback>
      </td>
      <td className="border-b border-r border-border text-center whitespace-nowrap px-4 py-4">
        <WithFallback isLoading={loading} fallback={<Skeleton className="rounded-md! max-w-10! h-4! mx-auto" />}>
          <Text variant="14M">{formatPercentage(data.variance_percentage)}</Text>
        </WithFallback>
      </td>
    </>
  );
}
