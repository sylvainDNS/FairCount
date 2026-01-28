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
  memberId: string;
  memberName: string;
  totalPaid: number;      // Ce que la personne a payé
  totalOwed: number;      // Ce que la personne devrait payer
  balance: number;        // totalPaid - totalOwed
  settlementsReceived: number;  // Remboursements reçus
  settlementsPaid: number;      // Remboursements effectués
  netBalance: number;     // balance + settlementsReceived - settlementsPaid
}

interface BalanceDetail {
  balance: Balance;
  expenses: ExpenseWithShare[];  // Dépenses avec ma part
  settlements: Settlement[];      // Remboursements
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

```typescript
function calculateBalances(
  members: GroupMember[],
  expenses: Expense[],
  settlements: Settlement[]
): Balance[] {
  const balances = new Map<string, Balance>();

  // Initialiser les soldes à 0
  for (const member of members) {
    if (member.leftAt !== null) continue;
    balances.set(member.id, {
      memberId: member.id,
      memberName: member.name,
      totalPaid: 0,
      totalOwed: 0,
      balance: 0,
      settlementsReceived: 0,
      settlementsPaid: 0,
      netBalance: 0
    });
  }

  // Calculer les paiements et les parts
  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;

    // Ajouter ce que la personne a payé
    const payerBalance = balances.get(expense.paidBy);
    if (payerBalance) {
      payerBalance.totalPaid += expense.amount;
    }

    // Calculer les parts et ajouter ce que chaque personne doit
    const shares = calculateShares(expense, members);
    for (const share of shares) {
      const memberBalance = balances.get(share.memberId);
      if (memberBalance) {
        memberBalance.totalOwed += share.amount;
      }
    }
  }

  // Prendre en compte les remboursements
  for (const settlement of settlements) {
    if (settlement.completedAt === null) continue;

    const fromBalance = balances.get(settlement.fromMember);
    const toBalance = balances.get(settlement.toMember);

    if (fromBalance) {
      fromBalance.settlementsPaid += settlement.amount;
    }
    if (toBalance) {
      toBalance.settlementsReceived += settlement.amount;
    }
  }

  // Calculer les soldes finaux
  for (const balance of balances.values()) {
    balance.balance = balance.totalPaid - balance.totalOwed;
    balance.netBalance = balance.balance
      + balance.settlementsReceived
      - balance.settlementsPaid;
  }

  return Array.from(balances.values());
}
```

### Vérification d'Intégrité

La somme de tous les soldes nets doit toujours être égale à 0 :

```typescript
function verifyBalanceIntegrity(balances: Balance[]): boolean {
  const total = balances.reduce((sum, b) => sum + b.netBalance, 0);
  return Math.abs(total) < 1; // Tolérance de 1 centime pour les arrondis
}
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
- Section "Remboursements" avec historique

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

### Modification rétroactive des coefficients

- Les dépenses passées ne sont pas recalculées
- Seules les nouvelles dépenses utilisent les nouveaux coefficients
- Option de recalcul global disponible pour les admins

### Dépenses supprimées

- Soft delete : la dépense est marquée comme supprimée
- Non comptée dans les soldes
- Visible dans l'historique avec mention "supprimée"
