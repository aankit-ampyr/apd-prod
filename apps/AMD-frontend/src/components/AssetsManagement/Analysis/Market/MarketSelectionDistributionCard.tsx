import {IconButton, Skeleton, Text} from '@/ui-kits';
import {cn} from '@/utils';
import {WithFallback} from '../../../common';
import {useChartsActionV2} from '@/hooks';

export type DistributionSummaryCard = {
  label: string;
  value: number;
  color: string;
  borderColor: string;
  bgColor: string;
  background: string;
  valueColor: string;
};

export interface MarketUtilizationRow {
  market_used: string;
  count: number;
  percentage: number;
  total_revenue: number;
  color: string;
}

interface MarketSelectionDistributionCardProps {
  loading: boolean;
  summaryCards: DistributionSummaryCard[];
  rows: MarketUtilizationRow[];
  isEpexOnlyView: boolean;
  downloadFileName?: string;
}

export function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => {
      const uppercaseTokens = ['SFFR', 'EPEX', 'SSP', 'ISEM', 'EFA', 'DA', 'HH'];
      if (uppercaseTokens.includes(part.toUpperCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

export function MarketSelectionDistributionCard(props: MarketSelectionDistributionCardProps) {
  const {loading, summaryCards, rows, isEpexOnlyView, downloadFileName = ''} = props;

  /**
   * ======================
   * hooks
   * ======================
   */
  const {handleDownLoad, chartRef} = useChartsActionV2({
    downloadFileName,
    renderFullScreen: () => <></>,
  });

  /**
   * ===================================
   * Derived States and Constants
   * ===================================
   */
  const skeletonRows = Array.from({length: isEpexOnlyView ? 2 : 10}).map(
    (_, _index): MarketUtilizationRow => ({
      color: '',
      count: 0,
      market_used: '',
      percentage: 0,
      total_revenue: 0,
    }),
  );
  const skeletonCardCount = isEpexOnlyView ? 3 : 5;
  const kpisToMap = loading
    ? Array.from({length: skeletonCardCount}).map((_item): DistributionSummaryCard => {
        return {} as DistributionSummaryCard;
      })
    : summaryCards;

  const rowToMap = loading ? skeletonRows : rows;

  const gridTemplateClassname = isEpexOnlyView ? 'grid-cols-[100px_1fr_80px]' : 'grid-cols-[150px_1fr_100px_80px]';

  return (
    <div
      ref={chartRef}
      className="overflow-hidden flex flex-col rounded-md border border-border bg-white px-4 py-5 shadow-[0_1px_0_rgba(17,19,43,0.04)] sm:px-6">
      <div className="flex justify-between items-start">
        <div className="mb-6">
          <Text variant="h4" className="text-text-primary! font-InterBold!">
            Market Selection Distribution
          </Text>
          <Text variant="14R" className="mt-2 text-text-secondary!">
            Compare market usage by period count and percentage share.
          </Text>
        </div>

        {!loading && (
          <IconButton
            name="download"
            onClick={handleDownLoad}
            className="hover:bg-primary-tint-2! chart-actions cursor-pointer charts-action"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          />
        )}
      </div>
      <div className={cn('mb-8 flex gap-4', isEpexOnlyView && 'mt-4')}>
        {kpisToMap.map(card => (
          <MarketDistributionKPI {...card} key={card.label} loading={loading} />
        ))}
      </div>

      <div className={cn('flex pl-4 flex-col', isEpexOnlyView && 'justify-evenly grow')}>
        <div className={cn('grid ', gridTemplateClassname)}>
          <Text variant="14M" className="text-text-secondary!">
            Markets
          </Text>
          <Text variant="14M" className="text-text-secondary!">
            Periods (Share of total)
          </Text>
          {!isEpexOnlyView && (
            <Text variant="14M" className="text-left text-text-secondary!">
              Periods
            </Text>
          )}
          <Text variant="14M" className="text-left text-text-secondary!">
            Share
          </Text>
        </div>
        {rowToMap.map((row, i) => (
          <MarketDistributionRow
            loading={loading}
            {...row}
            isEpexOnlyView={isEpexOnlyView}
            key={row.market_used + i}
            className={cn('grid ', gridTemplateClassname, i === rowToMap.length - 1 && 'border-none!')}
          />
        ))}
      </div>
    </div>
  );
}

interface MarketDistributionRowProps extends MarketUtilizationRow {
  loading?: boolean;
  className?: string;
  isEpexOnlyView?: boolean;
}
function MarketDistributionRow(props: MarketDistributionRowProps) {
  const {color, count, market_used, percentage, loading = false, className, isEpexOnlyView = false} = props;
  /**
   * ===================================
   * Functions
   * ===================================
   */
  function formatMarketLabel(value: string) {
    return value
      .replace(/_/g, '-')
      .split(/[\s-]+/)
      .map(part => toTitleCase(part))
      .join('-');
  }
  return (
    <div key={market_used} className={cn('items-center py-3 border-b border-border', className)}>
      <div className="flex items-center gap-3">
        <WithFallback
          fallback={<Skeleton variant="circular" className="h-2.5 w-2.5 rounded-full!" />}
          isLoading={loading}>
          <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: color}} />
        </WithFallback>
        <WithFallback
          fallback={<Skeleton variant="rectangular" className="h-4 w-24 rounded-full!" />}
          isLoading={loading}>
          <Text variant="14M" className="truncate text-text-primary!">
            {formatMarketLabel(market_used)}
          </Text>
        </WithFallback>
      </div>

      <WithFallback
        isLoading={loading}
        fallback={
          <>
            <Skeleton variant="rectangular" className="h-2 w-full rounded-full!" />
            <Skeleton variant="rectangular" className="ml-auto h-4 w-12 rounded-full!" />
            <Skeleton variant="rectangular" className="ml-auto h-4 w-12 rounded-full!" />
          </>
        }>
        <div className="h-2 mr-10 rounded-full bg-[#E9EEF6]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(Math.min(percentage, 100), 0)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        {!isEpexOnlyView && (
          <Text variant="14M" className="text-left text-text-primary!">
            {count.toLocaleString()}
          </Text>
        )}
        <Text variant="14M" className="text-left text-text-primary!">
          {`${Number(percentage).toFixed(percentage < 1 ? 1 : 0)}%`}
        </Text>
      </WithFallback>
    </div>
  );
}

interface MarketDistributionKPIProps extends DistributionSummaryCard {
  loading?: boolean;
}

function TotalPeriodsBadge({color}: {color: string}) {
  return (
    <svg
      aria-hidden="true"
      className="size-[22px] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{color}}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M7.75 12.25L10.45 15L16.25 8.85"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarketDistributionKPI(props: MarketDistributionKPIProps) {
  const {background, loading, borderColor, color, label, value, valueColor} = props;
  const valueIndentClass = label === 'Total Periods' ? 'pl-[32px]' : 'pl-[24px]';

  if (loading) {
    return (
      <div className="min-h-27  rounded-xl border border-border bg-white px-4 py-4">
        <div className="mb-4 flex items-center gap-2.5">
          <Skeleton variant="circular" className="h-3 w-3 rounded-full!" />
          <Skeleton variant="rectangular" className="h-4 w-24 rounded-full!" />
        </div>
        <div className={valueIndentClass}>
          <Skeleton variant="rectangular" className="h-8 w-20 rounded-full!" />
        </div>
      </div>
    );
  }
  return (
    <div key={label} className="min-h-27 grow rounded-xl border px-4 py-4" style={{borderColor, background}}>
      <div className="flex flex-col items-start">
        <div className="mb-3 flex items-center gap-2.5">
          {label === 'Total Periods' ? (
            <TotalPeriodsBadge color={color} />
          ) : (
            <span className="h-3.5 w-3.5 rounded-full" style={{backgroundColor: color}} />
          )}
          <Text variant="16M" className="whitespace-nowrap text-text-primary!">
            {label}
          </Text>
        </div>
        <div className={valueIndentClass}>
          <Text variant="free" className="text-[20px] font-InterBold!" style={{color: valueColor}}>
            {value.toLocaleString()}
          </Text>
        </div>
      </div>
    </div>
  );
}
