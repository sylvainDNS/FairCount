import { COMMON_ERROR_MESSAGES } from '@/shared/constants';

// Re-export DB types
export type { Session, User } from '@/db/schema';

// Form data types
export interface LoginFormData {
  readonly email: string;
}

export interface ProfileFormData {
  readonly name: string;
}

// Error types
export type AuthError =
  | 'UNKNOWN_ERROR'
  | 'INVALID_EMAIL'
  | 'EMAIL_SEND_FAILED'
  | 'LINK_EXPIRED'
  | 'LINK_INVALID';

export const AUTH_ERROR_MESSAGES = {
  UNKNOWN_ERROR: COMMON_ERROR_MESSAGES.UNKNOWN_ERROR,
  INVALID_EMAIL: 'Adresse email invalide',
  EMAIL_SEND_FAILED: "Impossible d'envoyer l'email",
  LINK_EXPIRED: 'Ce lien a expiré',
  LINK_INVALID: "Ce lien n'est pas valide",
} as const satisfies Record<AuthError, string>;
