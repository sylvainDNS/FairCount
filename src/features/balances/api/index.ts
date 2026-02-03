import { fetchWithAuth } from '@/lib/api';
import type { BalanceDetail, BalancesResponse, GroupStats, StatsPeriod } from '../types';

export const balancesApi = {
  list: async (groupId: string): Promise<BalancesResponse | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/balances`);
    return res.json();
  },

  getMyBalance: async (groupId: string): Promise<BalanceDetail | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/balances/me`);
    return res.json();
  },

  getStats: async (
    groupId: string,
    period?: StatsPeriod,
  ): Promise<GroupStats | { error: string }> => {
    const url = period ? `/groups/${groupId}/stats?period=${period}` : `/groups/${groupId}/stats`;
    const res = await fetchWithAuth(url);
    return res.json();
  },
};
