import {AssetTBSpreadAnalytics, DataTableColumn} from '@/interface';
import {AnalyticsTable, CALENDAR_MONTH_NAMES, useChartsActionV2} from '@lazarus/react-common';
export type TBSpreadDetail = AssetTBSpreadAnalytics['details']['tb_spread'][number];
import {IconButton, Text} from '@/ui-kits';

interface TBSpreadDetailsTableProps {
  data: TBSpreadDetail[];
  loading: boolean;
  onDownload: () => void;
  columns: DataTableColumn<TBSpreadDetail>[];
  month: number;
  isFullScreenOverride?: boolean;
  customActions?: React.ReactNode;
}
export function TBSpreadDetailsTable(props: TBSpreadDetailsTableProps) {
  const {data, loading, onDownload, columns, month, isFullScreenOverride: isFullScreen, customActions} = props;

  /**
   * ====================================
   * Hooks
   * ====================================
   */
  const {chartRef, onMaximize, onMinimize} = useChartsActionV2({
    downloadFileName: '',
    renderFullScreen: () => <TBSpreadDetailsTable {...props} isFullScreenOverride />,
  });
  return (
    <div className="p-4 rounded-lg border border-border bg-white shadow-[0_4px_15px_rgba(0,0,0,0.08)]" ref={chartRef}>
      <AnalyticsTable
        data={data}
        loading={loading}
        tableClassName="table-auto!"
        columns={columns}
        titleContainerClassName="p-0!"
        stickyHeader={!isFullScreen}
        tableHeightWhenScrollable={450}
        title={
          <div className="p-4 flex justify-between items-center">
            <Text variant="h4">Daily TB Spread Details</Text>
            {!loading && (
              <div className="flex shrink-0 items-center flex-nowrap gap-3 chart-actions">
                <div className="bg-[#3A9E8D] flex items-center px-4 py-2 rounded-[8px]">
                  <Text variant="16SB" className="text-white!">
                    {CALENDAR_MONTH_NAMES[month - 1]}
                  </Text>
                </div>
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
            )}
          </div>
        }
      />
    </div>
  );
}
