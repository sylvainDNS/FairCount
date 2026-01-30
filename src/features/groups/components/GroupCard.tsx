import type { GroupListItem } from '../types';

interface GroupCardProps {
  readonly group: GroupListItem;
}

export const GroupCard = ({ group }: GroupCardProps) => {
  const balanceColor =
    group.myBalance > 0
      ? 'text-green-600 dark:text-green-400'
      : group.myBalance < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-slate-500 dark:text-slate-400';

  const formatBalance = (amount: number) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: group.currency,
    }).format(Math.abs(amount) / 100);

    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `-${formatted}`;
    return formatted;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{group.name}</h3>
            {group.isArchived && (
              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                Archivé
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className={`text-lg font-semibold ${balanceColor}`}>
          {formatBalance(group.myBalance)}
        </div>
      </div>
    </div>
  );
};
