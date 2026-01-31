import { useCallback } from 'react';
import { useFetch } from '@/shared/hooks';
import { settlementsApi } from '../api';
import type {
  CreateSettlementFormData,
  SettlementError,
  SettlementResult,
  SettlementSuggestion,
} from '../types';

interface SuggestionsResponse {
  readonly suggestions: SettlementSuggestion[];
}

interface UseSettlementResult {
  readonly suggestions: SettlementSuggestion[];
  readonly isLoadingSuggestions: boolean;
  readonly suggestionsError: SettlementError | null;
  readonly create: (data: CreateSettlementFormData) => Promise<SettlementResult<{ id: string }>>;
  readonly remove: (settlementId: string) => Promise<SettlementResult>;
  readonly refreshSuggestions: () => Promise<void>;
}

export const useSettlement = (groupId: string): UseSettlementResult => {
  const { data, isLoading, error, refetch } = useFetch<SuggestionsResponse, SettlementError>(
    () => settlementsApi.getSuggested(groupId),
    [groupId],
    { skip: !groupId },
  );

  const create = useCallback(
    async (formData: CreateSettlementFormData): Promise<SettlementResult<{ id: string }>> => {
      try {
        const result = await settlementsApi.create(groupId, formData);

        if ('error' in result) {
          return { success: false, error: result.error as SettlementError };
        }

        return { success: true, data: { id: result.id } };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId],
  );

  const remove = useCallback(
    async (settlementId: string): Promise<SettlementResult> => {
      try {
        const result = await settlementsApi.delete(groupId, settlementId);

        if ('error' in result) {
          return { success: false, error: result.error as SettlementError };
        }

        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId],
  );

  return {
    suggestions: data?.suggestions ?? [],
    isLoadingSuggestions: isLoading,
    suggestionsError: error,
    create,
    remove,
    refreshSuggestions: refetch,
  };
};
