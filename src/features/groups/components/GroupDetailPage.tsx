import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BalanceList, BalanceSummary, useBalances } from '@/features/balances';
import { ExpenseList } from '@/features/expenses';
import { MemberList } from '@/features/members';
import { SettlementHistory, SettlementSuggestions } from '@/features/settlements';
import { useGroup } from '../hooks/useGroup';
import { InviteForm } from './InviteForm';
import { PendingInvitations } from './PendingInvitations';

export const GroupDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { group, isLoading, error } = useGroup(id);
  const {
    balances,
    myBalance,
    totalExpenses,
    isLoading: balancesLoading,
    isValid,
  } = useBalances(id);
  const [membersKey, setMembersKey] = useState(0);
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [showSettlementHistory, setShowSettlementHistory] = useState(false);
  const [settlementsKey, setSettlementsKey] = useState(0);

  const refreshMembers = useCallback(() => {
    setMembersKey((k) => k + 1);
  }, []);

  const refreshSettlements = useCallback(() => {
    setSettlementsKey((k) => k + 1);
  }, []);

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

      {/* Balance summary section */}
      <section className="mb-6">
        <BalanceSummary
          balance={myBalance}
          currency={group.currency}
          isLoading={balancesLoading}
          onViewDetail={() => setShowAllBalances((v) => !v)}
        />
      </section>

      {/* All balances section (collapsible) */}
      {showAllBalances && (
        <section className="mb-6">
          <BalanceList
            balances={balances}
            totalExpenses={totalExpenses}
            currency={group.currency}
            isLoading={balancesLoading}
            isValid={isValid}
          />
        </section>
      )}

      {/* Settlements section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Remboursements</h2>
          <button
            type="button"
            onClick={() => setShowSettlementHistory((v) => !v)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showSettlementHistory ? "Masquer l'historique" : "Voir l'historique"}
          </button>
        </div>

        {showSettlementHistory ? (
          <SettlementHistory key={settlementsKey} groupId={id} currency={group.currency} />
        ) : (
          <SettlementSuggestions
            key={settlementsKey}
            groupId={id}
            currency={group.currency}
            onSettlementCreated={refreshSettlements}
          />
        )}
      </section>

      {/* Expenses section */}
      <section className="mb-6">
        <ExpenseList groupId={id} currency={group.currency} />
      </section>

      {/* Members section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Membres</h2>
        <MemberList key={membersKey} groupId={id} currency={group.currency} />
      </section>

      {/* Invite section */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Inviter une personne
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <InviteForm groupId={id} onSuccess={refreshMembers} />
        </div>
      </section>

      {/* Pending invitations section */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Invitations en attente
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <PendingInvitations groupId={id} />
        </div>
      </section>
    </div>
  );
};
