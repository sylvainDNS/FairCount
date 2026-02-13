import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout, useAuth } from '@/features/auth';
import { Button, Spinner } from '@/shared/components';
import { useAcceptInvitation } from '../hooks/useAcceptInvitation';
import { GROUP_ERROR_MESSAGES } from '../types';

export const InvitePage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { invitation, isLoading, error, accept } = useAcceptInvitation(token);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);

    const result = await accept();

    if (!result.success) {
      setAccepting(false);
      const message =
        result.error === 'FORBIDDEN'
          ? 'Cette invitation est destinée à un autre compte'
          : GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR;
      setAcceptError(message);
      return;
    }

    navigate(`/groups/${result.data.groupId}`);
  }, [accept, navigate]);

  const handleLogoutAndRetry = useCallback(async () => {
    setLoggingOut(true);
    await logout();
    window.location.assign(`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
  }, [logout, token]);

  if (authLoading || isLoading || loggingOut) {
    return (
      <AuthLayout>
        <output className="flex items-center justify-center py-8" aria-label="Chargement">
          <Spinner size="lg" className="text-blue-500" />
        </output>
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
          <Button onClick={() => navigate('/login', { state: { returnTo: `/invite/${token}` } })}>
            Se connecter
          </Button>
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

  if (invitation.isForCurrentUser === false) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Invitation pour un autre compte
          </h2>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            {invitation.group.name}
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Cette invitation a été envoyée à une autre adresse e-mail que celle de votre compte
            actuel (
            <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>).
          </p>
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={handleLogoutAndRetry}>
              Se déconnecter et utiliser un autre compte
            </Button>
            <Button variant="ghost" fullWidth onClick={() => navigate('/groups')}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
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

        <Button fullWidth onClick={handleAccept} loading={accepting} loadingText="Acceptation...">
          Accepter l'invitation
        </Button>
      </div>
    </AuthLayout>
  );
};
