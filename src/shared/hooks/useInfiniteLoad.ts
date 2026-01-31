import { useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether a load operation is in progress */
  isLoading: boolean;
  /** Function to call when more items should be loaded */
  onLoadMore: () => void;
  /** IntersectionObserver threshold (default: 0.1) */
  threshold?: number;
}

/**
 * Hook for implementing infinite scroll with IntersectionObserver.
 * Returns a ref to attach to the sentinel element at the bottom of the list.
 *
 * @example
 * ```tsx
 * const { expenses, hasMore, isLoadingMore, loadMore } = useExpenses(groupId);
 * const sentinelRef = useInfiniteLoad<HTMLDivElement>({
 *   hasMore,
 *   isLoading: isLoadingMore,
 *   onLoadMore: loadMore,
 * });
 *
 * return (
 *   <ul>
 *     {expenses.map(e => <li key={e.id}>{e.name}</li>)}
 *     <div ref={sentinelRef} />
 *   </ul>
 * );
 * ```
 */
export function useInfiniteLoad<T extends HTMLElement = HTMLElement>({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T | null>(null);

  // Refs to access current values without re-creating the observer
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const onLoadMoreRef = useRef(onLoadMore);

  // Sync refs with current values
  useEffect(() => {
    hasMoreRef.current = hasMore;
    isLoadingRef.current = isLoading;
    onLoadMoreRef.current = onLoadMore;
  });

  // Create observer once
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          onLoadMoreRef.current();
        }
      },
      { threshold },
    );

    const element = sentinelRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return sentinelRef;
}
