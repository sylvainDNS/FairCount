import { useCallback } from 'react';
import { useFetch } from '@/shared/hooks';
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

export const useMembers = (groupId: string): UseMembersResult => {
  const { data, isLoading, error, refetch } = useFetch<MemberWithCoefficient[], MemberError>(
    () => membersApi.list(groupId),
    [groupId],
    { skip: !groupId },
  );

  const updateMember = useCallback(
    async (memberId: string, formData: UpdateMemberFormData): Promise<MemberResult> => {
      try {
        const result = await membersApi.update(groupId, memberId, formData);
        if ('error' in result) {
          return { success: false, error: result.error as MemberError };
        }
        await refetch();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, refetch],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<MemberResult> => {
      try {
        const result = await membersApi.remove(groupId, memberId);
        if ('error' in result) {
          return { success: false, error: result.error as MemberError };
        }
        await refetch();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, refetch],
  );

  return {
    members: data ?? [],
    isLoading,
    error,
    updateMember,
    removeMember,
    refresh: refetch,
  };
};
