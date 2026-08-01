import {useChartsActionV2} from '@/hooks';
import {AssetMarketAnalytics, DataTableColumn} from '@/interface';
import {downloadAssetMarketStatistics} from '@/services/api';
import {AnalyticsTable} from '../../../common';
import {IconButton, Text} from '@/ui-kits';

type AssetMarketStrategy = AssetMarketAnalytics['utilization']['market_strategy'];
type MarketStatisticsRow = NonNullable<AssetMarketAnalytics['statistics']['rows']>[number];

interface StatisticsTableProps {
  rows: MarketStatisticsRow[];
  columns: DataTableColumn<MarketStatisticsRow>[];
  loading: boolean;
  assetId?: number | null;
  month?: number;
  year?: number;
  market_strategy: AssetMarketStrategy;
  assetSystemGenerationId?: string;
  isFullScreen?: boolean;
  customActions?: React.ReactNode;
}
export function StatisticsTable(props: StatisticsTableProps) {
  const {
    rows,
    columns,
    loading,
    assetId,
    market_strategy,
    month,
    year,
    assetSystemGenerationId,
    isFullScreen = false,
    customActions,
  } = props;
  // ====================
  // hooks
  // ====================
  const {onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => {
      return <StatisticsTable {...props} isFullScreen />;
    },
  });

  // ====================
  // states
  // ====================
  const dummyRowCount = market_strategy === 'multi' ? 7 : 2; // multi will have 7-8 markets, while other will have 2
  const displayRows = loading ? createBestMarketsSkeletonRows(dummyRowCount) : rows;

  // ====================
  // functions
  // ====================
  function createBestMarketsSkeletonRows(count = 4): MarketStatisticsRow[] {
    return Array.from({length: count}).map((_, index) => ({
      market: `Loading ${index + 1}`,
      percentage_revenue: 0,
      percentage_time: 0,
      periods: 0,
      revenue: 0,
    }));
  }
  async function handleDownload() {
    if (!assetId || !month || !year) return;

    const fileName = `${assetSystemGenerationId}_${month}_${year}_market_statistics.csv`;
    await downloadAssetMarketStatistics({
      assetId,
      month,
      year,
      fileName,
      market_strategy: market_strategy as unknown as any,
    });
  }

  return (
    <AnalyticsTable
      title={
        <div className="flex items-center justify-between gap-3 px-1 border-b border-border py-4">
          <Text variant="h4" className="text-text-primary! font-InterRegular!">
            Market Statistics
          </Text>
          <div className="flex items-center shrink-0 flex-nowrap gap-3">
            {customActions}
            <IconButton
              name="download"
              onClick={handleDownload}
              size={16}
              disabled={loading || rows.length === 0}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
            />
            {!isFullScreen ? (
              <IconButton
                name="maximize"
                onClick={onMaximize}
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
              />
            ) : (
              <IconButton
                name="minimize"
                onClick={onMinimize}
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
              />
            )}
          </div>
        </div>
      }
      titleContainerClassName="px-5 py-4"
      wrapperClassName="rounded-md border border-border shadow-[0_1px_0_rgba(17,19,43,0.04)]"
      tableClassName="table-fixed"
      headerColor="#EFF8F8"
      data={displayRows}
      columns={columns}
      loading={loading}
      errorMessage="No market data available."
      rowHover
    />
  );
}
