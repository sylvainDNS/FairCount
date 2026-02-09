import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { MemberWithCoefficient } from '@/features/members/types';
import { type ExpenseFormValues, expenseSchema } from '@/lib/schemas/expense.schema';
import { getLocalDateString } from '@/shared/utils/date';
import type {
  CreateExpenseFormData,
  ExpenseDetail,
  ExpenseResult,
  UpdateExpenseFormData,
} from '../types';
import { EXPENSE_ERROR_MESSAGES } from '../types';

interface UseExpenseFormParams {
  readonly members: readonly MemberWithCoefficient[];
  readonly expense: ExpenseDetail | undefined;
  readonly create: (data: CreateExpenseFormData) => Promise<ExpenseResult<{ id: string }>>;
  readonly update: (data: UpdateExpenseFormData) => Promise<ExpenseResult>;
  readonly onSuccess: () => void;
}

export function formatMemberName(member: MemberWithCoefficient): string {
  return (member.name || member.email || '?') + (member.isCurrentUser ? ' (vous)' : '');
}

export const useExpenseForm = ({
  members,
  expense,
  create,
  update,
  onSuccess,
}: UseExpenseFormParams) => {
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

  return {
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
  };
};
