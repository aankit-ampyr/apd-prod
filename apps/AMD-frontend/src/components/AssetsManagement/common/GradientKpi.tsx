import {IconTypes} from '@/interface';
import {WithFallback} from '../../common';
import {Icon, Skeleton, Text, Tooltip, type TooltipPosition} from '@/ui-kits';
import {cn} from '@/utils';
import React from 'react';

type KpiColorVariants = 'orange' | 'blue' | 'green' | 'yellow' | 'green' | 'purple';
type KpiColorPallate = {
  bgGradientEnd: string;
  iconBgGradientStart: string;
  iconBgGradientEnd: string;
  iconColor: string;
};
const kpiVariantsMap: Record<KpiColorVariants, KpiColorPallate> = {
  orange: {
    bgGradientEnd: '#FFF8E3',
    iconBgGradientStart: '#FFEBA7',
    iconBgGradientEnd: '#FFFAE9',
    iconColor: 'var(--color-warning)',
  },
  blue: {
    bgGradientEnd: '#F1FBFF',
    iconBgGradientStart: '#D4F3FF',
    iconBgGradientEnd: '#F4FCFF',
    iconColor: 'var(--color-blue-2)',
  },
  yellow: {
    bgGradientEnd: '#FFFFE6',
    iconBgGradientStart: '#FFFD80',
    iconBgGradientEnd: '#FFFFE0',
    iconColor: '#D0BB00',
  },
  green: {
    bgGradientEnd: '#F0FFED',
    iconBgGradientStart: '#C9FFB2',
    iconBgGradientEnd: '#F2FFEC',
    iconColor: 'var(--color-success)',
  },
  purple: {
    bgGradientEnd: '#F5F2FB',
    iconBgGradientStart: '#E6D7FF',
    iconBgGradientEnd: '#F7F2FF',
    iconColor: '#5F2EB4',
  },
};

export type GradientKPIObject = {
  icon?: IconTypes;
  title: string;
  value: string;
  valueColor?: string;
  valueClassName?: string;
  subLabel?: string | React.ReactNode;
  bgGradientEnd?: string;
  bgGradientStart?: string;
  iconBgGradientStart?: string;
  iconBgGradientEnd?: string;
  iconColor?: string;
  className?: string;
  variant?: KpiColorVariants;
  showTooltip?: boolean;
  tooltipMessage?: React.ReactNode;
  tooltipPosition?: TooltipPosition;
  helperLabel?: string | React.ReactNode;
};

interface MarketPriceKPIProps extends GradientKPIObject {
  isLoading?: boolean;
}

export function GradientKPI(props: MarketPriceKPIProps) {
  const {
    bgGradientEnd,
    bgGradientStart = '#ffffff',
    icon,
    iconBgGradientStart,
    iconBgGradientEnd = '#ffffff',
    iconColor,
    subLabel,
    title,
    value,
    className,
    isLoading = false,
    showTooltip,
    tooltipMessage,
    tooltipPosition,
    variant,
    valueColor,
    valueClassName,
    helperLabel,
  } = props;

  function getResolvedColorPallette(): KpiColorPallate {
    if (!variant) {
      return {
        bgGradientEnd: bgGradientEnd ?? '',
        iconBgGradientEnd: iconBgGradientEnd ?? '',
        iconBgGradientStart: iconBgGradientStart ?? '',
        iconColor: iconColor ?? '',
      };
    }
    const pallete = kpiVariantsMap[variant];

    return {
      bgGradientEnd: bgGradientEnd || pallete.bgGradientEnd || '',
      iconBgGradientEnd: iconBgGradientEnd || pallete.iconBgGradientEnd || '',
      iconBgGradientStart: iconBgGradientStart || pallete.iconBgGradientStart || '',
      iconColor: iconColor || pallete.iconColor || '',
    };
  }

  const pallete = getResolvedColorPallette();

  return (
    <WithFallback
      isLoading={isLoading}
      fallback={
        <div className="border-border border rounded-lg px-6 py-4 gap-5 flex flex-col">
          <div className="flex gap-4 items-center">
            <Skeleton variant="rectangular" className="w-7 h-7! rounded " />
            <Skeleton variant="rectangular" width={120} height={16} className="rounded-full!" />
          </div>
          <Skeleton variant="rectangular" width={'60%'} height={30} className="rounded-full!" />
        </div>
      }>
      <div
        style={{
          background: `linear-gradient(to bottom right, ${bgGradientStart}, ${pallete.bgGradientEnd})`,
        }}
        className={cn('border-border border rounded-lg px-6 py-4', className)}>
        <div className="flex gap-2 items-center">
          {icon && (
            <div
              style={{
                background: `linear-gradient(to bottom right, ${pallete.iconBgGradientStart}, ${pallete.iconBgGradientEnd})`,
              }}
              className="p-2 flex rounded-sm justify-center items-center">
              <Icon name={icon} color={pallete.iconColor} />
            </div>
          )}
          <Text variant="caption" className="text-text-secondary! font-InterMedium!">
            {title}
          </Text>
          {showTooltip && (
            <div className="ml-auto relative group">
              <Tooltip message={tooltipMessage ?? ''} position={tooltipPosition} />
              <Icon name="circle-info-2" />
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center mt-2">
          <Text
            variant="free"
            style={{color: valueColor ?? 'var(--color-text-primary)'}}
            className={cn('font-InterSemiBold text-h2', valueClassName)}>
            {value}
          </Text>
          {subLabel &&
            (typeof subLabel === 'string' ? (
              <Text variant="caption" className="text-text-secondary! mt-1">
                {subLabel}
              </Text>
            ) : (
              subLabel
            ))}
        </div>

        {helperLabel &&
          (typeof helperLabel === 'string' ? (
            <Text variant="caption" className="text-text-secondary! mt-1">
              {helperLabel}
            </Text>
          ) : (
            helperLabel
          ))}
      </div>
    </WithFallback>
  );
}
