import { Collapsible } from '@ark-ui/react/collapsible';
import { twMerge } from 'tailwind-merge';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { Badge } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/format';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
import { useRecurrencesExpanded } from '../store/recurrences-expanded';
import type { RecurringExpenseSummary } from '../types';
import {
  formatDueDate,
  formatPausedReason,
  formatRecurrenceRule,
} from '../utils/format-recurrence-rule';
import { RepeatIcon } from './RepeatIcon';

interface RecurrenceSectionProps {
  readonly groupId: string;
  readonly currency: string;
  readonly onSelect: (recurringExpenseId: string) => void;
}

const countLabel = (count: number) => `${count} ${count > 1 ? 'récurrences' : 'récurrence'}`;

const metaLine = (recurrence: RecurringExpenseSummary): string => {
  if (recurrence.status === 'paused' && recurrence.pausedReason) {
    return formatPausedReason(recurrence.pausedReason, recurrence.paidBy);
  }
  return `${formatRecurrenceRule(recurrence.rule)} · Payé par ${recurrence.paidBy.name}`;
};

/**
 * Collapsible « Récurrences » card above the expense filters. Recurrences are
 * templates: they never count in totals, hence their own card and no « Ma part ».
 */
export const RecurrenceSection = ({ groupId, currency, onSelect }: RecurrenceSectionProps) => {
  const { recurringExpenses, isLoading, error } = useRecurringExpenses(groupId);
  const [expanded, setExpanded] = useRecurrencesExpanded();

  // The expense list must stay usable: this card simply stays out of the way
  if (isLoading || error || recurringExpenses.length === 0) return null;

  const today = todayIn(RECURRENCE_TIME_ZONE, new Date());
  const soonest = recurringExpenses.find((r) => r.status === 'active' && r.nextDueDate !== null);
  const toReview = recurringExpenses.filter((r) => r.status === 'paused').length;
  const nextLine = soonest?.nextDueDate
    ? `Prochaine échéance : ${formatDueDate(soonest.nextDueDate, today, { inSentence: true })} · ${soonest.description}`
    : 'Aucune échéance prévue';
  const triggerLabel = [
    countLabel(recurringExpenses.length),
    nextLine,
    ...(toReview > 0 ? [`${toReview} à revoir`] : []),
  ].join(', ');

  return (
    <Collapsible.Root
      open={expanded}
      onOpenChange={(details) => setExpanded(details.open)}
      lazyMount
      unmountOnExit
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <Collapsible.Trigger
        aria-label={triggerLabel}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-slate-800/50"
      >
        <RepeatIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900 dark:text-white">
            {countLabel(recurringExpenses.length)}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {nextLine}
          </span>
        </span>
        {toReview > 0 && (
          <Badge variant="warning" size="sm">
            {toReview} à revoir
          </Badge>
        )}
        <svg
          className={twMerge(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none',
            expanded && 'rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Collapsible.Trigger>

      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close motion-reduce:animate-none">
        <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {recurringExpenses.map((recurrence) => {
            const muted = recurrence.status === 'disabled';
            return (
              <li key={recurrence.id}>
                <button
                  type="button"
                  onClick={() => onSelect(recurrence.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={twMerge(
                        'block truncate font-medium',
                        muted
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-900 dark:text-white',
                      )}
                    >
                      {recurrence.description}
                    </span>
                    <span className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {metaLine(recurrence)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={twMerge(
                        'font-semibold',
                        muted
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-900 dark:text-white',
                      )}
                    >
                      {formatCurrency(recurrence.amount, currency)}
                    </span>
                    {recurrence.status === 'active' && recurrence.nextDueDate && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDueDate(recurrence.nextDueDate, today)}
                      </span>
                    )}
                    {recurrence.status === 'paused' && (
                      <Badge variant="warning" size="sm">
                        À revoir
                      </Badge>
                    )}
                    {recurrence.status === 'disabled' && <Badge size="sm">Désactivée</Badge>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
