import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useMembers } from '@/features/members/hooks/useMembers';
import { type SettlementFormValues, settlementSchema } from '@/lib/schemas/settlement.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Select } from '@/shared/components/Select';
import { getLocalDateString } from '@/shared/utils/date';
import { useSettlement } from '../hooks/useSettlement';
import type { SettlementSuggestion } from '../types';
import { SETTLEMENT_ERROR_MESSAGES } from '../types';

interface SettlementFormProps {
  readonly groupId: string;
  readonly currency: string;
  readonly suggestion?: SettlementSuggestion | undefined;
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

  const currentMember = members.find((m) => m.isCurrentUser);
  const otherMembers = members.filter((m) => !m.isCurrentUser);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      amount: suggestion ? String(suggestion.amount / 100) : '',
      toMember: suggestion?.to.id ?? '',
      date: getLocalDateString(),
    },
  });

  const onSubmit = async (data: SettlementFormValues) => {
    const amountInCents = Math.round(Number.parseFloat(data.amount) * 100);

    try {
      const result = await create({
        toMember: data.toMember,
        amount: amountInCents,
        date: data.date,
      });

      if (!result.success) {
        setError('root', { message: SETTLEMENT_ERROR_MESSAGES[result.error] });
        return;
      }

      onSuccess();
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
            aria-labelledby="settlement-form-dialog-title"
            className="bg-white dark:bg-slate-900 p-6 min-h-full sm:min-h-0 sm:rounded-xl sm:w-full sm:max-w-md sm:shadow-xl sm:my-8"
          >
            <Dialog.Title
              id="settlement-form-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white mb-4"
            >
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Recipient - Ark UI Select via Controller */}
              <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Destinataire
                </span>
                <Controller
                  name="toMember"
                  control={control}
                  render={({ field }) => (
                    <Select
                      items={otherMembers.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Sélectionner un membre"
                      disabled={isSubmitting}
                      aria-label="Destinataire"
                      variant={errors.toMember ? 'error' : 'default'}
                    />
                  )}
                />
                {errors.toMember && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.toMember.message}
                  </p>
                )}
              </div>

              {/* Amount */}
              <FormField
                label={`Montant (${currency})`}
                id="settlement-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                disabled={isSubmitting}
                error={errors.amount}
                {...register('amount')}
              />

              {/* Date */}
              <FormField
                label="Date"
                id="settlement-date"
                type="date"
                disabled={isSubmitting}
                error={errors.date}
                {...register('date')}
              />

              {/* Error */}
              {errors.root && (
                <p
                  id="settlement-form-error"
                  className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
                  role="alert"
                >
                  {errors.root.message}
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
