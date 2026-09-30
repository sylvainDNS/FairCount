import { describe, expect, it } from 'vitest';
import {
  createRecurringExpenseSchema,
  recurrenceRuleSchema,
  updateRecurringExpenseSchema,
} from './recurring-expense.schema';

const memberId = '8f14e45f-ceea-4e67-9d8f-6c5a1b2c3d4e';

const validCreate = {
  amount: 85000,
  description: 'Loyer',
  paidBy: memberId,
  participants: [{ memberId, customAmount: null }],
  startDate: '2026-10-01',
  rule: { frequency: 'monthly', dayOfMonth: 1 },
};

describe('recurrenceRuleSchema', () => {
  it.each([
    { frequency: 'daily' },
    { frequency: 'weekly', dayOfWeek: 1 },
    { frequency: 'weekly', dayOfWeek: 7 },
    { frequency: 'monthly', dayOfMonth: 31 },
    { frequency: 'yearly', month: 2, dayOfMonth: 29 },
  ])('accepts %o', (rule) => {
    expect(recurrenceRuleSchema.safeParse(rule).success).toBe(true);
  });

  it.each([
    { frequency: 'weekly' },
    { frequency: 'weekly', dayOfWeek: 0 },
    { frequency: 'weekly', dayOfWeek: 8 },
    { frequency: 'monthly', dayOfMonth: 0 },
    { frequency: 'monthly', dayOfMonth: 32 },
    { frequency: 'yearly', dayOfMonth: 1 },
    { frequency: 'yearly', month: 13, dayOfMonth: 1 },
    { frequency: 'daily', dayOfMonth: 3 },
    { frequency: 'hourly' },
  ])('rejects %o', (rule) => {
    expect(recurrenceRuleSchema.safeParse(rule).success).toBe(false);
  });
});

describe('createRecurringExpenseSchema', () => {
  it('accepts a complete payload', () => {
    expect(createRecurringExpenseSchema.safeParse(validCreate).success).toBe(true);
  });

  it.each([
    ['amount 0', { amount: 0 }],
    ['non-integer amount', { amount: 10.5 }],
    ['empty description', { description: '' }],
    ['description over 500 chars', { description: 'x'.repeat(501) }],
    ['invalid payer id', { paidBy: 'alex' }],
    ['no participant', { participants: [] }],
    ['negative custom amount', { participants: [{ memberId, customAmount: -1 }] }],
    ['malformed start date', { startDate: '01/10/2026' }],
    ['missing rule', { rule: undefined }],
    ['unknown field', { groupId: memberId }],
  ])('rejects %s', (_label, patch) => {
    expect(createRecurringExpenseSchema.safeParse({ ...validCreate, ...patch }).success).toBe(
      false,
    );
  });
});

describe('updateRecurringExpenseSchema', () => {
  it('accepts a partial payload', () => {
    expect(updateRecurringExpenseSchema.safeParse({ amount: 88000 }).success).toBe(true);
    expect(
      updateRecurringExpenseSchema.safeParse({ rule: { frequency: 'weekly', dayOfWeek: 5 } })
        .success,
    ).toBe(true);
  });

  it('rejects an empty payload', () => {
    expect(updateRecurringExpenseSchema.safeParse({}).success).toBe(false);
  });

  it('rejects startDate and unknown fields', () => {
    expect(updateRecurringExpenseSchema.safeParse({ startDate: '2026-10-01' }).success).toBe(false);
    expect(updateRecurringExpenseSchema.safeParse({ groupId: memberId }).success).toBe(false);
  });
});
