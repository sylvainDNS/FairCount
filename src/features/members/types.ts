import type { Result } from '@/shared/types';

// Re-export DB types
export type { GroupMember, NewGroupMember } from '@/db/schema';

// Form data types
export interface UpdateMemberFormData {
  readonly name?: string;
  readonly income?: number;
}

// API response types
export interface MemberWithCoefficient {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly userId: string | null;
  readonly income: number;
  readonly coefficient: number;
  readonly coefficientPercent: number;
  readonly joinedAt: Date;
  readonly isCurrentUser: boolean;
}

// Error types
export type MemberError =
  | 'MEMBER_NOT_FOUND'
  | 'NOT_A_MEMBER'
  | 'INVALID_NAME'
  | 'INVALID_INCOME'
  | 'CANNOT_REMOVE_SELF'
  | 'CANNOT_REMOVE_LAST_MEMBER'
  | 'UNKNOWN_ERROR';

export const MEMBER_ERROR_MESSAGES = {
  MEMBER_NOT_FOUND: 'Membre introuvable',
  NOT_A_MEMBER: "Vous n'êtes pas membre de ce groupe",
  INVALID_NAME: 'Le nom est invalide',
  INVALID_INCOME: 'Le revenu doit être un nombre positif',
  CANNOT_REMOVE_SELF: 'Utilisez "Quitter le groupe" pour vous retirer',
  CANNOT_REMOVE_LAST_MEMBER: 'Impossible de retirer le dernier membre',
  UNKNOWN_ERROR: 'Une erreur est survenue',
} as const satisfies Record<MemberError, string>;

// API result type alias
export type MemberResult<T = void> = Result<T, MemberError>;
