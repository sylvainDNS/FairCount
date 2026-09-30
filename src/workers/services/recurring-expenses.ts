import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Database } from '@/db';
import * as schema from '@/db/schema';
import { RECURRENCE_TIME_ZONE, type RecurrenceRule, todayIn } from '@/lib/recurrence';
import type {
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
} from '@/lib/schemas/recurring-expense.schema';
import { generateDueExpense } from './recurring-expense-generation';
import {
  columnsToRule,
  deriveRecurrenceStatus,
  planRecurrenceRun,
  recomputeNextDueDate,
  ruleToColumns,
  sortRecurrences,
  toRecurringExpenseView,
  validateRecurringExpenseInput,
} from './recurring-expense-planning';
import {
  activeGroupMembersCondition,
  activePersonMembersCondition,
  memberDisplayName,
  selectByIdsChunked,
} from './shared/sql-helpers';

export interface RecurringExpenseContext {
  readonly db: Database;
  readonly groupId: string;
  readonly userId: string;
  readonly currentMemberId: string;
}

// 4 bound params per participant row: stay under D1's 100-parameter limit
const PARTICIPANTS_PER_INSERT = 25;

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const currentToday = (): string => todayIn(RECURRENCE_TIME_ZONE, new Date());

async function loadPayer(ctx: RecurringExpenseContext, memberId: string) {
  const [member] = await ctx.db
    .select({ id: schema.groupMembers.id, leftAt: schema.groupMembers.leftAt })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.id, memberId), eq(schema.groupMembers.groupId, ctx.groupId)));
  return member ? { id: member.id, active: member.leftAt === null } : null;
}

async function loadActivePersonIds(ctx: RecurringExpenseContext): Promise<Set<string>> {
  const members = await ctx.db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(activePersonMembersCondition(ctx.groupId));
  return new Set(members.map((m) => m.id));
}

const participantRows = (
  recurringExpenseId: string,
  participants: ReadonlyArray<{ memberId: string; customAmount?: number | null | undefined }>,
) =>
  participants.map((p) => ({
    id: crypto.randomUUID(),
    recurringExpenseId,
    memberId: p.memberId,
    customAmount: p.customAmount ?? null,
  }));

interface StoredRecurrence {
  readonly id: string;
  readonly paidBy: string;
  readonly amount: number;
  readonly description: string;
  readonly createdBy: string;
  readonly rule: RecurrenceRule;
  readonly nextDueDate: string;
  readonly disabledAt: Date | null;
}

/**
 * Generates today's expense right away when the recurrence is due today
 * (creation, reactivation), through the same decision as the scheduled job:
 * a paused recurrence or an archived group only moves the cursor (FR-015).
 */
async function generateIfDueToday(
  ctx: RecurringExpenseContext,
  recurrence: StoredRecurrence,
  participants: ReadonlyArray<{ memberId: string; customAmount?: number | null | undefined }>,
  payerActive: boolean,
  activePersonIds: ReadonlySet<string>,
  today: string,
): Promise<{ nextDueDate: string; generatedExpenseId: string | null }> {
  const [group] = await ctx.db
    .select({ archivedAt: schema.groups.archivedAt })
    .from(schema.groups)
    .where(eq(schema.groups.id, ctx.groupId));

  const normalized = participants.map((p) => ({
    memberId: p.memberId,
    customAmount: p.customAmount ?? null,
  }));
  const { status } = deriveRecurrenceStatus({
    disabledAt: recurrence.disabledAt,
    payerActive,
    activeParticipantCount: normalized.filter((p) => activePersonIds.has(p.memberId)).length,
  });
  const plan = planRecurrenceRun({
    rule: recurrence.rule,
    nextDueDate: recurrence.nextDueDate,
    today,
    status,
    groupArchived: (group?.archivedAt ?? null) !== null,
  });

  if (plan.kind === 'none')
    return { nextDueDate: recurrence.nextDueDate, generatedExpenseId: null };

  if (plan.kind === 'skip') {
    await ctx.db
      .update(schema.recurringExpenses)
      .set({ nextDueDate: plan.nextDueDate, updatedAt: new Date() })
      .where(eq(schema.recurringExpenses.id, recurrence.id));
    return { nextDueDate: plan.nextDueDate, generatedExpenseId: null };
  }

  // Due today: plan.dates is [today]
  const result = await generateDueExpense(ctx.db, {
    recurrence: {
      ...recurrence,
      groupId: ctx.groupId,
      payerActive,
      groupArchived: false,
    },
    participants: normalized,
    activePersonIds,
    dueDate: today,
    nextDueDate: plan.nextDueDate,
  });
  return { nextDueDate: plan.nextDueDate, generatedExpenseId: result.expenseId ?? null };
}

// POST /api/groups/:id/recurring-expenses
export async function createRecurringExpense(
  ctx: RecurringExpenseContext,
  data: CreateRecurringExpenseInput,
): Promise<Response> {
  const [payer, activePersonIds] = await Promise.all([
    loadPayer(ctx, data.paidBy),
    loadActivePersonIds(ctx),
  ]);

  const today = currentToday();
  const validation = validateRecurringExpenseInput({
    mode: 'create',
    data,
    today,
    payer,
    activePersonIds,
  });
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const value = validation.value;
  const id = crypto.randomUUID();
  const now = new Date();

  const insertRecurrence = ctx.db.insert(schema.recurringExpenses).values({
    id,
    groupId: ctx.groupId,
    paidBy: value.paidBy,
    amount: value.amount,
    description: value.description,
    ...ruleToColumns(value.rule),
    startDate: value.startDate,
    nextDueDate: value.nextDueDate,
    createdBy: ctx.currentMemberId,
    createdAt: now,
    updatedAt: now,
  });
  const insertParticipants = chunk(
    participantRows(id, value.participants),
    PARTICIPANTS_PER_INSERT,
  ).map((rows) => ctx.db.insert(schema.recurringExpenseParticipants).values(rows));

  await ctx.db.batch([insertRecurrence, ...insertParticipants]);

  const { nextDueDate, generatedExpenseId } = await generateIfDueToday(
    ctx,
    {
      id,
      paidBy: value.paidBy,
      amount: value.amount,
      description: value.description,
      createdBy: ctx.currentMemberId,
      rule: value.rule,
      nextDueDate: value.nextDueDate,
      disabledAt: null,
    },
    value.participants,
    true,
    activePersonIds,
    today,
  );

  return Response.json({ id, nextDueDate, generatedExpenseId }, { status: 201 });
}

const notFound = () => Response.json({ error: 'RECURRING_EXPENSE_NOT_FOUND' }, { status: 404 });

// Recurrences of the group (never the soft-deleted ones) with their payer
const selectRecurrences = (ctx: RecurringExpenseContext, recurringExpenseId?: string) =>
  ctx.db
    .select({
      recurrence: schema.recurringExpenses,
      payerName: memberDisplayName,
      payerKind: schema.groupMembers.kind,
      payerLeftAt: schema.groupMembers.leftAt,
    })
    .from(schema.recurringExpenses)
    .innerJoin(schema.groupMembers, eq(schema.recurringExpenses.paidBy, schema.groupMembers.id))
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.recurringExpenses.groupId, ctx.groupId),
        isNull(schema.recurringExpenses.deletedAt),
        ...(recurringExpenseId ? [eq(schema.recurringExpenses.id, recurringExpenseId)] : []),
      ),
    );

type RecurrenceRow = Awaited<ReturnType<typeof selectRecurrences>>[number];

// Loads what toRecurringExpenseView needs besides the rows themselves
async function buildViews(ctx: RecurringExpenseContext, rows: readonly RecurrenceRow[]) {
  const ids = rows.map((r) => r.recurrence.id);
  const [participantRowsList, members, activePersonIds] = await Promise.all([
    selectByIdsChunked(ids, (idsChunk) =>
      ctx.db
        .select({
          recurringExpenseId: schema.recurringExpenseParticipants.recurringExpenseId,
          memberId: schema.recurringExpenseParticipants.memberId,
          customAmount: schema.recurringExpenseParticipants.customAmount,
          memberName: memberDisplayName,
        })
        .from(schema.recurringExpenseParticipants)
        .innerJoin(
          schema.groupMembers,
          eq(schema.recurringExpenseParticipants.memberId, schema.groupMembers.id),
        )
        .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
        .where(inArray(schema.recurringExpenseParticipants.recurringExpenseId, [...idsChunk])),
    ),
    ctx.db
      .select({ id: schema.groupMembers.id, coefficient: schema.groupMembers.coefficient })
      .from(schema.groupMembers)
      .where(activeGroupMembersCondition(ctx.groupId)),
    loadActivePersonIds(ctx),
  ]);

  const coefficients = new Map(members.map((m) => [m.id, m.coefficient]));
  const participantsById = new Map<string, typeof participantRowsList>();
  for (const p of participantRowsList) {
    const list = participantsById.get(p.recurringExpenseId) ?? [];
    list.push(p);
    participantsById.set(p.recurringExpenseId, list);
  }

  return rows.map((r) =>
    toRecurringExpenseView({
      row: r.recurrence,
      payer: {
        id: r.recurrence.paidBy,
        name: r.payerName,
        isJointAccount: r.payerKind === 'joint_account',
        leftAt: r.payerLeftAt,
      },
      participants: participantsById.get(r.recurrence.id) ?? [],
      coefficients,
      activePersonIds,
      currentMemberId: ctx.currentMemberId,
    }),
  );
}

// GET /api/groups/:id/recurring-expenses
export async function listRecurringExpenses(ctx: RecurringExpenseContext): Promise<Response> {
  const rows = await selectRecurrences(ctx);
  const views = await buildViews(ctx, rows);
  const recurringExpenses = sortRecurrences(views).map(
    ({ participants: _, ...summary }) => summary,
  );
  return Response.json({ recurringExpenses });
}

// GET /api/groups/:id/recurring-expenses/:recurringExpenseId
export async function getRecurringExpense(
  ctx: RecurringExpenseContext,
  recurringExpenseId: string,
): Promise<Response> {
  const [row] = await selectRecurrences(ctx, recurringExpenseId);
  if (!row) return notFound();

  const [[view], [creator]] = await Promise.all([
    buildViews(ctx, [row]),
    ctx.db
      .select({ name: memberDisplayName })
      .from(schema.groupMembers)
      .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(eq(schema.groupMembers.id, row.recurrence.createdBy)),
  ]);

  return Response.json({
    ...view,
    createdBy: {
      id: row.recurrence.createdBy,
      name: creator?.name ?? 'Inconnu',
      isCurrentUser: row.recurrence.createdBy === ctx.currentMemberId,
    },
  });
}

// Stored recurrence (not deleted) of the group, with its participants
async function loadRecurrence(ctx: RecurringExpenseContext, recurringExpenseId: string) {
  const [row] = await ctx.db
    .select()
    .from(schema.recurringExpenses)
    .where(
      and(
        eq(schema.recurringExpenses.id, recurringExpenseId),
        eq(schema.recurringExpenses.groupId, ctx.groupId),
        isNull(schema.recurringExpenses.deletedAt),
      ),
    );
  if (!row) return null;

  const participants = await ctx.db
    .select({
      memberId: schema.recurringExpenseParticipants.memberId,
      customAmount: schema.recurringExpenseParticipants.customAmount,
    })
    .from(schema.recurringExpenseParticipants)
    .where(eq(schema.recurringExpenseParticipants.recurringExpenseId, row.id));

  return { row, participants };
}

// PATCH /api/groups/:id/recurring-expenses/:recurringExpenseId
// Applies to future échéances only: generated expenses are never touched (FR-022).
export async function updateRecurringExpense(
  ctx: RecurringExpenseContext,
  recurringExpenseId: string,
  data: UpdateRecurringExpenseInput,
): Promise<Response> {
  const loaded = await loadRecurrence(ctx, recurringExpenseId);
  if (!loaded) return notFound();
  const { row, participants } = loaded;

  const [payer, activePersonIds] = await Promise.all([
    loadPayer(ctx, data.paidBy ?? row.paidBy),
    loadActivePersonIds(ctx),
  ]);

  const validation = validateRecurringExpenseInput({
    mode: 'update',
    data,
    existing: {
      amount: row.amount,
      description: row.description,
      paidBy: row.paidBy,
      participants,
      rule: columnsToRule(row),
      startDate: row.startDate,
      nextDueDate: row.nextDueDate,
    },
    today: currentToday(),
    payer,
    activePersonIds,
  });
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const value = validation.value;
  const updateRecurrence = ctx.db
    .update(schema.recurringExpenses)
    .set({
      amount: value.amount,
      description: value.description,
      paidBy: value.paidBy,
      ...ruleToColumns(value.rule),
      nextDueDate: value.nextDueDate,
      updatedAt: new Date(),
    })
    .where(eq(schema.recurringExpenses.id, row.id));

  if (data.participants === undefined) {
    await updateRecurrence;
  } else {
    await ctx.db.batch([
      updateRecurrence,
      ctx.db
        .delete(schema.recurringExpenseParticipants)
        .where(eq(schema.recurringExpenseParticipants.recurringExpenseId, row.id)),
      ...chunk(participantRows(row.id, value.participants), PARTICIPANTS_PER_INSERT).map((rows) =>
        ctx.db.insert(schema.recurringExpenseParticipants).values(rows),
      ),
    ]);
  }

  return Response.json({ success: true, nextDueDate: value.nextDueDate });
}

// POST /api/groups/:id/recurring-expenses/:recurringExpenseId/deactivate
export async function deactivateRecurringExpense(
  ctx: RecurringExpenseContext,
  recurringExpenseId: string,
): Promise<Response> {
  const loaded = await loadRecurrence(ctx, recurringExpenseId);
  if (!loaded) return notFound();

  if (loaded.row.disabledAt === null) {
    const now = new Date();
    await ctx.db
      .update(schema.recurringExpenses)
      .set({ disabledAt: now, updatedAt: now })
      .where(eq(schema.recurringExpenses.id, loaded.row.id));
  }

  return Response.json({ success: true });
}

// POST /api/groups/:id/recurring-expenses/:recurringExpenseId/reactivate
// Resumes from today: the period spent disabled is never caught up (FR-024).
export async function reactivateRecurringExpense(
  ctx: RecurringExpenseContext,
  recurringExpenseId: string,
): Promise<Response> {
  const loaded = await loadRecurrence(ctx, recurringExpenseId);
  if (!loaded) return notFound();
  const { row, participants } = loaded;

  const today = currentToday();
  const rule = columnsToRule(row);
  const nextDueDate = recomputeNextDueDate(rule, row.startDate, today);

  await ctx.db
    .update(schema.recurringExpenses)
    .set({ disabledAt: null, nextDueDate, updatedAt: new Date() })
    .where(eq(schema.recurringExpenses.id, row.id));

  const [payer, activePersonIds] = await Promise.all([
    loadPayer(ctx, row.paidBy),
    loadActivePersonIds(ctx),
  ]);

  const result = await generateIfDueToday(
    ctx,
    {
      id: row.id,
      paidBy: row.paidBy,
      amount: row.amount,
      description: row.description,
      createdBy: row.createdBy,
      rule,
      nextDueDate,
      disabledAt: null,
    },
    participants,
    payer?.active ?? false,
    activePersonIds,
    today,
  );

  return Response.json({ success: true, ...result });
}

// DELETE /api/groups/:id/recurring-expenses/:recurringExpenseId
// Soft delete: generated expenses keep their link, glyph and rule (R8).
export async function deleteRecurringExpense(
  ctx: RecurringExpenseContext,
  recurringExpenseId: string,
): Promise<Response> {
  const loaded = await loadRecurrence(ctx, recurringExpenseId);
  if (!loaded) return notFound();

  const now = new Date();
  await ctx.db
    .update(schema.recurringExpenses)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.recurringExpenses.id, loaded.row.id));

  return Response.json({ success: true });
}
