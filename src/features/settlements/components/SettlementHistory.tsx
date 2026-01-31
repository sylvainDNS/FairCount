import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { useInfiniteLoad } from '@/shared/hooks/useInfiniteLoad';
import { useSettlement } from '../hooks/useSettlement';
import { useSettlements } from '../hooks/useSettlements';
import type { SettlementFilter, SettlementSummary } from '../types';
import { SETTLEMENT_ERROR_MESSAGES } from '../types';
import { SettlementCard } from './SettlementCard';

interface SettlementHistoryProps {
  readonly groupId: string;
  readonly currency: string;
}

const FILTER_LABELS: Record<SettlementFilter, string> = {
  all: 'Tous',
  sent: 'Envoyés',
  received: 'Reçus',
};

export const SettlementHistory = ({ groupId, currency }: SettlementHistoryProps) => {
  const { settlements, isLoading, isLoadingMore, hasMore, filter, setFilter, loadMore, refresh } =
    useSettlements(groupId);
  const { remove } = useSettlement(groupId);

  const [settlementToDelete, setSettlementToDelete] = useState<SettlementSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Infinite scroll
  const sentinelRef = useInfiniteLoad<HTMLLIElement>({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  const handleDeleteConfirm = useCallback(async () => {
    if (!settlementToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await remove(settlementToDelete.id);

    if (!result.success) {
      setDeleteError(SETTLEMENT_ERROR_MESSAGES[result.error]);
      setIsDeleting(false);
      return;
    }

    setSettlementToDelete(null);
    setIsDeleting(false);
    refresh();
  }, [settlementToDelete, remove, refresh]);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {(Object.keys(FILTER_LABELS) as SettlementFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse p-4 border-b border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && settlements.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {filter === 'all' && 'Aucun remboursement enregistré'}
            {filter === 'sent' && "Vous n'avez envoyé aucun remboursement"}
            {filter === 'received' && "Vous n'avez reçu aucun remboursement"}
          </p>
        </div>
      )}

      {/* List of settlements */}
      {!isLoading && settlements.length > 0 && (
        <ul className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden list-none m-0 p-0">
          {settlements.map((settlement) => (
            <li key={settlement.id}>
              <SettlementCard
                settlement={settlement}
                currency={currency}
                onDelete={
                  settlement.fromMember.isCurrentUser
                    ? () => setSettlementToDelete(settlement)
                    : undefined
                }
              />
            </li>
          ))}

          {/* Sentinel for infinite scroll */}
          {hasMore && (
            <li ref={sentinelRef} className="p-4 text-center text-slate-500 dark:text-slate-400">
              {isLoadingMore ? 'Chargement...' : ''}
            </li>
          )}
        </ul>
      )}

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={settlementToDelete !== null}
        onOpenChange={(details) => !details.open && setSettlementToDelete(null)}
      >
        <Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <Dialog.Content className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Annuler ce remboursement ?
              </Dialog.Title>
              <Dialog.Description className="text-slate-500 dark:text-slate-400 mb-4">
                Cette action est irréversible. Le remboursement sera définitivement supprimé.
              </Dialog.Description>

              {deleteError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                  {deleteError}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSettlementToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};
