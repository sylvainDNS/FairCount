# Feature: Gestion des Dépenses (`expenses`)

## Description

Permet d'enregistrer et gérer les dépenses du groupe. Chaque dépense est répartie équitablement entre les personnes concernées selon leurs coefficients.

## User Stories

### US-EXP-01: Ajouter une dépense
**En tant que** membre d'un groupe
**Je veux** ajouter une dépense
**Afin de** l'inclure dans le partage de frais

#### Critères d'acceptation
- [ ] Formulaire avec montant, description, date
- [ ] Sélection de qui a payé
- [ ] Sélection des personnes concernées (toutes par défaut)
- [ ] Catégorie optionnelle
- [ ] Validation des champs obligatoires
- [ ] Confirmation après ajout

### US-EXP-02: Voir les dépenses du groupe
**En tant que** membre d'un groupe
**Je veux** voir la liste des dépenses
**Afin de** suivre les frais partagés

#### Critères d'acceptation
- [ ] Liste chronologique (plus récentes en premier)
- [ ] Affichage : description, montant, qui a payé, date
- [ ] Ma part équitable affichée pour chaque dépense
- [ ] Filtres par période, catégorie, personne
- [ ] Recherche par description

### US-EXP-03: Voir le détail d'une dépense
**En tant que** membre d'un groupe
**Je veux** voir le détail d'une dépense
**Afin de** comprendre la répartition

#### Critères d'acceptation
- [ ] Toutes les informations de la dépense
- [ ] Répartition par personne avec montant dû
- [ ] Photo du ticket si disponible
- [ ] Historique des modifications

### US-EXP-04: Modifier une dépense
**En tant que** membre ayant créé la dépense (ou admin)
**Je veux** modifier une dépense
**Afin de** corriger une erreur

#### Critères d'acceptation
- [ ] Modification de tous les champs
- [ ] Recalcul automatique des parts
- [ ] Historique de modification conservé
- [ ] Notification aux personnes concernées (optionnel)

### US-EXP-05: Supprimer une dépense
**En tant que** membre ayant créé la dépense (ou admin)
**Je veux** supprimer une dépense
**Afin de** corriger une erreur

#### Critères d'acceptation
- [ ] Confirmation avant suppression
- [ ] Recalcul automatique des soldes
- [ ] Soft delete (archivage, pas de suppression physique)

### US-EXP-06: Ajouter une photo de ticket
**En tant que** membre ajoutant une dépense
**Je veux** joindre une photo du ticket
**Afin de** garder une preuve de la dépense

#### Critères d'acceptation
- [ ] Upload depuis la galerie ou prise de photo
- [ ] Compression automatique
- [ ] Stockage sur Cloudflare R2
- [ ] Affichage en miniature dans la liste
- [ ] Zoom sur la photo en plein écran

### US-EXP-07: Dépense avec montants personnalisés
**En tant que** membre ajoutant une dépense
**Je veux** définir des montants spécifiques par personne
**Afin de** gérer les cas particuliers

#### Critères d'acceptation
- [ ] Option de basculer en mode "montants personnalisés"
- [ ] Saisie du montant pour chaque personne
- [ ] Validation que le total = montant de la dépense
- [ ] Retour possible au mode équitable

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/expenses` | Liste des dépenses |
| POST | `/api/groups/:id/expenses` | Créer une dépense |
| GET | `/api/groups/:id/expenses/:expenseId` | Détail d'une dépense |
| PATCH | `/api/groups/:id/expenses/:expenseId` | Modifier une dépense |
| DELETE | `/api/groups/:id/expenses/:expenseId` | Supprimer une dépense |
| POST | `/api/groups/:id/expenses/:expenseId/receipt` | Upload ticket |
| DELETE | `/api/groups/:id/expenses/:expenseId/receipt` | Supprimer ticket |

### Schéma de données

```typescript
interface Expense {
  id: string;
  groupId: string;
  paidBy: string; // memberId
  amount: number; // en centimes pour éviter les erreurs de float
  description: string;
  category: string | null;
  date: Date;
  receiptUrl: string | null;
  createdBy: string; // memberId
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ExpenseParticipant {
  id: string;
  expenseId: string;
  memberId: string;
  customAmount: number | null; // null = calcul équitable
}

// Catégories prédéfinies
type ExpenseCategory =
  | 'food'        // Alimentation
  | 'housing'     // Logement
  | 'transport'   // Transport
  | 'leisure'     // Loisirs
  | 'health'      // Santé
  | 'shopping'    // Achats
  | 'utilities'   // Factures
  | 'other';      // Autre
```

### Calcul de la Part Équitable

```typescript
interface ExpenseShare {
  memberId: string;
  amount: number; // Ce que la personne doit payer
}

function calculateShares(
  expense: Expense,
  participants: ExpenseParticipant[],
  members: GroupMember[]
): ExpenseShare[] {
  const shares: ExpenseShare[] = [];

  // Récupérer les coefficients normalisés des personnes concernées
  const relevantMembers = members.filter(m =>
    participants.some(p => p.memberId === m.id)
  );
  const coefficients = calculateCoefficients(relevantMembers);

  for (const participant of participants) {
    if (participant.customAmount !== null) {
      // Montant personnalisé
      shares.push({
        memberId: participant.memberId,
        amount: participant.customAmount
      });
    } else {
      // Calcul équitable
      const coefficient = coefficients.get(participant.memberId) || 0;
      shares.push({
        memberId: participant.memberId,
        amount: Math.round(expense.amount * coefficient)
      });
    }
  }

  // Ajustement pour que le total = montant exact (gestion des arrondis)
  adjustForRounding(shares, expense.amount);

  return shares;
}
```

### Gestion des Arrondis

Pour éviter les erreurs de centimes dues aux arrondis :

```typescript
function adjustForRounding(shares: ExpenseShare[], totalAmount: number): void {
  const currentTotal = shares.reduce((sum, s) => sum + s.amount, 0);
  const diff = totalAmount - currentTotal;

  if (diff !== 0) {
    // Ajouter/retirer la différence à la personne avec le plus gros coefficient
    const maxShare = shares.reduce((max, s) =>
      s.amount > max.amount ? s : max
    );
    maxShare.amount += diff;
  }
}
```

---

## Composants UI

### `ExpenseList`
- Liste scrollable des dépenses
- Pull-to-refresh sur mobile
- Chargement infini (pagination)
- État vide avec illustration

### `ExpenseCard`
- Description et montant
- Qui a payé (avatar + nom)
- Ma part en surbrillance
- Date
- Miniature du ticket si présent
- Swipe pour modifier/supprimer (mobile)

### `ExpenseForm`
- Champ montant avec clavier numérique
- Champ description
- Sélecteur de date (aujourd'hui par défaut)
- Sélecteur "Payé par" (moi par défaut)
- Sélecteur des personnes concernées
- Sélecteur de catégorie (optionnel)
- Bouton d'ajout de photo
- Bouton de validation

### `ExpenseDetail`
- Toutes les informations
- Tableau de répartition
- Photo du ticket (zoomable)
- Boutons modifier/supprimer

### `ExpenseFilters`
- Filtre par période (semaine, mois, année, personnalisé)
- Filtre par catégorie
- Filtre par personne
- Barre de recherche

### `ReceiptUploader`
- Bouton d'upload/capture
- Aperçu de l'image
- Option de suppression
- Indicateur de chargement

---

## États et Hooks

### `useExpenses`
```typescript
interface UseExpenses {
  expenses: Expense[];
  isLoading: boolean;
  hasMore: boolean;
  filters: ExpenseFilters;
  setFilters: (filters: ExpenseFilters) => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

### `useExpense`
```typescript
interface UseExpense {
  expense: ExpenseWithShares | null;
  isLoading: boolean;
  createExpense: (data: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (data: UpdateExpenseInput) => Promise<void>;
  deleteExpense: () => Promise<void>;
}
```

### `useReceipt`
```typescript
interface UseReceipt {
  uploadReceipt: (expenseId: string, file: File) => Promise<string>;
  deleteReceipt: (expenseId: string) => Promise<void>;
  isUploading: boolean;
}
```

---

## Upload de Tickets (Cloudflare R2)

### Configuration R2

```typescript
// Bucket R2 pour les tickets
const RECEIPTS_BUCKET = 'faircount-receipts';

// Structure des clés
// {groupId}/{expenseId}/{filename}
```

### Compression des Images

Avant upload :
- Redimensionnement max 1920px de large
- Compression JPEG qualité 80%
- Conversion des formats exotiques en JPEG

### Sécurité

- URLs signées avec expiration
- Accès limité aux personnes membres du groupe
- Suppression automatique si dépense supprimée

---

## Catégories de Dépenses

| Clé | Label FR | Icône |
|-----|----------|-------|
| `food` | Alimentation | 🍽️ |
| `housing` | Logement | 🏠 |
| `transport` | Transport | 🚗 |
| `leisure` | Loisirs | 🎬 |
| `health` | Santé | 💊 |
| `shopping` | Achats | 🛒 |
| `utilities` | Factures | 📄 |
| `other` | Autre | 📦 |

---

## Exemples de Répartition

### Exemple 1 : Dépense simple

Courses de 150€ payées par Alex, pour tout le groupe :
- Alex (50%) → doit 75€, a payé 150€ → solde +75€
- Sam (33%) → doit 50€, a payé 0€ → solde -50€
- Charlie (17%) → doit 25€, a payé 0€ → solde -25€

### Exemple 2 : Dépense partielle

Restaurant de 80€ payé par Sam, seulement pour Alex et Sam :
- Alex (coef 3000) + Sam (coef 2000) → total 5000
- Alex → 60% de 80€ = 48€
- Sam → 40% de 80€ = 32€, a payé 80€ → solde +48€
