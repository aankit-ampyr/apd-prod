import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {HouryChart, SelectInputItem} from '@/interface';
import {Checkbox, MultiSelectInput, Text} from '@/ui-kits';
import {CartesianGrid, Label, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps} from 'recharts';

type ChartViewMode = 'day' | 'month' | 'range';

type HourlyPoint = {
  index: number;
  timestamp: string;
  timestampMs: number;
  dayLabel: string;
  hourLabel: string;
  tooltipLabel: string;
  solar: number;
  dgOutput: number;
  bessPower: number;
  soc: number;
  delivery: number;
  bessEnergy: number;
  load: number;
};

type LegendKey = 'solar' | 'dgOutput' | 'bessPower' | 'soc' | 'delivery' | 'bessEnergy';

type EnergyAnalyticsChartProps = {
  hourlyData?: HouryChart[] | null;
  viewMode: ChartViewMode;
  showThresholdLines?: boolean;
  dgOnThreshold?: number | null;
  dgOffThreshold?: number | null;
  hideLegendControls?: boolean;
};

const colors = {
  solar: '#ED9024',
  dgOutput: '#D64545',
  bessPower: '#4D9CD1',
  soc: '#1F8A4C',
  delivery: '#7C3AED',
  bessEnergy: '#D521B7',
  load: '#4B5563',
  dgOff: '#2265C9',
  dgOn: '#9D71D2',
  zero: '#94A3B8',
};

const generationSeries: Array<{
  id: LegendKey;
  label: string;
  color: string;
  yAxisId: 'left' | 'right';
  type: 'linear' | 'monotone';
  plotted: boolean;
}> = [
  {id: 'solar', label: 'Solar', color: colors.solar, yAxisId: 'left', type: 'monotone', plotted: true},
  {id: 'dgOutput', label: 'DG Output', color: colors.dgOutput, yAxisId: 'left', type: 'monotone', plotted: true},
  {id: 'bessPower', label: 'BESS Power', color: colors.bessPower, yAxisId: 'left', type: 'monotone', plotted: true},
  {id: 'soc', label: 'SOC%', color: colors.soc, yAxisId: 'right', type: 'monotone', plotted: true},
  {id: 'delivery', label: 'Delivery', color: colors.delivery, yAxisId: 'left', type: 'monotone', plotted: true},
  {id: 'bessEnergy', label: 'BESS Energy (MWh)', color: colors.bessEnergy, yAxisId: 'right', type: 'monotone', plotted: true},
];

const displayLegendOptions: SelectInputItem[] = generationSeries.map(({id, label}) => ({id, label}));
const mwSeriesKeys: LegendKey[] = ['solar', 'dgOutput', 'bessPower', 'delivery'];
const weekdayFormatter = new Intl.DateTimeFormat('en-US', {weekday: 'short', timeZone: 'UTC'});
const monthFormatter = new Intl.DateTimeFormat('en-US', {month: 'short', timeZone: 'UTC'});
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const POINTS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;

const rounded = (value: number) => Number(value.toFixed(2));
const toNumber = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const pad2 = (value: number) => String(value).padStart(2, '0');

const getDayLabel = (date: Date) => `${pad2(date.getUTCDate())}-${weekdayFormatter.format(date)}`;

const getTooltipLabel = (date: Date) => `${pad2(date.getUTCDate())} ${monthFormatter.format(date)} ${date.getUTCFullYear()} · ${pad2(date.getUTCHours())}:00`;

const normalizeHourlyData = (rows: HouryChart[] = []): HourlyPoint[] =>
  rows
    .map((row, index) => {
      const timestampMs = Date.parse(row.timestamp);
      const date = new Date(timestampMs);

      return {
        index,
        timestamp: row.timestamp,
        timestampMs,
        dayLabel: getDayLabel(date),
        hourLabel: `${pad2(date.getUTCHours())}:00`,
        tooltipLabel: getTooltipLabel(date),
        solar: rounded(toNumber(row.solar)),
        dgOutput: rounded(toNumber(row.dg_output)),
        bessPower: rounded(toNumber(row.bess_power)),
        soc: rounded(toNumber(row.soc_pct)),
        delivery: rounded(toNumber(row.delivery_mwh)),
        bessEnergy: rounded(toNumber(row.bess_energy)),
        load: rounded(toNumber(row.load)),
      };
    })
    .filter(point => Number.isFinite(point.timestampMs));

const getXAxisTicks = (data: HourlyPoint[], viewMode: ChartViewMode) => {
  if (!data.length) return [];

  if (viewMode === 'day') {
    return data.filter(point => new Date(point.timestampMs).getUTCHours() % 3 === 0).map(point => point.index);
  }

  return data.filter(point => new Date(point.timestampMs).getUTCHours() === 0).map(point => point.index);
};

const getLeftDomain = (data: HourlyPoint[], visibleKeys: LegendKey[]): [number, number] => {
  const visibleMwKeys = mwSeriesKeys.filter(key => visibleKeys.includes(key));
  if (!data.length || !visibleMwKeys.length) return [0, 1];

  const values = data.flatMap(point => visibleMwKeys.map(key => point[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const padding = spread * 0.1;

  return [min < 0 ? Math.floor(min - padding) : 0, Math.ceil(max + padding)];
};

const getRightDomain = (data: HourlyPoint[], visibleKeys: LegendKey[]): [number, number] => {
  const hasSoc = visibleKeys.includes('soc');
  const hasBessEnergy = visibleKeys.includes('bessEnergy');

  if (hasSoc && !hasBessEnergy) return [0, 100];

  const rightKeys: Array<'soc' | 'bessEnergy'> = [];
  if (hasSoc) rightKeys.push('soc');
  if (hasBessEnergy) rightKeys.push('bessEnergy');

  if (!data.length || !rightKeys.length) return [0, 1];

  const values = data.flatMap(point => rightKeys.map(key => point[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const padding = spread * 0.1;

  return [min < 0 ? Math.floor(min - padding) : 0, Math.ceil(max + padding)];
};

const LegendLine = ({color, label, dashed = false}: Readonly<{color: string; label: string; dashed?: boolean}>) => (
  <div className="flex items-center gap-2 text-xs font-InterMedium" style={{color}}>
    <span className="block h-0 w-5 border-t-2" style={{borderColor: color, borderTopStyle: dashed ? 'dashed' : 'solid'}} />
    <span>{label}</span>
  </div>
);

const LegendGroup = ({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) => (
  <div className="flex items-center gap-4">
    <Text variant="16R" className="text-[16px] font-InterMedium text-[#111827]">
      {title} :
    </Text>

    <div className="flex flex-wrap items-center gap-5 xl:gap-8">{children}</div>
  </div>
);

const CustomLegend = ({
  visibleKeys,
  loadMw,
  showThresholdLines,
  dgOnThreshold,
  dgOffThreshold,
}: Readonly<{
  visibleKeys: LegendKey[];
  loadMw: number | null;
  showThresholdLines: boolean;
  dgOnThreshold: number | null;
  dgOffThreshold: number | null;
}>) => {
  const visibleSeries = generationSeries.filter(series => visibleKeys.includes(series.id));

  return (
    <div className="mb-6 flex flex-col gap-6 pl-3 whitespace-nowrap">
      <LegendGroup title="Generation">
        {visibleSeries.map(series => (
          <LegendLine key={series.id} color={series.color} label={series.label} />
        ))}
      </LegendGroup>

      <LegendGroup title="Thresholds">
        {loadMw !== null && <LegendLine color={colors.load} label={`Load ${loadMw} MW`} dashed />}
        {/* {visibleKeys.includes('bessPower') && <LegendLine color={colors.zero} label="Zero MW" dashed />} */}
        {showThresholdLines && dgOffThreshold !== null && <LegendLine color={colors.dgOff} label={`DG OFF ${dgOffThreshold}%`} dashed />}
        {showThresholdLines && dgOnThreshold !== null && <LegendLine color={colors.dgOn} label={`DG ON ${dgOnThreshold}%`} dashed />}
      </LegendGroup>
    </div>
  );
};

const CustomTooltip = ({active, payload}: TooltipContentProps) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as HourlyPoint | undefined;
  if (!row) return null;

  return (
    <div className="min-w-50 rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <div className="mb-2 flex items-baseline gap-2">
        <p className="text-sm font-InterSemiBold text-[#111827]">{row.tooltipLabel}</p>
        <span className="text-[9px] font-InterMedium text-[#64748B]">hr {row.index + 1}</span>
      </div>
      <div className="border-t mb-2! border-[#E5E7EB]" />

      <div className="space-y-2 text-[11px] font-InterSemiBold">
        {payload.map(entry => (
          <p key={String(entry.dataKey)} style={{color: entry.color}}>
            {entry.name} : {Number(entry.value).toFixed(2)}
          </p>
        ))}
      </div>
      <div className="border-t border-[#E5E7EB] mt-1.5!" />

      <p className="mt-1.5 text-[9px] font-InterMedium text-[#94A3B8]">Load : {row.load.toFixed(2)} MW</p>
    </div>
  );
};

const renderLegendDropdownItem = (option: SelectInputItem, isSelected: boolean) => {
  const checkboxColor = colors[option.id as LegendKey];

  return (
    <>
      <Checkbox checked={isSelected} onCheckedChange={() => {}} className="mt-1" iconColor={checkboxColor} checkedBorderColor={checkboxColor} />
      <div>
        <Text variant="caption" className={isSelected ? 'truncate font-InterMedium! text-text-primary' : 'truncate text-text-primary font-InterRegular!'}>
          {option.label}
        </Text>
        <Text variant="small" className={isSelected ? 'truncate text-text-secondary! font-InterMedium!' : 'truncate text-text-secondary! font-InterRegular!'}>
          {option.subLabel}
        </Text>
      </div>
    </>
  );
};

export default function EnergyAnalyticsChart({
  hourlyData,
  viewMode,
  showThresholdLines = false,
  dgOnThreshold = null,
  dgOffThreshold = null,
  hideLegendControls = false,
}: Readonly<EnergyAnalyticsChartProps>) {
  const [selectedLegendIds, setSelectedLegendIds] = useState<LegendKey[]>(generationSeries.map(series => series.id));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const chartData = useMemo(() => normalizeHourlyData(hourlyData ?? []), [hourlyData]);
  const selectedLegendItems = useMemo(() => displayLegendOptions.filter(option => selectedLegendIds.includes(option.id as LegendKey)), [selectedLegendIds]);
  const visibleSeries = useMemo(() => generationSeries.filter(series => series.plotted && selectedLegendIds.includes(series.id)), [selectedLegendIds]);
  const visibleMwKeys = useMemo(() => mwSeriesKeys.filter(key => selectedLegendIds.includes(key)), [selectedLegendIds]);
  const hasVisibleSoc = selectedLegendIds.includes('soc');
  const hasVisibleBessEnergy = selectedLegendIds.includes('bessEnergy');
  const hasVisibleRightAxis = hasVisibleSoc || hasVisibleBessEnergy;
  const hasSocOnlyAxis = hasVisibleSoc && !hasVisibleBessEnergy;
  const hasVisiblePlottedSeries = visibleSeries.length > 0;
  const leftDomain = useMemo(() => getLeftDomain(chartData, selectedLegendIds), [chartData, selectedLegendIds]);
  const rightDomain = useMemo(() => getRightDomain(chartData, selectedLegendIds), [chartData, selectedLegendIds]);
  const xTicks = useMemo(() => getXAxisTicks(chartData, viewMode), [chartData, viewMode]);
  const loadMw = chartData.find(point => point.load > 0)?.load ?? null;
  const isWeeklySegmentMode = viewMode !== 'day';
  const paddedPointCount = isWeeklySegmentMode ? Math.max(POINTS_PER_WEEK, Math.ceil(chartData.length / POINTS_PER_WEEK) * POINTS_PER_WEEK) : chartData.length;
  const pointWidth = isWeeklySegmentMode && viewportWidth > 0 ? viewportWidth / POINTS_PER_WEEK : 4;
  const chartWidth = isWeeklySegmentMode ? paddedPointCount * pointWidth : '100%';
  const segmentWidth = isWeeklySegmentMode && viewportWidth > 0 ? viewportWidth : POINTS_PER_WEEK * 4;

  const handleDisplayLegendChange = (items: SelectInputItem[]) => {
    setSelectedLegendIds(items.map(item => item.id as LegendKey));
  };

  const handleHorizontalScroll = () => {
    if (!isWeeklySegmentMode || !scrollContainerRef.current) return;

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const currentScroll = scrollContainerRef.current.scrollLeft;
      const maxScrollLeft = Math.max(scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth, 0);
      const snappedScrollLeft = Math.round(currentScroll / segmentWidth) * segmentWidth;
      const targetScrollLeft = Math.max(0, Math.min(snappedScrollLeft, maxScrollLeft));

      if (Math.abs(targetScrollLeft - currentScroll) > 1) {
        scrollContainerRef.current.scrollTo({left: targetScrollLeft, behavior: 'smooth'});
      }
    }, 120);
  };

  useEffect(() => {
    if (!isWeeklySegmentMode || !scrollContainerRef.current) return;

    const updateViewportWidth = () => {
      if (!scrollContainerRef.current) return;
      setViewportWidth(scrollContainerRef.current.clientWidth);
    };

    updateViewportWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateViewportWidth);
      observer.observe(scrollContainerRef.current);

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener('resize', updateViewportWidth);
    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, [isWeeklySegmentMode]);

  useEffect(() => {
    if (!isWeeklySegmentMode || !scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({left: 0, behavior: 'auto'});
  }, [chartData.length, isWeeklySegmentMode]);

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mt-4 w-full rounded-xl border! border-border! bg-white px-4 pb-3 pt-5">
      {!hideLegendControls && (
        <div className="no-export mb-5 flex flex-wrap items-center justify-between gap-4">
          <Text variant="h3" className="text-[#0C8F82]!">
            Display Legends
          </Text>

          <div className="flex items-center gap-3">
            <Text variant="caption" className="text-text-primary!">
              Choose Display Legends :
            </Text>
            <MultiSelectInput
              values={selectedLegendIds}
              options={displayLegendOptions}
              onChange={handleDisplayLegendChange}
              showSelectAll
              selectedValueDisplay={() => (selectedLegendItems.length === displayLegendOptions.length ? 'All' : `${selectedLegendItems.length} selected`)}
              className="w-52"
              wrapperClassName="min-h-9! border-[#0C8F82]!"
              dropdownClassName="top-[calc(100%+4px)] max-h-70! w-62! left-auto! right-0!"
              textClassName="font-InterRegular!"
              dropdownItemRenderer={renderLegendDropdownItem}
            />
          </div>
        </div>
      )}

      <CustomLegend
        visibleKeys={selectedLegendIds}
        loadMw={loadMw}
        showThresholdLines={showThresholdLines}
        dgOnThreshold={dgOnThreshold}
        dgOffThreshold={dgOffThreshold}
      />

      {chartData.length ? (
        hasVisiblePlottedSeries ? (
          <div ref={scrollContainerRef} onScroll={handleHorizontalScroll} className="overflow-x-auto overflow-y-hidden">
            <div style={{width: chartWidth}}>
              <ResponsiveContainer width="100%" height={410}>
                <LineChart data={chartData} margin={{top: 0, right: 26, left: 0, bottom: 36}}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 4" vertical={false} />

                  <XAxis
                    dataKey="index"
                    axisLine={{stroke: '#CBD5E1'}}
                    tickLine={false}
                    interval={0}
                    ticks={xTicks}
                    tickFormatter={value => {
                      const point = chartData[Number(value)];
                      return viewMode === 'day' ? point?.hourLabel : point?.dayLabel;
                    }}
                    tick={{fontSize: 11, fill: '#475569', fontFamily: 'Inter, sans-serif'}}
                    tickMargin={12}
                    label={{
                      value: viewMode === 'day' ? 'Hours' : 'Dates',
                      position: 'insideBottom',
                      offset: -22,
                      style: {fill: '#111827', fontSize: 12, fontWeight: 600, textAnchor: 'middle'},
                    }}
                  />

                  {visibleMwKeys.length > 0 && (
                    <YAxis
                      yAxisId="left"
                      domain={leftDomain}
                      axisLine={{stroke: '#CBD5E1'}}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#475569', fontFamily: 'Inter, sans-serif'}}
                      label={{
                        value: 'Power (MW)',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 6.5,
                        style: {fill: '#111827', fontSize: 12, fontWeight: 600, textAnchor: 'middle'},
                      }}
                    />
                  )}

                  {hasVisibleRightAxis && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={rightDomain}
                      ticks={hasSocOnlyAxis ? [0, 25, 50, 75, 100] : undefined}
                      axisLine={{stroke: '#CBD5E1'}}
                      tickLine={false}
                      tick={{fontSize: 12, fill: '#475569', fontFamily: 'Inter, sans-serif'}}
                      label={{
                        value: 'Battery (%)',
                        angle: 90,
                        position: 'insideRight',
                        offset: -4,
                        style: {fill: '#111827', fontSize: 12, fontWeight: 600, textAnchor: 'middle'},
                      }}
                    />
                  )}

                  <Tooltip content={props => <CustomTooltip {...props} />} cursor={{stroke: '#9CA3AF', strokeWidth: 2}} />

                  {visibleMwKeys.length > 0 && loadMw !== null && (
                    <ReferenceLine yAxisId="left" y={loadMw} stroke={colors.load} strokeDasharray="4 4">
                      <Label value={`Load ${loadMw} MW`} dy={-18} position="insideTopLeft" fill="#475569" fontSize={9} offset={6} />
                    </ReferenceLine>
                  )}
                  {visibleMwKeys.length > 0 && selectedLegendIds.includes('bessPower') && (
                    <ReferenceLine yAxisId="left" y={0} stroke={colors.zero} strokeDasharray="4 4">
                      <Label value="0 MW" position="insideTopLeft" fill={colors.zero} fontSize={9} offset={6} />
                    </ReferenceLine>
                  )}
                  {hasVisibleSoc && showThresholdLines && dgOffThreshold !== null && (
                    <ReferenceLine yAxisId="right" y={dgOffThreshold} stroke={colors.dgOff} strokeDasharray="4 4">
                      <Label value={`DG OFF ${dgOffThreshold}%`} position="insideTopLeft" fill={colors.dgOff} fontSize={9} offset={6} />
                    </ReferenceLine>
                  )}
                  {hasVisibleSoc && showThresholdLines && dgOnThreshold !== null && (
                    <ReferenceLine yAxisId="right" y={dgOnThreshold} stroke={colors.dgOn} strokeDasharray="4 4">
                      <Label value={`DG ON ${dgOnThreshold}%`} position="insideTopLeft" fill={colors.dgOn} fontSize={9} offset={6} />
                    </ReferenceLine>
                  )}

                  {visibleSeries.map(series => (
                    <Line
                      key={series.id}
                      yAxisId={series.yAxisId}
                      type={series.type}
                      dataKey={series.id}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{r: 4}}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex h-90 items-center justify-center rounded-sm border border-dashed border-border bg-bg-card/40">
            <Text variant="14R" className="text-text-secondary!">
              Select at least one graph series to view dispatch data.
            </Text>
          </div>
        )
      ) : (
        <div className="flex h-90 items-center justify-center rounded-sm border border-dashed border-border bg-bg-card/40">
          <Text variant="14R" className="text-text-secondary!">
            No hourly simulation data available for the selected period.
          </Text>
        </div>
      )}
    </div>
  );
}
