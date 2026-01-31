import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { formatCurrency } from '@/shared/utils/format';
import { useSettlement } from '../hooks/useSettlement';
import type { SettlementSuggestion } from '../types';
import { SettlementForm } from './SettlementForm';

interface SettlementSuggestionsProps {
  readonly groupId: string;
  readonly currency: string;
  readonly onSettlementCreated: () => void;
}

export const SettlementSuggestions = ({
  groupId,
  currency,
  onSettlementCreated,
}: SettlementSuggestionsProps) => {
  const { suggestions, isLoadingSuggestions, refreshSuggestions } = useSettlement(groupId);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SettlementSuggestion | null>(null);

  const handleFormSuccess = useCallback(() => {
    setSelectedSuggestion(null);
    refreshSuggestions();
    onSettlementCreated();
  }, [refreshSuggestions, onSettlementCreated]);

  // Memoize filtered suggestions
  const mySuggestions = useMemo(
    () => suggestions.filter((s) => s.from.isCurrentUser),
    [suggestions],
  );
  const otherSuggestions = useMemo(
    () => suggestions.filter((s) => !s.from.isCurrentUser),
    [suggestions],
  );

  // Loading
  if (isLoadingSuggestions) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Remboursements suggérés
        </h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No suggestions needed
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-6 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-600 dark:text-green-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-green-800 dark:text-green-200 font-medium">
          Tous les comptes sont équilibrés !
        </p>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Aucun remboursement nécessaire
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Remboursements suggérés ({suggestions.length})
      </h3>

      {/* My reimbursements (highlighted) */}
      {mySuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            À votre charge
          </p>
          {mySuggestions.map((suggestion) => (
            <div
              key={`my-${suggestion.from.id}-${suggestion.to.id}`}
              className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Vous → {suggestion.to.name}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold">
                  {formatCurrency(suggestion.amount, currency)}
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setSelectedSuggestion(suggestion)}>
                Marquer comme payé
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Other reimbursements */}
      {otherSuggestions.length > 0 && (
        <div className="space-y-2">
          {mySuggestions.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide pt-2">
              Autres remboursements
            </p>
          )}
          {otherSuggestions.map((suggestion) => (
            <div
              key={`other-${suggestion.from.id}-${suggestion.to.id}`}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {suggestion.from.name} → {suggestion.to.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatCurrency(suggestion.amount, currency)}
                </p>
              </div>
              {suggestion.to.isCurrentUser && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded">
                  Vous recevrez
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {selectedSuggestion && (
        <SettlementForm
          groupId={groupId}
          currency={currency}
          suggestion={selectedSuggestion}
          onSuccess={handleFormSuccess}
          onCancel={() => setSelectedSuggestion(null)}
        />
      )}
    </div>
  );
};
