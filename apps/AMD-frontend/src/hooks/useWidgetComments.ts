import {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {setActiveContext, setPanelOpen} from '@/services/redux/slice/commentSlice';
import type {CommentModule, WidgetDataPointPayload} from '@/constants';

export const useWidgetComments = (
  module: CommentModule,
  tab: string | null,
  assetId?: number | null,
  year?: number | null,
) => {
  const dispatch = useDispatch();
  const allComments = useSelector((state: any) => state.comment.comments || []);

  const getCommentCountForDataPoint = useCallback(
    <W extends WidgetDataPointPayload['context_widget']>(
      widget: W,
      dataPointId: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
      month?: number,
    ) => {
      return allComments.filter(
        (comment: any) =>
          (!year || String(comment.context_year) === String(year)) &&
          String(comment.context_widget) === String(widget) &&
          String(comment.context_data_point) === String(dataPointId) &&
          (month !== undefined ? String(comment.context_month) === String(month) : true),
      ).length;
    },
    [allComments, assetId, year],
  );

  const activeContext = useSelector((state: any) => state.comment.activeContext);
  const isPanelOpen = useSelector((state: any) => state.comment.isPanelOpen);

  const handleBadgeClick = useCallback(
    <W extends WidgetDataPointPayload['context_widget']>(
      widget: W,
      dataPointId: Extract<WidgetDataPointPayload, {context_widget: W}>['context_data_point'],
      month?: number,
    ) => {
      const isSameContext =
        activeContext?.context_module === module &&
        activeContext?.context_tab === tab &&
        activeContext?.context_widget === widget &&
        activeContext?.context_data_point === dataPointId &&
        activeContext?.context_year === year &&
        activeContext?.context_month === month;

      if (isPanelOpen && isSameContext) {
        dispatch(setPanelOpen(false));
      } else {
        dispatch(
          setActiveContext({
            context_module: module,
            context_tab: tab,
            context_widget: widget,
            context_data_point: dataPointId,
            context_asset_id: assetId,
            context_year: year,
            context_month: month,
          }),
        );
        dispatch(setPanelOpen(true));
      }
    },
    [dispatch, module, tab, assetId, year, activeContext, isPanelOpen],
  );

  return {getCommentCountForDataPoint, handleBadgeClick};
};
