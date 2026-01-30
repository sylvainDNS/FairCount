import { Tooltip } from '@ark-ui/react/tooltip';
import { formatCurrency } from '@/shared/utils/format';
import type { Balance } from '../types';
import { BalanceCard } from './BalanceCard';

interface BalanceListProps {
  readonly balances: Balance[];
  readonly totalExpenses: number;
  readonly currency: string;
  readonly isLoading?: boolean;
  readonly isValid?: boolean;
}

export const BalanceList = ({
  balances,
  totalExpenses,
  currency,
  isLoading,
  isValid = true,
}: BalanceListProps) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center shadow-sm border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400">Aucun membre dans ce groupe</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">Soldes du groupe</h3>
        {!isValid && (
          <Tooltip.Root openDelay={200} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded cursor-help flex items-center gap-1">
                Écart d'arrondi
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content className="w-64 p-3 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg z-50">
                <Tooltip.Arrow className="[--arrow-size:8px] [--arrow-background:var(--color-slate-900)]">
                  <Tooltip.ArrowTip className="dark:[--arrow-background:var(--color-slate-700)]" />
                </Tooltip.Arrow>
                La somme des soldes devrait être égale à zéro. Un léger écart peut survenir suite à
                des arrondis lors du calcul des parts.
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        )}
      </div>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {balances.map((balance) => (
          <BalanceCard key={balance.memberId} balance={balance} currency={currency} />
        ))}
      </ul>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Total des dépenses</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(totalExpenses, currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
