import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Adresse email requise').email('Adresse email invalide'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
