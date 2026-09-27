import { describe, expect, it } from 'vitest';
import { buildRecurrenceRule } from './build-recurrence-rule';

describe('buildRecurrenceRule', () => {
  const values = { frequency: 'daily' as const, dayOfWeek: 3, dayOfMonth: 13 };

  it('keeps only the anchors of the chosen frequency', () => {
    expect(buildRecurrenceRule(values, '2026-09-27')).toEqual({ frequency: 'daily' });
    expect(buildRecurrenceRule({ ...values, frequency: 'weekly' }, '2026-09-27')).toEqual({
      frequency: 'weekly',
      dayOfWeek: 3,
    });
    expect(buildRecurrenceRule({ ...values, frequency: 'monthly' }, '2026-09-27')).toEqual({
      frequency: 'monthly',
      dayOfMonth: 13,
    });
  });

  it('derives a yearly rule from the start date, not from the form day', () => {
    expect(buildRecurrenceRule({ ...values, frequency: 'yearly' }, '2026-09-27')).toEqual({
      frequency: 'yearly',
      month: 9,
      dayOfMonth: 27,
    });
  });
});
