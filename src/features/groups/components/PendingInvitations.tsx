import { useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { useInvitations } from '../hooks/useInvitations';
import type { InvitationInfo } from '../types';

interface PendingInvitationsProps {
  readonly groupId: string;
}

export const PendingInvitations = ({ groupId }: PendingInvitationsProps) => {
  const { invitations, isLoading, cancelInvitation, resendInvitation } = useInvitations(groupId);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCancel = useCallback(
    async (invitationId: string) => {
      setLoadingId(invitationId);
      await cancelInvitation(invitationId);
      setLoadingId(null);
    },
    [cancelInvitation],
  );

  const handleResend = useCallback(
    async (invitationId: string) => {
      setLoadingId(invitationId);
      await resendInvitation(invitationId);
      setLoadingId(null);
    },
    [resendInvitation],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  // Filter to show only pending (not accepted and not expired)
  const now = new Date();
  const pendingInvitations = invitations.filter((inv) => {
    const expiresAt = new Date(inv.expiresAt);
    return expiresAt > now;
  });

  if (pendingInvitations.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune invitation en attente</p>
    );
  }

  return (
    <ul className="space-y-2">
      {pendingInvitations.map((invitation) => (
        <InvitationRow
          key={invitation.id}
          invitation={invitation}
          isLoading={loadingId === invitation.id}
          onCancel={() => handleCancel(invitation.id)}
          onResend={() => handleResend(invitation.id)}
        />
      ))}
    </ul>
  );
};

interface InvitationRowProps {
  readonly invitation: InvitationInfo;
  readonly isLoading: boolean;
  readonly onCancel: () => void;
  readonly onResend: () => void;
}

const InvitationRow = ({ invitation, isLoading, onCancel, onResend }: InvitationRowProps) => {
  const expiresAt = new Date(invitation.expiresAt);
  const isExpired = expiresAt < new Date();

  return (
    <li className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <div>
        <p className="text-sm text-slate-900 dark:text-white">{invitation.email}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isExpired ? 'Expirée' : `Expire le ${expiresAt.toLocaleDateString('fr-FR')}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResend}
          disabled={isLoading}
          aria-label={`Renvoyer l'invitation à ${invitation.email}`}
        >
          Renvoyer
        </Button>
        <Button
          type="button"
          variant="ghost-danger"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          aria-label={`Annuler l'invitation à ${invitation.email}`}
        >
          Annuler
        </Button>
      </div>
    </li>
  );
};
