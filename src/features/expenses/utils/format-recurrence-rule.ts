import type { PausedReason, RecurrenceRule } from '../types';

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const SHORT_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const ordinalDay = (day: number): string => (day === 1 ? '1er' : String(day));

/** « 27 septembre », « 1er janvier » */
export const formatDayAndMonth = (dayOfMonth: number, month: number): string =>
  `${ordinalDay(dayOfMonth)} ${MONTHS[month - 1]}`;

/** Plain French sentence for a rule, e.g. « Tous les mois, le 13 ». */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  switch (rule.frequency) {
    case 'daily':
      return 'Tous les jours';
    case 'weekly':
      return `Toutes les semaines, le ${WEEKDAYS[rule.dayOfWeek - 1]}`;
    case 'monthly':
      return `Tous les mois, le ${ordinalDay(rule.dayOfMonth)}`;
    case 'yearly':
      return `Tous les ans, le ${formatDayAndMonth(rule.dayOfMonth, rule.month)}`;
  }
}

/** Extra explanation when the anchor day does not exist every month/year. */
export function formatRecurrenceNote(rule: RecurrenceRule): string | null {
  if (rule.frequency === 'monthly' && rule.dayOfMonth >= 29) {
    return 'Les mois plus courts, le dernier jour du mois.';
  }
  if (rule.frequency === 'yearly' && rule.month === 2 && rule.dayOfMonth === 29) {
    return 'Le 28 février les années non bissextiles.';
  }
  return null;
}

/** « Aujourd'hui », « 13 oct. », « 1er oct. 2026 »… for a YYYY-MM-DD date. */
export function formatDueDate(
  date: string,
  today: string,
  options?: { readonly withYear?: boolean; readonly inSentence?: boolean },
): string {
  if (date === today) return options?.inSentence ? "aujourd'hui" : "Aujourd'hui";
  const [year, month, day] = date.split('-').map(Number);
  const label = `${ordinalDay(day ?? 1)} ${SHORT_MONTHS[(month ?? 1) - 1]}`;
  return options?.withYear ? `${label} ${year}` : label;
}

/** Why a recurrence is paused (« À revoir »), stated calmly. */
export function formatPausedReason(
  reason: PausedReason,
  paidBy: { readonly name: string; readonly isJointAccount: boolean },
): string {
  if (reason === 'no_active_participant') return 'Plus aucun·e participant·e actif·ve';
  return paidBy.isJointAccount
    ? 'Le compte commun est désactivé'
    : `${paidBy.name} a quitté le groupe`;
}
