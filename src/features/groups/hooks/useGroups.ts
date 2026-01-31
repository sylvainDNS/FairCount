import { useCallback } from 'react';
import { useFetch } from '@/shared/hooks';
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
  const { data, isLoading, error, refetch } = useFetch<GroupListItem[], GroupError>(
    () => groupsApi.list(),
    [],
  );

  const createGroup = useCallback(
    async (formData: CreateGroupFormData): Promise<GroupResult<{ id: string }>> => {
      try {
        const result = await groupsApi.create(formData);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await refetch();
        return { success: true, data: result };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [refetch],
  );

  return {
    groups: data ?? [],
    isLoading,
    error,
    createGroup,
    refresh: refetch,
  };
};
