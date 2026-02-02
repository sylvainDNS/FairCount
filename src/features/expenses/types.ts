import { COMMON_ERROR_MESSAGES, type CommonError } from '@/shared/constants';
import type { Result } from '@/shared/types';

// Re-export DB types
export type {
  Expense,
  ExpenseParticipant,
  NewExpense,
  NewExpenseParticipant,
} from '@/db/schema';

// Form data types
export interface CreateExpenseFormData {
  readonly amount: number; // in cents
  readonly description: string;
  readonly date: string; // YYYY-MM-DD
  readonly paidBy: string; // memberId
  readonly participants: ReadonlyArray<{
    readonly memberId: string;
    readonly customAmount: number | null;
  }>;
}

export interface UpdateExpenseFormData {
  readonly amount?: number | undefined;
  readonly description?: string | undefined;
  readonly date?: string | undefined;
  readonly paidBy?: string | undefined;
  readonly participants?:
    | ReadonlyArray<{
        readonly memberId: string;
        readonly customAmount: number | null;
      }>
    | undefined;
}

// API response types
export interface ExpenseSummary {
  readonly id: string;
  readonly groupId: string;
  readonly paidBy: {
    readonly id: string;
    readonly name: string;
  };
  readonly amount: number; // cents
  readonly description: string;
  readonly date: string; // YYYY-MM-DD
  readonly createdBy: {
    readonly id: string;
    readonly name: string;
  };
  readonly createdAt: string; // ISO date
  readonly participantCount: number;
  readonly myShare: number | null; // cents, null if not a participant
}

export interface ParticipantDetail {
  readonly id: string;
  readonly memberId: string;
  readonly memberName: string;
  readonly customAmount: number | null;
  readonly calculatedShare: number; // cents
  readonly isCurrentUser: boolean;
}

export interface ExpenseDetail {
  readonly id: string;
  readonly groupId: string;
  readonly paidBy: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly amount: number;
  readonly description: string;
  readonly date: string;
  readonly createdBy: {
    readonly id: string;
    readonly name: string;
    readonly isCurrentUser: boolean;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly participants: ReadonlyArray<ParticipantDetail>;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}

// Filter types
export interface ExpenseFilters {
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly paidBy?: string | undefined;
  readonly participantId?: string | undefined;
  readonly search?: string | undefined;
}

// Pagination types
export interface ExpensesPage {
  readonly expenses: ReadonlyArray<ExpenseSummary>;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

// Error types
export type ExpenseError =
  | CommonError
  | 'EXPENSE_NOT_FOUND'
  | 'NOT_CREATOR'
  | 'INVALID_AMOUNT'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_DATE'
  | 'INVALID_PAYER'
  | 'NO_PARTICIPANTS'
  | 'INVALID_PARTICIPANT'
  | 'CUSTOM_AMOUNTS_EXCEED_TOTAL';

export const EXPENSE_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  EXPENSE_NOT_FOUND: 'Dépense introuvable',
  NOT_CREATOR: 'Seul le créateur peut modifier cette dépense',
  INVALID_AMOUNT: 'Le montant doit être positif',
  INVALID_DESCRIPTION: 'La description est requise',
  INVALID_DATE: 'La date est invalide',
  INVALID_PAYER: 'Le payeur est invalide',
  NO_PARTICIPANTS: 'Au moins un participant est requis',
  INVALID_PARTICIPANT: 'Un participant est invalide',
  CUSTOM_AMOUNTS_EXCEED_TOTAL: 'Les montants personnalisés dépassent le total',
} as const satisfies Record<ExpenseError, string>;

// Valid error values for type narrowing with toTypedError
export const VALID_EXPENSE_ERRORS: readonly ExpenseError[] = [
  'UNKNOWN_ERROR',
  'NOT_A_MEMBER',
  'EXPENSE_NOT_FOUND',
  'NOT_CREATOR',
  'INVALID_AMOUNT',
  'INVALID_DESCRIPTION',
  'INVALID_DATE',
  'INVALID_PAYER',
  'NO_PARTICIPANTS',
  'INVALID_PARTICIPANT',
  'CUSTOM_AMOUNTS_EXCEED_TOTAL',
] as const;

// API result type alias
export type ExpenseResult<T = void> = Result<T, ExpenseError>;
