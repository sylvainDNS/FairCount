import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { expensesApi } from '../api';
import {
  type ExpenseError,
  type ExpenseFilters,
  type ExpenseSummary,
  VALID_EXPENSE_ERRORS,
} from '../types';

interface UseExpensesResult {
  readonly expenses: ExpenseSummary[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: ExpenseError | null;
  readonly hasMore: boolean;
  readonly filters: ExpenseFilters;
  readonly setFilters: (filters: ExpenseFilters) => void;
  readonly loadMore: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

export const useExpenses = (groupId: string): UseExpensesResult => {
  const [filters, setFiltersState] = useState<ExpenseFilters>({});

  const { data, isLoading, isFetchingNextPage, error, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: queryKeys.expenses.infinite(groupId, filters),
      queryFn: async ({ pageParam }) => {
        const result = await expensesApi.list(groupId, {
          ...filters,
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

  const expenses = data?.pages.flatMap((page) => page.expenses) ?? [];

  return {
    expenses,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    error: error ? toTypedError(error, VALID_EXPENSE_ERRORS) : null,
    hasMore: hasNextPage ?? false,
    filters,
    setFilters: setFiltersState,
    loadMore: async () => {
      if (hasNextPage) await fetchNextPage();
    },
    refresh: async () => {
      await refetch();
    },
  };
};
