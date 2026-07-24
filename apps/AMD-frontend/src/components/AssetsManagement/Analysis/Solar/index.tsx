import {useEffect, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {DivergentBarChart} from '@/components';
import {assetSolarGenerationSplitRequest, assetSolarKpiVitalsRequest} from '@/services/redux/slice';
import {
  assetSolarGenerationSplitLoading,
  assetSolarGenerationSplitResult,
  assetSolarKpiVitalsLoading,
  assetSolarKpiVitalsResult,
} from '@/services/redux/selectors';

import {AssetAnalysisTabProps} from '../types';
import {MarketKpiCards, MarketSummaryKpi} from '../Market/MarketKPI';

const PEAK_COLOR = '#29C48E';
const OFF_PEAK_COLOR = '#999EDD';

const renderValue = (value: number | null | undefined, suffix = '') =>
  value == null ? '-' : `${value.toLocaleString()}${suffix}`;

const renderPercent = (value: number | null | undefined) => (value == null ? '-' : `${value}%`);

interface SolarAnalysisProps extends AssetAnalysisTabProps {}

export function AssetSolar(props: SolarAnalysisProps) {
  const {assetId, assetSystemGenerationId, month, year} = props;

  // ===============
  // hooks
  // ===============
  const dispatch = useDispatch();

  // ===============
  // selectors
  // ===============
  const kpiVitals = useSelector(assetSolarKpiVitalsResult);
  const kpiLoading = useSelector(assetSolarKpiVitalsLoading);
  const generationSplit = useSelector(assetSolarGenerationSplitResult);
  const generationSplitLoading = useSelector(assetSolarGenerationSplitLoading);

  // ===============
  // side effects
  // ===============
  useEffect(() => {
    if (!assetId || !month || !year) return;
    dispatch(assetSolarKpiVitalsRequest({assetId, month, year}));
    dispatch(assetSolarGenerationSplitRequest({assetId, month, year}));
  }, [assetId, month, year, dispatch]);

  // ===============
  // derived state
  // ===============
  const kpiCards: MarketSummaryKpi[] = [
    {
      label: 'Energy Exported',
      value: renderValue(kpiVitals?.energy_exported_mwh, ' MWh'),
      description: 'Total grid export for the period',
      valueColor: '#0086F3',
      bgGradientStartColor: '#E8F7FF',
      borderColor: '#91ABF9',
    },
    {
      label: 'Peak Power',
      value: renderValue(kpiVitals?.peak_power_mw, ' MW'),
      description: 'Highest recorded AC output',
    },
    {
      label: 'Capacity Factor',
      value: renderPercent(kpiVitals?.capacity_factor_pct),
      description: 'Output vs nameplate capacity',
    },
    {
      label: 'Specific Yield',
      value: renderValue(kpiVitals?.specific_yield_kwh_per_kw, ' kWh/kW'),
      description: 'Energy per installed kW',
    },
    {
      label: 'Performance Ratio',
      value: renderPercent(kpiVitals?.performance_ratio_pct),
      description: 'Actual vs reference yield',
      valueColor: 'var(--color-success)',
      bgGradientStartColor: '#E0FFEF',
      borderColor: '#A1E5AB',
    },
  ];

  const generationSplitData = useMemo(() => {
    if (!generationSplit?.chart_data) {
      return [];
    }
    return generationSplit.chart_data.map(row => {
      const isOffPeak = row.label.toLowerCase().includes('off');
      return {
        label: row.label,
        value: row.value,
        color: isOffPeak ? OFF_PEAK_COLOR : PEAK_COLOR,
      };
    });
  }, [generationSplit]);

  // ===============
  // render
  // ===============
  return (
    <div className="mt-6 flex flex-col gap-6">
      <MarketKpiCards cards={kpiCards} loading={kpiLoading} />

      <DivergentBarChart
        title="Generation: Peak vs Off-Peak"
        data={generationSplitData}
        downloadFileName={`solar_generation_split_${assetSystemGenerationId ?? assetId ?? 'asset'}_${month}_${year}.png`}
        isLoading={generationSplitLoading}
        className="shadow-none! pt-6 pb-2 px-4 rounded-md"
        chartClassName="h-[360px] md:h-[420px]"
        xKey="label"
        yKey="value"
        barWidth={54}
        showValues
        xAxisLabel="Period"
        yAxisLabel="Energy (MWh)"
        tooltipXLabel="Period"
        tooltipYLabel="Energy"
        zeroLineColor="var(--color-border)"
        xAxisLabelProps={{offset: -40}}
        yAxisLabelProps={{offset: 7}}
        negativeValueLabelProps={{offset: 12}}
      />
    </div>
  );
}
