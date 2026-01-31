import { useState } from 'react';
import { useFetch } from '@/shared/hooks';
import { balancesApi } from '../api';
import type { BalanceError, GroupStats, StatsPeriod } from '../types';

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

  const { data, isLoading, error, refetch } = useFetch<GroupStats, BalanceError>(
    () => balancesApi.getStats(groupId, period),
    [groupId, period],
    { skip: !groupId },
  );

  return {
    stats: data,
    isLoading,
    error,
    period,
    setPeriod,
    refetch,
  };
};
