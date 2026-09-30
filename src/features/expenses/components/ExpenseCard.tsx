import { formatCurrency } from '@/shared/utils/format';
import type { ExpenseSummary } from '../types';
import { RepeatIcon } from './RepeatIcon';

interface ExpenseCardProps {
  readonly expense: ExpenseSummary;
  readonly currency: string;
  readonly onClick?: () => void;
}

export const ExpenseCard = ({ expense, currency, onClick }: ExpenseCardProps) => {
  const formattedDate = new Date(expense.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800 last:border-b-0 text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">{expense.description}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {expense.recurringExpenseId && (
            <>
              <RepeatIcon className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px align-middle" />
              <span className="sr-only">Dépense récurrente, </span>
            </>
          )}
          {formattedDate} · Payé par {expense.paidBy.name}
          {expense.paidBy.isJointAccount && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Compte commun
            </span>
          )}
        </p>
      </div>

      <div className="text-right shrink-0 ml-4">
        <p className="font-semibold text-slate-900 dark:text-white">
          {formatCurrency(expense.amount, currency)}
        </p>
        {expense.myShare !== null && (
          <p
            className={`text-sm ${
              expense.myShare > 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Ma part : {formatCurrency(expense.myShare, currency)}
          </p>
        )}
        {expense.myShare === null && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Non concerné·e</p>
        )}
      </div>
    </button>
  );
};
