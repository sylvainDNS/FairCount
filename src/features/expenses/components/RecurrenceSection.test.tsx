import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECURRENCE_TIME_ZONE, todayIn } from '@/lib/recurrence';
import { setRecurrencesExpanded } from '../store/recurrences-expanded';
import type { RecurringExpenseSummary } from '../types';
import { RecurrenceSection } from './RecurrenceSection';

const state = vi.hoisted(() => ({
  value: {
    recurringExpenses: [] as RecurringExpenseSummary[],
    isLoading: false,
    error: null as string | null,
  },
}));

vi.mock('../hooks/useRecurringExpenses', () => ({
  useRecurringExpenses: () => state.value,
}));

const today = todayIn(RECURRENCE_TIME_ZONE, new Date());

const recurrence = (overrides: Partial<RecurringExpenseSummary>): RecurringExpenseSummary => ({
  id: 'r1',
  description: 'Loyer',
  amount: 85000,
  rule: { frequency: 'monthly', dayOfMonth: 1 },
  startDate: '2026-01-01',
  nextDueDate: '2099-10-01',
  status: 'active',
  pausedReason: null,
  paidBy: { id: 'alex', name: 'Alex', isJointAccount: false, isActive: true },
  ...overrides,
});

const setList = (list: RecurringExpenseSummary[]) => {
  state.value = { recurringExpenses: list, isLoading: false, error: null };
};

const renderSection = (onSelect = vi.fn()) =>
  render(<RecurrenceSection groupId="g1" currency="EUR" onSelect={onSelect} />);

describe('RecurrenceSection', () => {
  beforeEach(() => {
    localStorage.clear();
    setRecurrencesExpanded(false);
    setList([]);
  });

  it('renders nothing without recurrences, while loading or on error', () => {
    const { container, rerender } = renderSection();
    expect(container).toBeEmptyDOMElement();

    state.value = { recurringExpenses: [recurrence({})], isLoading: true, error: null };
    rerender(<RecurrenceSection groupId="g1" currency="EUR" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();

    state.value = { recurringExpenses: [recurrence({})], isLoading: false, error: 'UNKNOWN_ERROR' };
    rerender(<RecurrenceSection groupId="g1" currency="EUR" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is collapsed by default with the count and the soonest échéance', () => {
    setList([
      recurrence({}),
      recurrence({ id: 'r2', description: 'Internet', nextDueDate: '2099-10-05' }),
      recurrence({ id: 'r3', description: 'Netflix', status: 'disabled', nextDueDate: null }),
    ]);
    renderSection();

    const trigger = screen.getByRole('button', { name: /3 récurrences/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAccessibleName(/Prochaine échéance : 1er oct\. · Loyer/);
    expect(screen.queryByText('Internet')).not.toBeInTheDocument();
  });

  it('uses the singular and flags recurrences to review', () => {
    setList([recurrence({ status: 'paused', pausedReason: 'payer_inactive', nextDueDate: null })]);
    renderSection();

    const trigger = screen.getByRole('button', { name: /1 récurrence\b/ });
    expect(within(trigger).getByText('1 à revoir')).toBeInTheDocument();
    expect(within(trigger).getByText('Aucune échéance prévue')).toBeInTheDocument();
  });

  it('expands to rows describing each recurrence', async () => {
    const user = userEvent.setup();
    setList([
      recurrence({ nextDueDate: today }),
      recurrence({
        id: 'r2',
        description: 'Électricité',
        status: 'paused',
        pausedReason: 'payer_inactive',
        nextDueDate: null,
      }),
      recurrence({
        id: 'r3',
        description: 'Assurance',
        status: 'paused',
        pausedReason: 'no_active_participant',
        nextDueDate: null,
      }),
      recurrence({ id: 'r4', description: 'Netflix', status: 'disabled', nextDueDate: null }),
    ]);
    renderSection();

    await user.click(screen.getByRole('button', { name: /4 récurrences/ }));
    expect(screen.getByRole('button', { name: /4 récurrences/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    const active = screen.getByRole('button', { name: /^Loyer/ });
    expect(active).toHaveTextContent('Tous les mois, le 1er · Payé par Alex');
    expect(active).toHaveTextContent('850,00');
    expect(active).toHaveTextContent("Aujourd'hui");

    const payerGone = screen.getByRole('button', { name: /^Électricité/ });
    expect(payerGone).toHaveTextContent('Alex a quitté le groupe');
    expect(payerGone).toHaveTextContent('À revoir');

    expect(screen.getByRole('button', { name: /^Assurance/ })).toHaveTextContent(
      'Plus aucun·e participant·e actif·ve',
    );
    expect(screen.getByRole('button', { name: /^Netflix/ })).toHaveTextContent('Désactivée');
  });

  it('calls onSelect with the recurrence id and remembers the expanded state', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    setList([recurrence({})]);
    const { unmount } = renderSection(onSelect);

    await user.click(screen.getByRole('button', { name: /1 récurrence\b/ }));
    await user.click(screen.getByRole('button', { name: /^Loyer/ }));
    expect(onSelect).toHaveBeenCalledWith('r1');

    unmount();
    renderSection();
    expect(screen.getByRole('button', { name: /1 récurrence\b/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
