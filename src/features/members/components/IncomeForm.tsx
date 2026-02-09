import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { INCOME_FREQUENCY_LABELS, type IncomeFrequency } from '@/features/groups';
import { type IncomeFormValues, incomeSchema } from '@/lib/schemas/income.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';

interface IncomeFormProps {
  readonly memberName: string;
  readonly currentIncome: number;
  readonly currency: string;
  readonly incomeFrequency: IncomeFrequency;
  readonly onSubmit: (income: number) => Promise<void>;
  readonly onCancel: () => void;
}

export const IncomeForm = ({
  memberName,
  currentIncome,
  currency,
  incomeFrequency,
  onSubmit,
  onCancel,
}: IncomeFormProps) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { income: String(currentIncome / 100) },
  });

  const onFormSubmit = async (data: IncomeFormValues) => {
    const incomeInCents = Math.round(Number.parseFloat(data.income) * 100);

    try {
      await onSubmit(incomeInCents);
    } catch {
      setError('root', { message: 'Une erreur est survenue' });
    }
  };

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 z-50 overflow-y-auto sm:flex sm:items-center sm:justify-center sm:p-4">
          <Dialog.Content
            aria-labelledby="income-form-dialog-title"
            className="bg-white dark:bg-slate-900 p-6 min-h-full sm:min-h-0 sm:rounded-xl sm:w-full sm:max-w-md sm:shadow-xl"
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

            <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
              <div className="mb-4">
                <FormField
                  label={`${INCOME_FREQUENCY_LABELS[incomeFrequency].netLabel} (${currency})`}
                  id="income"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={INCOME_FREQUENCY_LABELS[incomeFrequency].placeholder}
                  disabled={isSubmitting}
                  error={errors.income}
                  {...register('income')}
                />
              </div>

              {errors.root && (
                <p
                  id="income-root-error"
                  className="text-sm text-red-600 dark:text-red-400 mb-4"
                  role="alert"
                >
                  {errors.root.message}
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
