import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import { calculateShares } from './share-calculation';
import { activeGroupMembersCondition, sqlInClause } from './sql-helpers';

export interface BalanceContext {
  readonly db: Database;
  readonly groupId: string;
  readonly currentMemberId: string;
}

export interface MemberBalance {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberUserId: string | null;
  readonly totalPaid: number;
  readonly totalOwed: number;
  readonly balance: number;
  readonly settlementsPaid: number;
  readonly settlementsReceived: number;
  readonly netBalance: number;
  readonly isCurrentUser: boolean;
}

/**
 * Calcule les balances pour tous les membres actifs d'un groupe.
 * Prend en compte les dépenses, les parts et les règlements.
 */
export async function calculateGroupBalances(ctx: BalanceContext): Promise<MemberBalance[]> {
  // Récupérer les membres actifs
  const members = await ctx.db
    .select({
      id: schema.groupMembers.id,
      name: schema.groupMembers.name,
      userId: schema.groupMembers.userId,
      coefficient: schema.groupMembers.coefficient,
    })
    .from(schema.groupMembers)
    .where(activeGroupMembersCondition(ctx.groupId));

  const memberCoefficients = new Map(members.map((m) => [m.id, m.coefficient]));

  // Initialiser les balances
  const balances = new Map<string, MemberBalance>(
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

  // Récupérer les dépenses actives
  const expenses = await ctx.db
    .select()
    .from(schema.expenses)
    .where(and(eq(schema.expenses.groupId, ctx.groupId), isNull(schema.expenses.deletedAt)));

  if (expenses.length > 0) {
    // Récupérer les participants pour ces dépenses
    const expenseIds = expenses.map((e) => e.id);
    const expenseIdsInClause = sqlInClause(schema.expenseParticipants.expenseId, expenseIds);
    const participants = expenseIdsInClause
      ? await ctx.db.select().from(schema.expenseParticipants).where(expenseIdsInClause)
      : [];

    // Grouper les participants par dépense
    const participantsByExpense = new Map<
      string,
      Array<{ memberId: string; customAmount: number | null }>
    >();
    for (const p of participants) {
      const list = participantsByExpense.get(p.expenseId) ?? [];
      participantsByExpense.set(p.expenseId, [
        ...list,
        { memberId: p.memberId, customAmount: p.customAmount },
      ]);
    }

    // Traiter chaque dépense
    for (const expense of expenses) {
      // Ajouter ce que le payeur a payé
      const payer = balances.get(expense.paidBy);
      if (payer) {
        balances.set(expense.paidBy, {
          ...payer,
          totalPaid: payer.totalPaid + expense.amount,
        });
      }

      // Calculer les parts et ajouter à totalOwed
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

  // Récupérer les règlements du groupe
  const settlements = await ctx.db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.groupId, ctx.groupId));

  // Traiter les règlements
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

  // Calculer les balances finales
  let result: MemberBalance[] = [];
  for (const balance of balances.values()) {
    const rawBalance = balance.totalPaid - balance.totalOwed;
    // settlementsPaid = ce que j'ai remboursé → augmente ma balance (je dois moins)
    // settlementsReceived = ce que j'ai reçu → diminue ma balance (on me doit moins)
    const netBalance = rawBalance + balance.settlementsPaid - balance.settlementsReceived;
    result = [
      ...result,
      {
        ...balance,
        balance: rawBalance,
        netBalance,
      },
    ];
  }

  // Trier par netBalance décroissant (créditeurs d'abord, puis débiteurs)
  result.sort((a, b) => b.netBalance - a.netBalance);

  return result;
}

/**
 * Vérifie l'intégrité des balances (la somme doit être 0).
 */
export function verifyBalancesIntegrity(balances: readonly MemberBalance[]): boolean {
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  return Math.abs(total) < 1; // Tolérance d'1 centime pour les arrondis
}
