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
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
