import { Collapsible } from '@ark-ui/react/collapsible';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/format';
import type { MemberWithCoefficient } from '../types';

interface MemberCardProps {
  readonly member: MemberWithCoefficient;
  readonly currency: string;
  readonly onUpdateIncome?: (() => void) | undefined;
  readonly onRemove?: (() => void) | undefined;
}

export const MemberCard = ({ member, currency, onUpdateIncome, onRemove }: MemberCardProps) => {
  return (
    <Collapsible.Root className="border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <Collapsible.Trigger className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {member.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <span className="truncate">{member.name}</span>
              {member.isCurrentUser && (
                <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">(vous)</span>
              )}
              {!member.userId && (
                <Badge variant="warning" size="sm" className="shrink-0">
                  non inscrit·e
                </Badge>
              )}
            </p>
            {member.email && (
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="font-semibold text-slate-900 dark:text-white">
            {member.coefficientPercent}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(member.income, currency)}/mois
          </p>
        </div>
      </Collapsible.Trigger>

      <Collapsible.Content className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-800/30 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Revenu mensuel : {formatCurrency(member.income, currency)}
          </span>
          {onUpdateIncome && (
            <Button type="button" variant="ghost" size="sm" onClick={onUpdateIncome}>
              Modifier
            </Button>
          )}
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          Coefficient : {(member.coefficient / 10000).toFixed(4)} ({member.coefficientPercent}%)
        </div>

        {!member.userId && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Cette personne n'est pas encore inscrite sur FairCount
          </p>
        )}

        {onRemove && !member.isCurrentUser && (
          <Button type="button" variant="ghost-danger" size="sm" onClick={onRemove}>
            Retirer du groupe
          </Button>
        )}
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
