import React, {useMemo} from 'react';
import {Icon} from '../Icon';
import {cn} from '../../utils';
import {Text} from '../Text';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({currentPage, totalPages, onPageChange, className}) => {
  const pages = useMemo(() => {
    const pageRange = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) {
        pageRange.push(i);
      }
      return pageRange;
    }
    if (currentPage === 1 || currentPage === 2) {
      return [1, 2, 3];
    }
    if (currentPage === totalPages || currentPage === totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 1, currentPage, currentPage + 1];
  }, [currentPage, totalPages]);

  return (
    <div className={cn('inline-flex items-center overflow-hidden rounded-sm border border-border bg-white', className)}>
      {/* Previous */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || totalPages === 0}
        className="flex group items-center gap-2 px-4 py-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
        <Icon name="arrow-left" size={14} className="text-text-secondary" />
        <Text variant="caption2" className="">
          Previous
        </Text>
      </button>

      {/* Page numbers */}
      {pages.map(page => (
        <button
          type="button"
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            'px-4 py-2 border-l tabular-nums border-border cursor-pointer disabled:cursor-not-allowed',
            currentPage === page && 'bg-primary-tint-2 font-medium',
          )}>
          {page}
        </button>
      ))}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages === 0}
        className="flex items-center gap-2 px-4 py-2 border-l border-border text-text-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40">
        <Text variant="caption2">Next</Text>
        <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
};
