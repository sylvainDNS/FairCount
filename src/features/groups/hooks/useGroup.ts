import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { groupsApi } from '../api';
import type { GroupError, GroupResult, GroupWithMembers, UpdateGroupFormData } from '../types';

interface UseGroupResult {
  readonly group: GroupWithMembers | null;
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly updateGroup: (data: UpdateGroupFormData) => Promise<GroupResult>;
  readonly archiveGroup: () => Promise<GroupResult>;
  readonly leaveGroup: () => Promise<GroupResult>;
  readonly deleteGroup: () => Promise<GroupResult>;
  readonly refresh: () => Promise<void>;
}

const VALID_ERRORS = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'INVALID_NAME',
  'NOT_AUTHORIZED',
  'GROUP_NOT_FOUND',
  'INVALID_EMAIL',
  'ALREADY_INVITED',
  'ALREADY_MEMBER',
  'INVITATION_NOT_FOUND',
  'INVITATION_EXPIRED',
  'CANNOT_LEAVE_ALONE',
] as const;

export const useGroup = (groupId: string): UseGroupResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<GroupWithMembers>({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: async () => {
      const result = await groupsApi.get(groupId);
      const data = throwIfError(result);
      return data;
    },
    enabled: !!groupId,
  });

  const updateMutation = useMutation<{ success: boolean }, Error, UpdateGroupFormData>({
    mutationFn: async (formData: UpdateGroupFormData) => {
      const result = await groupsApi.update(groupId, formData);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterGroupUpdate(queryClient, groupId),
  });

  const archiveMutation = useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const result = await groupsApi.archive(groupId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterGroupArchive(queryClient, groupId),
  });

  const leaveMutation = useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const result = await groupsApi.leave(groupId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterGroupLeave(queryClient),
  });

  const deleteMutation = useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const result = await groupsApi.delete(groupId);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterGroupDelete(queryClient),
  });

  const updateGroup = async (formData: UpdateGroupFormData): Promise<GroupResult> => {
    try {
      await updateMutation.mutateAsync(formData);
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const archiveGroup = async (): Promise<GroupResult> => {
    try {
      await archiveMutation.mutateAsync();
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const leaveGroup = async (): Promise<GroupResult> => {
    try {
      await leaveMutation.mutateAsync();
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  const deleteGroup = async (): Promise<GroupResult> => {
    try {
      await deleteMutation.mutateAsync();
      return { success: true };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  return {
    group: data ?? null,
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as GroupError) : null,
    updateGroup,
    archiveGroup,
    leaveGroup,
    deleteGroup,
    refresh: async () => {
      await refetch();
    },
  };
};
