import { useCallback, useEffect, useState } from 'react';
import { invitationsApi } from '../api/invitations';
import type { GroupError, GroupResult, InvitationInfo } from '../types';

interface UseInvitationsResult {
  readonly invitations: InvitationInfo[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sendInvitation: (email: string) => Promise<GroupResult>;
  readonly cancelInvitation: (invitationId: string) => Promise<GroupResult>;
  readonly resendInvitation: (invitationId: string) => Promise<GroupResult>;
  readonly refresh: () => Promise<void>;
}

export const useInvitations = (groupId: string): UseInvitationsResult => {
  const [invitations, setInvitations] = useState<InvitationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await invitationsApi.list(groupId);
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des invitations');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = useCallback(
    async (email: string): Promise<GroupResult> => {
      try {
        const result = await invitationsApi.send(groupId, email);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await fetchInvitations();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, fetchInvitations],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string): Promise<GroupResult> => {
      try {
        const result = await invitationsApi.cancel(groupId, invitationId);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await fetchInvitations();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, fetchInvitations],
  );

  const resendInvitation = useCallback(
    async (invitationId: string): Promise<GroupResult> => {
      try {
        const result = await invitationsApi.resend(groupId, invitationId);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId],
  );

  return {
    invitations,
    isLoading,
    error,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    refresh: fetchInvitations,
  };
};
