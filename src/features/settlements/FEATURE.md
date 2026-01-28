# Feature: Remboursements (`settlements`)

## Description

Les remboursements permettent d'équilibrer les soldes entre les personnes du groupe. Un remboursement est une transaction distincte d'une dépense, avec un modèle de données dédié.

**Avantage du modèle séparé** : Un remboursement ne peut concerner qu'une seule personne destinataire, ce qui est garanti par le typage.

## User Stories

### US-SET-01: Voir les remboursements suggérés
**En tant que** membre d'un groupe
**Je veux** voir les remboursements optimaux à effectuer
**Afin de** savoir combien et à qui rembourser

#### Critères d'acceptation
- [ ] Liste des remboursements suggérés (optimisés pour minimiser les transactions)
- [ ] Pour chaque suggestion : de qui, à qui, combien
- [ ] Mise en évidence de mes propres remboursements à faire
- [ ] Bouton pour enregistrer un remboursement

### US-SET-02: Enregistrer un remboursement
**En tant que** personne avec un solde négatif
**Je veux** enregistrer un remboursement effectué
**Afin de** mettre à jour les soldes

#### Critères d'acceptation
- [ ] Formulaire pré-rempli avec le montant suggéré
- [ ] Possibilité de modifier le montant (remboursement partiel)
- [ ] Sélection de la personne destinataire (une seule)
- [ ] Mise à jour immédiate des soldes

### US-SET-03: Voir l'historique des remboursements
**En tant que** membre d'un groupe
**Je veux** voir l'historique des remboursements
**Afin de** garder une trace des transactions

#### Critères d'acceptation
- [ ] Liste chronologique des remboursements
- [ ] Filtres : tous, envoyés par moi, reçus par moi
- [ ] Affichage : date, montant, de qui, à qui

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/settlements` | Historique des remboursements |
| GET | `/api/groups/:id/settlements/suggested` | Remboursements suggérés |
| POST | `/api/groups/:id/settlements` | Enregistrer un remboursement |
| DELETE | `/api/groups/:id/settlements/:settlementId` | Annuler un remboursement |

### Schéma de données

```typescript
interface Settlement {
  readonly id: string;
  readonly groupId: string;
  readonly fromMember: string;  // Qui rembourse (memberId)
  readonly toMember: string;    // Qui reçoit (memberId) - toujours une seule personne
  readonly amount: number;      // Montant en centimes (toujours positif)
  readonly date: Date;
  readonly createdAt: Date;
}

interface SuggestedSettlement {
  readonly fromMember: GroupMember;
  readonly toMember: GroupMember;
  readonly amount: number;
}
```

### Avantages du Modèle Séparé

| Aspect | Modèle séparé | Dépense négative |
|--------|---------------|------------------|
| **Contrainte "une seule personne"** | Garantie par le type | À valider manuellement |
| **Montant** | Toujours positif | Négatif (risque de confusion) |
| **Requêtes** | Filtrées par table | Filtrées par condition |
| **Sémantique** | Claire et explicite | Implicite |

### Algorithme d'Optimisation

L'objectif est de minimiser le nombre de transactions tout en équilibrant tous les soldes.

```typescript
const suggestSettlements = (
  balances: readonly Balance[]
): readonly SuggestedSettlement[] => {
  // Séparer créditeurs (solde > 0) et débiteurs (solde < 0)
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ memberId: b.memberId, memberName: b.memberName, remaining: Math.abs(b.balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ memberId: b.memberId, memberName: b.memberName, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  return computeSettlements(debtors, creditors, []);
};

// Fonction récursive pure (pas de mutation)
const computeSettlements = (
  debtors: readonly { memberId: string; memberName: string; remaining: number }[],
  creditors: readonly { memberId: string; memberName: string; remaining: number }[],
  accumulated: readonly SuggestedSettlement[]
): readonly SuggestedSettlement[] => {
  // Filtrer les personnes avec solde restant
  const activeDebtors = debtors.filter((d) => d.remaining > 0);
  const activeCreditors = creditors.filter((c) => c.remaining > 0);

  if (activeDebtors.length === 0 || activeCreditors.length === 0) {
    return accumulated;
  }

  const [debtor, ...restDebtors] = activeDebtors;
  const [creditor, ...restCreditors] = activeCreditors;

  const amount = Math.min(debtor.remaining, creditor.remaining);

  const newSettlement: SuggestedSettlement = {
    fromMember: { id: debtor.memberId, name: debtor.memberName } as GroupMember,
    toMember: { id: creditor.memberId, name: creditor.memberName } as GroupMember,
    amount,
  };

  const updatedDebtors = [
    { ...debtor, remaining: debtor.remaining - amount },
    ...restDebtors,
  ];

  const updatedCreditors = [
    { ...creditor, remaining: creditor.remaining - amount },
    ...restCreditors,
  ];

  return computeSettlements(
    updatedDebtors,
    updatedCreditors,
    [...accumulated, newSettlement]
  );
};
```

### Exemple d'optimisation

**Soldes :**
- Alex : +100€ (créditeur)
- Sam : +50€ (créditeur)
- Charlie : -80€ (débiteur)
- Jordan : -70€ (débiteur)

**Remboursements suggérés (3 transactions au lieu de 4) :**
1. Charlie → Alex : 80€
2. Jordan → Alex : 20€
3. Jordan → Sam : 50€

---

## Composants UI

### `SettlementSuggestions`
- Liste des remboursements suggérés
- Carte pour chaque remboursement avec avatars
- Bouton "Enregistrer" pour chaque suggestion
- Message si aucun remboursement nécessaire

### `SettlementCard`
- Avatars des deux personnes avec flèche directionnelle
- Montant
- Bouton d'action si je suis la personne qui doit payer

### `SettlementForm`
- Montant pré-rempli (modifiable pour remboursement partiel)
- Personne destinataire (sélection unique)
- Bouton de validation
- Aperçu de l'impact sur les soldes

### `SettlementHistory`
- Liste chronologique
- Filtres : tous / envoyés / reçus
- Affichage clair de la direction (de → à)

---

## États et Hooks

### `useSettlements`
```typescript
interface UseSettlements {
  readonly settlements: readonly Settlement[];
  readonly suggested: readonly SuggestedSettlement[];
  readonly isLoading: boolean;
  recordSettlement: (fromMember: string, toMember: string, amount: number) => Promise<void>;
  deleteSettlement: (settlementId: string) => Promise<void>;
}
```

### `useMySettlements`
```typescript
interface UseMySettlements {
  readonly toPay: readonly SuggestedSettlement[];   // Ce que je dois payer
  readonly toReceive: readonly SuggestedSettlement[]; // Ce que je dois recevoir
  readonly totalToPay: number;
  readonly totalToReceive: number;
}
```

---

## Workflow

```
┌─────────────────┐
│  Solde négatif  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Voir suggestions│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Effectuer le    │
│ paiement réel   │
│ (hors app)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enregistrer le  │
│ remboursement   │
│ (dans l'app)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Soldes mis à    │
│ jour            │
└─────────────────┘
```

Pas de confirmation nécessaire : la confiance entre membres du groupe est présumée.

---

## Intégration avec les Soldes

Le calcul des soldes prend en compte les remboursements :

```typescript
const calculateBalances = (
  members: readonly GroupMember[],
  expenses: readonly Expense[],
  settlements: readonly Settlement[]
): readonly Balance[] => {
  // ... calcul des soldes basé sur les dépenses ...

  // Appliquer les remboursements
  return balancesAfterExpenses.map((balance) => {
    const paid = settlements
      .filter((s) => s.fromMember === balance.memberId)
      .reduce((sum, s) => sum + s.amount, 0);

    const received = settlements
      .filter((s) => s.toMember === balance.memberId)
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      ...balance,
      settlementsPaid: paid,
      settlementsReceived: received,
      netBalance: balance.balance - paid + received,
    };
  });
};
```
