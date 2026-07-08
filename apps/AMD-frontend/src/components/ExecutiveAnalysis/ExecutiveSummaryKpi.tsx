import {IconTypes} from '@/interface';
import {Icon, Text} from '@/ui-kits';
import {formatCurrencyToPound} from '@/utils';
import {Skeleton, WithFallback} from '@lazarus/react-common';

export interface ExecutiveSummaryKpiObject {
  title: string;
  accentColor: string;
  icon: IconTypes;
  captureRate: number;
  revenueGap: number;
  imbalance: number;
  iconBgGradientStart: string;
  iconBgGradientEnd: string;
  contentBgGradientStart: string;
  contentBgGradientEnd: string;
  headerBorderColor: string;
}

interface ExecutiveSummaryKpiProps extends ExecutiveSummaryKpiObject {
  loading?: boolean;
}
export function ExecutiveSummaryKpi(props: ExecutiveSummaryKpiProps) {
  const {
    accentColor,
    captureRate,
    contentBgGradientEnd,
    contentBgGradientStart,
    headerBorderColor,
    icon,
    iconBgGradientEnd,
    iconBgGradientStart,
    imbalance,
    revenueGap,
    title,
    loading = false,
  } = props;
  return (
    <div className="rounded-lg border border-border overflow-hidden flex flex-col">
      <div style={{borderColor: loading ? "var(--color-border)" : headerBorderColor}} className="px-5 py-3 flex gap-3 border-b-2 items-center">
        <WithFallback isLoading={loading} fallback={<Skeleton className="w-8 h-8! aspect-square rounded-sm" />}>
          <div
            style={{
              background: `linear-gradient(to bottom right, ${contentBgGradientStart}, ${iconBgGradientEnd})`,
            }}
            className="w-fit p-2 rounded-sm">
            <Icon name={icon} style={{color: accentColor}} />
          </div>
        </WithFallback>

        <WithFallback isLoading={loading} fallback={<Skeleton className="w-40 aspect-square rounded-sm" />}>
          <Text variant="14B" style={{color: accentColor}}>
            {title}
          </Text>
        </WithFallback>
      </div>

      <div
        style={loading ? {justifyContent: 'space-between'} : {
          background: `linear-gradient(to bottom right, ${iconBgGradientStart}, ${contentBgGradientEnd})`,
        }}
        className="flex flex-col gap-2 px-5 py-3 grow">
        <WithFallback isLoading={loading} fallback={<Skeleton className="w-60 h-4! aspect-square rounded-sm" />}>
          <Text variant="14R">
            <span className="font-InterBold">Capture rate :</span> {captureRate}% of optimal
          </Text>
        </WithFallback>
        <WithFallback isLoading={loading} fallback={<Skeleton className="w-60 h-4! aspect-square rounded-sm" />}>
          <Text variant="14R">
            <span className="font-InterBold">Revenue gap :</span> {formatCurrencyToPound(revenueGap, false)}{' '}
          </Text>
        </WithFallback>

        <WithFallback isLoading={loading} fallback={<Skeleton className="w-60 h-4! aspect-square rounded-sm" />}>
          <Text variant="14R">
            <span className="font-InterBold">Imbalance :</span> {formatCurrencyToPound(imbalance, false)}
          </Text>
        </WithFallback>
      </div>
    </div>
  );
}
