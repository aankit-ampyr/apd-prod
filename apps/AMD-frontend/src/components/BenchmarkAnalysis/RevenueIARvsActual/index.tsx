import {useEffect, useMemo} from 'react';
import {Text} from '@/ui-kits';
import {
  SectionHeader,
  GroupedBarComparisonData,
  GroupedBarComparisonFilter,
  GroupedBarComparisonChart,
  CompositeChart,
  CommentTrigger,
} from '../../common';
import {BenchmarkAnalysisTabs, BenchmarkAnalysisWidgets, CommentContextType, CommentModule} from '@/constants';
import {AssetBenchnarkTabGroup} from '../types';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetBenchmarkRevenueIARvsActualLoading,
  assetBenchmarkRevenueIARvsActualResult,
} from '@/services/redux/selectors';
import type {AssetBenchmarkRevenueActualvsIAR} from '@/interface';
import {VarianceTable} from './VarianceTable';
import {formatCurrencyToPound, formatNumber, formatPercentage} from '@/utils';
import {RevenueStreamType} from '@/constants';
import {getAssetBenchmarkRevenueIARvsActualRequest} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import { useWidgetComments } from '@/hooks';
import {getAssetBenchmarkRevenueIARvsActualExport} from '@/services/api';

type MonthlyEntry = {
  month: number;
  year: number;
  streams: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['streams'];
  total_excluding_bm_tnuos: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['total_excluding_bm_tnuos'];
  total_all_streams: AssetBenchmarkRevenueActualvsIAR['monthly_data'][string]['total_all_streams'];
};

export function RevenueIARvsActual(props: AssetBenchnarkTabGroup) {
  const {assetId, assetSystemGenerationId, year} = props;
  /**
   * ==================================
   * Hooks
   * ==================================
   */
  const dispatch = useDispatch();

  /**
   * ==================================
   * Selectors
   * ==================================
   */
  const benchmarkData = useSelector(assetBenchmarkRevenueIARvsActualResult);
  const isLoading = useSelector(assetBenchmarkRevenueIARvsActualLoading);
  const { getCommentCountForDataPoint, handleBadgeClick } = useWidgetComments(
    CommentModule.BenchmarkAnalysis,
    BenchmarkAnalysisTabs.RevenueIarVsActual,
    assetId,
    year
  );

  /**
   * ==================================
   * Derived State
   * ==================================
   */
  const monthlyEntries = useMemo(() => {
    if (!benchmarkData?.monthly_data || isLoading) {
      // generate fake data to show loding
      return Array.from({length: 3}).map((item, i): MonthlyEntry => {
        return {
          month: i,
          year: i,
          streams: Array.from({length: 10}).map((item, i): MonthlyEntry['streams'][number] => {
            return {
              actual_revenue: 0,
              iar_revenue: 0,
              variance_percentage: 0,
              revenue_stream: i.toString(),
            };
          }),
          total_all_streams: {
            actual_revenue: 0,
            iar_revenue: 0,
            variance_percentage: 0,
          },
          total_excluding_bm_tnuos: {
            actual_revenue: 0,
            iar_revenue: 0,
            variance_percentage: 0,
          },
        };
      });
    }
    return sortMonthlyEntries(benchmarkData.monthly_data, benchmarkData.year);
  }, [benchmarkData, isLoading]);

  const revenueStreamComparisonData = useMemo(() => buildComparisonData(monthlyEntries), [monthlyEntries, getCommentCountForDataPoint]);
  const comparisonFilters = useMemo(() => buildComparisonFilters(monthlyEntries), [monthlyEntries]);
  const compositeChartData = useMemo(() => buildCompositeChartData(monthlyEntries), [monthlyEntries, getCommentCountForDataPoint]);

  /**
   * ==================================
   * Functions
   * ==================================
   */

  function formatMonthLabel(month: number, year?: number) {
    const date = new Date(year ?? 2025, month - 1);
    if (!year) {
      return new Intl.DateTimeFormat('en-GB', {
        month: 'short',
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function formatStreamLabel(label: string) {
    if (label === RevenueStreamType.WholesaleDayAhead) {
      return 'Wholesale\nDay Ahead';
    }
    if (label === RevenueStreamType.DUoSFixedCharges) {
      return 'DUoS Fixed\nCharges';
    }
    if (label !== RevenueStreamType.TNUoS) {
      return label.split(' ').join('\n');
    }
    return label;
  }

  function sortMonthlyEntries(
    monthlyData: AssetBenchmarkRevenueActualvsIAR['monthly_data'],
    year: number,
  ): MonthlyEntry[] {
    return Object.entries(monthlyData)
      .map(([monthKey, value]) => ({
        month: Number(monthKey),
        year,
        streams: value.streams,
        total_excluding_bm_tnuos: value.total_excluding_bm_tnuos,
        total_all_streams: value.total_all_streams,
      }))
      .filter((entry): entry is MonthlyEntry => Number.isFinite(entry.month) && Number.isFinite(entry.year))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
  }

  function buildComparisonData(monthlyEntries: MonthlyEntry[]): GroupedBarComparisonData {
    const streamOrder: string[] = [];
    const streamLabels = new Map<string, string>();

    for (const monthEntry of monthlyEntries) {
      for (const stream of monthEntry.streams) {
        if (!streamOrder.includes(stream.revenue_stream)) {
          streamOrder.push(stream.revenue_stream);
        }
        if (!streamLabels.has(stream.revenue_stream)) {
          streamLabels.set(stream.revenue_stream, formatStreamLabel(stream.revenue_stream));
        }
      }
    }

    return {
      categories: streamOrder.map(id => ({
        id,
        label: streamLabels.get(id) || id,
      })),
      series: [
        {
          id: 'iarProjection',
          label: 'IAR Projection (£)',
          color: '#8376C9',
          hoverColor: '#6F61B8',
        },
        {
          id: 'actual',
          label: 'Actual (£)',
        },
      ],
      data: monthlyEntries.flatMap(monthEntry =>
        monthEntry.streams.map(stream => ({
          categoryId: stream.revenue_stream,
          filterId: `${monthEntry.year}-${monthEntry.month}`,
          values: {
            actual: stream.actual_revenue,
            iarProjection: stream.iar_revenue,
          },
          commentCounts: {
            _category: getCommentCountForDataPoint(BenchmarkAnalysisWidgets.IarVsActualRevenueByStream, stream.revenue_stream, monthEntry.month),
          },
        })),
      ),
    };
  }

  /**
   * get list of available months from monthly entires
   */
  function buildComparisonFilters(monthlyEntries: MonthlyEntry[]): GroupedBarComparisonFilter[] {
    return monthlyEntries.map(monthEntry => ({
      id: `${monthEntry.year}-${monthEntry.month}`,
      label: formatMonthLabel(monthEntry.month, monthEntry.year),
    }));
  }

  function buildCompositeChartData(monthlyEntries: MonthlyEntry[]) {
    return monthlyEntries.slice(0, 12).map(monthEntry => ({
      label: formatMonthLabel(monthEntry.month, monthEntry.year),
      iar_revenue: monthEntry.total_all_streams.iar_revenue,
      actual_revenue: monthEntry.total_all_streams.actual_revenue,
      variance_percentage: monthEntry.total_all_streams.variance_percentage,
      commentCounts: {
        _category: getCommentCountForDataPoint(BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart, formatMonthLabel(monthEntry.month, monthEntry.year))
      }
    }));
  }

  async function handleDownload(months?: number[]) {
    if (!assetId) return;
    if (!year) return;
    await getAssetBenchmarkRevenueIARvsActualExport({
      assetId,
      year,
      months,
      fileName: `Revenue_IAR_vs_Actual_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? benchmarkData?.year ?? 'year'}.csv`,
    });
  }

  /**
   * ==================================
   * Side Effects
   * ==================================
   */
  useEffect(() => {
    if (!assetId) return;
    if (!year) return;
    dispatch(getAssetBenchmarkRevenueIARvsActualRequest({assetId: Number(assetId), year}));
    dispatch(
      fetchCommentsRequest({
        assetId: Number(assetId),
        context_module: CommentModule.BenchmarkAnalysis,
        context_tab: BenchmarkAnalysisTabs.RevenueIarVsActual,
        context_year: year ?? undefined,
      }),
    );
  }, [assetId, year, dispatch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Text variant="h3">Revenue IAR vs Actual</Text>
        <Text variant="16M" className="text-text-secondary!">
          Compare IAR projected revenue against Actual revenue
        </Text>
      </div>

      <CompositeChart
        formulaRenderer={
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#FFF8E8]">
            <Text variant="14SB" className="text-[#FFA000]!">
              Variance % =
            </Text>
            <Text variant="14M" className="text-text-secondary!">
              ((Actual - IAR) / IAR) * 100%
            </Text>
          </div>
        }
        header={
          <SectionHeader
            title={`Monthly Total Revenue vs IAR with Variance (${year})`}
            subtitle="Monthly comparison of IAR projected revenue vs Actual revenue, with variance % shown across the annual period."
            icon="chart-trend-up"
            className="flex-1 min-w-0 [&>div:last-child]:min-w-0"
          />
        }
        className="mt-4"
        isLoading={isLoading}
        margin={{ top: 60 }}
        xAxisKey="label"
        xAxisLabel="Months"
        data={compositeChartData}
        onBadgeClick={(categoryId, _seriesId) => {
          const [monthStr] = String(categoryId).split(' ');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.indexOf(monthStr) + 1;
          handleBadgeClick(BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart, String(categoryId), monthIndex || undefined);
        }}
        tooltipInteractionMode="item"
        tooltipRenderer={({label, currentData, series}) => {
          return (
            <div className="bg-white px-4 py-2 border-border border rounded-md chart-actions">
              <Text variant="16M">{label}</Text>
              {currentData ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Text variant="14R">
                    IAR Revenue:{' '}
                    <span style={{color: series[0].color}} className="font-InterBold">
                      {formatNumber(currentData.iar_revenue)}
                    </span>
                  </Text>
                  <Text variant="14R">
                    Actual Revenue:{' '}
                    <span style={{color: series[1].color}} className="font-InterBold">
                      {formatNumber(currentData.actual_revenue)}
                    </span>
                  </Text>
                  <Text variant="14R">
                    Variance:{' '}
                    <span style={{color: series[2].color}} className="font-InterBold">
                      {formatNumber(currentData.variance_percentage)}%
                    </span>
                  </Text>
                </div>
              ) : null}
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                    contextModule={CommentModule.BenchmarkAnalysis}
                    contextTab={BenchmarkAnalysisTabs.RevenueIarVsActual}
                    contextWidget={BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart}
                    contextType={CommentContextType.DataPoint}
                    contextAssetId={assetId}
                    contextYear={year}
                    contextDataPoint={label as string}
                    variant="icon-with-text"
                    label="Add Comment"
                    className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    iconClassName="w-4 h-4 text-[#088477]"
                    labelClassName="text-[#088477]"
                  />
              </div>
            </div>
          );
        }}
        downloadFileName={`Monthly_Total_Revenue_vs_IAR_with_Variance_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? 'year'}.png`}
        axes={{
          left: {
            label: 'Total Revenue £ (All Streams)',
            tickFormatter: formatNumber,
            domainStrategy: 'positive',
            domainMaxMultiplier: 1.05,
          },
          right: {
            label: 'Variance (%)',
            tickFormatter: formatPercentage,
            domainStrategy: 'positive',
            domainMaxMultiplier: 1.05,
          },
        }}
        series={[
          {
            key: 'iar_revenue',
            label: 'IAR (£k)',
            tooltipLabel: 'IAR Revenue',
            color: 'var(--color-mint)',
            type: 'bar',
            yAxisId: 'left',
            valueFormatter: value => formatNumber(value),
          },
          {
            key: 'actual_revenue',
            label: 'Actual (£k)',
            tooltipLabel: 'Actual Revenue',
            color: 'var(--color-blue-data',
            type: 'bar',
            yAxisId: 'left',
            valueFormatter: value => formatNumber(value),
          },
          {
            key: 'variance_percentage',
            label: 'Variance',
            tooltipLabel: 'Variance',
            color: '#FEA809',
            type: 'line',
            yAxisId: 'right',
            valueFormatter: value => formatPercentage(value),
          },
        ]}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.RevenueIarVsActual}
            contextWidget={BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIarChart}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />
      <Text variant="14R" className="text-text-secondary!">
        <span className="font-InterMedium">Note</span> : All revenue values shown are net of the 5% GridBeyond revenue
        share.
      </Text>
      <GroupedBarComparisonChart
        header={
          <SectionHeader
            title="IAR vs Actual Revenue by Stream"
            subtitle="Compare IAR projected revenue and Actual revenue across each revenue stream for the selected month."
            icon="chart-trend-up"
          />
        }
        className="mt-4"
        yAxisLabel="Revenue (£)"
        xAxisLabel="Revenue Stream"
        barGap={6}
        data={revenueStreamComparisonData}
        baseSeriesId="iarProjection"
        comparisonSeriesId="actual"
        baseSeriesColor="#8376C9"
        tooltipInteractionMode="item"
        customTooltipRenderer={({baseLabel, categoryId, baseSeries, comparisonSeries, filterId}) => {
          const tooltipItems = [baseSeries, comparisonSeries].filter(Boolean);
          if (!tooltipItems.length) return null;

          return (
            <div className="rounded-md border border-border bg-white px-4 py-3 shadow-md chart-actions">
              <Text variant="14SB" className="text-text-primary!">
                {baseLabel}
              </Text>
              <div className="mt-2 flex flex-col gap-1">
                {tooltipItems.map((item: any) => (
                  <Text key={item.label} variant="12M" className="text-nowrap text-text-secondary!">
                    {item.label}:{' '}
                    <span style={{color: item.color}} className="font-InterBold">
                      {formatCurrencyToPound(item.value)}
                    </span>
                  </Text>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                    contextModule={CommentModule.BenchmarkAnalysis}
                    contextTab={BenchmarkAnalysisTabs.RevenueIarVsActual}
                    contextWidget={BenchmarkAnalysisWidgets.IarVsActualRevenueByStream}
                    contextType={CommentContextType.DataPoint}
                    contextAssetId={assetId}
                    contextYear={year}
                    contextMonth={filterId ? parseInt(filterId.split('-')[1], 10) : undefined}
                    contextDataPoint={categoryId}
                    variant="icon-with-text"
                    label="Add Comment"
                    className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer"
                    iconClassName="w-4 h-4 text-[#088477]"
                    labelClassName="text-[#088477]"
                  />
              </div>
            </div>
          );
        }}
        filters={comparisonFilters}
        filterLabel="Select month"
        formatValue={formatCurrencyToPound}
        downloadFileName={`Revenue_Stream_Comparison_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? 'year'}.png`}
        isLoading={isLoading}
        xAxisLabelProps={{
          offset: -45,
        }}
        onBadgeClick={(categoryId, _seriesId, filterId) => {
          handleBadgeClick(BenchmarkAnalysisWidgets.IarVsActualRevenueByStream, String(categoryId), filterId ? Number(filterId.split('-')[1]) : undefined);
        }}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.RevenueIarVsActual}
            contextWidget={BenchmarkAnalysisWidgets.IarVsActualRevenueByStream}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />

      <VarianceTable
        title={`IAR vs Actual Variance by Stream and Month (${year ?? benchmarkData?.year ?? 'Year'})`}
        subtitle="Month-wise variance percentage between Actual revenue and IAR projection for each revenue stream."
        icon="chart-trend-up"
        className="mt-4"
        downloadFileName=""
        monthlyEntries={monthlyEntries}
        loading={isLoading}
        onDownload={handleDownload}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.RevenueIarVsActual}
            contextWidget={BenchmarkAnalysisWidgets.IarVsActualVariance}
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
