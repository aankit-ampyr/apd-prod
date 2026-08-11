import {AssetAnalysisSolarKpiVitalsRequest} from '@/interface';
import {GradientKPI, GradientKPIObject} from '../common';

type SolarKpiVitals = NonNullable<AssetAnalysisSolarKpiVitalsRequest['response']['data']>;

interface KpiVitalsCardsProps {
  data?: SolarKpiVitals;
  isLoading?: boolean;
}

function formatMetric(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString(undefined, {minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits});
}

// Only the two "headline" metrics (total volume, overall quality) get a color accent -- the rest
// stay neutral so the row reads as one coherent set instead of five unrelated pastel tiles.
const NEUTRAL_PALETTE = {
  bgGradientEnd: '#F7F8F9',
  iconBgGradientStart: '#E7E9EC',
  iconBgGradientEnd: '#FBFBFC',
  iconColor: 'var(--color-text-secondary)',
};

export function KpiVitalsCards(props: KpiVitalsCardsProps) {
  const {data, isLoading} = props;

  const kpis: GradientKPIObject[] = [
    {
      icon: 'zap',
      title: 'Energy Exported',
      value: formatMetric(data?.energy_exported_mwh),
      subLabel: 'MWh',
      bgGradientEnd: '#EAF8F6',
      iconBgGradientStart: '#B8E8E1',
      iconBgGradientEnd: '#F4FDFC',
      iconColor: 'var(--color-primary)',
    },
    {
      icon: 'trending-up',
      title: 'Peak Power',
      value: formatMetric(data?.peak_power_mw),
      subLabel: 'MW',
      ...NEUTRAL_PALETTE,
    },
    {
      icon: 'bar2',
      title: 'Capacity Factor',
      value: formatMetric(data?.capacity_factor_pct),
      subLabel: '%',
      ...NEUTRAL_PALETTE,
    },
    {
      icon: 'growth',
      title: 'Specific Yield',
      value: formatMetric(data?.specific_yield_kwh_per_kw),
      subLabel: 'kWh/kW',
      ...NEUTRAL_PALETTE,
    },
    {
      icon: 'circle-info-2',
      title: 'Performance Ratio',
      value: formatMetric(data?.performance_ratio_pct),
      subLabel: '%',
      variant: 'green',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map(kpi => (
        <GradientKPI
          key={kpi.title}
          {...kpi}
          isLoading={isLoading}
          valueClassName="whitespace-nowrap text-[26px]!"
        />
      ))}
    </div>
  );
}
