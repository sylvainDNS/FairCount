import { Dialog } from '@ark-ui/react/dialog';
import { Field } from '@ark-ui/react/field';
import { Fieldset } from '@ark-ui/react/fieldset';
import { Portal } from '@ark-ui/react/portal';
import { Controller } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { useMembers } from '@/features/members/hooks/useMembers';
import { Button } from '@/shared/components/Button';
import {
  FormField,
  fieldErrorClasses,
  fieldLabelClasses,
  requiredIndicatorClasses,
} from '@/shared/components/FormField';
import { Select } from '@/shared/components/Select';
import { useExpense } from '../hooks/useExpense';
import { formatMemberName, useExpenseForm } from '../hooks/useExpenseForm';
import type { ExpenseDetail } from '../types';
import { ParticipantList } from './ParticipantList';

interface ExpenseFormProps {
  readonly groupId: string;
  readonly currency: string;
  readonly expense?: ExpenseDetail | undefined;
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
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

  const {
    register,
    handleSubmit,
    control,
    errors,
    isSubmitting,
    fields,
    watchedParticipants,
    handleParticipantToggle,
    handleCustomAmountToggle,
    onSubmit,
  } = useExpenseForm({ members, expense, create, update, onSuccess });

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Positioner className="fixed inset-0 z-50 overflow-y-auto sm:flex sm:items-center sm:justify-center sm:p-4">
          <Dialog.Content
            aria-labelledby="expense-form-dialog-title"
            className="bg-white dark:bg-slate-900 p-6 min-h-full sm:min-h-0 sm:rounded-xl sm:w-full sm:max-w-lg sm:shadow-xl sm:my-8"
          >
            <Dialog.Title
              id="expense-form-dialog-title"
              className="text-lg font-semibold text-slate-900 dark:text-white mb-4"
            >
              {expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </Dialog.Title>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Amount */}
              <FormField
                label={`Montant (${currency})`}
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
                disabled={isSubmitting}
                error={errors.amount}
                {...register('amount')}
              />

              {/* Description */}
              <FormField
                label="Description"
                id="expense-description"
                type="text"
                placeholder="Ex: Courses, Restaurant..."
                required
                disabled={isSubmitting}
                error={errors.description}
                {...register('description')}
              />

              {/* Date */}
              <FormField
                label="Date"
                id="expense-date"
                type="date"
                required
                disabled={isSubmitting}
                error={errors.date}
                {...register('date')}
              />

              {/* Paid by - Ark UI Select via Controller */}
              {/* Field.Root handles label/error a11y; invalid on Select is needed
                  separately because ArkSelect.Root has its own context boundary */}
              <Field.Root
                required
                invalid={!!errors.paidBy}
                {...(isSubmitting ? { disabled: true } : {})}
              >
                <Field.Label className={fieldLabelClasses}>
                  Payé par
                  <Field.RequiredIndicator className={requiredIndicatorClasses} />
                </Field.Label>
                <Controller
                  name="paidBy"
                  control={control}
                  render={({ field }) => (
                    <Select
                      items={members.map((m) => ({
                        value: m.id,
                        label: formatMemberName(m),
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Sélectionner..."
                      invalid={!!errors.paidBy}
                    />
                  )}
                />
                <Field.ErrorText className={fieldErrorClasses}>
                  {errors.paidBy?.message}
                </Field.ErrorText>
              </Field.Root>

              {/* Participants */}
              <Fieldset.Root
                invalid={!!errors.participants}
                {...(isSubmitting ? { disabled: true } : {})}
                className="border-0 p-0 m-0"
              >
                <Fieldset.Legend className={twMerge(fieldLabelClasses, 'mb-2')}>
                  Participants
                  <span className={requiredIndicatorClasses} aria-hidden="true">
                    *
                  </span>
                </Fieldset.Legend>
                <ParticipantList
                  fields={fields}
                  watchedParticipants={watchedParticipants}
                  isSubmitting={isSubmitting}
                  register={register}
                  onToggle={handleParticipantToggle}
                  onCustomAmountToggle={handleCustomAmountToggle}
                />
                <Fieldset.ErrorText className={fieldErrorClasses}>
                  {errors.participants?.root?.message ??
                    errors.participants?.message ??
                    'Erreur dans les participants'}
                </Fieldset.ErrorText>
              </Fieldset.Root>

              {errors.root && (
                <p
                  id="expense-form-error"
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.root.message}
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
