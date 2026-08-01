import React from 'react';
import {Text, Skeleton, Icon, Tooltip, TooltipPosition} from '@/ui-kits';
import {WithFallback} from '@lazarus/react-common';
import {cn} from '@/utils';

export interface ReconciliationKpiObj {
  value: string;
  label: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  borderColor: string;
  accentColor: string;
  tooltipText?: string | React.ReactNode;
  tooltipPosition?: TooltipPosition;
}

interface ReconciliationKpiProps extends ReconciliationKpiObj {
  loading?: boolean;
}

export function ReconciliationKpi(props: ReconciliationKpiProps) {
  const {
    value,
    label,
    bgGradientStart,
    bgGradientEnd,
    borderColor,
    accentColor,
    tooltipText,
    tooltipPosition = 'top',
    loading = false,
  } = props;
  return (
    <div
      style={
        !loading
          ? {
              background: `linear-gradient(to bottom, ${bgGradientStart}, ${bgGradientEnd})`,
              border: `1px solid ${borderColor}`,
            }
          : {
              border: `1px solid var(--color-border)`,
            }
      }
      className="rounded-xl overflow-hidden flex flex-col">
      {!loading && <div style={{backgroundColor: accentColor}} className="h-1.5"></div>}
      <div className={cn('py-6 px-5 flex grow flex-col gap-3', loading && 'justify-evenly bg-white')}>
        <WithFallback isLoading={loading} fallback={<Skeleton className="w-25 h-5 rounded-full" />}>
          <div className="flex justify-between items-center">
            <Text variant="14M" className="text-text-secondary!">
              {label}
            </Text>
            {tooltipText && (
              <div className="relative group">
                <Tooltip message={tooltipText} portal position={tooltipPosition} />
                <Icon name="circle-info-2" />
              </div>
            )}
          </div>
        </WithFallback>
        <WithFallback isLoading={loading} fallback={<Skeleton className="w-35 h-5 rounded-full" />}>
          <Text variant="free" className="text-[20px] font-InterBold!">
            {value}
          </Text>
        </WithFallback>
      </div>
    </div>
  );
}
