import { z } from 'zod';

export const settlementSchema = z.object({
  amount: z
    .string()
    .min(1, 'Montant requis')
    .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
      message: 'Veuillez entrer un montant valide',
    }),
  toMember: z.string().min(1, 'Veuillez sélectionner un destinataire'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
});

export type SettlementFormValues = z.infer<typeof settlementSchema>;
