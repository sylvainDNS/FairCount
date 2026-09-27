import { describe, expect, it } from 'vitest';
import {
  addDays,
  dueDatesThrough,
  firstDueDateOnOrAfter,
  isoWeekday,
  MAX_CATCH_UP_PER_RUN,
  nextDueDateAfter,
  RECURRENCE_TIME_ZONE,
  type RecurrenceRule,
  todayIn,
} from './recurrence';

const daily: RecurrenceRule = { frequency: 'daily' };
const monday: RecurrenceRule = { frequency: 'weekly', dayOfWeek: 1 };
const monthly = (dayOfMonth: number): RecurrenceRule => ({ frequency: 'monthly', dayOfMonth });
const yearly = (month: number, dayOfMonth: number): RecurrenceRule => ({
  frequency: 'yearly',
  month,
  dayOfMonth,
});

describe('todayIn', () => {
  it('uses Europe/Paris calendar days', () => {
    expect(RECURRENCE_TIME_ZONE).toBe('Europe/Paris');
  });

  it('switches day at Paris midnight in winter (UTC+1)', () => {
    expect(todayIn('Europe/Paris', new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29');
  });

  it('switches day at Paris midnight in summer (UTC+2)', () => {
    expect(todayIn('Europe/Paris', new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
  });

  it('stays on the same day just before Paris midnight', () => {
    expect(todayIn('Europe/Paris', new Date('2026-06-30T21:59:00Z'))).toBe('2026-06-30');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('isoWeekday', () => {
  it('returns 1 for Monday and 7 for Sunday', () => {
    expect(isoWeekday('2026-09-28')).toBe(1);
    expect(isoWeekday('2026-09-27')).toBe(7);
  });
});

describe('firstDueDateOnOrAfter', () => {
  it('daily: same day', () => {
    expect(firstDueDateOnOrAfter(daily, '2026-09-27')).toBe('2026-09-27');
  });

  it('weekly: next matching ISO weekday', () => {
    // 2026-09-30 is a Wednesday
    expect(firstDueDateOnOrAfter(monday, '2026-09-30')).toBe('2026-10-05');
  });

  it('weekly: same weekday returns the same day', () => {
    // 2026-09-28 is a Monday
    expect(firstDueDateOnOrAfter(monday, '2026-09-28')).toBe('2026-09-28');
  });

  it('weekly: Sunday is day 7', () => {
    expect(firstDueDateOnOrAfter({ frequency: 'weekly', dayOfWeek: 7 }, '2026-09-28')).toBe(
      '2026-10-04',
    );
  });

  it('monthly: day already passed goes to next month', () => {
    expect(firstDueDateOnOrAfter(monthly(13), '2026-09-27')).toBe('2026-10-13');
  });

  it('monthly: day not yet passed stays in the month', () => {
    expect(firstDueDateOnOrAfter(monthly(13), '2026-09-02')).toBe('2026-09-13');
  });

  it('monthly: 31 in April is clamped to 30 April', () => {
    expect(firstDueDateOnOrAfter(monthly(31), '2026-04-05')).toBe('2026-04-30');
  });

  it('monthly: 31 in February is clamped to the last day (non-leap and leap years)', () => {
    expect(firstDueDateOnOrAfter(monthly(31), '2027-02-01')).toBe('2027-02-28');
    expect(firstDueDateOnOrAfter(monthly(31), '2028-02-01')).toBe('2028-02-29');
  });

  it('monthly: the 1st across December goes to January next year', () => {
    expect(firstDueDateOnOrAfter(monthly(1), '2026-12-02')).toBe('2027-01-01');
  });

  it('yearly: 29 February is clamped to 28 February on non-leap years', () => {
    expect(firstDueDateOnOrAfter(yearly(2, 29), '2027-01-01')).toBe('2027-02-28');
    expect(firstDueDateOnOrAfter(yearly(2, 29), '2028-01-01')).toBe('2028-02-29');
  });

  it('yearly: date already passed this year goes to next year', () => {
    expect(firstDueDateOnOrAfter(yearly(9, 27), '2026-09-28')).toBe('2027-09-27');
  });

  it('yearly: same day returns the same day', () => {
    expect(firstDueDateOnOrAfter(yearly(9, 27), '2026-09-27')).toBe('2026-09-27');
  });
});

describe('nextDueDateAfter', () => {
  it('is strictly after the given date', () => {
    expect(nextDueDateAfter(daily, '2026-09-27')).toBe('2026-09-28');
    expect(nextDueDateAfter(monday, '2026-09-28')).toBe('2026-10-05');
  });

  it('keeps the anchor day, not the clamped one', () => {
    expect(nextDueDateAfter(monthly(31), '2026-01-31')).toBe('2026-02-28');
    expect(nextDueDateAfter(monthly(31), '2026-02-28')).toBe('2026-03-31');
  });

  it('yearly: next year', () => {
    expect(nextDueDateAfter(yearly(2, 29), '2028-02-29')).toBe('2029-02-28');
  });
});

describe('dueDatesThrough', () => {
  it('lists every missed daily échéance up to today', () => {
    expect(dueDatesThrough(daily, '2026-09-25', '2026-09-27', MAX_CATCH_UP_PER_RUN)).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('returns nothing when the first échéance is in the future', () => {
    expect(dueDatesThrough(daily, '2026-09-28', '2026-09-27', MAX_CATCH_UP_PER_RUN)).toEqual([]);
  });

  it('caps the list', () => {
    expect(dueDatesThrough(daily, '2026-09-01', '2026-09-27', 3)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
  });

  it('follows the rule for sparse frequencies', () => {
    expect(dueDatesThrough(monthly(31), '2026-01-31', '2026-04-15', 31)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('caps a run at 31 échéances', () => {
    expect(MAX_CATCH_UP_PER_RUN).toBe(31);
  });
});
