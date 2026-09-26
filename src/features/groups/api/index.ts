import { fetchWithAuth } from '@/lib/api';
import type {
  CreateGroupFormData,
  GroupListItem,
  GroupWithMembers,
  JointAccountInfo,
  UpdateGroupFormData,
} from '../types';

export const groupsApi = {
  list: async (): Promise<GroupListItem[] | { error: string }> => {
    const res = await fetchWithAuth('/groups');
    return res.json();
  },

  create: async (data: CreateGroupFormData): Promise<{ id: string } | { error: string }> => {
    const res = await fetchWithAuth('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  get: async (id: string): Promise<GroupWithMembers | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${id}`);
    return res.json();
  },

  update: async (
    id: string,
    data: UpdateGroupFormData,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (id: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  archive: async (
    id: string,
  ): Promise<{ success: boolean; isArchived: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${id}/archive`, {
      method: 'POST',
    });
    return res.json();
  },

  leave: async (id: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${id}/leave`, {
      method: 'POST',
    });
    return res.json();
  },
};

export const jointAccountApi = {
  // Create, rename or reactivate the group's joint account
  set: async (
    groupId: string,
    data: { name?: string },
  ): Promise<{ jointAccount: JointAccountInfo } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/joint-account`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const body = await res.json();
    // zValidator rejects with { success: false, error: ZodError } (non-string error),
    // which throwIfError would otherwise treat as a success.
    if (!res.ok && typeof body?.error !== 'string') {
      return { error: 'UNKNOWN_ERROR' };
    }
    return body;
  },

  // Disable the group's joint account
  disable: async (groupId: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/joint-account`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
