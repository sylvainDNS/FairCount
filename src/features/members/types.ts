import { COMMON_ERROR_MESSAGES, type CommonError } from '@/shared/constants';
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
  | CommonError
  | 'MEMBER_NOT_FOUND'
  | 'INVALID_NAME'
  | 'INVALID_INCOME'
  | 'CANNOT_REMOVE_SELF'
  | 'CANNOT_REMOVE_LAST_MEMBER';

export const MEMBER_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  MEMBER_NOT_FOUND: 'Membre introuvable',
  INVALID_NAME: 'Le nom est invalide',
  INVALID_INCOME: 'Le revenu doit être un nombre positif',
  CANNOT_REMOVE_SELF: 'Utilisez "Quitter le groupe" pour vous retirer',
  CANNOT_REMOVE_LAST_MEMBER: 'Impossible de retirer le dernier membre',
} as const satisfies Record<MemberError, string>;

// API result type alias
export type MemberResult<T = void> = Result<T, MemberError>;
