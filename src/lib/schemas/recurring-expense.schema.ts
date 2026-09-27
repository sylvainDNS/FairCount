import { z } from 'zod';

// Recurrence rule: unit frequency + ISO anchors (see src/lib/recurrence.ts)
export const recurrenceRuleSchema = z.discriminatedUnion('frequency', [
  z.strictObject({ frequency: z.literal('daily') }),
  z.strictObject({
    frequency: z.literal('weekly'),
    dayOfWeek: z.number().int().min(1).max(7),
  }),
  z.strictObject({
    frequency: z.literal('monthly'),
    dayOfMonth: z.number().int().min(1).max(31),
  }),
  z.strictObject({
    frequency: z.literal('yearly'),
    month: z.number().int().min(1).max(12),
    dayOfMonth: z.number().int().min(1).max(31),
  }),
]);

const participantSchema = z.strictObject({
  memberId: z.string().uuid(),
  customAmount: z.number().int().min(0).nullable().optional(),
});

const contentFields = {
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  paidBy: z.string().uuid(),
  participants: z.array(participantSchema).min(1),
  rule: recurrenceRuleSchema,
};

// API payload: POST /api/groups/:id/recurring-expenses
export const createRecurringExpenseSchema = z.strictObject({
  ...contentFields,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// API payload: PATCH /api/groups/:id/recurring-expenses/:recurringExpenseId
// (startDate is immutable, the group cannot change)
export const updateRecurringExpenseSchema = z
  .strictObject({
    amount: contentFields.amount.optional(),
    description: contentFields.description.optional(),
    paidBy: contentFields.paidBy.optional(),
    participants: contentFields.participants.optional(),
    rule: contentFields.rule.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;
export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateRecurringExpenseInput = z.infer<typeof updateRecurringExpenseSchema>;
