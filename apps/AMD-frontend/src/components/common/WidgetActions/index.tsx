import {IconButton} from '@lazarus/react-common/ui-kit';
import {cn} from '@lazarus/react-common/utils';
import {CommentTrigger} from '../CommentTrigger';
import {CommentContextType, CommentModule} from '@/constants';

interface WidgetActionsProps {
  className?: string;
  onDownload?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
  isFullScreenOverride?: boolean;
  contextModule: CommentModule;
  contextTab?: string | null;
  contextWidget: string;
  contextYear?: number | null;
  contextMonth?: number | null;
  contextAssetId?: number | null;
}

export function WidgetActions(props: WidgetActionsProps) {
  const {
    className,
    onDownload,
    onMaximize,
    onMinimize,
    isFullScreenOverride = false,
    contextModule,
    contextTab,
    contextWidget,
    contextYear,
    contextMonth,
    contextAssetId,
  } = props;

  return (
    <div className={cn('flex shrink-0 items-center gap-3 chart-actions flex-nowrap', className)}>
      <CommentTrigger
        contextType={CommentContextType.Widget}
        contextModule={contextModule}
        contextTab={contextTab}
        contextWidget={contextWidget}
        contextYear={contextYear}
        contextMonth={contextMonth}
        contextAssetId={contextAssetId}
        variant="icon-only"
        className="charts-action hover:bg-primary-tint-2!"
        iconClassName="text-primary-tint-1! group-hover:text-primary-tint-1!"
      />

      {onDownload && (
        <IconButton
          name="download"
          size={16}
          className="cursor-pointer hover:bg-primary-tint-2! charts-action"
          iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          onClick={onDownload}
        />
      )}

      {!isFullScreenOverride && onMaximize && (
        <IconButton
          name="maximize"
          size={16}
          className="cursor-pointer hover:bg-primary-tint-2! charts-action"
          iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          onClick={onMaximize}
        />
      )}

      {isFullScreenOverride && onMinimize && (
        <IconButton
          name="minimize"
          size={16}
          className="cursor-pointer hover:bg-primary-tint-2! charts-action"
          iconClassName="group-hover:text-primary-tint-1! text-primary-tint-1!"
          onClick={onMinimize}
        />
      )}
    </div>
  );
}
