export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly image: string | null;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface LoginFormData {
  readonly email: string;
}

export interface ProfileFormData {
  readonly name: string;
}

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
