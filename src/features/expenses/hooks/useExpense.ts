import { useCallback, useEffect, useState } from 'react';
import { expensesApi } from '../api';
import type {
  CreateExpenseFormData,
  ExpenseDetail,
  ExpenseError,
  ExpenseResult,
  UpdateExpenseFormData,
} from '../types';

interface UseExpenseResult {
  readonly expense: ExpenseDetail | null;
  readonly isLoading: boolean;
  readonly error: ExpenseError | null;
  readonly create: (data: CreateExpenseFormData) => Promise<ExpenseResult<{ id: string }>>;
  readonly update: (data: UpdateExpenseFormData) => Promise<ExpenseResult>;
  readonly remove: () => Promise<ExpenseResult>;
  readonly refresh: () => Promise<void>;
}

export const useExpense = (groupId: string, expenseId?: string): UseExpenseResult => {
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ExpenseError | null>(null);

  const fetchExpense = useCallback(async () => {
    if (!groupId || !expenseId) {
      setExpense(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await expensesApi.get(groupId, expenseId);

      if ('error' in result) {
        setError(result.error as ExpenseError);
        setExpense(null);
      } else {
        setExpense(result);
      }
    } catch {
      setError('UNKNOWN_ERROR');
      setExpense(null);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, expenseId]);

  useEffect(() => {
    if (expenseId) {
      fetchExpense();
    }
  }, [expenseId, fetchExpense]);

  const create = useCallback(
    async (data: CreateExpenseFormData): Promise<ExpenseResult<{ id: string }>> => {
      try {
        const result = await expensesApi.create(groupId, data);

        if ('error' in result) {
          return { success: false, error: result.error as ExpenseError };
        }

        return { success: true, data: { id: result.id } };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId],
  );

  const update = useCallback(
    async (data: UpdateExpenseFormData): Promise<ExpenseResult> => {
      if (!expenseId) {
        return { success: false, error: 'EXPENSE_NOT_FOUND' };
      }

      try {
        const result = await expensesApi.update(groupId, expenseId, data);

        if ('error' in result) {
          return { success: false, error: result.error as ExpenseError };
        }

        await fetchExpense();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, expenseId, fetchExpense],
  );

  const remove = useCallback(async (): Promise<ExpenseResult> => {
    if (!expenseId) {
      return { success: false, error: 'EXPENSE_NOT_FOUND' };
    }

    try {
      const result = await expensesApi.delete(groupId, expenseId);

      if ('error' in result) {
        return { success: false, error: result.error as ExpenseError };
      }

      setExpense(null);
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId, expenseId]);

  return {
    expense,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchExpense,
  };
};
