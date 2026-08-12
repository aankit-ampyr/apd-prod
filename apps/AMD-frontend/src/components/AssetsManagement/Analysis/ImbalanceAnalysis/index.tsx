import {AssetAnalysisTabProps} from '../types';
import {GradientKPI, type GradientKPIObject} from '../../common';
import {
  DivergentBarChartV2,
  DivergentBarData,
  GroupedBarChartV2,
  GroupedBarDataPoint,
  GroupedBarSeriesMode,
  Section,
  CommentTrigger,
} from '../../../common';
import {
  CommentContextType,
  CommentModule,
  ViewAnalysisTabs,
  ViewAnalysisWidgets,
  WidgetDataPointPayload,
} from '@/constants';
import {formatCurrencyToPound, formatDate} from '@/utils';
import {Badge, Icon, Text} from '@/ui-kits';
import {TopWorstDays} from './TopWorstDays';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetDetailsFetchLoading,
  assetImbalanceAnalysisDailyBreakdownLoading,
  assetImbalanceAnalysisDailyBreakdownResult,
  assetImbalanceAnalysisHourlyChargesLoading,
  assetImbalanceAnalysisHourlyChargesResult,
  assetImbalanceAnalysisSummaryLoading,
  assetImbalanceAnalysisSummaryResult,
  assetImbalanceAnalysisTopWorstDaysLoading,
  assetImbalanceAnalysisTopWorstDaysResult,
} from '@/services/redux/selectors';
import {setActiveContext, setPanelOpen, fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {AssetImbalanceAnalytics, DataTableColumn} from '@/interface';
import {downloadAssetImbalanceWorstDays} from '@/services/api';
import {useEffect, useMemo} from 'react';
import {
  getAssetImbalanceAnalysisSummaryRequest,
  getAssetImbalanceHourlyChargesRequest,
  getAssetImbalanceDailyBreakdownRequest,
  getAssetImbalanceTopWorstDaysRequest,
} from '@/services/redux/slice';
import {CALENDAR_MONTH_NAMES} from '@/constants';

const KPI_COLOR_CODING: Record<
  'negative' | 'positive' | 'neutral',
  Pick<GradientKPIObject, 'iconBgGradientEnd' | 'iconBgGradientStart' | 'valueColor' | 'iconColor' | 'helperLabel'>
> = {
  negative: {
    iconBgGradientStart: '#FFEBEB',
    iconBgGradientEnd: '#FFF6F6',
    iconColor: '#CD2020',
    valueColor: '#CD2020',
  },
  positive: {
    iconBgGradientStart: '#E1FFFC',
    iconBgGradientEnd: '#F3FFFE',
    iconColor: 'var(--color-success)',
    valueColor: 'var(--color-success)',
  },
  neutral: {
    iconBgGradientStart: '#F1F1F1',
    iconBgGradientEnd: '#F9F9F9',
    iconColor: 'var(--color-text-primary)',
    valueColor: 'var(--color-text-primary)',
  },
};

interface AssetImabalanceAnalsisProps extends AssetAnalysisTabProps {}
export function AssetImabalanceAnalysis(props: AssetImabalanceAnalsisProps) {
  const {assetId, assetSystemGenerationId, month, year} = props;
  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const dispatch = useDispatch();

  /**
   * ==============================
   * Selectors
   * ==============================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const imbalanceSummary = useSelector(assetImbalanceAnalysisSummaryResult);
  const imbalanceSummaryLoading = useSelector(assetImbalanceAnalysisSummaryLoading);
  const imbalanceDailyBreakdown = useSelector(assetImbalanceAnalysisDailyBreakdownResult);
  const imbalanceDailyBreakdownLoading = useSelector(assetImbalanceAnalysisDailyBreakdownLoading);
  const imbalanceTopWorstDays = useSelector(assetImbalanceAnalysisTopWorstDaysResult);
  const imbalanceTopWorstDaysLoading = useSelector(assetImbalanceAnalysisTopWorstDaysLoading);
  const imablanceHourlyCharges = useSelector(assetImbalanceAnalysisHourlyChargesResult);
  const imablanceHourlyChargesLoading = useSelector(assetImbalanceAnalysisHourlyChargesLoading);
  const allComments = useSelector((state: any) => state.comment.comments || []);

  const getCommentCountForDataPoint = <W extends WidgetDataPointPayload['context_widget']>(
    widget: W,
    dataPointId: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
  ) => {
    return allComments.filter(
      (comment: any) =>
        String(comment.context_widget) === String(widget) &&
        (String(comment.context_data_point) === String(dataPointId) ||
          String(dataPointId).includes(String(comment.context_data_point))),
    ).length;
  };

  const handleBadgeClick = <W extends WidgetDataPointPayload['context_widget']>(
    widget: W,
    dataPointId: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
  ) => {
    dispatch(
      setActiveContext({
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.ImbalanceAnalysis,
        context_widget: widget,
        context_data_point: dataPointId,
        context_asset_id: assetId,
        context_year: year,
        context_month: month,
      }),
    );
    dispatch(setPanelOpen(true));
  };

  /**
   * ==============================
   * Derived States
   * ==============================
   */
  /**
   * summary KPIs
   */
  const imbalanceRevenue = imbalanceSummary?.summary?.imbalance_revenue ?? 0;
  const revenuePeriods = imbalanceSummary?.summary?.revenue_periods ?? 0;
  const imbalanceCharge = imbalanceSummary?.summary?.imbalance_charges ?? 0;
  const chargePeriods = imbalanceSummary?.summary?.charge_periods ?? 0;
  const netImabalance = imbalanceSummary?.summary?.net_imbalance ?? 0;
  const percentagePeriodWithCharge = imbalanceSummary?.summary?.percentage_of_periods_with_charges ?? 0;

  const imbalanceSummaryKpis: GradientKPIObject[] = [
    {
      icon: 'scale-imbalance',
      title: 'Imbalance Revenue',
      helperLabel: <Badge message={`↗ ${revenuePeriods} Periods`} size="sm" className="mt-1" color="primary" />,
      value: formatCurrencyToPound(imbalanceRevenue),
      className: 'bg-white',
      ...getResolvedKpiColor(imbalanceRevenue),
    },
    {
      icon: 'current-pound-circle',
      title: 'Imbalance Charges',
      helperLabel: <Badge message={`↗ ${chargePeriods} Periods`} size="sm" className="mt-1" color="primary" />,
      value: formatCurrencyToPound(imbalanceCharge),
      className: 'bg-white',
      ...getResolvedKpiColor(imbalanceCharge),
    },
    {
      icon: 'align-center-horizontal',
      title: 'Net Imbalance',
      helperLabel: (
        <Badge
          icon={netImabalance < 0 ? 'arrow-down-right' : netImabalance > 0 ? 'arrow-up-right' : 'scale'}
          message={netImabalance < 0 ? 'Loss' : netImabalance > 0 ? 'Profit' : 'Balanced'}
          size="sm"
          className="mt-1"
          color={netImabalance < 0 ? 'red' : netImabalance > 0 ? 'primary' : 'gray'}
        />
      ),
      value: formatCurrencyToPound(netImabalance),
      className: 'bg-white',
      ...getResolvedKpiColor(netImabalance),
    },
    {
      icon: 'pie-solid',
      title: '% of Periods with Charges',
      value: `${percentagePeriodWithCharge} %`,
      className: 'bg-white',
      showTooltip: true,
      iconColor: KPI_COLOR_CODING.positive.iconColor,
      iconBgGradientEnd: KPI_COLOR_CODING.positive.iconBgGradientEnd,
      iconBgGradientStart: KPI_COLOR_CODING.positive.iconBgGradientStart,
      tooltipPosition: 'left-top',
      tooltipMessage: (
        <Text variant="12R">
          {
            '% of Periods with Charges = (Number of periods where Imbalance Charge Adjusted > 0 / total number of periods in the selected month ) * 100%'
          }
        </Text>
      ),
    },
  ];

  /**
   * daily breakdown
   */
  const dailyBreakdownChartData: GroupedBarDataPoint[] = useMemo(() => {
    const daily_breakdown = imbalanceDailyBreakdown?.daily_breakdown ?? [];
    return daily_breakdown.map(item => {
      return {
        categoryId: item.date,
        label: item.date,

        values: {
          daily_revenue: item.daily_revenue,
          daily_charges: item.daily_charges,
          daily_net_imbalance: item.daily_net_imbalance,
        },
        commentCounts: {
          daily_revenue: getCommentCountForDataPoint(ViewAnalysisWidgets.DailyImbalanceRevenue, item.date),
        },
      };
    });
  }, [imbalanceDailyBreakdown, allComments]);

  /**
   * worst days
   */
  const worstDaysData = (() => {
    if (imbalanceTopWorstDaysLoading) {
      return Array.from({length: 5}).map((): AssetImbalanceAnalytics['worst_days']['worst_days'][number] => {
        return {
          charges: 0,
          date: '',
          net_imbalance: 0,
          revenue: 0,
        };
      });
    }
    if (!imbalanceTopWorstDays?.worst_days) return [];
    return imbalanceTopWorstDays?.worst_days;
  })();

  /**
   * houlry charges
   */
  const peakImbalaceHour = imablanceHourlyCharges?.peak_imbalance_hour?.hour;
  const peakImbalaceHourCharge = imablanceHourlyCharges?.peak_imbalance_hour?.total_charges ?? 0;
  const hourlyChargesData: DivergentBarData[] = useMemo(() => {
    if (imablanceHourlyChargesLoading || !imablanceHourlyCharges) {
      return Array.from({length: 24}).map((_, index): DivergentBarData => {
        const hour = index.toString();
        return {
          label: hour,
          value: 0,
          commentCount: getCommentCountForDataPoint(ViewAnalysisWidgets.ImbalanceChargesByHour, hour),
        };
      });
    }
    return imablanceHourlyCharges?.hourly_breakdown?.map(item => ({
      label: item.hour,
      value: item.total_charges,
      commentCount: getCommentCountForDataPoint(ViewAnalysisWidgets.ImbalanceChargesByHour, item.hour),
    }));
  }, [imablanceHourlyCharges, imablanceHourlyChargesLoading, allComments]);

  /**
   * ==============================
   * Data Columns
   * ==============================
   */
  const worstDaysColums: DataTableColumn<AssetImbalanceAnalytics['worst_days']['worst_days'][number]>[] = [
    {
      title: 'Date',
      align: 'left',
      name: 'date',
      render: row => <Text variant="12SB">{row.date}</Text>,
    },
    {
      title: 'Revenue (£)',
      align: 'center',
      name: 'revenue',
      render: row => <Text variant="12SB">{formatCurrencyToPound(row.revenue ?? 0)}</Text>,
    },
    {
      title: 'Charges (£)',
      align: 'center',
      name: 'charges',
      render: row => <Text variant="12SB">{formatCurrencyToPound(row.charges ?? 0)}</Text>,
    },
    {
      title: 'Net (£)',
      align: 'center',
      name: 'net-imbalance',
      render: row => (
        <Text style={{color: KPI_COLOR_CODING.negative.valueColor}} variant="12SB">
          {formatCurrencyToPound(row.net_imbalance ?? 0)}
        </Text>
      ),
    },
  ];

  /**
   * ==============================
   * Function and handlers
   * ==============================
   */
  function getResolvedKpiColor(value: number) {
    if (value < 0) {
      return KPI_COLOR_CODING.negative;
    }
    if (value > 0) {
      return KPI_COLOR_CODING.positive;
    }
    return KPI_COLOR_CODING.neutral;
  }

  async function handleDownloadTop5WorstDays() {
    if (!assetId || !month || !year) return;
    await downloadAssetImbalanceWorstDays({
      assetId,
      fileName: `${assetSystemGenerationId}_${month}_${year}_top_5_worst_days.csv`,
      month,
      year,
    });
  }

  /**
   * ==============================
   * Side Effects
   * ==============================
   */
  useEffect(() => {
    if (!assetId || !month || !year) return;

    dispatch(getAssetImbalanceAnalysisSummaryRequest({assetId, month, year}));
    dispatch(getAssetImbalanceTopWorstDaysRequest({assetId, month, year}));
    dispatch(getAssetImbalanceDailyBreakdownRequest({assetId, month, year}));
    dispatch(getAssetImbalanceHourlyChargesRequest({assetId, month, year}));
    dispatch(
      fetchCommentsRequest({
        assetId: Number(assetId),
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.ImbalanceAnalysis,
        context_year: year ?? undefined,
      }),
    );
  }, [assetId, month, year, dispatch]);

  return (
    <div className="flex flex-col gap-8">
      <Section
        icon="tear-down-note"
        title="Imbalance Summary"
        subtitle="Monthly overview of imbalance performance after share adjustment.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {imbalanceSummaryKpis.map(item => (
            <GradientKPI
              {...item}
              key={item.title}
              valueClassName="font-InterBold!"
              isLoading={imbalanceSummaryLoading || assetLoading}
            />
          ))}
        </div>
        <Text variant="14R" className="text-text-secondary!">
          <span className="font-InterSemiBold">Note</span> : All revenue values shown are net of the 5% GridBeyond
          revenue share.
        </Text>
      </Section>

      <Section
        icon="toxic"
        title="Daily Imbalance Breakdown"
        subtitle="Compare daily imbalance revenue and charges to identify high-impact dates.">
        <GroupedBarChartV2
          showTooltip
          tooltipInteractionMode="item"
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.ImbalanceAnalysis}
              contextWidget={ViewAnalysisWidgets.DailyImbalanceRevenue}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_daily_imbalance_breakdown.png`}
          header="Daily Imbalance Revenue vs Charges"
          enableHorizontalScroll
          chartMargins={{ top: 35, right: 10, left: 0, bottom: 0 }}
          className="px-6 py-4 shadow-md shadow-border/30"
          showLegends
          customTooltipRenderer={props => {
            const {category, items, tooltipMeta} = props;
            const date = new Date(category);

            const monthName = CALENDAR_MONTH_NAMES[date.getMonth()];
            const day = date.getDate();
            const year = date.getFullYear();

            const [revenue, charges] = items;

            return (
              <div className="bg-white px-4 py-3 rounded-md border-border border min-w-[240px] chart-actions">
                <Text variant="14M" className="mb-2">
                  <span className="text-body-1! font-InterSemiBold">
                    {monthName} {day} |
                  </span>{' '}
                  {year}
                </Text>
                <Text className="text-text-secondary!" variant="14M">
                  Imbalance Revenue:{' '}
                  <span style={{color: revenue.color, fontFamily: 'Inter-Bold'}}>
                    {formatCurrencyToPound(revenue.value ?? 0)}
                  </span>
                </Text>
                <Text className="text-text-secondary!" variant="14M">
                  Imbalance Charges:{' '}
                  <span style={{color: charges.color, fontFamily: 'Inter-Bold'}}>
                    {formatCurrencyToPound(charges.value ?? 0)}
                  </span>
                </Text>{' '}
                <Text className="text-text-secondary!" variant="14M">
                  Net Imbalance:{' '}
                  <span style={{fontFamily: 'Inter-Bold', color: 'var(--color-text-primary)'}}>
                    {formatCurrencyToPound(tooltipMeta?.daily_net_imbalance ?? 0)}
                  </span>
                </Text>{' '}
                <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
                  <CommentTrigger
                    contextModule={CommentModule.ViewAnalysis}
                    contextTab={ViewAnalysisTabs.ImbalanceAnalysis}
                    contextWidget={ViewAnalysisWidgets.DailyImbalanceRevenue}
                    contextType={CommentContextType.DataPoint}
                    contextAssetId={assetId}
                    contextYear={year}
                    contextMonth={date.getMonth() + 1}
                    contextDataPoint={category}
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
          isLoading={imbalanceDailyBreakdownLoading || assetLoading}
          data={dailyBreakdownChartData}
          onBadgeClick={(categoryId, _seriesId) => {
            handleBadgeClick(ViewAnalysisWidgets.DailyImbalanceRevenue, String(categoryId));
          }}
          formatXAxisTick={item => formatDate(new Date(item), 'MMM d')}
          series={[
            {
              id: 'daily_revenue',
              label: 'Imbalance Revenue',
              mode: GroupedBarSeriesMode.COMPARISON,
              positiveColor: '#4FDB54',
              negativeColor: '#FF4E48',
            },
            {
              id: 'daily_charges',
              label: 'Imbalance Charge',
              mode: GroupedBarSeriesMode.COMPARISON,
              positiveColor: '#1F8A4C',
              negativeColor: '#C51313',
            },
          ]}
          barRadius={4}
          xAxisLabel="Date"
          yAxisLabel="Revenue (£)"
          sepYChartMargins={{ top: 35, bottom: 61 }}
        />
      </Section>

      <TopWorstDays
        data={worstDaysData}
        columns={worstDaysColums}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ViewAnalysis}
            contextTab={ViewAnalysisTabs.ImbalanceAnalysis}
            contextWidget={ViewAnalysisWidgets.Top5WorstImbalance}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            contextMonth={month}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
        onDownload={handleDownloadTop5WorstDays}
        isLoading={imbalanceTopWorstDaysLoading || assetLoading}
      />

      <Section
        icon="clock2"
        title="Imbalance by Hour of Day"
        subtitle="Analyze charge patterns by hour to identify peak imbalance periods.">
        <DivergentBarChartV2
          data={hourlyChargesData}
          onBadgeClick={label => handleBadgeClick(ViewAnalysisWidgets.ImbalanceChargesByHour, label)}
          title="Imbalance Charges by Hour of Day"
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.ImbalanceAnalysis}
              contextWidget={ViewAnalysisWidgets.ImbalanceChargesByHour}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          headerNote={
            <div className="border flex my-1 items-center gap-2 border-warning bg-[#FFFAF4] rounded-md px-4 py-3">
              <Icon name="activity" className="text-warning" />
              <Text variant="14R">
                Peak Imbalance Hour:{' '}
                <span className="text-[#8E4D03]! font-InterSemiBold!">
                  {peakImbalaceHour} = {formatCurrencyToPound(peakImbalaceHourCharge)} in charges
                </span>
              </Text>
            </div>
          }
          chartMargins={{ top: 35, right: 20 }}
          sepYChartMargins={{ top: 35, bottom: 61 }}
          xAxisLabel="Hours"
          barWidth={40}
          barRoomWidth={100}
          xAxisLabelProps={{
            offset: -17,
          }}
          yAxisLabelProps={{
            offset: 8,
          }}
          downloadFileName={`${assetSystemGenerationId}_${month}_${year}_imabalance_charge_by_hour_of_day.png`}
          barRadius={4}
          enableHorizontalScroll
          isLoading={imablanceHourlyChargesLoading || assetLoading}
          yAxisLabel="Total Charges (£)"
          barValueLabelProps={{
            fontSize: 10,
          }}
          positiveBarColor="#1AD2AD"
          positiveBarHoverColor="#05A685"
          negativeBarHoverColor="#B82323"
          showTooltip
          customTooltipRenderer={({data}) => {
            return (
              <div className="bg-white rounded-sm px-3 py-2 border flex flex-col gap-1 border-border min-w-[180px] chart-actions">
                <Text variant="12SB">{data.label}</Text>
                <Text className="text-text-secondary!" variant="12R">
                  Total Charges:{' '}
                  <span className="font-InterSemiBold!" style={{color: data.color}}>
                    {formatCurrencyToPound(data.value)}
                  </span>
                </Text>
                <div className="mt-1 border-t pt-2">
                  <CommentTrigger
                    contextModule={CommentModule.ViewAnalysis}
                    contextTab={ViewAnalysisTabs.ImbalanceAnalysis}
                    contextWidget={ViewAnalysisWidgets.ImbalanceChargesByHour}
                    contextType={CommentContextType.DataPoint}
                    contextAssetId={assetId}
                    contextYear={year}
                    contextMonth={month}
                    contextDataPoint={data.label}
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
        />
      </Section>
    </div>
  );
}
