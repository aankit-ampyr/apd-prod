import {useEffect, useMemo, useRef, useState} from 'react';
import {useWindowDimensions} from '@/hooks';
import {Badge, Skeleton, Text} from '@/ui-kits';
import {Divider, WithFallback} from '../../../common';
import {cn} from '@/utils';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
export type MarketSummaryKpi = {
  borderColor?: string;
  label: string;
  value: string;
  tone?: 'info' | 'default' | 'success' | 'danger';
  valueColor?: string;
  description?: string;
  delta?: number;
  deltaLabel?: string;
  bgGradientStartColor?: string;
  bgGradientEndColor?: string;
};

interface MarketSummaryKpiProps extends MarketSummaryKpi {
  loading?: boolean;
  forceWrappedLayout?: boolean;
  onWrapChange?: (isWrapped: boolean) => void;
}

export function MarketKpiCard(props: MarketSummaryKpiProps) {
  const {
    label,
    value,
    loading = false,
    forceWrappedLayout = false,
    onWrapChange,
    delta,
    bgGradientEndColor = '#ffffff',
    bgGradientStartColor = '#ffffff',
    borderColor = 'var(--color-border)',
    deltaLabel,
    description,
    valueColor = 'var(--color-text-primary)',
  } = props;

  // ====================
  // hooks
  // ====================
  const {width} = useWindowDimensions();
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (forceWrappedLayout) return;

    const element = labelRef.current;
    if (!element) return;

    const checkWrapState = () => {
      const computedStyle = window.getComputedStyle(element);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      const {height} = element.getBoundingClientRect();
      const isWrapped = height > lineHeight * 1.35;
      if (isWrapped) {
        onWrapChange?.(true);
      }
    };

    checkWrapState();

    const resizeObserver = new ResizeObserver(checkWrapState);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [forceWrappedLayout, label, onWrapChange]);

  // ====================
  // states
  // ====================
  const isNegative = delta != null && delta < 0;

  // ====================
  // functions
  // ====================
  const renderPercent = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatDeltaValue = (delta: number | null | undefined) => {
    if (delta == null || Number.isNaN(delta)) return '-';
    return `${renderPercent(delta)}`;
  };

  const deltaText = () => {
    return `${formatDeltaValue(delta)} ${deltaLabel}`;
  };

  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-4 rounded-xl border border-border bg-white pt-8 pb-10',
        isTablet && 'gap-2 pt-5 pb-6',
      )}
      style={{
        background: `linear-gradient(to bottom, ${bgGradientStartColor ?? 'transparent'} 0%, ${bgGradientEndColor} 100%)`,
        borderColor,
        paddingRight: width <= TABLET_SCREEN_BREAKPOINT ? 8 : width < 1280 ? 12 : 20,
        paddingLeft: width <= TABLET_SCREEN_BREAKPOINT ? 8 : width < 1280 ? 12 : 20,
      }}>
      <WithFallback
        isLoading={loading}
        fallback={<Skeleton variant="rectangular" className="rounded-lg! w-full max-w-[144px] h-4!" />}>
        <Text
          ref={labelRef}
          variant="16M"
          className={cn(
            'text-text-secondary! whitespace-normal wrap-break-word',
            isTablet && 'text-[12px] leading-snug',
            forceWrappedLayout && (isTablet ? 'min-h-8' : 'min-h-[2.8rem]'),
          )}>
          {label}
        </Text>
      </WithFallback>

      <WithFallback
        isLoading={loading}
        fallback={
          <Skeleton variant="rectangular" className={cn('mt-6 h-6 lg:h-8 w-[72%] rounded-full!', isTablet && 'mt-2')} />
        }>
        <Text
          variant="free"
          style={{
            color: valueColor,
            fontSize: (() => {
              if (width <= TABLET_SCREEN_BREAKPOINT) return 16;
              if (width < 1280) {
                return 24;
              }
              if (width < 1440) {
                return 26;
              }
              return 30;
            })(),
          }}
          className={cn(
            'block font-InterBold leading-none',
            forceWrappedLayout && (isTablet ? 'min-h-7' : 'min-h-10'),
          )}>
          {value}
        </Text>
      </WithFallback>

      {!loading && (
        <Divider
          className="-my-1"
          style={{
            height: 2,
            background: `linear-gradient(to right, ${borderColor ?? 'transparent'} 0%, transparent 100%)`,
          }}
        />
      )}

      <WithFallback
        isLoading={loading}
        fallback={
          <Skeleton variant="rectangular" className={cn('mt-6 h-3 lg:h-4 w-[82%] rounded-full!', isTablet && 'mt-2')} />
        }>
        <Text
          className={cn(
            'text-text-secondary! font-InterLight! italic',
            isTablet && 'text-[11px] leading-tight',
            forceWrappedLayout && (isTablet ? 'min-h-8' : 'min-h-[3.2rem]'),
          )}>
          {description}
        </Text>
      </WithFallback>
      {
        <WithFallback
          isLoading={loading}
          fallback={
            <Skeleton
              variant="rectangular"
              className={cn('mt-2 h-5 lg:h-6 w-16 lg:w-24 rounded-full!', isTablet && 'mt-2')}
            />
          }>
          {delta && (
            <Badge
              message={deltaText()}
              color={isNegative ? 'red' : 'green'}
              className="mt-auto"
              textClassName={cn('text-[12px]!', isTablet && 'text-[10px]!')}
            />
          )}
        </WithFallback>
      }
    </div>
  );
}

interface MarketKpiCardsProps {
  cards: MarketSummaryKpi[];
  loading?: boolean;
  className?: string;
}

export function MarketKpiCards(props: MarketKpiCardsProps) {
  const {cards, loading = false, className} = props;
  const {width} = useWindowDimensions();
  const [forceWrappedLayout, setForceWrappedLayout] = useState(false);
  const isTablet = width <= TABLET_SCREEN_BREAKPOINT;

  const wrapSignature = useMemo(
    () => cards.map(card => `${card.label}-${card.value}-${card.description ?? ''}`).join('|'),
    [cards],
  );

  useEffect(() => {
    setForceWrappedLayout(false);
  }, [width, wrapSignature]);

  return (
    <div className={cn('grid grid-cols-5 gap-4 items-stretch', isTablet && 'gap-2', className)}>
      {cards.map(card => (
        <MarketKpiCard
          key={card.label}
          {...card}
          loading={loading}
          forceWrappedLayout={forceWrappedLayout}
          onWrapChange={isWrapped => {
            if (isWrapped) {
              setForceWrappedLayout(true);
            }
          }}
        />
      ))}
    </div>
  );
}
