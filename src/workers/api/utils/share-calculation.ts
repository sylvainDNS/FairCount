/**
 * Calculate fair shares based on income coefficients.
 * Shared utility used by both balances and settlements handlers.
 */
export function calculateShares(
  amount: number,
  participants: Array<{ memberId: string; customAmount: number | null }>,
  memberCoefficients: Map<string, number>,
): Map<string, number> {
  const shares = new Map<string, number>();

  let remainingAmount = amount;
  let fairShareParticipants: string[] = [];

  for (const p of participants) {
    if (p.customAmount !== null) {
      shares.set(p.memberId, p.customAmount);
      remainingAmount -= p.customAmount;
    } else {
      fairShareParticipants = [...fairShareParticipants, p.memberId];
    }
  }

  if (fairShareParticipants.length > 0 && remainingAmount > 0) {
    const totalCoeff = fairShareParticipants.reduce(
      (sum, id) => sum + (memberCoefficients.get(id) ?? 0),
      0,
    );

    let allocated = 0;
    let fairShares: Array<{ memberId: string; share: number }> = [];

    for (let i = 0; i < fairShareParticipants.length; i++) {
      const memberId = fairShareParticipants[i] as string;
      const coeff = memberCoefficients.get(memberId) ?? 0;

      let share: number;
      if (i === fairShareParticipants.length - 1) {
        // Last participant gets the remainder to avoid rounding errors
        share = remainingAmount - allocated;
      } else if (totalCoeff > 0) {
        share = Math.round((coeff / totalCoeff) * remainingAmount);
      } else {
        // Equal split when no coefficients
        share = Math.round(remainingAmount / fairShareParticipants.length);
      }

      fairShares = [...fairShares, { memberId, share }];
      allocated += share;
    }

    for (const { memberId, share } of fairShares) {
      shares.set(memberId, share);
    }
  } else if (fairShareParticipants.length > 0 && remainingAmount <= 0) {
    // All amount used by custom amounts, fair share participants get 0
    for (const memberId of fairShareParticipants) {
      shares.set(memberId, 0);
    }
  }

  return shares;
}
