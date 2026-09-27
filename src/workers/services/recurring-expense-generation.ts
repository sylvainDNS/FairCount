import { and, eq, inArray, isNull, lte } from 'drizzle-orm';
import type { Database } from '@/db';
import * as schema from '@/db/schema';
import {
  nextDueDateAfter,
  RECURRENCE_TIME_ZONE,
  type RecurrenceRule,
  todayIn,
} from '@/lib/recurrence';
import {
  buildGeneratedExpense,
  columnsToRule,
  deriveRecurrenceStatus,
  planRecurrenceRun,
} from './recurring-expense-planning';
import { selectByIdsChunked } from './shared/sql-helpers';

// Recurrences handled per run; the job runs 3 times a day (wrangler.toml)
const MAX_RECURRENCES_PER_RUN = 100;
// 4 bound params per participant row: stay under D1's 100-parameter limit
const PARTICIPANTS_PER_INSERT = 25;

export interface RecurrenceParticipant {
  readonly memberId: string;
  readonly customAmount: number | null;
}

export interface DueRecurrence {
  readonly id: string;
  readonly groupId: string;
  readonly paidBy: string;
  readonly amount: number;
  readonly description: string;
  readonly createdBy: string;
  readonly rule: RecurrenceRule;
  readonly nextDueDate: string;
  readonly disabledAt: Date | null;
  readonly payerActive: boolean;
  readonly groupArchived: boolean;
}

export interface GenerationRequest {
  readonly recurrence: DueRecurrence;
  readonly participants: readonly RecurrenceParticipant[];
  readonly activePersonIds: ReadonlySet<string>;
  readonly dueDate: string;
  /** Cursor to store once this échéance is materialised */
  readonly nextDueDate: string;
}

export interface GenerationResult {
  readonly generated: boolean;
  readonly conflict: boolean;
  readonly expenseId?: string | null | undefined;
}

export interface RunSummary {
  readonly event: 'recurring_expenses.run';
  readonly today: string;
  readonly selected: number;
  readonly generated: number;
  readonly skipped: number;
  readonly conflicts: number;
  readonly errors: number;
}

export interface RunDeps {
  readonly loadDue: (today: string) => Promise<readonly DueRecurrence[]>;
  readonly loadParticipants: (
    recurringExpenseIds: readonly string[],
  ) => Promise<ReadonlyMap<string, readonly RecurrenceParticipant[]>>;
  readonly loadActivePersonIds: (
    groupIds: readonly string[],
  ) => Promise<ReadonlyMap<string, ReadonlySet<string>>>;
  readonly generate: (request: GenerationRequest) => Promise<GenerationResult>;
  readonly skip: (recurringExpenseId: string, nextDueDate: string) => Promise<void>;
  readonly log: (summary: RunSummary) => void;
}

const UNIQUE_RECURRENCE_VIOLATION =
  'UNIQUE constraint failed: expenses.recurring_expense_id, expenses.recurrence_due_date';

/** True when an insert hit `uq_expenses_recurrence_due` (échéance already generated). */
export function isUniqueRecurrenceConflict(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current.message.includes(UNIQUE_RECURRENCE_VIOLATION)) return true;
    current = current.cause;
  }
  return false;
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const advanceCursor = (db: Database, recurringExpenseId: string, nextDueDate: string) =>
  db
    .update(schema.recurringExpenses)
    .set({ nextDueDate, updatedAt: new Date() })
    .where(eq(schema.recurringExpenses.id, recurringExpenseId));

/**
 * Materialises one échéance in a single D1 batch (a transaction): expense,
 * its participants and the recurrence cursor. If the échéance already exists
 * (retry, concurrent run, or an expense a member deleted), only the cursor moves.
 */
export async function generateDueExpense(
  db: Database,
  request: GenerationRequest,
): Promise<GenerationResult> {
  const { expense, participants } = buildGeneratedExpense({
    recurrence: request.recurrence,
    participants: request.participants,
    activePersonIds: request.activePersonIds,
    dueDate: request.dueDate,
    now: new Date(),
    newId: () => crypto.randomUUID(),
  });

  try {
    await db.batch([
      db.insert(schema.expenses).values(expense),
      ...chunk(participants, PARTICIPANTS_PER_INSERT).map((rows) =>
        db.insert(schema.expenseParticipants).values(rows),
      ),
      advanceCursor(db, request.recurrence.id, request.nextDueDate),
    ]);
    return { generated: true, conflict: false, expenseId: expense.id };
  } catch (error) {
    if (!isUniqueRecurrenceConflict(error)) throw error;
    await advanceCursor(db, request.recurrence.id, request.nextDueDate);
    return { generated: false, conflict: true, expenseId: null };
  }
}

/** Real dependencies of the scheduled job. */
export function createRunDeps(db: Database): RunDeps {
  return {
    loadDue: async (today) => {
      const rows = await db
        .select({
          recurrence: schema.recurringExpenses,
          payerLeftAt: schema.groupMembers.leftAt,
          groupArchivedAt: schema.groups.archivedAt,
        })
        .from(schema.recurringExpenses)
        .innerJoin(schema.groups, eq(schema.recurringExpenses.groupId, schema.groups.id))
        .innerJoin(schema.groupMembers, eq(schema.recurringExpenses.paidBy, schema.groupMembers.id))
        .where(
          and(
            isNull(schema.recurringExpenses.deletedAt),
            isNull(schema.recurringExpenses.disabledAt),
            lte(schema.recurringExpenses.nextDueDate, today),
          ),
        )
        .limit(MAX_RECURRENCES_PER_RUN);

      return rows.map(({ recurrence, payerLeftAt, groupArchivedAt }) => ({
        id: recurrence.id,
        groupId: recurrence.groupId,
        paidBy: recurrence.paidBy,
        amount: recurrence.amount,
        description: recurrence.description,
        createdBy: recurrence.createdBy,
        rule: columnsToRule(recurrence),
        nextDueDate: recurrence.nextDueDate,
        disabledAt: recurrence.disabledAt,
        payerActive: payerLeftAt === null,
        groupArchived: groupArchivedAt !== null,
      }));
    },

    loadParticipants: async (ids) => {
      const rows = await selectByIdsChunked(ids, (idsChunk) =>
        db
          .select()
          .from(schema.recurringExpenseParticipants)
          .where(inArray(schema.recurringExpenseParticipants.recurringExpenseId, [...idsChunk])),
      );
      const byRecurrence = new Map<string, RecurrenceParticipant[]>();
      for (const row of rows) {
        const list = byRecurrence.get(row.recurringExpenseId) ?? [];
        list.push({ memberId: row.memberId, customAmount: row.customAmount });
        byRecurrence.set(row.recurringExpenseId, list);
      }
      return byRecurrence;
    },

    loadActivePersonIds: async (groupIds) => {
      const rows = await selectByIdsChunked(
        groupIds,
        (idsChunk) =>
          db
            .select({ id: schema.groupMembers.id, groupId: schema.groupMembers.groupId })
            .from(schema.groupMembers)
            .where(
              and(
                inArray(schema.groupMembers.groupId, [...idsChunk]),
                isNull(schema.groupMembers.leftAt),
                eq(schema.groupMembers.kind, 'person'),
              ),
            ),
        { chunkSize: 99 },
      );
      const byGroup = new Map<string, Set<string>>();
      for (const row of rows) {
        const set = byGroup.get(row.groupId) ?? new Set<string>();
        set.add(row.id);
        byGroup.set(row.groupId, set);
      }
      return byGroup;
    },

    generate: (request) => generateDueExpense(db, request),

    skip: async (recurringExpenseId, nextDueDate) => {
      await advanceCursor(db, recurringExpenseId, nextDueDate);
    },

    log: (summary) => console.log(JSON.stringify(summary)),
  };
}

/** Scheduled job: materialise every échéance due today (Europe/Paris). */
export async function runRecurringExpenses(deps: RunDeps, now: Date): Promise<RunSummary> {
  const today = todayIn(RECURRENCE_TIME_ZONE, now);
  const due = await deps.loadDue(today);

  const [participantsById, activeByGroup] = await Promise.all([
    deps.loadParticipants(due.map((r) => r.id)),
    deps.loadActivePersonIds([...new Set(due.map((r) => r.groupId))]),
  ]);

  let generated = 0;
  let skipped = 0;
  let conflicts = 0;
  let errors = 0;

  for (const recurrence of due) {
    try {
      const participants = participantsById.get(recurrence.id) ?? [];
      const activePersonIds = activeByGroup.get(recurrence.groupId) ?? new Set<string>();
      const { status } = deriveRecurrenceStatus({
        disabledAt: recurrence.disabledAt,
        payerActive: recurrence.payerActive,
        activeParticipantCount: participants.filter((p) => activePersonIds.has(p.memberId)).length,
      });

      const plan = planRecurrenceRun({
        rule: recurrence.rule,
        nextDueDate: recurrence.nextDueDate,
        today,
        status,
        groupArchived: recurrence.groupArchived,
      });

      if (plan.kind === 'skip') {
        await deps.skip(recurrence.id, plan.nextDueDate);
        skipped++;
      } else if (plan.kind === 'generate') {
        // Sequential on purpose: the cursor advances with each échéance, so a
        // failure mid-way resumes exactly where it stopped on the next run
        for (const dueDate of plan.dates) {
          const result = await deps.generate({
            recurrence,
            participants,
            activePersonIds,
            dueDate,
            nextDueDate: nextDueDateAfter(recurrence.rule, dueDate),
          });
          if (result.generated) generated++;
          if (result.conflict) conflicts++;
        }
      }
    } catch (error) {
      errors++;
      console.error(
        JSON.stringify({
          event: 'recurring_expenses.error',
          recurringExpenseId: recurrence.id,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  const summary: RunSummary = {
    event: 'recurring_expenses.run',
    today,
    selected: due.length,
    generated,
    skipped,
    conflicts,
    errors,
  };
  deps.log(summary);
  return summary;
}
