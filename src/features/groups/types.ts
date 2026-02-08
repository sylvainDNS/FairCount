import { COMMON_ERROR_MESSAGES, type CommonError } from '@/shared/constants';
import type { Result } from '@/shared/types';

// Re-export DB types
export type {
  Group,
  GroupInvitation,
  GroupMember,
  NewGroup,
  NewGroupInvitation,
  NewGroupMember,
} from '@/db/schema';

// Supported currencies
export const CURRENCIES = [
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dollar ($)' },
  { code: 'GBP', label: 'Livre (GBP)' },
  { code: 'CHF', label: 'Franc suisse (CHF)' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

// Form data types
export interface CreateGroupFormData {
  readonly name: string;
  readonly description?: string | undefined;
  readonly currency?: string | undefined;
}

export interface UpdateGroupFormData {
  readonly name?: string | undefined;
  readonly description?: string | undefined;
}

export interface InviteFormData {
  readonly email: string;
}

// API response types
export interface GroupListItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currency: string;
  readonly memberCount: number;
  readonly myBalance: number;
  readonly isArchived: boolean;
  readonly createdAt: Date;
}

export interface GroupWithMembers {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currency: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly archivedAt: Date | null;
  readonly members: GroupMemberInfo[];
  readonly memberCount: number;
  readonly myMemberId: string;
}

export interface GroupMemberInfo {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly userId: string | null;
  readonly income: number;
  readonly coefficient: number;
  readonly joinedAt: Date;
}

export interface InvitationInfo {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly createdByName: string;
}

export interface InvitationDetails {
  readonly group: {
    readonly id: string;
    readonly name: string;
  };
  readonly inviterName: string;
  readonly expiresAt: Date;
}

export interface PendingInvitation {
  readonly id: string;
  readonly token: string;
  readonly group: {
    readonly id: string;
    readonly name: string;
  };
  readonly inviterName: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

// Error types
export type GroupError =
  | CommonError
  | 'GROUP_NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'INVALID_NAME'
  | 'INVALID_EMAIL'
  | 'ALREADY_INVITED'
  | 'ALREADY_MEMBER'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'FORBIDDEN'
  | 'CANNOT_LEAVE_ALONE';

export const GROUP_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  GROUP_NOT_FOUND: 'Groupe introuvable',
  NOT_AUTHORIZED: "Vous n'avez pas les droits pour cette action",
  INVALID_NAME: 'Le nom du groupe est invalide',
  INVALID_EMAIL: 'Adresse email invalide',
  ALREADY_INVITED: 'Cette personne a déjà été invitée',
  ALREADY_MEMBER: 'Cette personne est déjà membre du groupe',
  INVITATION_NOT_FOUND: 'Invitation introuvable',
  INVITATION_EXPIRED: 'Cette invitation a expiré',
  FORBIDDEN: "Vous n'êtes pas autorisé à effectuer cette action",
  CANNOT_LEAVE_ALONE: 'Vous ne pouvez pas quitter un groupe dont vous êtes le seul membre',
} as const satisfies Record<GroupError, string>;

// API result type alias
export type GroupResult<T = void> = Result<T, GroupError>;
