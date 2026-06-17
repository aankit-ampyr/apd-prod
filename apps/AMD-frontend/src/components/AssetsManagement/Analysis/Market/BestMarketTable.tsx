import { AssetMarketAnalytics, DataTableColumn } from "@/interface";
import { AnalyticsTable } from "../../../common";
import { downloadAssetBestMarketsAnalysis } from "@/services/api";
import { IconButton, Text } from "@/ui-kits";

type BestMarketRow = NonNullable<AssetMarketAnalytics['best_markets']['buying_markets']>[number];

interface BestMarketsTableProps {
  title: string;
  rows: BestMarketRow[];
  columns: DataTableColumn<BestMarketRow>[];
  loading: boolean;
  marketType: 'buy' | 'sell';
  assetId?: number | null;
  month?: number;
  year?: number;
  assetSystemGenerationId?: string;
}

export function BestMarketsTable(props: BestMarketsTableProps) {
  const {title, rows, columns, loading, marketType, assetId, month, year, assetSystemGenerationId} = props;
  // ====================
  // states
  // ====================
  const displayRows = loading ? createBestMarketsSkeletonRows(Math.max(rows.length, 4)) : rows;

  // ====================
  // functions
  // ====================
  function createBestMarketsSkeletonRows(count = 4): BestMarketRow[] {
    return Array.from({length: count}).map((_, index) => ({
      market: `Loading ${index + 1}`,
      times_selected: 0,
      percentage: 0,
    }));
  }
  async function handleDownload() {
    if (!assetId || !month || !year) return;

    const fileName = `best_markets_${marketType}_${assetSystemGenerationId ?? assetId}_${month}_${year}.csv`;
    await downloadAssetBestMarketsAnalysis({
      assetId,
      month,
      year,
      market_type: marketType,
      fileName,
    });
  }

  return (
    <AnalyticsTable
      title={
        <div className="flex items-center justify-between gap-3">
          <Text variant="h4" className="text-text-primary! font-InterRegular!">
            {title}
          </Text>
          <IconButton
            name="download"
            onClick={handleDownload}
            disabled={loading || displayRows.length === 0}
            className="hover:bg-primary-tint-2! cursor-pointer"
            iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1! "
          />
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
