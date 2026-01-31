import { useFetch } from '@/shared/hooks';
import { balancesApi } from '../api';
import type { BalanceDetail, BalanceError } from '../types';

interface UseBalanceDetailResult {
  readonly detail: BalanceDetail | null;
  readonly isLoading: boolean;
  readonly error: BalanceError | null;
  readonly refetch: () => Promise<void>;
}

export const useBalanceDetail = (groupId: string): UseBalanceDetailResult => {
  const { data, isLoading, error, refetch } = useFetch<BalanceDetail, BalanceError>(
    () => balancesApi.getMyBalance(groupId),
    [groupId],
    { skip: !groupId },
  );

  return {
    detail: data,
    isLoading,
    error,
    refetch,
  };
};
