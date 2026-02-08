import { useState } from 'react';
import { BalanceList, BalanceSummary, useBalances } from '@/features/balances';
import { SettlementHistory, SettlementSuggestions } from '@/features/settlements';

interface BalanceTabContentProps {
  readonly groupId: string;
  readonly currency: string;
}

export const BalanceTabContent = ({ groupId, currency }: BalanceTabContentProps) => {
  const { balances, myBalance, totalExpenses, isLoading, isValid } = useBalances(groupId);
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [showSettlementHistory, setShowSettlementHistory] = useState(false);

  return (
    <>
      {/* Balance summary */}
      <section className="mb-6">
        <BalanceSummary
          balance={myBalance}
          currency={currency}
          isLoading={isLoading}
          onViewDetail={() => setShowAllBalances((v) => !v)}
        />
      </section>

      {/* All balances (collapsible) */}
      {showAllBalances && (
        <section className="mb-6">
          <BalanceList
            balances={balances}
            totalExpenses={totalExpenses}
            currency={currency}
            isLoading={isLoading}
            isValid={isValid}
          />
        </section>
      )}

      {/* Settlements */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Remboursements</h2>
          <button
            type="button"
            onClick={() => setShowSettlementHistory((v) => !v)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showSettlementHistory ? "Masquer l'historique" : "Voir l'historique"}
          </button>
        </div>

        {showSettlementHistory ? (
          <SettlementHistory groupId={groupId} currency={currency} />
        ) : (
          <SettlementSuggestions groupId={groupId} currency={currency} />
        )}
      </section>
    </>
  );
};
