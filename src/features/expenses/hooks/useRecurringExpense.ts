import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { toaster } from '@/shared/components';
import { recurringExpensesApi } from '../api';
import type {
  CreateRecurringExpenseData,
  CreateRecurringExpenseResult,
  ExpenseError,
  ExpenseResult,
  RecurringExpenseDetail,
  UpdateRecurringExpenseData,
} from '../types';
import { VALID_EXPENSE_ERRORS } from '../types';
import { formatDueDate } from '../utils/format-recurrence-rule';

type MutationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ExpenseError };

const run = async <T>(mutate: () => Promise<T>): Promise<MutationResult<T>> => {
  try {
    return { success: true, data: await mutate() };
  } catch (err) {
    return { success: false, error: toTypedError(err, VALID_EXPENSE_ERRORS) };
  }
};

const nextDueLabel = (nextDueDate: string) =>
  `Prochaine échéance le ${formatDueDate(nextDueDate, todayIn(RECURRENCE_TIME_ZONE, new Date()))}`;

export const useCreateRecurringExpense = (groupId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<CreateRecurringExpenseResult, Error, CreateRecurringExpenseData>({
    mutationFn: async (data) => throwIfError(await recurringExpensesApi.create(groupId, data)),
    onSuccess: () => invalidations.afterRecurringExpenseChange(queryClient, groupId),
  });

  return (data: CreateRecurringExpenseData): Promise<ExpenseResult<CreateRecurringExpenseResult>> =>
    run(() => mutation.mutateAsync(data));
};

interface UseRecurringExpenseResult {
  readonly recurrence: RecurringExpenseDetail | null;
  readonly isLoading: boolean;
  readonly error: ExpenseError | null;
  readonly update: (data: UpdateRecurringExpenseData) => Promise<MutationResult<unknown>>;
  readonly deactivate: () => Promise<MutationResult<unknown>>;
  readonly reactivate: () => Promise<MutationResult<unknown>>;
  readonly remove: () => Promise<MutationResult<unknown>>;
}

export const useRecurringExpense = (
  groupId: string,
  recurringExpenseId: string | null,
): UseRecurringExpenseResult => {
  const queryClient = useQueryClient();
  const id = recurringExpenseId ?? '';
  const onSuccess = () => invalidations.afterRecurringExpenseChange(queryClient, groupId);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.expenses.recurring.detail(groupId, id),
    queryFn: async () => throwIfError(await recurringExpensesApi.get(groupId, id)),
    enabled: !!groupId && !!recurringExpenseId,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateRecurringExpenseData) =>
      throwIfError(await recurringExpensesApi.update(groupId, id, payload)),
    onSuccess,
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => throwIfError(await recurringExpensesApi.deactivate(groupId, id)),
    onSuccess: () => {
      onSuccess();
      toaster.success({ title: 'Récurrence désactivée' });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => throwIfError(await recurringExpensesApi.reactivate(groupId, id)),
    onSuccess: (result) => {
      onSuccess();
      toaster.success({
        title: 'Récurrence réactivée',
        description: nextDueLabel(result.nextDueDate),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => throwIfError(await recurringExpensesApi.delete(groupId, id)),
    onSuccess: () => {
      onSuccess();
      queryClient.removeQueries({ queryKey: queryKeys.expenses.recurring.detail(groupId, id) });
      toaster.success({ title: 'Récurrence supprimée' });
    },
  });

  return {
    recurrence: data ?? null,
    isLoading,
    error: error ? toTypedError(error, VALID_EXPENSE_ERRORS) : null,
    update: (payload) => run(() => updateMutation.mutateAsync(payload)),
    deactivate: () => run(() => deactivateMutation.mutateAsync()),
    reactivate: () => run(() => reactivateMutation.mutateAsync()),
    remove: () => run(() => removeMutation.mutateAsync()),
  };
};
