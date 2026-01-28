# Feature: Gestion des Personnes Membres (`members`)

## Description

Gestion des personnes membres d'un groupe, incluant leurs informations de revenus et coefficients de contribution. Cette feature est au cœur du calcul équitable des parts.

## User Stories

### US-MBR-01: Voir les personnes membres
**En tant que** membre d'un groupe
**Je veux** voir la liste des personnes du groupe
**Afin de** savoir avec qui je partage les frais

#### Critères d'acceptation
- [ ] Liste avec nom et photo/avatar de chaque personne
- [ ] Affichage du coefficient de chaque personne
- [ ] Indication du rôle (admin ou membre)
- [ ] Badge pour les personnes non inscrites

### US-MBR-02: Définir mes revenus
**En tant que** membre d'un groupe
**Je veux** renseigner mes revenus
**Afin que** ma part soit calculée équitablement

#### Critères d'acceptation
- [ ] Champ de saisie du revenu mensuel
- [ ] Le revenu est privé (non visible par les autres)
- [ ] Calcul automatique du coefficient
- [ ] Possibilité de modifier à tout moment

### US-MBR-03: Définir un coefficient manuel
**En tant que** membre d'un groupe
**Je veux** définir un coefficient sans révéler mes revenus
**Afin de** préserver ma vie privée

#### Critères d'acceptation
- [ ] Option de basculer en mode "coefficient manuel"
- [ ] Saisie d'un coefficient relatif (ex: 2, 1.5, 1)
- [ ] Le coefficient est visible par tout le groupe
- [ ] Explication du fonctionnement

### US-MBR-04: Ajouter une personne non inscrite
**En tant qu'** admin d'un groupe
**Je veux** ajouter une personne qui n'a pas de compte
**Afin qu'** elle soit incluse dans les calculs

#### Critères d'acceptation
- [ ] Formulaire avec nom et email optionnel
- [ ] Définition du coefficient par l'admin
- [ ] Possibilité d'envoyer une invitation ultérieurement
- [ ] Liaison automatique si la personne s'inscrit avec le même email

### US-MBR-05: Retirer une personne
**En tant qu'** admin d'un groupe
**Je veux** retirer une personne du groupe
**Afin de** gérer les départs

#### Critères d'acceptation
- [ ] Confirmation avant retrait
- [ ] Avertissement si la personne a un solde non nul
- [ ] Option de réattribuer les dépenses
- [ ] Historique conservé

### US-MBR-06: Promouvoir en admin
**En tant qu'** admin d'un groupe
**Je veux** promouvoir une personne en admin
**Afin de** partager la gestion du groupe

#### Critères d'acceptation
- [ ] Bouton de promotion accessible aux admins
- [ ] Confirmation avant promotion
- [ ] Notification à la personne promue

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
| PATCH | `/api/groups/:id/members/me` | Modifier mes infos (revenus/coefficient) |
| POST | `/api/groups/:id/members/:memberId/promote` | Promouvoir en admin |

### Schéma de données

```typescript
interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null; // null si personne non inscrite
  name: string;
  email: string | null;
  income: number | null; // chiffré en BDD, null si coefficient manuel
  coefficient: number; // calculé ou défini manuellement
  coefficientMode: 'auto' | 'manual';
  role: 'admin' | 'member';
  joinedAt: Date;
  leftAt: Date | null;
}
```

### Calcul des Coefficients

#### Mode automatique (basé sur les revenus)

```typescript
function calculateCoefficients(members: GroupMember[]): Map<string, number> {
  const totalIncome = members
    .filter(m => m.income !== null && m.leftAt === null)
    .reduce((sum, m) => sum + m.income!, 0);

  const coefficients = new Map<string, number>();

  for (const member of members) {
    if (member.leftAt !== null) continue;

    if (member.income !== null) {
      coefficients.set(member.id, member.income / totalIncome);
    } else {
      // Coefficient manuel : normalisé par rapport au total
      coefficients.set(member.id, member.coefficient);
    }
  }

  return normalizeCoefficients(coefficients);
}
```

#### Mode mixte (revenus + coefficients manuels)

Quand certaines personnes utilisent les revenus et d'autres des coefficients manuels :

1. Les revenus sont convertis en coefficients
2. Les coefficients manuels sont normalisés
3. Tous les coefficients sont re-normalisés pour que la somme = 1

### Règles métier

1. **Revenus privés** : Seule la personne concernée voit ses revenus
2. **Coefficients publics** : Tous les coefficients sont visibles
3. **Minimum une personne admin** : Impossible de retirer la dernière personne admin
4. **Liaison automatique** : Une personne non inscrite est liée automatiquement si elle s'inscrit avec le même email

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
- Coefficient affiché en pourcentage
- Rôle
- Menu d'actions (pour les admins)

### `IncomeForm`
- Champ de saisie du revenu
- Indicateur de confidentialité
- Aperçu du coefficient calculé
- Switch pour passer en mode manuel

### `CoefficientForm`
- Champ de saisie du coefficient
- Explication du système
- Exemples d'utilisation

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
  members: GroupMember[];
  isLoading: boolean;
  myMembership: GroupMember | null;
  addMember: (data: AddMemberInput) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  promoteMember: (memberId: string) => Promise<void>;
}
```

### `useMyMembership`
```typescript
interface UseMyMembership {
  membership: GroupMember | null;
  isLoading: boolean;
  updateIncome: (income: number) => Promise<void>;
  updateCoefficient: (coefficient: number) => Promise<void>;
  switchToManualMode: () => Promise<void>;
  switchToAutoMode: (income: number) => Promise<void>;
}
```

---

## Confidentialité des Revenus

### Chiffrement en base de données

Les revenus sont chiffrés avec une clé de chiffrement stockée dans les secrets Cloudflare :

```typescript
// Chiffrement AES-256-GCM
const encryptedIncome = await encrypt(income, ENCRYPTION_KEY);
```

### Affichage des coefficients

| Ce que je vois | Ce que les autres voient |
|----------------|--------------------------|
| Mon revenu : 3000€ | - |
| Mon coefficient : 50% | Coefficient de [Nom] : 50% |

### Mode "revenus masqués" du groupe

Option de groupe où seuls les coefficients sont affichés, jamais les revenus, même pour soi-même après validation.

---

## Scénarios d'Usage

### Scénario 1 : Couple avec revenus différents
- Alex : 3000€ → 60%
- Sam : 2000€ → 40%

### Scénario 2 : Colocation avec coefficients manuels
- Personne 1 : coefficient 2 → 40%
- Personne 2 : coefficient 2 → 40%
- Personne 3 : coefficient 1 → 20%

### Scénario 3 : Groupe mixte
- Personne inscrite avec revenu : 4000€
- Personne inscrite avec coefficient : 2
- Personne non inscrite avec coefficient : 1
