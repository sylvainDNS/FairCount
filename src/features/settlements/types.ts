// Types for settlements feature

// Form data for creating a settlement
export interface CreateSettlementFormData {
  readonly toMember: string; // recipient memberId
  readonly amount: number; // in cents, always positive
  readonly date: string; // YYYY-MM-DD
}

// Settlement summary for list display
export interface SettlementSummary {
  readonly id: string;
  readonly groupId: string;
  readonly fromMember: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly toMember: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly amount: number; // cents
  readonly date: string; // YYYY-MM-DD
  readonly createdAt: string; // ISO date
}

// Filter for history
export type SettlementFilter = 'all' | 'sent' | 'received';

// Paginated response
export interface SettlementsPage {
  readonly settlements: ReadonlyArray<SettlementSummary>;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

// Optimized settlement suggestion
export interface SettlementSuggestion {
  readonly from: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly to: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly amount: number; // cents
}

// Error types
export type SettlementError =
  | 'SETTLEMENT_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'NOT_CREATOR'
  | 'INVALID_AMOUNT'
  | 'INVALID_RECIPIENT'
  | 'INVALID_DATE'
  | 'SAME_MEMBER'
  | 'UNKNOWN_ERROR';

export const SETTLEMENT_ERROR_MESSAGES: Record<SettlementError, string> = {
  SETTLEMENT_NOT_FOUND: 'Remboursement introuvable',
  NOT_A_MEMBER: "Vous n'êtes pas membre de ce groupe",
  NOT_CREATOR: 'Vous ne pouvez supprimer que vos propres remboursements',
  INVALID_AMOUNT: 'Le montant doit être positif',
  INVALID_RECIPIENT: 'Destinataire invalide',
  INVALID_DATE: 'La date est invalide',
  SAME_MEMBER: 'Le payeur et le bénéficiaire doivent être différents',
  UNKNOWN_ERROR: 'Une erreur est survenue',
};

// Result with discriminated union
export type SettlementResult<T = void> =
  | { readonly success: true; readonly data?: T }
  | { readonly success: false; readonly error: SettlementError };
