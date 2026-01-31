import { COMMON_ERROR_MESSAGES, type CommonError } from '@/shared/constants';

// Balance pour un membre
export interface Balance {
  readonly memberId: string;
  readonly memberName: string;
  readonly memberUserId: string | null;
  readonly totalPaid: number; // Ce que la personne a payé (en centimes)
  readonly totalOwed: number; // Ce que la personne devrait payer (en centimes)
  readonly balance: number; // totalPaid - totalOwed (en centimes)
  readonly settlementsPaid: number; // Remboursements effectués (en centimes)
  readonly settlementsReceived: number; // Remboursements reçus (en centimes)
  readonly netBalance: number; // Solde final après remboursements (en centimes)
  readonly isCurrentUser: boolean;
}

// Dépense avec ma part pour le détail
export interface ExpenseWithShare {
  readonly id: string;
  readonly description: string;
  readonly date: string;
  readonly amount: number; // montant total
  readonly paidBy: {
    readonly id: string;
    readonly name: string;
  };
  readonly myShare: number; // ma part
  readonly isPayer: boolean; // est-ce que c'est moi qui ai payé
}

// Remboursement pour le détail
export interface SettlementSummary {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly direction: 'sent' | 'received';
  readonly otherMember: {
    readonly id: string;
    readonly name: string;
  };
}

// Détail complet du solde personnel
export interface BalanceDetail {
  readonly balance: Balance;
  readonly expenses: ReadonlyArray<ExpenseWithShare>;
  readonly settlements: ReadonlyArray<SettlementSummary>;
}

// Statistiques par membre
export interface MemberStats {
  readonly memberId: string;
  readonly memberName: string;
  readonly totalPaid: number;
  readonly percentage: number;
}

// Statistiques par mois
export interface MonthlyStats {
  readonly month: string; // YYYY-MM
  readonly total: number;
  readonly count: number;
}

// Statistiques du groupe
export interface GroupStats {
  readonly totalExpenses: number;
  readonly expenseCount: number;
  readonly averageExpense: number;
  readonly byMember: ReadonlyArray<MemberStats>;
  readonly byMonth: ReadonlyArray<MonthlyStats>;
}

// Réponse API pour les soldes du groupe
export interface BalancesResponse {
  readonly balances: ReadonlyArray<Balance>;
  readonly totalExpenses: number;
  readonly isValid: boolean; // somme des soldes = 0
}

// Période pour les stats
export type StatsPeriod = 'week' | 'month' | 'year' | 'all';

// Types d'erreur
export type BalanceError = CommonError | 'GROUP_NOT_FOUND' | 'MEMBER_NOT_FOUND';

export const BALANCE_ERROR_MESSAGES = {
  ...COMMON_ERROR_MESSAGES,
  GROUP_NOT_FOUND: 'Groupe introuvable',
  MEMBER_NOT_FOUND: 'Membre introuvable',
} as const satisfies Record<BalanceError, string>;
