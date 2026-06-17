import {type BadgeVariants, Badge, Skeleton, Text} from '@/ui-kits';
import {Divider, WithFallback} from '@lazarus/react-common';

export interface AnnualProjectionReportKPIObject {
  id: string;
  title: string | React.ReactNode;
  value: string | number;
  unit?: string;
  badgeText: string | React.ReactNode;
  helperText?: string;
  badgeColor?: BadgeVariants['color'];
  bgGradientStart?: string;
  bgGradientEnd?: string;
}

interface AnnualProjectionReportKpis extends AnnualProjectionReportKPIObject {
  isLoading?: boolean;
}
export function AnnualProjectionReportKpi(props: AnnualProjectionReportKpis) {
  const {
    title,
    value,
    unit,
    badgeText,
    helperText,
    isLoading = false,
    badgeColor,
    bgGradientStart = '#ffffff',
    bgGradientEnd,
  } = props;

  return (
    <div
      className="flex flex-col gap-2 border border-border rounded-lg py-3 px-4"
      style={isLoading ? {} : {background: `linear-gradient(to bottom right, ${bgGradientStart}, ${bgGradientEnd})`}}>
      <WithFallback
        isLoading={isLoading}
        fallback={
          <div className="flex gap-4 justify-between">
            <Skeleton variant="rectangular" className="h-6! w-30 rounded-full!" />
            <Skeleton variant="rectangular" className="h-5! w-14 rounded-sm!" />
          </div>
        }>
        <div className="flex justify-between items-center gap-2">
          {typeof title === 'string' ? <Text variant="14R">{title}</Text> : title}
          <Badge size="sm" className="px-5" color={badgeColor} message={badgeText} />
        </div>
      </WithFallback>

      <WithFallback
        isLoading={isLoading}
        fallback={<Skeleton variant="rectangular" className="h-8! mt-4 w-2/3 rounded-full!" />}>
        <div className="flex gap-3 items-center">
          <Text variant="h2" className="text-[26px]!">
            {value}
          </Text>
          <Text variant="12R" className="text-text-secondary!">
            {unit}
          </Text>
        </div>
      </WithFallback>
      {!isLoading && helperText && (
        <Divider
          className="w-[75%] h-0.5"
          style={{background: `linear-gradient(to bottom right, var(--color-border), var(--color-bg-card))`}}
        />
      )}

      <WithFallback isLoading={isLoading} fallback={<Skeleton variant="rectangular" className="h-6 mt-2 w-1/2 rounded-sm!" />}>
        {helperText && (
          <Text variant="14R" className="text-text-secondary! italic">
            {helperText}
          </Text>
        )}
      </WithFallback>
    </div>
  );
}
