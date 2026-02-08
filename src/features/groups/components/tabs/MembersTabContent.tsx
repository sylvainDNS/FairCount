import { MemberList } from '@/features/members';
import { InviteForm } from '../InviteForm';
import { PendingInvitations } from '../PendingInvitations';

interface MembersTabContentProps {
  readonly groupId: string;
  readonly currency: string;
}

export const MembersTabContent = ({ groupId, currency }: MembersTabContentProps) => {
  return (
    <>
      {/* Members list */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Membres</h2>
        <MemberList groupId={groupId} currency={currency} />
      </section>

      {/* Invite form */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Inviter une personne
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <InviteForm groupId={groupId} />
        </div>
      </section>

      {/* Pending invitations */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Invitations en attente
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <PendingInvitations groupId={groupId} />
        </div>
      </section>
    </>
  );
};
