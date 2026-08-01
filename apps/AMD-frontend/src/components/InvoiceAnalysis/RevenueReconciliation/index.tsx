import {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {MonthsYearFilter} from './MonthsSelector';
import {
  GroupedBarChartV2,
  GroupedBarDataPoint,
  GroupedBarSeriesMode,
  Section,
  SectionHeader,
} from '@/components/common';
import {
  currentSelectedAsset,
  revenueReconciliationPerStreamComparisonData,
  revenueReconciliationPerStreamComparisonLoading,
  revenueReconciliationSummaryData,
  revenueReconciliationSummaryLoading,
} from '@/services/redux/selectors';
import {
  getRevenueReconciliationPerStreamComparisonRequest,
  getRevenueReconciliationSummaryRequest,
} from '@/services/redux/slice';
import {AssetInvoiceAnalysisTab} from '../types';
import {ReconciliationKpi, ReconciliationKpiObj} from './ReconciliationKpi';
import {formatCurrencyToPound, formatNumber} from '@/utils';
import {Text} from '@/ui-kits';
import {PerStreamComparision} from './PerStreamComparision';
import {CommentTrigger} from '@/components';
import {CommentContextType, CommentModule, InvoiceAnalysisTabs, InvoiceAnalysisWidgets} from '@/constants';
import {useWidgetComments} from '@/hooks';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {EmptyState} from '../EmptyState';
export function InvoicesRevenuReconcilliation(props: AssetInvoiceAnalysisTab) {
  const {assetId, year, assetSystemGenerationId, month} = props;

  /**
   * ===========================
   * Hooks
   * ===========================
   */
  const dispatch = useDispatch();
  const {getCommentCountForDataPoint, handleBadgeClick} = useWidgetComments(
    CommentModule.InvoiceAnalysis,
    InvoiceAnalysisTabs.RevenueReconciliation,
    assetId,
    year,
  );

  /**
   * ============================
   * Selector
  * ============================
   */
  const currentAsset = useSelector(currentSelectedAsset);

  const reconciliationPerStreamLoading = useSelector(revenueReconciliationPerStreamComparisonLoading);
  const reconciliationPerStreamData = useSelector(revenueReconciliationPerStreamComparisonData);
  
  const reconciliationSummaryLoading = useSelector(revenueReconciliationSummaryLoading);
  const reconciliationSummaryData = useSelector(revenueReconciliationSummaryData);

  /**
   * ===========================
   * States
   * ==========================
   */
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  /**
   * ===========================
   * Derived States
   * ===========================
   */
  /**
   * get avaialable months based on asser reports file (merged/optimized)
   */
  const availableAggScadaPeriods = currentAsset?.available_periods ?? [];
  const availableSummaryStatementPeriods = currentAsset?.available_summary_statement_periods ?? [];

  const availableMonths = (() => {
    const availableAggScadaMonths = new Set<number>(
      availableAggScadaPeriods.filter(period => period.year === year).map(period => period.month),
    );
    const availableSummaryStatementMonths = new Set<number>(
      availableSummaryStatementPeriods.filter(period => period.year === year).map(period => period.month),
    );
    const commonMonths = new Set<number>(
      [...availableAggScadaMonths].filter(x => availableSummaryStatementMonths.has(x)),
    );
    return Array.from(commonMonths);
  })();

  // KPIS data
  const grossRevenue = reconciliationSummaryData?.gross_revenue ?? 0;
  const gridBeyondFee = reconciliationSummaryData?.gridbeyond_fee ?? 0;
  const expectedNet = reconciliationSummaryData?.expected_net ?? 0;
  const reportedNet = reconciliationSummaryData?.reported_net ?? 0;
  const variance = reconciliationSummaryData?.variance ?? 0;

  const KPI_DATA: ReconciliationKpiObj[] = [
    {
      accentColor: '#0086F3',
      bgGradientEnd: '#FEFFFF',
      bgGradientStart: '#F1FAFF',
      borderColor: '#91ABF9',
      label: 'Gross Revenue',
      value: formatCurrencyToPound(grossRevenue),
    },
    {
      accentColor: '#FFD21E',
      bgGradientEnd: '#FFFFFE',
      bgGradientStart: '#FFFDF0',
      borderColor: 'var(--color-border)',
      label: 'GridBeyond Fee (5%)',
      value: formatCurrencyToPound(gridBeyondFee),
    },
    {
      accentColor: '#6D2D92',
      bgGradientEnd: '#FEFEFF',
      bgGradientStart: '#F7F6FF',
      borderColor: 'var(--color-border)',
      label: 'Expected Net (95%)',
      value: formatCurrencyToPound(expectedNet),
    },
    {
      accentColor: '#EF8000',
      bgGradientEnd: '#FFFFFE',
      bgGradientStart: '#FFF7EF',
      borderColor: 'var(--color-border)',
      label: 'Reported Net',
      value: formatCurrencyToPound(reportedNet),
    },
    {
      accentColor: 'var(--color-success)',
      bgGradientEnd: '#FEFFFF',
      bgGradientStart: '#EDFFF5',
      borderColor: '#A1E5AB',
      label: 'Variance',
      value: formatCurrencyToPound(variance),
      tooltipText: (
        <Text variant="12R">
          <span className="font-InterMedium!">Variance =</span> Reported Net - Expected Net
        </Text>
      ),
      tooltipPosition: 'left-top',
    },
  ];

  // graph data
  const revenueByStreamData = reconciliationPerStreamData?.per_stream_comparison ?? [];
  const revenueByStreamChartData: GroupedBarDataPoint[] = revenueByStreamData.map(item => {
    const dataPointId = item.stream;
    return {
      categoryId: dataPointId,
      label: item.stream,
      values: {
        gross_revenue: item.gross_revenue ?? 0,
        expected_net: item.expected_net ?? 0,
        reported_net: item.reported_net ?? 0,
      },
      commentCounts: {
        gross_revenue:
          getCommentCountForDataPoint?.(InvoiceAnalysisWidgets.RevenueByStreamComparison, dataPointId) ?? 0,
      },
    };
  });

  /**
   * ===========================
   * Functions
   * ===========================
   */
  function formatTickForXAxis(tick: string) {
    if (tick === 'EPEX DAM 30') {
      return 'EPEX\nDAM 30';
    }
    if (tick === 'EPEX DAM 60') {
      return 'EPEX\nDAM 60';
    }
    return tick;
  }

  /**
   * ===========================
   * Side Effects
   * ===========================
   */
  useEffect(() => {
    if (assetId) {
      dispatch(
        fetchCommentsRequest({
          assetId,
          context_module: CommentModule.InvoiceAnalysis,
          context_tab: InvoiceAnalysisTabs.RevenueReconciliation,
          context_year: year ?? undefined,
        }),
      );
    }
  }, [assetId, year, dispatch]);

  useEffect(() => {
    if (!availableMonths.length) return;
    if (month && availableMonths.includes(month)) {
      setSelectedMonths([month]);
    } else {
      setSelectedMonths(availableMonths);
    }
  }, [availableMonths, month]);

  useEffect(() => {
    if (!assetId || !year || !selectedMonths.length) return;

    dispatch(
      getRevenueReconciliationSummaryRequest({
        assetId,
        year,
        months: selectedMonths,
      }),
    );

    dispatch(
      getRevenueReconciliationPerStreamComparisonRequest({
        assetId,
        year,
        months: selectedMonths,
      }),
    );
  }, [assetId, year, selectedMonths, dispatch]);

  const isSelectedMonthUnavailable = month !== undefined && !availableMonths.includes(month);

  if (!availableMonths.length || isSelectedMonthUnavailable) {
    return (
      <EmptyState
        icon="invoice-upload"
        title="No revenue reconciliation data available"
        subtitle="Make sure the Summary Statement, Aggregator data, and SCADA data are uploaded for the selected asset and reporting period to view this analysis."
      />
    );
  }

  return (
    <div className="py-4 flex flex-col gap-4">
      {/* filter & KPIs */}
      <Section
        icon="chart-trend-up"
        title="Revenue Reconciliation"
        subtitle="Comparing Master CSV (gross) vs Summary Statement (net 95%, after 5% GridBeyond fee)">
        <MonthsYearFilter
          year={year}
          months={selectedMonths}
          disabled={month !== undefined}
          available_months={availableMonths}
          onMonthChange={setSelectedMonths}
        />
        <div className="grid-cols-5 grid gap-4">
          {KPI_DATA.map((kpi, index) => (
            <ReconciliationKpi key={index} loading={reconciliationSummaryLoading} {...kpi} />
          ))}
        </div>
      </Section>

      {/* Revenue by Stream */}
      <GroupedBarChartV2
        header={
          <SectionHeader
            icon="growth"
            title="Revenue by Stream"
            subtitle="Gross vs Expected Net (x0.95) vs Reported Net per revenue stream"
          />
        }
        customActions={
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.RevenueReconciliation}
            contextWidget={InvoiceAnalysisWidgets.RevenueByStreamComparison}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
        data={revenueByStreamChartData}
        onBadgeClick={(categoryId, _seriesId) => {
          handleBadgeClick?.(InvoiceAnalysisWidgets.RevenueByStreamComparison, String(categoryId));
        }}
        series={[
          {
            id: 'gross_revenue',
            label: 'Gross Revenue',
            color: '#0086F3',
            mode: GroupedBarSeriesMode.NORMAL,
          },
          {
            id: 'expected_net',
            label: 'Expected Net',
            color: '#895DA4',
            mode: GroupedBarSeriesMode.NORMAL,
          },
          {
            id: 'reported_net',
            label: 'Reported Net',
            color: '#ED9024',
            mode: GroupedBarSeriesMode.NORMAL,
          },
        ]}
        xAxisLabel="Revenue Stream"
        yAxisLabel="Revenue (£)"
        showLegends
        formatYAxisTick={value => formatNumber(Number(value))}
        showTooltip
        tooltipInteractionMode="item"
        customTooltipRenderer={props => {
          const {category, items} = props;
          return (
            <div className="border flex flex-col gap-1 border-border bg-white p-4 rounded-md">
              <Text variant="14SB">{category}</Text>
              {items.map((item, i) => (
                <Text key={i} variant="14R" className="text-text-secondary!">
                  {item.label}:{' '}
                  <span style={{color: item.color}} className="font-InterSemiBold">
                    {formatCurrencyToPound(item.value)}
                  </span>
                </Text>
              ))}
              <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                <CommentTrigger
                  contextModule={CommentModule.InvoiceAnalysis}
                  contextTab={InvoiceAnalysisTabs.RevenueReconciliation}
                  contextWidget={InvoiceAnalysisWidgets.RevenueByStreamComparison}
                  contextType={CommentContextType.DataPoint}
                  contextAssetId={assetId}
                  contextYear={year}
                  contextDataPoint={String(category)}
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
        formatXAxisTick={formatTickForXAxis}
        downloadFileName={`${assetSystemGenerationId}_${year}_revenue_reconciliation_revenue_by_stream_comparision.png`}
        isLoading={reconciliationPerStreamLoading}
        barWidth={20}
        xAxisLabelProps={{
          offset: -18,
        }}
        barRadius={4}
      />

      {/* per stream comparision */}
      <PerStreamComparision
        assetId={assetId ?? 0}
        selectedMonths={selectedMonths}
        year={year}
        data={reconciliationPerStreamData?.per_stream_comparison}
        total={reconciliationPerStreamData?.total_stream_data}
        loading={reconciliationPerStreamLoading}
        downloadFileName={`${assetSystemGenerationId}_${year}_revenue_reconciliation_per_stream_comparision.csv`}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.InvoiceAnalysis}
            contextTab={InvoiceAnalysisTabs.RevenueReconciliation}
            contextWidget={InvoiceAnalysisWidgets.PerStreamComparisonTable}
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
