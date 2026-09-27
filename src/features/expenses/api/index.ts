import { fetchWithAuth } from '@/lib/api';
import type {
  CreateExpenseFormData,
  CreateRecurringExpenseData,
  CreateRecurringExpenseResult,
  ExpenseDetail,
  ExpenseFilters,
  ExpensesPage,
  ReactivateRecurringExpenseResult,
  RecurringExpenseDetail,
  RecurringExpenseSummary,
  UpdateExpenseFormData,
  UpdateRecurringExpenseData,
} from '../types';

export const expensesApi = {
  list: async (
    groupId: string,
    params?: ExpenseFilters & { cursor?: string; limit?: number },
  ): Promise<ExpensesPage | { error: string }> => {
    const searchParams = new URLSearchParams();

    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.paidBy) searchParams.set('paidBy', params.paidBy);
    if (params?.participantId) searchParams.set('participantId', params.participantId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.recurring) searchParams.set('recurring', 'true');

    const query = searchParams.toString();
    const url = `/groups/${groupId}/expenses${query ? `?${query}` : ''}`;

    const res = await fetchWithAuth(url);
    return res.json();
  },

  get: async (groupId: string, expenseId: string): Promise<ExpenseDetail | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/expenses/${expenseId}`);
    return res.json();
  },

  create: async (
    groupId: string,
    data: CreateExpenseFormData,
  ): Promise<{ id: string } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (
    groupId: string,
    expenseId: string,
    data: UpdateExpenseFormData,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  delete: async (
    groupId: string,
    expenseId: string,
  ): Promise<{ success: boolean } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};

export const recurringExpensesApi = {
  list: async (
    groupId: string,
  ): Promise<{ recurringExpenses: RecurringExpenseSummary[] } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/recurring-expenses`);
    return res.json();
  },

  get: async (
    groupId: string,
    recurringExpenseId: string,
  ): Promise<RecurringExpenseDetail | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/recurring-expenses/${recurringExpenseId}`);
    return res.json();
  },

  create: async (
    groupId: string,
    data: CreateRecurringExpenseData,
  ): Promise<CreateRecurringExpenseResult | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/recurring-expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (
    groupId: string,
    recurringExpenseId: string,
    data: UpdateRecurringExpenseData,
  ): Promise<{ success: true; nextDueDate: string } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/recurring-expenses/${recurringExpenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deactivate: async (
    groupId: string,
    recurringExpenseId: string,
  ): Promise<{ success: true } | { error: string }> => {
    const res = await fetchWithAuth(
      `/groups/${groupId}/recurring-expenses/${recurringExpenseId}/deactivate`,
      { method: 'POST' },
    );
    return res.json();
  },

  reactivate: async (
    groupId: string,
    recurringExpenseId: string,
  ): Promise<ReactivateRecurringExpenseResult | { error: string }> => {
    const res = await fetchWithAuth(
      `/groups/${groupId}/recurring-expenses/${recurringExpenseId}/reactivate`,
      { method: 'POST' },
    );
    return res.json();
  },

  delete: async (
    groupId: string,
    recurringExpenseId: string,
  ): Promise<{ success: true } | { error: string }> => {
    const res = await fetchWithAuth(`/groups/${groupId}/recurring-expenses/${recurringExpenseId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
