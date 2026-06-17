import {useState} from 'react';
import {cn} from '@/utils';
import {Icon, IconTypes, Text} from '@/ui-kits';
import {MonthlyPerformanceTable} from './MonthlyPerformanceTable';
import {HourlyDataTable} from './HourlyDataTable';
import {HourlyDispatchChart} from './HourlyDisaptchChart';
import type {MonthYear} from '@/interface';

const TABS: {id: string; label: string; icon: IconTypes}[] = [
  {
    id: 'monthly',
    label: 'Monthly Performance',
    icon: 'calendar1',
  },
  {
    id: 'hourly-chart',
    label: 'Hourly Dispatch Chart',
    icon: 'analysis1',
  },
  {
    id: 'hourly-table',
    label: 'Hourly Data Table',
    icon: 'bulletin',
  },
];

interface ViewDetailedAnalysisProps {
  onBack?: () => void;
}

export const ViewDetailedAnalysis = ({onBack}: ViewDetailedAnalysisProps) => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyPendingMonths, setMonthlyPendingMonths] = useState<MonthYear[]>([]);
  const [monthlyAppliedMonths, setMonthlyAppliedMonths] = useState<MonthYear[]>([]);
  const [monthlySortDirection, setMonthlySortDirection] = useState<'asc' | 'desc' | null>(null);

  return (
    <div className="main">
      {/* Tabs */}
      <div className="w-full bg-bg-card rounded-sm p-2 flex justify-between mt-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-2 lg:px-12 py-1 lg:py-2 rounded-sm cursor-pointer',
                'font-InterMedium!',
                isActive ? 'bg-white shadow text-text-primary!' : 'text-text-secondary!',
              )}>
              <Icon name={tab.icon} size={16} />
              <Text variant={'body1'} className={cn(isActive ? 'text-text-primary! font-InterMedium!' : 'text-text-secondary! font-InterMedium!', 'lg:text-[16px]!')}>
                {tab.label}
              </Text>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'monthly' && (
          <MonthlyPerformanceTable
            pendingMonths={monthlyPendingMonths}
            appliedMonths={monthlyAppliedMonths}
            onPendingMonthsChange={setMonthlyPendingMonths}
            onAppliedMonthsChange={setMonthlyAppliedMonths}
            sortDirection={monthlySortDirection}
            onSortDirectionChange={setMonthlySortDirection}
          />
        )}
        {activeTab === 'hourly-chart' && <HourlyDispatchChart />}
        {activeTab === 'hourly-table' && <HourlyDataTable />}
      </div>
    </div>
  );
};
