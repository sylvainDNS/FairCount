import { describe, expect, it } from 'vitest';
import {
  formatDueDate,
  formatPausedReason,
  formatRecurrenceNote,
  formatRecurrenceRule,
} from './format-recurrence-rule';

describe('formatRecurrenceRule', () => {
  it.each([
    [{ frequency: 'daily' } as const, 'Tous les jours'],
    [{ frequency: 'weekly', dayOfWeek: 1 } as const, 'Toutes les semaines, le lundi'],
    [{ frequency: 'weekly', dayOfWeek: 7 } as const, 'Toutes les semaines, le dimanche'],
    [{ frequency: 'monthly', dayOfMonth: 1 } as const, 'Tous les mois, le 1er'],
    [{ frequency: 'monthly', dayOfMonth: 13 } as const, 'Tous les mois, le 13'],
    [{ frequency: 'yearly', month: 9, dayOfMonth: 27 } as const, 'Tous les ans, le 27 septembre'],
    [{ frequency: 'yearly', month: 1, dayOfMonth: 1 } as const, 'Tous les ans, le 1er janvier'],
  ])('%o → %s', (rule, expected) => {
    expect(formatRecurrenceRule(rule)).toBe(expected);
  });
});

describe('formatRecurrenceNote', () => {
  it.each([
    [31, 'Les mois de 30 jours et en février, la dépense est ajoutée le dernier jour du mois.'],
    [30, 'En février, la dépense est ajoutée le 28 (ou le 29).'],
    [29, 'Les années non bissextiles, la dépense est ajoutée le 28 février.'],
  ])('explains month ends for monthly day %i', (dayOfMonth, expected) => {
    expect(formatRecurrenceNote({ frequency: 'monthly', dayOfMonth })).toBe(expected);
  });

  it('explains 29 February on non-leap years', () => {
    expect(formatRecurrenceNote({ frequency: 'yearly', month: 2, dayOfMonth: 29 })).toBe(
      'Les années non bissextiles, la dépense est ajoutée le 28 février.',
    );
  });

  it('returns null otherwise', () => {
    expect(formatRecurrenceNote({ frequency: 'monthly', dayOfMonth: 28 })).toBeNull();
    expect(formatRecurrenceNote({ frequency: 'yearly', month: 3, dayOfMonth: 29 })).toBeNull();
    expect(formatRecurrenceNote({ frequency: 'daily' })).toBeNull();
  });
});

describe('formatDueDate', () => {
  it('says « Aujourd’hui » for today', () => {
    expect(formatDueDate('2026-09-27', '2026-09-27')).toBe("Aujourd'hui");
  });

  it('formats other dates as day + short month', () => {
    expect(formatDueDate('2026-10-13', '2026-09-27')).toBe('13 oct.');
    expect(formatDueDate('2026-10-01', '2026-09-27')).toBe('1er oct.');
    expect(formatDueDate('2026-05-01', '2026-04-27')).toBe('1er mai');
  });

  it('uses lower case inside a sentence', () => {
    expect(formatDueDate('2026-09-27', '2026-09-27', { inSentence: true })).toBe("aujourd'hui");
  });

  it('can include the year', () => {
    expect(formatDueDate('2026-10-13', '2026-09-27', { withYear: true })).toBe('13 oct. 2026');
    expect(formatDueDate('2027-01-01', '2026-09-27', { withYear: true })).toBe('1er janv. 2027');
  });
});

describe('formatPausedReason', () => {
  const paidBy = { name: 'Alex', isJointAccount: false };

  it('names the payer who left', () => {
    expect(formatPausedReason('payer_inactive', paidBy)).toBe('Alex a quitté le groupe');
  });

  it('mentions a disabled joint account', () => {
    expect(
      formatPausedReason('payer_inactive', { name: 'Compte joint', isJointAccount: true }),
    ).toBe('Le compte commun est désactivé');
  });

  it('explains when nobody is left to share it', () => {
    expect(formatPausedReason('no_active_participant', paidBy)).toBe(
      'Plus aucun·e participant·e actif·ve',
    );
  });
});
