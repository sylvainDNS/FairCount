import { fetchWithAuth } from '@/lib/api';
import type {
  CreateSettlementFormData,
  SettlementFilter,
  SettlementSuggestion,
  SettlementsPage,
} from '../types';

export const settlementsApi = {
  // GET /groups/:id/settlements
  list: async (
    groupId: string,
    params?: { filter?: SettlementFilter; cursor?: string; limit?: number },
  ): Promise<SettlementsPage | { error: string }> => {
    const searchParams = new URLSearchParams();

    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.filter && params.filter !== 'all') {
      searchParams.set('filter', params.filter);
    }

    const query = searchParams.toString();
    const url = `/groups/${groupId}/settlements${query ? `?${query}` : ''}`;

    const res = await fetchWithAuth(url);
    return res.json();
  },

  // GET /groups/:id/settlements/suggested
  getSuggested: async (
    groupId: string,
  ): Promise<{ suggestions: SettlementSuggestion[] } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/settlements/suggested`);
    return res.json();
  },

  // POST /groups/:id/settlements
  create: async (
    groupId: string,
    data: CreateSettlementFormData,
  ): Promise<{ id: string } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // DELETE /groups/:id/settlements/:settlementId
  delete: async (
    groupId: string,
    settlementId: string,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/settlements/${settlementId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
