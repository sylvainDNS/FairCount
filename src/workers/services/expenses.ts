import { and, desc, eq, exists, gte, isNull, like, lte, sql } from 'drizzle-orm';
import type { Database } from '@/db';
import * as schema from '@/db/schema';
import { calculateShares } from './shared/share-calculation';
import {
  activeGroupMembersCondition,
  buildCursorCondition,
  memberDisplayName,
  sqlInClause,
} from './shared/sql-helpers';

interface ExpenseContext {
  readonly db: Database;
  readonly groupId: string;
  readonly userId: string;
  readonly currentMemberId: string;
}

interface ListExpensesParams {
  cursor?: string | undefined;
  limit?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  paidBy?: string | undefined;
  participantId?: string | undefined;
  search?: string | undefined;
}

interface CreateExpenseData {
  amount: number;
  description: string;
  date: string;
  paidBy: string;
  participants: Array<{ memberId: string; customAmount?: number | null | undefined }>;
}

interface UpdateExpenseData {
  amount?: number | undefined;
  description?: string | undefined;
  date?: string | undefined;
  paidBy?: string | undefined;
  participants?: Array<{ memberId: string; customAmount?: number | null | undefined }> | undefined;
}

// Participant validation result
type ParticipantValidationResult =
  | { valid: true; customAmountsTotal: number }
  | {
      valid: false;
      error: 'NO_PARTICIPANTS' | 'INVALID_PARTICIPANT' | 'CUSTOM_AMOUNTS_EXCEED_TOTAL';
    };

// Validate participants against active members and check custom amounts
function validateParticipants(
  participants: Array<{ memberId: string; customAmount?: number | null | undefined }>,
  activeMemberIds: Set<string>,
  totalAmount: number,
): ParticipantValidationResult {
  if (!participants || participants.length === 0) {
    return { valid: false, error: 'NO_PARTICIPANTS' };
  }

  // Validate all participants are active members
  const hasInvalidMember = participants.some((p) => !activeMemberIds.has(p.memberId));
  if (hasInvalidMember) {
    return { valid: false, error: 'INVALID_PARTICIPANT' };
  }

  // Validate custom amounts format
  const hasInvalidCustomAmount = participants.some(
    (p) =>
      p.customAmount !== null &&
      p.customAmount !== undefined &&
      (typeof p.customAmount !== 'number' || p.customAmount < 0),
  );
  if (hasInvalidCustomAmount) {
    return { valid: false, error: 'INVALID_PARTICIPANT' };
  }

  // Calculate total of custom amounts
  const customAmountsTotal = participants.reduce((sum, p) => sum + (p.customAmount ?? 0), 0);

  if (customAmountsTotal > totalAmount) {
    return { valid: false, error: 'CUSTOM_AMOUNTS_EXCEED_TOTAL' };
  }

  return { valid: true, customAmountsTotal };
}

// List expenses with pagination and filters
export async function listExpenses(
  ctx: ExpenseContext,
  params: ListExpensesParams,
): Promise<Response> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

  // Build conditions
  const conditions = [eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)];

  const cursorCondition = buildCursorCondition(schema.expenses.createdAt, params.cursor);
  if (cursorCondition) {
    conditions.push(cursorCondition);
  }

  if (params.startDate) {
    conditions.push(gte(schema.expenses.date, params.startDate));
  }

  if (params.endDate) {
    conditions.push(lte(schema.expenses.date, params.endDate));
  }

  if (params.paidBy) {
    conditions.push(eq(schema.expenses.paidBy, params.paidBy));
  }

  if (params.search) {
    // Escape LIKE special characters to prevent wildcard injection
    const escapedSearch = params.search.replace(/[%_\\]/g, '\\$&');
    conditions.push(like(schema.expenses.description, `%${escapedSearch}%`));
  }

  // Build base query
  let query = ctx.db
    .select({
      expense: schema.expenses,
      payerName: memberDisplayName,
    })
    .from(schema.expenses)
    .innerJoin(schema.groupMembers, eq(schema.expenses.paidBy, schema.groupMembers.id))
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(and(...conditions))
    .orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt))
    .limit(limit + 1);

  // Add participant filter using subquery
  if (params.participantId) {
    query = ctx.db
      .select({
        expense: schema.expenses,
        payerName: memberDisplayName,
      })
      .from(schema.expenses)
      .innerJoin(schema.groupMembers, eq(schema.expenses.paidBy, schema.groupMembers.id))
      .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(
        and(
          ...conditions,
          exists(
            ctx.db
              .select({ one: sql`1` })
              .from(schema.expenseParticipants)
              .where(
                and(
                  eq(schema.expenseParticipants.expenseId, schema.expenses.id),
                  eq(schema.expenseParticipants.memberId, params.participantId),
                ),
              ),
          ),
        ),
      )
      .orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt))
      .limit(limit + 1);
  }

  const results = await query;

  const hasMore = results.length > limit;
  const expenses = hasMore ? results.slice(0, limit) : results;

  // Get participant counts and my shares
  const expenseIds = expenses.map((r) => r.expense.id);

  if (expenseIds.length === 0) {
    return Response.json({
      expenses: [],
      nextCursor: null,
      hasMore: false,
    });
  }

  // Get all participants for these expenses
  const inClause = sqlInClause(schema.expenseParticipants.expenseId, expenseIds);
  const participants = inClause
    ? await ctx.db.select().from(schema.expenseParticipants).where(inClause)
    : [];

  // Group participants by expense
  const participantsByExpense = new Map<
    string,
    Array<{ memberId: string; customAmount: number | null }>
  >();
  const participantMemberIds = new Set<string>();

  for (const p of participants) {
    const list = participantsByExpense.get(p.expenseId) ?? [];
    list.push({ memberId: p.memberId, customAmount: p.customAmount });
    participantsByExpense.set(p.expenseId, list);
    participantMemberIds.add(p.memberId);
  }

  // Also add current user to get their share
  participantMemberIds.add(ctx.currentMemberId);

  // Get member coefficients only for participants (optimized)
  const memberIdsInClause = sqlInClause(schema.groupMembers.id, [...participantMemberIds]);
  const memberCoefficients = memberIdsInClause
    ? new Map(
        (
          await ctx.db
            .select({ id: schema.groupMembers.id, coefficient: schema.groupMembers.coefficient })
            .from(schema.groupMembers)
            .where(memberIdsInClause)
        ).map((m) => [m.id, m.coefficient]),
      )
    : new Map<string, number>();

  // Get creator names
  const creatorIds = [...new Set(expenses.map((r) => r.expense.createdBy))];
  const creatorIdsInClause = sqlInClause(schema.groupMembers.id, creatorIds);
  const creators = creatorIdsInClause
    ? await ctx.db
        .select({ id: schema.groupMembers.id, name: memberDisplayName })
        .from(schema.groupMembers)
        .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
        .where(creatorIdsInClause)
    : [];
  const creatorNames = new Map(creators.map((c) => [c.id, c.name]));

  const expensesList = expenses.map((r) => {
    const expenseParticipants = participantsByExpense.get(r.expense.id) ?? [];
    const shares = calculateShares(r.expense.amount, expenseParticipants, memberCoefficients);

    return {
      id: r.expense.id,
      groupId: r.expense.groupId,
      paidBy: {
        id: r.expense.paidBy,
        name: r.payerName,
      },
      amount: r.expense.amount,
      description: r.expense.description,
      date: r.expense.date,
      createdBy: {
        id: r.expense.createdBy,
        name: creatorNames.get(r.expense.createdBy) ?? 'Inconnu',
      },
      createdAt: r.expense.createdAt.toISOString(),
      participantCount: expenseParticipants.length,
      myShare: shares.get(ctx.currentMemberId) ?? null,
    };
  });

  const lastExpense = expenses[expenses.length - 1];
  const nextCursor = hasMore && lastExpense ? lastExpense.expense.createdAt.toISOString() : null;

  return Response.json({
    expenses: expensesList,
    nextCursor,
    hasMore,
  });
}

// Get expense detail
export async function getExpense(ctx: ExpenseContext, expenseId: string): Promise<Response> {
  const [result] = await ctx.db
    .select({
      expense: schema.expenses,
      payerName: memberDisplayName,
    })
    .from(schema.expenses)
    .innerJoin(schema.groupMembers, eq(schema.expenses.paidBy, schema.groupMembers.id))
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.expenses.id, expenseId),
        eq(schema.expenses.groupId, ctx.groupId),
        isNull(schema.expenses.deletedAt),
      ),
    );

  if (!result) {
    return Response.json({ error: 'EXPENSE_NOT_FOUND' }, { status: 404 });
  }

  // Get participants with member names
  const participants = await ctx.db
    .select({
      participant: schema.expenseParticipants,
      memberName: memberDisplayName,
      memberUserId: schema.groupMembers.userId,
    })
    .from(schema.expenseParticipants)
    .innerJoin(schema.groupMembers, eq(schema.expenseParticipants.memberId, schema.groupMembers.id))
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(eq(schema.expenseParticipants.expenseId, expenseId));

  // Get member coefficients
  const members = await ctx.db
    .select({ id: schema.groupMembers.id, coefficient: schema.groupMembers.coefficient })
    .from(schema.groupMembers)
    .where(activeGroupMembersCondition(ctx.groupId));

  const memberCoefficients = new Map(members.map((m) => [m.id, m.coefficient]));

  // Calculate shares
  const participantData = participants.map((p) => ({
    memberId: p.participant.memberId,
    customAmount: p.participant.customAmount,
  }));
  const shares = calculateShares(result.expense.amount, participantData, memberCoefficients);

  // Get creator name
  const [creator] = await ctx.db
    .select({ name: memberDisplayName, userId: schema.groupMembers.userId })
    .from(schema.groupMembers)
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(eq(schema.groupMembers.id, result.expense.createdBy));

  const isCreator = result.expense.createdBy === ctx.currentMemberId;

  return Response.json({
    id: result.expense.id,
    groupId: result.expense.groupId,
    paidBy: {
      id: result.expense.paidBy,
      name: result.payerName,
      isCurrentUser: result.expense.paidBy === ctx.currentMemberId,
    },
    amount: result.expense.amount,
    description: result.expense.description,
    date: result.expense.date,
    createdBy: {
      id: result.expense.createdBy,
      name: creator?.name ?? 'Inconnu',
      isCurrentUser: isCreator,
    },
    createdAt: result.expense.createdAt.toISOString(),
    updatedAt: result.expense.updatedAt.toISOString(),
    participants: participants.map((p) => ({
      id: p.participant.id,
      memberId: p.participant.memberId,
      memberName: p.memberName,
      customAmount: p.participant.customAmount,
      calculatedShare: shares.get(p.participant.memberId) ?? 0,
      isCurrentUser: p.memberUserId === ctx.userId,
    })),
    canEdit: isCreator,
    canDelete: isCreator,
  });
}

// Create expense
export async function createExpense(
  ctx: ExpenseContext,
  data: CreateExpenseData,
): Promise<Response> {
  // Validate amount
  if (typeof data.amount !== 'number' || data.amount <= 0 || !Number.isInteger(data.amount)) {
    return Response.json({ error: 'INVALID_AMOUNT' }, { status: 400 });
  }

  // Validate description
  const description = data.description?.trim();
  if (!description) {
    return Response.json({ error: 'INVALID_DESCRIPTION' }, { status: 400 });
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return Response.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  // Validate payer exists and is active member
  const [payer] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, data.paidBy),
        eq(schema.groupMembers.groupId, ctx.groupId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!payer) {
    return Response.json({ error: 'INVALID_PAYER' }, { status: 400 });
  }

  // Get all active members to validate participants
  const activeMembers = await ctx.db
    .select({ id: schema.groupMembers.id })
    .from(schema.groupMembers)
    .where(activeGroupMembersCondition(ctx.groupId));

  const activeMemberIds = new Set(activeMembers.map((m) => m.id));

  // Validate participants
  const validation = validateParticipants(data.participants, activeMemberIds, data.amount);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  // Create expense
  const expenseId = crypto.randomUUID();
  const now = new Date();

  await ctx.db.insert(schema.expenses).values({
    id: expenseId,
    groupId: ctx.groupId,
    paidBy: data.paidBy,
    amount: data.amount,
    description,
    date: data.date,
    createdBy: ctx.currentMemberId,
    createdAt: now,
    updatedAt: now,
  });

  // Create participants
  const participantInserts = data.participants.map((p) => ({
    id: crypto.randomUUID(),
    expenseId,
    memberId: p.memberId,
    customAmount: p.customAmount ?? null,
  }));

  if (participantInserts.length > 0) {
    await ctx.db.insert(schema.expenseParticipants).values(participantInserts);
  }

  return Response.json({ id: expenseId }, { status: 201 });
}

// Update expense
export async function updateExpense(
  ctx: ExpenseContext,
  expenseId: string,
  data: UpdateExpenseData,
): Promise<Response> {
  // Get expense
  const [expense] = await ctx.db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, expenseId),
        eq(schema.expenses.groupId, ctx.groupId),
        isNull(schema.expenses.deletedAt),
      ),
    );

  if (!expense) {
    return Response.json({ error: 'EXPENSE_NOT_FOUND' }, { status: 404 });
  }

  // Check if user is creator
  if (expense.createdBy !== ctx.currentMemberId) {
    return Response.json({ error: 'NOT_CREATOR' }, { status: 403 });
  }

  const updates: Partial<{
    amount: number;
    description: string;
    date: string;
    paidBy: string;
    updatedAt: Date;
  }> = {
    updatedAt: new Date(),
  };

  // Validate and apply updates
  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || data.amount <= 0 || !Number.isInteger(data.amount)) {
      return Response.json({ error: 'INVALID_AMOUNT' }, { status: 400 });
    }
    updates.amount = data.amount;
  }

  if (data.description !== undefined) {
    const description = data.description.trim();
    if (!description) {
      return Response.json({ error: 'INVALID_DESCRIPTION' }, { status: 400 });
    }
    updates.description = description;
  }

  if (data.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return Response.json({ error: 'INVALID_DATE' }, { status: 400 });
    }
    updates.date = data.date;
  }

  if (data.paidBy !== undefined) {
    const [payer] = await ctx.db
      .select()
      .from(schema.groupMembers)
      .where(
        and(
          eq(schema.groupMembers.id, data.paidBy),
          eq(schema.groupMembers.groupId, ctx.groupId),
          isNull(schema.groupMembers.leftAt),
        ),
      );

    if (!payer) {
      return Response.json({ error: 'INVALID_PAYER' }, { status: 400 });
    }
    updates.paidBy = data.paidBy;
  }

  // Update expense
  await ctx.db.update(schema.expenses).set(updates).where(eq(schema.expenses.id, expenseId));

  // Update participants if provided
  if (data.participants !== undefined) {
    const activeMembers = await ctx.db
      .select({ id: schema.groupMembers.id })
      .from(schema.groupMembers)
      .where(activeGroupMembersCondition(ctx.groupId));

    const activeMemberIds = new Set(activeMembers.map((m) => m.id));
    const expenseAmount = updates.amount ?? expense.amount;

    // Validate participants
    const validation = validateParticipants(data.participants, activeMemberIds, expenseAmount);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // Delete existing participants and recreate
    await ctx.db
      .delete(schema.expenseParticipants)
      .where(eq(schema.expenseParticipants.expenseId, expenseId));

    const participantInserts = data.participants.map((p) => ({
      id: crypto.randomUUID(),
      expenseId,
      memberId: p.memberId,
      customAmount: p.customAmount ?? null,
    }));

    await ctx.db.insert(schema.expenseParticipants).values(participantInserts);
  }

  return Response.json({ success: true });
}

// Delete expense (soft delete)
export async function deleteExpense(ctx: ExpenseContext, expenseId: string): Promise<Response> {
  const [expense] = await ctx.db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.id, expenseId),
        eq(schema.expenses.groupId, ctx.groupId),
        isNull(schema.expenses.deletedAt),
      ),
    );

  if (!expense) {
    return Response.json({ error: 'EXPENSE_NOT_FOUND' }, { status: 404 });
  }

  // Check if user is creator
  if (expense.createdBy !== ctx.currentMemberId) {
    return Response.json({ error: 'NOT_CREATOR' }, { status: 403 });
  }

  // Soft delete
  await ctx.db
    .update(schema.expenses)
    .set({ deletedAt: new Date() })
    .where(eq(schema.expenses.id, expenseId));

  return Response.json({ success: true });
}
