import { useCallback, useEffect, useState } from 'react';
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
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GroupError | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupsApi.get(groupId);
      if ('error' in data) {
        setError(data.error as GroupError);
        return;
      }
      setGroup(data);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const updateGroup = useCallback(
    async (data: UpdateGroupFormData): Promise<GroupResult> => {
      try {
        const result = await groupsApi.update(groupId, data);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await fetchGroup();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, fetchGroup],
  );

  const archiveGroup = useCallback(async (): Promise<GroupResult> => {
    try {
      const result = await groupsApi.archive(groupId);
      if ('error' in result) {
        return { success: false, error: result.error as GroupError };
      }
      await fetchGroup();
      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, [groupId, fetchGroup]);

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
    group,
    isLoading,
    error,
    updateGroup,
    archiveGroup,
    leaveGroup,
    deleteGroup,
    refresh: fetchGroup,
  };
};
