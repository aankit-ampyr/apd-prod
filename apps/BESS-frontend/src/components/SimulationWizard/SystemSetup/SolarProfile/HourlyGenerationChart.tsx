import {Badge, Icon, Text} from '@/ui-kits';
import {CustomBarChart} from '@/components';
import {downloadElementAsImage} from '@/utils';
import {useCallback, useEffect, useRef} from 'react';

interface Props {
  hourlyData: any[];
  isFullScreen?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  setIsStepsHidden?: (hidden: boolean) => void;
}

export const HourlyGenerationChart = ({hourlyData, isFullScreen = false, onMaximize, onMinimize, setIsStepsHidden}: Props) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;

    await downloadElementAsImage(chartRef.current, 'hourly_generation.png');
  }, []);

  const CustomTooltip = ({active, payload}: any) => {
    if (active && payload?.length) {
      const item = payload[0]?.payload;

      if (!item || item.value === 0) return null;

      return (
        <div className="bg-[#F1F0FF] px-4 py-2 rounded-xl shadow-md no-export pointer-events-none">
          <Text variant="btnMedium" className="font-InterSemibold! text-text-secondary!">
            Hour {item.hour}
          </Text>

          <Text variant="btnMedium" className="font-InterSemibold! text-blue!">
            Load {item.value.toFixed(2)} MW
          </Text>
        </div>
      );
    }

    return null;
  };

  // Handle full-screen mode
  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);
      return () => {
        setIsStepsHidden?.(false);
      };
    }
  }, [isFullScreen, setIsStepsHidden]);

  return (
    <div ref={chartRef} className="bg-white">
      <div className="flex items-center justify-between mb-3 mr-4">
        <div className="ml-11.5">
          <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1">
            Hourly Generation Profile
          </Text>

          <Text variant="small" className="text-sm text-text-secondary!">
            AVERAGE MW BY HOUR OF DAY
          </Text>
        </div>

        <Badge size="sm" className="w-20 border-[1.4px] border-blue" message="Avg Day" color="blue" />
      </div>

      <div className="flex justify-end mr-4 mb-2">
        <div className="flex gap-3 items-center no-export">
          <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={handleDownload} />

          {isFullScreen ? (
            <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
          ) : (
            <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
          )}
        </div>
      </div>

      <CustomBarChart
        hoverColor="#025681"
        data={hourlyData}
        xKey="hour"
        yKey="value"
        xAxisLabel="Hour of Day"
        yAxisLabel="Average MW"
        barColor="#0284C7"
        barWidth={18}
        tooltipComponent={<CustomTooltip />}
        enableCellHover
      />
    </div>
  );
};
