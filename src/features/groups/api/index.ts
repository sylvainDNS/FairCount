import { fetchWithAuth } from '@/lib/api';
import type {
  CreateGroupFormData,
  GroupListItem,
  GroupWithMembers,
  UpdateGroupFormData,
} from '../types';

export const groupsApi = {
  list: async (): Promise<GroupListItem[] | { error: string }> => {
    const res = await fetchWithAuth('/api/groups');
    return res.json();
  },

  create: async (data: CreateGroupFormData): Promise<{ id: string } | { error: string }> => {
    const res = await fetchWithAuth('/api/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  get: async (id: string): Promise<GroupWithMembers | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${id}`);
    return res.json();
  },

  update: async (
    id: string,
    data: UpdateGroupFormData,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (id: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  archive: async (
    id: string,
  ): Promise<{ success: boolean; isArchived: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${id}/archive`, {
      method: 'POST',
    });
    return res.json();
  },

  leave: async (id: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${id}/leave`, {
      method: 'POST',
    });
    return res.json();
  },
};
