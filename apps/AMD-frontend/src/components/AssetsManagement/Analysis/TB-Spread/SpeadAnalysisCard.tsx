import {Icon, Skeleton, Text, Tooltip, TooltipPosition} from '@/ui-kits';
import {cn, WithFallback} from '@lazarus/react-common';

type TBSpreadAnalysisCardColorVariants = 'orange' | 'blue' | 'green' | 'yellow' | 'purple';
type TBSpreadAnalysisCardColorPallette = Pick<
  TBSpreadAnalysisCardObject,
  'valueColor' | 'backgroundGradientStart' | 'backgroundGradientEnd' | 'borderColor'
>;
export interface TBSpreadAnalysisCardObject {
  title: string;
  value: string | React.ReactNode;
  tooltipText: React.ReactNode;
  unit?: string;
  valueColor?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  borderColor?: string;
  variant?: TBSpreadAnalysisCardColorVariants;
  tooltipPosition?: TooltipPosition;
}

const TBSpreadAnalysisCardVariants: Record<TBSpreadAnalysisCardColorVariants, TBSpreadAnalysisCardColorPallette> = {
  orange: {
    valueColor: 'var(--color-warning)',
    backgroundGradientStart: '#FFFBF0',
    borderColor: '#F0DC9A',
  },
  blue: {
    valueColor: '#0086F3',
    backgroundGradientStart: '#F0FAFF',
    borderColor: '#B4C6FA',
  },
  green: {
    valueColor: 'var(--color-success)',
    backgroundGradientStart: '#F0FDF6',
    borderColor: '#B1E1B8',
  },
  yellow: {
    valueColor: 'var(--color-warning)',
    backgroundGradientStart: '#FDFDEF',
    borderColor: '#E1E0B1',
  },
  purple: {
    valueColor: '#9479C9',
    backgroundGradientStart: '#F7F3FF',
    borderColor: '#C8C1D4',
  },
};

interface TBSpreadAnalysisCardProps extends TBSpreadAnalysisCardObject {
  isLoading?: boolean;
  renderUnitToBottom?: boolean;
}
export function TBSpreadAnalysisCards(TBSpreadAnalysisCardProps: TBSpreadAnalysisCardProps) {
  const {
    title,
    value,
    tooltipText,
    unit,
    valueColor,
    backgroundGradientStart,
    backgroundGradientEnd = '#ffffff',
    borderColor,
    variant,
    tooltipPosition = 'top',
    isLoading = false,
    renderUnitToBottom = false,
  } = TBSpreadAnalysisCardProps;

  function getResolvedColorPallette(): TBSpreadAnalysisCardColorPallette {
    if (!variant) {
      return {
        valueColor: valueColor ?? '',
        backgroundGradientStart: backgroundGradientStart ?? '',
        backgroundGradientEnd: backgroundGradientEnd ?? '',
        borderColor: borderColor ?? '',
      };
    }

    const pallete = TBSpreadAnalysisCardVariants[variant];

    return {
      valueColor: valueColor || pallete.valueColor || '',
      backgroundGradientStart: backgroundGradientStart || pallete.backgroundGradientStart || '',
      backgroundGradientEnd: backgroundGradientEnd || pallete.backgroundGradientEnd || '',
      borderColor: borderColor || pallete.borderColor || '',
    };
  }

  const pallete = getResolvedColorPallette();

  return (
    <div
      style={
        isLoading
          ? {}
          : {
              borderColor: pallete.borderColor,
              background: `linear-gradient(to bottom, ${pallete.backgroundGradientStart}, ${pallete.backgroundGradientEnd})`,
            }
      }
      className="px-6 py-4 border gap-4 shrink-0 flex flex-col border-border rounded-lg">
      <WithFallback isLoading={isLoading} fallback={<Skeleton className="h-5! w-[50%] rounded-full" />}>
        <div className="flex items-start justify-between gap-1">
          <Text variant="16M" className="text-text-secondary!">
            {title}
          </Text>
          <div className="relative group mt-1">
            <Icon name="circle-info-2" />
            <Tooltip portal message={tooltipText} position={tooltipPosition} />
          </div>
        </div>
      </WithFallback>
      <WithFallback isLoading={isLoading} fallback={<Skeleton className="h-5! w-[70%] rounded-full mt-2" />}>
        {typeof value === 'string' && (
          <div className={cn("flex gap-2 items-center", renderUnitToBottom && "flex-col items-start gap-0")}>
            <Text variant="h3" className="font-InterBold!" style={{color: pallete.valueColor}}>
              {value}
            </Text>
            {unit && (
              <Text variant="18R" style={{color: pallete.valueColor}}>
                {unit}
              </Text>
            )}
          </div>
        )}
        {typeof value !== 'string' && value}
      </WithFallback>
    </div>
  );
}
