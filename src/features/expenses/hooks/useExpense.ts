import { useCallback } from 'react';
import { useFetch } from '@/shared/hooks';
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
  const { data, isLoading, error, refetch, reset } = useFetch<ExpenseDetail, ExpenseError>(
    // La fonction n'est appelée que si skip=false, donc expenseId est défini
    () => expensesApi.get(groupId, expenseId ?? ''),
    [groupId, expenseId],
    { skip: !groupId || !expenseId },
  );

  const create = useCallback(
    async (formData: CreateExpenseFormData): Promise<ExpenseResult<{ id: string }>> => {
      try {
        const result = await expensesApi.create(groupId, formData);

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
    async (formData: UpdateExpenseFormData): Promise<ExpenseResult> => {
      if (!expenseId) {
        return { success: false, error: 'EXPENSE_NOT_FOUND' };
      }

      try {
        const result = await expensesApi.update(groupId, expenseId, formData);

        if ('error' in result) {
          return { success: false, error: result.error as ExpenseError };
        }

        await refetch();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, expenseId, refetch],
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

      reset();
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId, expenseId, reset]);

  return {
    expense: data,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: refetch,
  };
};
