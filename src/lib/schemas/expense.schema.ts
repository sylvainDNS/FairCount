import { z } from 'zod';

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
  })
  .refine(
    (data) => {
      const amountInCents = Math.round(Number.parseFloat(data.amount) * 100);
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
  );

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
