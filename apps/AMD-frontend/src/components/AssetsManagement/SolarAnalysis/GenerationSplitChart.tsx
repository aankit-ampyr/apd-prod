import {CommentTrigger, DivergentBarChart, DivergentBarDataPoint} from '@/components';
import {CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets} from '@/constants';

import {AssetAnalysisSolarGenerationSplitRequest} from '@/interface';

type SolarGenerationSplit = NonNullable<AssetAnalysisSolarGenerationSplitRequest['response']['data']>;

interface GenerationSplitChartProps {
  data?: SolarGenerationSplit;
  isLoading?: boolean;
  assetId?: number | null;
  year?: number | null;
  month?: number | null;
}

// Same hue family as the rest of the Solar KPIs (var(--color-primary)) so Peak reads as the
// "headline" bar and Off-Peak recedes as its lighter tint, instead of two unrelated colors.
const PEAK_COLOR = 'var(--color-primary)';
const OFF_PEAK_COLOR = 'var(--color-primary-tint-1)';

export function GenerationSplitChart(props: GenerationSplitChartProps) {
  const {data, isLoading = false, assetId, year, month} = props;

  const chartData: DivergentBarDataPoint[] = (data?.chart_data ?? []).map(item => ({
    label: item.label,
    value: item.value,
    color: item.label.toLowerCase().includes('off') ? OFF_PEAK_COLOR : PEAK_COLOR,
  }));

  return (
    <DivergentBarChart
      title="Off-Peak / Peak Generation"
      data={chartData}
      downloadFileName="solar_generation_split.png"
      isLoading={isLoading}
      customActions={
        <CommentTrigger
          contextModule={CommentModule.ViewAnalysis}
          contextTab={ViewAnalysisTabs.SolarGeneration}
          contextWidget={ViewAnalysisWidgets.SolarGenerationSplit}
          contextType={CommentContextType.Widget}
          contextAssetId={assetId}
          contextYear={year}
          contextMonth={month}
          variant="icon-only"
          className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
          iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
        />
      }
      chartClassName="h-[360px] md:h-[420px]"
      xKey="label"
      yKey="value"
      barWidth={54}
      showValues
      xAxisLabel="Tariff"
      yAxisLabel="Energy (MWh)"
      tooltipXLabel="Tariff"
      tooltipYLabel="Energy"
      zeroLineColor="var(--color-border)"
    />
  );
}
