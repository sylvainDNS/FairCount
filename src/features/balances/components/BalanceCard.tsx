import { formatCurrency } from '@/shared/utils/format';
import type { Balance } from '../types';

interface BalanceCardProps {
  readonly balance: Balance;
  readonly currency: string;
}

export const BalanceCard = ({ balance, currency }: BalanceCardProps) => {
  const isPositive = balance.netBalance > 0;
  const isNegative = balance.netBalance < 0;

  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNegative
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-500 dark:text-slate-400';

  // Génère les initiales du nom
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Génère une couleur de fond basée sur le nom
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-rose-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <li
      className={`flex items-center justify-between p-4 ${
        balance.isCurrentUser ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(balance.memberName)}`}
        >
          {getInitials(balance.memberName)}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {balance.memberName}
            {balance.isCurrentUser && (
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                (vous)
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Payé : {formatCurrency(balance.totalPaid, currency)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className={`font-semibold ${colorClass}`}>
          {isPositive && '+'}
          {formatCurrency(balance.netBalance, currency)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Doit : {formatCurrency(balance.totalOwed, currency)}
        </p>
      </div>
    </li>
  );
};
