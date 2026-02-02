import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { useCallback, useEffect, useState } from 'react';
import { useMembers } from '@/features/members/hooks/useMembers';
import { Button } from '@/shared/components/Button';
import { TextInput } from '@/shared/components/TextInput';
import { useExpense } from '../hooks/useExpense';
import type { CreateExpenseFormData, ExpenseDetail, UpdateExpenseFormData } from '../types';
import { EXPENSE_ERROR_MESSAGES } from '../types';

interface ExpenseFormProps {
  readonly groupId: string;
  readonly currency: string;
  readonly expense?: ExpenseDetail;
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
}

interface ParticipantState {
  readonly memberId: string;
  readonly memberName: string;
  readonly selected: boolean;
  readonly customAmount: string;
  readonly useCustomAmount: boolean;
}

export const ExpenseForm = ({
  groupId,
  currency,
  expense,
  onSuccess,
  onCancel,
}: ExpenseFormProps) => {
  const { members } = useMembers(groupId);
  const { create, update } = useExpense(groupId, expense?.id);

  const [amount, setAmount] = useState(expense ? String(expense.amount / 100) : '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [date, setDate] = useState(() => {
    if (expense?.date) return expense.date;
    // Use local date to avoid timezone issues with toISOString()
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [paidBy, setPaidBy] = useState(expense?.paidBy.id ?? '');
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize participants from members
  useEffect(() => {
    if (members.length === 0) return;

    if (expense) {
      // Edit mode: use existing participants
      const participantMap = new Map(expense.participants.map((p) => [p.memberId, p]));

      setParticipants(
        members.map((m) => {
          const existing = participantMap.get(m.id);
          return {
            memberId: m.id,
            memberName: m.name + (m.isCurrentUser ? ' (vous)' : ''),
            selected: !!existing,
            customAmount: existing?.customAmount ? String(existing.customAmount / 100) : '',
            useCustomAmount:
              existing?.customAmount !== null && existing?.customAmount !== undefined,
          };
        }),
      );
    } else {
      // Create mode: select all by default
      setParticipants(
        members.map((m) => ({
          memberId: m.id,
          memberName: m.name + (m.isCurrentUser ? ' (vous)' : ''),
          selected: true,
          customAmount: '',
          useCustomAmount: false,
        })),
      );

      // Set default payer to current user
      const currentUser = members.find((m) => m.isCurrentUser);
      if (currentUser && !paidBy) {
        setPaidBy(currentUser.id);
      }
    }
  }, [members, expense, paidBy]);

  const handleParticipantToggle = useCallback((memberId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.memberId === memberId
          ? { ...p, selected: !p.selected, customAmount: '', useCustomAmount: false }
          : p,
      ),
    );
  }, []);

  const handleCustomAmountToggle = useCallback((memberId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.memberId === memberId
          ? { ...p, useCustomAmount: !p.useCustomAmount, customAmount: '' }
          : p,
      ),
    );
  }, []);

  const handleCustomAmountChange = useCallback((memberId: string, value: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.memberId === memberId ? { ...p, customAmount: value } : p)),
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const amountValue = Number.parseFloat(amount);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        setError('Veuillez entrer un montant valide');
        return;
      }

      if (!description.trim()) {
        setError('Veuillez entrer une description');
        return;
      }

      if (!paidBy) {
        setError('Veuillez sélectionner qui a payé');
        return;
      }

      const selectedParticipants = participants.filter((p) => p.selected);
      if (selectedParticipants.length === 0) {
        setError('Veuillez sélectionner au moins un participant');
        return;
      }

      // Calculate custom amounts total
      const amountInCents = Math.round(amountValue * 100);
      let customAmountsTotal = 0;

      const participantData = selectedParticipants.map((p) => {
        let customAmount: number | null = null;

        if (p.useCustomAmount && p.customAmount) {
          const customValue = Number.parseFloat(p.customAmount);
          if (!Number.isNaN(customValue) && customValue >= 0) {
            customAmount = Math.round(customValue * 100);
            customAmountsTotal += customAmount;
          }
        }

        return {
          memberId: p.memberId,
          customAmount,
        };
      });

      if (customAmountsTotal > amountInCents) {
        setError('Les montants personnalisés dépassent le total de la dépense');
        return;
      }

      setIsSubmitting(true);

      try {
        if (expense) {
          // Update
          const updateData: UpdateExpenseFormData = {
            amount: amountInCents,
            description: description.trim(),
            date,
            paidBy,
            participants: participantData,
          };

          const result = await update(updateData);

          if (!result.success) {
            setError(EXPENSE_ERROR_MESSAGES[result.error]);
            setIsSubmitting(false);
            return;
          }
        } else {
          // Create
          const createData: CreateExpenseFormData = {
            amount: amountInCents,
            description: description.trim(),
            date,
            paidBy,
            participants: participantData,
          };

          const result = await create(createData);

          if (!result.success) {
            setError(EXPENSE_ERROR_MESSAGES[result.error]);
            setIsSubmitting(false);
            return;
          }
        }

        onSuccess();
      } catch {
        setError('Une erreur est survenue');
        setIsSubmitting(false);
      }
    },
    [amount, description, date, paidBy, participants, expense, create, update, onSuccess],
  );

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Dialog.Content
            aria-labelledby="expense-form-dialog-title"
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg shadow-xl my-8"
          >
            <Dialog.Title
              id="expense-form-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white mb-4"
            >
              {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label
                  htmlFor="expense-amount"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Montant ({currency})
                </label>
                <TextInput
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="expense-description"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Description
                </label>
                <TextInput
                  id="expense-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Courses, Restaurant..."
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="expense-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Date
                </label>
                <TextInput
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Paid by */}
              <div>
                <label
                  htmlFor="expense-paid-by"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Payé par
                </label>
                <select
                  id="expense-paid-by"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.isCurrentUser ? ' (vous)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participants */}
              <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Participants
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {participants.map((p) => (
                    <div
                      key={p.memberId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <input
                        type="checkbox"
                        id={`participant-${p.memberId}`}
                        checked={p.selected}
                        onChange={() => handleParticipantToggle(p.memberId)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor={`participant-${p.memberId}`}
                        className="flex-1 text-sm text-slate-900 dark:text-white cursor-pointer"
                      >
                        {p.memberName}
                      </label>

                      {p.selected && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCustomAmountToggle(p.memberId)}
                            className={`text-xs px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
                              p.useCustomAmount
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                            disabled={isSubmitting}
                          >
                            {p.useCustomAmount ? 'Montant fixe' : 'Part équitable'}
                          </button>

                          {p.useCustomAmount && (
                            <TextInput
                              type="number"
                              min="0"
                              step="0.01"
                              value={p.customAmount}
                              onChange={(e) => handleCustomAmountChange(p.memberId, e.target.value)}
                              fullWidth={false}
                              className="w-20 px-2 py-1 text-sm"
                              placeholder="0.00"
                              disabled={isSubmitting}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Dialog.CloseTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </Dialog.CloseTrigger>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  loadingText="Enregistrement..."
                  className="flex-1"
                >
                  {expense ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
