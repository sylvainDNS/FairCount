import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout, useAuth } from '@/features/auth';
import { useAcceptInvitation } from '../hooks/useAcceptInvitation';
import { GROUP_ERROR_MESSAGES } from '../types';

export const InvitePage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { invitation, isLoading, error, accept } = useAcceptInvitation(token);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);

    const result = await accept();

    if (!result.success) {
      setAccepting(false);
      setAcceptError(GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
      return;
    }

    navigate(`/groups/${result.data.groupId}`);
  }, [accept, navigate]);

  if (authLoading || isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </AuthLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Connexion requise
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Connectez-vous pour accepter cette invitation
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { returnTo: `/invite/${token}` } })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Se connecter
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Invitation invalide
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {GROUP_ERROR_MESSAGES[error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR}
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="text-center py-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Invitation à rejoindre
        </h2>
        <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {invitation.group.name}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {invitation.inviterName} vous invite à rejoindre ce groupe
        </p>

        {acceptError && (
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{acceptError}</p>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {accepting ? 'Acceptation...' : "Accepter l'invitation"}
        </button>
      </div>
    </AuthLayout>
  );
};
