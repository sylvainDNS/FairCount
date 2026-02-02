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
  const fairShareParticipants: string[] = [];

  for (const p of participants) {
    if (p.customAmount !== null) {
      shares.set(p.memberId, p.customAmount);
      remainingAmount -= p.customAmount;
    } else {
      fairShareParticipants.push(p.memberId);
    }
  }

  if (fairShareParticipants.length > 0 && remainingAmount > 0) {
    const totalCoeff = fairShareParticipants.reduce(
      (sum, id) => sum + (memberCoefficients.get(id) ?? 0),
      0,
    );

    // Calculate shares using map (O(n))
    const fairShares = fairShareParticipants.map((memberId) => {
      const coeff = memberCoefficients.get(memberId) ?? 0;
      const share =
        totalCoeff > 0
          ? Math.round((coeff / totalCoeff) * remainingAmount)
          : Math.round(remainingAmount / fairShareParticipants.length);
      return { memberId, share };
    });

    // Adjust last participant's share to absorb rounding errors
    const allocated = fairShares.reduce((sum, s) => sum + s.share, 0);
    const lastShare = fairShares[fairShares.length - 1];
    if (lastShare) {
      lastShare.share += remainingAmount - allocated;
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
