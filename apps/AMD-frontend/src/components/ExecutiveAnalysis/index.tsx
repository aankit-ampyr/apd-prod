import {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {MonthlyRevenueComparison} from './MonthlyRevenueComparison';
import {
  assetDetailsFetchLoading,
  assetExecutiveMonthlyRevenueComparisonLoading,
  assetExecutiveMonthlyRevenueComparisonResult,
  assetExecutiveRevenueByStreamLoading,
  assetExecutiveRevenueByStreamResult,
  assetExecutiveSummaryLoading,
  assetExecutiveSummaryResult,
} from '@/services/redux/selectors';
import {RevenueByStream} from './RevenueByStream';
import {CompositeChart, SectionHeader, CommentTrigger} from '@/components';
import {CALENDAR_MONTHS_SHORT_NAMES, CommentContextType, CommentModule, ExecutiveAnalysisWidgets} from '@/constants';
import {IconButton, Text} from '@/ui-kits';
import {downloadChart, formatCurrencyToPound} from '@/utils';
import {RevenueByStreamGraphComparison} from './RevenueByStreamGraphComparison';
import {ExecutiveSummaryKpi, ExecutiveSummaryKpiObject} from './ExecutiveSummaryKpi';
import {
  getExecutiveAnalysisMonthlyRevenueComparisonRequest,
  getExecutiveAnalysisRevenueByStreamRequest,
  getExecutiveAnalysisSummaryRequest,
} from '@/services/redux/slice';
import { fetchCommentsRequest } from '@/services/redux/slice/commentSlice';
import { useWidgetComments } from '@/hooks';
import {
  getAssetExecutiveAnalysisMonthRevenueComparisonExport,
  getAssetExecutiveAnalysisRevenueByStreamExport,
} from '@/services/api';

interface ExecutiveAnalysisProps {
  asset_id?: number;
  assetSystemGenerationId?: string;
  year?: number;
}

export function ExecutiveAnalysis(props: ExecutiveAnalysisProps) {
  const {asset_id, year, assetSystemGenerationId} = props;

  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const dispatch = useDispatch();

  /**
   * ===========================
   * Selector
   * ===========================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);

  const monthlyRevenueComparisonData = useSelector(assetExecutiveMonthlyRevenueComparisonResult);
  const monthlyRevenueComparisonDataLoading = useSelector(assetExecutiveMonthlyRevenueComparisonLoading);

  const revenueByStreamData = useSelector(assetExecutiveRevenueByStreamResult);
  const revenueByStreamDataLoading = useSelector(assetExecutiveRevenueByStreamLoading);

  const summaryKpiData = useSelector(assetExecutiveSummaryResult);
  const summaryKpiLoading = useSelector(assetExecutiveSummaryLoading);
  const { getCommentCountForDataPoint, handleBadgeClick } = useWidgetComments(
    CommentModule.ExecutiveAnalysis,
    null,
    asset_id,
    year
  );

  /**
   * ===========================
   * States & Constants
   * ===========================
   */
  const summaryChartRef = useRef<HTMLDivElement | null>(null);

  /**
   * ===========================
   * Derived States
   * ===========================
   */
  const monthRevenueData = monthlyRevenueComparisonData?.monthly_comparison || [];
  const streamRevenueData = revenueByStreamData?.monthly_comparison || [];

  const monthlyRevenueChartData = (() => {
    return monthRevenueData.map(item => ({
      label: `${CALENDAR_MONTHS_SHORT_NAMES[item.month - 1]} ${year}`,
      actual_revenue: item.actual_revenue ?? 0,
      optmized_revenue: item.optimized_revenue ?? 0,
      capture_rate: item.capture_rate ?? 0,
      commentCounts: {
        _category: getCommentCountForDataPoint(ExecutiveAnalysisWidgets.ActualVsOptimal, `${CALENDAR_MONTHS_SHORT_NAMES[item.month - 1]} ${year}`)
      }
    }));
  })();

  const shouldShowSummaryKpis =
    summaryKpiLoading || (summaryKpiData?.weakest_month != null && summaryKpiData?.strongest_month != null);
  const summaryKpi: ExecutiveSummaryKpiObject[] = [
    {
      accentColor: 'var(--color-error)',
      icon: 'stove-trend-down',
      contentBgGradientEnd: '#FFF3EA',
      contentBgGradientStart: '#FFFBF7',
      headerBorderColor: '#E38383',
      iconBgGradientStart: '#FFF9F7',
      iconBgGradientEnd: '#FFE9E0',
      captureRate: summaryKpiData?.weakest_month?.capture_rate ?? 0,
      imbalance: summaryKpiData?.weakest_month?.imbalance ?? 0,
      revenueGap: summaryKpiData?.weakest_month?.revenue_gap ?? 0,
      title: `Weakest month — ${CALENDAR_MONTHS_SHORT_NAMES[(summaryKpiData?.weakest_month?.month ?? 0) - 1]} ${summaryKpiData?.year}`,
    },
    {
      accentColor: 'var(--color-success)',
      icon: 'calendar-zap',
      contentBgGradientEnd: '#F1FFF2',
      contentBgGradientStart: '#FBFFFB',
      headerBorderColor: '#42BE7C',
      iconBgGradientStart: '#F7FFF8',
      iconBgGradientEnd: '#E0FFE0',
      captureRate: summaryKpiData?.strongest_month?.capture_rate ?? 0,
      imbalance: summaryKpiData?.strongest_month?.imbalance ?? 0,
      revenueGap: summaryKpiData?.strongest_month?.revenue_gap ?? 0,
      title: `Strongest month — ${CALENDAR_MONTHS_SHORT_NAMES[(summaryKpiData?.strongest_month?.month ?? 0) - 1]} ${summaryKpiData?.year}`,
    },
  ];

  /**
   * ===========================
   * Function
   * ===========================
   */
  function handleDownloadExecutiveSummary() {
    if (summaryChartRef?.current) {
      downloadChart(summaryChartRef, `${assetSystemGenerationId}_${year}_executive_summary.png`);
    }
  }

  async function handleDownloadMonthyRevenueComparison(months: number[]) {
    if (!asset_id || !year) return;

    await getAssetExecutiveAnalysisMonthRevenueComparisonExport({
      months,
      assetId: asset_id,
      fileName: `${assetSystemGenerationId}_${year}_executive_monthly_revenue_comparison.csv`,
      year,
    });
  }

  async function handleDownloadRevenueByStream(months: number[]) {
    if (!asset_id || !year) return;

    await getAssetExecutiveAnalysisRevenueByStreamExport({
      assetId: asset_id,
      months,
      fileName: `${assetSystemGenerationId}_${year}_executive_revenue_by_stream.csv`,
      year,
    });
  }

  /**
   * ===========================
   * Side Effects
   * ===========================
   */
  useEffect(() => {
    if (!asset_id || !year) return;

    dispatch(
      getExecutiveAnalysisSummaryRequest({
        assetId: asset_id,
        year,
      }),
    );
    dispatch(
      fetchCommentsRequest({
        assetId: Number(asset_id),
        context_module: CommentModule.ExecutiveAnalysis,
        context_year: year ?? undefined,
      }),
    );
    dispatch(getExecutiveAnalysisRevenueByStreamRequest({assetId: asset_id, year}));
    dispatch(getExecutiveAnalysisMonthlyRevenueComparisonRequest({assetId: asset_id, year}));
  }, [asset_id, year, dispatch]);

  /**
   * ===========================
   * render guard
   * ===========================
   */
  if (!asset_id || !year) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* summary */}
      {shouldShowSummaryKpis && (
        <div
          ref={summaryChartRef}
          className="rounded-lg border border-border p-4 bg-white relative flex flex-col gap-4">
          <div className="flex gap-1 justify-between items-start">
            <SectionHeader
              icon="file-pound"
              title="Executive Summary"
              subtitle="Auto-generated highlights from the selected period."
            />
            {!(summaryKpiLoading || assetLoading) && (
              <IconButton
                size={20}
                name="download"
                onClick={handleDownloadExecutiveSummary}
                className="hover:bg-primary-tint-2! chart-actions cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {summaryKpi.map(item => (
              <ExecutiveSummaryKpi {...item} key={item.title} loading={summaryKpiLoading || assetLoading} />
            ))}
          </div>
        </div>
      )}

      {/* composite graph */}
      <CompositeChart
        isLoading={monthlyRevenueComparisonDataLoading || assetLoading}
        formulaRenderer={
          <div className="flex items-center gap-1.5 rounded-md bg-[#FFFAE9] px-4 py-2">
            <Text variant="14SB" className="text-[#F09C01]!">
              Capture Rate % =
            </Text>
            <Text variant="14M" className="text-[#80776B]!">
              (Actual /Optimal)* 100%
            </Text>
          </div>
        }
        header={
          <SectionHeader
            icon="bar4"
            title="Actual vs Optimal Revenue Trend"
            subtitle="Compare Actual and Optimal Revenue with monthly Capture Rate for the selected year."
          />
        }
        showBarPointValues={false}
        data={monthlyRevenueChartData}
        tooltipInteractionMode="item"
        downloadFileName={`${assetSystemGenerationId}_${year}_executive_monthly_revenue_comparison.png`}
        tooltipRenderer={({label, payload}) => {
          const actual = payload.find(item => item.dataKey === 'actual_revenue');
          const optmized = payload.find(item => item.dataKey === 'optmized_revenue');
          const capture_rate = payload.find(item => item.dataKey === 'capture_rate');
          return (
            <div className="bg-white rounded-md border border-border px-4 py-2 shadow-md">
              <Text variant="14M">{label}</Text>
              <Text variant="14M" className="text-text-secondary!">
                {actual?.name}:{' '}
                <span style={{color: '#25C693'}} className="font-InterBold!">
                  {formatCurrencyToPound(Number(actual?.value ?? 0))}
                </span>
              </Text>
              <Text variant="14M" className="text-text-secondary!">
                {optmized?.name}:{' '}
                <span style={{color: '#247CB6'}} className="font-InterBold!">
                  {formatCurrencyToPound(Number(optmized?.value ?? 0))}
                </span>
              </Text>
              <Text variant="14M" className="text-text-secondary!">
                {capture_rate?.name}:{' '}
                <span style={{color: '#FEA809'}} className="font-InterBold!">
                  {Number(capture_rate?.value ?? 0)}%
                </span>
              </Text>
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                  contextModule={CommentModule.ExecutiveAnalysis}
                  contextTab={null}
                  contextWidget={ExecutiveAnalysisWidgets.ActualVsOptimal}
                  contextType={CommentContextType.DataPoint}
                  contextAssetId={asset_id}
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
        onBadgeClick={(categoryId, _seriesId) => {
          const [monthStr] = String(categoryId).split(' ');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.indexOf(monthStr) + 1;
          handleBadgeClick(ExecutiveAnalysisWidgets.ActualVsOptimal, String(categoryId), monthIndex || undefined);
        }}
        xAxisLabel="Months"
        axes={{
          left: {
            label: 'Revenue (£)',
            domainMaxMultiplier: 1.01,
          },
          right: {
            label: 'Capture Rate (%)',
            tickFormatter: value => `${value}%`,
          },
        }}
        series={[
          {
            key: 'actual_revenue',
            label: 'Actual Revenue',
            color: '#25C693',
            type: 'bar',
            yAxisId: 'left',
            tooltipLabel: 'Actual Revenue',
          },
          {
            key: 'optmized_revenue',
            label: 'Optimal Revenue',
            color: '#247CB6',
            type: 'bar',
            yAxisId: 'left',
            tooltipLabel: 'Optimal Revenue',
          },
          {
            key: 'capture_rate',
            label: 'Capture Rate (%)',
            color: '#FEA809',
            type: 'line',
            yAxisId: 'right',
            tooltipLabel: 'Capture Rate',
          },
        ]}
        xAxisKey="label"
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ExecutiveAnalysis}
            contextTab={null}
            contextWidget={ExecutiveAnalysisWidgets.ActualVsOptimal}
            contextType={CommentContextType.Widget}
            contextAssetId={asset_id}
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

      {/* monthly Comparision data */}
      <MonthlyRevenueComparison
        className='mt-3'
        data={monthRevenueData}
        year={year}
        onDownload={handleDownloadMonthyRevenueComparison}
        loading={monthlyRevenueComparisonDataLoading || assetLoading}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ExecutiveAnalysis}
            contextTab={null}
            contextWidget={ExecutiveAnalysisWidgets.MonthlyRevenueComparison}
            contextType={CommentContextType.Widget}
            contextAssetId={asset_id}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />

      {/* revenue by stream graph */}
      <RevenueByStreamGraphComparison
        data={streamRevenueData}
        year={year}
        downloadFileName={`${assetSystemGenerationId}_${year}_executive_revenue_by_stream.png`}
        loading={revenueByStreamDataLoading || assetLoading}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ExecutiveAnalysis}
            contextTab={null}
            contextWidget={ExecutiveAnalysisWidgets.ActualRevenueByStream}
            contextType={CommentContextType.Widget}
            contextAssetId={asset_id}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />

      {/* revenue by stream comparison */}
      <RevenueByStream
        data={streamRevenueData}
        year={year}
        loading={revenueByStreamDataLoading || assetLoading}
        onDownload={handleDownloadRevenueByStream}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ExecutiveAnalysis}
            contextTab={null}
            contextWidget={ExecutiveAnalysisWidgets.MonthlyRevenueByStream}
            contextType={CommentContextType.Widget}
            contextAssetId={asset_id}
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
