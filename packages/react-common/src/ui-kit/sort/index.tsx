type SortValue = 'asc' | 'desc' | null;

interface SortProps {
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
}

export function Sort({ sort, onSortChange }: SortProps) {
  const handleClick = (clicked: 'asc' | 'desc') => {
    // Toggle off if already active, otherwise set new sort
    onSortChange(sort === clicked ? null : clicked);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 w-8 h-12">
      {/* Up triangle = desc */}
      <button
        onClick={() => handleClick('desc')}
        className="group p-0 border-0 bg-transparent cursor-pointer focus:outline-none"
        aria-label="Sort descending"
      >
        <div
          className={[
            'w-0 h-0',
            'border-l-7 border-l-transparent',
            'border-r-7 border-r-transparent',
            'border-b-8',
            'transition-colors duration-150',
            sort === 'desc'
              ? 'border-b-primary-hover'
              : 'border-b-primary-tint-1 group-hover:border-b-primary-hover group-active:border-b-primary-hover',
          ].join(' ')}
        />
      </button>

      {/* Down triangle = asc */}
      <button
        onClick={() => handleClick('asc')}
        className="group p-0 border-0 bg-transparent cursor-pointer focus:outline-none"
        aria-label="Sort ascending"
      >
        <div
          className={[
            'w-0 h-0',
            'border-l-7 border-l-transparent',
            'border-r-7 border-r-transparent',
            'border-t-8',
            'transition-colors duration-150',
            sort === 'asc'
              ? 'border-t-primary-hover'
              : 'border-t-primary-tint-1 group-hover:border-t-primary-hover group-active:border-t-primary-hover',
          ].join(' ')}
        />
      </button>
    </div>
  );
}