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
  | 'INVALID_EMAIL'
  | 'EMAIL_SEND_FAILED'
  | 'LINK_EXPIRED'
  | 'LINK_INVALID'
  | 'UNKNOWN_ERROR';

export const AUTH_ERROR_MESSAGES = {
  INVALID_EMAIL: 'Adresse email invalide',
  EMAIL_SEND_FAILED: "Impossible d'envoyer l'email",
  LINK_EXPIRED: 'Ce lien a expire',
  LINK_INVALID: "Ce lien n'est pas valide",
  UNKNOWN_ERROR: 'Une erreur est survenue',
} as const satisfies Record<AuthError, string>;
