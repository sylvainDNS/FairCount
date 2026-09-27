/**
 * Calendar maths for recurring expenses, shared by the worker (generation job)
 * and the frontend (next échéance preview), so both always agree.
 *
 * All dates are calendar days as `YYYY-MM-DD` strings. Arithmetic is done on
 * UTC-midnight Date objects only, so no DST or local time zone can shift a day.
 */

export const RECURRENCE_TIME_ZONE = 'Europe/Paris';

// Maximum number of échéances materialised for one recurrence in a single run
export const MAX_CATCH_UP_PER_RUN = 31;

export type RecurrenceRule =
  | { readonly frequency: 'daily' }
  | { readonly frequency: 'weekly'; readonly dayOfWeek: number } // ISO: 1 = Monday, 7 = Sunday
  | { readonly frequency: 'monthly'; readonly dayOfMonth: number } // 1-31
  | { readonly frequency: 'yearly'; readonly month: number; readonly dayOfMonth: number };

export type RecurrenceFrequency = RecurrenceRule['frequency'];

const pad = (n: number): string => String(n).padStart(2, '0');

const toDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

const fromParts = (year: number, month: number, day: number): string =>
  `${year}-${pad(month)}-${pad(day)}`;

const fromDate = (d: Date): string =>
  fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

// Anchor day clamped to the month's last day (31 → 30 April, 29 Feb → 28 Feb…)
const clampedDate = (year: number, month: number, day: number): string =>
  fromParts(year, month, Math.min(day, daysInMonth(year, month)));

/** Current calendar day in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: string, days: number): string {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDate(d);
}

/** ISO weekday of a calendar day: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  return ((toDate(date).getUTCDay() + 6) % 7) + 1;
}

/** First échéance of the rule on or after `date`. */
export function firstDueDateOnOrAfter(rule: RecurrenceRule, date: string): string {
  const d = toDate(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;

  switch (rule.frequency) {
    case 'daily':
      return date;

    case 'weekly':
      return addDays(date, (rule.dayOfWeek - isoWeekday(date) + 7) % 7);

    case 'monthly': {
      const candidate = clampedDate(year, month, rule.dayOfMonth);
      if (candidate >= date) return candidate;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      return clampedDate(nextYear, nextMonth, rule.dayOfMonth);
    }

    case 'yearly': {
      const candidate = clampedDate(year, rule.month, rule.dayOfMonth);
      if (candidate >= date) return candidate;
      return clampedDate(year + 1, rule.month, rule.dayOfMonth);
    }
  }
}

/** First échéance of the rule strictly after `date`. */
export function nextDueDateAfter(rule: RecurrenceRule, date: string): string {
  return firstDueDateOnOrAfter(rule, addDays(date, 1));
}

/** Échéances from `from` (inclusive) through `today` (inclusive), at most `max`. */
export function dueDatesThrough(
  rule: RecurrenceRule,
  from: string,
  today: string,
  max: number,
): string[] {
  const dates: string[] = [];
  let current = firstDueDateOnOrAfter(rule, from);
  while (current <= today && dates.length < max) {
    dates.push(current);
    current = nextDueDateAfter(rule, current);
  }
  return dates;
}
