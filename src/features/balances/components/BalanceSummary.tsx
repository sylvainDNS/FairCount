import { formatCurrency } from '@/shared/utils/format';
import type { Balance } from '../types';

interface BalanceSummaryProps {
  readonly balance: Balance | null;
  readonly currency: string;
  readonly onViewDetail?: () => void;
  readonly isLoading?: boolean;
}

export const BalanceSummary = ({
  balance,
  currency,
  onViewDetail,
  isLoading,
}: BalanceSummaryProps) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64" />
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const isPositive = balance.netBalance > 0;
  const isNegative = balance.netBalance < 0;
  const isZero = balance.netBalance === 0;

  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';

  const bgClass = isPositive
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    : isNegative
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700';

  const getMessage = () => {
    if (isZero) {
      return 'Votre compte est équilibré';
    }
    if (isPositive) {
      return `On vous doit ${formatCurrency(balance.netBalance, currency)}`;
    }
    return `Vous devez ${formatCurrency(Math.abs(balance.netBalance), currency)}`;
  };

  const getIcon = () => {
    if (isPositive) {
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      );
    }
    if (isNegative) {
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  return (
    <div className={`rounded-xl p-6 border ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mon solde</span>
        <span className={colorClass}>{getIcon()}</span>
      </div>

      <p className={`text-3xl font-bold mb-1 ${colorClass}`}>
        {isPositive && '+'}
        {formatCurrency(balance.netBalance, currency)}
      </p>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{getMessage()}</p>

      {onViewDetail && (
        <button
          type="button"
          onClick={onViewDetail}
          aria-label="Voir le détail de mon solde"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Voir le détail →
        </button>
      )}
    </div>
  );
};
