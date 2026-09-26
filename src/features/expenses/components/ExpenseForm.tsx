import { Dialog } from '@ark-ui/react/dialog';
import { Field } from '@ark-ui/react/field';
import { Fieldset } from '@ark-ui/react/fieldset';
import { Portal } from '@ark-ui/react/portal';
import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { useMembers } from '@/features/members/hooks/useMembers';
import {
  Button,
  FormField,
  fieldErrorClasses,
  fieldLabelClasses,
  requiredIndicatorClasses,
  Select,
} from '@/shared/components';
import { useExpense } from '../hooks/useExpense';
import { formatMemberName, useExpenseForm } from '../hooks/useExpenseForm';
import type { ExpenseDetail } from '../types';
import { ParticipantList } from './ParticipantList';

// Credit card icon distinguishing the joint account from real members in the payer list
const jointAccountIcon = (
  <>
    <svg
      className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
      />
    </svg>
    <span className="sr-only">Compte commun :</span>
  </>
);

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
  const { group } = useGroup(groupId);
  const { create, update } = useExpense(groupId, expense?.id);

  // Build the payer options: real members, plus the joint account when it is
  // active — or when editing an expense already paid by it (even if since
  // disabled), so that expense stays editable.
  // Memoized so the Select's list collection is not rebuilt on every render.
  const jointAccount = group?.jointAccount ?? null;
  const editingJointExpense = expense?.paidBy.isJointAccount ?? false;
  const payerItems = useMemo(
    () => [
      ...members.map((m) => ({ value: m.id, label: formatMemberName(m) })),
      ...(jointAccount && (jointAccount.active || editingJointExpense)
        ? [{ value: jointAccount.memberId, label: jointAccount.name, icon: jointAccountIcon }]
        : []),
    ],
    [members, jointAccount, editingJointExpense],
  );

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
                      items={payerItems}
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
