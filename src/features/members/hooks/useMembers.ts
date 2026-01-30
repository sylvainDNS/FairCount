import { useCallback, useEffect, useState } from 'react';
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
  const [members, setMembers] = useState<MemberWithCoefficient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MemberError | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await membersApi.list(groupId);
      setMembers(data);
    } catch {
      setError('UNKNOWN_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMember = useCallback(
    async (memberId: string, data: UpdateMemberFormData): Promise<MemberResult> => {
      try {
        const result = await membersApi.update(groupId, memberId, data);
        if ('error' in result) {
          return { success: false, error: result.error as MemberError };
        }
        await fetchMembers();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, fetchMembers],
  );

  const removeMember = useCallback(
    async (memberId: string): Promise<MemberResult> => {
      try {
        const result = await membersApi.remove(groupId, memberId);
        if ('error' in result) {
          return { success: false, error: result.error as MemberError };
        }
        await fetchMembers();
        return { success: true };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [groupId, fetchMembers],
  );

  return {
    members,
    isLoading,
    error,
    updateMember,
    removeMember,
    refresh: fetchMembers,
  };
};
