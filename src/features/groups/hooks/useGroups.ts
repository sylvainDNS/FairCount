import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { throwIfError, toTypedError } from '@/lib/api-error';
import { invalidations } from '@/lib/query-invalidations';
import { queryKeys } from '@/lib/query-keys';
import { groupsApi } from '../api';
import type { CreateGroupFormData, GroupError, GroupListItem, GroupResult } from '../types';

interface UseGroupsResult {
  readonly groups: GroupListItem[];
  readonly isLoading: boolean;
  readonly error: GroupError | null;
  readonly createGroup: (data: CreateGroupFormData) => Promise<GroupResult<{ id: string }>>;
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
] as const;

export const useGroups = (): UseGroupsResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<GroupListItem[]>({
    queryKey: queryKeys.groups.list(),
    queryFn: async () => {
      const result = await groupsApi.list();
      const data = throwIfError(result);
      return data;
    },
  });

  const createMutation = useMutation<{ id: string }, Error, CreateGroupFormData>({
    mutationFn: async (formData: CreateGroupFormData) => {
      const result = await groupsApi.create(formData);
      const data = throwIfError(result);
      return data;
    },
    onSuccess: () => invalidations.afterGroupCreate(queryClient),
  });

  const createGroup = async (
    formData: CreateGroupFormData,
  ): Promise<GroupResult<{ id: string }>> => {
    try {
      const result = await createMutation.mutateAsync(formData);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toTypedError(err, VALID_ERRORS) as GroupError };
    }
  };

  return {
    groups: data ?? [],
    isLoading,
    error: error ? (toTypedError(error, VALID_ERRORS) as GroupError) : null,
    createGroup,
    refresh: async () => {
      await refetch();
    },
  };
};
