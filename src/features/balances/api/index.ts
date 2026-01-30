import { fetchWithAuth } from '@/lib/api';
import type { BalanceDetail, BalancesResponse, GroupStats, StatsPeriod } from '../types';

export const balancesApi = {
  // Récupère tous les soldes du groupe
  list: async (groupId: string): Promise<BalancesResponse | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/balances`);
    if (!res.ok) return { error: 'UNKNOWN_ERROR' };
    return res.json();
  },

  // Récupère le détail de mon solde
  getMyBalance: async (groupId: string): Promise<BalanceDetail | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/balances/me`);
    if (!res.ok) return { error: 'UNKNOWN_ERROR' };
    return res.json();
  },

  // Récupère les statistiques du groupe
  getStats: async (
    groupId: string,
    period?: StatsPeriod,
  ): Promise<GroupStats | { error: string }> => {
    const url = period
      ? `/api/groups/${groupId}/stats?period=${period}`
      : `/api/groups/${groupId}/stats`;
    const res = await fetchWithAuth(url);
    if (!res.ok) return { error: 'UNKNOWN_ERROR' };
    return res.json();
  },
};
