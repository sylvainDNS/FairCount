import { useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { EmptyState, EmptyStateIcons } from '@/shared/components/EmptyState';
import { Skeleton } from '@/shared/components/Loading';
import { useInfiniteLoad } from '@/shared/hooks/useInfiniteLoad';
import { expensesApi } from '../api';
import { useExpenses } from '../hooks/useExpenses';
import type { ExpenseError, ExpenseSummary } from '../types';
import { EXPENSE_ERROR_MESSAGES } from '../types';
import { ExpenseCard } from './ExpenseCard';
import { ExpenseDetail } from './ExpenseDetail';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseForm } from './ExpenseForm';

interface ExpenseListProps {
  readonly groupId: string;
  readonly currency: string;
}

export const ExpenseList = ({ groupId, currency }: ExpenseListProps) => {
  const { expenses, isLoading, isLoadingMore, hasMore, filters, setFilters, loadMore, refresh } =
    useExpenses(groupId);

  const [selectedExpense, setSelectedExpense] = useState<ExpenseSummary | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sentinelRef = useInfiniteLoad<HTMLDivElement>({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  const handleExpenseClick = useCallback((expense: ExpenseSummary) => {
    setSelectedExpense(expense);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateForm(false);
    refresh();
  }, [refresh]);

  const handleEditSuccess = useCallback(() => {
    setSelectedExpense(null);
    refresh();
  }, [refresh]);

  const handleDeleteRequest = useCallback((expenseId: string) => {
    setExpenseToDelete(expenseId);
    setSelectedExpense(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!expenseToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await expensesApi.delete(groupId, expenseToDelete);

      if ('error' in result) {
        setDeleteError(
          EXPENSE_ERROR_MESSAGES[result.error as ExpenseError] ??
            EXPENSE_ERROR_MESSAGES.UNKNOWN_ERROR,
        );
      } else {
        setExpenseToDelete(null);
        refresh();
      }
    } catch {
      setDeleteError(EXPENSE_ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsDeleting(false);
    }
  }, [expenseToDelete, groupId, refresh]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dépenses</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-1 ml-auto" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dépenses</h2>
        <Button type="button" size="sm" onClick={() => setShowCreateForm(true)}>
          + Ajouter
        </Button>
      </div>

      {/* Filters */}
      <ExpenseFilters groupId={groupId} filters={filters} onFiltersChange={setFilters} />

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {Object.keys(filters).length > 0 ? (
            <EmptyState
              icon={<EmptyStateIcons.Search />}
              title="Aucun résultat"
              description="Aucune dépense ne correspond aux filtres appliqués."
            />
          ) : (
            <EmptyState
              icon={<EmptyStateIcons.Receipt />}
              title="Aucune dépense"
              description="Ajoutez votre première dépense pour commencer le suivi."
              action={{ label: 'Ajouter une dépense', onClick: () => setShowCreateForm(true) }}
            />
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <ul>
            {expenses.map((expense) => (
              <li key={expense.id}>
                <ExpenseCard
                  expense={expense}
                  currency={currency}
                  onClick={() => handleExpenseClick(expense)}
                />
              </li>
            ))}
          </ul>

          {/* Load more trigger - visible element that triggers loading */}
          {hasMore && (
            <div ref={sentinelRef} className="p-4 text-center">
              {isLoadingMore ? (
                <span className="text-sm text-slate-500 dark:text-slate-400">Chargement...</span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={loadMore}>
                  Charger plus
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && (
        <ExpenseForm
          groupId={groupId}
          currency={currency}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Detail modal */}
      {selectedExpense && (
        <ExpenseDetail
          groupId={groupId}
          expenseId={selectedExpense.id}
          currency={currency}
          onClose={() => setSelectedExpense(null)}
          onEditSuccess={handleEditSuccess}
          onDeleteRequest={handleDeleteRequest}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={expenseToDelete !== null}
        title="Supprimer la dépense"
        description={
          deleteError
            ? deleteError
            : 'Voulez-vous vraiment supprimer cette dépense ? Cette action est irréversible.'
        }
        confirmLabel="Supprimer"
        loadingText="Suppression..."
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setExpenseToDelete(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};
