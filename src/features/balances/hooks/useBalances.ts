import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { balancesApi } from '../api';
import type { BalanceError, BalancesResponse } from '../types';

const VALID_BALANCE_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'GROUP_NOT_FOUND',
  'MEMBER_NOT_FOUND',
] as const satisfies readonly BalanceError[];

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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.balances.list(groupId),
    queryFn: async () => throwIfError(await balancesApi.list(groupId)),
    enabled: !!groupId,
  });

  const balances = data?.balances ?? [];
  const myBalance = useMemo(() => balances.find((b) => b.isCurrentUser) ?? null, [balances]);

  return {
    balances,
    myBalance,
    totalExpenses: data?.totalExpenses ?? 0,
    isLoading,
    isValid: data?.isValid ?? true,
    error: error ? toTypedError<BalanceError>(error, VALID_BALANCE_ERRORS) : null,
    // Async wrapper to simplify return type from Promise<QueryObserverResult> to Promise<void>
    refetch: async () => {
      await refetch();
    },
  };
};
