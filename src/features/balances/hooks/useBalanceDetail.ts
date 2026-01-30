import { useCallback, useEffect, useRef, useState } from 'react';
import { balancesApi } from '../api';
import type { BalanceDetail, BalanceError } from '../types';

interface UseBalanceDetailResult {
  readonly detail: BalanceDetail | null;
  readonly isLoading: boolean;
  readonly error: BalanceError | null;
  readonly refetch: () => Promise<void>;
}

export const useBalanceDetail = (groupId: string): UseBalanceDetailResult => {
  const [detail, setDetail] = useState<BalanceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<BalanceError | null>(null);
  const currentGroupIdRef = useRef(groupId);

  const fetchDetail = useCallback(async () => {
    if (!groupId) return;

    currentGroupIdRef.current = groupId;
    setIsLoading(true);
    setError(null);

    try {
      const result = await balancesApi.getMyBalance(groupId);

      // Éviter les données stales si groupId a changé pendant la requête
      if (currentGroupIdRef.current !== groupId) return;

      if ('error' in result) {
        setError((result.error as BalanceError) || 'UNKNOWN_ERROR');
        return;
      }

      setDetail(result);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return {
    detail,
    isLoading,
    error,
    refetch: fetchDetail,
  };
};
