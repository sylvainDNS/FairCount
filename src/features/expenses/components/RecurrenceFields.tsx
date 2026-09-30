import { useEffect, useRef } from 'react';
import { type Control, useController, useWatch } from 'react-hook-form';
import { firstDueDateOnOrAfter, isoWeekday } from '@/lib/recurrence';
import type { ExpenseFormValues } from '@/lib/schemas/expense.schema';
import { fieldLabelClasses, SegmentedControl, Select } from '@/shared/components';
import { buildRecurrenceRule } from '../utils/build-recurrence-rule';
import {
  formatDayAndMonth,
  formatDueDate,
  formatRecurrenceNote,
  formatRecurrenceRule,
} from '../utils/format-recurrence-rule';
import { RepeatIcon } from './RepeatIcon';

type Frequency = ExpenseFormValues['frequency'];

const FREQUENCY_ITEMS: ReadonlyArray<{ readonly value: Frequency; readonly label: string }> = [
  { value: 'daily', label: 'Jour' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'monthly', label: 'Mois' },
  { value: 'yearly', label: 'Année' },
];

const WEEKDAY_ITEMS = [
  ['lun.', 'lundi'],
  ['mar.', 'mardi'],
  ['mer.', 'mercredi'],
  ['jeu.', 'jeudi'],
  ['ven.', 'vendredi'],
  ['sam.', 'samedi'],
  ['dim.', 'dimanche'],
].map(([label = '', accessibleLabel = ''], index) => ({
  value: String(index + 1),
  label,
  accessibleLabel,
}));

const MONTH_DAY_ITEMS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: index === 0 ? '1er' : String(index + 1),
}));

const isCalendarDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

interface RecurrenceFieldsProps {
  readonly control: Control<ExpenseFormValues>;
  /** First day the recurrence may run (the form's « À partir du » date) */
  readonly startDate: string;
  /** Today in the recurrence time zone */
  readonly today: string;
  readonly disabled?: boolean | undefined;
  /**
   * `create`: the day follows the start date and a first échéance today is generated on save.
   * `edit`: the stored day is kept and only the next échéance is announced.
   */
  readonly mode?: 'create' | 'edit' | undefined;
  /** First day the next échéance may fall on (defaults to today) */
  readonly floorDate?: string | undefined;
}

export const RecurrenceFields = ({
  control,
  startDate,
  today,
  disabled,
  mode = 'create',
  floorDate,
}: RecurrenceFieldsProps) => {
  const { field: frequency } = useController({ control, name: 'frequency' });
  const { field: dayOfWeek } = useController({ control, name: 'dayOfWeek' });
  const { field: dayOfMonth } = useController({ control, name: 'dayOfMonth' });
  const values = useWatch({ control, name: ['frequency', 'dayOfWeek', 'dayOfMonth'] });

  // The day follows the start date until the person picks one explicitly
  const dayTouched = useRef(mode === 'edit');
  const setDayOfWeek = dayOfWeek.onChange;
  const setDayOfMonth = dayOfMonth.onChange;
  useEffect(() => {
    if (dayTouched.current || !isCalendarDate(startDate)) return;
    setDayOfWeek(isoWeekday(startDate));
    setDayOfMonth(Number(startDate.slice(8, 10)));
  }, [startDate, setDayOfWeek, setDayOfMonth]);

  const validStart = isCalendarDate(startDate) ? startDate : today;
  const rule = buildRecurrenceRule(
    { frequency: values[0], dayOfWeek: values[1], dayOfMonth: values[2] },
    validStart,
  );
  const floor = floorDate && floorDate > today ? floorDate : today;
  const nextDueDate = firstDueDateOnOrAfter(rule, validStart > floor ? validStart : floor);
  const note = formatRecurrenceNote(rule);

  return (
    <fieldset
      disabled={disabled}
      className="m-0 min-w-0 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40"
    >
      <legend className="sr-only">Répétition</legend>

      <div>
        <span className={fieldLabelClasses} aria-hidden="true">
          Fréquence
        </span>
        <SegmentedControl
          items={FREQUENCY_ITEMS}
          size="sm"
          value={frequency.value}
          onValueChange={(value) => {
            const item = FREQUENCY_ITEMS.find((i) => i.value === value);
            if (item) frequency.onChange(item.value);
          }}
          aria-label="Fréquence"
          disabled={disabled}
          className="bg-white dark:bg-slate-900"
        />
      </div>

      {frequency.value === 'weekly' && (
        <div>
          <span className={fieldLabelClasses} aria-hidden="true">
            Chaque semaine, le
          </span>
          <SegmentedControl
            items={WEEKDAY_ITEMS}
            size="xs"
            value={String(dayOfWeek.value)}
            onValueChange={(value) => {
              dayTouched.current = true;
              dayOfWeek.onChange(Number(value));
            }}
            aria-label="Jour de la semaine"
            disabled={disabled}
            className="gap-0.5 bg-white dark:bg-slate-900"
          />
        </div>
      )}

      {frequency.value === 'monthly' && (
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <span>Le</span>
          <Select
            items={MONTH_DAY_ITEMS}
            value={String(dayOfMonth.value)}
            onValueChange={(value) => {
              if (!value) return;
              dayTouched.current = true;
              dayOfMonth.onChange(Number(value));
            }}
            aria-label="Jour du mois"
            {...(disabled ? { disabled } : {})}
            className="w-24"
          />
          <span>de chaque mois</span>
        </div>
      )}

      {frequency.value === 'yearly' && (
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Le {formatDayAndMonth(Number(validStart.slice(8, 10)), Number(validStart.slice(5, 7)))} de
          chaque année
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        className="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"
      >
        <RepeatIcon className="mt-0.5 text-slate-500 dark:text-slate-400" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatRecurrenceRule(rule)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {mode === 'create' && nextDueDate === today
              ? "Première échéance : aujourd'hui — la dépense sera ajoutée dès l'enregistrement."
              : `Prochaine échéance : ${formatDueDate(nextDueDate, today, { withYear: true, inSentence: true })}`}
          </p>
          {note && <p className="text-xs text-slate-600 dark:text-slate-400">{note}</p>}
        </div>
      </div>
    </fieldset>
  );
};
