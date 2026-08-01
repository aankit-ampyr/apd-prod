import {AnalyticsTable, Section} from '@/components/common';
import {AssetBatteryHealthAnalytics, DataTableColumn, IconTypes} from '@/interface';
import {
  assetBatteryWarrantyLimitExceedanceLoading,
  assetBatteryWarrantyLimitExceedanceResult,
  assetDetailsFetchLoading,
} from '@/services/redux/selectors';
import {Icon, Text} from '@/ui-kits';
import {cn, formatDate, parseDate} from '@/utils';
import React, {useRef, useState} from 'react';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {useSelector} from 'react-redux';
import {CommentTrigger} from '@/components/common';
import {CommentContextType, CommentModule, ViewAnalysisTabs, ViewAnalysisWidgets} from '@/constants';

/**
 * =============================
 * Types and Constants
 * =============================
 */
export enum BatteryMarketTab {
  Actual = 'actual',
  MultiMarket = 'multi_market',
}
type WarrantyLimitExceedanceColumnsItem =
  AssetBatteryHealthAnalytics['warranty_limit_exceed']['warranty_exceedance']['actual'][number];

const batteryMarketTab: {name: BatteryMarketTab; icon: IconTypes; label: string}[] = [
  {
    name: BatteryMarketTab.Actual,
    icon: 'chart-trend-up',
    label: 'Actual Operation',
  },
  {
    name: BatteryMarketTab.MultiMarket,
    icon: 'analysis1',
    label: 'Optimized',
  },
];

const overLimitColorCodingLabel = [
  {
    min: 0.3,
    max: Infinity,
    bgColor: '#BB1A2D',
    textColor: 'white',
    label: 'Significant warranty risk',
    category: 'High',
    valueLabel: 'Exceedance > 0.3 cycles/day',
  },
  {
    min: 0.1,
    max: 0.3,
    bgColor: '#EA8F40',
    textColor: 'white',
    label: 'Moderate risk. Monitor closely',
    category: 'Medium',
    valueLabel: '> 0.1 - 3 cycles/day  ',
  },
  {
    min: 0,
    max: 0.1,
    bgColor: '#FEFFA9',
    textColor: 'var(--color-text-primary)',
    label: 'Low risk. Minor impact',
    category: 'Low',
    valueLabel: '0 - 0.1 cycles/day  ',
  },
];

interface WrrantyLimitExcedanceProps {
  assetId?: number | null;
  year?: number | null;
}

export function WrrantyLimitExcedance(props: WrrantyLimitExcedanceProps) {
  const {assetId, year} = props;
  /**
   * ================================
   * Hooks
   * ================================
   */
  const ref = useRef<HTMLDivElement>(null);
  const {width: windowWidth} = useWindowDimensions();
  const isTablet = windowWidth <= TABLET_SCREEN_BREAKPOINT;
  /**
   * ================================
   * Selectors
   * ================================
   */
  const assetLoading = useSelector(assetDetailsFetchLoading);
  const warrantyLimitExceedanceResult = useSelector(assetBatteryWarrantyLimitExceedanceResult);
  const warrantyLimitExceedanceLoading = useSelector(assetBatteryWarrantyLimitExceedanceLoading);

  /**
   * ================================
   * States & Constants
   * ================================
   */
  const [tab, setTab] = useState<BatteryMarketTab>(BatteryMarketTab.Actual);
  const columns: DataTableColumn<WarrantyLimitExceedanceColumnsItem>[] = [
    {
      name: 'date',
      align: 'left',
      width: {
        minWidth: '100px',
        maxWidth: '100px',
      },
      title: <Text variant="12R">Date</Text>,
      render: row => {
        const date = parseDate(row.date, 'dd-MM-yyyy');
        return date ? (
          <Text variant="12M">{formatDate(date, 'dd MMM yyyy')}</Text>
        ) : (
          <Text variant="12M">{row.date ?? ''}</Text>
        );
      },
    },
    {
      name: 'daily-cycles',
      align: 'center',
      title: <Text variant="12R">Daily Cycles</Text>,
      render: row => <Text variant="12M">{row.daily_cycles ?? ''}</Text>,
    },
    {
      name: 'over-limit',
      align: 'center',
      title: <Text variant="12R">Over Limit</Text>,
      cellClassName: 'relative',
      render: row => {
        const color = getOverLimitColor(row.over_limit);
        return (
          <div
            style={{backgroundColor: color?.bgColor}}
            className="absolute inset-0 flex items-center justify-center h-full">
            <Text variant="12M" style={{color: color?.textColor}}>
              +{row.over_limit.toFixed(2)}
            </Text>
          </div>
        );
      },
    },
  ];

  /**
   * ===============================
   * Derived Data
   * ===============================
   */
  const actualMarketWarrantyLimitExceedance = warrantyLimitExceedanceResult?.warranty_exceedance?.actual ?? [];
  const multiMarketOptimizedWarrantyLimitExceedance =
    warrantyLimitExceedanceResult?.warranty_exceedance?.multi_market ?? [];

  const warrantyLimitExceedanceData = (() => {
    if (!warrantyLimitExceedanceResult) return [];

    return tab === BatteryMarketTab.Actual
      ? actualMarketWarrantyLimitExceedance
      : multiMarketOptimizedWarrantyLimitExceedance;
  })();

  /**
   * ================================
   * function
   * ================================
   */
  function getOverLimitColor(over_limit: number) {
    const colorCoding = overLimitColorCodingLabel.find(item => over_limit > item.min && over_limit <= item.max);
    return colorCoding;
  }

  return (
    <div ref={ref} className="bg-white @container flex flex-col px-4 py-3 gap-4 border border-border rounded-lg">
      <Section
        icon="currency-pound"
        title="Warranty Limit Exceedance Analysis"
        action={
          <CommentTrigger
            contextModule={CommentModule.ViewAnalysis}
            contextTab={ViewAnalysisTabs.BatteryHealth}
            contextWidget={ViewAnalysisWidgets.WarrantyLimitExceedance}
            contextType={CommentContextType.Widget}
            contextAssetId={assetId}
            contextYear={year}
            variant="icon-only"
            className="flex items-center justify-center w-7 h-7 rounded-md charts-action hover:bg-primary-tint-2!"
            iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
          />
        }
        subtitle="Identify high-risk operational days contributing to increased battery degradation">
        <div className="grid grid-cols-2 gap-2 p-2 rounded-sm bg-bg-card self-start w-full max-w-180">
          {batteryMarketTab.map(item => (
            <button
              className={cn(
                'flex justify-center cursor-pointer px-4 py-2 gap-2 items-center grow rounded ',
                tab === item.name ? 'border bg-white border-border' : 'bg-transparent',
              )}
              key={item.name}
              onClick={() => setTab(item.name)}>
              <Icon
                name={item.icon}
                className={cn(tab === item.name ? 'text-text-primary!' : 'text-text-secondary!')}
              />
              <Text variant="14M" className={cn(tab === item.name ? 'text-text-primary!' : 'text-text-secondary!')}>
                {item.label}
              </Text>
            </button>
          ))}
        </div>

        <div
          className={cn(
            'flex gap-8 @[931px]:gap-12 @[971px]:gap-16 @[991px]:gap-18 @[1011px]:gap-20',
            isTablet ? 'flex-row' : 'flex-col @[837px]:flex-row',
          )}>
          <AnalyticsTable
            columns={columns}
            className={cn(
              'max-w-full @[897px]:max-w-135 @[931px]:max-w-[60%]',
              isTablet ? 'w-[60%] shrink-0' : '@[837px]:max-w-120',
            )}
            tableClassName="table-auto!"
            data={warrantyLimitExceedanceData}
            headerColor="#EFFAF9"
            noDataMessage={
              <div className="w-fit mx-auto py-2 flex items-center gap-1">
                <Icon name="circle-check-big" className="text-success" />
                <Text variant="14R" className="text-success!">
                  No days exceeded warranty limits!
                </Text>
              </div>
            }
            loading={assetLoading || warrantyLimitExceedanceLoading}
          />

          {warrantyLimitExceedanceData.length > 0 && (
            <div className=" grow flex flex-col justify-center gap-5">
              <div className="flex flex-col gap-1">
                <Text variant="14M" className="font-InterSemiBold!">
                  Risk Interpretation
                </Text>
                <Text variant="14R" className="text-error-text!">
                  ({warrantyLimitExceedanceData.length} Days exceeded)
                </Text>
              </div>

              <div className={cn('grid gap-8', isTablet ? 'grid-cols-1' : 'grid-cols-2 @[837px]:grid-cols-1')}>
                {overLimitColorCodingLabel.map(item => (
                  <div className="flex gap-2 ">
                    <span className="size-3 mt-1.5" style={{backgroundColor: item.bgColor}} />
                    <div className="flex flex-col gap-1">
                      <Text variant="12M">
                        <span className="font-InterBold!">{item.category} :</span> {item.valueLabel}
                      </Text>
                      <Text variant="12M" className="text-text-secondary! text-[10px]">
                        {item.label}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
