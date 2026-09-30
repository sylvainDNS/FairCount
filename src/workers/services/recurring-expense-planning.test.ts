import { describe, expect, it } from 'vitest';
import { MAX_CATCH_UP_PER_RUN } from '@/lib/recurrence';
import {
  buildGeneratedExpense,
  columnsToRule,
  deriveRecurrenceStatus,
  planRecurrenceRun,
  recomputeNextDueDate,
  resolveUpdatedRule,
  ruleToColumns,
  sortRecurrences,
  toRecurringExpenseView,
  validateRecurringExpenseInput,
} from './recurring-expense-planning';
import { calculatePaidShares } from './shared/balance-calculation';
import { calculateShares } from './shared/share-calculation';

describe('deriveRecurrenceStatus', () => {
  it('is disabled when disabledAt is set, whatever the pause conditions', () => {
    expect(
      deriveRecurrenceStatus({
        disabledAt: new Date(),
        payerActive: false,
        activeParticipantCount: 0,
      }),
    ).toEqual({ status: 'disabled', pausedReason: null });
  });

  it('is paused when the payer is inactive (checked first)', () => {
    expect(
      deriveRecurrenceStatus({ disabledAt: null, payerActive: false, activeParticipantCount: 0 }),
    ).toEqual({ status: 'paused', pausedReason: 'payer_inactive' });
  });

  it('is paused when no participant is an active person', () => {
    expect(
      deriveRecurrenceStatus({ disabledAt: null, payerActive: true, activeParticipantCount: 0 }),
    ).toEqual({ status: 'paused', pausedReason: 'no_active_participant' });
  });

  it('is active otherwise', () => {
    expect(
      deriveRecurrenceStatus({ disabledAt: null, payerActive: true, activeParticipantCount: 2 }),
    ).toEqual({ status: 'active', pausedReason: null });
  });
});

describe('sortRecurrences', () => {
  it('orders active by next échéance, then paused, then disabled, ties by description', () => {
    const list = [
      { id: 'd', status: 'disabled', nextDueDate: null, description: 'Netflix' },
      { id: 'p', status: 'paused', nextDueDate: null, description: 'Assurance' },
      { id: 'a2', status: 'active', nextDueDate: '2026-10-05', description: 'Internet' },
      { id: 'a1', status: 'active', nextDueDate: '2026-10-01', description: 'Loyer' },
      { id: 'a0', status: 'active', nextDueDate: '2026-10-01', description: 'Électricité' },
    ] as const;

    expect(sortRecurrences(list).map((r) => r.id)).toEqual(['a0', 'a1', 'a2', 'p', 'd']);
  });

  it('does not mutate its input', () => {
    const list = [
      { id: 'b', status: 'paused' as const, nextDueDate: null, description: 'B' },
      { id: 'a', status: 'active' as const, nextDueDate: '2026-10-01', description: 'A' },
    ];
    sortRecurrences(list);
    expect(list.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('resolveUpdatedRule', () => {
  it('keeps the existing rule when none is sent', () => {
    expect(resolveUpdatedRule({ frequency: 'daily' }, undefined, '2026-09-27')).toEqual({
      frequency: 'daily',
    });
  });

  it('forces a yearly rule to the start date month and day', () => {
    expect(
      resolveUpdatedRule(
        { frequency: 'daily' },
        { frequency: 'yearly', month: 1, dayOfMonth: 1 },
        '2026-09-27',
      ),
    ).toEqual({ frequency: 'yearly', month: 9, dayOfMonth: 27 });
  });

  it('takes any other rule as is', () => {
    expect(
      resolveUpdatedRule(
        { frequency: 'daily' },
        { frequency: 'monthly', dayOfMonth: 13 },
        '2026-09-27',
      ),
    ).toEqual({ frequency: 'monthly', dayOfMonth: 13 });
  });
});

describe('recomputeNextDueDate', () => {
  it('starts from today once the start date is past', () => {
    expect(
      recomputeNextDueDate({ frequency: 'monthly', dayOfMonth: 13 }, '2026-01-01', '2026-09-27'),
    ).toBe('2026-10-13');
  });

  it('starts from the start date when it is in the future', () => {
    expect(recomputeNextDueDate({ frequency: 'daily' }, '2026-10-01', '2026-09-27')).toBe(
      '2026-10-01',
    );
  });
});

describe('validateRecurringExpenseInput', () => {
  const today = '2026-09-27';
  const alex = 'alex';
  const sam = 'sam';
  const activePersonIds = new Set([alex, sam]);
  const activePayer = { id: alex, active: true };

  const createData = {
    amount: 85000,
    description: '  Loyer  ',
    paidBy: alex,
    participants: [
      { memberId: alex, customAmount: null },
      { memberId: sam, customAmount: null },
    ],
    startDate: '2026-10-01',
    rule: { frequency: 'monthly', dayOfMonth: 1 } as const,
  };

  const existing = {
    amount: 85000,
    description: 'Loyer',
    paidBy: alex,
    participants: [
      { memberId: alex, customAmount: 30000 },
      { memberId: sam, customAmount: null },
    ],
    rule: { frequency: 'monthly', dayOfMonth: 1 } as const,
    startDate: '2026-01-01',
  };

  it('accepts a valid creation and computes the first échéance', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: createData,
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({
      ok: true,
      value: {
        amount: 85000,
        description: 'Loyer',
        paidBy: alex,
        participants: createData.participants,
        rule: { frequency: 'monthly', dayOfMonth: 1 },
        startDate: '2026-10-01',
        nextDueDate: '2026-10-01',
      },
    });
  });

  it('rejects a start date in the past', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: { ...createData, startDate: '2026-09-26' },
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'START_DATE_IN_PAST' });
  });

  it('accepts a start date of today', () => {
    const result = validateRecurringExpenseInput({
      mode: 'create',
      data: { ...createData, startDate: today, rule: { frequency: 'daily' } },
      today,
      payer: activePayer,
      activePersonIds,
    });
    expect(result.ok && result.value.nextDueDate).toBe(today);
  });

  it('rejects a yearly rule that does not match the start date', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: { ...createData, rule: { frequency: 'yearly', month: 1, dayOfMonth: 1 } },
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'INVALID_RULE' });
  });

  it('rejects an empty description after trimming', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: { ...createData, description: '   ' },
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'INVALID_DESCRIPTION' });
  });

  it('rejects a missing or inactive payer at creation', () => {
    for (const payer of [null, { id: alex, active: false }]) {
      expect(
        validateRecurringExpenseInput({
          mode: 'create',
          data: createData,
          today,
          payer,
          activePersonIds,
        }),
      ).toEqual({ ok: false, error: 'INVALID_PAYER' });
    }
  });

  it('rejects participants that are not active persons (e.g. the joint account)', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: { ...createData, participants: [{ memberId: 'joint', customAmount: null }] },
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'INVALID_PARTICIPANT' });
  });

  it('rejects custom amounts above the total', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'create',
        data: {
          ...createData,
          amount: 1000,
          participants: [{ memberId: alex, customAmount: 1001 }],
        },
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'CUSTOM_AMOUNTS_EXCEED_TOTAL' });
  });

  it('update: an amount-only change is checked against the stored custom amounts', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'update',
        data: { amount: 20000 },
        existing,
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'CUSTOM_AMOUNTS_EXCEED_TOTAL' });
  });

  it('update: keeps an unchanged payer even if inactive', () => {
    const result = validateRecurringExpenseInput({
      mode: 'update',
      data: { description: 'Loyer 2027' },
      existing,
      today,
      payer: { id: alex, active: false },
      activePersonIds,
    });
    expect(result.ok).toBe(true);
  });

  it('update: rejects a changed payer that is inactive', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'update',
        data: { paidBy: sam },
        existing,
        today,
        payer: { id: sam, active: false },
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'INVALID_PAYER' });
  });

  it('update: merges data over existing, forces yearly from the start date, recomputes the échéance', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'update',
        data: { amount: 88000, rule: { frequency: 'yearly', month: 3, dayOfMonth: 3 } },
        existing,
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({
      ok: true,
      value: {
        amount: 88000,
        description: 'Loyer',
        paidBy: alex,
        participants: existing.participants,
        rule: { frequency: 'yearly', month: 1, dayOfMonth: 1 },
        startDate: '2026-01-01',
        nextDueDate: '2027-01-01',
      },
    });
  });

  it('update: does not announce today again once today was processed (cursor ahead)', () => {
    const result = validateRecurringExpenseInput({
      mode: 'update',
      data: { amount: 90000, rule: { frequency: 'daily' } },
      existing: { ...existing, nextDueDate: '2026-09-28' },
      today,
      payer: activePayer,
      activePersonIds,
    });
    expect(result.ok && result.value.nextDueDate).toBe('2026-09-28');
  });

  it('update: keeps today when today was not processed yet', () => {
    const result = validateRecurringExpenseInput({
      mode: 'update',
      data: { rule: { frequency: 'daily' } },
      existing: { ...existing, nextDueDate: today },
      today,
      payer: activePayer,
      activePersonIds,
    });
    expect(result.ok && result.value.nextDueDate).toBe(today);
  });

  it('update: new participants are validated against active persons', () => {
    expect(
      validateRecurringExpenseInput({
        mode: 'update',
        data: { participants: [] },
        existing,
        today,
        payer: activePayer,
        activePersonIds,
      }),
    ).toEqual({ ok: false, error: 'NO_PARTICIPANTS' });
  });
});

describe('ruleToColumns / columnsToRule', () => {
  it.each([
    [
      { frequency: 'daily' } as const,
      { frequency: 'daily', dayOfWeek: null, dayOfMonth: null, month: null } as const,
    ],
    [
      { frequency: 'weekly', dayOfWeek: 5 } as const,
      { frequency: 'weekly', dayOfWeek: 5, dayOfMonth: null, month: null } as const,
    ],
    [
      { frequency: 'monthly', dayOfMonth: 13 } as const,
      { frequency: 'monthly', dayOfWeek: null, dayOfMonth: 13, month: null } as const,
    ],
    [
      { frequency: 'yearly', month: 9, dayOfMonth: 27 } as const,
      { frequency: 'yearly', dayOfWeek: null, dayOfMonth: 27, month: 9 } as const,
    ],
  ])('round-trips %o', (rule, columns) => {
    expect(ruleToColumns(rule)).toEqual(columns);
    expect(columnsToRule(columns)).toEqual(rule);
  });

  it('falls back to safe anchors when a stored column is missing', () => {
    expect(
      columnsToRule({ frequency: 'weekly', dayOfWeek: null, dayOfMonth: null, month: null }),
    ).toEqual({ frequency: 'weekly', dayOfWeek: 1 });
  });
});

describe('planRecurrenceRun', () => {
  const daily = { frequency: 'daily' } as const;
  const today = '2026-09-27';

  it('does nothing while the next échéance is ahead', () => {
    expect(
      planRecurrenceRun({
        rule: daily,
        nextDueDate: '2026-09-28',
        today,
        status: 'active',
        groupArchived: false,
      }),
    ).toEqual({ kind: 'none' });
  });

  it('generates every missed échéance through today and moves the cursor after the last', () => {
    expect(
      planRecurrenceRun({
        rule: daily,
        nextDueDate: '2026-09-25',
        today,
        status: 'active',
        groupArchived: false,
      }),
    ).toEqual({
      kind: 'generate',
      dates: ['2026-09-25', '2026-09-26', '2026-09-27'],
      nextDueDate: '2026-09-28',
    });
  });

  it('caps the catch-up and leaves the cursor on the first échéance not generated', () => {
    const plan = planRecurrenceRun({
      rule: daily,
      nextDueDate: '2026-08-01',
      today,
      status: 'active',
      groupArchived: false,
    });
    expect(plan.kind === 'generate' && plan.dates.length).toBe(MAX_CATCH_UP_PER_RUN);
    expect(plan.kind === 'generate' && plan.nextDueDate).toBe('2026-09-01');
  });

  it.each([
    ['paused', 'paused', false],
    ['disabled', 'disabled', false],
    ['in an archived group', 'active', true],
  ] as const)('skips without catch-up when %s', (_label, status, groupArchived) => {
    expect(
      planRecurrenceRun({
        rule: { frequency: 'monthly', dayOfMonth: 1 },
        nextDueDate: '2026-06-01',
        today,
        status,
        groupArchived,
      }),
    ).toEqual({ kind: 'skip', nextDueDate: '2026-10-01' });
  });

  it('skips today when the group is archived at creation/reactivation (FR-015)', () => {
    expect(
      planRecurrenceRun({
        rule: daily,
        nextDueDate: today,
        today,
        status: 'active',
        groupArchived: true,
      }),
    ).toEqual({ kind: 'skip', nextDueDate: '2026-09-28' });
  });
});

describe('buildGeneratedExpense', () => {
  const recurrence = {
    id: 'rec-1',
    groupId: 'g1',
    paidBy: 'alex',
    amount: 12000,
    description: 'Internet',
    createdBy: 'sam',
  };
  const now = new Date('2026-09-27T23:05:00Z');
  let seq = 0;
  const newId = () => `id-${++seq}`;

  it('builds an ordinary expense dated on the échéance and linked to it', () => {
    seq = 0;
    const { expense, participants } = buildGeneratedExpense({
      recurrence,
      participants: [
        { memberId: 'alex', customAmount: null },
        { memberId: 'gone', customAmount: 2000 },
        { memberId: 'sam', customAmount: 3000 },
      ],
      activePersonIds: new Set(['alex', 'sam', 'charlie']),
      dueDate: '2026-10-13',
      now,
      newId,
    });

    expect(expense).toEqual({
      id: 'id-1',
      groupId: 'g1',
      paidBy: 'alex',
      amount: 12000,
      description: 'Internet',
      date: '2026-10-13',
      recurringExpenseId: 'rec-1',
      recurrenceDueDate: '2026-10-13',
      createdBy: 'sam',
      createdAt: now,
      updatedAt: now,
    });
    // Departed beneficiaries are excluded; custom amounts are kept
    expect(participants).toEqual([
      { id: 'id-2', expenseId: 'id-1', memberId: 'alex', customAmount: null },
      { id: 'id-3', expenseId: 'id-1', memberId: 'sam', customAmount: 3000 },
    ]);
  });

  it('keeps the group balance sum at exactly 0 (Principle I)', () => {
    // Alex 3 000 €, Sam 2 000 €, Charlie 1 000 € → coefficients 5000 / 3333 / 1667
    const coefficients = new Map([
      ['alex', 5000],
      ['sam', 3333],
      ['charlie', 1667],
    ]);
    const active = new Set(coefficients.keys());
    const cases = [
      {
        amount: 12000,
        participants: [...active].map((m) => ({ memberId: m, customAmount: null })),
      },
      { amount: 1001, participants: [...active].map((m) => ({ memberId: m, customAmount: null })) },
      {
        amount: 8999,
        participants: [
          { memberId: 'alex', customAmount: 1234 },
          { memberId: 'sam', customAmount: null },
          { memberId: 'charlie', customAmount: null },
        ],
      },
    ];

    const net = new Map<string, number>();
    for (const [index, c] of cases.entries()) {
      const { expense, participants } = buildGeneratedExpense({
        recurrence: { ...recurrence, amount: c.amount, paidBy: index === 1 ? 'charlie' : 'alex' },
        participants: c.participants,
        activePersonIds: active,
        dueDate: '2026-10-01',
        now,
        newId,
      });
      const owed = calculateShares(expense.amount, participants, coefficients);
      const paid = calculatePaidShares(expense, false, [...active], coefficients);
      expect([...owed.values()].reduce((a, b) => a + b, 0)).toBe(expense.amount);
      for (const id of active) {
        net.set(id, (net.get(id) ?? 0) + (paid.get(id) ?? 0) - (owed.get(id) ?? 0));
      }
    }

    expect([...net.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe('toRecurringExpenseView', () => {
  const row = {
    id: 'r1',
    description: 'Loyer',
    amount: 90000,
    frequency: 'monthly' as const,
    dayOfWeek: null,
    dayOfMonth: 1,
    month: null,
    startDate: '2026-01-01',
    nextDueDate: '2026-10-01',
    disabledAt: null,
  };
  const payer = { id: 'alex', name: 'Alex', isJointAccount: false, leftAt: null };
  const participants = [
    { memberId: 'alex', memberName: 'Alex', customAmount: null },
    { memberId: 'sam', memberName: 'Sam', customAmount: null },
    { memberId: 'gone', memberName: 'Charlie', customAmount: 1000 },
  ];
  const coefficients = new Map([
    ['alex', 6000],
    ['sam', 3000],
    ['gone', 1000],
  ]);
  const activePersonIds = new Set(['alex', 'sam']);

  it('describes an active recurrence and the split of an expense generated now', () => {
    expect(
      toRecurringExpenseView({
        row,
        payer,
        participants,
        coefficients,
        activePersonIds,
        currentMemberId: 'sam',
      }),
    ).toEqual({
      id: 'r1',
      description: 'Loyer',
      amount: 90000,
      rule: { frequency: 'monthly', dayOfMonth: 1 },
      startDate: '2026-01-01',
      nextDueDate: '2026-10-01',
      status: 'active',
      pausedReason: null,
      paidBy: { id: 'alex', name: 'Alex', isJointAccount: false, isActive: true },
      participants: [
        {
          memberId: 'alex',
          memberName: 'Alex',
          customAmount: null,
          calculatedShare: 60000,
          isActive: true,
          isCurrentUser: false,
        },
        {
          memberId: 'sam',
          memberName: 'Sam',
          customAmount: null,
          calculatedShare: 30000,
          isActive: true,
          isCurrentUser: true,
        },
        {
          memberId: 'gone',
          memberName: 'Charlie',
          customAmount: 1000,
          calculatedShare: 0,
          isActive: false,
          isCurrentUser: false,
        },
      ],
    });
  });

  it('hides the next échéance unless active', () => {
    const view = toRecurringExpenseView({
      row,
      payer: { ...payer, leftAt: new Date() },
      participants,
      coefficients,
      activePersonIds,
      currentMemberId: 'sam',
    });
    expect(view.status).toBe('paused');
    expect(view.pausedReason).toBe('payer_inactive');
    expect(view.nextDueDate).toBeNull();
    expect(view.paidBy.isActive).toBe(false);

    const disabled = toRecurringExpenseView({
      row: { ...row, disabledAt: new Date() },
      payer,
      participants,
      coefficients,
      activePersonIds,
      currentMemberId: 'sam',
    });
    expect(disabled.status).toBe('disabled');
    expect(disabled.nextDueDate).toBeNull();
  });
});
