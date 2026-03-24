import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { useState } from 'react';
import { Button } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { useExpense } from '../hooks/useExpense';
import { EXPENSE_ERROR_MESSAGES } from '../types';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseDetailProps {
  readonly groupId: string;
  readonly expenseId: string;
  readonly currency: string;
  readonly onClose: () => void;
  readonly onEditSuccess: () => void;
  readonly onDeleteRequest: (expenseId: string) => void;
}

export const ExpenseDetail = ({
  groupId,
  expenseId,
  currency,
  onClose,
  onEditSuccess,
  onDeleteRequest,
}: ExpenseDetailProps) => {
  const { expense, isLoading, error } = useExpense(groupId, expenseId);
  const [showEditForm, setShowEditForm] = useState(false);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    onEditSuccess();
  };

  if (showEditForm && expense) {
    return (
      <ExpenseForm
        groupId={groupId}
        currency={currency}
        expense={expense}
        onSuccess={handleEditSuccess}
        onCancel={() => setShowEditForm(false)}
      />
    );
  }

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Dialog.Content
            aria-labelledby="expense-detail-dialog-title"
            className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-xl my-8"
          >
            {isLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-600 dark:text-red-400">{EXPENSE_ERROR_MESSAGES[error]}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Fermer
                </button>
              </div>
            ) : expense ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <Dialog.Title
                    id="expense-detail-dialog-title"
                    className="text-xl font-semibold text-slate-900 dark:text-white"
                  >
                    {expense.description}
                  </Dialog.Title>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {formatCurrency(expense.amount, currency)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(expense.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Info */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Payé par</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {expense.paidBy.name}
                      {expense.paidBy.isCurrentUser && (
                        <span className="text-blue-600 dark:text-blue-400 ml-1">(vous)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Ajouté par</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {expense.createdBy.name}
                      {expense.createdBy.isCurrentUser && (
                        <span className="text-blue-600 dark:text-blue-400 ml-1">(vous)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Participants breakdown */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Répartition ({expense.participants.length} participant
                    {expense.participants.length > 1 ? 's' : ''})
                  </h3>
                  <div className="space-y-2">
                    {expense.participants.map((p) => (
                      <div
                        key={p.id}
                        className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                          p.isCurrentUser
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-slate-50 dark:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-sm text-slate-900 dark:text-white">
                          {p.memberName}
                          {p.isCurrentUser && (
                            <span className="text-blue-600 dark:text-blue-400 ml-1">(vous)</span>
                          )}
                        </span>
                        <div className="text-right">
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
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                              (fixe)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 flex gap-3">
                  <Dialog.CloseTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      Fermer
                    </Button>
                  </Dialog.CloseTrigger>

                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setShowEditForm(true)}
                  >
                    Modifier
                  </Button>

                  <Button variant="ghost-danger" onClick={() => onDeleteRequest(expense.id)}>
                    Supprimer
                  </Button>
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
