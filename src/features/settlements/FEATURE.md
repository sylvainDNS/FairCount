# Feature: Remboursements (`settlements`)

## Description

Les remboursements permettent d'équilibrer les soldes entre les personnes du groupe.

**Simplification** : Un remboursement est simplement une **dépense négative**. Quand Alex rembourse 50€ à Sam, c'est une dépense de -50€ payée par Alex, qui concerne uniquement Sam.

Cette approche simplifie le modèle de données et les calculs : pas besoin de confirmation, pas de statuts complexes.

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
- [ ] Sélection de la personne à qui on rembourse
- [ ] Mise à jour immédiate des soldes

### US-SET-03: Voir l'historique des remboursements
**En tant que** membre d'un groupe
**Je veux** voir l'historique des remboursements
**Afin de** garder une trace des transactions

#### Critères d'acceptation
- [ ] Les remboursements apparaissent dans la liste des dépenses (montant négatif)
- [ ] Filtre pour afficher uniquement les remboursements
- [ ] Distinction visuelle (couleur, icône) des remboursements

---

## Spécifications Techniques

### Modèle simplifié

Un remboursement est une dépense avec :
- `amount` négatif
- `paidBy` = la personne qui rembourse
- Un seul participant = la personne qui reçoit

```typescript
// Un remboursement est créé comme une dépense spéciale
interface Settlement {
  readonly fromMember: string;  // Qui rembourse
  readonly toMember: string;    // Qui reçoit
  readonly amount: number;      // Montant positif
}

// Converti en Expense pour stockage
const settlementToExpense = (
  settlement: Settlement,
  groupId: string,
  createdBy: string
): Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> => ({
  groupId,
  paidBy: settlement.fromMember,
  amount: -settlement.amount, // Montant négatif
  description: `Remboursement`,
  date: new Date(),
  createdBy,
  deletedAt: null,
});
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/settlements/suggested` | Remboursements suggérés |
| POST | `/api/groups/:id/settlements` | Enregistrer un remboursement |

Note : L'historique des remboursements est accessible via `/api/groups/:id/expenses` en filtrant les montants négatifs.

### Algorithme d'Optimisation

L'objectif est de minimiser le nombre de transactions tout en équilibrant tous les soldes.

```typescript
interface SuggestedSettlement {
  readonly fromMember: GroupMember;
  readonly toMember: GroupMember;
  readonly amount: number;
}

const suggestSettlements = (
  balances: readonly Balance[]
): readonly SuggestedSettlement[] => {
  // Séparer créditeurs et débiteurs
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ memberId: b.memberId, remaining: Math.abs(b.balance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ memberId: b.memberId, remaining: b.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  // Algorithme glouton : matcher les plus gros montants
  const settlements: SuggestedSettlement[] = [];

  const processSettlements = (
    debtors: typeof debtors,
    creditors: typeof creditors
  ): readonly SuggestedSettlement[] => {
    if (debtors.length === 0 || creditors.length === 0) {
      return settlements;
    }

    const [debtor, ...remainingDebtors] = debtors;
    const [creditor, ...remainingCreditors] = creditors;

    if (debtor.remaining === 0) {
      return processSettlements(remainingDebtors, [creditor, ...remainingCreditors]);
    }
    if (creditor.remaining === 0) {
      return processSettlements([debtor, ...remainingDebtors], remainingCreditors);
    }

    const amount = Math.min(debtor.remaining, creditor.remaining);

    settlements.push({
      fromMember: debtor.memberId,
      toMember: creditor.memberId,
      amount,
    });

    return processSettlements(
      [{ ...debtor, remaining: debtor.remaining - amount }, ...remainingDebtors],
      [{ ...creditor, remaining: creditor.remaining - amount }, ...remainingCreditors]
    );
  };

  return processSettlements(debtors, creditors);
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
- Avatars des deux personnes avec flèche
- Montant
- Bouton d'action si je suis la personne qui doit payer

### `SettlementForm`
- Montant pré-rempli (modifiable)
- Sélecteur de la personne qui reçoit
- Bouton de validation
- Aperçu de l'impact sur les soldes

### `SettlementBadge`
- Badge visuel dans la liste des dépenses
- Icône distincte (flèche circulaire)
- Couleur différente (neutre)

---

## États et Hooks

### `useSettlements`
```typescript
interface UseSettlements {
  readonly suggested: readonly SuggestedSettlement[];
  readonly isLoading: boolean;
  recordSettlement: (settlement: Settlement) => Promise<void>;
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

## Affichage dans la Liste des Dépenses

Les remboursements apparaissent dans la liste des dépenses avec :

| Élément | Dépense normale | Remboursement |
|---------|-----------------|---------------|
| Montant | Positif (ex: 50,00 €) | Négatif (ex: -50,00 €) |
| Icône | Panier/catégorie | Flèche circulaire |
| Description | "Courses", "Restaurant"... | "Remboursement à [Nom]" |
| Couleur | Standard | Gris/neutre |

---

## Workflow Simplifié

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

## Avantages de l'Approche "Dépense Négative"

1. **Simplicité** : Un seul type d'entité (Expense) à gérer
2. **Cohérence** : Les calculs de solde fonctionnent automatiquement
3. **Historique unifié** : Tout est dans la même liste
4. **Pas de workflow complexe** : Pas de statuts, pas de confirmation
5. **Confiance** : Adapté aux groupes de confiance (couples, familles, amis proches)
