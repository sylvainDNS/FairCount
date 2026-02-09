import { z } from 'zod';

export const incomeSchema = z.object({
  income: z
    .string()
    .min(1, 'Montant requis')
    .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) >= 0, {
      message: 'Veuillez entrer un montant valide',
    }),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;
