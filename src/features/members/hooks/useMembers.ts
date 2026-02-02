import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { membersApi } from '../api';
import type {
  MemberError,
  MemberResult,
  MemberWithCoefficient,
  UpdateMemberFormData,
} from '../types';

interface UseMembersResult {
  readonly members: MemberWithCoefficient[];
  readonly isLoading: boolean;
  readonly error: MemberError | null;
  readonly updateMember: (memberId: string, data: UpdateMemberFormData) => Promise<MemberResult>;
  readonly removeMember: (memberId: string) => Promise<MemberResult>;
  readonly refresh: () => Promise<void>;
}

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'INVALID_NAME',
  'INVALID_INCOME',
  'MEMBER_NOT_FOUND',
  'CANNOT_REMOVE_SELF',
  'CANNOT_REMOVE_LAST_MEMBER',
] as const;

export const useMembers = (groupId: string): UseMembersResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<MemberWithCoefficient[]>({
    queryKey: queryKeys.members.list(groupId),
    queryFn: async () => {
      const result = await membersApi.list(groupId);
      const data = throwIfError(result);
      return data;
    },
    enabled: !!groupId,
  });

  const updateMutation = useMutation<
    { success: boolean },
    Error,
    { memberId: string; data: UpdateMemberFormData }
  >({
    mutationFn: async (params: { memberId: string; data: UpdateMemberFormData }) => {
      const result = await membersApi.update(groupId, params.memberId, params.data);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterMemberUpdate(queryClient, groupId),
  });

  const removeMutation = useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (memberId: string) => {
      const result = await membersApi.remove(groupId, memberId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterMemberRemove(queryClient, groupId),
  });

  const updateMember = async (
    memberId: string,
    formData: UpdateMemberFormData,
  ): Promise<MemberResult> => {
    try {
      await updateMutation.mutateAsync({ memberId, data: formData });
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as MemberError };
    }
  };

  const removeMember = async (memberId: string): Promise<MemberResult> => {
    try {
      await removeMutation.mutateAsync(memberId);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as MemberError };
    }
  };

  return {
    members: data ?? [],
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as MemberError) : null,
    updateMember,
    removeMember,
    refresh: async () => {
      await refetch();
    },
  };
};
