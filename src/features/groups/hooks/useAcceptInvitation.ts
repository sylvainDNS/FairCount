import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { invitationsApi } from '../api/invitations';
import type { GroupError, GroupResult, InvitationDetails } from '../types';

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'INVITATION_NOT_FOUND',
  'INVITATION_EXPIRED',
  'FORBIDDEN',
] as const;

interface UseAcceptInvitationResult {
  readonly invitation: InvitationDetails | null;
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly accept: () => Promise<GroupResult<{ groupId: string }>>;
}

export const useAcceptInvitation = (token: string): UseAcceptInvitationResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<InvitationDetails>({
    queryKey: queryKeys.invitations.byToken(token),
    queryFn: async () => {
      const result = await invitationsApi.getByToken(token);
      return throwIfError(result);
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation<{ groupId: string }, Error>({
    mutationFn: async () => {
      const result = await invitationsApi.accept(token);
      return throwIfError(result);
    },
    onSuccess: (data) => {
      invalidations.afterInvitationAccept(queryClient, data.groupId);
    },
  });

  const accept = async (): Promise<GroupResult<{ groupId: string }>> => {
    try {
      const result = await acceptMutation.mutateAsync();
      return { success: true, data: { groupId: result.groupId } };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  return {
    invitation: data ?? null,
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as GroupError) : null,
    accept,
  };
};
