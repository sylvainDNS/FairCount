import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { useCallback, useEffect, useState } from 'react';
import { useMembers } from '@/features/members/hooks/useMembers';
import { Button } from '@/shared/components/Button';
import { TextInput } from '@/shared/components/TextInput';
import { useSettlement } from '../hooks/useSettlement';
import type { SettlementSuggestion } from '../types';
import { SETTLEMENT_ERROR_MESSAGES } from '../types';

interface SettlementFormProps {
  readonly groupId: string;
  readonly currency: string;
  readonly suggestion?: SettlementSuggestion;
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
}

export const SettlementForm = ({
  groupId,
  currency,
  suggestion,
  onSuccess,
  onCancel,
}: SettlementFormProps) => {
  const { members } = useMembers(groupId);
  const { create } = useSettlement(groupId);

  const [amount, setAmount] = useState(() => {
    if (suggestion) return String(suggestion.amount / 100);
    return '';
  });
  const [toMember, setToMember] = useState(suggestion?.to.id ?? '');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find current member
  const currentMember = members.find((m) => m.isCurrentUser);

  // Filter other members (exclude self)
  const otherMembers = members.filter((m) => !m.isCurrentUser);

  // If suggestion provided, update fields
  useEffect(() => {
    if (suggestion) {
      setAmount(String(suggestion.amount / 100));
      setToMember(suggestion.to.id);
    }
  }, [suggestion]);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setError(null);

      // Amount validation
      const amountValue = Number.parseFloat(amount);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        setError('Veuillez entrer un montant valide');
        return;
      }

      // Recipient validation
      if (!toMember) {
        setError('Veuillez sélectionner un destinataire');
        return;
      }

      // Date validation
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError('Veuillez entrer une date valide');
        return;
      }

      setIsSubmitting(true);

      try {
        const amountInCents = Math.round(amountValue * 100);

        const result = await create({
          toMember,
          amount: amountInCents,
          date,
        });

        if (!result.success) {
          setError(SETTLEMENT_ERROR_MESSAGES[result.error]);
          setIsSubmitting(false);
          return;
        }

        onSuccess();
      } catch {
        setError('Une erreur est survenue');
        setIsSubmitting(false);
      }
    },
    [amount, toMember, date, create, onSuccess],
  );

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Dialog.Content className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl my-8">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Enregistrer un remboursement
            </Dialog.Title>

            {currentMember && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                De{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {currentMember.name}
                </span>{' '}
                vers...
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Recipient */}
              <div>
                <label
                  htmlFor="settlement-to"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Destinataire
                </label>
                <select
                  id="settlement-to"
                  value={toMember}
                  onChange={(e) => setToMember(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Sélectionner un membre</option>
                  {otherMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="settlement-amount"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Montant ({currency})
                </label>
                <TextInput
                  id="settlement-amount"
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

              {/* Settlement date */}
              <div>
                <label
                  htmlFor="settlement-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Date
                </label>
                <TextInput
                  id="settlement-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
