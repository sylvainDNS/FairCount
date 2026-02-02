import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
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

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'EXPENSE_NOT_FOUND',
  'NOT_CREATOR',
  'INVALID_AMOUNT',
  'INVALID_DESCRIPTION',
  'INVALID_DATE',
  'INVALID_PAYER',
  'NO_PARTICIPANTS',
  'INVALID_PARTICIPANT',
  'CUSTOM_AMOUNTS_EXCEED_TOTAL',
] as const;

export const useExpense = (groupId: string, expenseId?: string): UseExpenseResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ExpenseDetail>({
    queryKey: queryKeys.expenses.detail(groupId, expenseId ?? ''),
    queryFn: async () => {
      const result = await expensesApi.get(groupId, expenseId ?? '');
      const data = throwIfError(result);
      return data;
    },
    enabled: !!groupId && !!expenseId,
  });

  const createMutation = useMutation<{ id: string }, Error, CreateExpenseFormData>({
    mutationFn: async (formData: CreateExpenseFormData) => {
      const result = await expensesApi.create(groupId, formData);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterExpenseCreate(queryClient, groupId),
  });

  const updateMutation = useMutation<{ success: boolean }, Error, UpdateExpenseFormData>({
    mutationFn: async (formData: UpdateExpenseFormData) => {
      if (!expenseId) throw new Error('EXPENSE_NOT_FOUND');
      const result = await expensesApi.update(groupId, expenseId, formData);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => {
      if (expenseId) invalidations.afterExpenseUpdate(queryClient, groupId, expenseId);
    },
  });

  const removeMutation = useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      if (!expenseId) throw new Error('EXPENSE_NOT_FOUND');
      const result = await expensesApi.delete(groupId, expenseId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => {
      invalidations.afterExpenseDelete(queryClient, groupId);
      queryClient.removeQueries({ queryKey: queryKeys.expenses.detail(groupId, expenseId ?? '') });
    },
  });

  const create = async (
    formData: CreateExpenseFormData,
  ): Promise<ExpenseResult<{ id: string }>> => {
    try {
      const result = await createMutation.mutateAsync(formData);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as ExpenseError };
    }
  };

  const update = async (formData: UpdateExpenseFormData): Promise<ExpenseResult> => {
    if (!expenseId) {
      return { success: false, error: 'EXPENSE_NOT_FOUND' };
    }

    try {
      await updateMutation.mutateAsync(formData);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as ExpenseError };
    }
  };

  const remove = async (): Promise<ExpenseResult> => {
    if (!expenseId) {
      return { success: false, error: 'EXPENSE_NOT_FOUND' };
    }

    try {
      await removeMutation.mutateAsync();
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as ExpenseError };
    }
  };

  return {
    expense: data ?? null,
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as ExpenseError) : null,
    create,
    update,
    remove,
    refresh: async () => {
      await refetch();
    },
  };
};
