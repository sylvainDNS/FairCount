import { z } from 'zod';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';

const participantSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  selected: z.boolean(),
  customAmount: z.string(),
  useCustomAmount: z.boolean(),
});

export const expenseSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'Montant requis')
      .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
        message: 'Veuillez entrer un montant valide',
      }),
    description: z
      .string()
      .min(1, 'Description requise')
      .max(200, 'Description trop longue (200 caractères max)'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
    paidBy: z.string().min(1, 'Veuillez sélectionner qui a payé'),
    participants: z.array(participantSchema).refine((p) => p.some((x) => x.selected), {
      message: 'Veuillez sélectionner au moins un participant',
    }),
    // Recurrence (create mode, or recurrence edit mode): only checked when `repeat`
    repeat: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    dayOfWeek: z.number(),
    dayOfMonth: z.number(),
  })
  .refine(
    (data) => {
      const amountInCents = Math.round(Number.parseFloat(data.amount) * 100);
      // Skip cross-field check when amount is invalid — field-level validation handles it
      if (Number.isNaN(amountInCents) || amountInCents <= 0) return true;
      const customTotal = data.participants
        .filter((p) => p.selected && p.useCustomAmount && p.customAmount)
        .reduce((sum, p) => {
          const v = Number.parseFloat(p.customAmount);
          return sum + (Number.isNaN(v) ? 0 : Math.round(v * 100));
        }, 0);
      return customTotal <= amountInCents;
    },
    {
      message: 'Les montants personnalisés dépassent le total de la dépense',
      path: ['participants'],
    },
  )
  .superRefine((data, ctx) => {
    if (!data.repeat) return;
    if (
      data.frequency === 'weekly' &&
      !(Number.isInteger(data.dayOfWeek) && data.dayOfWeek >= 1 && data.dayOfWeek <= 7)
    ) {
      ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: 'Jour invalide' });
    }
    if (
      data.frequency === 'monthly' &&
      !(Number.isInteger(data.dayOfMonth) && data.dayOfMonth >= 1 && data.dayOfMonth <= 31)
    ) {
      ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: 'Jour invalide' });
    }
    if (data.date < todayIn(RECURRENCE_TIME_ZONE, new Date())) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message:
          "La répétition commence au plus tôt aujourd'hui. Saisissez les dépenses passées une par une.",
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
