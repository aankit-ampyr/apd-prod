import {Alert, Icon, IconButton, SelectInput, Skeleton, Text} from '@/ui-kits';
import {cn, getErrorMessage} from '@/utils';
import {AnalyticsTable, SectionHeader, WithFallback} from '../../common';
import {Asset, DataTableColumn} from '@/interface';
import {useDispatch, useSelector} from 'react-redux';
import {
  assetIndustryBenchmarkAnalysisLoading,
  assetIndustryBenchmarkAnalysisResult,
  currentSelectedAsset,
} from '@/services/redux/selectors';
import {useEffect, useState} from 'react';
import {getIndustryComparisonRequest} from '@/services/redux/slice';
import {fetchCommentsRequest} from '@/services/redux/slice/commentSlice';
import {downloadAssetIndustryBenchmarkAnalysis} from '@/services/api';
import {useChartsActionV2, useToast, useWindowDimensions} from '@/hooks';
import {BenchmarkAnalysisTabs, BenchmarkAnalysisWidgets, TABLET_SCREEN_BREAKPOINT} from '@/constants';
import {InductryComparisonGraph} from './InductryComparisonGraph';
import type {ChartSeries} from './InductryComparisonGraph';
import {CommentTrigger} from '@/components/common';
import {CommentContextType, CommentModule} from '@/constants';

type Row = {
  month: string;
  actual: number;
  modo: number;
  iar: number;
  actual_vs_modo: number;
  actual_vs_iar: number;
};

type BenchmarkOption = {
  id: string;
  label: string;
};

const BENCHMARK_OPTIONS: BenchmarkOption[] = [{id: 'modo', label: 'Modo'}];

type IndustryComparisonTableProps = {
  columns: DataTableColumn<Row>[];
  data: Row[];
  onDownload: () => void;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  customActions?: React.ReactNode;
};
function formatPound(value: number) {
  return `\u00a3${value.toLocaleString('en-GB')}`;
}

function getNiceStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1000;

  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;

  if (fraction <= 1) return base;
  if (fraction <= 2) return 2 * base;
  if (fraction <= 5) return 5 * base;

  return 10 * base;
}

function buildYAxisScale(values: number[]) {
  const MAX_TICKS = 7;
  const finiteValues = values.filter(Number.isFinite);

  if (!finiteValues.length) {
    return {
      min: 0,
      max: 60000,
      ticks: [60000, 50000, 40000, 30000, 20000, 10000, 0],
    };
  }

  const rawMinValue = Math.min(...finiteValues);
  const rawMaxValue = Math.max(...finiteValues);
  const rawRange = rawMaxValue - rawMinValue;
  const padding = Math.max(rawRange * 0.1, 5000);
  const paddedMinValue = Math.max(0, rawMinValue - padding);
  const paddedMaxValue = rawMaxValue + padding;
  const step = getNiceStep((paddedMaxValue - paddedMinValue) / (MAX_TICKS - 1));
  const min = Math.max(0, Math.floor(paddedMinValue / step) * step);
  const max = Math.ceil(paddedMaxValue / step) * step;
  const tickCount = Math.floor((max - min) / step) + 1;

  if (tickCount <= MAX_TICKS) {
    return {
      min,
      max,
      ticks: Array.from({length: tickCount}, (_, index) => max - index * step),
    };
  }

  const adjustedStep = getNiceStep((max - min) / (MAX_TICKS - 1));
  const adjustedMin = Math.max(0, Math.floor(paddedMinValue / adjustedStep) * adjustedStep);
  const adjustedMax = adjustedMin + adjustedStep * (MAX_TICKS - 1);

  return {
    min: adjustedMin,
    max: adjustedMax,
    ticks: Array.from({length: MAX_TICKS}, (_, index) => adjustedMax - index * adjustedStep),
  };
}

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function PercentBadge({value}: Readonly<{value: number}>) {
  const isPositive = value >= 100;

  return (
    <div className="flex justify-end">
      <div
        className={cn(
          'px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit',
          isPositive ? 'bg-[#ECFDF3] text-success' : 'bg-[#FEF3F2] text-error',
        )}>
        {isPositive ? <Icon name="trending-up" /> : <Icon name="trending-down" />} {value}%
      </div>
    </div>
  );
}

function getUniqueYearsFromAsset(asset: {available_periods?: Asset['available_periods']} | null | undefined): number[] {
  const periods = asset?.available_periods ?? [];

  return Array.from(new Set(periods.map(p => p.year))).sort((a, b) => b - a);
}

const getMonthLabel = (month: number) =>
  new Date(2025, month - 1).toLocaleString('en-GB', {
    month: 'short',
  });

const ghostTableData: Row[] = Array.from({length: 6}, (_, index) => ({
  month: String(index),
  actual: index,
  modo: index,
  iar: index,
  actual_vs_modo: index,
  actual_vs_iar: index,
}));

function IndustryComparisonTable(props: Readonly<IndustryComparisonTableProps>) {
  const {columns, data, onDownload, isLoading = false, isFullScreenOverride = false, customActions} = props;
  const {width} = useWindowDimensions();
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: 'Benchmark_table.png',
    renderFullScreen: () => <IndustryComparisonTable {...props} isFullScreenOverride />,
  });

  const isFullScreen = isFullScreenOverride;

  return (
    <div
      ref={chartRef}
      className={cn('p-4 bg-white rounded-xl border border-border mt-5', isFullScreen && 'mt-0 grow overflow-auto')}>
      <div className="flex items-center mb-4">
        <Text variant="h3" className="mr-auto">
          Monthly Performance Breakdown
        </Text>

        <div className="chart-actions flex items-center gap-3">
          {customActions}
          <IconButton
            name="download"
            size={20}
            onClick={onDownload}
            className="hover:bg-primary-tint-2! cursor-pointer"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          />
          {!isFullScreen ? (
            <IconButton
              name="maximize"
              size={20}
              onClick={onMaximize}
              className="hover:bg-primary-tint-2! cursor-pointer"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            />
          ) : (
            <IconButton
              name="minimize"
              size={20}
              onClick={onMinimize}
              className="hover:bg-primary-tint-2! cursor-pointer"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            />
          )}
        </div>
      </div>

      <AnalyticsTable
        data={data}
        columns={columns}
        loading={isLoading}
        tableClassName={cn('table-auto w-full', isTablet && '[&_th]:px-2! [&_td]:px-2!')}
        className="rounded-lg overflow-hidden"
      />
    </div>
  );
}

interface RevenueBenchMarkProps {
  key: string;
  assetSystemGenerationId?: string;
  assetId: number | null;
  year: number | null;
}
export const RevenueBenchmark = (props: RevenueBenchMarkProps) => {
  const {assetId, year, assetSystemGenerationId} = props;
  // ==========================
  // hooks
  // ==========================
  const dispatch = useDispatch();
  const {showToast} = useToast();

  // ==========================
  // selectors
  // ==========================
  const industryBenchmarkData = useSelector(assetIndustryBenchmarkAnalysisResult);
  const isLoading = useSelector(assetIndustryBenchmarkAnalysisLoading);
  const currentAsset = useSelector(currentSelectedAsset);

  // ==========================
  // state
  // ==========================
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedMetric, setSelectedMetric] = useState<'actual' | 'modo' | 'iar'>('actual');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkOption['id']>('modo');

  // ==========================
  // dereived states
  // ==========================
  const benchmarksData = industryBenchmarkData?.benchmarks ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const availableYears = getUniqueYearsFromAsset(currentAsset);

  const metricValues = benchmarksData
    .flatMap(item => [item.actual?.value, item.modo?.value, item.iar?.value])
    .filter((v): v is number => typeof v === 'number');

  const industryLowValue = benchmarksData
    .map(item => item.modo?.industry_low)
    .find((v): v is number => typeof v === 'number');

  const industryMidValue = benchmarksData
    .map(item => item.modo?.industry_mid)
    .find((v): v is number => typeof v === 'number');

  const industryHighValue = benchmarksData
    .map(item => item.modo?.industry_high)
    .find((v): v is number => typeof v === 'number');

  const bandValues = benchmarksData.flatMap(item => [
    item.modo?.industry_low,
    item.modo?.industry_mid,
    item.modo?.industry_high,
  ]);

  const allValues = [...metricValues, ...bandValues].filter((v): v is number => Number.isFinite(v));
  const yAxisScale = buildYAxisScale(allValues);

  const chartLowValue = industryLowValue ?? yAxisScale.min;
  const chartMidValue = industryMidValue ?? (yAxisScale.max + yAxisScale.min) / 2;
  const chartHighValue = industryHighValue ?? yAxisScale.max;
  const yAxisTicks = yAxisScale.ticks;

  const tableData: Row[] = (benchmarksData ?? []).map(item => ({
    month: new Date(item.year, item.month - 1).toLocaleString('en-GB', {
      month: 'short',
      year: 'numeric',
    }),

    actual: item.actual.value,
    modo: item.modo.value,
    iar: item.iar.value,

    actual_vs_modo: item.modo.variance_modo,
    actual_vs_iar: item.iar.variance_iar,
  }));

  const tableDataToShow = isLoading ? ghostTableData : tableData;
  const chartBenchmarks = industryBenchmarkData?.benchmarks ?? [];
  const dynamicYAxisLabels = [
    {
      label: formatPound(chartHighValue),
      level: 'Industry High',
      value: chartHighValue,
      color: '#11A45A',
    },
    {
      label: formatPound(chartMidValue),
      level: 'Industry Mid',
      value: chartMidValue,
      color: '#F59E0B',
    },
    {
      label: formatPound(chartLowValue),
      level: 'Industry Low',
      value: chartLowValue,
      color: '#FF4D4F',
    },
  ];

  const chartSeries: ChartSeries[] = [
    {
      key: 'actual',
      label: 'Actual Revenue',
      color: '#11A45A',
      data: getChartData('actual'),
    },
    {
      key: 'modo',
      label: 'Modo Benchmark',
      color: '#2F76FF',
      data: getChartData('modo'),
    },
    {
      key: 'iar',
      label: 'IAR Projection',
      color: '#884DFF',
      data: getChartData('iar'),
    },
  ];

  // ==========================
  // Table Columns
  // ==========================
  const columns: DataTableColumn<Row>[] = [
    {
      name: 'month',
      align: 'left',
      title: <Text variant="14R">Month</Text>,
      render: (row: Row) => (
        <Text variant="14SB" className="font-medium!">
          {row.month}
        </Text>
      ),
    },
    {
      name: 'actual',
      align: 'right',
      title: (
        <Text variant="14R">
          Actual <span className="font-normal!">(£/MW/mo) </span>
        </Text>
      ),
      render: (row: Row) => <Text variant="14M">{currency.format(row.actual)}</Text>,
    },
    {
      name: 'modo',
      align: 'right',
      title: (
        <Text variant="14R">
          Modo <span className="font-normal!">(£/MW/mo) </span>
        </Text>
      ),
      render: (row: Row) => (
        <Text variant="14R" className="text-text-secondary!">
          {currency.format(row.modo)}
        </Text>
      ),
    },
    {
      name: 'iar',
      align: 'right',
      title: (
        <Text variant="14R">
          IAR <span className="font-normal!">(£/MW/mo) </span>
        </Text>
      ),
      render: (row: Row) => (
        <Text variant="14R" className="text-text-secondary!">
          {currency.format(row.iar)}
        </Text>
      ),
    },
    {
      name: 'actual_vs_modo',
      align: 'right',
      title: (
        <Text variant="14R">
          Actual <span className="font-normal!"> vs </span> Modo
        </Text>
      ),
      render: (row: Row) => <PercentBadge value={row.actual_vs_modo} />,
    },
    {
      name: 'actual_vs_iar',
      align: 'right',
      title: (
        <Text variant="14R">
          Actual <span className="font-normal!"> vs </span> IAR
        </Text>
      ),
      render: (row: Row) => <PercentBadge value={row.actual_vs_iar} />,
    },
  ];

  // ==========================
  // functions
  // ==========================
  function getTopPosition(value: number) {
    if (yAxisScale.max === yAxisScale.min) return '50%';

    const top = ((yAxisScale.max - value) / (yAxisScale.max - yAxisScale.min)) * 100;

    return `${clamp(top, 0, 100)}%`;
  }

  const buildParams = () => {
    if (!assetId || !year) return null;

    return {
      assetId,
      year,
    };
  };

  function getChartData(type: 'actual' | 'modo' | 'iar') {
    return chartBenchmarks.map(item => ({
      month: getMonthLabel(item.month),
      monthNumber: item.month,
      year: item.year,
      value: item[type]?.value ?? 0,
    }));
  }

  async function handleDownload() {
    if (!currentAsset) return;
    const params = buildParams();
    if (!params) return;

    const tableName = `Benchmark_${assetSystemGenerationId}.csv`;
    try {
      await downloadAssetIndustryBenchmarkAnalysis({
        ...params,
        tableName,
      });
    } catch (error: any) {
      const status_code = error?.data?.status_code;
      showToast(getErrorMessage(status_code), 'error');
    }
  }

  // ==========================
  // side effects
  // ==========================
  useEffect(() => {
    const params = buildParams();
    if (!params || !assetId) return;
    dispatch(getIndustryComparisonRequest(params));
  }, [assetId, year]);

  useEffect(() => {
    if (!assetId) return;
    dispatch(
      fetchCommentsRequest({
        assetId,
        context_module: CommentModule.BenchmarkAnalysis,
        context_tab: BenchmarkAnalysisTabs.RevenueVsBenchmarks,
        context_year: year ?? undefined,
      })
    );
  }, [assetId, dispatch, year]);

  return (
    <>
      <div className="flex rounded-xl border border-border grow flex-col bg-white py-8 px-6 font-InterRegular ">
        <Text
          variant="h3"
          className="mb-1.25 text-[25px] font-InterBold! leading-[30px] tracking-normal text-[#11132B]">
          Revenue <span className="text-primary!">vs</span> Benchmarks
        </Text>
        <Text variant="14R" className="text-[14px] mb-5 font-InterRegular! leading-5.25 text-text-secondary!">
          Track actual revenue against Industry benchmark and IAR projections over time.
        </Text>

        <div className="mb-8 rounded-xl border flex justify-between border-border bg-[#FAFCFC] px-8 py-4">
          <WithFallback
            isLoading={isLoading}
            fallback={
              <div className="flex items-start justify-between gap-8">
                <div className="min-w-105 pt-0.5">
                  <Skeleton
                    animation="wave"
                    variant="rounded"
                    width={150}
                    height={25}
                    className="mb-4.75 rounded-full!"
                  />
                  <Skeleton animation="wave" variant="rounded" width={74} height={12} className="mb-3 rounded-full!" />
                  <div className="flex h-7.5 w-104.5 overflow-hidden rounded-full bg-[#EBF5F4]">
                    <Skeleton animation="wave" variant="rounded" width="100%" height="100%" className="rounded-full!" />
                  </div>
                </div>
              </div>
            }>
            <SectionHeader icon="bar3" title="Benchmark selection" subtitle="Choose a Benchmark to compare against." />
            <SelectInput
              label="Benchmark :"
              labelClassName="text-text-secondary! font-InterBold! whitespace-nowrap"
              value={selectedBenchmark}
              options={BENCHMARK_OPTIONS}
              onChange={item => setSelectedBenchmark(item.id as any)}
              wrapperClassName="bg-white! border-primary"
              className="w-50"
              isFilter
            />
          </WithFallback>
        </div>
        <InductryComparisonGraph
          chartSeries={chartSeries}
          dynamicYAxisLabels={dynamicYAxisLabels}
          downloadFileName={`Benchmark_${currentAsset?.asset_id ?? 'asset'}_${selectedYear ?? 'year'}_${selectedMetric}_graph.png`}
          getTopPosition={getTopPosition}
          yAxisTicks={yAxisTicks}
          isLoading={isLoading}
          customActions={
            <CommentTrigger
              contextModule={CommentModule.BenchmarkAnalysis}
              contextTab={BenchmarkAnalysisTabs.RevenueVsBenchmarks}
              contextWidget={BenchmarkAnalysisWidgets.BenchmarkSelection}
              contextType={CommentContextType.Widget}
              contextAssetId={assetId}
              contextYear={year}
              variant="icon-only"
              className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
              iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
            />
          }
        />
        <Alert message="Industry benchmark bands are configured in Settings and apply across views." className="mt-3" />
      </div>

      <IndustryComparisonTable
        columns={columns}
        data={tableDataToShow}
        onDownload={handleDownload}
        isLoading={isLoading}
        customActions={
          <CommentTrigger
            contextModule={CommentModule.BenchmarkAnalysis}
            contextTab={BenchmarkAnalysisTabs.RevenueVsBenchmarks}
            contextWidget={BenchmarkAnalysisWidgets.MonthlyTotalRevenueVsIar}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
      />
    </>
  );
};
