import { formatCurrency } from '@/shared/utils/format';
import type { SettlementListItem } from '../types';

interface SettlementCardProps {
  readonly settlement: SettlementListItem;
  readonly currency: string;
  readonly onDelete?: (() => void) | undefined;
}

export const SettlementCard = ({ settlement, currency, onDelete }: SettlementCardProps) => {
  const formattedDate = new Date(settlement.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  const isSent = settlement.fromMember.isCurrentUser;
  const isReceived = settlement.toMember.isCurrentUser;

  return (
    <div className="w-full p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              isSent
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : isReceived
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isSent ? '↑' : isReceived ? '↓' : '→'}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {settlement.fromMember.name} → {settlement.toMember.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{formattedDate}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        <p
          className={`font-semibold ${
            isSent
              ? 'text-red-600 dark:text-red-400'
              : isReceived
                ? 'text-green-600 dark:text-green-400'
                : 'text-slate-900 dark:text-white'
          }`}
        >
          {isSent ? '-' : isReceived ? '+' : ''}
          {formatCurrency(settlement.amount, currency)}
        </p>

        {isSent && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
            title="Annuler ce remboursement"
            aria-label="Annuler ce remboursement"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
