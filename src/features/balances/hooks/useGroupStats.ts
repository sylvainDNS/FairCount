import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [period, setPeriod] = useState<StatsPeriod>(initialPeriod);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<BalanceError | null>(null);
  const currentRequestRef = useRef({ groupId, period });

  const fetchStats = useCallback(async () => {
    if (!groupId) return;

    currentRequestRef.current = { groupId, period };
    setIsLoading(true);
    setError(null);

    try {
      const result = await balancesApi.getStats(groupId, period);

      // Éviter les données stales si groupId ou period a changé pendant la requête
      if (
        currentRequestRef.current.groupId !== groupId ||
        currentRequestRef.current.period !== period
      ) {
        return;
      }

      if ('error' in result) {
        setError((result.error as BalanceError) || 'UNKNOWN_ERROR');
        return;
      }

      setStats(result);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    period,
    setPeriod,
    refetch: fetchStats,
  };
};
