import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { MemberWithCoefficient } from '@/features/members/types';
import { isoWeekday, RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { type ExpenseFormValues, expenseSchema } from '@/lib/schemas/expense.schema';
import { toaster } from '@/shared/components';
import { getLocalDateString } from '@/shared/utils/date';
import type {
  CreateExpenseFormData,
  CreateRecurringExpenseData,
  CreateRecurringExpenseResult,
  ExpenseDetail,
  ExpenseError,
  ExpenseResult,
  RecurrenceRule,
  RecurringExpenseDetail,
  UpdateExpenseFormData,
  UpdateRecurringExpenseData,
} from '../types';
import { EXPENSE_ERROR_MESSAGES } from '../types';
import { buildRecurrenceRule } from '../utils/build-recurrence-rule';
import { formatDueDate } from '../utils/format-recurrence-rule';

interface UseExpenseFormParams {
  readonly members: readonly MemberWithCoefficient[];
  readonly expense: ExpenseDetail | undefined;
  readonly create: (data: CreateExpenseFormData) => Promise<ExpenseResult<{ id: string }>>;
  readonly update: (data: UpdateExpenseFormData) => Promise<ExpenseResult>;
  readonly createRecurring?:
    | ((data: CreateRecurringExpenseData) => Promise<ExpenseResult<CreateRecurringExpenseResult>>)
    | undefined;
  /** Recurrence edit mode: the form edits the recurrence template, not an expense */
  readonly recurrence?: RecurringExpenseDetail | undefined;
  readonly updateRecurring?:
    | ((
        data: UpdateRecurringExpenseData,
      ) => Promise<
        { readonly success: true } | { readonly success: false; readonly error: ExpenseError }
      >)
    | undefined;
  readonly onSuccess: () => void;
}

const sameRule = (a: RecurrenceRule, b: RecurrenceRule): boolean =>
  a.frequency === b.frequency &&
  (a.frequency !== 'weekly' || (b.frequency === 'weekly' && a.dayOfWeek === b.dayOfWeek)) &&
  (a.frequency !== 'monthly' || (b.frequency === 'monthly' && a.dayOfMonth === b.dayOfMonth)) &&
  (a.frequency !== 'yearly' ||
    (b.frequency === 'yearly' && a.month === b.month && a.dayOfMonth === b.dayOfMonth));

type ParticipantPayload = ReadonlyArray<{ memberId: string; customAmount: number | null }>;

const sameParticipants = (a: ParticipantPayload, b: ParticipantPayload): boolean => {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((p) => [p.memberId, p.customAmount]));
  return a.every((p) => byId.has(p.memberId) && byId.get(p.memberId) === p.customAmount);
};

// Recurrence template → form values (only the fields that differ from an expense)
const recurrenceDefaults = (recurrence: RecurringExpenseDetail, today: string) => {
  const { rule, startDate } = recurrence;
  return {
    // The start date is immutable and hidden in edit mode; today keeps the
    // form's « no past start date » rule satisfied
    date: today,
    frequency: rule.frequency,
    dayOfWeek: rule.frequency === 'weekly' ? rule.dayOfWeek : isoWeekday(startDate),
    dayOfMonth:
      rule.frequency === 'monthly' || rule.frequency === 'yearly'
        ? rule.dayOfMonth
        : Number(startDate.slice(8, 10)),
  };
};

export function formatMemberName(member: MemberWithCoefficient): string {
  return member.name + (member.isCurrentUser ? ' (vous)' : '');
}

export const useExpenseForm = ({
  members,
  expense,
  create,
  update,
  createRecurring,
  recurrence,
  updateRecurring,
  onSuccess,
}: UseExpenseFormParams) => {
  const initialDate = expense?.date ?? getLocalDateString();
  const today = todayIn(RECURRENCE_TIME_ZONE, new Date());
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
    defaultValues: recurrence
      ? {
          amount: String(recurrence.amount / 100),
          description: recurrence.description,
          paidBy: recurrence.paidBy.id,
          participants: [],
          repeat: true,
          ...recurrenceDefaults(recurrence, today),
        }
      : {
          amount: expense ? String(expense.amount / 100) : '',
          description: expense?.description ?? '',
          date: initialDate,
          paidBy: expense?.paidBy.id ?? '',
          participants: [],
          repeat: false,
          frequency: 'monthly',
          dayOfWeek: isoWeekday(initialDate),
          dayOfMonth: Number(initialDate.slice(8, 10)),
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
  const repeat = watch('repeat');
  const date = watch('date');

  // Initialize participants from members
  useEffect(() => {
    if (members.length === 0) return;

    const existingParticipants = recurrence?.participants ?? expense?.participants;
    if (existingParticipants) {
      // Edit mode: use existing participants
      const participantMap = new Map(existingParticipants.map((p) => [p.memberId, p]));

      replace(
        members.map((m) => {
          const existing = participantMap.get(m.id);
          return {
            memberId: m.id,
            memberName: formatMemberName(m),
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
          memberName: formatMemberName(m),
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
  }, [members, expense, recurrence, replace, setValue]);

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
      if (recurrence && updateRecurring) {
        // Send only what changed: the API applies it to future échéances only
        const rule = buildRecurrenceRule(data, recurrence.startDate);
        const description = data.description.trim();
        const activeParticipants = recurrence.participants
          .filter((p) => p.isActive)
          .map((p) => ({ memberId: p.memberId, customAmount: p.customAmount }));
        const changes: UpdateRecurringExpenseData = {
          ...(amountInCents !== recurrence.amount ? { amount: amountInCents } : {}),
          ...(description !== recurrence.description ? { description } : {}),
          ...(data.paidBy !== recurrence.paidBy.id ? { paidBy: data.paidBy } : {}),
          ...(!sameParticipants(participantData, activeParticipants)
            ? { participants: participantData }
            : {}),
          ...(!sameRule(rule, recurrence.rule) ? { rule } : {}),
        };

        if (Object.keys(changes).length > 0) {
          const result = await updateRecurring(changes);
          if (!result.success) {
            setError('root', { message: EXPENSE_ERROR_MESSAGES[result.error] });
            return;
          }
          toaster.success({ title: 'Récurrence modifiée' });
        }
      } else if (expense) {
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

        toaster.success({ title: 'Dépense modifiée' });
      } else if (data.repeat && createRecurring) {
        const recurringData: CreateRecurringExpenseData = {
          amount: amountInCents,
          description: data.description.trim(),
          paidBy: data.paidBy,
          participants: participantData,
          startDate: data.date,
          rule: buildRecurrenceRule(data, data.date),
        };

        const result = await createRecurring(recurringData);

        if (!result.success) {
          const message = EXPENSE_ERROR_MESSAGES[result.error];
          if (result.error === 'START_DATE_IN_PAST') setError('date', { message });
          else setError('root', { message });
          return;
        }

        const next = formatDueDate(
          result.data.nextDueDate,
          todayIn(RECURRENCE_TIME_ZONE, new Date()),
        );
        toaster.success(
          result.data.generatedExpenseId
            ? { title: 'Dépense ajoutée', description: `Prochaine échéance le ${next}` }
            : { title: 'Récurrence enregistrée', description: `Prochaine échéance le ${next}` },
        );
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

        toaster.success({ title: 'Dépense enregistrée' });
      }

      onSuccess();
    } catch {
      setError('root', { message: 'Une erreur est survenue' });
    }
  };

  return {
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
  };
};
