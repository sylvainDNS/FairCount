import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import { calculateOptimalSettlements } from '../utils/optimize-settlements';
import { calculateShares } from '../utils/share-calculation';

interface SettlementContext {
  readonly db: Database;
  readonly groupId: string;
  readonly userId: string;
  readonly currentMemberId: string;
}

interface ListParams {
  readonly filter?: string | undefined;
  readonly cursor?: string | undefined;
  readonly limit?: number | undefined;
}

interface CreateSettlementData {
  readonly toMember: string;
  readonly amount: number;
  readonly date: string;
}

// Calculate net balances for suggestions
async function calculateNetBalances(ctx: SettlementContext) {
  // Get active members
  const members = await ctx.db
    .select({
      id: schema.groupMembers.id,
      name: schema.groupMembers.name,
      userId: schema.groupMembers.userId,
      coefficient: schema.groupMembers.coefficient,
    })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, ctx.groupId), isNull(schema.groupMembers.leftAt)));

  const memberCoefficients = new Map(members.map((m) => [m.id, m.coefficient]));

  // Initialize balances
  const balances = new Map<
    string,
    {
      memberId: string;
      memberName: string;
      totalPaid: number;
      totalOwed: number;
      settlementsPaid: number;
      settlementsReceived: number;
      isCurrentUser: boolean;
    }
  >(
    members.map((m) => [
      m.id,
      {
        memberId: m.id,
        memberName: m.name,
        totalPaid: 0,
        totalOwed: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        isCurrentUser: m.id === ctx.currentMemberId,
      },
    ]),
  );

  // Get active expenses
  const expenses = await ctx.db
    .select()
    .from(schema.expenses)
    .where(and(eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)));

  if (expenses.length > 0) {
    const expenseIds = expenses.map((e) => e.id);
    const participants = await ctx.db
      .select()
      .from(schema.expenseParticipants)
      .where(
        sql`${schema.expenseParticipants.expenseId} IN (${sql.join(
          expenseIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    // Group by expense
    const participantsByExpense = new Map<
      string,
      Array<{ memberId: string; customAmount: number | null }>
    >();
    for (const p of participants) {
      const list = participantsByExpense.get(p.expenseId) ?? [];
      list.push({ memberId: p.memberId, customAmount: p.customAmount });
      participantsByExpense.set(p.expenseId, list);
    }

    // Process each expense
    for (const expense of expenses) {
      const payer = balances.get(expense.paidBy);
      if (payer) {
        balances.set(expense.paidBy, {
          ...payer,
          totalPaid: payer.totalPaid + expense.amount,
        });
      }

      // Calculate shares
      const expenseParticipants = participantsByExpense.get(expense.id) ?? [];
      const shares = calculateShares(expense.amount, expenseParticipants, memberCoefficients);

      for (const [memberId, share] of shares) {
        const member = balances.get(memberId);
        if (member) {
          balances.set(memberId, {
            ...member,
            totalOwed: member.totalOwed + share,
          });
        }
      }
    }
  }

  // Get existing settlements
  const settlements = await ctx.db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.groupId, ctx.groupId));

  for (const settlement of settlements) {
    const payer = balances.get(settlement.fromMember);
    if (payer) {
      balances.set(settlement.fromMember, {
        ...payer,
        settlementsPaid: payer.settlementsPaid + settlement.amount,
      });
    }

    const receiver = balances.get(settlement.toMember);
    if (receiver) {
      balances.set(settlement.toMember, {
        ...receiver,
        settlementsReceived: receiver.settlementsReceived + settlement.amount,
      });
    }
  }

  // Calculate net balances
  // settlementsPaid = what I reimbursed → increases my balance (I owe less)
  // settlementsReceived = what I received → decreases my balance (I'm owed less)
  return Array.from(balances.values()).map((b) => ({
    memberId: b.memberId,
    memberName: b.memberName,
    isCurrentUser: b.isCurrentUser,
    netBalance: b.totalPaid - b.totalOwed + b.settlementsPaid - b.settlementsReceived,
  }));
}

// GET /api/groups/:id/settlements
export async function listSettlements(
  ctx: SettlementContext,
  params: ListParams,
): Promise<Response> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const filter = params.filter as 'sent' | 'received' | undefined;

  // Build WHERE conditions
  const conditions = [eq(schema.settlements.groupId, ctx.groupId)];

  // Filter by direction
  if (filter === 'sent') {
    conditions.push(eq(schema.settlements.fromMember, ctx.currentMemberId));
  } else if (filter === 'received') {
    conditions.push(eq(schema.settlements.toMember, ctx.currentMemberId));
  }

  // Cursor-based pagination
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(lt(schema.settlements.createdAt, cursorDate));
    }
  }

  // Query with joins for names
  const results = await ctx.db
    .select({
      settlement: schema.settlements,
      fromName: sql<string>`fm.name`.as('fromName'),
      fromUserId: sql<string | null>`fm.user_id`.as('fromUserId'),
      toName: sql<string>`tm.name`.as('toName'),
      toUserId: sql<string | null>`tm.user_id`.as('toUserId'),
    })
    .from(schema.settlements)
    .innerJoin(sql`${schema.groupMembers} as fm`, sql`fm.id = ${schema.settlements.fromMember}`)
    .innerJoin(sql`${schema.groupMembers} as tm`, sql`tm.id = ${schema.settlements.toMember}`)
    .where(and(...conditions))
    .orderBy(desc(schema.settlements.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const settlements = hasMore ? results.slice(0, limit) : results;

  const settlementsList = settlements.map((r) => ({
    id: r.settlement.id,
    groupId: r.settlement.groupId,
    fromMember: {
      id: r.settlement.fromMember,
      name: r.fromName,
      isCurrentUser: r.settlement.fromMember === ctx.currentMemberId,
    },
    toMember: {
      id: r.settlement.toMember,
      name: r.toName,
      isCurrentUser: r.settlement.toMember === ctx.currentMemberId,
    },
    amount: r.settlement.amount,
    date: r.settlement.date,
    createdAt: r.settlement.createdAt.toISOString(),
  }));

  const lastSettlement = settlements[settlements.length - 1];
  const nextCursor =
    hasMore && lastSettlement ? lastSettlement.settlement.createdAt.toISOString() : null;

  return Response.json({
    settlements: settlementsList,
    nextCursor,
    hasMore,
  });
}

// GET /api/groups/:id/settlements/suggested
export async function getSuggestedSettlements(ctx: SettlementContext): Promise<Response> {
  const netBalances = await calculateNetBalances(ctx);
  const suggestions = calculateOptimalSettlements(netBalances);

  return Response.json({ suggestions });
}

// POST /api/groups/:id/settlements
export async function createSettlement(
  ctx: SettlementContext,
  data: CreateSettlementData,
): Promise<Response> {
  // Amount validation
  if (typeof data.amount !== 'number' || data.amount <= 0 || !Number.isInteger(data.amount)) {
    return Response.json({ error: 'INVALID_AMOUNT' }, { status: 400 });
  }

  // Date validation
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return Response.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

  // Check recipient exists and is active
  const [toMember] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, data.toMember),
        eq(schema.groupMembers.groupId, ctx.groupId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!toMember) {
    return Response.json({ error: 'INVALID_RECIPIENT' }, { status: 400 });
  }

  // Check not self
  if (data.toMember === ctx.currentMemberId) {
    return Response.json({ error: 'SAME_MEMBER' }, { status: 400 });
  }

  // Create settlement
  const settlementId = crypto.randomUUID();
  const now = new Date();

  await ctx.db.insert(schema.settlements).values({
    id: settlementId,
    groupId: ctx.groupId,
    fromMember: ctx.currentMemberId,
    toMember: data.toMember,
    amount: data.amount,
    date: data.date,
    createdAt: now,
  });

  return Response.json({ id: settlementId }, { status: 201 });
}

// DELETE /api/groups/:id/settlements/:settlementId
export async function deleteSettlement(
  ctx: SettlementContext,
  settlementId: string,
): Promise<Response> {
  // Check settlement exists
  const [settlement] = await ctx.db
    .select()
    .from(schema.settlements)
    .where(
      and(eq(schema.settlements.id, settlementId), eq(schema.settlements.groupId, ctx.groupId)),
    );

  if (!settlement) {
    return Response.json({ error: 'SETTLEMENT_NOT_FOUND' }, { status: 404 });
  }

  // Check user created this settlement
  if (settlement.fromMember !== ctx.currentMemberId) {
    return Response.json({ error: 'NOT_CREATOR' }, { status: 403 });
  }

  // Delete (hard delete)
  await ctx.db.delete(schema.settlements).where(eq(schema.settlements.id, settlementId));

  return Response.json({ success: true });
}
