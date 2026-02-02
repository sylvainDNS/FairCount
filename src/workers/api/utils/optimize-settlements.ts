/**
 * Greedy algorithm to minimize the number of transactions
 * needed to settle all balances in the group.
 */

// Tolerance in cents for balance integrity check
const BALANCE_TOLERANCE_CENTS = 1;

interface MemberBalance {
  readonly memberId: string;
  readonly memberName: string;
  readonly isCurrentUser: boolean;
  readonly netBalance: number; // positive = creditor, negative = debtor
}

interface OptimizedSettlement {
  readonly from: { readonly id: string; readonly name: string; readonly isCurrentUser: boolean };
  readonly to: { readonly id: string; readonly name: string; readonly isCurrentUser: boolean };
  readonly amount: number;
}

/**
 * Calculates optimal reimbursements to settle balances.
 *
 * Greedy strategy:
 * 1. Separate members into creditors (balance > 0) and debtors (balance < 0)
 * 2. Sort by absolute value descending
 * 3. Match largest creditor with largest debtor
 * 4. Transfer min(credit, |debt|)
 * 5. Remove members whose balance becomes zero
 * 6. Repeat until all settled
 */
export function calculateOptimalSettlements(
  balances: ReadonlyArray<MemberBalance>,
): OptimizedSettlement[] {
  // Edge cases
  if (balances.length <= 1) return [];

  // Verify integrity (sum should be ~0)
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  if (Math.abs(total) > BALANCE_TOLERANCE_CENTS) {
    // Log for debugging but don't block - this could happen due to rounding
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('Balances do not sum to zero:', total);
    }
  }

  // Filter zero balances and create mutable copies
  const creditors = balances
    .filter((b) => b.netBalance > 0)
    .map((b) => ({ ...b, balance: b.netBalance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.netBalance < 0)
    .map((b) => ({ ...b, balance: Math.abs(b.netBalance) }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: OptimizedSettlement[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0) {
      settlements.push({
        from: {
          id: debtor.memberId,
          name: debtor.memberName,
          isCurrentUser: debtor.isCurrentUser,
        },
        to: {
          id: creditor.memberId,
          name: creditor.memberName,
          isCurrentUser: creditor.isCurrentUser,
        },
        amount,
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    // Remove members whose balance is settled
    if (creditor.balance <= 0) creditors.shift();
    if (debtor.balance <= 0) debtors.shift();
  }

  return settlements;
}
