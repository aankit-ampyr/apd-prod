import { AnalyticsTable, SectionHeader } from "../../../common";
import { useChartsActionV2 } from "@/hooks";
import { AssetAncillaryServiceAnalytics, DataTableColumn } from "@/interface";
import { downloadAssetAncillaryServiceRevenueBreakdown } from "@/services/api";
import { IconButton } from "@/ui-kits";
import { cn } from "@/utils";

export type AncillaryRevenueBreakdownRow = NonNullable<
  AssetAncillaryServiceAnalytics['revenue_breakdown']
>['service_breakdown'][number];

type ServiceBreakSectionProps = {
  isFullScreen?: boolean;
  loading?: boolean;
  columns: DataTableColumn<AncillaryRevenueBreakdownRow>[];
  data: AncillaryRevenueBreakdownRow[];
  assetId?: number | null;
  month?: number;
  year?: number;
  assetSystemGenerationId?: string;
};

export function ServiceBreakSection(props: ServiceBreakSectionProps) {
  const {isFullScreen = false, columns, loading = false, data, assetId, month, year, assetSystemGenerationId} = props;

  /**
   * ==============================
   * Hooks
   * ==============================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <ServiceBreakSection {...props} isFullScreen />,
  });

  async function handleExportDownload() {
    if (!assetId || !month || !year) return;

    await downloadAssetAncillaryServiceRevenueBreakdown({
      assetId,
      month,
      year,
      fileName: `${assetSystemGenerationId ?? assetId}_ancillary_service_breakdown_${month}_${year}.csv`,
    });
  }

  return (
    <div ref={chartRef} className="flex flex-col">
      <div className="flex items-center justify-between gap-4 w-full">
        <SectionHeader icon="table" title="Ancillary Service Breakdown" subtitle="Detailed performance per service" />

        {!loading && (
          <div className={cn('flex items-center gap-4 chart-actions')}>
            <IconButton
              name="download"
              size={20}
              className="hover:bg-primary-tint-2! cursor-pointer charts-action"
              iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
              onClick={handleExportDownload}
            />
            {!isFullScreen ? (
              <IconButton
                name="maximize"
                size={20}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMaximize}
              />
            ) : (
              <IconButton
                name="minimize"
                size={20}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onMinimize}
              />
            )}
          </div>
        )}
      </div>
      <AnalyticsTable
        titleContainerClassName="px-5 py-4"
        wrapperClassName="rounded-2xl border border-border shadow-[0_1px_0_rgba(17,19,43,0.04)]"
        tableClassName="table-auto"
        headerColor="#EEF0F5"
        data={data}
        columns={columns}
        className="mt-4"
        loading={Boolean(loading)}
        errorMessage="No ancillary service data available."
        rowHover
      />
    </div>
  );
}