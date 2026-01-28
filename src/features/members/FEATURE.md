# Feature: Gestion des Personnes Membres (`members`)

## Description

Gestion des personnes membres d'un groupe, incluant leurs informations de revenus et coefficients de contribution. Cette feature est au cœur du calcul équitable des parts.

**Philosophie de transparence** : Les revenus de chaque personne sont visibles par tous les membres du groupe. Cette transparence est essentielle pour garantir l'équité et la confiance au sein du groupe.

## User Stories

### US-MBR-01: Voir les personnes membres
**En tant que** membre d'un groupe
**Je veux** voir la liste des personnes du groupe
**Afin de** savoir avec qui je partage les frais

#### Critères d'acceptation
- [ ] Liste avec nom et photo/avatar de chaque personne
- [ ] Affichage du revenu et coefficient de chaque personne
- [ ] Badge pour les personnes non inscrites

### US-MBR-02: Définir mes revenus
**En tant que** membre d'un groupe
**Je veux** renseigner mes revenus
**Afin que** ma part soit calculée équitablement

#### Critères d'acceptation
- [ ] Champ de saisie du revenu mensuel
- [ ] Les revenus sont visibles par toutes les personnes du groupe (transparence)
- [ ] Calcul automatique du coefficient
- [ ] Possibilité de modifier à tout moment
- [ ] Notification aux autres membres en cas de modification

### US-MBR-03: Ajouter une personne non inscrite
**En tant que** membre d'un groupe
**Je veux** ajouter une personne qui n'a pas de compte
**Afin qu'** elle soit incluse dans les calculs

#### Critères d'acceptation
- [ ] Formulaire avec nom et email optionnel
- [ ] Définition du coefficient par l'admin
- [ ] Possibilité d'envoyer une invitation ultérieurement
- [ ] Liaison automatique si la personne s'inscrit avec le même email

### US-MBR-04: Retirer une personne
**En tant que** membre d'un groupe
**Je veux** retirer une personne du groupe
**Afin de** gérer les départs

#### Critères d'acceptation
- [ ] Confirmation avant retrait
- [ ] Avertissement si la personne a un solde non nul
- [ ] Option de réattribuer les dépenses
- [ ] Historique conservé

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/members` | Liste des personnes membres |
| POST | `/api/groups/:id/members` | Ajouter une personne (non inscrite) |
| GET | `/api/groups/:id/members/:memberId` | Détails d'une personne |
| PATCH | `/api/groups/:id/members/:memberId` | Modifier une personne |
| DELETE | `/api/groups/:id/members/:memberId` | Retirer une personne |
| PATCH | `/api/groups/:id/members/me` | Modifier mes infos (revenus) |

### Schéma de données

```typescript
interface GroupMember {
  readonly id: string;
  readonly groupId: string;
  readonly userId: string | null; // null si personne non inscrite
  readonly name: string;
  readonly email: string | null;
  readonly income: number; // revenu mensuel, visible par tous les membres
  readonly coefficient: number; // calculé automatiquement
  readonly joinedAt: Date;
  readonly leftAt: Date | null;
}
```

### Calcul des Coefficients

Les coefficients sont calculés automatiquement à partir des revenus déclarés.

Approche fonctionnelle avec immutabilité :

```typescript
const calculateCoefficients = (
  members: readonly GroupMember[]
): ReadonlyMap<string, number> => {
  const activeMembers = members.filter((m) => m.leftAt === null);
  const totalIncome = activeMembers.reduce((sum, m) => sum + m.income, 0);

  // Éviter la division par zéro
  if (totalIncome === 0) {
    return new Map(activeMembers.map((m) => [m.id, 1 / activeMembers.length]));
  }

  return new Map(
    activeMembers.map((m) => [m.id, m.income / totalIncome])
  );
};
```

### Règles métier

1. **Transparence totale** : Les revenus et coefficients sont visibles par toutes les personnes du groupe
2. **Horizontalité** : Toutes les personnes membres ont les mêmes droits
3. **Liaison automatique** : Une personne non inscrite est liée automatiquement si elle s'inscrit avec le même email
4. **Revenu obligatoire** : Chaque personne doit déclarer un revenu pour participer aux calculs

---

## Composants UI

### `MemberList`
- Liste des personnes avec avatar, nom, coefficient
- Badge admin/membre
- Badge "non inscrit·e" si applicable
- Actions contextuelles (modifier, retirer, promouvoir)

### `MemberCard`
- Avatar (initiales si pas de photo)
- Nom
- Revenu affiché
- Coefficient affiché en pourcentage
- Menu d'actions

### `IncomeForm`
- Champ de saisie du revenu
- Explication de la transparence
- Aperçu du coefficient calculé
- Impact sur les parts du groupe

### `AddMemberForm`
- Champ nom (obligatoire)
- Champ email (optionnel)
- Champ coefficient (obligatoire pour personne non inscrite)
- Option d'envoyer une invitation

---

## États et Hooks

### `useMembers`
```typescript
interface UseMembers {
  readonly members: readonly GroupMember[];
  readonly isLoading: boolean;
  readonly myMembership: GroupMember | null;
  addMember: (data: AddMemberInput) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}
```

### `useMyMembership`
```typescript
interface UseMyMembership {
  readonly membership: GroupMember | null;
  readonly isLoading: boolean;
  updateIncome: (income: number) => Promise<void>;
}
```

---

## Transparence des Revenus

### Affichage dans le groupe

Toutes les personnes du groupe voient :
- Le revenu de chaque personne
- Le coefficient calculé de chaque personne
- Le total des revenus du groupe

| Personne | Revenu | Coefficient |
|----------|--------|-------------|
| Alex | 3 000 € | 50% |
| Sam | 2 000 € | 33% |
| Charlie | 1 000 € | 17% |
| **Total** | **6 000 €** | **100%** |

Cette transparence est fondamentale pour l'équité : chaque personne peut vérifier que les calculs sont justes.

---

## Scénarios d'Usage

### Scénario 1 : Couple avec revenus différents
- Alex : 3000€ → 60%
- Sam : 2000€ → 40%

### Scénario 2 : Colocation à trois
- Personne 1 : 2500€ → 42%
- Personne 2 : 2000€ → 33%
- Personne 3 : 1500€ → 25%

### Scénario 3 : Famille avec enfant majeur
- Parent 1 : 4000€ → 53%
- Parent 2 : 2500€ → 33%
- Enfant (job étudiant) : 1000€ → 14%
