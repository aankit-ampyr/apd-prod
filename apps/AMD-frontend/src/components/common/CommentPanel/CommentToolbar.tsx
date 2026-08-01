import {Icon} from '@lazarus/react-common/ui-kit';
import {useDispatch, useSelector} from 'react-redux';
import {setSearchQuery, setFilterUserId, setUnreadFilterActive} from '@/services/redux/slice/commentSlice';
import {useState, useRef, useEffect} from 'react';

interface CommentToolbarProps {
  onNewClick: () => void;
  totalCount: number;
  unreadCount: number;
  currentUserId: number;
}

export function CommentToolbar({onNewClick, totalCount, unreadCount, currentUserId}: CommentToolbarProps) {
  const dispatch = useDispatch();
  const searchQuery = useSelector((state: any) => state.comment.searchQuery);
  const isUnreadFilterActive = useSelector((state: any) => state.comment.isUnreadFilterActive);
  const filterUserId = useSelector((state: any) => state.comment.filterUserId);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-0 px-6 pt-1 pb-0 border-b border-gray-200">
      {/* Search and actions row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewClick}
          className="flex items-center justify-center gap-1.5 px-3 h-[36px] bg-white border border-[#E2E4EA] rounded-[8px] text-[12px] text-[#151735] font-medium hover:bg-gray-50 transition-colors shrink-0">
          <Icon name={'message-square' as any} className="w-4 h-4 text-[#2F9C8F]" />
          New
        </button>
        <div className="relative flex-1">
          <Icon
            name={'search' as any}
            className="w-[15px] h-[15px] text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={e => dispatch(setSearchQuery(e.target.value))}
            className="w-full pl-9 pr-4 h-[36px] bg-white border border-[#E2E4EA] rounded-[8px] font-inter font-normal text-[14px] leading-[24px] tracking-[0px] text-[#151735] placeholder:text-[#4B5563] focus:outline-none focus:border-[#2F9C8F]"
          />
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-[40px] h-[36px] relative flex items-center justify-center bg-white border border-[#E2E4EA] rounded-[8px] px-[12px] py-[6px] text-[#151735] hover:bg-gray-50 transition-colors shrink-0">
            <Icon name={'funnel' as any} className="w-[15px] h-[13px]" />
            {filterUserId && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#CD2020] rounded-full" />}
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[180px] bg-white border border-[#E2E4EA] shadow-md rounded-[8px] z-50 pt-2 pb-1 overflow-hidden">
              <div className="px-4 pb-2 pt-1 text-[12px] text-[#6B7280] font-inter border-b border-[#E2E4EA]">
                Filter by
              </div>
              <button
                onClick={() => {
                  dispatch(
                    setFilterUserId(filterUserId === currentUserId.toString() ? null : currentUserId.toString()),
                  );
                  setIsFilterOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-[14px] font-inter font-medium transition-colors ${
                  filterUserId === currentUserId.toString()
                    ? 'bg-[#EFFAF9] text-[#151735]'
                    : 'text-[#151735] hover:bg-gray-50'
                }`}>
                @ mentions me
                {filterUserId === currentUserId.toString() && (
                  <Icon name={'tick' as any} className="w-3.5 h-3.5 text-[#2F9C8F]" />
                )}
              </button>
              <button
                onClick={() => {
                  dispatch(setFilterUserId(null));
                  setIsFilterOpen(false);
                }}
                className="w-full text-left px-4 pt-3 pb-2 text-[14px] text-[#D64545] font-inter border-t border-[#E2E4EA] flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <Icon name={'rotateCcw' as any} className="w-4 h-4 text-[#D64545]" />
                Reset All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 mt-[6px] ml-2">
        <button
          onClick={() => dispatch(setUnreadFilterActive(false))}
          className={`pb-1 -mb-[1px] font-inter text-[14px] leading-[24px] tracking-[0px] transition-colors border-b-2 ${!isUnreadFilterActive ? 'border-[#2F9C8F] text-[#101329] font-semibold' : 'border-transparent text-[#4B5563] font-normal hover:text-[#101329]'}`}>
          All ({totalCount})
        </button>
        <button
          onClick={() => dispatch(setUnreadFilterActive(true))}
          className={`pb-1 -mb-[1px] font-inter text-[14px] leading-[24px] tracking-[0px] transition-colors border-b-2 ${isUnreadFilterActive ? 'border-[#2F9C8F] text-[#101329] font-semibold' : 'border-transparent text-[#4B5563] font-normal hover:text-[#101329]'}`}>
          Unread ({unreadCount})
        </button>
      </div>
    </div>
  );
}
