import React, {useEffect, useMemo} from 'react';
import {AssetBenchnarkTabGroup} from '../types';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetBenchmarkMultiMarketOptimizedVsActualLoading,
  assetBenchmarkMultiMarketOptimizedVsActualResult,
} from '@/services/redux/selectors';
import {AssetBenchmarkMultiMarketOptmizationVsActual} from '@/interface';
import {Text} from '@/ui-kits';
import {
  CompositeChart,
  GroupedBarComparisonChart,
  GroupedBarComparisonData,
  GroupedBarComparisonFilter,
  SectionHeader,
  CommentTrigger,
} from '../../common';
import {BenchmarkAnalysisTabs, BenchmarkAnalysisWidgets, CommentContextType, CommentModule} from '@/constants';
import {formatCurrencyToPound, formatNumber} from '@/utils';
import {MultiMarketComparisonTable} from './MultiMarketComparisonTable';
// import {MissedOpportunity} from './MissedOpportunity';
import type {MonthlyEntry} from './types';
import {getAssetBenchmarkMultiMarketOptimizedVsActualRequest} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {useWidgetComments} from '@/hooks';
import {getAssetBenchmarkMultiMarketOptimizedVsActualExport} from '@/services/api';

interface MultiMarketOptmizationVsActualProps extends AssetBenchnarkTabGroup {}
export function MultiMarketOptmizationVsActual(props: MultiMarketOptmizationVsActualProps) {
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
  const benchmarkData = useSelector(assetBenchmarkMultiMarketOptimizedVsActualResult);
  const isLoading = useSelector(assetBenchmarkMultiMarketOptimizedVsActualLoading);
  const { getCommentCountForDataPoint, handleBadgeClick } = useWidgetComments(
    CommentModule.BenchmarkAnalysis,
    BenchmarkAnalysisTabs.OptimizedVsActual,
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
              optimized_revenue: 0,
              revenue_stream: i.toString(),
            };
          }),
          totals: {
            capture_rate: 0,
            revenue_gap: 0,
            total_actual_revenue: 0,
            total_optimized_revenue: 0,
          },
        };
      });
    }
    return sortMonthlyEntries(benchmarkData.monthly_data, benchmarkData.year);
  }, [benchmarkData, isLoading]);
  const compositeChartData = useMemo(() => buildCompositeChartData(monthlyEntries), [monthlyEntries, getCommentCountForDataPoint]);
  const streamComparisonData = useMemo(() => buildStreamComparisonData(monthlyEntries), [monthlyEntries, getCommentCountForDataPoint]);
  const comparisonFilters = useMemo(() => buildComparisonFilters(monthlyEntries), [monthlyEntries]);

  /**
   * ==================================
   * Functions
   * ==================================
   */
  function sortMonthlyEntries(
    monthlyData: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'],
    year: number,
  ): MonthlyEntry[] {
    return Object.entries(monthlyData)
      .map(([monthKey, value]) => ({
        month: Number(monthKey),
        year,
        streams: value.revenue_streams,
        totals: value.totals,
      }))
      .filter((entry): entry is MonthlyEntry => Number.isFinite(entry.month) && Number.isFinite(entry.year))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
  }

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

  function buildCompositeChartData(monthlyEntries: MonthlyEntry[]) {
    return monthlyEntries.slice(0, 12).map(monthEntry => ({
      label: formatMonthLabel(monthEntry.month, monthEntry.year),
      optimized_revenue: monthEntry.totals.total_optimized_revenue ?? 0,
      actual_revenue: monthEntry.totals.total_actual_revenue ?? 0,
      capture_rate: monthEntry.totals.capture_rate ?? 0,
      commentCounts: {
        _category: getCommentCountForDataPoint(BenchmarkAnalysisWidgets.MonthlyActualVsOptimized, formatMonthLabel(monthEntry.month, monthEntry.year))
      }
    }));
  }

  function formatStreamLabel(label: string) {
    if (label === 'EPEX DA (Day Ahead) IDA1 / ISEM (Intraday)') {
      return 'EPEX DA (Day Ahead)\nIDA1 / ISEM (Intraday)';
    }
    return label.replace(' (', '\n(');
  }

  function buildStreamComparisonData(monthlyEntries: MonthlyEntry[]): GroupedBarComparisonData {
    const streamOrder: string[] = [];

    for (const monthEntry of monthlyEntries) {
      for (const stream of monthEntry.streams) {
        if (!streamOrder.includes(stream.revenue_stream)) {
          streamOrder.push(stream.revenue_stream);
        }
      }
    }

    return {
      categories: streamOrder.map(stream => ({
        id: stream,
        label: formatStreamLabel(stream),
      })),
      series: [
        {
          id: 'optimized',
          label: 'Optimized (£)',
          color: '#6383B9',
          hoverColor: '#4E6FA8',
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
            optimized: stream.optimized_revenue ?? undefined,
            actual: stream.actual_revenue ?? undefined,
          },
          commentCounts: {
            _category: getCommentCountForDataPoint(BenchmarkAnalysisWidgets.StreamWiseOptimized, stream.revenue_stream, monthEntry.month),
          },
        })),
      ),
    };
  }

  function buildComparisonFilters(monthlyEntries: MonthlyEntry[]): GroupedBarComparisonFilter[] {
    return monthlyEntries.map(monthEntry => ({
      id: `${monthEntry.year}-${monthEntry.month}`,
      label: formatMonthLabel(monthEntry.month, monthEntry.year),
    }));
  }

  async function handleDataDownload(months?: number[]) {
    if (!assetId) return;
    if (!year) return;
    await getAssetBenchmarkMultiMarketOptimizedVsActualExport({
      assetId,
      year,
      months,
      fileName: `Monthly_Revenue_Comparison_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? benchmarkData?.year ?? 'year'}.csv`,
    });
  }

  /**
   * ===================================
   * Side Effects
   * ===================================
   */
  useEffect(() => {
    if (!assetId) return;
    if (!year) return;

    dispatch(
      getAssetBenchmarkMultiMarketOptimizedVsActualRequest({
        assetId,
        year,
      }),
    );
    dispatch(
      fetchCommentsRequest({
        assetId: Number(assetId),
        context_module: CommentModule.BenchmarkAnalysis,
        context_tab: BenchmarkAnalysisTabs.OptimizedVsActual,
        context_year: year ?? undefined,
      }),
    );
  }, [year, assetId, dispatch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Text variant="h3">Optimized vs Actual</Text>
        <Text variant="16M" className="text-text-secondary!">
          Compare actual Actual Revenue against Optimized Revenue potential to understand monthly capture performance
          and missed opportunity.
        </Text>
      </div>

      <CompositeChart
        formulaRenderer={
          <div className="flex items-center gap-1.5 rounded-md bg-[#F8F0FF] px-4 py-2">
            <Text variant="14SB" className="text-[#8A2BFF]!">
              Capture Rate % =
            </Text>
            <Text variant="14M" className="text-text-secondary!">
              ((Actual Total / Optimized Total) * 100%)
            </Text>
          </div>
        }
        legend={
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-6 ml-auto mt-2 lg:mt-0">
            <div className="flex items-center gap-2">
              <span className="h-4 w-5 shrink-0 rounded" style={{backgroundColor: '#76EF88'}} />
              <Text variant="14SB" className="text-text-primary!">
                Optimized (£)
              </Text>
            </div>
            <div className="flex items-center gap-2 ml-4 lg:ml-0">
              <span className="h-4 w-5 shrink-0 rounded" style={{backgroundColor: '#00E0EB'}} />
              <Text variant="14SB" className="text-text-primary!">
                Actual (£)
              </Text>
            </div>
            <div className="flex items-center gap-2 ml-8 lg:ml-0">
              <span className="relative flex shrink-0 items-center justify-center">
                <span className="h-0.5 w-8 rounded-full" style={{backgroundColor: '#9809FE'}} />
                <span
                  className="absolute h-2.5 w-2.5 rounded-full border-2 bg-white"
                  style={{borderColor: '#9809FE'}}
                />
              </span>
              <Text variant="14SB" className="text-text-primary!">
                Capture Rate (%)
              </Text>
            </div>
          </div>
        }
        header={
          <SectionHeader
            title="Monthly Actual vs Optimized Revenue"
            subtitle="Bars compare monthly actual and optimized revenue, while the line shows the capture rate percentage achieved for each month."
            icon="chart-trend-up"
            className="flex-1 min-w-0 [&>div:last-child]:min-w-0"
          />
        }
        className="mt-4"
        margin={{ top: 60 }}
        xAxisKey="label"
        xAxisLabel="Months"
        data={compositeChartData}
        onBadgeClick={(categoryId, _seriesId) => {
          const [monthStr] = String(categoryId).split(' ');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.indexOf(monthStr) + 1;
          handleBadgeClick(BenchmarkAnalysisWidgets.MonthlyActualVsOptimized, String(categoryId), monthIndex || undefined);
        }}
        tooltipInteractionMode="item"
        downloadFileName={`Monthly_Actual_vs_Optimized_Revenue_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? benchmarkData?.year ?? 'year'}.png`}
        axes={{
          left: {
            label: 'Total Revenue (£)',
            tickFormatter: formatNumber,
            domainStrategy: 'positive',
            domainMaxMultiplier: 1.02,
          },
          right: {
            label: 'Capture Rate (%)',
            tickFormatter: value => `${Number(value)}%`,
            domainStrategy: 'positive',
            domainMaxMultiplier: 1.02,
          },
        }}
        tooltipRenderer={({label, currentData, series}) => {
          return (
            <div className="bg-white px-4 py-2 border-border border rounded-md">
              <Text variant="16M">{label}</Text>
              {currentData ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Text variant="14R">
                    Optimized Revenue:{' '}
                    <span style={{color: '#4db95d'}} className="font-InterBold">
                      {formatNumber(currentData.optimized_revenue)}
                    </span>
                  </Text>
                  <Text variant="14R">
                    Actual Revenue:{' '}
                    <span style={{color: '#21b3bb'}} className="font-InterBold">
                      {formatNumber(currentData.actual_revenue)}
                    </span>
                  </Text>
                  <Text variant="14R">
                    Capture Rate:{' '}
                    <span style={{color: series[2].color}} className="font-InterBold">
                      {formatNumber(currentData.capture_rate)}%
                    </span>
                  </Text>
                </div>
              ) : null}
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                    contextModule={CommentModule.BenchmarkAnalysis}
                    contextTab={BenchmarkAnalysisTabs.OptimizedVsActual}
                    contextWidget={BenchmarkAnalysisWidgets.MonthlyActualVsOptimized}
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
        series={[
          {
            key: 'optimized_revenue',
            label: 'Optimized (£)',
            color: '#76EF88',
            type: 'bar',
            yAxisId: 'left',
            tooltipLabel: 'Optimized Revenue',
            valueFormatter: value => formatNumber(value),
          },
          {
            key: 'actual_revenue',
            label: 'Actual (£)',
            color: '#00E0EB',
            type: 'bar',
            yAxisId: 'left',
            tooltipLabel: 'Actual Revenue',
            valueFormatter: value => formatNumber(value),
          },
          {
            key: 'capture_rate',
            label: 'Capture Rate (%)',
            color: '#9809FE',
            type: 'line',
            yAxisId: 'right',
            tooltipLabel: 'Capture Rate',
            valueFormatter: value => `${Number(value)}%`,
          },
        ]}
        isLoading={isLoading}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.OptimizedVsActual}
            contextWidget={BenchmarkAnalysisWidgets.MonthlyActualVsOptimized}
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
            iconClassName="mt-1"
            className="items-start"
            title="Stream-wise Optimized vs Actual Revenue"
            subtitle="Compare Optimized Revenue potential against Actual Revenue for each revenue stream in the selected month."
            icon="chart-trend-up"
          />
        }
        className="mt-4"
        data={streamComparisonData}
        filters={comparisonFilters}
        filterLabel="Select month"
        xAxisLabel="Revenue Stream"
        xAxisLabelProps={{offset: -45}}
        yAxisLabel="Revenue (£)"
        onBadgeClick={(categoryId, _seriesId, filterId) => {
          handleBadgeClick(BenchmarkAnalysisWidgets.StreamWiseOptimized, String(categoryId), filterId ? Number(filterId.split('-')[1]) : undefined);
        }}
        tooltipInteractionMode="item"
        barCategoryGap={48}
        showBarValues
        formatValue={formatNumber}
        downloadFileName={`Stream_wise_Optimized_vs_Actual_Revenue_${assetSystemGenerationId ?? assetId ?? 'asset'}_${year ?? benchmarkData?.year ?? 'year'}.png`}
        isLoading={isLoading}
        baseSeriesId="optimized"
        comparisonSeriesId="actual"
        baseSeriesColor="#8379C2"
        comparisonPositiveColor="#1EC590"
        comparisonNegativeColor="#D64545"
        customTooltipRenderer={({baseLabel, categoryId, baseSeries, comparisonSeries, filterId}) => {
          const tooltipItems = [baseSeries, comparisonSeries].filter(Boolean);
          if (!tooltipItems.length) return null;

          return (
            <div className="rounded-md border border-border bg-white px-4 py-3 shadow-md">
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
                    contextTab={BenchmarkAnalysisTabs.OptimizedVsActual}
                    contextWidget={BenchmarkAnalysisWidgets.StreamWiseOptimized}
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
        barGap={10}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.OptimizedVsActual}
            contextWidget={BenchmarkAnalysisWidgets.StreamWiseOptimized}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />

      {/* <MissedOpportunity loading={isLoading} data={monthlyEntries} downloadFileName={`${assetSystemGenerationId}_${year}_`} /> */}

      <MultiMarketComparisonTable
        title="Monthly Revenue Comparison"
        subtitle="Actual vs Optimized revenue per stream with Revenue Gap and Capture Rate."
        icon="chart-trend-up"
        className="mt-4"
        monthlyEntries={monthlyEntries}
        loading={isLoading}
        onDownload={handleDataDownload}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.OptimizedVsActual}
            contextWidget={BenchmarkAnalysisWidgets.MonthlyRevenueComparisonTable}
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
