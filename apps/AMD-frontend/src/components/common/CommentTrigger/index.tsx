import React, {useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {IconTypes} from '@lazarus/react-common/interface';
import {Icon} from '@lazarus/react-common/ui-kit';
import {cn} from '@lazarus/react-common/utils';
import {CommentContextType, CommentModule} from '@/constants';
import {setPanelOpen, setActiveContext} from '../../../services/redux/slice/commentSlice';
import {setPendingDeepLink} from '../../../services/redux/slice';

export interface CommentTriggerProps {
  /** Visuals */
  variant?: 'icon-only' | 'icon-with-text';
  iconName?: IconTypes; // 'message'
  label?: string; // Optional text like "Comments"
  className?: string;
  iconClassName?: string;
  labelClassName?: string;

  /** Context Auto-Linking */
  contextType: CommentContextType;
  contextModule: CommentModule | null;
  contextTab?: string | null;
  contextWidget?: string | null;
  contextDataPoint?: string | null;
  contextAssetId?: number | null;
  contextYear?: number | null;
  contextMonth?: number | null;
}

export function CommentTrigger(props: CommentTriggerProps) {
  const {
    variant = 'icon-only',
    iconName = 'message' as IconTypes,
    label = 'Comments',
    className = '',
    iconClassName = '',
    labelClassName = '',
    contextType,
    contextModule,
    contextTab = null,
    contextWidget = null,
    contextDataPoint = null,
    contextAssetId = null,
    contextYear = null,
    contextMonth = null,
  } = props;

  const dispatch = useDispatch();

  // Read comments from Redux
  const allComments = useSelector((state: any) => state.comment.comments || []);

  // Filter comments based on context to get the total number for the badge
  const matchedCommentsCount = useMemo(() => {
    return allComments.reduce((acc: number, c: any) => {
      const getHierarchyLevel = (type: any) => {
        const t = Number(type);
        if (t === CommentContextType.Screen) return 1;
        if (t === CommentContextType.Tab) return 2;
        if (t === CommentContextType.Widget) return 3;
        if (t === CommentContextType.DataPoint) return 4;
        return 0;
      };

      const actLevel = getHierarchyLevel(contextType);
      const cLevel = getHierarchyLevel(c.context_type);

      if (actLevel > 1) {
        if (cLevel !== actLevel) return acc;
      } else {
        if (cLevel < actLevel) return acc;
      }

      if (
        contextModule &&
        c.context_module != null &&
        String(c.context_module).toLowerCase() !== String(contextModule).toLowerCase()
      )
        return acc;
      if (contextAssetId && c.context_asset_id != null && String(c.context_asset_id) !== String(contextAssetId))
        return acc;
      if (contextYear && c.context_year != null && String(c.context_year) !== String(contextYear)) return acc;
      if (contextMonth && c.context_month != null && String(c.context_month) !== String(contextMonth)) return acc;

      if (
        contextTab &&
        c.context_tab != null &&
        String(c.context_tab).toLowerCase() !== String(contextTab).toLowerCase()
      )
        return acc;
      if (
        contextWidget &&
        c.context_widget != null &&
        String(c.context_widget).toLowerCase() !== String(contextWidget).toLowerCase()
      )
        return acc;
      if (
        contextDataPoint &&
        c.context_data_point != null &&
        String(c.context_data_point).toLowerCase() !== String(contextDataPoint).toLowerCase()
      )
        return acc;
      return acc + 1 + (c.replies?.length || 0);
    }, 0);
  }, [
    allComments,
    contextType,
    contextModule,
    contextTab,
    contextWidget,
    contextDataPoint,
    contextAssetId,
    contextYear,
    contextMonth,
  ]);

  const activeContext = useSelector((state: any) => state.comment.activeContext);
  const isPanelOpen = useSelector((state: any) => state.comment.isPanelOpen);
  const pendingDeepLink = useSelector((state: any) => state.notification?.pendingDeepLink);

  const handleOpenPanel = () => {
    const isSameContext =
      activeContext?.context_module === contextModule &&
      activeContext?.context_tab === contextTab &&
      activeContext?.context_widget === contextWidget &&
      activeContext?.context_data_point === contextDataPoint &&
      activeContext?.context_year === contextYear &&
      activeContext?.context_month === contextMonth;

    if (isPanelOpen && isSameContext) {
      if (pendingDeepLink) {
        dispatch(setPendingDeepLink(null));
      }
      dispatch(setPanelOpen(false));
    } else {
      dispatch(
        setActiveContext({
          context_type: contextType,
          context_module: contextModule,
          context_tab: contextTab,
          context_widget: contextWidget,
          context_data_point: contextDataPoint,
          context_asset_id: contextAssetId,
          context_year: contextYear,
          context_month: contextMonth,
        }),
      );
      dispatch(setPanelOpen(true));
    }
  };

  return (
    <div
      id={`comment-trigger-${contextModule}-${contextTab}-${contextWidget || ''}-${contextDataPoint || ''}`}
      className={cn('relative inline-flex items-center cursor-pointer group', className)}
      onClick={handleOpenPanel}>
      <div className="relative flex items-center justify-center">
        <Icon
          name={iconName}
          className={cn('w-[15px] h-[15px] text-[#151735] group-hover:opacity-80 transition-opacity', iconClassName)}
        />
        {/* Badge on icon for icon-only variant */}
        {variant === 'icon-only' && matchedCommentsCount > 0 && (
          <span className="absolute -top-3 -right-3 bg-[#2F9C8F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm z-10 flex items-center justify-center">
            {matchedCommentsCount > 99 ? '99+' : matchedCommentsCount}
          </span>
        )}
      </div>

      {variant === 'icon-with-text' && (
        <div className="relative inline-flex items-center ml-2">
          <span
            className={cn(
              'text-[14px] font-medium text-[#151735] group-hover:opacity-80 transition-opacity pr-1',
              labelClassName,
            )}>
            {label}
          </span>
          {/* Badge on text for icon-with-text variant */}
          {matchedCommentsCount > 0 && (
            <span className="absolute -top-3 -right-3 bg-[#2F9C8F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm z-10 flex items-center justify-center">
              {matchedCommentsCount > 99 ? '99+' : matchedCommentsCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
