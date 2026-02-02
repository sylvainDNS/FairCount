import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { TextInput } from '@/shared/components/TextInput';

interface IncomeFormProps {
  readonly memberName: string;
  readonly currentIncome: number;
  readonly currency: string;
  readonly onSubmit: (income: number) => Promise<void>;
  readonly onCancel: () => void;
}

export const IncomeForm = ({
  memberName,
  currentIncome,
  currency,
  onSubmit,
  onCancel,
}: IncomeFormProps) => {
  const [income, setIncome] = useState(String(currentIncome / 100));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const incomeValue = parseFloat(income);

      if (Number.isNaN(incomeValue) || incomeValue < 0) {
        setError('Veuillez entrer un montant valide');
        return;
      }

      const incomeInCents = Math.round(incomeValue * 100);
      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(incomeInCents);
      } catch {
        setError('Une erreur est survenue');
        setIsSubmitting(false);
      }
    },
    [income, onSubmit],
  );

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <Dialog.Content
            aria-labelledby="income-form-dialog-title"
            className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <Dialog.Title
              id="income-form-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white mb-2"
            >
              Modifier le revenu de {memberName}
            </Dialog.Title>

            <Dialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Ce montant sera visible par tous les membres du groupe pour garantir la transparence
              du calcul des parts.
            </Dialog.Description>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="income"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Revenu mensuel net ({currency})
                </label>
                <TextInput
                  id="income"
                  type="number"
                  min="0"
                  step="0.01"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="Ex: 2500.00"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
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
                  Enregistrer
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
