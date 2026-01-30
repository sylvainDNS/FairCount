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
  | 'EXPENSE_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'NOT_CREATOR'
  | 'INVALID_AMOUNT'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_DATE'
  | 'INVALID_PAYER'
  | 'NO_PARTICIPANTS'
  | 'INVALID_PARTICIPANT'
  | 'CUSTOM_AMOUNTS_EXCEED_TOTAL'
  | 'UNKNOWN_ERROR';

export const EXPENSE_ERROR_MESSAGES = {
  EXPENSE_NOT_FOUND: 'Dépense introuvable',
  NOT_A_MEMBER: "Vous n'êtes pas membre de ce groupe",
  NOT_CREATOR: 'Seul le créateur peut modifier cette dépense',
  INVALID_AMOUNT: 'Le montant doit être positif',
  INVALID_DESCRIPTION: 'La description est requise',
  INVALID_DATE: 'La date est invalide',
  INVALID_PAYER: 'Le payeur est invalide',
  NO_PARTICIPANTS: 'Au moins un participant est requis',
  INVALID_PARTICIPANT: 'Un participant est invalide',
  CUSTOM_AMOUNTS_EXCEED_TOTAL: 'Les montants personnalisés dépassent le total',
  UNKNOWN_ERROR: 'Une erreur est survenue',
} as const satisfies Record<ExpenseError, string>;

// Result wrapper type (discriminated union)
export type ExpenseResult<T = void> =
  | { readonly success: true; readonly data?: T }
  | { readonly success: false; readonly error: ExpenseError };
