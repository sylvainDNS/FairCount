import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { type ReactNode, useState } from 'react';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { Badge, Button, ConfirmDialog, toaster } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { useRecurringExpense } from '../hooks/useRecurringExpense';
import { EXPENSE_ERROR_MESSAGES, type RecurringExpenseDetail } from '../types';
import {
  formatDueDate,
  formatPausedReason,
  formatRecurrenceRule,
} from '../utils/format-recurrence-rule';
import { ExpenseForm } from './ExpenseForm';
import { RepeatIcon } from './RepeatIcon';

interface RecurrenceDetailProps {
  readonly groupId: string;
  readonly recurringExpenseId: string;
  readonly currency: string;
  readonly onClose: () => void;
}

const pauseFix = (recurrence: RecurringExpenseDetail): string =>
  recurrence.pausedReason === 'no_active_participant'
    ? 'Ajoutez au moins une personne participante pour relancer la récurrence.'
    : 'Choisissez une autre personne qui paie pour relancer la récurrence.';

const InfoRow = ({ label, children }: { readonly label: string; readonly children: ReactNode }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-slate-600 dark:text-slate-400">{label}</span>
    <span className="text-right font-medium text-slate-900 dark:text-white">{children}</span>
  </div>
);

export const RecurrenceDetail = ({
  groupId,
  recurringExpenseId,
  currency,
  onClose,
}: RecurrenceDetailProps) => {
  const { recurrence, isLoading, error, deactivate, reactivate, remove } = useRecurringExpense(
    groupId,
    recurringExpenseId,
  );
  const today = todayIn(RECURRENCE_TIME_ZONE, new Date());
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState<'toggle' | 'delete' | null>(null);

  const runAction = async (
    kind: 'toggle' | 'delete',
    action: () => Promise<{ readonly success: boolean }>,
  ) => {
    setPending(kind);
    const result = await action();
    setPending(null);
    if (!result.success) {
      toaster.error({ title: EXPENSE_ERROR_MESSAGES.UNKNOWN_ERROR });
      return false;
    }
    return true;
  };

  const handleDelete = async () => {
    if (await runAction('delete', remove)) {
      setConfirmDelete(false);
      onClose();
    }
  };

  if (showEditForm && recurrence) {
    return (
      <ExpenseForm
        groupId={groupId}
        currency={currency}
        recurrence={recurrence}
        onSuccess={() => setShowEditForm(false)}
        onCancel={() => setShowEditForm(false)}
      />
    );
  }

  // Replaces the detail while deciding (same pattern as expense deletion):
  // two stacked modals would hide the confirmation from assistive tech
  if (confirmDelete) {
    return (
      <ConfirmDialog
        open
        title="Supprimer la récurrence"
        description="Aucune nouvelle dépense ne sera ajoutée. Les dépenses déjà ajoutées restent dans la liste."
        confirmLabel="Supprimer"
        loadingText="Suppression..."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={pending === 'delete'}
      />
    );
  }

  const isDisabled = recurrence?.status === 'disabled';

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Height capped to the viewport: the header and actions stay put, the body scrolls */}
          <Dialog.Content
            aria-labelledby="recurrence-detail-dialog-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900"
          >
            {isLoading ? (
              <div className="animate-pulse space-y-4 p-6">
                <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-32 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ) : error || !recurrence ? (
              <div className="p-6 text-center">
                <Dialog.Title className="sr-only">Récurrence</Dialog.Title>
                <p className="text-red-600 dark:text-red-400">
                  {EXPENSE_ERROR_MESSAGES[error ?? 'RECURRING_EXPENSE_NOT_FOUND']}
                </p>
                <Dialog.CloseTrigger asChild>
                  <Button variant="outline" className="mt-4">
                    Fermer
                  </Button>
                </Dialog.CloseTrigger>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                  <Dialog.Title
                    id="recurrence-detail-dialog-title"
                    className="text-xl font-semibold text-slate-900 dark:text-white"
                  >
                    {recurrence.description}
                  </Dialog.Title>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(recurrence.amount, currency)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <RepeatIcon className="text-slate-500 dark:text-slate-400" />
                    <span>{formatRecurrenceRule(recurrence.rule)}</span>
                    {recurrence.status === 'paused' && (
                      <Badge variant="warning" size="sm">
                        À revoir
                      </Badge>
                    )}
                    {recurrence.status === 'disabled' && <Badge size="sm">Désactivée</Badge>}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {/* Pause explanation: information, not an alarm */}
                  {recurrence.status === 'paused' && recurrence.pausedReason && (
                    <div className="px-6 pt-6">
                      <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {formatPausedReason(recurrence.pausedReason, recurrence.paidBy)}.{' '}
                        {pauseFix(recurrence)}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-3 border-b border-slate-200 p-6 dark:border-slate-800">
                    {recurrence.status === 'active' && recurrence.nextDueDate && (
                      <InfoRow label="Prochaine échéance">
                        {formatDueDate(recurrence.nextDueDate, today, { withYear: true })}
                      </InfoRow>
                    )}
                    <InfoRow label="Payé par">
                      {recurrence.paidBy.name}
                      {recurrence.paidBy.isJointAccount && (
                        <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                          (compte commun)
                        </span>
                      )}
                    </InfoRow>
                    <InfoRow label="Créée par">
                      {recurrence.createdBy.name}
                      {recurrence.createdBy.isCurrentUser && (
                        <span className="ml-1 text-blue-600 dark:text-blue-400">(vous)</span>
                      )}
                    </InfoRow>
                  </div>

                  {/* Split */}
                  <div className="border-b border-slate-200 p-6 dark:border-slate-800">
                    <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Répartition ({recurrence.participants.length} participant
                      {recurrence.participants.length > 1 ? 's' : ''})
                    </h3>
                    <ul className="space-y-2">
                      {recurrence.participants.map((p) => (
                        <li
                          key={p.memberId}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            p.isCurrentUser
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              p.isActive
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {p.memberName}
                            {p.isCurrentUser && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400">(vous)</span>
                            )}
                            {!p.isActive && <span className="ml-1">(a quitté le groupe)</span>}
                          </span>
                          <span className="text-right">
                            <span
                              className={`text-sm font-medium ${
                                p.isCurrentUser
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {formatCurrency(p.calculatedShare, currency)}
                            </span>
                            {p.customAmount !== null && (
                              <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                                (fixe)
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions: the destructive one sits apart from the primary action */}
                <div className="space-y-4 p-6">
                  <div className="flex gap-3">
                    <Dialog.CloseTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Fermer
                      </Button>
                    </Dialog.CloseTrigger>
                    {isDisabled ? (
                      <Button
                        className="flex-1"
                        loading={pending === 'toggle'}
                        loadingText="Réactivation..."
                        onClick={() => runAction('toggle', reactivate)}
                      >
                        Réactiver
                      </Button>
                    ) : (
                      <Button className="flex-1" onClick={() => setShowEditForm(true)}>
                        Modifier
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                    {isDisabled ? (
                      <Button variant="ghost" size="sm" onClick={() => setShowEditForm(true)}>
                        Modifier
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={pending === 'toggle'}
                        loadingText="Désactivation..."
                        onClick={() => runAction('toggle', deactivate)}
                      >
                        Désactiver
                      </Button>
                    )}
                    <Button variant="ghost-danger" size="sm" onClick={() => setConfirmDelete(true)}>
                      Supprimer la récurrence
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
