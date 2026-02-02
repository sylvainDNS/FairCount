import { useQuery } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { balancesApi } from '../api';
import type { BalanceDetail, BalanceError } from '../types';

const VALID_BALANCE_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'GROUP_NOT_FOUND',
  'MEMBER_NOT_FOUND',
] as const satisfies readonly BalanceError[];

interface UseBalanceDetailResult {
  readonly detail: BalanceDetail | null;
  readonly isLoading: boolean;
  readonly error: BalanceError | null;
  readonly refetch: () => Promise<void>;
}

export const useBalanceDetail = (groupId: string): UseBalanceDetailResult => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.balances.myDetail(groupId),
    queryFn: async () => throwIfError(await balancesApi.getMyBalance(groupId)),
    enabled: !!groupId,
  });

  return {
    detail: data ?? null,
    isLoading,
    error: error ? toTypedError<BalanceError>(error, VALID_BALANCE_ERRORS) : null,
    // Async wrapper to simplify return type from Promise<QueryObserverResult> to Promise<void>
    refetch: async () => {
      await refetch();
    },
  };
};
