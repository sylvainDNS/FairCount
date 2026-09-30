import type { ExpenseFormValues } from '@/lib/schemas/expense.schema';
import type { RecurrenceRule } from '../types';

type RuleFormValues = Pick<ExpenseFormValues, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>;

/** Form values → API rule. A yearly rule always follows the start date (FR-005). */
export function buildRecurrenceRule(values: RuleFormValues, startDate: string): RecurrenceRule {
  switch (values.frequency) {
    case 'daily':
      return { frequency: 'daily' };
    case 'weekly':
      return { frequency: 'weekly', dayOfWeek: values.dayOfWeek };
    case 'monthly':
      return { frequency: 'monthly', dayOfMonth: values.dayOfMonth };
    case 'yearly':
      return {
        frequency: 'yearly',
        month: Number(startDate.slice(5, 7)),
        dayOfMonth: Number(startDate.slice(8, 10)),
      };
  }
}
