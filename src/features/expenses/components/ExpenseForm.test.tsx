import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { toaster } from '@/shared/components';
import type { ExpenseDetail, RecurringExpenseDetail } from '../types';
import { ExpenseForm } from './ExpenseForm';

// Stable references: a new array on each render would re-run the form's init effect forever
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  recurringCreate: vi.fn(),
  recurringUpdate: vi.fn(),
  recurringGet: vi.fn(),
  members: [
    {
      id: 'alex',
      name: 'Alex',
      email: null,
      userId: 'u1',
      income: 300000,
      coefficient: 6000,
      coefficientPercent: 60,
      joinedAt: new Date(),
      isCurrentUser: true,
    },
    {
      id: 'sam',
      name: 'Sam',
      email: null,
      userId: 'u2',
      income: 200000,
      coefficient: 4000,
      coefficientPercent: 40,
      joinedAt: new Date(),
      isCurrentUser: false,
    },
  ],
  group: { jointAccount: null },
}));

vi.mock('@/features/members/hooks/useMembers', () => ({
  useMembers: () => ({ members: mocks.members }),
}));

vi.mock('@/features/groups/hooks/useGroup', () => ({
  useGroup: () => ({ group: mocks.group }),
}));

vi.mock('../hooks/useExpense', () => ({
  useExpense: () => ({ create: mocks.create, update: mocks.update }),
}));

vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>();
  return {
    ...original,
    recurringExpensesApi: {
      create: mocks.recurringCreate,
      update: mocks.recurringUpdate,
      get: mocks.recurringGet,
    },
  };
});

const today = todayIn(RECURRENCE_TIME_ZONE, new Date());

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const renderForm = (
  expense?: ExpenseDetail,
  recurrence?: RecurringExpenseDetail,
  onSuccess = vi.fn(),
) =>
  render(
    <ExpenseForm
      groupId="g1"
      currency="EUR"
      expense={expense}
      recurrence={recurrence}
      onSuccess={onSuccess}
      onCancel={vi.fn()}
    />,
    { wrapper },
  );

const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/Montant/), '850');
  await user.type(screen.getByLabelText(/Description/), 'Loyer');
};

describe('ExpenseForm — repeat option', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ success: true, data: { id: 'e1' } });
    mocks.recurringCreate.mockReset().mockResolvedValue({
      id: 'r1',
      nextDueDate: '2099-01-01',
      generatedExpenseId: null,
    });
  });

  it('unchecked: no recurrence field, Date label kept, submits a plain expense', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole('checkbox', { name: 'Répéter cette dépense' })).not.toBeChecked();
    expect(screen.queryByRole('group', { name: 'Répétition' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Date/)).toBeInTheDocument();

    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.recurringCreate).not.toHaveBeenCalled();
  });

  it('checked: shows the block, relabels the date and creates a recurrence', async () => {
    const user = userEvent.setup();
    renderForm();

    await fillBasics(user);
    await user.click(screen.getByRole('checkbox', { name: 'Répéter cette dépense' }));

    expect(screen.getByRole('group', { name: 'Répétition' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^À partir du/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(mocks.recurringCreate).toHaveBeenCalledTimes(1));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.recurringCreate).toHaveBeenCalledWith('g1', {
      amount: 85000,
      description: 'Loyer',
      paidBy: 'alex',
      participants: [
        { memberId: 'alex', customAmount: null },
        { memberId: 'sam', customAmount: null },
      ],
      startDate: today,
      rule: { frequency: 'monthly', dayOfMonth: Number(today.slice(8, 10)) },
    });
  });

  it('yearly: the rule is derived from the start date', async () => {
    const user = userEvent.setup();
    renderForm();

    await fillBasics(user);
    await user.click(screen.getByRole('checkbox', { name: 'Répéter cette dépense' }));
    await user.click(screen.getByText('Année'));
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => expect(mocks.recurringCreate).toHaveBeenCalledTimes(1));
    expect(mocks.recurringCreate.mock.calls[0]?.[1].rule).toEqual({
      frequency: 'yearly',
      month: Number(today.slice(5, 7)),
      dayOfMonth: Number(today.slice(8, 10)),
    });
  });

  it('confirms with the next échéance, or « Dépense ajoutée » when one was generated today', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toaster, 'success');

    mocks.recurringCreate.mockResolvedValueOnce({
      id: 'r1',
      nextDueDate: '2099-10-13',
      generatedExpenseId: null,
    });
    const { unmount } = renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('checkbox', { name: 'Répéter cette dépense' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await waitFor(() =>
      expect(success).toHaveBeenLastCalledWith({
        title: 'Récurrence enregistrée',
        description: 'Prochaine échéance le 13 oct.',
      }),
    );
    unmount();

    mocks.recurringCreate.mockResolvedValueOnce({
      id: 'r2',
      nextDueDate: '2099-10-27',
      generatedExpenseId: 'e9',
    });
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('checkbox', { name: 'Répéter cette dépense' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await waitFor(() =>
      expect(success).toHaveBeenLastCalledWith({
        title: 'Dépense ajoutée',
        description: 'Prochaine échéance le 27 oct.',
      }),
    );
    success.mockRestore();
  });

  it('is not offered when editing an existing expense', () => {
    renderForm({
      id: 'e1',
      groupId: 'g1',
      paidBy: { id: 'alex', name: 'Alex', isCurrentUser: true, isJointAccount: false },
      amount: 1000,
      description: 'Courses',
      date: '2026-09-01',
      createdBy: { id: 'alex', name: 'Alex', isCurrentUser: true },
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      participants: [],
      recurrence: null,
    });
    expect(
      screen.queryByRole('checkbox', { name: 'Répéter cette dépense' }),
    ).not.toBeInTheDocument();
  });
});

const recurrence: RecurringExpenseDetail = {
  id: 'r1',
  description: 'Loyer',
  amount: 85000,
  rule: { frequency: 'monthly', dayOfMonth: 15 },
  startDate: '2026-01-01',
  nextDueDate: '2099-10-15',
  status: 'active',
  pausedReason: null,
  paidBy: { id: 'alex', name: 'Alex', isJointAccount: false, isActive: true },
  createdBy: { id: 'alex', name: 'Alex', isCurrentUser: true },
  participants: [
    {
      memberId: 'alex',
      memberName: 'Alex',
      customAmount: null,
      calculatedShare: 51000,
      isActive: true,
      isCurrentUser: true,
    },
    {
      memberId: 'sam',
      memberName: 'Sam',
      customAmount: null,
      calculatedShare: 34000,
      isActive: true,
      isCurrentUser: false,
    },
  ],
};

describe('ExpenseForm — recurrence edit mode', () => {
  beforeEach(() => {
    mocks.recurringUpdate
      .mockReset()
      .mockResolvedValue({ success: true, nextDueDate: '2099-10-01' });
    mocks.recurringGet.mockReset().mockResolvedValue(recurrence);
  });

  it('shows the recurrence fields without checkbox nor date, with the next échéance and a note', () => {
    renderForm(undefined, recurrence);

    expect(screen.getByRole('heading', { name: 'Modifier la récurrence' })).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Répéter cette dépense' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^À partir du/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Date/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Répétition' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Tous les mois, le 15');
    expect(screen.getByRole('status')).toHaveTextContent('Prochaine échéance');
    expect(
      screen.getByText(
        "Les changements s'appliquent aux prochaines échéances. Les dépenses déjà ajoutées ne changent pas.",
      ),
    ).toBeInTheDocument();
  });

  it('keeps the stored day instead of following the start date', () => {
    renderForm(undefined, recurrence);
    // startDate is the 1st: the stored 15 must win
    expect(screen.getByRole('combobox', { name: 'Jour du mois' })).toHaveTextContent('15');
  });

  it('sends only the changed fields', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderForm(undefined, recurrence, onSuccess);

    const amount = screen.getByLabelText(/Montant/);
    await user.clear(amount);
    await user.type(amount, '880');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));

    await waitFor(() => expect(mocks.recurringUpdate).toHaveBeenCalledTimes(1));
    expect(mocks.recurringUpdate).toHaveBeenCalledWith('g1', 'r1', { amount: 88000 });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('does not call the API when nothing changed', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderForm(undefined, recurrence, onSuccess);

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mocks.recurringUpdate).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — generated expense', () => {
  it('explains that editing it does not change the next ones', () => {
    renderForm({
      id: 'e1',
      groupId: 'g1',
      paidBy: { id: 'alex', name: 'Alex', isCurrentUser: true, isJointAccount: false },
      amount: 85000,
      description: 'Loyer',
      date: '2026-10-01',
      createdBy: { id: 'alex', name: 'Alex', isCurrentUser: true },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      participants: [],
      recurrence: { id: 'r1', rule: { frequency: 'monthly', dayOfMonth: 1 }, isDeleted: false },
    });
    expect(
      screen.getByText(
        'Ajoutée automatiquement par une récurrence. La modifier ne change pas les prochaines.',
      ),
    ).toBeInTheDocument();
  });
});
