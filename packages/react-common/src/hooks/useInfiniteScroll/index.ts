import {useEffect, useRef} from 'react';

interface UseInfiniteScrollOptions {
  /**
   * Callback function to load more data
   */
  onLoadMore: () => void;
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  
  /**
   * Whether data is currently being fetched
   */
  isLoading: boolean;
  
  /**
   * Distance in pixels from the bottom to trigger loading (default: 200px)
   */
  rootMargin?: string;
  
  /**
   * Percentage of element visibility to trigger (default: 0.1)
   */
  threshold?: number;
  
  /**
   * Optional root element (default: null = viewport)
   */
  root?: Element | null;

  deps?: any[]; // Optional dependencies to re-initialize the observer
  fetchDelay?: number; // Optional delay in milliseconds before triggering fetch
}

/**
 * Custom hook for infinite scroll using IntersectionObserver
 * 
 * @example
 * ```tsx
 * const observerRef = useInfiniteScroll({
 *   onLoadMore: () => fetchNextPage(),
 *   hasMore: nextPage !== null,
 *   isLoading: loading,
 *   rootMargin: '200px',
 * });
 * 
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={observerRef} />
 *   </div>
 * );
 * ```
 */
export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '200px',
  threshold = 0.1,
  root = null,
  deps = [],
  fetchDelay = 0,
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    const currentTarget = observerTarget.current;

    // Exit if no target or no more items to load
    if (!currentTarget || !hasMore) {
      return;
    }

    // Create IntersectionObserver
    const observer = new IntersectionObserver(
      entries => {
        // Check if element is intersecting (visible in viewport)
        if (!entries[0].isIntersecting) {
          return;
        }

        // Prevent duplicate requests
        if (isFetchingRef.current || isLoading) {
          return;
        }

        // Set flag and trigger load more
        isFetchingRef.current = true;
        setTimeout(() => {
          onLoadMore();
        }, fetchDelay);
      },
      {
        root,
        rootMargin,
        threshold,
      },
    );

    // Start observing
    observer.observe(currentTarget);

    // Cleanup function
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore, rootMargin, threshold, root, ...deps]);

  // Reset fetching flag when loading completes
  useEffect(() => {
    if (!isLoading) {
      isFetchingRef.current = false;
    }
  }, [isLoading]);

  return observerTarget;
};
