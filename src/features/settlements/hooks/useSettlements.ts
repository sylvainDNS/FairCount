import { useCallback, useEffect, useState } from 'react';
import { settlementsApi } from '../api';
import type { SettlementError, SettlementFilter, SettlementListItem } from '../types';

interface UseSettlementsResult {
  readonly settlements: SettlementListItem[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: SettlementError | null;
  readonly hasMore: boolean;
  readonly filter: SettlementFilter;
  readonly setFilter: (filter: SettlementFilter) => void;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export const useSettlements = (groupId: string): UseSettlementsResult => {
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<SettlementError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilterState] = useState<SettlementFilter>('all');

  const fetchSettlements = useCallback(
    async (cursor?: string, append = false) => {
      if (!groupId) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await settlementsApi.list(groupId, {
          filter,
          ...(cursor ? { cursor } : {}),
          limit: 20,
        });

        if ('error' in result) {
          setError((result.error as SettlementError) || 'UNKNOWN_ERROR');
          return;
        }

        if (append) {
          setSettlements((prev) => [...prev, ...result.settlements]);
        } else {
          setSettlements([...result.settlements]);
        }

        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch {
        setError('UNKNOWN_ERROR');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [groupId, filter],
  );

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const setFilter = useCallback((newFilter: SettlementFilter) => {
    setFilterState(newFilter);
    // Reset pagination when filter changes
    setNextCursor(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    await fetchSettlements(nextCursor, true);
  }, [hasMore, isLoadingMore, nextCursor, fetchSettlements]);

  const refresh = useCallback(async () => {
    setNextCursor(null);
    await fetchSettlements();
  }, [fetchSettlements]);

  return {
    settlements,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    filter,
    setFilter,
    loadMore,
    refresh,
  };
};
