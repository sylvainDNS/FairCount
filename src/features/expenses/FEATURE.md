# Feature: Gestion des Dépenses (`expenses`)

## Description

Permet d'enregistrer et gérer les dépenses du groupe. Chaque dépense est répartie équitablement entre les personnes concernées selon leurs coefficients.

**Note** : Les remboursements sont gérés par un modèle séparé (`settlements`). Voir la feature `settlements` pour plus de détails.

## User Stories

### US-EXP-01: Ajouter une dépense
**En tant que** membre d'un groupe
**Je veux** ajouter une dépense
**Afin de** l'inclure dans le partage de frais

#### Critères d'acceptation
- [ ] Formulaire avec montant, description, date
- [ ] Sélection de qui a payé
- [ ] Sélection des personnes concernées (toutes par défaut)
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
- [ ] Filtres par période, personne
- [ ] Recherche par description

### US-EXP-03: Voir le détail d'une dépense
**En tant que** membre d'un groupe
**Je veux** voir le détail d'une dépense
**Afin de** comprendre la répartition

#### Critères d'acceptation
- [ ] Toutes les informations de la dépense
- [ ] Répartition par personne avec montant dû
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

### US-EXP-06: Dépense avec montants personnalisés
**En tant que** membre ajoutant une dépense
**Je veux** définir des montants spécifiques par personne
**Afin de** gérer les cas particuliers

#### Critères d'acceptation
- [ ] Option de basculer en mode "montants personnalisés"
- [ ] Saisie du montant pour chaque personne
- [ ] Validation que le total = montant de la dépense
- [ ] Retour possible au mode équitable

### US-EXP-07: Dépenses récurrentes
**En tant que** membre d'un groupe
**Je veux** qu'une dépense régulière (loyer, abonnement…) s'ajoute toute seule
**Afin de** ne plus la ressaisir ni l'oublier

Spec complète : `specs/003-recurring-expenses/`. Vocabulaire : **récurrence** (le modèle),
**échéance** (une date), **dépense générée** (dépense ordinaire ajoutée à une échéance, appelée
simplement « dépense » dans l'UI).

#### Critères d'acceptation
- [x] Case « Répéter cette dépense » dans le formulaire de création (Jour · Semaine · Mois · An)
- [x] Ajout automatique à chaque échéance (Cron Trigger), rattrapage des pannes, jamais de doublon
- [x] Icône ↻ sur les dépenses générées, filtre « Récurrentes », carte « Récurrences » repliable
- [x] Modifier (prochaines échéances seulement), désactiver/réactiver, supprimer (soft delete)

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
| GET | `/api/groups/:id/recurring-expenses` | Liste des récurrences (hors supprimées) |
| POST | `/api/groups/:id/recurring-expenses` | Créer une récurrence (génère la dépense si l'échéance est aujourd'hui) |
| GET | `/api/groups/:id/recurring-expenses/:recurringExpenseId` | Détail d'une récurrence |
| PATCH | `/api/groups/:id/recurring-expenses/:recurringExpenseId` | Modifier (prochaines échéances) |
| POST | `/api/groups/:id/recurring-expenses/:recurringExpenseId/deactivate` | Désactiver |
| POST | `/api/groups/:id/recurring-expenses/:recurringExpenseId/reactivate` | Réactiver (sans rattrapage) |
| DELETE | `/api/groups/:id/recurring-expenses/:recurringExpenseId` | Supprimer (soft delete) |

Contrat détaillé : `specs/003-recurring-expenses/contracts/recurring-expenses-api.md`.

### Schéma de données

```typescript
interface Expense {
  readonly id: string;
  readonly groupId: string;
  readonly paidBy: string; // memberId
  readonly amount: number; // en centimes (toujours positif)
  readonly description: string;
  readonly date: Date;
  readonly createdBy: string; // memberId
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

interface ExpenseParticipant {
  readonly id: string;
  readonly expenseId: string;
  readonly memberId: string;
  readonly customAmount: number | null; // null = calcul équitable
}
```

### Calcul de la Part Équitable

Les parts sont calculées proportionnellement aux coefficients des personnes concernées. Si un montant personnalisé est défini, il est utilisé à la place du calcul automatique.

### Gestion des Arrondis

Pour éviter les erreurs de centimes dues aux arrondis, la différence entre le total des parts calculées et le montant de la dépense est ajoutée à la personne avec la plus grosse part.

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
- Boutons modifier/supprimer accessibles via menu contextuel

### `ExpenseForm`
- Champ montant avec clavier numérique
- Champ description
- Sélecteur de date (aujourd'hui par défaut)
- Sélecteur "Payé par" (moi par défaut)
- Sélecteur des personnes concernées
- Bouton de validation

### `ExpenseDetail`
- Toutes les informations
- Tableau de répartition
- Boutons modifier/supprimer

### `ExpenseFilters`
- Filtre par période (semaine, mois, année, personnalisé)
- Filtre par personne
- Filtre par type (Toutes · Récurrentes)
- Barre de recherche

### Récurrences
- `RecurrenceFields` : bloc « Répétition » du formulaire (fréquence, jour, résumé en direct)
- `RecurrenceSection` : carte repliable « Récurrences » au-dessus des filtres (état mémorisé par appareil)
- `RecurrenceDetail` : détail d'une récurrence et actions (Modifier, Désactiver/Réactiver, Supprimer)
- `RepeatIcon` : icône ↻ partagée par la carte, le formulaire et les dépenses générées

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
