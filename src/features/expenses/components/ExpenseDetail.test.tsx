import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExpenseDetail as ExpenseDetailType } from '../types';
import { ExpenseDetail } from './ExpenseDetail';

const state = vi.hoisted(() => ({ expense: null as ExpenseDetailType | null }));

vi.mock('../hooks/useExpense', () => ({
  useExpense: () => ({ expense: state.expense, isLoading: false, error: null }),
}));

const base: ExpenseDetailType = {
  id: 'e1',
  groupId: 'g1',
  paidBy: { id: 'alex', name: 'Alex', isCurrentUser: true, isJointAccount: false },
  amount: 2999,
  description: 'Internet',
  date: '2026-10-13',
  createdBy: { id: 'alex', name: 'Alex', isCurrentUser: true },
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
  participants: [],
  recurrence: null,
};

const renderDetail = (onOpenRecurrence = vi.fn()) =>
  render(
    <ExpenseDetail
      groupId="g1"
      expenseId="e1"
      currency="EUR"
      onClose={vi.fn()}
      onEditSuccess={vi.fn()}
      onDeleteRequest={vi.fn()}
      onOpenRecurrence={onOpenRecurrence}
    />,
  );

describe('ExpenseDetail — recurrence row', () => {
  beforeEach(() => {
    state.expense = base;
  });

  it('has no recurrence row for a manual expense', () => {
    renderDetail();
    expect(screen.queryByText('Récurrence')).not.toBeInTheDocument();
  });

  it('links to the recurrence that generated the expense', async () => {
    const user = userEvent.setup();
    const onOpenRecurrence = vi.fn();
    state.expense = {
      ...base,
      recurrence: { id: 'r1', rule: { frequency: 'monthly', dayOfMonth: 13 }, isDeleted: false },
    };
    renderDetail(onOpenRecurrence);

    expect(screen.getByText('Récurrence')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tous les mois, le 13' }));
    expect(onOpenRecurrence).toHaveBeenCalledWith('r1');
  });

  it('keeps the rule as plain text once the recurrence is deleted', () => {
    state.expense = {
      ...base,
      recurrence: { id: 'r1', rule: { frequency: 'monthly', dayOfMonth: 13 }, isDeleted: true },
    };
    renderDetail();

    expect(screen.getByText('Tous les mois, le 13')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tous les mois, le 13' })).not.toBeInTheDocument();
    expect(screen.getByText('Récurrence supprimée')).toBeInTheDocument();
  });
});
