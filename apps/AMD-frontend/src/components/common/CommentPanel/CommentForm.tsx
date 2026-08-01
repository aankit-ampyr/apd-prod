import {useState, useEffect, useRef, KeyboardEvent, ChangeEvent} from 'react';
import {Icon, Text} from '@lazarus/react-common/ui-kit';
import {cn} from '@lazarus/react-common/utils';
import {useSelector} from 'react-redux';
import {getAssetTaggableUsers} from '@/services/api';

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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

interface CommentFormProps {
  onSubmit: (title: string, comment: string | any[]) => void;
  onCancel?: () => void;
  isReply?: boolean;
  isInline?: boolean;
  isEditMode?: boolean;
  initialTitle?: string;
  initialComment?: string;
  initialMentionedUsers?: any[];
}

export function CommentForm({
  onSubmit,
  onCancel,
  isReply = false,
  isInline = false,
  isEditMode = false,
  initialTitle = '',
  initialComment = '',
  initialMentionedUsers = [],
}: CommentFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [comment, setComment] = useState(initialComment);
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [isCommentTouched, setIsCommentTouched] = useState(false);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionOptions, setMentionOptions] = useState<any[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<any[]>(initialMentionedUsers);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number>(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef1 = useRef<HTMLDivElement>(null);
  const backdropRef2 = useRef<HTMLDivElement>(null);

  const activeContext = useSelector((state: any) => state.comment?.activeContext);
  const assetId = activeContext?.context_asset_id;
  const currentUser = useSelector((state: any) => state.auth?.authData);

  useEffect(() => {
    let active = true;
    if (showMentions && assetId !== undefined) {
      setIsSearchingMentions(true);
      const fetchUsers = async () => {
        try {
          const res: any = await getAssetTaggableUsers(assetId, {
            search: mentionSearch,
            context_module: activeContext?.context_module,
          });
          if (active && res?.data?.data?.users) {
            let users = res.data.data.users;

            // Filter out current user
            if (currentUser?.id || currentUser?.user_id) {
              const currentUserId = String(currentUser.id || currentUser.user_id);
              users = users.filter((u: any) => String(u.id) !== currentUserId);
            }

            if (mentionSearch) {
              const lowerSearch = mentionSearch.toLowerCase();
              users = users.filter((u: any) => (u.name || '').toLowerCase().includes(lowerSearch));

              users.sort((a: any, b: any) => {
                const aName = (a.name || '').toLowerCase();
                const bName = (b.name || '').toLowerCase();
                const aStarts = aName.startsWith(lowerSearch);
                const bStarts = bName.startsWith(lowerSearch);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return aName.localeCompare(bName);
              });
            }

            setMentionOptions(users.slice(0, 3));
            setFocusedOptionIndex(0);
          } else if (active) {
            setMentionOptions([]);
          }
        } catch (err) {
          console.error('Error fetching users for mentions:', err);
          if (active) setMentionOptions([]);
        } finally {
          if (active) setIsSearchingMentions(false);
        }
      };
      const debounceId = setTimeout(fetchUsers, 300);
      return () => {
        active = false;
        clearTimeout(debounceId);
      };
    } else {
      setMentionOptions([]);
      setIsSearchingMentions(false);
    }
  }, [mentionSearch, showMentions, assetId]);

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setComment(val);
    setIsCommentTouched(true);

    const pos = e.target.selectionStart;
    setCursorPosition(pos);

    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/(?:^|\s)@([^@\s]*)$/);

    if (match) {
      const searchStr = match[1];
      setMentionStartPos(pos - searchStr.length - 1);
      setMentionSearch(searchStr);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (user: any) => {
    const textBefore = comment.slice(0, mentionStartPos);
    const textAfter = comment.slice(cursorPosition);
    const insertText = `@${user.name} `;

    setComment(textBefore + insertText + textAfter);
    setShowMentions(false);

    setMentionedUsers(prev => {
      if (!prev.find(u => u.id === user.id)) {
        return [...prev, user];
      }
      return prev;
    });

    if (textareaRef.current) {
      textareaRef.current.focus();
      const newPos = mentionStartPos + insertText.length;
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedOptionIndex(prev => (prev + 1) % mentionOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedOptionIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectMention(mentionOptions[focusedOptionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    }
  };

  const titleError = (() => {
    if (!isTitleTouched) return null;
    if (title.trim() === '') return 'Title cannot be empty.';
    if (title.trim().length > 50) return 'Title cannot exceed 50 characters.';
    if (title.trim().length < 3) return 'Title must be at least 3 characters.';
    const allowedRegex = /^[a-zA-Z0-9\s\-_/&():,.?!%£$€'"]*$/;
    if (!allowedRegex.test(title)) return 'Special characters are not allowed.';
    return null;
  })();
  const commentError = (() => {
    if (!isCommentTouched) return null;
    if (comment.trim() === '') return isReply ? 'Reply cannot be empty.' : 'Comment cannot be empty.';
    if (isReply && comment.trim().length < 2) return 'Reply must be at least 2 characters.';
    if (!isReply && comment.trim().length < 5) return 'Comment must be at least 5 characters.';
    if (comment.trim().length > 3000)
      return isReply ? 'Reply cannot exceed 3000 characters.' : 'Comment cannot exceed 3000 characters.';
    const allowedRegex = /^[a-zA-Z0-9\s\-_/\\()[\]{}:;,.?!%£$€+=<>'"@&]*$/;
    if (!allowedRegex.test(comment)) return 'Special characters are not allowed.';
    return null;
  })();

  const parseCommentIntoBlocks = (text: string) => {
    if (mentionedUsers.length === 0) return text;

    const sortedMentions = [...mentionedUsers].sort((a, b) => b.name.length - a.name.length);
    const namesRegex = sortedMentions.map(u => `@${u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|');
    if (!namesRegex) return text;

    const regex = new RegExp(`(${namesRegex})`, 'g');
    const parts = text.split(regex);

    const blocks: any[] = [];
    for (const part of parts) {
      if (!part) continue;

      const matchedUser = sortedMentions.find(u => `@${u.name}` === part);
      if (matchedUser) {
        blocks.push({
          type: 'mention',
          user_id: matchedUser.id,
          user: {id: matchedUser.id, name: matchedUser.name},
        });
      } else {
        if (blocks.length > 0 && blocks[blocks.length - 1].type === 'text') {
          blocks[blocks.length - 1].text += part;
        } else {
          blocks.push({type: 'text', text: part});
        }
      }
    }

    return blocks;
  };

  const renderHighlightedComment = () => {
    const blocks = parseCommentIntoBlocks(comment);
    if (typeof blocks === 'string') {
      return blocks;
    }
    return blocks.map((block, i) => {
      if (block.type === 'mention') {
        return (
          <span key={i} className="text-[#009381] font-normal">
            @{block.user.name}
          </span>
        );
      }
      return <span key={i}>{block.text}</span>;
    });
  };

  const handleSubmit = () => {
    const parsedComment = parseCommentIntoBlocks(comment);

    if (isReply) {
      if (comment.trim().length >= 2) {
        onSubmit('Reply', parsedComment);
        setComment('');
        setMentionedUsers([]);
      }
      return;
    }

    setIsTitleTouched(true);
    setIsCommentTouched(true);

    if (title.trim().length >= 3 && title.trim().length <= 50 && comment.trim().length >= 5) {
      onSubmit(title.trim(), parsedComment);
      setTitle('');
      setComment('');
      setMentionedUsers([]);
      setIsTitleTouched(false);
      setIsCommentTouched(false);
    }
  };

  const MentionsDropdown = () => {
    if (!showMentions) return null;

    if (isSearchingMentions) {
      return (
        <div className="absolute left-0 top-full mt-1 w-full max-w-sm bg-[#ffffff] rounded-[6px] shadow-lg border border-gray-100 z-[100] overflow-hidden p-3 text-center text-[13px] text-gray-500 font-inter">
          Searching users...
        </div>
      );
    }

    if (mentionOptions.length === 0) {
      return (
        <div className="absolute left-0 top-full mt-1 w-full max-w-sm bg-[#ffffff] rounded-[6px] shadow-lg border border-gray-100 z-[100] overflow-hidden p-3 text-center text-[13px] text-gray-500 font-inter">
          No users found.
        </div>
      );
    }

    return (
      <div className="absolute left-0 top-full mt-1 w-full max-w-sm bg-[#ffffff] rounded-[6px] shadow-lg border border-gray-100 z-[100] overflow-hidden">
        {mentionOptions.map((user, index) => {
          const initials = getInitials(user.name);
          const bg = getAvatarColor(user.name);
          const isFocused = index === focusedOptionIndex;
          return (
            <div
              key={user.id}
              onClick={() => handleSelectMention(user)}
              onMouseEnter={() => setFocusedOptionIndex(index)}
              className={cn(
                'w-full px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-primary-tint-1/10',
                isFocused && 'bg-primary-tint-1/10',
              )}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                  style={{backgroundColor: bg}}>
                  {initials}
                </div>
                <span
                  className={cn(
                    'block truncate text-text-primary flex-1 min-w-0',
                    isFocused ? 'font-InterMedium!' : 'font-InterRegular!',
                  )}>
                  {user.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isReply) {
    return (
      <div className={cn('flex flex-col', isInline ? 'w-[calc(100%-2px)]' : 'w-[309px]')}>
        <div
          className={cn(
            'h-[122px] border rounded-[8px] p-3 mt-3 transition-colors relative',
            commentError
              ? 'border-[#EC8C85] bg-[#FFF9F3]'
              : isCommentTouched
                ? 'border-gray-900 bg-[#F5FFFE]'
                : 'border-gray-200 bg-[#F5FFFE]',
          )}>
          <div className="relative w-full h-[50px]">
            <div
              className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words font-inter font-normal text-[12px] leading-[22px] tracking-[0px] text-[#101329] overflow-hidden"
              ref={backdropRef1}>
              {renderHighlightedComment()}
              {comment.endsWith('\n') ? <br /> : null}
            </div>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={handleTextareaChange}
              onScroll={e => {
                if (backdropRef1.current) backdropRef1.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={handleKeyDown}
              placeholder={'Reply (Use @ to mention)'}
              className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] absolute inset-0 w-full resize-none h-[50px] outline-none font-inter font-normal text-[12px] leading-[22px] tracking-[0px] text-transparent caret-black bg-transparent placeholder:text-[#6B7280] placeholder:font-medium placeholder:text-[12px] placeholder:leading-[26px] overflow-y-auto"
              autoFocus
              spellCheck={false}
            />
          </div>
          <MentionsDropdown />
          <div className="absolute bottom-3 right-3 flex items-center gap-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-[14px] font-medium text-[#151735] hover:text-gray-600 transition-colors">
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={comment.trim().length === 0 || !!commentError}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F9C8F] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#258176] transition-colors disabled:bg-[#8DC9C2] disabled:opacity-100 disabled:cursor-not-allowed">
              <Icon name={'send' as any} className="w-4 h-4" />
              {isEditMode ? 'Save' : 'Reply'}
            </button>
          </div>
        </div>
        {commentError && (
          <Text variant="12R" className="!text-[#CD2020] mt-1.5">
            {commentError}
          </Text>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col shrink-0', !isInline ? 'px-[20px] pb-[20px] pt-[12px]' : '')}>
      <div className="mb-4">
        <label className="flex items-center gap-2 mb-2">
          <Icon name={'text-box' as any} className="w-[18px] h-[18px]" />
          <span className="text-[15px] font-medium text-[#151735]">
            Title <span className="!text-[#CD2020]">*</span>
          </span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              setIsTitleTouched(true);
            }}
            placeholder="Enter a short title (50 characters)"
            className={cn(
              'w-full',
              'block px-3 pr-10 border rounded-lg focus:outline-none focus:ring-1 text-[14px] placeholder:text-[14px] placeholder-[#6B7280] h-[40px]',
              titleError
                ? 'bg-white border-[#EC8C85] focus:ring-[#EC8C85] text-[#151735]'
                : 'bg-white border-gray-300 focus:ring-[#2F9C8F] focus:border-[#2F9C8F]',
            )}
          />
          {titleError && (
            <Icon
              name={'circle-info' as any}
              className="w-4 h-4 text-[#CD2020] absolute right-3 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
        {titleError && (
          <Text variant="12R" className="!text-[#CD2020] mt-1.5">
            {titleError}
          </Text>
        )}
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 mb-2">
          <Icon name={'message' as any} className="w-3 h-3 mt-0.5" />
          <span className="text-[15px] font-medium text-[#151735]">
            Comment <span className="!text-[#CD2020]">*</span>
          </span>
        </label>
        <div className="relative">
          <div
            className={cn(
              'w-full',
              'absolute inset-0 h-[113px] pl-3 pr-10 py-2 border border-transparent bg-white rounded-lg font-inter font-normal text-[14px] leading-[22px] tracking-[0px] pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-[#151735]',
            )}
            ref={backdropRef2}>
            {renderHighlightedComment()}
            {comment.endsWith('\n') ? <br /> : null}
          </div>
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={handleTextareaChange}
            onScroll={e => {
              if (backdropRef2.current) backdropRef2.current.scrollTop = e.currentTarget.scrollTop;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Write your comment here (Use @ to mention)..."
            spellCheck={false}
            className={cn(
              'w-full',
              '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] block h-[113px] pl-3 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-1 resize-none font-inter font-normal text-[14px] leading-[22px] tracking-[0px] text-transparent caret-black bg-transparent placeholder-[#6B7280] placeholder:text-[14px] relative z-10',
              commentError
                ? 'border-[#EC8C85] focus:ring-[#EC8C85]'
                : 'border-gray-300 focus:ring-[#2F9C8F] focus:border-[#2F9C8F]',
            )}
          />
          <MentionsDropdown />
          {commentError && (
            <Icon
              name={'circle-info' as any}
              className="w-4 h-4 text-[#CD2020] absolute right-3 top-3 z-20 pointer-events-none"
            />
          )}
        </div>
        {commentError && (
          <Text variant="12R" className="!text-[#CD2020] mt-1.5">
            {commentError}
          </Text>
        )}
      </div>

      <div className="flex justify-end items-center gap-4">
        <button
          onClick={onCancel}
          className="text-[14px] font-normal text-[#151735] hover:text-gray-600 transition-colors cursor-pointer">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={title.trim().length === 0 || comment.trim().length === 0 || !!titleError || !!commentError}
          className="flex justify-center items-center gap-2 w-[161px] h-[32px] bg-[var(--Primary-Color,#2F9C8F)] text-[#ffffff] text-[14px] font-medium rounded-[6px] hover:bg-[#258176] transition-colors disabled:bg-[#8DC9C2] disabled:opacity-100 disabled:cursor-not-allowed">
          <Icon name={'send' as any} className="w-4 h-4" />
          {isEditMode ? 'Save' : 'Post Comment'}
        </button>
      </div>
    </div>
  );
}
