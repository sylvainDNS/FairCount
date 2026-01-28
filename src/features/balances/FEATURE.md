# Feature: Calcul des Soldes (`balances`)

## Description

Calcule et affiche les soldes de chaque personne du groupe en temps réel. Le solde représente la différence entre ce qu'une personne a payé et ce qu'elle aurait dû payer selon son coefficient.

## User Stories

### US-BAL-01: Voir mon solde
**En tant que** membre d'un groupe
**Je veux** voir mon solde actuel
**Afin de** savoir si je dois de l'argent ou si on m'en doit

#### Critères d'acceptation
- [ ] Solde affiché clairement (positif = on me doit, négatif = je dois)
- [ ] Couleur verte si positif, rouge si négatif
- [ ] Montant en devise du groupe
- [ ] Accessible depuis le tableau de bord du groupe

### US-BAL-02: Voir les soldes de tout le groupe
**En tant que** membre d'un groupe
**Je veux** voir les soldes de toutes les personnes
**Afin d'** avoir une vue d'ensemble de la situation

#### Critères d'acceptation
- [ ] Liste de toutes les personnes avec leur solde
- [ ] Tri par solde (du plus débiteur au plus créditeur)
- [ ] Total des dépenses du groupe affiché
- [ ] Vérification que la somme des soldes = 0

### US-BAL-03: Voir le détail de mon solde
**En tant que** membre d'un groupe
**Je veux** comprendre comment mon solde est calculé
**Afin de** vérifier l'exactitude des calculs

#### Critères d'acceptation
- [ ] Total de ce que j'ai payé
- [ ] Total de ce que je dois (selon mon coefficient)
- [ ] Liste des dépenses avec ma part
- [ ] Historique des remboursements effectués/reçus

### US-BAL-04: Voir les statistiques du groupe
**En tant que** membre d'un groupe
**Je veux** voir des statistiques sur les dépenses
**Afin de** mieux comprendre nos habitudes de dépenses

#### Critères d'acceptation
- [ ] Total des dépenses par période
- [ ] Contribution de chaque personne
- [ ] Évolution dans le temps (optionnel)

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/balances` | Soldes de toutes les personnes |
| GET | `/api/groups/:id/balances/me` | Mon solde détaillé |
| GET | `/api/groups/:id/stats` | Statistiques du groupe |

### Schéma de données

```typescript
interface Balance {
  readonly memberId: string;
  readonly memberName: string;
  readonly totalPaid: number;      // Ce que la personne a payé (dépenses)
  readonly totalOwed: number;      // Ce que la personne devrait payer
  readonly balance: number;        // totalPaid - totalOwed
  readonly settlementsPaid: number;    // Remboursements effectués
  readonly settlementsReceived: number; // Remboursements reçus
  readonly netBalance: number;     // balance - settlementsPaid + settlementsReceived
}

interface BalanceDetail {
  readonly balance: Balance;
  readonly expenses: readonly ExpenseWithShare[];  // Dépenses avec ma part
  readonly settlements: readonly Settlement[];      // Remboursements envoyés/reçus
}

interface GroupStats {
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number;
  byMember: MemberStats[];
  byMonth: MonthlyStats[];
}

interface MemberStats {
  memberId: string;
  memberName: string;
  totalPaid: number;
  percentage: number;
}
```

### Calcul des Soldes

Approche fonctionnelle avec immutabilité :

```typescript
const createEmptyBalance = (member: GroupMember): Balance => ({
  memberId: member.id,
  memberName: member.name,
  totalPaid: 0,
  totalOwed: 0,
  balance: 0,
  settlementsPaid: 0,
  settlementsReceived: 0,
  netBalance: 0,
});

const calculateBalances = (
  members: readonly GroupMember[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[]
): readonly Balance[] => {
  const activeMembers = members.filter((m) => m.leftAt === null);
  const activeExpenses = expenses.filter((e) => e.deletedAt === null);

  // Calculer les coefficients actuels (toujours à jour)
  const coefficients = calculateCoefficients(activeMembers);

  // Initialiser les soldes
  const initialBalances = new Map(
    activeMembers.map((m) => [m.id, createEmptyBalance(m)])
  );

  // Réduire les dépenses pour calculer les soldes
  const balancesAfterExpenses = activeExpenses.reduce((balances, expense) => {
    const updatedBalances = new Map(balances);

    // Ajouter ce que la personne a payé
    const payer = updatedBalances.get(expense.paidBy);
    if (payer) {
      updatedBalances.set(expense.paidBy, {
        ...payer,
        totalPaid: payer.totalPaid + expense.amount,
      });
    }

    // Calculer et ajouter les parts (avec coefficients actuels)
    const shares = calculateShares(expense, activeMembers, coefficients);
    shares.forEach((share) => {
      const member = updatedBalances.get(share.memberId);
      if (member) {
        updatedBalances.set(share.memberId, {
          ...member,
          totalOwed: member.totalOwed + share.amount,
        });
      }
    });

    return updatedBalances;
  }, initialBalances);

  // Appliquer les remboursements
  const balancesAfterSettlements = settlements.reduce((balances, settlement) => {
    const updatedBalances = new Map(balances);

    const payer = updatedBalances.get(settlement.fromMember);
    if (payer) {
      updatedBalances.set(settlement.fromMember, {
        ...payer,
        settlementsPaid: payer.settlementsPaid + settlement.amount,
      });
    }

    const receiver = updatedBalances.get(settlement.toMember);
    if (receiver) {
      updatedBalances.set(settlement.toMember, {
        ...receiver,
        settlementsReceived: receiver.settlementsReceived + settlement.amount,
      });
    }

    return updatedBalances;
  }, balancesAfterExpenses);

  // Calculer les soldes finaux
  return Array.from(balancesAfterSettlements.values()).map((balance) => ({
    ...balance,
    balance: balance.totalPaid - balance.totalOwed,
    netBalance: balance.totalPaid - balance.totalOwed - balance.settlementsPaid + balance.settlementsReceived,
  }));
};
```

### Vérification d'Intégrité

La somme de tous les soldes nets doit toujours être égale à 0 :

```typescript
const verifyBalanceIntegrity = (balances: readonly Balance[]): boolean => {
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  return Math.abs(total) < 1; // Tolérance de 1 centime pour les arrondis
};
```

---

## Composants UI

### `BalanceSummary`
- Mon solde en grand avec couleur
- Message contextuel ("On vous doit X€" ou "Vous devez X€")
- Bouton d'action rapide (voir détail ou rembourser)

### `BalanceList`
- Liste de toutes les personnes avec leur solde
- Avatar, nom, montant
- Indicateur visuel (barre de progression ou couleur)
- Total des dépenses en bas

### `BalanceDetail`
- Décomposition du solde
- Section "Ce que j'ai payé" avec liste des dépenses
- Section "Ce que je dois" avec liste des parts
- Section "Remboursements" avec historique envoyés/reçus

### `BalanceChart`
- Graphique en camembert des parts
- Légende avec noms et pourcentages
- Animation au chargement

### `StatsPage`
- Sélecteur de période
- Graphique par personne
- Évolution temporelle

---

## États et Hooks

### `useBalances`
```typescript
interface UseBalances {
  balances: Balance[];
  myBalance: Balance | null;
  totalExpenses: number;
  isLoading: boolean;
  isValid: boolean; // Intégrité vérifiée
  refetch: () => Promise<void>;
}
```

### `useBalanceDetail`
```typescript
interface UseBalanceDetail {
  detail: BalanceDetail | null;
  isLoading: boolean;
}
```

### `useGroupStats`
```typescript
interface UseGroupStats {
  stats: GroupStats | null;
  isLoading: boolean;
  period: 'week' | 'month' | 'year' | 'all';
  setPeriod: (period: string) => void;
}
```

---

## Affichage des Soldes

### Format d'affichage

| Situation | Texte | Couleur |
|-----------|-------|---------|
| Solde positif | "+50,00 €" ou "On vous doit 50,00 €" | Vert |
| Solde négatif | "-30,00 €" ou "Vous devez 30,00 €" | Rouge |
| Solde nul | "0,00 €" ou "Tout est équilibré" | Gris |

### Messages contextuels

- Solde > 0 : "Les autres personnes du groupe vous doivent {montant}"
- Solde < 0 : "Vous devez {montant} au groupe"
- Solde = 0 : "Votre compte est équilibré"

---

## Performances

### Mise en cache

Les soldes sont recalculés :
- À chaque ajout/modification/suppression de dépense
- À chaque remboursement
- Mise en cache côté client avec invalidation

### Optimisation

Pour les groupes avec beaucoup de dépenses :
- Calcul incrémental (delta) plutôt que recalcul complet
- Pagination de l'historique
- Agrégation des anciennes dépenses

---

## Cas Particuliers

### Personne ayant quitté le groupe

- Son solde au moment du départ est conservé
- Ses dépenses restent dans l'historique
- Elle n'apparaît plus dans les nouvelles répartitions

### Modification des coefficients

Les soldes sont **toujours recalculés** avec les coefficients actuels. Cela signifie :
- Quand une personne modifie son revenu, toutes les dépenses sont recalculées
- Les soldes reflètent toujours la situation actuelle du groupe
- Approche plus simple et plus juste pour un MVP

### Dépenses supprimées

- Soft delete : la dépense est marquée comme supprimée
- Non comptée dans les soldes
- Visible dans l'historique avec mention "supprimée"
