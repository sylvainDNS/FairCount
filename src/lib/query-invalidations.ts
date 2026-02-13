import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Centralized cache invalidation functions for mutations.
 * Ensures cache consistency after each mutation.
 */
export const invalidations = {
  // Profile
  afterProfileUpdate: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
  },

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

  // Invitations
  afterInvitationSend: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  afterInvitationCancel: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  afterInvitationAccept: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.pending() });
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterInvitationDecline: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.pending() });
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  afterInvitationResend: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.list(groupId) });
  },

  // Members
  afterMemberUpdate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.suggestions(groupId) });
    // Income changes affect expense shares calculation
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
  },

  afterMemberRemove: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.suggestions(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  // Expenses
  afterExpenseCreate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.suggestions(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseUpdate: (queryClient: QueryClient, groupId: string, expenseId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(groupId, expenseId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.suggestions(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseDelete: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.suggestions(groupId) });
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
