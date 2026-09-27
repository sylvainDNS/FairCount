import { useQuery } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { recurringExpensesApi } from '../api';
import type { ExpenseError, RecurringExpenseSummary } from '../types';
import { VALID_EXPENSE_ERRORS } from '../types';

interface UseRecurringExpensesResult {
  readonly recurringExpenses: readonly RecurringExpenseSummary[];
  readonly isLoading: boolean;
  readonly error: ExpenseError | null;
}

export const useRecurringExpenses = (groupId: string): UseRecurringExpensesResult => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.expenses.recurring.list(groupId),
    queryFn: async () => throwIfError(await recurringExpensesApi.list(groupId)).recurringExpenses,
    enabled: !!groupId,
  });

  return {
    recurringExpenses: data ?? [],
    isLoading,
    error: error ? toTypedError(error, VALID_EXPENSE_ERRORS) : null,
  };
};
