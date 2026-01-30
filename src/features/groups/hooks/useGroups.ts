import { useCallback, useEffect, useState } from 'react';
import { groupsApi } from '../api';
import type { CreateGroupFormData, GroupError, GroupListItem, GroupResult } from '../types';

interface UseGroupsResult {
  readonly groups: GroupListItem[];
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly createGroup: (data: CreateGroupFormData) => Promise<GroupResult<{ id: string }>>;
  readonly refresh: () => Promise<void>;
}

export const useGroups = (): UseGroupsResult => {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<GroupError | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupsApi.list();
      setGroups(data);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(
    async (data: CreateGroupFormData): Promise<GroupResult<{ id: string }>> => {
      try {
        const result = await groupsApi.create(data);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await fetchGroups();
        return { success: true, data: result };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [fetchGroups],
  );

  return {
    groups,
    isLoading,
    error,
    createGroup,
    refresh: fetchGroups,
  };
};
