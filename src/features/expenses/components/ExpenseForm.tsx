import { Dialog } from '@ark-ui/react/dialog';
import { Field } from '@ark-ui/react/field';
import { Fieldset } from '@ark-ui/react/fieldset';
import { Portal } from '@ark-ui/react/portal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useMembers } from '@/features/members/hooks/useMembers';
import { type ExpenseFormValues, expenseSchema } from '@/lib/schemas/expense.schema';
import { Button } from '@/shared/components/Button';
import { Checkbox } from '@/shared/components/Checkbox';
import { FormField } from '@/shared/components/FormField';
import { Select } from '@/shared/components/Select';
import { TextInput } from '@/shared/components/TextInput';
import { getLocalDateString } from '@/shared/utils/date';
import { useExpense } from '../hooks/useExpense';
import type { CreateExpenseFormData, ExpenseDetail, UpdateExpenseFormData } from '../types';
import { EXPENSE_ERROR_MESSAGES } from '../types';

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
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense ? String(expense.amount / 100) : '',
      description: expense?.description ?? '',
      date: expense?.date ?? getLocalDateString(),
      paidBy: expense?.paidBy.id ?? '',
      participants: [],
    },
  });

  const {
    fields,
    replace,
    update: updateField,
  } = useFieldArray({
    control,
    name: 'participants',
  });

  const watchedParticipants = watch('participants');

  // Initialize participants from members
  useEffect(() => {
    if (members.length === 0) return;

    if (expense) {
      // Edit mode: use existing participants
      const participantMap = new Map(expense.participants.map((p) => [p.memberId, p]));

      replace(
        members.map((m) => {
          const existing = participantMap.get(m.id);
          return {
            memberId: m.id,
            memberName: (m.name || m.email || '?') + (m.isCurrentUser ? ' (vous)' : ''),
            selected: !!existing,
            customAmount: existing?.customAmount ? String(existing.customAmount / 100) : '',
            useCustomAmount:
              existing?.customAmount !== null && existing?.customAmount !== undefined,
          };
        }),
      );
    } else {
      // Create mode: select all by default
      replace(
        members.map((m) => ({
          memberId: m.id,
          memberName: (m.name || m.email || '?') + (m.isCurrentUser ? ' (vous)' : ''),
          selected: true,
          customAmount: '',
          useCustomAmount: false,
        })),
      );

      // Set default payer to current user
      const currentUser = members.find((m) => m.isCurrentUser);
      if (currentUser) {
        setValue('paidBy', currentUser.id);
      }
    }
  }, [members, expense, replace, setValue]);

  const handleParticipantToggle = useCallback(
    (index: number) => {
      const current = watchedParticipants[index];
      if (!current) return;
      updateField(index, {
        memberId: current.memberId,
        memberName: current.memberName,
        selected: !current.selected,
        customAmount: '',
        useCustomAmount: false,
      });
    },
    [watchedParticipants, updateField],
  );

  const handleCustomAmountToggle = useCallback(
    (index: number) => {
      const current = watchedParticipants[index];
      if (!current) return;
      updateField(index, {
        memberId: current.memberId,
        memberName: current.memberName,
        selected: current.selected,
        useCustomAmount: !current.useCustomAmount,
        customAmount: '',
      });
    },
    [watchedParticipants, updateField],
  );

  const onSubmit = async (data: ExpenseFormValues) => {
    const amountInCents = Math.round(Number.parseFloat(data.amount) * 100);

    const selectedParticipants = data.participants.filter((p) => p.selected);
    const participantData = selectedParticipants.map((p) => {
      let customAmount: number | null = null;

      if (p.useCustomAmount && p.customAmount) {
        const customValue = Number.parseFloat(p.customAmount);
        if (!Number.isNaN(customValue) && customValue >= 0) {
          customAmount = Math.round(customValue * 100);
        }
      }

      return { memberId: p.memberId, customAmount };
    });

    try {
      if (expense) {
        const updateData: UpdateExpenseFormData = {
          amount: amountInCents,
          description: data.description.trim(),
          date: data.date,
          paidBy: data.paidBy,
          participants: participantData,
        };

        const result = await update(updateData);

        if (!result.success) {
          setError('root', { message: EXPENSE_ERROR_MESSAGES[result.error] });
          return;
        }
      } else {
        const createData: CreateExpenseFormData = {
          amount: amountInCents,
          description: data.description.trim(),
          date: data.date,
          paidBy: data.paidBy,
          participants: participantData,
        };

        const result = await create(createData);

        if (!result.success) {
          setError('root', { message: EXPENSE_ERROR_MESSAGES[result.error] });
          return;
        }
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
              <Field.Root
                required
                invalid={!!errors.paidBy}
                {...(isSubmitting ? { disabled: true } : {})}
              >
                <Field.Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payé par
                  <Field.RequiredIndicator className="text-red-500 dark:text-red-400 ml-0.5" />
                </Field.Label>
                <Controller
                  name="paidBy"
                  control={control}
                  render={({ field }) => (
                    <Select
                      items={members.map((m) => ({
                        value: m.id,
                        label: (m.name || m.email || '?') + (m.isCurrentUser ? ' (vous)' : ''),
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Sélectionner..."
                      variant={errors.paidBy ? 'error' : 'default'}
                    />
                  )}
                />
                <Field.ErrorText className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.paidBy?.message}
                </Field.ErrorText>
              </Field.Root>

              {/* Participants */}
              <Fieldset.Root
                invalid={!!errors.participants}
                {...(isSubmitting ? { disabled: true } : {})}
                className="border-0 p-0 m-0"
              >
                <Fieldset.Legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Participants
                  <span className="text-red-500 dark:text-red-400 ml-0.5" aria-hidden="true">
                    *
                  </span>
                </Fieldset.Legend>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                  {fields.map((field, index) => {
                    const participant = watchedParticipants[index];
                    if (!participant) return null;

                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <Checkbox
                          checked={participant.selected}
                          onCheckedChange={() => handleParticipantToggle(index)}
                          disabled={isSubmitting}
                          size="sm"
                          className="flex-1"
                        >
                          {participant.memberName}
                        </Checkbox>

                        {participant.selected && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCustomAmountToggle(index)}
                              className={`text-xs px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
                                participant.useCustomAmount
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                              disabled={isSubmitting}
                            >
                              {participant.useCustomAmount ? 'Montant fixe' : 'Part équitable'}
                            </button>

                            {participant.useCustomAmount && (
                              <TextInput
                                type="number"
                                min="0"
                                step="0.01"
                                fullWidth={false}
                                className="w-20 px-2 py-1 text-sm"
                                placeholder="0.00"
                                disabled={isSubmitting}
                                {...register(`participants.${index}.customAmount`)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Fieldset.ErrorText className="mt-1 text-sm text-red-600 dark:text-red-400">
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
