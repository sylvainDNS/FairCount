import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { settlementsApi } from '../api';
import {
  type SettlementError,
  type SettlementFilter,
  type SettlementListItem,
  VALID_SETTLEMENT_ERRORS,
} from '../types';

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
  const [filter, setFilterState] = useState<SettlementFilter>('all');

  const { data, isLoading, isFetchingNextPage, error, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: queryKeys.settlements.infinite(groupId, filter),
      queryFn: async ({ pageParam }) => {
        const result = await settlementsApi.list(groupId, {
          filter,
          ...(pageParam !== undefined && { cursor: pageParam }),
          limit: 20,
        });
        return throwIfError(result);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
      enabled: !!groupId,
    });

  const settlements = data?.pages.flatMap((page) => page.settlements) ?? [];

  return {
    settlements,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    error: error ? toTypedError(error, VALID_SETTLEMENT_ERRORS) : null,
    hasMore: hasNextPage ?? false,
    filter,
    setFilter: setFilterState,
    loadMore: async () => {
      if (hasNextPage) await fetchNextPage();
    },
    refresh: async () => {
      await refetch();
    },
  };
};
