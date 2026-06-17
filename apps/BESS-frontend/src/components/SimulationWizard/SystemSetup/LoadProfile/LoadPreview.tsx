import {LoadProfilePattern} from '@/constants';
import {Text, Icon, IconTypes} from '@/ui-kits';
import {useSelector} from 'react-redux';
import {
  loadProfileHourPercentage,
  loadProfilePattern,
  loadProfilePeakLoad,
  loadProfileTotalEnergy,
  loadProfileTotalHours,
} from '@/services/redux/selectors/simulationWizardSelector';

export const LoadPreview = () => {
  const peakLoad = useSelector(loadProfilePeakLoad);
  const totalEnergy = useSelector(loadProfileTotalEnergy);
  const totalHours = useSelector(loadProfileTotalHours);
  const pattern = useSelector(loadProfilePattern);
  const hourPercentage = useSelector(loadProfileHourPercentage);

  const loadHoursBadge =
    pattern?.id === LoadProfilePattern['Constant(24/7)']
      ? '↑ 24/7'
      : hourPercentage != null && Number.isFinite(Number(hourPercentage))
        ? `↑ ${Number(hourPercentage).toLocaleString(undefined, {maximumFractionDigits: 1})}% of year`
        : undefined;

  const PREVIEW_DATA: {id: string; title: string; value: string; unit: string; extra?: string; icon: IconTypes}[] = [
    {
      id: 'energy',
      title: 'Total Energy',
      value: totalEnergy ? totalEnergy.toLocaleString() : '--',
      unit: 'MWh/yr',
      icon: 'zap',
    },
    {
      id: 'peak',
      title: 'Peak Load',
      value: peakLoad ? peakLoad.toLocaleString() : '--',
      unit: 'MW',
      icon: 'activity',
    },
    {
      id: 'hours',
      title: 'Load Hours',
      value: totalHours ? totalHours.toLocaleString() : '--',
      unit: '',
      extra: loadHoursBadge,
      icon: 'clock',
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <Text variant="largeBody" className="text-text-secondary!">
        Preview
      </Text>
      <div className="flex gap-4 w-full">
        {PREVIEW_DATA.map(item => (
          <div key={item.id} className="self-center w-full bg-white border border-gray-200 rounded-md px-4 py-4 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2">
              <Text variant="caption" className="text-text-primary!">
                {item.title}
              </Text>
              <Icon name={item.icon} className="text-text-primary! size-4" />
            </div>

            <div className="flex items-center gap-2 whitespace-nowrap">
              <Text variant="h3" className="font-InterSemiBold! leading-none">
                {item.value}
              </Text>

              {item.unit && (
                <Text variant="caption" className="text-text-primary! font-InterSemiBold! leading-none">
                  {item.unit}
                </Text>
              )}

              {item.extra && <Text className="text-success! text-sm! leading-none">{item.extra}</Text>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

