import { formatCurrency } from '@/shared/utils/format';
import type { BalanceDetail as BalanceDetailType } from '../types';

interface BalanceDetailProps {
  readonly detail: BalanceDetailType | null;
  readonly currency: string;
  readonly isLoading?: boolean;
  readonly onExpenseClick?: (expenseId: string) => void;
}

export const BalanceDetail = ({
  detail,
  currency,
  isLoading,
  onExpenseClick,
}: BalanceDetailProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse"
          >
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40" />
          </div>
        ))}
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const { balance, expenses, settlements } = detail;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Décomposition du solde</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Total payé</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(balance.totalPaid, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Total dû</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              -{formatCurrency(balance.totalOwed, currency)}
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Balance brute</span>
            <span
              className={`font-medium ${
                balance.balance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {balance.balance >= 0 ? '+' : ''}
              {formatCurrency(balance.balance, currency)}
            </span>
          </div>
          {(balance.settlementsPaid > 0 || balance.settlementsReceived > 0) && (
            <>
              {balance.settlementsPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Remboursements effectués
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(balance.settlementsPaid, currency)}
                  </span>
                </div>
              )}
              {balance.settlementsReceived > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Remboursements reçus</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(balance.settlementsReceived, currency)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                <span className="font-medium text-slate-900 dark:text-white">Solde net</span>
                <span
                  className={`font-bold ${
                    balance.netBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {balance.netBalance >= 0 ? '+' : ''}
                  {formatCurrency(balance.netBalance, currency)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dépenses */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Mes dépenses ({expenses.length})
          </h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">Aucune dépense vous concernant</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {expenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => onExpenseClick?.(expense.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {expense.description}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(expense.date)} ·{' '}
                    {expense.isPayer ? 'Payé par vous' : `Payé par ${expense.paidBy.name}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(expense.amount, currency)}
                  </p>
                  <p
                    className={`text-sm ${
                      expense.isPayer
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {expense.isPayer
                      ? 'Payé'
                      : `Ma part : ${formatCurrency(expense.myShare, currency)}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remboursements */}
      {settlements.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Remboursements ({settlements.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {settlement.direction === 'sent' ? (
                      <>Envoyé à {settlement.otherMember.name}</>
                    ) : (
                      <>Reçu de {settlement.otherMember.name}</>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(settlement.date)}
                  </p>
                </div>
                <span
                  className={`font-semibold ${
                    settlement.direction === 'received'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {settlement.direction === 'received' ? '+' : '-'}
                  {formatCurrency(settlement.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
