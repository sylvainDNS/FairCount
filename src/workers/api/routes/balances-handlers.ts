import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import { calculateShares } from '../utils/share-calculation';

interface BalanceContext {
  readonly db: Database;
  readonly groupId: string;
  readonly userId: string;
  readonly currentMemberId: string;
}

interface Balance {
  memberId: string;
  memberName: string;
  memberUserId: string | null;
  totalPaid: number;
  totalOwed: number;
  balance: number;
  settlementsPaid: number;
  settlementsReceived: number;
  netBalance: number;
  isCurrentUser: boolean;
}

// Calculate balances for all members
async function calculateBalances(ctx: BalanceContext): Promise<Balance[]> {
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
  const balances = new Map<string, Balance>(
    members.map((m) => [
      m.id,
      {
        memberId: m.id,
        memberName: m.name,
        memberUserId: m.userId,
        totalPaid: 0,
        totalOwed: 0,
        balance: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 0,
        isCurrentUser: m.id === ctx.currentMemberId,
      },
    ]),
  );

  // Get all active expenses for the group
  const expenses = await ctx.db
    .select()
    .from(schema.expenses)
    .where(and(eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)));

  if (expenses.length > 0) {
    // Get all participants for these expenses
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

    // Group participants by expense
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
      // Add what the payer paid
      const payer = balances.get(expense.paidBy);
      if (payer) {
        balances.set(expense.paidBy, {
          ...payer,
          totalPaid: payer.totalPaid + expense.amount,
        });
      }

      // Calculate shares and add to totalOwed
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

  // Get all settlements for the group
  const settlements = await ctx.db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.groupId, ctx.groupId));

  // Process settlements
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

  // Calculate final balances
  const result: Balance[] = [];
  for (const balance of balances.values()) {
    const rawBalance = balance.totalPaid - balance.totalOwed;
    // settlementsPaid = what I reimbursed → increases my balance (I owe less)
    // settlementsReceived = what I received → decreases my balance (I'm owed less)
    const netBalance = rawBalance + balance.settlementsPaid - balance.settlementsReceived;
    result.push({
      ...balance,
      balance: rawBalance,
      netBalance,
    });
  }

  // Sort by netBalance descending (creditors first, then debtors)
  result.sort((a, b) => b.netBalance - a.netBalance);

  return result;
}

// Verify balance integrity (sum should be 0)
function verifyIntegrity(balances: Balance[]): boolean {
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  return Math.abs(total) < 1; // Tolerance of 1 cent for rounding
}

// List all balances for a group
export async function listBalances(ctx: BalanceContext): Promise<Response> {
  const balances = await calculateBalances(ctx);
  const totalExpenses = balances.reduce((sum, b) => sum + b.totalPaid, 0);
  const isValid = verifyIntegrity(balances);

  return Response.json({
    balances,
    totalExpenses,
    isValid,
  });
}

// Get my balance detail
export async function getMyBalance(ctx: BalanceContext): Promise<Response> {
  const balances = await calculateBalances(ctx);
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
    .where(and(eq(schema.groupMembers.groupId, ctx.groupId), isNull(schema.groupMembers.leftAt)));
  const memberCoefficients = new Map(members.map((m) => [m.id, m.coefficient]));

  // Get participants for my expenses
  const expenseIds = myExpenses.map((e) => e.expense.id);
  const participantsByExpense = new Map<
    string,
    Array<{ memberId: string; customAmount: number | null }>
  >();

  if (expenseIds.length > 0) {
    const participants = await ctx.db
      .select()
      .from(schema.expenseParticipants)
      .where(
        sql`${schema.expenseParticipants.expenseId} IN (${sql.join(
          expenseIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    for (const p of participants) {
      const list = participantsByExpense.get(p.expenseId) ?? [];
      list.push({ memberId: p.memberId, customAmount: p.customAmount });
      participantsByExpense.set(p.expenseId, list);
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
  const conditions = [eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)];

  if (dateFilter) {
    const dateStr = dateFilter.toISOString().split('T')[0];
    conditions.push(gte(schema.expenses.date, dateStr as string));
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
