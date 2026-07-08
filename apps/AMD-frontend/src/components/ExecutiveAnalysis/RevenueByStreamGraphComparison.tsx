import {AssetExecutiveAnalysis, SelectInputItem} from '@/interface';
import {
  CALENDAR_MONTH_NAMES,
  CALENDAR_MONTHS_SHORT_NAMES,
  DivergentBarChartV2,
  DivergentBarData,
  formatCurrencyToPound,
  formatNumber,
} from '@lazarus/react-common';
import React, {useEffect, useMemo, useState} from 'react';
import {SelectInput, Text, Icon} from '@/ui-kits';
import {SectionHeader} from '../common';

type ExecutiveRevenueByStreamEntries = AssetExecutiveAnalysis['revenue_by_stream']['monthly_comparison'][number];

interface RevenueByStreamGraphComparisonProps {
  data: ExecutiveRevenueByStreamEntries[];
  loading?: boolean;
  year: number;
  className?: string;
  isFullScreenOverride?: boolean;
  downloadFileName?: string;
}
export function RevenueByStreamGraphComparison(props: RevenueByStreamGraphComparisonProps) {
  const {
    data,
    loading = false,
    year,
    className,
    downloadFileName='',
  } = props;

  /**
   * ========================
   * States & Constants
   * ========================
   */

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  /**
   * ========================
   * Derived States
   * ========================
   */
  const months = useMemo<SelectInputItem[]>(
    () =>
      data.reduce<SelectInputItem[]>((acc, item) => {
        if (acc.some(option => option.id === item.month)) {
          return acc;
        }

        acc.push({
          id: item.month,
          label: `${CALENDAR_MONTHS_SHORT_NAMES[item.month - 1]} ${year}`,
        });
        return acc;
      }, []),
    [data, year],
  );
  const availableMonthIds = useMemo(() => months.map(item => Number(item.id)), [months]);
  const latestAvailableMonthId = useMemo(() => {
    if (availableMonthIds.length === 0) return null;

    return Math.max(...availableMonthIds);
  }, [availableMonthIds]);

  const chartData = ((): DivergentBarData[] => {
    const monthData = data.find(item => item.month === selectedMonth);
    if (!monthData) {
      return [];
    }
    return [
      {
        label: 'SFFR',
        value: monthData.sffr ?? 0,
      },
      {
        label: 'EPEX',
        value: monthData.epex ?? 0,
      },
      {
        label: 'IDA1',
        value: monthData.ida1 ?? 0,
      },
      {
        label: 'IDC',
        value: monthData.idc ?? 0,
      },
      {
        label: 'Imbalance',
        value: monthData.imbalance ?? 0,
      },
      {
        label: 'Capacity\nMarket',
        value: monthData.capacity_market ?? 0,
      },
      {
        label: 'DUoS Net',
        value: monthData.duos_net_credit ?? 0,
      },
    ];
  })();

  /**
   * ========================
   * Side Effects
   * ========================
   */
  useEffect(() => {
    if (latestAvailableMonthId === null) {
      if (selectedMonth !== null) {
        setSelectedMonth(null);
      }
      return;
    }

    if (selectedMonth == null || !availableMonthIds.includes(selectedMonth)) {
      setSelectedMonth(latestAvailableMonthId);
    }
  }, [availableMonthIds, latestAvailableMonthId, selectedMonth]);

  return (
    <DivergentBarChartV2
      data={chartData}
      downloadFileName={downloadFileName}
      className={className}
      showValues
      isLoading={loading}
      positiveBarColor="#1EC590"
      negativeBarColor="#D64545"
      yAxisTickFormtter={v => formatNumber(Number(v))}
      barValueLabelFomatter={v => {
        if (v === 0) return '';
        return formatCurrencyToPound(v, false, true)
      }}
      headerClassName="justify-start"
      barRadius={4}
      title={
        <div className="flex gap-4 justify-between grow">
          <SectionHeader
            icon="growth"
            title="Actual Revenue by Stream"
            className='items-start'
            iconClassName='mt-1'
            subtitle="Compare actual monthly revenue contribution across each market and configured revenue stream for the selected month."
          />
          <div className="flex gap-2 items-center shrink-0">
            <Text>Select month :</Text>
            <SelectInput
              valueLabelFormatter={({id}) => `${CALENDAR_MONTH_NAMES[Number(id) - 1]} ${year}`}
              isFilter
              wrapperClassName="border-primary!"
              value={selectedMonth}
              options={months}
              buttonClassName='-mt-1'
              iconClassName='mt-0.5'
              onChange={({id}) => setSelectedMonth(Number(id))}
            />
          </div>
        </div>
      }
      yDomainPadding={2000}
      chartMargins={{bottom: 40}}
      headerNote={
        <div className="justify-end flex gap-2">
          <div className="flex h-5 w-6 items-center justify-center rounded text-white bg-[#1EC590]">
            <Icon name="plus" className="size-4" />
          </div>

          <div className="flex h-5 w-6 items-center justify-center rounded text-white bg-[#D64545]">
            <Icon name="minus" className="size-4" />
          </div>
          <Text variant="14M">Revenue (£)</Text>
        </div>
      }
      barWidth={60}
      yAxisLabel="Revenue (£)"
      xAxisLabel="Revenue Stream"
      xAxisLabelProps={{
        offset: -25,
      }}
    />
  );
}
