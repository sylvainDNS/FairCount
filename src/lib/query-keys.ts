/**
 * Query Key Factory - Centralized cache keys for TanStack Query.
 *
 * Naming convention:
 * - Level 1: Feature (groups, expenses, etc.)
 * - Level 2: Scope (all, detail, list)
 * - Level 3+: Parameters (groupId, expenseId, filters)
 */

import type { StatsPeriod } from '@/features/balances';
import type { ExpenseFiltersType } from '@/features/expenses';
import type { SettlementFilter } from '@/features/settlements';

export const queryKeys = {
  // Groups
  groups: {
    all: ['groups'] as const,
    list: () => [...queryKeys.groups.all, 'list'] as const,
    detail: (groupId: string) => [...queryKeys.groups.all, 'detail', groupId] as const,
  },

  // Invitations
  invitations: {
    all: ['invitations'] as const,
    byGroup: (groupId: string) => [...queryKeys.invitations.all, 'group', groupId] as const,
    list: (groupId: string) => [...queryKeys.invitations.byGroup(groupId), 'list'] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    byGroup: (groupId: string) => [...queryKeys.members.all, 'group', groupId] as const,
    list: (groupId: string) => [...queryKeys.members.byGroup(groupId), 'list'] as const,
  },

  // Expenses
  expenses: {
    all: ['expenses'] as const,
    byGroup: (groupId: string) => [...queryKeys.expenses.all, 'group', groupId] as const,
    infinite: (groupId: string, filters?: ExpenseFiltersType) =>
      [...queryKeys.expenses.byGroup(groupId), 'infinite', filters ?? {}] as const,
    detail: (groupId: string, expenseId: string) =>
      [...queryKeys.expenses.byGroup(groupId), 'detail', expenseId] as const,
  },

  // Balances
  balances: {
    all: ['balances'] as const,
    byGroup: (groupId: string) => [...queryKeys.balances.all, 'group', groupId] as const,
    list: (groupId: string) => [...queryKeys.balances.byGroup(groupId), 'list'] as const,
    myDetail: (groupId: string) => [...queryKeys.balances.byGroup(groupId), 'me'] as const,
    stats: (groupId: string, period?: StatsPeriod) =>
      [...queryKeys.balances.byGroup(groupId), 'stats', period ?? 'all'] as const,
  },

  // Settlements
  settlements: {
    all: ['settlements'] as const,
    byGroup: (groupId: string) => [...queryKeys.settlements.all, 'group', groupId] as const,
    infinite: (groupId: string, filter?: SettlementFilter) =>
      [...queryKeys.settlements.byGroup(groupId), 'infinite', filter ?? 'all'] as const,
    suggestions: (groupId: string) =>
      [...queryKeys.settlements.byGroup(groupId), 'suggestions'] as const,
  },
} as const;
