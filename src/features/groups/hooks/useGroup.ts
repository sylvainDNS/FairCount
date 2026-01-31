import { useCallback } from 'react';
import { useFetch } from '@/shared/hooks';
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

export const useGroup = (groupId: string): UseGroupResult => {
  const { data, isLoading, error, refetch } = useFetch<GroupWithMembers, GroupError>(
    () => groupsApi.get(groupId),
    [groupId],
    { skip: !groupId },
  );

  const updateGroup = useCallback(
    async (formData: UpdateGroupFormData): Promise<GroupResult> => {
      try {
        const result = await groupsApi.update(groupId, formData);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await refetch();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, refetch],
  );

  const archiveGroup = useCallback(async (): Promise<GroupResult> => {
    try {
      const result = await groupsApi.archive(groupId);
      if ('error' in result) {
        return { success: false, error: result.error as GroupError };
      }
      await refetch();
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId, refetch]);

  const leaveGroup = useCallback(async (): Promise<GroupResult> => {
    try {
      const result = await groupsApi.leave(groupId);
      if ('error' in result) {
        return { success: false, error: result.error as GroupError };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId]);

  const deleteGroup = useCallback(async (): Promise<GroupResult> => {
    try {
      const result = await groupsApi.delete(groupId);
      if ('error' in result) {
        return { success: false, error: result.error as GroupError };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId]);

  return {
    group: data,
    isLoading,
    error,
    updateGroup,
    archiveGroup,
    leaveGroup,
    deleteGroup,
    refresh: refetch,
  };
};
