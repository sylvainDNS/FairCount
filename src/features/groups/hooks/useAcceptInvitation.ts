import { useCallback, useEffect, useState } from 'react';
import { invitationsApi } from '../api/invitations';
import type { GroupError, GroupResult, InvitationDetails } from '../types';

interface UseAcceptInvitationResult {
  readonly invitation: InvitationDetails | null;
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly accept: () => Promise<GroupResult<{ groupId: string }>>;
}

export const useAcceptInvitation = (token: string): UseAcceptInvitationResult => {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GroupError | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const data = await invitationsApi.getByToken(token);
        if ('error' in data) {
          setError(data.error as GroupError);
          return;
        }
        setInvitation(data);
      } catch {
        setError('UNKNOWN_ERROR');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const accept = useCallback(async (): Promise<GroupResult<{ groupId: string }>> => {
    try {
      const result = await invitationsApi.accept(token);
      if ('error' in result) {
        return { success: false, error: result.error as GroupError };
      }
      return { success: true, data: { groupId: result.groupId } };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [token]);

  return {
    invitation,
    isLoading,
    error,
    accept,
  };
};
