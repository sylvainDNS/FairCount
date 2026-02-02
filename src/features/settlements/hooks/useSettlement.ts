import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { settlementsApi } from '../api';
import type {
  CreateSettlementFormData,
  SettlementError,
  SettlementResult,
  SettlementSuggestion,
} from '../types';

interface UseSettlementResult {
  readonly suggestions: SettlementSuggestion[];
  readonly isLoadingSuggestions: boolean;
  readonly suggestionsError: SettlementError | null;
  readonly create: (data: CreateSettlementFormData) => Promise<SettlementResult<{ id: string }>>;
  readonly remove: (settlementId: string) => Promise<SettlementResult>;
  readonly refreshSuggestions: () => Promise<void>;
}

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'SETTLEMENT_NOT_FOUND',
  'NOT_CREATOR',
  'INVALID_AMOUNT',
  'INVALID_RECIPIENT',
  'INVALID_DATE',
  'SAME_MEMBER',
] as const;

export const useSettlement = (groupId: string): UseSettlementResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<{ suggestions: SettlementSuggestion[] }>({
    queryKey: queryKeys.settlements.suggestions(groupId),
    queryFn: async () => {
      const result = await settlementsApi.getSuggested(groupId);
      const data = throwIfError(result);
      return data;
    },
    enabled: !!groupId,
  });

  const createMutation = useMutation<{ id: string }, Error, CreateSettlementFormData>({
    mutationFn: async (formData: CreateSettlementFormData) => {
      const result = await settlementsApi.create(groupId, formData);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterSettlementCreate(queryClient, groupId),
  });

  const removeMutation = useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (settlementId: string) => {
      const result = await settlementsApi.delete(groupId, settlementId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterSettlementDelete(queryClient, groupId),
  });

  const create = async (
    formData: CreateSettlementFormData,
  ): Promise<SettlementResult<{ id: string }>> => {
    try {
      const result = await createMutation.mutateAsync(formData);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as SettlementError };
    }
  };

  const remove = async (settlementId: string): Promise<SettlementResult> => {
    try {
      await removeMutation.mutateAsync(settlementId);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as SettlementError };
    }
  };

  return {
    suggestions: data?.suggestions ?? [],
    isLoadingSuggestions: isLoading,
    suggestionsError: error ? (toTypedError(error, VALID_ERRORS) as SettlementError) : null,
    create,
    remove,
    refreshSuggestions: async () => {
      await refetch();
    },
  };
};
