import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import {
  type BalanceContext as BaseBalanceContext,
  calculateGroupBalances,
  verifyBalancesIntegrity,
} from '../utils/balance-calculation';
import { calculateShares } from '../utils/share-calculation';
import { activeGroupMembersCondition, sqlInClause } from '../utils/sql-helpers';

interface BalanceContext extends BaseBalanceContext {
  readonly userId: string;
}

// List all balances for a group
export async function listBalances(ctx: BalanceContext): Promise<Response> {
  const balances = await calculateGroupBalances(ctx);
  const totalExpenses = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const isValid = verifyBalancesIntegrity(balances);

  return Response.json({
    balances,
    totalExpenses,
    isValid,
  });
}

// Get my balance detail
export async function getMyBalance(ctx: BalanceContext): Promise<Response> {
  const balances = await calculateGroupBalances(ctx);
  const myBalance = balances.find((b) => b.memberId === ctx.currentMemberId);

  if (!myBalance) {
    return Response.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  }

  // Get expenses where I'm a participant
  const myExpenses = await ctx.db
    .select({
      expense: schema.expenses,
      payerName: schema.groupMembers.name,
    })
    .from(schema.expenses)
    .innerJoin(schema.groupMembers, eq(schema.expenses.paidBy, schema.groupMembers.id))
    .where(
      and(
        eq(schema.expenses.groupId, ctx.groupId),
        isNull(schema.expenses.deletedAt),
        sql`EXISTS (
          SELECT 1 FROM ${schema.expenseParticipants}
          WHERE ${schema.expenseParticipants.expenseId} = ${schema.expenses.id}
          AND ${schema.expenseParticipants.memberId} = ${ctx.currentMemberId}
        )`,
      ),
    );

  // Get member coefficients
  const members = await ctx.db
    .select({ id: schema.groupMembers.id, coefficient: schema.groupMembers.coefficient })
    .from(schema.groupMembers)
    .where(activeGroupMembersCondition(ctx.groupId));
  const memberCoefficients = new Map(members.map((m) => [m.id, m.coefficient]));

  // Get participants for my expenses
  const expenseIds = myExpenses.map((e) => e.expense.id);
  const participantsByExpense = new Map<
    string,
    Array<{ memberId: string; customAmount: number | null }>
  >();

  const expenseIdsInClause = sqlInClause(schema.expenseParticipants.expenseId, expenseIds);
  if (expenseIdsInClause) {
    const participants = await ctx.db
      .select()
      .from(schema.expenseParticipants)
      .where(expenseIdsInClause);

    for (const p of participants) {
      const list = participantsByExpense.get(p.expenseId) ?? [];
      participantsByExpense.set(p.expenseId, [
        ...list,
        { memberId: p.memberId, customAmount: p.customAmount },
      ]);
    }
  }

  // Build expense list with my share
  const expenses = myExpenses.map((e) => {
    const expenseParticipants = participantsByExpense.get(e.expense.id) ?? [];
    const shares = calculateShares(e.expense.amount, expenseParticipants, memberCoefficients);
    const myShare = shares.get(ctx.currentMemberId) ?? 0;

    return {
      id: e.expense.id,
      description: e.expense.description,
      date: e.expense.date,
      amount: e.expense.amount,
      paidBy: {
        id: e.expense.paidBy,
        name: e.payerName,
      },
      myShare,
      isPayer: e.expense.paidBy === ctx.currentMemberId,
    };
  });

  // Get my settlements
  const sentSettlements = await ctx.db
    .select({
      settlement: schema.settlements,
      receiverName: schema.groupMembers.name,
      receiverId: schema.groupMembers.id,
    })
    .from(schema.settlements)
    .innerJoin(schema.groupMembers, eq(schema.settlements.toMember, schema.groupMembers.id))
    .where(
      and(
        eq(schema.settlements.groupId, ctx.groupId),
        eq(schema.settlements.fromMember, ctx.currentMemberId),
      ),
    );

  const receivedSettlements = await ctx.db
    .select({
      settlement: schema.settlements,
      senderName: schema.groupMembers.name,
      senderId: schema.groupMembers.id,
    })
    .from(schema.settlements)
    .innerJoin(schema.groupMembers, eq(schema.settlements.fromMember, schema.groupMembers.id))
    .where(
      and(
        eq(schema.settlements.groupId, ctx.groupId),
        eq(schema.settlements.toMember, ctx.currentMemberId),
      ),
    );

  const settlements = [
    ...sentSettlements.map((s) => ({
      id: s.settlement.id,
      date: s.settlement.date,
      amount: s.settlement.amount,
      direction: 'sent' as const,
      otherMember: {
        id: s.receiverId,
        name: s.receiverName,
      },
    })),
    ...receivedSettlements.map((s) => ({
      id: s.settlement.id,
      date: s.settlement.date,
      amount: s.settlement.amount,
      direction: 'received' as const,
      otherMember: {
        id: s.senderId,
        name: s.senderName,
      },
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return Response.json({
    balance: myBalance,
    expenses,
    settlements,
  });
}

// Get group stats
export async function getGroupStats(ctx: BalanceContext, period?: string): Promise<Response> {
  // Calculate date filter based on period
  let dateFilter: Date | null = null;
  const now = new Date();

  switch (period) {
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      dateFilter = new Date(now.getFullYear(), 0, 1);
      break;
    // 'all' or undefined means no date filter
  }

  // Build query conditions
  let conditions = [eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)];

  if (dateFilter) {
    const dateStr = dateFilter.toISOString().split('T')[0];
    conditions = [...conditions, gte(schema.expenses.date, dateStr as string)];
  }

  // Get expenses
  const expenses = await ctx.db
    .select({
      expense: schema.expenses,
      payerName: schema.groupMembers.name,
    })
    .from(schema.expenses)
    .innerJoin(schema.groupMembers, eq(schema.expenses.paidBy, schema.groupMembers.id))
    .where(and(...conditions));

  // Calculate stats by member
  const memberStats = new Map<string, { name: string; totalPaid: number }>();
  for (const e of expenses) {
    const current = memberStats.get(e.expense.paidBy) ?? { name: e.payerName, totalPaid: 0 };
    memberStats.set(e.expense.paidBy, {
      name: current.name,
      totalPaid: current.totalPaid + e.expense.amount,
    });
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.expense.amount, 0);
  const expenseCount = expenses.length;
  const averageExpense = expenseCount > 0 ? Math.round(totalExpenses / expenseCount) : 0;

  const byMember = Array.from(memberStats.entries())
    .map(([memberId, data]) => ({
      memberId,
      memberName: data.name,
      totalPaid: data.totalPaid,
      percentage: totalExpenses > 0 ? Math.round((data.totalPaid / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);

  // Calculate stats by month
  const monthStats = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const month = e.expense.date.substring(0, 7); // YYYY-MM
    const current = monthStats.get(month) ?? { total: 0, count: 0 };
    monthStats.set(month, {
      total: current.total + e.expense.amount,
      count: current.count + 1,
    });
  }

  const byMonth = Array.from(monthStats.entries())
    .map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return Response.json({
    totalExpenses,
    expenseCount,
    averageExpense,
    byMember,
    byMonth,
  });
}
