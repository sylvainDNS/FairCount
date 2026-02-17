import { useCallback, useState } from 'react';
import { INCOME_FREQUENCY_LABELS, type IncomeFrequency } from '@/features/groups';
import { ConfirmDialog } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { useMembers } from '../hooks/useMembers';
import type { MemberWithCoefficient } from '../types';
import { IncomeForm } from './IncomeForm';
import { MemberCard } from './MemberCard';

interface MemberListProps {
  readonly groupId: string;
  readonly currency: string;
  readonly incomeFrequency: IncomeFrequency;
}

export const MemberList = ({ groupId, currency, incomeFrequency }: MemberListProps) => {
  const { members, isLoading, updateMember, removeMember } = useMembers(groupId);
  const [editingMember, setEditingMember] = useState<MemberWithCoefficient | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<MemberWithCoefficient | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleIncomeUpdate = useCallback(
    async (income: number) => {
      if (!editingMember) return;
      const result = await updateMember(editingMember.id, { income });
      if (result.success) {
        setEditingMember(null);
      }
    },
    [editingMember, updateMember],
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    await removeMember(memberToRemove.id);
    setIsRemoving(false);
    setMemberToRemove(null);
  }, [memberToRemove, removeMember]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                </div>
                <div className="text-right">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mb-1" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400">Aucun membre dans ce groupe</p>
      </div>
    );
  }

  const totalIncome = members.reduce((sum, m) => sum + m.income, 0);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header with total */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {members.length} membre{members.length > 1 ? 's' : ''}
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              Total : {formatCurrency(totalIncome, currency)}
              {INCOME_FREQUENCY_LABELS[incomeFrequency].suffix}
            </span>
          </div>
        </div>

        {/* Member list */}
        <ul>
          {members.map((member) => (
            <li
              key={member.id}
              className={memberToRemove?.id === member.id ? 'opacity-50 pointer-events-none' : ''}
            >
              <MemberCard
                member={member}
                currency={currency}
                incomeFrequency={incomeFrequency}
                onUpdateIncome={() => setEditingMember(member)}
                onRemove={!member.isCurrentUser ? () => setMemberToRemove(member) : undefined}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        open={memberToRemove !== null}
        title="Retirer un membre"
        description={`Voulez-vous vraiment retirer ${memberToRemove?.name ?? ''} du groupe ?`}
        confirmLabel="Retirer"
        loadingText="Retrait en cours..."
        onConfirm={handleRemoveConfirm}
        onCancel={() => setMemberToRemove(null)}
        isLoading={isRemoving}
      />

      {/* Income edit modal */}
      {editingMember && (
        <IncomeForm
          memberName={editingMember.name}
          currentIncome={editingMember.income}
          currency={currency}
          incomeFrequency={incomeFrequency}
          onSubmit={handleIncomeUpdate}
          onCancel={() => setEditingMember(null)}
        />
      )}
    </>
  );
};
