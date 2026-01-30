import { useCallback, useMemo } from 'react';
import { authClient, useSession } from '../../../lib/auth-client';
import type { AuthError, ProfileFormData, User } from '../types';

type AuthResult = { success: boolean; error?: AuthError };

interface UseAuthResult {
  readonly user: User | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly login: (email: string) => Promise<AuthResult>;
  readonly logout: () => Promise<void>;
  readonly updateProfile: (data: ProfileFormData) => Promise<AuthResult>;
}

export const useAuth = (): UseAuthResult => {
  const { data: session, isPending } = useSession();

  const user = useMemo((): User | null => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      emailVerified: session.user.emailVerified,
      createdAt: new Date(session.user.createdAt),
      updatedAt: new Date(session.user.updatedAt),
    };
  }, [session]);

  const isAuthenticated = useMemo(() => !!session?.user, [session]);

  const login = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: '/',
      });

      if (result.error) {
        return { success: false, error: 'EMAIL_SEND_FAILED' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authClient.signOut();
  }, []);

  const updateProfile = useCallback(async (data: ProfileFormData): Promise<AuthResult> => {
    try {
      const result = await authClient.updateUser({
        name: data.name,
      });

      if (result.error) {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, []);

  return {
    user,
    isLoading: isPending,
    isAuthenticated,
    login,
    logout,
    updateProfile,
  };
};
