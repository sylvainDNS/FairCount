import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurringExpenseDetail } from '../types';
import { RecurrenceDetail } from './RecurrenceDetail';

const state = vi.hoisted(() => ({
  recurrence: null as RecurringExpenseDetail | null,
  deactivate: vi.fn(),
  reactivate: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../hooks/useRecurringExpense', () => ({
  useRecurringExpense: () => ({
    recurrence: state.recurrence,
    isLoading: false,
    error: null,
    deactivate: state.deactivate,
    reactivate: state.reactivate,
    remove: state.remove,
    update: state.update,
  }),
}));

// The edit mode renders ExpenseForm, which is covered by its own tests
vi.mock('./ExpenseForm', () => ({
  ExpenseForm: () => <div>Formulaire de récurrence</div>,
}));

const active: RecurringExpenseDetail = {
  id: 'r1',
  description: 'Loyer',
  amount: 85000,
  rule: { frequency: 'monthly', dayOfMonth: 1 },
  startDate: '2026-01-01',
  nextDueDate: '2099-10-01',
  status: 'active',
  pausedReason: null,
  paidBy: { id: 'alex', name: 'Alex', isJointAccount: false, isActive: true },
  createdBy: { id: 'sam', name: 'Sam', isCurrentUser: false },
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

const renderDetail = (onClose = vi.fn()) =>
  render(
    <RecurrenceDetail groupId="g1" recurringExpenseId="r1" currency="EUR" onClose={onClose} />,
  );

const resetActions = () => {
  for (const fn of [state.deactivate, state.reactivate, state.remove, state.update]) {
    fn.mockReset().mockResolvedValue({ success: true });
  }
};

describe('RecurrenceDetail (read-only)', () => {
  beforeEach(() => {
    state.recurrence = active;
    resetActions();
  });

  it('shows the description, amount, rule and next échéance of an active recurrence', () => {
    renderDetail();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Loyer' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('850,00');
    expect(dialog).toHaveTextContent('Tous les mois, le 1er');
    expect(dialog).toHaveTextContent('Prochaine échéance');
    expect(dialog).toHaveTextContent('Payé par');
    expect(dialog).toHaveTextContent('Créée par');
    expect(within(dialog).queryByText('À revoir')).not.toBeInTheDocument();
  });

  it('explains a pause calmly, without the next échéance', () => {
    state.recurrence = {
      ...active,
      status: 'paused',
      pausedReason: 'payer_inactive',
      nextDueDate: null,
      paidBy: { ...active.paidBy, isActive: false },
    };
    renderDetail();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('À revoir')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Alex a quitté le groupe');
    expect(dialog).toHaveTextContent(
      'Choisissez une autre personne qui paie pour relancer la récurrence.',
    );
    expect(dialog).not.toHaveTextContent('Prochaine échéance');
  });

  it('labels a disabled recurrence', () => {
    state.recurrence = { ...active, status: 'disabled', nextDueDate: null };
    renderDetail();
    expect(within(screen.getByRole('dialog')).getByText('Désactivée')).toBeInTheDocument();
  });

  it('offers a close button', () => {
    renderDetail();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });
});

describe('RecurrenceDetail — actions', () => {
  beforeEach(() => {
    state.recurrence = active;
    resetActions();
  });

  it('active: Fermer + Modifier, then Désactiver and Supprimer on a separate row', () => {
    renderDetail();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Désactiver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer la récurrence' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réactiver' })).not.toBeInTheDocument();
  });

  it('disabled: Réactiver becomes the main action', () => {
    state.recurrence = { ...active, status: 'disabled', nextDueDate: null };
    renderDetail();
    expect(screen.getByRole('button', { name: 'Réactiver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver' })).not.toBeInTheDocument();
  });

  it('deactivates and reactivates immediately, without confirmation', async () => {
    const user = userEvent.setup();
    const { unmount } = renderDetail();
    await user.click(screen.getByRole('button', { name: 'Désactiver' }));
    expect(state.deactivate).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('dialog', { name: 'Supprimer la récurrence' }),
    ).not.toBeInTheDocument();
    unmount();

    state.recurrence = { ...active, status: 'disabled', nextDueDate: null };
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Réactiver' }));
    expect(state.reactivate).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before deleting, then closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDetail(onClose);

    await user.click(screen.getByRole('button', { name: 'Supprimer la récurrence' }));
    const confirm = await screen.findByRole('dialog', { name: 'Supprimer la récurrence' });
    expect(confirm).toHaveTextContent(
      'Aucune nouvelle dépense ne sera ajoutée. Les dépenses déjà ajoutées restent dans la liste.',
    );
    expect(state.remove).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Supprimer' }));
    expect(state.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('opens the edit form from Modifier', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByText('Formulaire de récurrence')).toBeInTheDocument();
  });
});
