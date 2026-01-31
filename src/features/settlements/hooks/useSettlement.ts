import { useCallback, useEffect, useState } from 'react';
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

export const useSettlement = (groupId: string): UseSettlementResult => {
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<SettlementError | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!groupId) return;

    try {
      setIsLoadingSuggestions(true);
      setSuggestionsError(null);
      const result = await settlementsApi.getSuggested(groupId);

      if ('error' in result) {
        setSuggestionsError(result.error as SettlementError);
        setSuggestions([]);
      } else {
        setSuggestions(result.suggestions);
      }
    } catch {
      setSuggestionsError('UNKNOWN_ERROR');
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const create = useCallback(
    async (data: CreateSettlementFormData): Promise<SettlementResult<{ id: string }>> => {
      try {
        const result = await settlementsApi.create(groupId, data);

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
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    create,
    remove,
    refreshSuggestions: fetchSuggestions,
  };
};
