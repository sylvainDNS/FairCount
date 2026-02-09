import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Nom du groupe requis').max(100, 'Nom trop long (100 caractères max)'),
  description: z.string().max(500, 'Description trop longue (500 caractères max)').optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']),
  incomeFrequency: z.enum(['annual', 'monthly']),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export const inviteSchema = z.object({
  email: z.string().min(1, 'Adresse email requise').email('Adresse email invalide'),
});

export type InviteFormValues = z.infer<typeof inviteSchema>;
