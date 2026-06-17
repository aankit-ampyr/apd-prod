import {loadProfileConfig, loadProfileDataPoints} from '@/services/redux/selectors/simulationWizardSelector';
import {Icon, Text} from '@/ui-kits';
import {useSelector} from 'react-redux';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell} from 'recharts';
import {useEffect, useRef, useState} from 'react';
import {useChartsAction} from '@/hooks';

export const LoadChart = ({setIsStepsHidden}: Readonly<{setIsStepsHidden?: (hidden: boolean) => void}>) => {
  const apiData = useSelector(loadProfileDataPoints);
  const config = useSelector(loadProfileConfig);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {chartRef, isFullScreen, onMaximize, onMinimize, handleDownLoad, fullScreenStyle} = useChartsAction({
    downloadFileName: 'load-profile-chart.png',
  });
  /**
   * Checks if a given hour is within the active time range based on config
   */
  const isHourInActiveRange = (hour: number): boolean => {
    // 24/7 pattern - all hours active
    if (config?.load_mw !== undefined && !config?.start_time && !config?.windows) {
      return true;
    }

    // Custom windows (end hour is exclusive, same as backend load math)
    if (config?.windows?.length) {
      return config.windows.some((w: {start_time: number; end_time: number}) => {
        if (w.start_time <= w.end_time) {
          return hour >= w.start_time && hour < w.end_time;
        }
        return hour >= w.start_time || hour < w.end_time;
      });
    }

    // Day/Night/Seasonal patterns (end hour is exclusive)
    const start = config?.start_time;
    const end = config?.end_time;

    if (start === undefined || end === undefined) return false;

    if (start <= end) {
      return hour >= start && hour < end;
    }
    return hour >= start || hour < end;
  };

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);

      setTimeout(() => {
        let el: HTMLElement | null = chartRef.current;
        while (el) {
          const {overflow, overflowY} = window.getComputedStyle(el);
          if (/(auto|scroll)/.test(overflow + overflowY) && el.scrollHeight > el.clientHeight) {
            el.scrollTo({top: 0, behavior: 'smooth'});
            break;
          }
          el = el.parentElement;
        }
      }, 50);
    } else {
      setIsStepsHidden?.(false);
      setTimeout(() => {
        const el = chartRef.current;
        if (!el) return;

        // Find the scroll container
        let scrollContainer: HTMLElement | null = el.parentElement;
        while (scrollContainer) {
          const {overflow, overflowY} = window.getComputedStyle(scrollContainer);
          if (/(auto|scroll)/.test(overflow + overflowY) && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
            break;
          }
          scrollContainer = scrollContainer.parentElement;
        }

        if (scrollContainer) {
          const chartTop = el.getBoundingClientRect().top;
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const offset = chartTop - containerTop + scrollContainer.scrollTop;
          const targetScroll = offset - scrollContainer.clientHeight * 0.5;
          scrollContainer.scrollTo({top: targetScroll, behavior: 'smooth'});
        }
      }, 50);
    }
  }, [isFullScreen, setIsStepsHidden]);

  // Use actual per-hour values so each custom window keeps its own load.
  const data =
    apiData?.map(d => ({
      hour: d.hour,
      value: d.value,
      isActive: isHourInActiveRange(d.hour),
    })) || [];

  /**
   * Returns bar color based on whether the hour is in active range
   */
  const getBarColor = (hour: number) => {
    return isHourInActiveRange(hour) ? '#A5E8E1' : '#E5F7F5';
  };

  const CustomTooltip = ({active, payload, label}: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0].payload;
    // Only show tooltip for hours in the active range
    if (!dataPoint.isActive) return null;

    const value = payload[0].value;

    return (
      <div className="bg-primary-tint-2 px-4 py-2 rounded-xl shadow-md">
        <div className="text-gray-800 font-semibold">Hour&nbsp;&nbsp;{Number(label).toFixed(2)}</div>
        <div className="text-[#18AC9D] font-bold">Load&nbsp;&nbsp;{value.toFixed(2)} MW</div>
      </div>
    );
  };

  useEffect(() => {
    if (isFullScreen) {
      setIsStepsHidden?.(true);
    } else {
      setIsStepsHidden?.(false);
    }
  }, [isFullScreen, setIsStepsHidden]);

  const onDownloadClick = async () => {
    const icons = chartRef.current?.querySelector('.chart-actions');

    if (icons instanceof HTMLElement) {
      icons.style.display = 'none';
    }

    await new Promise(resolve => requestAnimationFrame(resolve));

    await handleDownLoad();

    if (icons instanceof HTMLElement) {
      icons.style.display = 'flex';
    }
  };

  return (
    <div
      ref={chartRef}
      className={`${!isFullScreen ? 'bg-white border border-gray-200 rounded-xl' : ''}  p-4 mt-4`}
      style={isFullScreen ? fullScreenStyle : {}}>
      <Text variant="body1" className="mt-3 text-text-primary! text-center font-InterSemiBold!">
        Load Profile
      </Text>

      <div className="flex justify-end w-full mb-5">
        <div className="chart-actions flex items-center gap-3">
          <Icon name="download" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onDownloadClick} />
          {!isFullScreen ? (
            <Icon name="maximize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMaximize} />
          ) : (
            <Icon name="minimize" size={20} className="text-primary-tint-1! cursor-pointer" onClick={onMinimize} />
          )}
        </div>
      </div>

      <div className="bg-white p-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{bottom: 70}}>
            <div className="chart-actions">
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            </div>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* X Axis */}
            <XAxis
              dataKey="hour"
              tick={{fontSize: 12}}
              tickMargin={15}
              label={{
                value: 'Hour of Day',
                position: 'bottom',
                offset: 25,
                style: {fill: '#222', fontWeight: 600},
              }}
            />

            {/* Y Axis */}
            <YAxis
              tick={{fontSize: 12}}
              label={{
                value: 'MW',
                angle: -90,
                position: 'insideLeft',
                style: {fill: '#222', fontWeight: 600},
              }}
            />

            {/* Bars */}
            {/* <Bar dataKey="value" fill="#A5E8E1" radius={[4, 4, 0, 0]} barSize={14} /> */}
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={14} onMouseLeave={() => setHoveredIndex(null)}>
              {data.map((entry: any, index: number) => (
                <Cell
                  key={index}
                  fill={
                    entry.isActive && hoveredIndex === index
                      ? '#29C1B1' // hover color for active hours only
                      : getBarColor(entry.hour)
                  }
                  onMouseEnter={() => entry.isActive && setHoveredIndex(index)}
                  style={{cursor: entry.isActive ? 'pointer' : 'default'}}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

