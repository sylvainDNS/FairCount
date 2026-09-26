import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Database } from '@/db';
import * as schema from '@/db/schema';
import { calculateShares } from './share-calculation';
import { memberDisplayName, selectByIdsChunked } from './sql-helpers';

/**
 * Compute how a single expense's amount is borne on the payer side.
 * - Real member payer: the whole amount is attributed to that member.
 * - Joint-account payer: the amount is spread across the active real members
 *   proportionally to their income coefficients, reusing the same fair-share
 *   engine (and thus the same deterministic rounding) as the owed side. This
 *   keeps the group balances summing to exactly zero.
 *
 * Pure function — no DB access — so the monetary invariants are unit-testable
 * without a D1 harness.
 */
export function calculatePaidShares(
  expense: { paidBy: string; amount: number },
  isJointPayer: boolean,
  activePersonIds: readonly string[],
  coefficients: Map<string, number>,
): Map<string, number> {
  if (!isJointPayer) {
    return new Map([[expense.paidBy, expense.amount]]);
  }

  const participants = activePersonIds.map((memberId) => ({
    memberId,
    customAmount: null,
  }));
  return calculateShares(expense.amount, participants, coefficients);
}

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
  // Active persons, plus the joint account regardless of its active state: a
  // disabled joint account must still be recognised as the payer of past
  // expenses, otherwise their amount is dropped and balances stop summing to 0.
  const members = await ctx.db
    .select({
      id: schema.groupMembers.id,
      name: memberDisplayName,
      userId: schema.groupMembers.userId,
      coefficient: schema.groupMembers.coefficient,
      kind: schema.groupMembers.kind,
    })
    .from(schema.groupMembers)
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(
      and(
        eq(schema.groupMembers.groupId, ctx.groupId),
        or(isNull(schema.groupMembers.leftAt), eq(schema.groupMembers.kind, 'joint_account')),
      ),
    );

  // The joint account never has a balance of its own; only real persons do.
  const persons = members.filter((m) => m.kind === 'person');
  const jointMemberIds = new Set(
    members.filter((m) => m.kind === 'joint_account').map((m) => m.id),
  );
  const activePersonIds = persons.map((m) => m.id);
  const memberCoefficients = new Map(persons.map((m) => [m.id, m.coefficient]));

  // Initialiser les balances (personnes uniquement)
  const balances = new Map<string, MemberBalance>(
    persons.map((m) => [
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
    const participants = await selectByIdsChunked(expenseIds, (chunk) =>
      ctx.db
        .select()
        .from(schema.expenseParticipants)
        .where(inArray(schema.expenseParticipants.expenseId, chunk)),
    );

    // Grouper les participants par dépense
    const participantsByExpense = new Map<
      string,
      Array<{ memberId: string; customAmount: number | null }>
    >();
    for (const p of participants) {
      const list = participantsByExpense.get(p.expenseId) ?? [];
      list.push({ memberId: p.memberId, customAmount: p.customAmount });
      participantsByExpense.set(p.expenseId, list);
    }

    // Traiter chaque dépense
    for (const expense of expenses) {
      // Répartir ce qui a été payé (payeur réel ou compte commun au prorata)
      const paidShares = calculatePaidShares(
        expense,
        jointMemberIds.has(expense.paidBy),
        activePersonIds,
        memberCoefficients,
      );
      for (const [memberId, share] of paidShares) {
        const member = balances.get(memberId);
        if (member) {
          balances.set(memberId, {
            ...member,
            totalPaid: member.totalPaid + share,
          });
        }
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

  // Calculer les balances finales et trier par netBalance décroissant
  return Array.from(balances.values())
    .map((balance) => {
      const rawBalance = balance.totalPaid - balance.totalOwed;
      // settlementsPaid = ce que j'ai remboursé → augmente ma balance (je dois moins)
      // settlementsReceived = ce que j'ai reçu → diminue ma balance (on me doit moins)
      const netBalance = rawBalance + balance.settlementsPaid - balance.settlementsReceived;
      return {
        ...balance,
        balance: rawBalance,
        netBalance,
      };
    })
    .sort((a, b) => b.netBalance - a.netBalance);
}

/**
 * Vérifie l'intégrité des balances (la somme doit être 0).
 */
export function verifyBalancesIntegrity(balances: readonly MemberBalance[]): boolean {
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  return Math.abs(total) < 1; // Tolérance d'1 centime pour les arrondis
}
