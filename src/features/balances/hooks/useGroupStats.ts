import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { balancesApi } from '../api';
import {
  type BalanceError,
  type GroupStats,
  type StatsPeriod,
  VALID_BALANCE_ERRORS,
} from '../types';

interface UseGroupStatsResult {
  readonly stats: GroupStats | null;
  readonly isLoading: boolean;
  readonly error: BalanceError | null;
  readonly period: StatsPeriod;
  readonly setPeriod: (period: StatsPeriod) => void;
  readonly refetch: () => Promise<void>;
}

export const useGroupStats = (
  groupId: string,
  initialPeriod: StatsPeriod = 'all',
): UseGroupStatsResult => {
  const [period, setPeriod] = useState<StatsPeriod>(initialPeriod);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.balances.stats(groupId, period),
    queryFn: async () => throwIfError(await balancesApi.getStats(groupId, period)),
    enabled: !!groupId,
  });

  return {
    stats: data ?? null,
    isLoading,
    error: error ? toTypedError<BalanceError>(error, VALID_BALANCE_ERRORS) : null,
    period,
    setPeriod,
    // Async wrapper to simplify return type from Promise<QueryObserverResult> to Promise<void>
    refetch: async () => {
      await refetch();
    },
  };
};
