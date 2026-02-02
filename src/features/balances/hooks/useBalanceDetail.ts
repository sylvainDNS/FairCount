import { useQuery } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { balancesApi } from '../api';
import { type BalanceDetail, type BalanceError, VALID_BALANCE_ERRORS } from '../types';

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
