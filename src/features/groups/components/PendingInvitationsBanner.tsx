import { useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import { GROUP_ERROR_MESSAGES, type GroupResult, type PendingInvitation } from '../types';

export const PendingInvitationsBanner = () => {
  const { invitations, isLoading, accept, decline } = usePendingInvitations();

  if (isLoading || invitations.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
        Invitations en attente
      </h2>
      <ul className="space-y-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onAccept={accept}
            onDecline={decline}
          />
        ))}
      </ul>
    </section>
  );
};

interface InvitationCardProps {
  readonly invitation: PendingInvitation;
  readonly onAccept: (token: string) => Promise<GroupResult<{ groupId: string }>>;
  readonly onDecline: (token: string, groupId: string) => Promise<GroupResult>;
}

const InvitationCard = ({ invitation, onAccept, onDecline }: InvitationCardProps) => {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On success, loading state is intentionally kept until the card is unmounted
  // by the parent re-render (query invalidation removes the invitation from the list).
  // This avoids a brief flash of enabled buttons between success and unmount.
  const handleAccept = useCallback(async () => {
    setLoading('accept');
    setError(null);
    const result = await onAccept(invitation.token);
    if (!result.success) {
      setError(GROUP_ERROR_MESSAGES[result.error] ?? GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
      setLoading(null);
    }
  }, [onAccept, invitation.token]);

  const handleDecline = useCallback(async () => {
    setLoading('decline');
    setError(null);
    const result = await onDecline(invitation.token, invitation.group.id);
    if (!result.success) {
      setError(GROUP_ERROR_MESSAGES[result.error] ?? GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
      setLoading(null);
    }
  }, [onDecline, invitation.token, invitation.group.id]);

  const isDisabled = loading !== null;

  return (
    <li className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
      <p className="text-sm text-slate-900 dark:text-white">
        <span className="font-medium">{invitation.inviterName}</span> vous invite à rejoindre{' '}
        <span className="font-medium">{invitation.group.name}</span>
      </p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDecline}
          disabled={isDisabled}
          loading={loading === 'decline'}
          loadingText="Déclinaison..."
          aria-label={`Décliner l'invitation au groupe ${invitation.group.name}`}
        >
          Décliner
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleAccept}
          disabled={isDisabled}
          loading={loading === 'accept'}
          loadingText="Acceptation..."
          aria-label={`Accepter l'invitation au groupe ${invitation.group.name}`}
        >
          Accepter
        </Button>
      </div>
    </li>
  );
};
