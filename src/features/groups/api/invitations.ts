import { fetchWithAuth } from '@/lib/api';
import type { InvitationDetails, InvitationInfo, PendingInvitation } from '../types';

export const invitationsApi = {
  send: async (groupId: string, email: string): Promise<{ id: string } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/invitations/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  list: async (groupId: string): Promise<InvitationInfo[]> => {
    const res = await fetchWithAuth(`/groups/${groupId}/invitations`);
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  cancel: async (
    groupId: string,
    invitationId: string,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  resend: async (
    groupId: string,
    invitationId: string,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
    return res.json();
  },

  getByToken: async (token: string): Promise<InvitationDetails | { error: string }> => {
    const res = await fetchWithAuth(`/invitations/${token}`);
    return res.json();
  },

  accept: async (token: string): Promise<{ groupId: string } | { error: string }> => {
    const res = await fetchWithAuth(`/invitations/${token}/accept`, {
      method: 'POST',
    });
    return res.json();
  },

  listPending: async (): Promise<PendingInvitation[]> => {
    const res = await fetchWithAuth('/invitations/pending');
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  decline: async (token: string): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/invitations/${token}/decline`, {
      method: 'POST',
    });
    return res.json();
  },
};
