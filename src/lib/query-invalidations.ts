import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Centralized cache invalidation functions for mutations.
 * Ensures cache consistency after each mutation.
 */
export const invalidations = {
  // Groups
  afterGroupCreate: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupUpdate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupArchive: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupDelete: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  },

  afterGroupLeave: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  },

  // Members
  afterMemberUpdate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
  },

  afterMemberRemove: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  // Expenses
  afterExpenseCreate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseUpdate: (queryClient: QueryClient, groupId: string, expenseId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(groupId, expenseId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseDelete: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  // Settlements
  afterSettlementCreate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterSettlementDelete: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },
};
