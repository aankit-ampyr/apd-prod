import {Icon, Text} from '@/ui-kits';
import {cn} from '@/utils';

export const StorableSolarAnalysis = (data: any) => {
  const formatValue = (value: any, formatter?: (val: number) => string) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '--';
    return formatter ? formatter(value) : value;
  };

  const stats = [
    {
      label: 'Max Storable',
      value: formatValue(data?.data?.max_storable, val => `${val.toFixed(2)} MW`),
    },
    {
      label: 'Hours with Excess',
      value: formatValue(data?.data?.excess_hours, val => `${val.toLocaleString()} hrs`),
    },
    {
      label: 'Total Storable',
      value: formatValue(
        data?.data?.total_storable,
        val =>
          `${val.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })} MWh`,
      ),
    },
    {
      label: 'Max Available',
      value: formatValue(data?.data?.max_available, val => `${val.toFixed(1)}%`),
      subValue: formatValue(data?.data?.hours_at_max, val => `${val} hrs`),
      subValueType: 'up',
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Icon name="hard-drive" size={22} />
        <Text variant={'h4'} className="font-SpaceGroteskBold">
          Storable Solar Analysis
        </Text>
      </div>
      <div className="mt-3 border border-border rounded-lg bg-white overflow-hidden">
        {/* Top Stats Row */}
        <div className="grid grid-cols-4 divide-x border-b divide-gray-300  border-border">
          {stats.map((item, index) => (
            <div key={item.label} className="p-4 flex flex-col gap-2">
              {/* Label + Icon */}
              <div className="flex items-center justify-between">
                <Text variant="small" className="text-sm text-text-secondary">
                  {item.label}
                </Text>
              </div>

              {/* Value */}
              <span className="inline-flex items-center gap-2">
                <Text className="text-lg font-semibold">{item.value}</Text>
                {item.subValue && (item.value !== '--') && (
                  <Text variant="small" className={cn('mt-0.5', item?.subValueType === 'up' ? 'text-success!' : 'text-error-text!')}>
                    ({item?.subValueType === 'up' ? <>&#8593;</> : <>&#8595;</>} {item?.subValue})
                  </Text>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
