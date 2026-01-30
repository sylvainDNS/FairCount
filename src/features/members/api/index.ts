import { fetchWithAuth } from '@/lib/api';
import type { MemberWithCoefficient, UpdateMemberFormData } from '../types';

export const membersApi = {
  list: async (groupId: string): Promise<MemberWithCoefficient[]> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/members`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch members');
    }
    return data;
  },

  get: async (
    groupId: string,
    memberId: string,
  ): Promise<MemberWithCoefficient | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/members/${memberId}`);
    return res.json();
  },

  update: async (
    groupId: string,
    memberId: string,
    data: UpdateMemberFormData,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  remove: async (
    groupId: string,
    memberId: string,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  updateMe: async (
    groupId: string,
    data: UpdateMemberFormData,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/api/groups/${groupId}/members/me`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
