import { Collapsible } from '@ark-ui/react/collapsible';
import { Dialog } from '@ark-ui/react/dialog';
import { Field } from '@ark-ui/react/field';
import { Fieldset } from '@ark-ui/react/fieldset';
import { Portal } from '@ark-ui/react/portal';
import { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { useMembers } from '@/features/members/hooks/useMembers';
import { addDays, RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import {
  Button,
  Checkbox,
  FormField,
  fieldErrorClasses,
  fieldLabelClasses,
  requiredIndicatorClasses,
  Select,
} from '@/shared/components';
import { useExpense } from '../hooks/useExpense';
import { formatMemberName, useExpenseForm } from '../hooks/useExpenseForm';
import { useCreateRecurringExpense, useRecurringExpense } from '../hooks/useRecurringExpense';
import type { ExpenseDetail, RecurringExpenseDetail } from '../types';
import { ParticipantList } from './ParticipantList';
import { RecurrenceFields } from './RecurrenceFields';

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
  /** Recurrence edit mode (opened from the recurrence detail) */
  readonly recurrence?: RecurringExpenseDetail | undefined;
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
}

export const ExpenseForm = ({
  groupId,
  currency,
  expense,
  recurrence,
  onSuccess,
  onCancel,
}: ExpenseFormProps) => {
  const { members } = useMembers(groupId);
  const { group } = useGroup(groupId);
  const { create, update } = useExpense(groupId, expense?.id);
  const createRecurring = useCreateRecurringExpense(groupId);
  const { update: updateRecurring } = useRecurringExpense(groupId, recurrence?.id ?? null);
  const today = todayIn(RECURRENCE_TIME_ZONE, new Date());

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
    repeat,
    date,
    handleParticipantToggle,
    handleCustomAmountToggle,
    onSubmit,
  } = useExpenseForm({
    members,
    expense,
    create,
    update,
    createRecurring,
    recurrence,
    updateRecurring,
    onSuccess,
  });

  // Repeating is only offered when creating (an existing expense never becomes a recurrence)
  const canRepeat = !expense && !recurrence;
  const isRepeating = canRepeat && repeat;
  const title = recurrence
    ? 'Modifier la récurrence'
    : expense
      ? 'Modifier la dépense'
      : 'Nouvelle dépense';

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
              {title}
            </Dialog.Title>
            {expense?.recurrence && (
              <p className="-mt-3 mb-4 text-sm text-slate-500 dark:text-slate-400">
                Ajoutée automatiquement par une récurrence. La modifier ne change pas les
                prochaines.
              </p>
            )}

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

              {/* Recurrence edit mode: the start date is immutable, the rule is editable */}
              {recurrence && (
                <RecurrenceFields
                  control={control}
                  startDate={recurrence.startDate}
                  today={today}
                  disabled={isSubmitting}
                  mode="edit"
                  floorDate={
                    recurrence.nextDueDate && recurrence.nextDueDate > today
                      ? addDays(today, 1)
                      : undefined
                  }
                />
              )}

              {/* Date (start date when the expense repeats) */}
              {!recurrence && (
                <FormField
                  label={isRepeating ? 'À partir du' : 'Date'}
                  id="expense-date"
                  type="date"
                  required
                  disabled={isSubmitting}
                  error={errors.date}
                  {...(isRepeating ? { min: today } : {})}
                  {...register('date')}
                />
              )}

              {/* Repeat: opt-in recurrence, collapsed by default */}
              {canRepeat && (
                <Collapsible.Root open={isRepeating} lazyMount unmountOnExit className="space-y-3">
                  <Controller
                    name="repeat"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        Répéter cette dépense
                      </Checkbox>
                    )}
                  />
                  <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close motion-reduce:animate-none">
                    <RecurrenceFields
                      control={control}
                      startDate={date}
                      today={today}
                      disabled={isSubmitting}
                    />
                  </Collapsible.Content>
                </Collapsible.Root>
              )}

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

              {recurrence && (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
                  Les changements s'appliquent aux prochaines échéances. Les dépenses déjà ajoutées
                  ne changent pas.
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
                  {expense || recurrence ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
