import { useMemo } from 'react';
import { useFetch } from '@/shared/hooks';
import { balancesApi } from '../api';
import type { BalanceError, BalancesResponse } from '../types';

interface UseBalancesResult {
  readonly balances: BalancesResponse['balances'];
  readonly myBalance: BalancesResponse['balances'][number] | null;
  readonly totalExpenses: number;
  readonly isLoading: boolean;
  readonly isValid: boolean;
  readonly error: BalanceError | null;
  readonly refetch: () => Promise<void>;
}

export const useBalances = (groupId: string): UseBalancesResult => {
  const { data, isLoading, error, refetch } = useFetch<BalancesResponse, BalanceError>(
    () => balancesApi.list(groupId),
    [groupId],
    { skip: !groupId },
  );

  const balances = data?.balances ?? [];
  const myBalance = useMemo(() => balances.find((b) => b.isCurrentUser) ?? null, [balances]);

  return {
    balances,
    myBalance,
    totalExpenses: data?.totalExpenses ?? 0,
    isLoading,
    isValid: data?.isValid ?? true,
    error,
    refetch,
  };
};
