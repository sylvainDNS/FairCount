import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { balancesApi } from '../api';
import type { Balance, BalanceError } from '../types';

interface UseBalancesResult {
  readonly balances: Balance[];
  readonly myBalance: Balance | null;
  readonly totalExpenses: number;
  readonly isLoading: boolean;
  readonly isValid: boolean;
  readonly error: BalanceError | null;
  readonly refetch: () => Promise<void>;
}

export const useBalances = (groupId: string): UseBalancesResult => {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<BalanceError | null>(null);
  const currentGroupIdRef = useRef(groupId);

  const fetchBalances = useCallback(async () => {
    if (!groupId) return;

    currentGroupIdRef.current = groupId;
    setIsLoading(true);
    setError(null);

    try {
      const result = await balancesApi.list(groupId);

      // Éviter les données stales si groupId a changé pendant la requête
      if (currentGroupIdRef.current !== groupId) return;

      if ('error' in result) {
        setError((result.error as BalanceError) || 'UNKNOWN_ERROR');
        return;
      }

      setBalances([...result.balances]);
      setTotalExpenses(result.totalExpenses);
      setIsValid(result.isValid);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const myBalance = useMemo(() => balances.find((b) => b.isCurrentUser) ?? null, [balances]);

  return {
    balances,
    myBalance,
    totalExpenses,
    isLoading,
    isValid,
    error,
    refetch: fetchBalances,
  };
};
