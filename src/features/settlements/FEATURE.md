# Feature: Remboursements (`settlements`)

## Description

Gère les remboursements entre personnes du groupe pour équilibrer les soldes. Propose des suggestions optimisées pour minimiser le nombre de transactions.

## User Stories

### US-SET-01: Voir les remboursements suggérés
**En tant que** membre d'un groupe
**Je veux** voir les remboursements à effectuer
**Afin de** savoir combien et à qui je dois rembourser

#### Critères d'acceptation
- [ ] Liste des remboursements optimisés
- [ ] Pour chaque remboursement : de qui, à qui, combien
- [ ] Mise en évidence de mes propres remboursements
- [ ] Explication de l'optimisation

### US-SET-02: Marquer un remboursement comme effectué
**En tant que** personne devant de l'argent
**Je veux** marquer un remboursement comme fait
**Afin de** mettre à jour les soldes

#### Critères d'acceptation
- [ ] Bouton "Marquer comme payé"
- [ ] Confirmation avec le montant
- [ ] Notification à la personne qui reçoit
- [ ] Mise à jour immédiate des soldes

### US-SET-03: Confirmer la réception d'un remboursement
**En tant que** personne recevant de l'argent
**Je veux** confirmer la réception
**Afin de** valider la transaction

#### Critères d'acceptation
- [ ] Notification de remboursement en attente
- [ ] Bouton "Confirmer la réception"
- [ ] Option "Contester" si non reçu
- [ ] Historique des confirmations

### US-SET-04: Effectuer un remboursement partiel
**En tant que** personne devant de l'argent
**Je veux** faire un remboursement partiel
**Afin de** payer progressivement

#### Critères d'acceptation
- [ ] Option de modifier le montant
- [ ] Montant minimum (ex: 1€)
- [ ] Solde restant affiché après remboursement

### US-SET-05: Voir l'historique des remboursements
**En tant que** membre d'un groupe
**Je veux** voir l'historique des remboursements
**Afin de** garder une trace des transactions

#### Critères d'acceptation
- [ ] Liste chronologique des remboursements
- [ ] Filtres : tous, envoyés, reçus
- [ ] Statut : en attente, confirmé, contesté
- [ ] Date et montant de chaque remboursement

### US-SET-06: Annuler un remboursement
**En tant que** personne ayant marqué un remboursement
**Je veux** pouvoir l'annuler
**Afin de** corriger une erreur

#### Critères d'acceptation
- [ ] Bouton d'annulation disponible si non confirmé
- [ ] Confirmation avant annulation
- [ ] Notification à l'autre personne
- [ ] Retour aux soldes précédents

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/settlements` | Historique des remboursements |
| GET | `/api/groups/:id/settlements/suggested` | Remboursements suggérés |
| POST | `/api/groups/:id/settlements` | Créer un remboursement |
| PATCH | `/api/groups/:id/settlements/:settlementId` | Modifier (confirmer/annuler) |
| DELETE | `/api/groups/:id/settlements/:settlementId` | Annuler un remboursement |

### Schéma de données

```typescript
interface Settlement {
  id: string;
  groupId: string;
  fromMember: string;    // Qui paie
  toMember: string;      // Qui reçoit
  amount: number;        // Montant en centimes
  status: SettlementStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
}

type SettlementStatus =
  | 'pending'     // Marqué comme payé, en attente de confirmation
  | 'confirmed'   // Confirmé par la personne qui reçoit
  | 'cancelled';  // Annulé

interface SuggestedSettlement {
  fromMember: GroupMember;
  toMember: GroupMember;
  amount: number;
}
```

### Algorithme d'Optimisation des Remboursements

L'objectif est de minimiser le nombre de transactions tout en équilibrant tous les soldes.

```typescript
function suggestSettlements(balances: Balance[]): SuggestedSettlement[] {
  const settlements: SuggestedSettlement[] = [];

  // Séparer créditeurs et débiteurs
  const debtors = balances
    .filter(b => b.netBalance < 0)
    .map(b => ({ ...b, remaining: Math.abs(b.netBalance) }))
    .sort((a, b) => b.remaining - a.remaining); // Plus gros débiteur en premier

  const creditors = balances
    .filter(b => b.netBalance > 0)
    .map(b => ({ ...b, remaining: b.netBalance }))
    .sort((a, b) => b.remaining - a.remaining); // Plus gros créditeur en premier

  // Algorithme glouton : matcher les plus gros montants
  for (const debtor of debtors) {
    while (debtor.remaining > 0) {
      // Trouver le créditeur avec le plus gros solde restant
      const creditor = creditors.find(c => c.remaining > 0);
      if (!creditor) break;

      // Calculer le montant du remboursement
      const amount = Math.min(debtor.remaining, creditor.remaining);

      settlements.push({
        fromMember: debtor.memberId,
        toMember: creditor.memberId,
        amount: amount
      });

      debtor.remaining -= amount;
      creditor.remaining -= amount;
    }
  }

  return settlements;
}
```

### Exemple d'optimisation

**Soldes avant optimisation :**
- Alex : +100€ (créditeur)
- Sam : +50€ (créditeur)
- Charlie : -80€ (débiteur)
- Jordan : -70€ (débiteur)

**Sans optimisation (4 transactions) :**
- Charlie → Alex : 53€
- Charlie → Sam : 27€
- Jordan → Alex : 47€
- Jordan → Sam : 23€

**Avec optimisation (3 transactions) :**
- Charlie → Alex : 80€
- Jordan → Alex : 20€
- Jordan → Sam : 50€

---

## Composants UI

### `SettlementSuggestions`
- Carte pour chaque remboursement suggéré
- De qui → À qui
- Montant
- Bouton "Marquer comme payé" si je suis débiteur
- Méthodes de paiement suggérées (Lydia, PayPal, virement...)

### `SettlementCard`
- Avatars des deux personnes avec flèche
- Montant
- Statut visuel (en attente, confirmé)
- Actions contextuelles

### `SettlementForm`
- Montant pré-rempli (modifiable)
- Sélection de la méthode de paiement (informatif)
- Note optionnelle
- Bouton de validation

### `SettlementHistory`
- Liste des remboursements passés
- Filtres par statut et par personne
- Date et montant
- Statut avec icône

### `SettlementConfirmation`
- Modal de confirmation
- Résumé : qui, combien
- Boutons Confirmer / Contester

### `PendingSettlements`
- Badge de notification
- Liste des remboursements en attente de ma confirmation
- Actions rapides

---

## États et Hooks

### `useSettlements`
```typescript
interface UseSettlements {
  settlements: Settlement[];
  suggested: SuggestedSettlement[];
  pending: Settlement[]; // En attente de ma confirmation
  isLoading: boolean;
  createSettlement: (data: CreateSettlementInput) => Promise<void>;
  confirmSettlement: (id: string) => Promise<void>;
  cancelSettlement: (id: string) => Promise<void>;
}
```

### `useMySettlements`
```typescript
interface UseMySettlements {
  toPay: SuggestedSettlement[];    // Ce que je dois payer
  toReceive: SuggestedSettlement[]; // Ce que je dois recevoir
  pendingConfirmation: Settlement[]; // À confirmer
}
```

---

## Notifications

### Lors d'un remboursement marqué comme payé

**À la personne qui reçoit :**
```
[Nom] vous a envoyé un remboursement de [montant]
Confirmez-vous la réception ?
[Confirmer] [Voir le détail]
```

### Lors d'une confirmation

**À la personne qui a payé :**
```
[Nom] a confirmé la réception de votre remboursement de [montant]
```

### Rappel de remboursement

**Aux personnes débitrices (optionnel, paramétrable) :**
```
Vous devez encore [montant] au groupe [Nom du groupe]
[Voir les détails]
```

---

## Méthodes de Paiement (Informatif)

L'application ne gère pas les paiements réels, mais peut suggérer des méthodes :

- Espèces
- Virement bancaire
- Lydia
- PayPal
- Pumpkin
- Autre

Ces informations sont purement indicatives et n'ont pas d'impact sur le calcul.

---

## Workflow de Remboursement

```
┌─────────────────┐
│  Solde négatif  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Voir suggestion │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Effectuer le    │
│ paiement réel   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Marquer comme   │
│ payé dans l'app │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ En attente de   │────▶│   Confirmé      │
│ confirmation    │     └─────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Contesté     │
└─────────────────┘
```

---

## Cas Particuliers

### Remboursement contesté

1. La personne peut ajouter un commentaire
2. Discussion possible via commentaires
3. Le remboursement reste en attente jusqu'à résolution
4. L'admin peut forcer la confirmation ou l'annulation

### Remboursement partiel

1. La personne saisit un montant inférieur au suggéré
2. Le solde est mis à jour partiellement
3. Un nouveau remboursement apparaît pour le reste

### Personne non inscrite

1. Les remboursements vers/depuis une personne non inscrite sont possibles
2. La confirmation est faite par un·e admin
3. Encouragement à inviter la personne à s'inscrire
