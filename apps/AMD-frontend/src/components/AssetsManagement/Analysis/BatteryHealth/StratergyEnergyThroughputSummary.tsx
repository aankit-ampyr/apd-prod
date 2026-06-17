import {AnalyticsTable, SectionHeader} from '@/components/common';
import {useChartsActionV2} from '@/hooks';
import {AssetBatteryHealthAnalytics, DataTableColumn} from '@/interface';
import {IconButton} from '@/ui-kits';

type StratergyComparison = AssetBatteryHealthAnalytics['stratergy_cycle_comparison']['strategy_cycling_comparison'][number];
interface StratergyEnergyThroughputSummaryProps {
  data: StratergyComparison[];
  columns: DataTableColumn<StratergyComparison>[];
  isLoading: boolean;
  downloadFileName?: string;
}
export function StratergyEnergyThroughputSummary(props: StratergyEnergyThroughputSummaryProps) {
  const {columns, data, isLoading, downloadFileName = ''} = props;

  // ==================
  // hooks
  // ==================
  const {chartRef, handleDownLoad} = useChartsActionV2({downloadFileName});
  return (
    <div ref={chartRef} className='bg-white border border-border rounded-lg px-4 py-2'>
      <div className='flex gap-4 justify-between items-center'>
        <SectionHeader
          icon="zap-solid"
          title="Strategy Energy Throughput Summary"
          subtitle="View total discharge, daily cycle impact, degradation, and warranty status by trading strategy."
        />

        <IconButton
          name="download"
          size={20}
          className="hover:bg-primary-tint-2! cursor-pointer charts-action"
          iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          onClick={handleDownLoad}
        />
      </div>

      <AnalyticsTable
        columns={columns}
        data={data}
        loading={isLoading}
        headerColor='#EFFAF9'
        tableClassName='table-auto!'
        className='mt-4 mb-2.5'
      />
    </div>
  );
}
