import {Section, GroupedBarChart, type GroupedBarChartTooltipDetails, CommentTrigger} from '@/components';
import {CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets, WidgetDataPointPayload} from '@/constants';
import {GradientKPI, type GradientKPIObject} from '../../common';
import type {DataTableColumn} from '@/interface';
import {
  assetAncillaryServiceOpportunityCostAnalysisLoading,
  assetAncillaryServiceOpportunityCostAnalysisResult,
  assetAncillaryServiceRevenueBreakdownLoading,
  assetAncillaryServiceRevenueBreakdownResult,
  assetAncillaryServiceRevenueByHourLoading,
  assetAncillaryServiceRevenueByHourResult,
  assetAncillaryServiceSummaryLoading,
  assetAncillaryServiceSummaryResult,
  assetDetailsFetchLoading,
} from '@/services/redux/selectors';
import {
  getAssetAncillaryServiceSummaryRequest,
  getAssetAncillaryServiceRevenueBreakdownRequest,
  getAssetAncillaryServiceRevenueByHourRequest,
  getAssetAncillaryServiceOpportunityCostAnalysisRequest,
} from '@/services/redux/slice';
import {setActiveContext, setPanelOpen, fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {cn, formatCurrencyToPound} from '@/utils';
import {useEffect, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Icon, Text, Tooltip} from '@/ui-kits';
import type {AssetAnalysisTabProps} from '../types';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {
  DivergentBarChart,
  type DivergentBarDataPoint,
  type GroupedBarChartData,
} from '@lazarus/react-common/components';
import {type AncillaryRevenueBreakdownRow, ServiceBreakSection} from './ServiceBreakdownSection';

const ancillaryServiceColors: Record<string, string> = {
  DCH: '#EA6A54',
  DCL: '#FBBA00',
  DMH: '#FFEE6B',
  DML: '#32BA71',
  DRH: '#62CBFF',
  DRL: '#6975F7',
  SFFR: '#6C4795',
};

const ancillaryServices = Object.keys(ancillaryServiceColors);

export function AssetAncillaryServices(props: AssetAnalysisTabProps) {
  const {assetId, month, year, assetSystemGenerationId} = props;
  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const dispatch = useDispatch();
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;
  /**
   * ==============================
   * Selector
   * ==============================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const ancillarySummary = useSelector(assetAncillaryServiceSummaryResult);
  const ancillarySummaryLoading = useSelector(assetAncillaryServiceSummaryLoading);

  const ancillaryBreakdown = useSelector(assetAncillaryServiceRevenueBreakdownResult);
  const ancillaryBreakdownLoading = useSelector(assetAncillaryServiceRevenueBreakdownLoading);

  const ancillaryOpportunityCost = useSelector(assetAncillaryServiceOpportunityCostAnalysisResult);
  const ancillaryOpportunityCostLoading = useSelector(assetAncillaryServiceOpportunityCostAnalysisLoading);

  const ancillaryServiceRevenuByHour = useSelector(assetAncillaryServiceRevenueByHourResult);
  const ancillaryServiceRevenuByHourLoading = useSelector(assetAncillaryServiceRevenueByHourLoading);

  const allComments = useSelector((state: any) => state.comment.comments || []);
  const getCommentCountForDataPoint = <W extends WidgetDataPointPayload['context_widget']>(
    widgetId: W,
    label: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
  ) => {
    return allComments.reduce((acc: number, c: any) => {
      if (c.context_widget !== widgetId) return acc;
      if (c.context_data_point !== label) return acc;
      return acc + 1 + (c.replies?.length || 0);
    }, 0);
  };

  const handleBadgeClick = <W extends WidgetDataPointPayload['context_widget']>(
    widgetId: W,
    categoryId: string | number,
    seriesId: string,
  ) => {
    dispatch(
      setActiveContext({
        context_type: CommentContextType.DataPoint,
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.AncillaryServices,
        context_widget: widgetId,
        context_data_point: `${categoryId}-${seriesId}`,
        context_asset_id: assetId,
        context_year: year,
        context_month: month,
      }),
    );
    dispatch(setPanelOpen(true));
  };

  /**
   * ==============================
   * Derived State
   * ==============================
   */
  const totalAncillaryRevenue = ancillarySummary?.summary?.total_ancillary_revenue || 0;
  const topService = ancillarySummary?.summary?.top_service || '-';
  const servicesUsed = ancillarySummary?.summary?.services_used || 0;
  const totalServices = ancillarySummary?.summary?.total_services || 0;
  const topServiceShare = ancillarySummary?.summary?.top_service_share || 0;

  const ancillarySummaryKpis: GradientKPIObject[] = [
    {
      icon: 'checklist',
      title: 'Total Ancillary Revenue',
      value: formatCurrencyToPound(totalAncillaryRevenue),
      variant: 'orange',
    },
    {
      icon: 'star',
      title: 'Top Service',
      value: topService,
      variant: 'blue',
    },
    {
      icon: 'briefcase',
      title: 'Service Used',
      value: `${servicesUsed}/${totalServices}`,
      variant: 'yellow',
    },
    {
      icon: 'pie',
      title: 'Top Services Share',
      value: `${Math.round(topServiceShare)}%`,
      variant: 'green',
      showTooltip: true,
      tooltipMessage: (
        <Text variant="14R">
          <span className="font-InterMedium">Top Service Share :</span> (Top Service Revenue / Total Ancillary Revenue)
          x 100
        </Text>
      ),
      tooltipPosition: 'left-top',
    },
  ];

  const currentAverageRate = ancillaryOpportunityCost?.opportunity_cost_analysis?.current_avg_rate ?? 0;
  const bestServiceRate = ancillaryOpportunityCost?.opportunity_cost_analysis?.best_service_rate ?? 0;
  const oppotunityCost = ancillaryOpportunityCost?.opportunity_cost_analysis?.opportunity_cost ?? 0;
  const bestService = ancillaryOpportunityCost?.opportunity_cost_analysis.best_service ?? '';

  const oppotunityCostKpis: GradientKPIObject[] = [
    {
      icon: 'activity',
      title: 'Current Avg Rate',
      value: formatCurrencyToPound(currentAverageRate),
      subLabel: '/MWh',
      variant: 'orange',
      showTooltip: true,
      tooltipMessage: (
        <Text variant="14R">
          <span className="font-InterMedium!">Current Avg Rate =</span> Total Ancillary Revenue / Total MW-Hours
        </Text>
      ),
      tooltipPosition: 'top',
    },
    {
      icon: 'star',
      title: 'Best Service Rate',
      value: formatCurrencyToPound(bestServiceRate),
      subLabel: '/MWh',
      variant: 'blue',
      helperLabel: `${bestService} is the best service available`,
      showTooltip: true,
      tooltipMessage: <Text variant="14M">Highest revenue per MW/h achieved by single service</Text>,
      tooltipPosition: 'top',
    },
    {
      icon: 'shield',
      title: 'Opportunity Cost',
      value: formatCurrencyToPound(oppotunityCost),
      variant: 'yellow',
      helperLabel: 'Optimal service already selected',
      showTooltip: true,
      tooltipMessage: (
        <Text variant="14R">
          Opportunity cost = <span className="font-InterMedium!">optimal Revenue</span> -{' '}
          <span className="font-InterMedium!">Actual Revenue</span>
        </Text>
      ),
      tooltipPosition: 'left-top',
    },
  ];

  const tableRows = useMemo(() => {
    if (ancillaryBreakdownLoading) {
      return Array.from({length: 7}).map((_, index) => {
        return {
          service: index.toString(),
          service_name: index.toString(),
          total_revenue: null,
          periods_active: 0,
          avg_price: null,
          revenue_per_mwh: null,
        };
      });
    }
    const apiRows = ancillaryBreakdown?.service_breakdown ?? [];
    return apiRows;
  }, [ancillaryBreakdownLoading, ancillaryBreakdown?.service_breakdown]);

  const revenueByServiceData = useMemo<DivergentBarDataPoint[]>(() => {
    return tableRows.map(row => ({
      label: row.service || '-',
      value: Number(row.total_revenue ?? 0),
      service_name: row.service_name || '-',
    }));
  }, [tableRows]);

  const hourlyServiceRevenueChartData = useMemo<GroupedBarChartData>(() => {
    const hourlyRevenue = ancillaryServiceRevenuByHour?.hourly_revenue ?? [];

    // series
    const series = ancillaryServices.map(service => {
      const serviceKey = service.toUpperCase();

      return {
        id: getAncillaryServiceId(service),
        label: serviceKey,
        color: ancillaryServiceColors[serviceKey],
      };
    });

    // categories
    const categories = (
      hourlyRevenue.length ? hourlyRevenue : Array.from({length: 24}, (_, hour) => ({hour, services: []}))
    ).map(item => ({
      id: item.hour,
      label: String(item.hour),
    }));

    // data
    const data = categories.map(category => {
      const hourRevenue = hourlyRevenue.find(item => item.hour === category.id);
      const values: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};

      if (hourRevenue) {
        hourRevenue.services.forEach(serviceItem => {
          const serviceKey = getAncillaryServiceId(serviceItem.service);
          const revenue = Number(serviceItem.revenue ?? 0);
          if (revenue) {
            values[serviceKey] = revenue;
          }
          commentCounts[serviceKey] = getCommentCountForDataPoint(ViewAnalysisWidgets.ServiceRevenueByHour, `${category.id}-${serviceKey}`);
        });
      }

      return {
        categoryId: category.id,
        values,
        commentCounts,
      };
    });

    return {
      categories,
      series,
      data,
    };
  }, [ancillaryServiceRevenuByHour?.hourly_revenue, allComments]);

  /**
   * ==============================
   * Data Column
   * ==============================
   */
  const columns = useMemo<DataTableColumn<AncillaryRevenueBreakdownRow>[]>(
    () => [
      {
        name: 'service',
        title: (
          <Text variant="14R" className={cn('text-center whitespace-nowrap', isTablet && 'text-[11px]')}>
            Service
          </Text>
        ),
        align: 'center',
        headerAlign: 'center',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '70px' : '110px'},
        render: row => (
          <Text variant="14R" className={cn('', isTablet && 'text-[11px]')}>
            {row.service || '-'}
          </Text>
        ),
      },
      {
        name: 'service_name',
        title: (
          <Text variant="14R" className={cn('text-center whitespace-nowrap', isTablet && 'text-[11px]')}>
            Name
          </Text>
        ),
        align: 'center',
        headerAlign: 'left',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '90px' : '160px'},
        render: row => (
          <Text variant="14M" className={cn('', isTablet && 'text-[11px]')}>
            {row.service_name || '-'}
          </Text>
        ),
      },
      {
        name: 'total_revenue',
        title: (
          <Text variant="14R" className={cn('text-center whitespace-nowrap', isTablet && 'text-[11px]')}>
            Total Revenue <span className="text-text-secondary! font-InterRegular!">(£)</span>{' '}
          </Text>
        ),
        align: 'center',
        headerAlign: 'center',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '120px' : '170px'},
        render: row => (
          <Text variant="14M" className={cn('', isTablet && 'text-[11px]')}>
            {row.total_revenue == null ? '-' : formatCurrencyToPound(row.total_revenue)}
          </Text>
        ),
      },
      {
        name: 'periods_active',
        title: (
          <Text variant="14R" className={cn('text-center whitespace-nowrap', isTablet && 'text-[11px]')}>
            Periods Active
          </Text>
        ),
        align: 'center',
        headerAlign: 'center',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '100px' : '150px'},
        render: row => (
          <Text variant="14M" className={cn('', isTablet && 'text-[11px]')}>
            {row.periods_active == null ? '-' : String(row.periods_active)}
          </Text>
        ),
      },
      {
        name: 'avg_price',
        title: (
          <Text variant="14R" className={cn('text-center whitespace-nowrap', isTablet && 'text-[11px]')}>
            Avg Price per <span className="text-text-secondary!">MWh</span>
          </Text>
        ),
        align: 'center',
        headerAlign: 'center',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '130px' : '230px'},
        render: row => (
          <Text variant="14M" className={cn('', isTablet && 'text-[11px]')}>
            {row.avg_price == null ? '-' : `£${Number(row.avg_price).toFixed(2)}`}
          </Text>
        ),
      },
      {
        name: 'revenue_per_mwh',
        title: (
          <div className={cn('flex items-center justify-center gap-1.5 whitespace-nowrap', isTablet && 'text-[11px]')}>
            <Text variant="14R" className={cn('', isTablet && 'text-[11px]')}>
              Revenue <span className="text-text-secondary! font-InterRegular!">(£)</span> per{' '}
              <span className="text-text-secondary! font-InterRegular!">MWh</span>
            </Text>
            <div className="relative group inline-flex">
              <Tooltip
                portal
                message={
                  <Text variant="14R">
                    <span className="font-InterMedium">Revenue per MW-Hour :</span> (Total Revenue /{' '}
                    <span className="font-InterMedium">Total MW-Hour</span>)
                  </Text>
                }
                position="left-top"
              />
              <Icon name="circle-info-2" />
            </div>
          </div>
        ),
        align: 'center',
        headerAlign: 'center',
        width: {minWidth: width <= TABLET_SCREEN_BREAKPOINT ? '150px' : '230px'},
        render: row => (
          <Text variant="14M" className={cn('', isTablet && 'text-[11px]')}>
            {row.revenue_per_mwh == null ? '-' : `£${Number(row.revenue_per_mwh).toFixed(2)}`}
          </Text>
        ),
      },
    ],
    [width],
  );

  /**
   * =============================
   * Functions
   * =============================
   */
  function renderHourlyRevenueToolTip(toolTipProps: GroupedBarChartTooltipDetails) {
    const value = Number(toolTipProps.activeSeries?.value ?? 0);
    const service = toolTipProps.activeSeries?.label;
    const color = toolTipProps.activeSeries?.color;
    const hour = toolTipProps.categoryId;
    const serviceId = toolTipProps.activeSeries?.seriesId;

    return (
      <div className="bg-white border-border border p-3 rounded pointer-events-auto">
        <Text variant="14M">{service}</Text>
        <Text variant="14M" className="mb-2 block">Hour: {hour?.toString().padStart(2, '0')}:00</Text>
        <Text style={{color}} variant="14M" className="mb-2 block">
          Revenue: {formatCurrencyToPound(value)}
        </Text>

        <div className="mt-2 pt-2 border-t border-[#E2E4EA] flex justify-center w-full">
          <CommentTrigger
            contextType={CommentContextType.DataPoint}
            contextModule={CommentModule.ViewAnalysis}
            contextTab={ViewAnalysisTabs.AncillaryServices}
            contextWidget={ViewAnalysisWidgets.ServiceRevenueByHour}
            contextDataPoint={`${hour}-${serviceId}`}
            contextAssetId={assetId}
            contextYear={year}
            contextMonth={month}
            variant="icon-with-text"
            label="Add Comments"
            className="text-[#088477] w-full flex items-center justify-center hover:bg-transparent!"
            iconClassName="text-[#088477] !w-[12px] !h-[12px]"
            labelClassName="text-[#088477] text-[12px] leading-none"
          />
        </div>
      </div>
    );
  }

  function getAncillaryServiceId(service: string) {
    return service.trim().toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * ==============================
   * Side Effect
   * ==============================
   */
  useEffect(() => {
    if (!assetId || !month || !year) return;

    dispatch(getAssetAncillaryServiceSummaryRequest({assetId, month, year}));
    dispatch(getAssetAncillaryServiceRevenueBreakdownRequest({assetId, month, year}));
    dispatch(getAssetAncillaryServiceOpportunityCostAnalysisRequest({assetId, month, year}));
    dispatch(getAssetAncillaryServiceRevenueByHourRequest({assetId, month, year}));
    dispatch(
      fetchCommentsRequest({
        assetId: Number(assetId),
        context_module: CommentModule.ViewAnalysis,
        context_tab: ViewAnalysisTabs.AncillaryServices,
        context_year: year ?? undefined,
      })
    );
  }, [assetId, dispatch, month, year]);

  return (
    <div className="flex flex-col gap-8 py-4">
      <Section icon="monitor" title="Ancillary Revenue Summary" subtitle="All ancillary services key performance index">
        <div className={cn('grid grid-cols-1 md:grid-cols-4 gap-4', isTablet && 'gap-2')}>
          {ancillarySummaryKpis.map((kpi, index) => (
            <GradientKPI key={index} {...kpi} isLoading={Boolean(ancillarySummaryLoading || assetLoading)} />
          ))}
        </div>
      </Section>

      <Section icon="bar2" title="Revenue by Service" subtitle="Comparative earnings across all ancillary services">
        <DivergentBarChart
          title="Revenue by Ancillary Service"
          data={revenueByServiceData}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.AncillaryServices}
              contextWidget={ViewAnalysisWidgets.RevenueByAncillaryService}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          xKey="label"
          yKey="value"
          downloadFileName={`${assetSystemGenerationId ?? assetId ?? 'asset'}_${month}_${year}_ancillary_service_revenue.png`}
          xAxisLabel="Services"
          yAxisLabel="Revenue (£)"
          tooltipXLabel="Service"
          tooltipYLabel="Revenue"
          positiveBarColor="#35E0A9"
          negativeBarColor="var(--color-error)"
          hoverColor="#68F0C0"
          zeroLineColor="var(--color-border)"
          chartClassName="h-[450px]"
          isLoading={Boolean(ancillaryBreakdownLoading || assetLoading)}
          showValues
          xTickFormatter={value => String(value)}
          yAxisLabelProps={{offset: 12}}
          xAxisLabelProps={{offset: -30}}
          valueLabelProps={{offset: 12}}
          negativeValueLabelProps={{offset: 10}}
          positiveValueLabelProps={{offset: 12}}
        />

        <Text variant="14R" className="text-text-secondary!">
          <span className="font-InterSemiBold">Note</span> : All revenue values shown are net of the 5% GridBeyond
          revenue share.
        </Text>
      </Section>

      <ServiceBreakSection
        columns={columns}
        data={tableRows}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.ViewAnalysis}
            contextTab={ViewAnalysisTabs.AncillaryServices}
            contextWidget={ViewAnalysisWidgets.AncillaryServiceBreakdown}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
              contextMonth={month}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
        loading={Boolean(ancillaryBreakdownLoading || assetLoading)}
        assetId={assetId}
        month={month}
        year={year}
        assetSystemGenerationId={assetSystemGenerationId}
      />

      <Section icon="clock" title="Service Utilization Patterns" subtitle="Hour-by-hour service revenue distribution">
        <GroupedBarChart
          data={hourlyServiceRevenueChartData}
          onBadgeClick={(categoryId, seriesId) => handleBadgeClick(ViewAnalysisWidgets.ServiceRevenueByHour, categoryId, seriesId)}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.ViewAnalysis}
              contextTab={ViewAnalysisTabs.AncillaryServices}
              contextWidget={ViewAnalysisWidgets.ServiceRevenueByHour}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              contextMonth={month}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
          downloadFileName={`${assetSystemGenerationId ?? assetId ?? 'asset'}_${month}_${year}_ancillary_service_revenue_by_hour.png`}
          xAxisLabel="Hour"
          yAxisLabel="Revenue (£)"
          header={<Text variant="h4">Service Revenue by Hour</Text>}
          formatValue={value => formatCurrencyToPound(value)}
          isLoading={Boolean(ancillaryServiceRevenuByHourLoading || assetLoading)}
          tooltipMode="bar"
          // formatYAxisTick={value => formatNumber(Number(value))}
          chartClassName="h-[450px]"
          enableHorizontalScroll
          renderTooltip={renderHourlyRevenueToolTip}
          minCategoryWidth={96}
          maxBarSize={18}
          barGap={0}
          barCategoryGap={15}
        />
      </Section>

      <Section
        icon="shield"
        title="Opportunity Cost Analysis"
        subtitle="What if the Asset had used a different service mix?">
        <div className={cn('grid grid-cols-3 gap-4', isTablet && 'gap-2')}>
          {oppotunityCostKpis.map(item => (
            <GradientKPI
              {...item}
              key={item.title}
              isLoading={Boolean(ancillaryOpportunityCostLoading || assetLoading)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
