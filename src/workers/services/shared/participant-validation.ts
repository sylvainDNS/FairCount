// Participant validation shared by expenses and recurring expenses (pure).

// Participant validation result
export type ParticipantValidationResult =
  | { valid: true; customAmountsTotal: number }
  | {
      valid: false;
      error: 'NO_PARTICIPANTS' | 'INVALID_PARTICIPANT' | 'CUSTOM_AMOUNTS_EXCEED_TOTAL';
    };

// Validate participants against active members and check custom amounts
export function validateParticipants(
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
