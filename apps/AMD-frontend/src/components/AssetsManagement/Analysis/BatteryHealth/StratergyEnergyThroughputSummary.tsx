import {AnalyticsTable, SectionHeader} from '@/components/common';
import {useChartsActionV2} from '@/hooks';
import {AssetBatteryHealthAnalytics, DataTableColumn} from '@/interface';
import {IconButton} from '@/ui-kits';
import {useWindowDimensions} from '@/hooks';
import {TABLET_SCREEN_BREAKPOINT} from '@lazarus/react-common';
import {cn} from '@/utils';

type StratergyComparison =
  AssetBatteryHealthAnalytics['stratergy_cycle_comparison']['strategy_cycling_comparison'][number];
interface StratergyEnergyThroughputSummaryProps {
  data: StratergyComparison[];
  columns: DataTableColumn<StratergyComparison>[];
  isLoading: boolean;
  customActions?: React.ReactNode;
  handleDownload?: () => void;
}
export function StratergyEnergyThroughputSummary(props: StratergyEnergyThroughputSummaryProps) {
  const {columns, data, isLoading, customActions, handleDownload} = props;

  // ==================
  // hooks
  // ==================
  const {width: windowWidth} = useWindowDimensions();
  const isTablet = windowWidth <= TABLET_SCREEN_BREAKPOINT;
  const {chartRef} = useChartsActionV2({downloadFileName: ''});
  return (
    <div ref={chartRef} className="bg-white border border-border rounded-lg px-4 py-2">
      <div className="flex gap-4 justify-between items-center">
        <SectionHeader
          icon="zap-solid"
          title="Strategy Energy Throughput Summary"
          subtitle="View total discharge, daily cycle impact, degradation, and warranty status by trading strategy."
        />

        <div className="flex shrink-0 items-center flex-nowrap gap-3 chart-actions">
          {customActions}
          <IconButton
            name="download"
            size={16}
            className="hover:bg-primary-tint-2! cursor-pointer charts-action"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
            onClick={handleDownload}
          />
        </div>
      </div>

      <AnalyticsTable
        columns={columns}
        data={data}
        loading={isLoading}
        headerColor="#EFFAF9"
        tableClassName={cn('table-auto! w-full', isTablet && '[&_th]:px-2 [&_td]:px-2')}
        className="mt-4 mb-2.5"
      />
    </div>
  );
}
