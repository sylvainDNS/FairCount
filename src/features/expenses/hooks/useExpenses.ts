import { useCallback, useEffect, useState } from 'react';
import { expensesApi } from '../api';
import type { ExpenseError, ExpenseFilters, ExpenseSummary } from '../types';

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
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ExpenseError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ExpenseFilters>({});

  const fetchExpenses = useCallback(
    async (cursor?: string, append = false) => {
      if (!groupId) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await expensesApi.list(groupId, {
          ...filters,
          ...(cursor ? { cursor } : {}),
          limit: 20,
        });

        if ('error' in result) {
          setError((result.error as ExpenseError) || 'UNKNOWN_ERROR');
          return;
        }

        if (append) {
          setExpenses((prev) => [...prev, ...result.expenses]);
        } else {
          setExpenses([...result.expenses]);
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
    [groupId, filters],
  );

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const setFilters = useCallback((newFilters: ExpenseFilters) => {
    setFiltersState(newFilters);
    // Reset pagination when filters change
    setNextCursor(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    await fetchExpenses(nextCursor, true);
  }, [hasMore, isLoadingMore, nextCursor, fetchExpenses]);

  const refresh = useCallback(async () => {
    setNextCursor(null);
    await fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    filters,
    setFilters,
    loadMore,
    refresh,
  };
};
