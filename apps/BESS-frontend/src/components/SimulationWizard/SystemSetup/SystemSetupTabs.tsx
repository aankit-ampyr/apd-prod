import {cn} from '@/utils';
import {Icon, IconTypes, Text} from '@/ui-kits';
import {useWindowDimensions} from '@/hooks';

const TABS: {id: string; label: string; icon: IconTypes}[] = [
  {
    id: 'load',
    label: 'Load Profile',
    icon: 'bar',
  },
  {
    id: 'solar',
    label: 'Solar Profile',
    icon: 'sun',
  },
  {
    id: 'battery',
    label: 'Battery (BESS)',
    icon: 'big-battery',
  },
  {
    id: 'generator',
    label: 'Generator (DG)',
    icon: 'gear-drop',
  },
];

type TabsProps = {
  activeTab: string;
  onChange: (tabId: string) => void;
  completedTabs?: {[key: string]: boolean};
};

export const SystemSetupTabs = ({activeTab, onChange, completedTabs = {}}: TabsProps) => {
  const {width} = useWindowDimensions();

  return (
    <div className="w-full bg-bg-card rounded-sm p-2 flex justify-around mt-7">
      {TABS.map(tab => {
        const isActive = activeTab === tab?.id;

        const isCompleted = completedTabs[tab.id] === true;

        return (
          <button
            key={tab?.id}
            onClick={() => onChange(tab?.id)}
            className={cn(
              'flex items-center gap-2 px-2 lg:px-12 py-1 lg:py-2 rounded-sm transition-all cursor-pointer',
              'text-sm font-medium',
              isActive ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black',
            )}>
            <Icon name={tab?.icon} size={16} />
            <Text variant={'body1'} className={cn(isActive ? 'text-secondary-deep!' : 'text-text-secondary!', 'lg:text-[16px]!')}>
              {tab?.label}
            </Text>
            {isCompleted && (
              <div className="w-3 h-3 lg:w-5 lg:h-5 bg-success rounded-full flex items-center justify-center shrink-0">
                <Icon name="tick" className="text-white" size={width < 1024 ? 7 : 12} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
