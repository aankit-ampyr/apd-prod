import {useEffect, useState} from 'react';
import type {DateRange} from '@/interface';
import {cn} from '@/utils';
import {Alert, Icon, IconTypes, Text} from '@/ui-kits';
import {MonthlyPerformanceTable} from './MonthlyPerformanceTable';
import {HourlyDataTable} from './HourlyDataTable';
import {HourlyDispatchChart} from './HourlyDisaptchChart';
import type {MonthYear} from '@/interface';
import {useSimulationStatus} from '../SimulationStatusContext';
import {useSelector} from 'react-redux';
import {projectSimulationData} from '@/services/redux/selectors/simulationWizardSelector';
import {createPortal} from 'react-dom';

const TABS: {id: string; label: string; icon: IconTypes}[] = [
  {
    id: 'monthly',
    label: 'Monthly Performance',
    icon: 'calendar1',
  },
  {
    id: 'hourly-chart',
    label: 'Hourly Dispatch Graph',
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
  const {isAnySimulationRunning, runningSimulationId, userName} = useSimulationStatus();

  const proSimulData = useSelector(projectSimulationData);
  const currentSimulationId = proSimulData?.id ?? null;

  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyPendingMonths, setMonthlyPendingMonths] = useState<MonthYear[]>([]);
  const [monthlyAppliedMonths, setMonthlyAppliedMonths] = useState<MonthYear[]>([]);
  const [monthlySortDirection, setMonthlySortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState<MonthYear | null>(null);
  const shouldBlock = isAnySimulationRunning && runningSimulationId === currentSimulationId;

  const [tempDateRange, setTempDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });

  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });

  useEffect(() => {
    const container = document.querySelector('.screen-wrapper')?.parentElement;
    container?.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, []);

  useEffect(() => {
    if (!shouldBlock) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [shouldBlock]);

  return (
    <div className="main">
      {shouldBlock && (
        <div className="flex justify-center">
          <Alert
            textClassName="text-error-text! text-[14px]!"
            iconClassName="mt-0! size-4.5!"
            iconName="warning-triangle-sharp"
            message={`${userName} is currently running this simulation. You can run it again once it completes`}
            variant="error"
            className={`w-fit! justify-center items-center! p-3! border-0.5 border-error/20`}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="w-full bg-bg-card rounded-sm p-2 flex justify-between mt-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-start xl:items-center  gap-2 px-2 lg:px-12 py-1 lg:py-2 rounded-sm cursor-pointer',
                'font-InterMedium!',
                isActive ? 'bg-white shadow text-text-primary!' : 'text-text-secondary!',
              )}>
              <Icon name={tab.icon} size={16} className="mt-1 xl:mt-0" />
              <Text
                variant={'body1'}
                className={cn(
                  isActive ? 'text-text-primary! font-InterMedium!' : 'text-text-secondary! font-InterMedium!',
                  'lg:text-[16px]! lg:text-left xl:text-center',
                )}>
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
        {activeTab === 'hourly-chart' && (
          <HourlyDispatchChart
            selectedMonthYear={selectedMonthYear}
            setSelectedMonthYear={setSelectedMonthYear}
            tempDateRange={tempDateRange}
            setTempDateRange={setTempDateRange}
            appliedDateRange={appliedDateRange}
            setAppliedDateRange={setAppliedDateRange}
          />
        )}
        {activeTab === 'hourly-table' && <HourlyDataTable />}
      </div>
      {shouldBlock && createPortal(<div className="fixed inset-0 bg-white opacity-30 pointer-events-none" />, document.body)}
    </div>
  );
};
