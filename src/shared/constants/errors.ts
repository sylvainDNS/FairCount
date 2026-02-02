/**
 * Messages d'erreur communs partagés entre les features.
 * Chaque feature peut étendre ces messages avec ses erreurs spécifiques.
 */

/** Erreurs communes à toutes les features */
export type CommonError = 'UNKNOWN_ERROR' | 'NOT_A_MEMBER';

export const COMMON_ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'Une erreur est survenue',
  NOT_A_MEMBER: "Vous n'êtes pas membre de ce groupe",
} as const satisfies Record<CommonError, string>;

/** API error codes used by worker middleware and routes */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  EXPENSE_NOT_FOUND: 'EXPENSE_NOT_FOUND',
  SETTLEMENT_NOT_FOUND: 'SETTLEMENT_NOT_FOUND',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  CANNOT_LEAVE_ALONE: 'CANNOT_LEAVE_ALONE',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  ALREADY_INVITED: 'ALREADY_INVITED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Magic link verification error codes */
export const MAGIC_LINK_ERRORS = {
  EXPIRED_TOKEN: 'expired',
  INVALID_TOKEN: 'invalid_token',
} as const;

export type MagicLinkError = (typeof MAGIC_LINK_ERRORS)[keyof typeof MAGIC_LINK_ERRORS];
