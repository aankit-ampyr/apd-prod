import { useChartsActionV2 } from "@/hooks";
import { AssetMarketAnalytics, DataTableColumn } from "@/interface";
import { downloadAssetMarketStatistics } from "@/services/api";
import { AnalyticsTable } from "../../../common";
import { IconButton, Text } from "@/ui-kits";

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
        <div className="flex items-center gap-3">
          <Text variant="h4" className="text-text-primary! grow font-InterRegular!">
            Market Statistics
          </Text>
          <IconButton
            name="download"
            onClick={handleDownload}
            disabled={loading || displayRows.length === 0}
            className="hover:bg-primary-tint-2! cursor-pointer"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
          />
          {!isFullScreen ? (
            <IconButton
              name="maximize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={isFullScreen ? undefined : onMaximize}
            />
          ) : (
            <IconButton
              name="minimize"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={onMinimize}
            />
          )}
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
