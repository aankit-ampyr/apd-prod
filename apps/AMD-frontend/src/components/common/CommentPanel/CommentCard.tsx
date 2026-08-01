import {useState, useMemo, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {useSelector} from 'react-redux';

import {formatDistanceToNow} from 'date-fns';

import {Icon, Text, CustomModal} from '@lazarus/react-common/ui-kit';
import {cn} from '@lazarus/react-common/utils';
import {Comment as CommentData} from '@/interface';
import {APP_MODULE_HIERARCHY} from '@/constants/comment';

import {CommentForm} from './CommentForm';
import {isCommentOwner} from './index';

interface CommentCardProps {
  comment: CommentData;
  currentUser: {id: number | string; email: string; name: string};
  onEditSubmit?: (commentId: number, title: string, content: string | any[]) => void;
  onDelete?: (commentId: number) => void;
  onReply?: (commentId: number) => void;
  replyingToId?: number | null;
  onCancelReply?: () => void;
  onSubmitReply?: (content: string | any[], parentId: number) => void;
  isUnreadFilterActive?: boolean;
  snapshotUnreadIds?: Set<number> | null;
  searchQuery?: string;
  filterUserId?: string;
  isTopLevelView?: boolean;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#818CF8', '#A78BFA', '#F472B6', '#2F9C8F'];

const getAvatarColor = (name: string) => {
  if (!name) return '#ccc';
  const initials = getInitials(name);
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();

  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) {
    let relativeTime = formatDistanceToNow(date, {addSuffix: true});
    relativeTime = relativeTime.replace('about ', '');
    return relativeTime;
  }

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
};

export function CommentCard({
  comment,
  currentUser,
  onEditSubmit,
  onDelete,
  onReply,
  replyingToId,
  onSubmitReply,
  onCancelReply,
  isUnreadFilterActive,
  snapshotUnreadIds,
  searchQuery,
  filterUserId,
  isTopLevelView,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const commentStatusResult = useSelector((state: any) => state.comment.commentStatusResult);

  const ownerNameOrId =
    comment.owner?.name || (comment as any).user_name || String(comment.owner?.id || (comment as any).user_id);
  const initials = getInitials(ownerNameOrId);
  const avatarBg = getAvatarColor(ownerNameOrId);

  // 15-minute rule for edit/delete
  const createdAtMs = new Date(comment.created_at).getTime();
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const isWithin15Mins = nowMs - createdAtMs <= 15 * 60 * 1000;
  const isOwner = isCommentOwner(comment, currentUser);
  const canEditOrDelete = isOwner && isWithin15Mins;

  // Determine if parent matches the search and filter
  const parentMatchesFilters = useMemo(() => {
    let matchesSearch = true;
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      const contentText = Array.isArray(comment.content)
        ? comment.content.map((b: any) => b.text || '').join(' ')
        : comment.content || '';
      matchesSearch = contentText.toLowerCase().includes(lowerQ);
    }

    let matchesFilterUser = true;
    if (filterUserId) {
      if (Array.isArray(comment.content)) {
        matchesFilterUser = comment.content.some(
          (b: any) => b.type === 'mention' && b.user?.id?.toString() === filterUserId,
        );
      } else {
        matchesFilterUser = false;
      }
    }

    return matchesSearch && matchesFilterUser;
  }, [comment, searchQuery, filterUserId]);

  // Helper to safely highlight text
  const HighlightText = ({text, highlight}: {text: string; highlight?: string}) => {
    if (!highlight || !text) return <>{text}</>;
    // Escape special characters so regex doesn't break on * ? + ( ) etc.
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-[#FFF7AB]">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  };

  // Render content blocks natively based on type
  const renderContentBlocks = (blocks: any) => {
    if (!blocks || !Array.isArray(blocks)) return null;
    return blocks.map((block, i) => {
      if (block.type === 'mention') {
        return (
          <span key={i} className="text-[#238075] font-semibold">
            @{block.user?.name || block.user_id}
          </span>
        );
      }
      return <HighlightText key={i} text={block.text} highlight={searchQuery} />;
    });
  };

  const extractTextAndMentions = (blocks: any) => {
    if (!blocks || !Array.isArray(blocks)) {
      return {text: typeof blocks === 'string' ? blocks : '', mentions: []};
    }
    const mentions: any[] = [];
    const text = blocks
      .map((b: any) => {
        if (b.type === 'mention') {
          const userId = b.user?.id || b.user_id;
          const name = b.user?.name || String(userId);
          mentions.push({id: userId, name});
          return `@${name} `;
        }
        return b.text || '';
      })
      .join('');
    return {text, mentions};
  };

  // Map context IDs to human readable names
  const contextDisplayName = useMemo(() => {
    let baseName = comment.context_widget || comment.context_tab;
    if (comment.context_module) {
      const moduleConfig = APP_MODULE_HIERARCHY[comment.context_module as keyof typeof APP_MODULE_HIERARCHY];
      if (moduleConfig) {
        if (comment.context_widget) {
          if (moduleConfig.tabs) {
            for (const tab of moduleConfig.tabs) {
              const widget = tab.widgets.find(w => w.id === comment.context_widget);
              if (widget) {
                baseName = widget.name;
                break;
              }
            }
          }
          if (moduleConfig.widgets) {
            const widget = moduleConfig.widgets.find(w => w.id === comment.context_widget);
            if (widget) baseName = widget.name;
          }
        } else if (comment.context_tab) {
          if (moduleConfig.tabs) {
            const tab = moduleConfig.tabs.find(t => t.id === comment.context_tab);
            if (tab) baseName = tab.name;
          }
        }
      }
    }

    if (baseName && comment.context_data_point && isTopLevelView) {
      return `${baseName} | ${String(comment.context_data_point).toUpperCase()}`;
    }
    return baseName;
  }, [comment.context_module, comment.context_tab, comment.context_widget, comment.context_data_point, isTopLevelView]);

  return (
    <div id={`comment-${comment.id}`} className={cn('rounded-lg border border-gray-200 p-4 shadow-xs', 'bg-white')}>
      {isEditing ? (
        <div className="mb-4">
          <CommentForm
            initialTitle={comment.title}
            initialComment={extractTextAndMentions(comment.content).text}
            initialMentionedUsers={extractTextAndMentions(comment.content).mentions}
            isReply={false}
            isInline={true}
            isEditMode={true}
            onSubmit={(title, content) => {
              onEditSubmit?.(comment.id, title, content);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* Title */}
          <Text variant="free" className="text-[15px] font-semibold text-[#151735] mb-2 break-words">
            {comment.title}
          </Text>

          {/* Auto-linked context header (if any context widget/tab is provided) */}
          {contextDisplayName && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#E2E4EA]">
              <Icon name={'chart-widget' as any} className="w-4 h-4 text-[#6B7280]" />
              <Text variant="free" className="font-inter font-medium text-[12px] leading-[20px] !text-[#6B7280]">
                {contextDisplayName}
              </Text>
            </div>
          )}
        </>
      )}

      {/* Unified Timeline: Parent + Replies */}
      {(() => {
        const allItems: any[] = [];

        // Add parent if it matches filters and not currently editing it
        if (
          !isEditing &&
          parentMatchesFilters &&
          (!isUnreadFilterActive || !snapshotUnreadIds || snapshotUnreadIds.has(comment.id))
        ) {
          allItems.push({...comment, isParent: true});
        }

        // Add replies
        if (comment.replies && comment.replies.length > 0) {
          allItems.push(...comment.replies.map((r: any) => ({...r, isParent: false})));
        }

        // Dynamically inject a deleted reply placeholder if the active deep link is targeting it
        // Do not show the placeholder if the Unread filter is active (deleted comments cannot be unread)
        if (
          !isUnreadFilterActive &&
          commentStatusResult?.is_deleted &&
          commentStatusResult.type === 'reply' &&
          commentStatusResult.parent_id === comment.id &&
          commentStatusResult.deleted_comment_id
        ) {
          const exists = allItems.some(item => item.id === commentStatusResult.deleted_comment_id);
          if (!exists) {
            allItems.push({
              id: commentStatusResult.deleted_comment_id,
              isParent: false,
              is_deleted: true,
              created_at: commentStatusResult.deleted_at || new Date().toISOString(),
              updated_at: commentStatusResult.deleted_at || new Date().toISOString(),
            });
          }
        }

        // Sort items ascending (oldest first)
        allItems.sort((a, b) => {
          const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
          const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
          return timeA - timeB;
        });

        if (allItems.length === 0) return null;

        return (
          <div className="flex flex-col gap-4 mb-4">
            {allItems.map((item: any) => {
              if (item.isParent) {
                return (
                  <div
                    key={`parent-${item.id}`}
                    id={`comment-item-${item.id}`}
                    className={cn(
                      'flex gap-2.5',
                      isUnreadFilterActive && snapshotUnreadIds?.has(item.id) && 'bg-[#F4F6FC] p-2 rounded-lg -mx-2',
                    )}>
                    <div
                      className="w-[27px] h-[27px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{backgroundColor: avatarBg}}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-inter font-semibold text-[14px] leading-[24px] tracking-[0px] text-[#151735]">
                            {item.owner?.name ||
                              (item as any).user_name ||
                              String(item.owner?.id || (item as any).user_id)}
                          </span>
                          <span className="font-inter font-light text-[10px] leading-[16px] tracking-[0px] text-[#6B7280]">
                            {formatTime(item.updated_at || item.created_at)}
                          </span>
                        </div>
                        {canEditOrDelete && !isEditing && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setIsEditing(true)}
                              className="text-[#151735] hover:opacity-80 transition-opacity">
                              <Icon name={'pencil' as any} className="w-[12px] h-[12px]" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(item.id)}
                              className="text-[#CD2020] hover:opacity-80 transition-opacity">
                              <Icon name={'trash' as any} className="w-[12px] h-[13px]" />
                            </button>
                          </div>
                        )}
                      </div>
                      <Text
                        variant="free"
                        className="font-inter font-medium text-[12px] leading-[22px] tracking-[0px] text-[#151735] whitespace-pre-wrap break-words">
                        {renderContentBlocks(item.content)}
                      </Text>
                    </div>
                  </div>
                );
              } else {
                if (item.is_deleted) {
                  return (
                    <div
                      key={`reply-${item.id}`}
                      id={`comment-item-${item.id}`}
                      className="w-full h-[60px] rounded-[6px] bg-[#F0F5F9] p-[8px] flex gap-[12px]">
                      <div className="w-[27px] h-[27px] rounded-full bg-white flex items-center justify-center shrink-0 mt-[2px]">
                        <Icon
                          name="cross"
                          className="w-[10.6px] h-[10.6px] text-[#E06A6A] stroke-current stroke-[2px]"
                        />
                      </div>
                      <span className="font-inter font-normal italic text-[12px] leading-[22px] text-[#151735] flex items-center h-full">
                        The comment you're trying to view has been deleted and is no longer available.
                      </span>
                    </div>
                  );
                }

                const rName = item.owner?.name || item.user_name || String(item.owner?.id || item.user_id);
                const rInitials = getInitials(rName);
                const rBg = getAvatarColor(rName);
                const rCreatedAtMs = new Date(item.created_at).getTime();
                const rIsWithin15Mins = nowMs - rCreatedAtMs <= 15 * 60 * 1000;
                const rIsOwner = isCommentOwner(item, currentUser);
                const rCanEditOrDelete = rIsOwner && rIsWithin15Mins;

                return (
                  <div
                    key={`reply-${item.id}`}
                    id={`comment-item-${item.id}`}
                    className={cn(
                      'flex gap-2.5',
                      isUnreadFilterActive && snapshotUnreadIds?.has(item.id) && 'bg-[#F4F6FC] p-2 rounded-lg -mx-2',
                    )}>
                    <div
                      className="w-[27px] h-[27px] shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                      style={{backgroundColor: rBg}}>
                      {rInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-inter font-semibold text-[14px] leading-[24px] tracking-[0px] text-[#151735]">
                            {rName}
                          </span>
                          <span className="font-inter font-light text-[10px] leading-[16px] tracking-[0px] text-[#6B7280]">
                            {formatTime(item.updated_at || item.created_at)}
                          </span>
                        </div>
                        {rCanEditOrDelete && editingReplyId !== item.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingReplyId(item.id)}
                              className="text-[#151735] hover:opacity-80 transition-opacity">
                              <Icon name={'pencil' as any} className="w-[12px] h-[12px]" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(item.id)}
                              className="text-[#CD2020] hover:opacity-80 transition-opacity">
                              <Icon name={'trash' as any} className="w-[12px] h-[13px]" />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingReplyId === item.id ? (
                        <CommentForm
                          initialComment={extractTextAndMentions(item.content).text}
                          initialMentionedUsers={extractTextAndMentions(item.content).mentions}
                          isReply={true}
                          isInline={true}
                          isEditMode={true}
                          onSubmit={(title, content) => {
                            onEditSubmit?.(item.id, title, content);
                            setEditingReplyId(null);
                          }}
                          onCancel={() => setEditingReplyId(null)}
                        />
                      ) : (
                        <Text
                          variant="free"
                          className="font-inter font-medium text-[12px] leading-[22px] tracking-[0px] text-[#151735] whitespace-pre-wrap break-words">
                          {renderContentBlocks(item.content)}
                        </Text>
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        );
      })()}

      {/* Reply Action or Form */}
      <div className="mt-4 mb-0">
        {replyingToId === comment.id ? (
          <CommentForm
            isReply={true}
            onSubmit={(_t, content) => onSubmitReply?.(content, comment.id)}
            onCancel={onCancelReply}
          />
        ) : (
          <button
            onClick={() => onReply?.(comment.id)}
            className="flex w-fit items-center gap-1.5 px-3 py-1.5 bg-[#F5FFFE] rounded-[6px] border border-[#E2E4EA] text-[13px] font-medium text-[#101329] hover:bg-gray-50 transition-colors">
            <div className="w-[16px] h-[16px] flex items-center justify-center">
              <Icon
                name={'reply' as any}
                className="w-[11px] h-[11px] text-[#2F9C8F] stroke-[#F5FFFE] stroke-[0.7px]"
              />
            </div>
            Reply
          </button>
        )}
      </div>
      {deleteTargetId !== null && (
        <style>{`
          [data-testid="custom-modal-backdrop"] {
            background-color: rgba(0, 0, 0, 0.45) !important;
          }
        `}</style>
      )}
      {createPortal(
        <CustomModal
          open={deleteTargetId !== null}
          onClose={() => setDeleteTargetId(null)}
          maxWidth={522}
          className="!p-0 !rounded-[20px]">
          <div className="flex flex-col gap-[32px] pt-[28px] pr-[32px] pb-[28px] pl-[32px]">
            <div className="flex flex-col gap-1">
              <Text variant="16B" className="!text-[#CD2020]">
                Delete Comment?
              </Text>
              <Text variant="14M" className="text-[#151735]">
                Are you sure you want to permanently delete this comment?
              </Text>
            </div>
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="w-[123px] h-[40px] flex items-center justify-center rounded-[8px] gap-[8px] py-[12px] px-[24px] border-[1.2px] border-[#2F9C8F] text-[#2F9C8F] bg-white font-medium text-[14px] hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTargetId) onDelete?.(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="w-[123px] h-[40px] flex items-center justify-center rounded-[8px] gap-[8px] py-[12px] px-[24px] border-[1.2px] border-[#2F9C8F] bg-[#2F9C8F] text-white font-medium text-[14px] hover:bg-[#258176] transition-colors cursor-pointer">
                Confirm
              </button>
            </div>
          </div>
        </CustomModal>,
        document.body,
      )}
    </div>
  );
}
