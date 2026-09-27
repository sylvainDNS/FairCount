import { describe, expect, it } from 'vitest';
import { addDays, RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { expenseSchema } from './expense.schema';

const today = todayIn(RECURRENCE_TIME_ZONE, new Date());
const yesterday = addDays(today, -1);

const base = {
  amount: '850',
  description: 'Loyer',
  date: today,
  paidBy: 'alex',
  participants: [
    {
      memberId: 'alex',
      memberName: 'Alex',
      selected: true,
      customAmount: '',
      useCustomAmount: false,
    },
  ],
  repeat: false,
  frequency: 'monthly' as const,
  dayOfWeek: 1,
  dayOfMonth: 13,
};

const dateError = (values: unknown) => {
  const result = expenseSchema.safeParse(values);
  return result.success ? undefined : result.error.issues.find((i) => i.path[0] === 'date');
};

describe('expenseSchema — repeat fields', () => {
  it('without repeat, recurrence fields are ignored and a past date stays valid', () => {
    expect(
      expenseSchema.safeParse({ ...base, date: yesterday, dayOfMonth: 0, dayOfWeek: 9 }).success,
    ).toBe(true);
  });

  it('with repeat, accepts a valid monthly rule starting today', () => {
    expect(expenseSchema.safeParse({ ...base, repeat: true }).success).toBe(true);
  });

  it.each([
    ['unknown frequency', { frequency: 'hourly' }],
    ['weekly day 0', { frequency: 'weekly', dayOfWeek: 0 }],
    ['weekly day 8', { frequency: 'weekly', dayOfWeek: 8 }],
    ['monthly day 0', { frequency: 'monthly', dayOfMonth: 0 }],
    ['monthly day 32', { frequency: 'monthly', dayOfMonth: 32 }],
  ])('with repeat, rejects %s', (_label, patch) => {
    expect(expenseSchema.safeParse({ ...base, repeat: true, ...patch }).success).toBe(false);
  });

  it('with repeat, rejects a start date in the past on the date field', () => {
    expect(dateError({ ...base, repeat: true, date: yesterday })?.message).toBe(
      "La répétition commence au plus tôt aujourd'hui. Saisissez les dépenses passées une par une.",
    );
  });
});
