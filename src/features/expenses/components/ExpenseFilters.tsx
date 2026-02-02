import { Collapsible } from '@ark-ui/react/collapsible';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMembers } from '@/features/members/hooks/useMembers';
import { TextInput } from '@/shared/components/TextInput';
import type { ExpenseFilters as FilterType } from '../types';

interface ExpenseFiltersProps {
  readonly groupId: string;
  readonly filters: FilterType;
  readonly onFiltersChange: (filters: FilterType) => void;
}

type PeriodPreset = 'all' | 'this-month' | 'last-month' | 'custom';

const PERIOD_OPTIONS: readonly {
  readonly value: Exclude<PeriodPreset, 'custom'>;
  readonly label: string;
}[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'this-month', label: 'Ce mois' },
  { value: 'last-month', label: 'Mois dernier' },
];

export const ExpenseFilters = ({ groupId, filters, onFiltersChange }: ExpenseFiltersProps) => {
  const { members } = useMembers(groupId);
  const [isOpen, setIsOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  // Ref to access current filters without causing effect re-runs
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentFilters = filtersRef.current;
      if (searchValue !== (currentFilters.search ?? '')) {
        onFiltersChange({ ...currentFilters, search: searchValue || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onFiltersChange]);

  const handlePeriodChange = useCallback(
    (preset: PeriodPreset) => {
      setPeriodPreset(preset);

      const now = new Date();
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (preset === 'this-month') {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        endDate = undefined;
      } else if (preset === 'last-month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
        endDate = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;
      } else if (preset === 'all') {
        startDate = undefined;
        endDate = undefined;
      }

      onFiltersChange({ ...filters, startDate, endDate });
    },
    [filters, onFiltersChange],
  );

  const handlePayerChange = useCallback(
    (paidBy: string) => {
      onFiltersChange({ ...filters, paidBy: paidBy || undefined });
    },
    [filters, onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    setPeriodPreset('all');
    setSearchValue('');
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = filters.startDate || filters.endDate || filters.paidBy || filters.search;

  // Period tab keyboard navigation
  const periodTabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handlePeriodKeyDown = useCallback(
    (e: KeyboardEvent, index: number) => {
      let newIndex = index;

      if (e.key === 'ArrowRight') {
        newIndex = (index + 1) % PERIOD_OPTIONS.length;
      } else if (e.key === 'ArrowLeft') {
        newIndex = (index - 1 + PERIOD_OPTIONS.length) % PERIOD_OPTIONS.length;
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = PERIOD_OPTIONS.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      periodTabsRef.current[newIndex]?.focus();
      handlePeriodChange(PERIOD_OPTIONS[newIndex].value);
    },
    [handlePeriodChange],
  );

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <div className="flex items-center gap-2">
        <Collapsible.Trigger className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtres
          {hasActiveFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
        </Collapsible.Trigger>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Effacer
          </button>
        )}
      </div>

      <Collapsible.Content className="mt-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Search */}
        <div>
          <label
            htmlFor="expense-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Rechercher
          </label>
          <TextInput
            id="expense-search"
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Description..."
          />
        </div>

        {/* Period */}
        <div>
          <span
            id="period-filter-label"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Période
          </span>
          <div
            role="tablist"
            aria-labelledby="period-filter-label"
            className="flex flex-wrap gap-2"
          >
            {PERIOD_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                ref={(el) => {
                  periodTabsRef.current[index] = el;
                }}
                type="button"
                role="tab"
                aria-selected={periodPreset === option.value}
                tabIndex={periodPreset === option.value ? 0 : -1}
                onClick={() => handlePeriodChange(option.value)}
                onKeyDown={(e) => handlePeriodKeyDown(e, index)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  periodPreset === option.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payer filter */}
        <div>
          <label
            htmlFor="expense-payer"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Payé par
          </label>
          <select
            id="expense-payer"
            value={filters.paidBy ?? ''}
            onChange={(e) => handlePayerChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les membres</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
                {member.isCurrentUser ? ' (vous)' : ''}
              </option>
            ))}
          </select>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
};
