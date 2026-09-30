/**
 * Pure business rules for recurring expenses (no DB access).
 * Services and the generation job load data, then delegate every decision here.
 */

import {
  addDays,
  dueDatesThrough,
  firstDueDateOnOrAfter,
  MAX_CATCH_UP_PER_RUN,
  nextDueDateAfter,
  type RecurrenceRule,
} from '@/lib/recurrence';
import { validateParticipants } from './shared/participant-validation';
import { calculateShares } from './shared/share-calculation';

export type RecurrenceStatus = 'active' | 'paused' | 'disabled';
export type PausedReason = 'payer_inactive' | 'no_active_participant';

export interface RecurrenceStatusInfo {
  readonly status: RecurrenceStatus;
  readonly pausedReason: PausedReason | null;
}

/**
 * `disabled` is a stored user decision; `paused` is derived from the group's
 * current members so it can never drift from `group_members.left_at`.
 */
export function deriveRecurrenceStatus(input: {
  readonly disabledAt: Date | null;
  readonly payerActive: boolean;
  readonly activeParticipantCount: number;
}): RecurrenceStatusInfo {
  if (input.disabledAt !== null) return { status: 'disabled', pausedReason: null };
  if (!input.payerActive) return { status: 'paused', pausedReason: 'payer_inactive' };
  if (input.activeParticipantCount === 0) {
    return { status: 'paused', pausedReason: 'no_active_participant' };
  }
  return { status: 'active', pausedReason: null };
}

const STATUS_ORDER: Record<RecurrenceStatus, number> = { active: 0, paused: 1, disabled: 2 };

/** Active by next échéance, then paused, then disabled; ties by description. */
export function sortRecurrences<
  T extends {
    readonly status: RecurrenceStatus;
    readonly nextDueDate: string | null;
    readonly description: string;
  },
>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    const byDate = (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '');
    if (byDate !== 0) return byDate;
    return a.description.localeCompare(b.description, 'fr');
  });
}

// ---------------------------------------------------------------------------
// Rule updates and input validation
// ---------------------------------------------------------------------------

/** A yearly rule always follows the start date's month and day (FR-005). */
export function resolveUpdatedRule(
  existingRule: RecurrenceRule,
  patchRule: RecurrenceRule | undefined,
  startDate: string,
): RecurrenceRule {
  if (patchRule === undefined) return existingRule;
  if (patchRule.frequency === 'yearly') return yearlyRuleFromStartDate(startDate);
  return patchRule;
}

/** Next échéance from today, or from the start date when it is still ahead. */
export function recomputeNextDueDate(
  rule: RecurrenceRule,
  startDate: string,
  today: string,
): string {
  return firstDueDateOnOrAfter(rule, startDate > today ? startDate : today);
}

type YearlyRule = Extract<RecurrenceRule, { frequency: 'yearly' }>;

const yearlyRuleFromStartDate = (startDate: string): YearlyRule => ({
  frequency: 'yearly',
  month: Number(startDate.slice(5, 7)),
  dayOfMonth: Number(startDate.slice(8, 10)),
});

export type RecurrenceValidationError =
  | 'INVALID_DESCRIPTION'
  | 'START_DATE_IN_PAST'
  | 'INVALID_RULE'
  | 'INVALID_PAYER'
  | 'NO_PARTICIPANTS'
  | 'INVALID_PARTICIPANT'
  | 'CUSTOM_AMOUNTS_EXCEED_TOTAL';

interface RecurrenceParticipantInput {
  readonly memberId: string;
  readonly customAmount?: number | null | undefined;
}

export interface RecurrenceContent {
  readonly amount: number;
  readonly description: string;
  readonly paidBy: string;
  readonly participants: ReadonlyArray<RecurrenceParticipantInput>;
  readonly rule: RecurrenceRule;
  readonly startDate: string;
}

export interface ValidatedRecurrence extends RecurrenceContent {
  readonly nextDueDate: string;
}

export type RecurrenceValidationResult =
  | { readonly ok: true; readonly value: ValidatedRecurrence }
  | { readonly ok: false; readonly error: RecurrenceValidationError };

interface ValidationInput {
  readonly mode: 'create' | 'update';
  readonly data: { readonly [K in keyof RecurrenceContent]?: RecurrenceContent[K] | undefined };
  /** Stored recurrence, required in update mode (with its current cursor) */
  readonly existing?:
    | (RecurrenceContent & { readonly nextDueDate?: string | undefined })
    | undefined;
  readonly today: string;
  /** Group member matching the resulting `paidBy`, null when not in the group */
  readonly payer: { readonly id: string; readonly active: boolean } | null;
  /** Active persons of the group (the joint account is never one) */
  readonly activePersonIds: ReadonlySet<string>;
}

const fail = (error: RecurrenceValidationError): RecurrenceValidationResult => ({
  ok: false,
  error,
});

/** Validates a create/update payload against the group state (INV-R4, FR-008a, FR-010). */
export function validateRecurringExpenseInput(input: ValidationInput): RecurrenceValidationResult {
  const { mode, data, existing: base, today, payer, activePersonIds } = input;
  const amount = data.amount ?? base?.amount;
  const paidBy = data.paidBy ?? base?.paidBy;
  const startDate = mode === 'create' ? data.startDate : base?.startDate;
  const participants = data.participants ?? base?.participants;
  const rawDescription = data.description ?? base?.description;
  if (
    amount === undefined ||
    paidBy === undefined ||
    startDate === undefined ||
    participants === undefined ||
    rawDescription === undefined
  ) {
    throw new Error('validateRecurringExpenseInput: incomplete create payload');
  }

  const description = rawDescription.trim();
  if (!description) return fail('INVALID_DESCRIPTION');

  let rule: RecurrenceRule;
  if (mode === 'create') {
    if (startDate < today) return fail('START_DATE_IN_PAST');
    if (data.rule === undefined) return fail('INVALID_RULE');
    if (data.rule.frequency === 'yearly') {
      const expected = yearlyRuleFromStartDate(startDate);
      if (data.rule.month !== expected.month || data.rule.dayOfMonth !== expected.dayOfMonth) {
        return fail('INVALID_RULE');
      }
    }
    rule = data.rule;
  } else if (base !== undefined) {
    rule = resolveUpdatedRule(base.rule, data.rule, startDate);
  } else {
    throw new Error('validateRecurringExpenseInput: `existing` is required in update mode');
  }

  // A payer identical to the stored one is always accepted (even if it has
  // since left); a new payer must be an active member of the group.
  const payerChanged = mode === 'create' || paidBy !== base?.paidBy;
  if (payer === null || payer.id !== paidBy || (payerChanged && !payer.active)) {
    return fail('INVALID_PAYER');
  }

  if (mode === 'create' || data.participants !== undefined) {
    const validation = validateParticipants([...participants], new Set(activePersonIds), amount);
    if (!validation.valid) return fail(validation.error);
  } else {
    // Stored participants may include people who have left since: only the
    // custom amounts must still fit in the (possibly new) total.
    const customTotal = participants.reduce((sum, p) => sum + (p.customAmount ?? 0), 0);
    if (customTotal > amount) return fail('CUSTOM_AMOUNTS_EXCEED_TOTAL');
  }

  // A cursor already past today means today's échéance was processed (or was
  // not one): an edit then starts from tomorrow, never announcing today again
  const from =
    base?.nextDueDate !== undefined && base.nextDueDate > today ? addDays(today, 1) : today;

  return {
    ok: true,
    value: {
      amount,
      description,
      paidBy,
      participants,
      rule,
      startDate,
      nextDueDate: recomputeNextDueDate(rule, startDate, from),
    },
  };
}

// ---------------------------------------------------------------------------
// Storage mapping
// ---------------------------------------------------------------------------

export interface RuleColumns {
  readonly frequency: RecurrenceRule['frequency'];
  readonly dayOfWeek: number | null;
  readonly dayOfMonth: number | null;
  readonly month: number | null;
}

/** Rule → `recurring_expenses` columns (anchors not used by the frequency are null). */
export function ruleToColumns(rule: RecurrenceRule): RuleColumns {
  switch (rule.frequency) {
    case 'daily':
      return { frequency: 'daily', dayOfWeek: null, dayOfMonth: null, month: null };
    case 'weekly':
      return { frequency: 'weekly', dayOfWeek: rule.dayOfWeek, dayOfMonth: null, month: null };
    case 'monthly':
      return { frequency: 'monthly', dayOfWeek: null, dayOfMonth: rule.dayOfMonth, month: null };
    case 'yearly':
      return {
        frequency: 'yearly',
        dayOfWeek: null,
        dayOfMonth: rule.dayOfMonth,
        month: rule.month,
      };
  }
}

/** `recurring_expenses` columns → rule (defensive defaults for inconsistent rows). */
export function columnsToRule(columns: RuleColumns): RecurrenceRule {
  switch (columns.frequency) {
    case 'daily':
      return { frequency: 'daily' };
    case 'weekly':
      return { frequency: 'weekly', dayOfWeek: columns.dayOfWeek ?? 1 };
    case 'monthly':
      return { frequency: 'monthly', dayOfMonth: columns.dayOfMonth ?? 1 };
    case 'yearly':
      return {
        frequency: 'yearly',
        month: columns.month ?? 1,
        dayOfMonth: columns.dayOfMonth ?? 1,
      };
  }
}

// ---------------------------------------------------------------------------
// Generation planning
// ---------------------------------------------------------------------------

export type RecurrenceRunPlan =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'generate';
      readonly dates: readonly string[];
      /** Cursor after the last generated échéance */
      readonly nextDueDate: string;
    }
  | { readonly kind: 'skip'; readonly nextDueDate: string };

/**
 * What to do with a recurrence on a given day. Used by the scheduled job and by
 * the synchronous generation at creation/reactivation, so all three agree.
 * A recurrence that cannot generate (paused, disabled, archived group) jumps
 * past today: it is never caught up later (no retroactive expenses, R5).
 */
export function planRecurrenceRun(input: {
  readonly rule: RecurrenceRule;
  readonly nextDueDate: string;
  readonly today: string;
  readonly status: RecurrenceStatus;
  readonly groupArchived: boolean;
}): RecurrenceRunPlan {
  const { rule, nextDueDate, today, status, groupArchived } = input;
  if (nextDueDate > today) return { kind: 'none' };

  if (status !== 'active' || groupArchived) {
    return { kind: 'skip', nextDueDate: firstDueDateOnOrAfter(rule, addDays(today, 1)) };
  }

  const dates = dueDatesThrough(rule, nextDueDate, today, MAX_CATCH_UP_PER_RUN);
  const last = dates[dates.length - 1];
  if (last === undefined) return { kind: 'none' };
  return { kind: 'generate', dates, nextDueDate: nextDueDateAfter(rule, last) };
}

interface GeneratedExpenseInput {
  readonly recurrence: {
    readonly id: string;
    readonly groupId: string;
    readonly paidBy: string;
    readonly amount: number;
    readonly description: string;
    readonly createdBy: string;
  };
  readonly participants: ReadonlyArray<{
    readonly memberId: string;
    readonly customAmount: number | null;
  }>;
  readonly activePersonIds: ReadonlySet<string>;
  readonly dueDate: string;
  readonly now: Date;
  readonly newId: () => string;
}

/**
 * Rows of the ordinary expense generated for one échéance. Beneficiaries who
 * left the group are excluded; custom amounts are kept as is (they can only
 * shrink the custom total, so the split stays valid).
 */
export function buildGeneratedExpense(input: GeneratedExpenseInput) {
  const { recurrence, participants, activePersonIds, dueDate, now, newId } = input;
  const expenseId = newId();

  return {
    expense: {
      id: expenseId,
      groupId: recurrence.groupId,
      paidBy: recurrence.paidBy,
      amount: recurrence.amount,
      description: recurrence.description,
      date: dueDate,
      recurringExpenseId: recurrence.id,
      recurrenceDueDate: dueDate,
      createdBy: recurrence.createdBy,
      createdAt: now,
      updatedAt: now,
    },
    participants: participants
      .filter((p) => activePersonIds.has(p.memberId))
      .map((p) => ({
        id: newId(),
        expenseId,
        memberId: p.memberId,
        customAmount: p.customAmount,
      })),
  };
}

// ---------------------------------------------------------------------------
// API view
// ---------------------------------------------------------------------------

interface RecurrenceViewInput {
  readonly row: RuleColumns & {
    readonly id: string;
    readonly description: string;
    readonly amount: number;
    readonly startDate: string;
    readonly nextDueDate: string;
    readonly disabledAt: Date | null;
  };
  readonly payer: {
    readonly id: string;
    readonly name: string;
    readonly isJointAccount: boolean;
    readonly leftAt: Date | null;
  };
  readonly participants: ReadonlyArray<{
    readonly memberId: string;
    readonly memberName: string;
    readonly customAmount: number | null;
  }>;
  /** Current coefficients of the group members */
  readonly coefficients: ReadonlyMap<string, number>;
  readonly activePersonIds: ReadonlySet<string>;
  readonly currentMemberId: string;
}

/**
 * API representation of a recurrence (contract §1 GET). Shares are what an
 * expense generated now would split into: inactive participants get 0.
 */
export function toRecurringExpenseView(input: RecurrenceViewInput) {
  const { row, payer, participants, coefficients, activePersonIds, currentMemberId } = input;
  const activeParticipants = participants.filter((p) => activePersonIds.has(p.memberId));
  const { status, pausedReason } = deriveRecurrenceStatus({
    disabledAt: row.disabledAt,
    payerActive: payer.leftAt === null,
    activeParticipantCount: activeParticipants.length,
  });
  const shares = calculateShares(row.amount, activeParticipants, new Map(coefficients));

  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    rule: columnsToRule(row),
    startDate: row.startDate,
    nextDueDate: status === 'active' ? row.nextDueDate : null,
    status,
    pausedReason,
    paidBy: {
      id: payer.id,
      name: payer.name,
      isJointAccount: payer.isJointAccount,
      isActive: payer.leftAt === null,
    },
    participants: participants.map((p) => {
      const isActive = activePersonIds.has(p.memberId);
      return {
        memberId: p.memberId,
        memberName: p.memberName,
        customAmount: p.customAmount,
        calculatedShare: isActive ? (shares.get(p.memberId) ?? 0) : 0,
        isActive,
        isCurrentUser: p.memberId === currentMemberId,
      };
    }),
  };
}

export type RecurringExpenseView = ReturnType<typeof toRecurringExpenseView>;
