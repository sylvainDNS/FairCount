import { COMMON_ERROR_MESSAGES, type CommonError } from '@/shared/constants';
import type { Result } from '@/shared/types';

// Form data for creating a settlement
export interface CreateSettlementFormData {
  readonly toMember: string; // recipient memberId
  readonly amount: number; // in cents, always positive
  readonly date: string; // YYYY-MM-DD
}

// Settlement item for list display
export interface SettlementListItem {
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
  readonly settlements: ReadonlyArray<SettlementListItem>;
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
  | CommonError
  | 'SETTLEMENT_NOT_FOUND'
  | 'NOT_CREATOR'
  | 'INVALID_AMOUNT'
  | 'INVALID_RECIPIENT'
  | 'INVALID_DATE'
  | 'SAME_MEMBER';

export const SETTLEMENT_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  SETTLEMENT_NOT_FOUND: 'Remboursement introuvable',
  NOT_CREATOR: 'Vous ne pouvez supprimer que vos propres remboursements',
  INVALID_AMOUNT: 'Le montant doit être positif',
  INVALID_RECIPIENT: 'Destinataire invalide',
  INVALID_DATE: 'La date est invalide',
  SAME_MEMBER: 'Le payeur et le bénéficiaire doivent être différents',
} as const satisfies Record<SettlementError, string>;

// API result type alias
export type SettlementResult<T = void> = Result<T, SettlementError>;
