import { Link, useParams } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { InviteForm } from './InviteForm';
import { PendingInvitations } from './PendingInvitations';

export const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { group, isLoading, error } = useGroup(id || '');

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 dark:text-red-400">Groupe introuvable ou accès refusé</p>
        <Link
          to="/groups"
          className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block"
        >
          Retour aux groupes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          &larr; Retour aux groupes
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
            {group.description && (
              <p className="text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>
            )}
          </div>
          <Link
            to={`/groups/${id}/settings`}
            className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            Paramètres
          </Link>
        </div>
      </div>

      {/* Members section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Membres ({group.memberCount})
        </h2>
        <ul className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {group.members.map((member) => (
            <li key={member.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {member.name}
                  {member.id === group.myMemberId && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(vous)</span>
                  )}
                </p>
                {member.email && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{member.email}</p>
                )}
              </div>
              {!member.userId && (
                <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                  Non inscrit
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Invite section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Inviter une personne
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <InviteForm groupId={id || ''} />
        </div>
      </section>

      {/* Pending invitations section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Invitations en attente
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <PendingInvitations groupId={id || ''} />
        </div>
      </section>
    </div>
  );
};
