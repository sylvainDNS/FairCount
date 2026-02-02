import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { invitationsApi } from '../api/invitations';
import type { GroupError, GroupResult, InvitationInfo } from '../types';

interface UseInvitationsResult {
  readonly invitations: InvitationInfo[];
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly sendInvitation: (email: string) => Promise<GroupResult>;
  readonly cancelInvitation: (invitationId: string) => Promise<GroupResult>;
  readonly resendInvitation: (invitationId: string) => Promise<GroupResult>;
  readonly refresh: () => Promise<void>;
}

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'INVALID_EMAIL',
  'ALREADY_INVITED',
  'ALREADY_MEMBER',
  'INVITATION_NOT_FOUND',
] as const;

export const useInvitations = (groupId: string): UseInvitationsResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<InvitationInfo[]>({
    queryKey: queryKeys.invitations.list(groupId),
    queryFn: () => invitationsApi.list(groupId),
    enabled: !!groupId,
  });

  const sendMutation = useMutation<{ id: string }, Error, string>({
    mutationFn: async (email: string) => {
      const result = await invitationsApi.send(groupId, email);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterInvitationSend(queryClient, groupId),
  });

  const cancelMutation = useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (invitationId: string) => {
      const result = await invitationsApi.cancel(groupId, invitationId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterInvitationCancel(queryClient, groupId),
  });

  const resendMutation = useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (invitationId: string) => {
      const result = await invitationsApi.resend(groupId, invitationId);
      const data = throwIfError(result);
      return data;
    },
  });

  const sendInvitation = async (email: string): Promise<GroupResult> => {
    try {
      await sendMutation.mutateAsync(email);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const cancelInvitation = async (invitationId: string): Promise<GroupResult> => {
    try {
      await cancelMutation.mutateAsync(invitationId);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const resendInvitation = async (invitationId: string): Promise<GroupResult> => {
    try {
      await resendMutation.mutateAsync(invitationId);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  return {
    invitations: data ?? [],
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as GroupError) : null,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    refresh: async () => {
      await refetch();
    },
  };
};
