import {Badge, Icon, Text} from '@/ui-kits';
import {CustomBarChart} from '@/components';
import {downloadElementAsImage} from '@/utils';
import {useCallback, useEffect, useRef} from 'react';

interface Props {
  monthlyData: any[];
  isFullScreen?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  setIsStepsHidden?: (hidden: boolean) => void;
}

export const MonthlyGenerationChart = ({monthlyData, isFullScreen = false, onMaximize, onMinimize, setIsStepsHidden}: Props) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;

    await downloadElementAsImage(chartRef.current, 'monthly_generation.png');
  }, []);

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
        <div className="ml-11.5 mt-4">
          <Text variant="caption" className="text-sm text-text-primary! font-InterSemiBold! mb-1!">
            Monthly Solar Generation
          </Text>

          <Text variant="small" className="text-sm text-text-secondary!">
            TOTAL MWh PER MONTH
          </Text>
        </div>

        <Badge size="sm" className="w-20 border-[1.4px] border-primary" message={new Date().getFullYear().toString()} color="primary" />
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

      <CustomBarChart data={monthlyData} showValues xKey="month" yKey="value" xAxisLabel="Month" yAxisLabel="Total MWh" barColor="#2F9C8F" barWidth={50} />
    </div>
  );
};
