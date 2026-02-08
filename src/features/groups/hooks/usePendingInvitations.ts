import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { invitationsApi } from '../api/invitations';
import type { GroupError, GroupResult, PendingInvitation } from '../types';

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'INVITATION_NOT_FOUND',
  'INVITATION_EXPIRED',
  'ALREADY_MEMBER',
  'FORBIDDEN',
] as const;

interface UsePendingInvitationsResult {
  readonly invitations: PendingInvitation[];
  readonly isLoading: boolean;
  readonly accept: (token: string) => Promise<GroupResult<{ groupId: string }>>;
  readonly decline: (token: string, groupId: string) => Promise<GroupResult>;
}

export const usePendingInvitations = (): UsePendingInvitationsResult => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PendingInvitation[]>({
    queryKey: queryKeys.invitations.pending(),
    queryFn: () => invitationsApi.listPending(),
  });

  const acceptMutation = useMutation<{ groupId: string }, Error, string>({
    mutationFn: async (token: string) => {
      const result = await invitationsApi.accept(token);
      return throwIfError(result);
    },
    onSuccess: (data) => {
      invalidations.afterInvitationAccept(queryClient, data.groupId);
    },
  });

  const declineMutation = useMutation<
    { success: boolean },
    Error,
    { token: string; groupId: string }
  >({
    mutationFn: async ({ token }) => {
      const result = await invitationsApi.decline(token);
      return throwIfError(result);
    },
    onSuccess: (_, { groupId }) => {
      invalidations.afterInvitationDecline(queryClient, groupId);
    },
  });

  const accept = async (token: string): Promise<GroupResult<{ groupId: string }>> => {
    try {
      const result = await acceptMutation.mutateAsync(token);
      return { success: true, data: { groupId: result.groupId } };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const decline = async (token: string, groupId: string): Promise<GroupResult> => {
    try {
      await declineMutation.mutateAsync({ token, groupId });
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  return {
    invitations: data ?? [],
    isLoading,
    accept,
    decline,
  };
};
