import {IconButton} from '@/ui-kits';
import {AnalyticsTable, Section} from '../../../common';
import {useChartsActionV2} from '@/hooks';
import {AssetImbalanceAnalytics, DataTableColumn} from '@/interface';

interface TopWorstDaysProps {
  onDownload: () => void;
  isLoading?: boolean;
  isFullScreenOverride?: boolean;
  columns: DataTableColumn<AssetImbalanceAnalytics['worst_days']['worst_days'][number]>[];
  data: AssetImbalanceAnalytics['worst_days']['worst_days'];
  customActions?: React.ReactNode;
}
export function TopWorstDays(props: TopWorstDaysProps) {
  const {onDownload, isLoading, isFullScreenOverride: isFullScreen = false, columns, data, customActions} = props;
  /**
   * ================================
   * Hooks
   * ================================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <TopWorstDays {...props} isFullScreenOverride />,
  });
  return (
    <div ref={chartRef} className="bg-white border border-border p-4 rounded-lg">
      <div className="flex items-start flex-nowrap justify-between gap-4">
        <Section
          title="Top 5 Worst Imbalance Days"
          icon="graph-decline"
          subtitle="Highlights the dates with the highest negative net imbalance impact."
        />
        {!isLoading && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-4">
            <div className="flex shrink-0 items-center gap-3 flex-nowrap chart-actions">
              {customActions}
              <IconButton
                name="download"
                size={16}
                className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                onClick={onDownload}
              />
              {!isFullScreen ? (
                <IconButton
                  name="maximize"
                  size={16}
                  className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={onMaximize}
                />
              ) : (
                <IconButton
                  name="minimize"
                  size={16}
                  className="hover:bg-primary-tint-2! cursor-pointer charts-action"
                  iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
                  onClick={onMinimize}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <AnalyticsTable
        titleContainerClassName="px-5 py-4"
        wrapperClassName="rounded-md! border border-[#EEB2B2] shadow-[0_1px_0_rgba(17,19,43,0.04)]"
        tableClassName="table-auto rounded-md!"
        headerColor="#FFF6F6"
        data={data}
        columns={columns}
        className="mt-4 rounded-md!"
        loading={Boolean(isLoading)}
        rowHover
      />
    </div>
  );
}
