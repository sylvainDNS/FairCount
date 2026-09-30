import { describe, expect, it, vi } from 'vitest';
import {
  type DueRecurrence,
  isUniqueRecurrenceConflict,
  type RunDeps,
  runRecurringExpenses,
} from './recurring-expense-generation';

describe('isUniqueRecurrenceConflict', () => {
  const uniqueMessage =
    'D1_ERROR: UNIQUE constraint failed: expenses.recurring_expense_id, expenses.recurrence_due_date: SQLITE_CONSTRAINT';

  it('recognises the échéance unique index violation', () => {
    expect(isUniqueRecurrenceConflict(new Error(uniqueMessage))).toBe(true);
  });

  it('looks into wrapped causes (Drizzle "Failed query" errors)', () => {
    expect(
      isUniqueRecurrenceConflict(
        new Error('Failed query: insert…', { cause: new Error(uniqueMessage) }),
      ),
    ).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isUniqueRecurrenceConflict(new Error('UNIQUE constraint failed: users.email'))).toBe(
      false,
    );
    expect(isUniqueRecurrenceConflict(new Error('network down'))).toBe(false);
    expect(isUniqueRecurrenceConflict('nope')).toBe(false);
  });
});

describe('runRecurringExpenses', () => {
  const now = new Date('2026-09-27T23:05:00Z'); // 2026-09-28 in Paris

  const due = (overrides: Partial<DueRecurrence>): DueRecurrence => ({
    id: 'r1',
    groupId: 'g1',
    paidBy: 'alex',
    amount: 1000,
    description: 'Café',
    createdBy: 'alex',
    rule: { frequency: 'daily' },
    nextDueDate: '2026-09-28',
    disabledAt: null,
    payerActive: true,
    groupArchived: false,
    ...overrides,
  });

  const makeDeps = (recurrences: DueRecurrence[], overrides: Partial<RunDeps> = {}): RunDeps => ({
    loadDue: vi.fn(async () => recurrences),
    loadParticipants: vi.fn(
      async (ids: readonly string[]) =>
        new Map(ids.map((id) => [id, [{ memberId: 'alex', customAmount: null }]])),
    ),
    loadActivePersonIds: vi.fn(async () => new Map([['g1', new Set(['alex'])]])),
    generate: vi.fn(async () => ({ generated: true, conflict: false })),
    skip: vi.fn(async () => {}),
    log: vi.fn(),
    ...overrides,
  });

  it('loads what is due on the Paris calendar day', async () => {
    const deps = makeDeps([]);
    await runRecurringExpenses(deps, now);
    expect(deps.loadDue).toHaveBeenCalledWith('2026-09-28');
  });

  it('generates each due date with a progressive cursor', async () => {
    const deps = makeDeps([due({ nextDueDate: '2026-09-27' })]);
    await runRecurringExpenses(deps, now);
    expect(deps.generate).toHaveBeenCalledTimes(2);
    expect(deps.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ dueDate: '2026-09-27', nextDueDate: '2026-09-28' }),
    );
    expect(deps.generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ dueDate: '2026-09-28', nextDueDate: '2026-09-29' }),
    );
  });

  it('skips paused recurrences and archived groups without generating', async () => {
    const deps = makeDeps([
      due({ id: 'paused', payerActive: false }),
      due({ id: 'archived', groupArchived: true }),
    ]);
    await runRecurringExpenses(deps, now);
    expect(deps.generate).not.toHaveBeenCalled();
    expect(deps.skip).toHaveBeenCalledWith('paused', '2026-09-29');
    expect(deps.skip).toHaveBeenCalledWith('archived', '2026-09-29');
  });

  it('isolates failures and reports every counter in one log line', async () => {
    const generate = vi
      .fn<RunDeps['generate']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ generated: false, conflict: true })
      .mockResolvedValueOnce({ generated: true, conflict: false });
    const deps = makeDeps(
      [due({ id: 'a' }), due({ id: 'b' }), due({ id: 'c' }), due({ id: 'd', payerActive: false })],
      { generate },
    );

    await runRecurringExpenses(deps, now);

    expect(generate).toHaveBeenCalledTimes(3);
    expect(deps.log).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith({
      event: 'recurring_expenses.run',
      today: '2026-09-28',
      selected: 4,
      generated: 1,
      skipped: 1,
      conflicts: 1,
      errors: 1,
    });
  });
});
