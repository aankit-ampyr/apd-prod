import {useDispatch, useSelector} from 'react-redux';
import {Icon, Text, Skeleton} from '@lazarus/react-common/ui-kit';
import {useRef, useState, useMemo, useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {cn} from '@lazarus/react-common/utils';
import {useToast} from '@/hooks';
import {getErrorMessage, type ErrorCodes} from '@/utils';
import {
  setPanelOpen,
  createCommentRequest,
  deleteCommentRequest,
  updateCommentRequest,
  replyCommentRequest,
  setSearchQuery,
  setFilterUserId,
  setUnreadFilterActive,
  readCommentRequest,
  checkCommentStatusRequest,
} from '@/services/redux/slice/commentSlice';
import {setPendingDeepLink} from '@/services/redux/slice';
import {CommentModule, APP_MODULE_HIERARCHY, CommentContextType} from '@/constants';
import {CommentToolbar} from './CommentToolbar';
import {CommentForm} from './CommentForm';
import {CommentCard} from './CommentCard';

export const isCommentOwner = (comment: any, currentUser: any) => {
  if (!comment || !currentUser) return false;

  const ownerId = String(comment.owner?.id || comment.user_id || comment.owner_id || '');
  const currentId = String(currentUser.id || '');

  if (currentId && ownerId && ownerId === currentId) {
    return true;
  }

  return false;
};

export function CommentPanel() {
  const dispatch = useDispatch();

  const isPanelOpen = useSelector((state: any) => state.comment.isPanelOpen);
  const isLoading = useSelector((state: any) => state.comment.isLoading);
  const activeContext = useSelector((state: any) => state.comment.activeContext);
  const allComments = useSelector((state: any) => state.comment.comments || []);
  const searchQuery = useSelector((state: any) => state.comment.searchQuery || '');
  const filterUserId = useSelector((state: any) => state.comment.filterUserId);
  const isUnreadFilterActive = useSelector((state: any) => state.comment.isUnreadFilterActive);
  const commentError = useSelector((state: any) => state.comment.commentError);
  const globalAllAssets = useSelector((state: any) => state.asset.allAssets || []);
  const currentSelectedAsset = useSelector((state: any) => state.asset.currentSelectedAsset);
  const pendingDeepLink = useSelector((state: any) => state.notification?.pendingDeepLink);
  const {showToast} = useToast();
  const currentAsset = useMemo(() => {
    if (!activeContext?.context_asset_id) return null;
    if (currentSelectedAsset?.id === activeContext.context_asset_id) {
      return currentSelectedAsset;
    }
    return globalAllAssets.find((a: any) => a.id === activeContext.context_asset_id) || null;
  }, [globalAllAssets, currentSelectedAsset, activeContext?.context_asset_id]);

  const currentUser = useSelector((state: any) => state.auth?.authData);

  const [snapshotUnreadIds, setSnapshotUnreadIds] = useState<Set<number> | null>(null);
  const prevIsUnreadActive = useRef(isUnreadFilterActive);
  const lastScrolledCommentId = useRef<number | null>(null);

  // Auto-scroll logic for Deep Linking
  useEffect(() => {
    if (!isLoading && activeContext?.comment_id && allComments.length > 0) {
      // Parse numeric id — supports both "5" (new format) and "COM-0005" (legacy format)
      const rawId = String(activeContext.comment_id);
      const match = rawId.match(/\d+/);
      const numericId = match ? parseInt(match[0], 10) : null;

      if (!numericId) return;
      if (lastScrolledCommentId.current === numericId) return;

      const elementId = `comment-item-${numericId}`;
      let attempts = 0;

      // Poll until the element is actually rendered in the DOM
      const interval = setInterval(() => {
        const element = document.getElementById(elementId);
        if (element) {
          console.warn(`[DeepLink] Poller found element ${elementId} after ${attempts} attempts, scrolling...`);
          clearInterval(interval);
          element.scrollIntoView({behavior: 'smooth', block: 'center'});

          // Temporary highlight effect
          const originalBg = element.style.backgroundColor;
          element.style.transition = 'background-color 1s ease';
          element.style.backgroundColor = '#EEF2FF';

          setTimeout(() => {
            element.style.backgroundColor = originalBg;
          }, 3000);

          lastScrolledCommentId.current = numericId;

          if (pendingDeepLink) {
            dispatch(setPendingDeepLink(null));
          }
        } else {
          if (attempts === 10 && isUnreadFilterActive) {
            console.warn(`[DeepLink] Element not found in Unread tab, switching to All tab...`);
            dispatch(setUnreadFilterActive(false));
          }
        }

        attempts++;
        if (attempts > 600) {
          // Max 1 minute
          console.warn(`[DeepLink] Poller failed to find element ${elementId} after 1 minute.`);
          clearInterval(interval);
          if (pendingDeepLink) {
            dispatch(setPendingDeepLink(null));
          }
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (!activeContext?.comment_id) {
      lastScrolledCommentId.current = null;
    }
  }, [isLoading, activeContext?.comment_id, allComments]);

  // Deep-link deleted comment check
  // Fires ONLY when there is a pendingDeepLink, the panel is open, and comments have loaded.
  // Shows a toast ONLY if the comment was a deleted parent. Does nothing for active comments.
  const statusCheckedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!pendingDeepLink || !isPanelOpen || isLoading) return;

    const rawId = String(pendingDeepLink.comment_id ?? '');
    const match = rawId.match(/\d+/);
    if (!match) return;
    const commentId = parseInt(match[0], 10);
    const assetId = Number(pendingDeepLink.asset_id);
    if (!commentId || !assetId) return;

    // Guard: don't re-check the same comment if we already checked it this deep-link cycle
    if (statusCheckedForRef.current === commentId) return;
    statusCheckedForRef.current = commentId;

    dispatch(checkCommentStatusRequest({commentId, assetId}));
  }, [pendingDeepLink, isPanelOpen, isLoading, dispatch]);

  // Reset guard when pendingDeepLink clears so next navigation can trigger a fresh check
  useEffect(() => {
    if (!pendingDeepLink) {
      statusCheckedForRef.current = null;
    }
  }, [pendingDeepLink]);

  // React to checkCommentStatus saga success
  const commentStatusSuccess = useSelector((state: any) => state.comment.commentStatusResult);
  useEffect(() => {
    if (!commentStatusSuccess || !pendingDeepLink) return;
    const {is_deleted, type, deleted_comment_id} = commentStatusSuccess;

    // Safety check: Ensure the status result belongs to the active deep link
    const rawId = String(pendingDeepLink.comment_id ?? '');
    const match = rawId.match(/\d+/);
    if (!match || deleted_comment_id !== parseInt(match[0], 10)) return;

    if (!is_deleted) return; // Active comment — normal deep link flow handles scroll
    if (type === 'parent') {
      showToast("The comment you're looking for has been deleted and is no longer available.", 'error');
      dispatch(setPendingDeepLink(null));
    }
  }, [commentStatusSuccess, pendingDeepLink, dispatch, showToast]);

  // Tracks which comment IDs have already had a readCommentRequest dispatched this unread session.
  // Prevents sending duplicate read requests when the mention filter changes.
  const readRequestedIdsRef = useRef<Set<number>>(new Set());

  // Helper: dispatch a readCommentRequest for a comment if not already sent this session
  const dispatchReadIfNeeded = (commentId: number, assetId: number) => {
    if (assetId && !readRequestedIdsRef.current.has(commentId)) {
      readRequestedIdsRef.current.add(commentId);
      dispatch(readCommentRequest({assetId, commentId}));
    }
  };

  // Helper: check if a comment block passes the current mention filter
  const passesMentionFilter = (content: any[]) => {
    if (!filterUserId) return true;
    return content.some((b: any) => b.type === 'mention' && String(b.user?.id) === filterUserId);
  };

  // Effect 1: Unread tab open/close
  // Builds the snapshot (ALL unread, frozen for the session) and dispatches read requests
  // only for the currently visible (mention-filter-passing) comments.
  useEffect(() => {
    if (isUnreadFilterActive && !prevIsUnreadActive.current) {
      readRequestedIdsRef.current = new Set(); // reset session tracker
      const unreadIds = new Set<number>();

      allComments.forEach((c: any) => {
        const assetId = activeContext?.context_asset_id || c.context_asset_id || 0;
        if (!c.is_read && !isCommentOwner(c, currentUser)) {
          unreadIds.add(c.id);
          // Only mark as read what the user can currently see
          if (passesMentionFilter(Array.isArray(c.content) ? c.content : [])) {
            dispatchReadIfNeeded(c.id, assetId);
          }
        }
        if (c.replies) {
          c.replies.forEach((r: any) => {
            if (!r.is_read && !isCommentOwner(r, currentUser)) {
              unreadIds.add(r.id);
              if (passesMentionFilter(Array.isArray(r.content) ? r.content : [])) {
                dispatchReadIfNeeded(r.id, assetId);
              }
            }
          });
        }
      });
      setSnapshotUnreadIds(unreadIds);
    } else if (!isUnreadFilterActive && prevIsUnreadActive.current) {
      setSnapshotUnreadIds(null);
      readRequestedIdsRef.current = new Set();
    }
    prevIsUnreadActive.current = isUnreadFilterActive;
  }, [isUnreadFilterActive, allComments, currentUser, activeContext, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: Mention filter changed while unread tab is open
  // Dispatches read requests for snapshot items that are now newly visible.
  useEffect(() => {
    if (!isUnreadFilterActive || !snapshotUnreadIds) return;
    allComments.forEach((c: any) => {
      const assetId = activeContext?.context_asset_id || c.context_asset_id || 0;
      if (snapshotUnreadIds.has(c.id) && passesMentionFilter(Array.isArray(c.content) ? c.content : [])) {
        dispatchReadIfNeeded(c.id, assetId);
      }
      if (c.replies) {
        c.replies.forEach((r: any) => {
          if (snapshotUnreadIds.has(r.id) && passesMentionFilter(Array.isArray(r.content) ? r.content : [])) {
            dispatchReadIfNeeded(r.id, assetId);
          }
        });
      }
    });
  }, [filterUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsLoading = useRef(isLoading);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTargetId, setScrollTargetId] = useState<number | string | null>(null);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (isPanelOpen) {
      dispatch(setUnreadFilterActive(false));
    } else {
      setReplyingToId(null);
      setIsSubmitting(false);
      dispatch(setUnreadFilterActive(false));
    }
  }, [isPanelOpen, dispatch, activeContext?.context_asset_id]);

  // When a submission finishes (isLoading flips false), clear submitting state and auto-scroll
  useEffect(() => {
    if (prevIsLoading.current && !isLoading && isSubmitting) {
      setIsSubmitting(false);
      setIsCreatingNew(false);

      if (scrollTargetId) {
        setTimeout(() => {
          if (typeof scrollTargetId === 'string' && scrollTargetId.startsWith('reply-')) {
            const parentId = scrollTargetId.replace('reply-', '');
            const card = document.getElementById(`comment-${parentId}`);
            if (card) {
              // block: 'end' aligns the bottom of the thread card with the bottom of the viewport
              card.scrollIntoView({behavior: 'smooth', block: 'end'});
            }
          } else if (scrollTargetId === 'new-thread') {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollTo({top: container.scrollHeight, behavior: 'smooth'});
            }
          } else {
            // For updates, target the inner text first so it doesn't align to the huge outer card
            const element =
              document.getElementById(`comment-item-${scrollTargetId}`) ||
              document.getElementById(`comment-${scrollTargetId}`);

            if (element) {
              element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
          }
          setScrollTargetId(null);
        }, 100);
      }
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, isSubmitting, scrollTargetId]);

  useEffect(() => {
    dispatch(setPanelOpen(false));
  }, [location.pathname, dispatch]);

  useEffect(() => {
    if (commentError) {
      showToast(getErrorMessage(commentError as ErrorCodes), 'error');
    }
  }, [commentError, showToast]);

  const handleClose = () => {
    // Force clear any pending deep link so the user can manually close if stuck
    if (pendingDeepLink) {
      dispatch(setPendingDeepLink(null));
    }
    dispatch(setPanelOpen(false));
    setIsCreatingNew(false);
    setReplyingToId(null);
  };

  const handleCreateSubmit = (title: string, content: string | any[], parentCommentId?: number) => {
    const formattedContent = Array.isArray(content) ? content : [{text: content, type: 'text'}];

    if (activeContext) {
      if (parentCommentId) {
        dispatch(
          replyCommentRequest({
            params: {assetId: activeContext.context_asset_id, commentId: parentCommentId},
            payload: {content: formattedContent},
          }),
        );
        dispatch(
          readCommentRequest({
            assetId: activeContext.context_asset_id,
            commentId: parentCommentId,
          }),
        );
      } else {
        dispatch(
          createCommentRequest({
            params: {assetId: activeContext.context_asset_id},
            payload: {
              title: title || 'Reply',
              content: formattedContent,
              context_type: activeContext.context_type,
              context_module: activeContext.context_module,
              context_tab: activeContext.context_tab,
              context_widget: activeContext.context_widget,
              context_data_point: activeContext.context_data_point || null,
              context_asset_id: activeContext.context_asset_id,
              context_year: activeContext.context_year,
              context_month: activeContext.context_month,
            },
          }),
        );
      }
    }
    if (parentCommentId) {
      setScrollTargetId(`reply-${parentCommentId}`);
    } else {
      setScrollTargetId('new-thread');
    }

    setIsSubmitting(true);
    setReplyingToId(null);
  };

  const handleDelete = (commentId: number) => {
    if (activeContext) {
      dispatch(deleteCommentRequest({assetId: activeContext.context_asset_id, commentId}));
    }
  };

  const handleUpdate = (commentId: number, title: string, content: string | any[]) => {
    const formattedContent = Array.isArray(content) ? content : [{text: content, type: 'text'}];

    // Find the comment to preserve is_read status
    let is_read = true;
    let parentIdForReply = null;
    for (const c of allComments) {
      if (c.id === commentId || c.comment_id === commentId) {
        is_read = c.is_read !== undefined ? c.is_read : true;
        break;
      }
      if (c.replies) {
        const reply = c.replies.find((r: any) => r.id === commentId || r.comment_id === commentId);
        if (reply) {
          is_read = reply.is_read !== undefined ? reply.is_read : true;
          parentIdForReply = c.id;
          break;
        }
      }
    }

    if (activeContext) {
      dispatch(
        updateCommentRequest({
          params: {assetId: activeContext.context_asset_id, commentId},
          payload: {title, content: formattedContent, is_read},
        }),
      );
    }

    if (parentIdForReply) {
      setScrollTargetId(`reply-${parentIdForReply}`);
    } else {
      setScrollTargetId(commentId);
    }
    setIsSubmitting(true);
  };

  // Filter comments based on active context
  const contextComments = useMemo(() => {
    if (!activeContext) return [];
    const result = allComments.filter((c: any) => {
      const getHierarchyLevel = (type: any) => {
        const t = Number(type);
        if (t === CommentContextType.Screen) return 1;
        if (t === CommentContextType.Tab) return 2;
        if (t === CommentContextType.Widget) return 3;
        if (t === CommentContextType.DataPoint) return 4;
        return 0;
      };

      const actLevel = getHierarchyLevel(activeContext.context_type);
      const cLevel = getHierarchyLevel(c.context_type);

      // Prevent higher-level comments from leaking downwards.
      // Also prevent bubbling up EXCEPT when viewing from the Screen level (Top Level).
      if (actLevel > 1) {
        if (cLevel !== actLevel) return false;
      } else {
        if (cLevel < actLevel) return false;
      }

      if (
        activeContext.context_module &&
        c.context_module != null &&
        String(c.context_module).toLowerCase() !== String(activeContext.context_module).toLowerCase()
      )
        return false;
      if (
        activeContext.context_asset_id &&
        c.context_asset_id != null &&
        String(c.context_asset_id) !== String(activeContext.context_asset_id)
      )
        return false;

      if (
        activeContext.context_tab &&
        c.context_tab != null &&
        String(c.context_tab).toLowerCase() !== String(activeContext.context_tab).toLowerCase()
      )
        return false;
      if (
        activeContext.context_widget &&
        c.context_widget != null &&
        String(c.context_widget).toLowerCase() !== String(activeContext.context_widget).toLowerCase()
      )
        return false;
      if (
        activeContext.context_data_point &&
        c.context_data_point != null &&
        String(c.context_data_point).toLowerCase() !== String(activeContext.context_data_point).toLowerCase()
      )
        return false;
      if (
        activeContext.context_year &&
        c.context_year != null &&
        String(c.context_year) !== String(activeContext.context_year)
      )
        return false;
      if (
        activeContext.context_month &&
        c.context_month != null &&
        String(c.context_month) !== String(activeContext.context_month)
      )
        return false;

      return true;
    });

    return result;
  }, [allComments, activeContext]);

  const displayedComments = useMemo(() => {
    let filtered = contextComments;

    if (filterUserId) {
      filtered = filtered.reduce((acc: any[], c: any) => {
        const safeContent = Array.isArray(c.content) ? c.content : [];
        const isMentionedInParent = safeContent.some(
          (b: any) => b.type === 'mention' && String(b.user?.id) === filterUserId,
        );

        const matchingReplies = (c.replies || []).filter((r: any) => {
          const rContent = Array.isArray(r.content) ? r.content : [];
          return rContent.some((b: any) => b.type === 'mention' && String(b.user?.id) === filterUserId);
        });

        if (isMentionedInParent || matchingReplies.length > 0) {
          acc.push({
            ...c,
            // Show only the replies that mention the user — never all replies.
            // The thread frame is always shown when the parent itself has a mention.
            replies: matchingReplies,
          });
        }
        return acc;
      }, []);
    }

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.reduce((acc: any[], c: any) => {
        const contentText = Array.isArray(c.content)
          ? c.content.map((b: any) => b.text || '').join(' ')
          : c.content || '';
        const matchesParent = contentText.toLowerCase().includes(lowerQ);

        const matchingReplies =
          c.replies?.filter((r: any) => {
            const rContent = Array.isArray(r.content)
              ? r.content.map((b: any) => b.text || '').join(' ')
              : r.content || '';
            return rContent.toLowerCase().includes(lowerQ);
          }) || [];

        if (matchesParent || matchingReplies.length > 0) {
          acc.push({
            ...c,
            replies: matchingReplies,
          });
        }
        return acc;
      }, []);
    }

    if (isUnreadFilterActive) {
      if (snapshotUnreadIds) {
        filtered = filtered
          .map((c: any) => ({
            ...c,
            replies: c.replies ? c.replies.filter((r: any) => snapshotUnreadIds.has(r.id)) : [],
          }))
          .filter((c: any) => {
            const parentUnread = snapshotUnreadIds.has(c.id);
            const hasUnreadReplies = c.replies && c.replies.length > 0;
            // If mention filter is also active, a read parent with no unread matching replies
            // must not produce an empty thread box — drop it.
            if (filterUserId && !parentUnread && !hasUnreadReplies) return false;
            if (filterUserId && parentUnread && !hasUnreadReplies) {
              // Parent is unread and mentions the user, but no replies visible — keep it (thread frame only)
              return true;
            }
            return parentUnread || hasUnreadReplies;
          });
      } else {
        filtered = filtered
          .map((c: any) => ({
            ...c,
            replies: c.replies ? c.replies.filter((r: any) => !r.is_read && !isCommentOwner(r, currentUser)) : [],
          }))
          .filter((c: any) => {
            const parentUnread = !c.is_read && !isCommentOwner(c, currentUser);
            const hasUnreadReplies = c.replies && c.replies.length > 0;
            // Same intersection logic for live unread state
            if (filterUserId && !parentUnread && !hasUnreadReplies) return false;
            return parentUnread || hasUnreadReplies;
          });
      }
    }
    return filtered.map((c: any) => ({
      ...c,
      replies: c.replies ? [...c.replies] : [],
    }));
  }, [contextComments, searchQuery, filterUserId, isUnreadFilterActive]);

  const contextDetails = useMemo(() => {
    if (!activeContext) return null;
    const {context_module, context_tab, context_widget} = activeContext;
    const moduleInfo = APP_MODULE_HIERARCHY[context_module as CommentModule];

    const moduleName = moduleInfo?.name || context_module || '-';
    let tabName = context_tab || '-';
    let widgetName = context_widget || '-';

    if (moduleInfo) {
      if (moduleInfo.tabs && context_tab) {
        const tabInfo = moduleInfo.tabs.find((t: any) => t.id === context_tab);
        if (tabInfo) {
          tabName = tabInfo.name;
          if (context_widget) {
            const widgetInfo = tabInfo.widgets.find((w: any) => w.id === context_widget);
            if (widgetInfo) widgetName = widgetInfo.name;
          }
        }
      } else if (moduleInfo.widgets && context_widget) {
        const widgetInfo = moduleInfo.widgets.find((w: any) => w.id === context_widget);
        if (widgetInfo) widgetName = widgetInfo.name;
      }
    }

    return {moduleName, tabName, widgetName};
  }, [activeContext]);

  return (
    <>
      {/* Slide-out Drawer */}
      <div
        className={cn(
          'fixed top-[80px] right-0 h-[calc(100dvh-80px)] w-[373px] z-50 transition-transform duration-300 ease-in-out flex flex-col',
          isPanelOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          background: 'linear-gradient(180deg, #F5FFFE 0%, #F9F9F9 100%)',
          borderLeft: '1px solid',
          borderImage: 'linear-gradient(180deg, #D5EEEE 0%, #E2E4EA 100%) 1',
          boxShadow: '-1px 0px 3px 0px rgba(222, 222, 222, 0.1), -5px 0px 5px 0px rgba(222, 222, 222, 0.09)',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[20px] pt-[16px] pb-[4px] shrink-0">
          <Text variant="16SB" className="text-[#101329]">
            {isLoading || isSubmitting
              ? 'Comments'
              : contextComments.length === 0 || isCreatingNew
                ? 'New Comment'
                : 'Comments'}
          </Text>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <Icon name={'cross' as any} className="w-[10px] h-[10px] text-[#151735]" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading || isSubmitting ? (
            // Skeleton Loader View
            <>
              <CommentToolbar onNewClick={() => {}} totalCount={0} unreadCount={0} currentUserId={currentUser?.id} />
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-[16px] [&::-webkit-scrollbar-thumb]:bg-[var(--Disable-State,#C9CCD6)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:min-h-[156px]">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-lg border border-[#E2E4EA] p-4 shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                      <Skeleton variant="circular" width={27} height={27} />
                      <div className="flex-1 flex items-center justify-between">
                        <Skeleton variant="text" width={100} height={24} />
                        <Skeleton variant="text" width={60} height={16} />
                      </div>
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={60} className="rounded-md" />
                  </div>
                ))}
              </div>
            </>
          ) : contextComments.length === 0 || isCreatingNew ? (
            // Empty State / New Comment Flow
            <div className="relative flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-[16px] [&::-webkit-scrollbar-thumb]:bg-[var(--Disable-State,#C9CCD6)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:min-h-[156px]">
                {activeContext && (
                  <div className="bg-white rounded-[8px] border border-gray-200 border-l-[6px] border-l-[#6BD3C6] p-4 shadow-sm mx-[20px] mt-2 mb-2 shrink-0">
                    <div className="flex items-start gap-2 mb-5">
                      <Icon name={'context-link' as any} className="w-5 h-5 text-[#009381] shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <Text variant="14SB" className="!text-[#009381] text-[15px]! leading-tight">
                          Auto-linked Context
                        </Text>
                        <p className="text-[#4B5563] text-[10px] mt-0.5">
                          Reference details linked to the selected analysis point.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-y-3">
                      <Text variant="12M" className="text-[#151735]">
                        Asset
                      </Text>
                      <Text variant="12R" className="text-[#4B5563]">
                        {currentAsset
                          ? `${currentAsset.name} (${currentAsset.asset_id || currentAsset.display_id || ''})`
                          : '-'}
                      </Text>
                      <Text variant="12M" className="text-[#151735]">
                        Module
                      </Text>
                      <Text variant="12R" className="text-[#4B5563]">
                        {contextDetails?.moduleName || '-'}
                      </Text>
                      <Text variant="12M" className="text-[#151735]">
                        Tab
                      </Text>
                      <Text variant="12R" className="text-[#4B5563]">
                        {contextDetails?.tabName || '-'}
                      </Text>
                      <Text variant="12M" className="text-[#151735]">
                        Chart/Table
                      </Text>
                      <Text variant="12R" className="text-[#4B5563]">
                        {contextDetails?.widgetName || '-'}
                      </Text>
                    </div>
                  </div>
                )}

                <CommentForm
                  key={
                    activeContext
                      ? `${activeContext.context_asset_id}-${activeContext.context_module}-${activeContext.context_tab}-${isPanelOpen}`
                      : String(isPanelOpen)
                  }
                  onSubmit={handleCreateSubmit}
                  onCancel={handleClose}
                  isReply={false}
                />
              </div>
            </div>
          ) : isLoading ? (
            // Skeleton Loader — unreachable now but kept as fallback
            <>
              <CommentToolbar onNewClick={() => {}} totalCount={0} unreadCount={0} currentUserId={currentUser?.id} />
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-[16px] [&::-webkit-scrollbar-thumb]:bg-[var(--Disable-State,#C9CCD6)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:min-h-[156px]">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-lg border border-[#E2E4EA] p-4 shadow-xs">
                    <div className="flex items-center gap-2 mb-4">
                      <Skeleton variant="circular" width={27} height={27} />
                      <div className="flex-1 flex items-center justify-between">
                        <Skeleton variant="text" width={100} height={24} />
                        <Skeleton variant="text" width={60} height={16} />
                      </div>
                    </div>
                    <Skeleton variant="rectangular" width="100%" height={60} className="rounded-md" />
                  </div>
                ))}
              </div>
            </>
          ) : displayedComments.length === 0 ? (
            // Search Empty State
            <>
              <CommentToolbar
                onNewClick={() => {
                  setReplyingToId(null);
                  setIsCreatingNew(true);
                }}
                totalCount={contextComments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0)}
                unreadCount={contextComments.reduce((acc: number, c: any) => {
                  const cUnread = !c.is_read && !isCommentOwner(c, currentUser) ? 1 : 0;
                  const rUnread =
                    c.replies?.filter((r: any) => !r.is_read && !isCommentOwner(r, currentUser)).length || 0;
                  return acc + cUnread + rUnread;
                }, 0)}
                currentUserId={currentUser?.id}
              />
              <div className="flex-1 flex flex-col items-center justify-start mt-[120px] px-8 gap-3">
                <Icon name={'message-square-x' as any} className="w-[48px] h-[48px] text-[#84C3BC] opacity-50 mb-2" />

                {searchQuery || filterUserId ? (
                  <>
                    <Text
                      variant="free"
                      className="font-inter font-medium text-[16px] leading-[26px] tracking-[0px] text-center"
                      style={{color: 'var(--Placeholder-Text, #6B7280)'}}>
                      No comment match your search or filter criteria.
                    </Text>
                    <button
                      onClick={() => {
                        dispatch(setSearchQuery(''));
                        dispatch(setFilterUserId(null));
                      }}
                      className="mt-4 flex items-center justify-center gap-2 bg-[#2F9C8F] text-white w-[180px] h-[32px] rounded-[6px] hover:bg-[#258176] transition-colors font-inter font-semibold text-[14px] leading-[24px] tracking-[0px] text-center align-middle">
                      <Icon name={'arrow-left' as any} className="w-[10px] h-[10px]" />
                      Back to Comments
                    </button>
                  </>
                ) : (
                  <Text
                    variant="free"
                    className="font-inter font-medium text-[16px] leading-[26px] tracking-[0px] text-center"
                    style={{color: 'var(--Placeholder-Text, #6B7280)'}}>
                    There are no new comments to review.
                  </Text>
                )}
              </div>
            </>
          ) : (
            // Thread View
            <>
              <CommentToolbar
                onNewClick={() => {
                  setReplyingToId(null);
                  setIsCreatingNew(true);
                }}
                totalCount={contextComments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0)}
                unreadCount={contextComments.reduce((acc: number, c: any) => {
                  const cUnread = !c.is_read && !isCommentOwner(c, currentUser) ? 1 : 0;
                  const rUnread =
                    c.replies?.filter((r: any) => !r.is_read && !isCommentOwner(r, currentUser)).length || 0;
                  return acc + cUnread + rUnread;
                }, 0)}
                currentUserId={currentUser?.id}
              />
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:my-[16px] [&::-webkit-scrollbar-thumb]:bg-[var(--Disable-State,#C9CCD6)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:min-h-[156px]">
                <div className="flex flex-col gap-4">
                  {displayedComments.map((comment: any) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      currentUser={currentUser}
                      replyingToId={replyingToId}
                      onReply={id => setReplyingToId(id)}
                      onCancelReply={() => setReplyingToId(null)}
                      onSubmitReply={(content, parentId) => handleCreateSubmit('', content, parentId)}
                      onDelete={handleDelete}
                      onEditSubmit={handleUpdate}
                      isUnreadFilterActive={isUnreadFilterActive}
                      searchQuery={searchQuery}
                      filterUserId={filterUserId}
                      snapshotUnreadIds={snapshotUnreadIds}
                      isTopLevelView={activeContext?.context_type === CommentContextType.Screen}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
