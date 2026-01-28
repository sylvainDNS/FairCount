# Feature: Gestion des Groupes (`groups`)

## Description

Permet aux personnes utilisatrices de créer et gérer des groupes de partage de frais. Chaque groupe réunit des personnes qui partagent des dépenses communes.

## User Stories

### US-GRP-01: Créer un groupe
**En tant que** personne connectée
**Je veux** créer un nouveau groupe
**Afin de** commencer à partager des frais avec d'autres personnes

#### Critères d'acceptation
- [ ] Formulaire avec nom du groupe (obligatoire)
- [ ] Description optionnelle
- [ ] Choix de la devise (EUR par défaut)
- [ ] La personne créatrice devient automatiquement admin
- [ ] Redirection vers le groupe créé

### US-GRP-02: Voir mes groupes
**En tant que** personne connectée
**Je veux** voir la liste de mes groupes
**Afin d'** accéder rapidement à mes partages de frais

#### Critères d'acceptation
- [ ] Liste des groupes avec nom et aperçu du solde
- [ ] Tri par activité récente
- [ ] Distinction visuelle groupes actifs/archivés
- [ ] Accès rapide au dernier groupe consulté

### US-GRP-03: Modifier un groupe
**En tant qu'** admin d'un groupe
**Je veux** modifier les informations du groupe
**Afin de** corriger ou mettre à jour les détails

#### Critères d'acceptation
- [ ] Modification du nom et de la description
- [ ] Seules les personnes admin peuvent modifier
- [ ] Confirmation de la sauvegarde

### US-GRP-04: Inviter des personnes
**En tant qu'** admin d'un groupe
**Je veux** inviter des personnes par email
**Afin qu'** elles puissent participer au partage

#### Critères d'acceptation
- [ ] Formulaire avec adresse email de la personne à inviter
- [ ] Envoi d'un email d'invitation avec lien unique
- [ ] Liste des invitations en attente
- [ ] Possibilité de renvoyer ou annuler une invitation

### US-GRP-05: Rejoindre un groupe
**En tant que** personne invitée par email
**Je veux** accepter l'invitation
**Afin de** participer au partage de frais

#### Critères d'acceptation
- [ ] Email reçu avec lien d'acceptation
- [ ] Page d'aperçu du groupe avant de rejoindre
- [ ] Création de compte si non inscrit·e
- [ ] Ajout automatique au groupe après connexion

### US-GRP-06: Quitter un groupe
**En tant que** membre d'un groupe
**Je veux** quitter le groupe
**Afin de** ne plus participer au partage

#### Critères d'acceptation
- [ ] Confirmation avant de quitter
- [ ] Avertissement si solde non nul
- [ ] La dernière personne admin ne peut pas quitter
- [ ] Historique des dépenses conservé

### US-GRP-07: Archiver un groupe
**En tant qu'** admin d'un groupe
**Je veux** archiver le groupe
**Afin de** le conserver en lecture seule

#### Critères d'acceptation
- [ ] Confirmation avant archivage
- [ ] Groupe visible mais non modifiable
- [ ] Possibilité de désarchiver

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups` | Liste des groupes de la personne |
| POST | `/api/groups` | Créer un groupe |
| GET | `/api/groups/:id` | Détails d'un groupe |
| PATCH | `/api/groups/:id` | Modifier un groupe |
| DELETE | `/api/groups/:id` | Supprimer un groupe (si vide) |
| POST | `/api/groups/:id/archive` | Archiver/désarchiver |
| POST | `/api/groups/:id/invite` | Envoyer une invitation par email |
| GET | `/api/groups/:id/invitations` | Liste des invitations en attente |
| DELETE | `/api/groups/:id/invitations/:invitationId` | Annuler une invitation |
| POST | `/api/groups/:id/invitations/:invitationId/resend` | Renvoyer une invitation |
| GET | `/api/invitations/:token` | Aperçu invitation |
| POST | `/api/invitations/:token/accept` | Accepter l'invitation |
| POST | `/api/groups/:id/leave` | Quitter le groupe |

### Schéma de données

```typescript
interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string; // ISO 4217 (EUR, USD, etc.)
  createdBy: string; // userId
  createdAt: Date;
  archivedAt: Date | null;
}

interface GroupInvitation {
  id: string;
  groupId: string;
  email: string;
  token: string;
  createdBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}
```

### Règles métier

1. **Création** : Toute personne connectée peut créer un groupe
2. **Admin** : La personne créatrice est automatiquement admin
3. **Invitation** : Seules les personnes admin peuvent inviter
4. **Archivage** : Un groupe archivé est en lecture seule
5. **Suppression** : Un groupe ne peut être supprimé que s'il n'a aucune dépense

---

## Composants UI

### `GroupList`
- Liste des groupes avec cards
- Affichage du solde personnel par groupe
- Badge pour les groupes archivés

### `GroupCard`
- Nom du groupe
- Nombre de personnes membres
- Solde personnel (coloré : vert si positif, rouge si négatif)
- Date de dernière activité

### `CreateGroupForm`
- Champ nom (obligatoire)
- Champ description (optionnel)
- Sélecteur de devise
- Bouton de création

### `GroupSettings`
- Modification nom/description
- Archivage
- Zone danger (quitter/supprimer)

### `InviteForm`
- Champ email
- Bouton d'envoi
- Message de confirmation

### `PendingInvitations`
- Liste des invitations en attente
- Date d'envoi
- Actions : renvoyer, annuler

### `InvitePage`
- Aperçu du groupe (nom, description)
- Bouton accepter l'invitation
- Formulaire de connexion/inscription si non connecté·e

---

## États et Hooks

### `useGroups`
```typescript
interface UseGroups {
  groups: Group[];
  isLoading: boolean;
  createGroup: (data: CreateGroupInput) => Promise<Group>;
  refetch: () => Promise<void>;
}
```

### `useGroup`
```typescript
interface UseGroup {
  group: Group | null;
  members: GroupMember[];
  isLoading: boolean;
  isAdmin: boolean;
  updateGroup: (data: UpdateGroupInput) => Promise<void>;
  archiveGroup: () => Promise<void>;
  leaveGroup: () => Promise<void>;
}
```

### `useInvitations`
```typescript
interface UseInvitations {
  invitations: GroupInvitation[];
  isLoading: boolean;
  sendInvitation: (email: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
}
```

### `useAcceptInvitation`
```typescript
interface UseAcceptInvitation {
  invitation: GroupInvitation | null;
  group: Group | null;
  isLoading: boolean;
  accept: () => Promise<void>;
}
```

---

## Navigation

```
/groups                     → Liste des groupes
/groups/new                 → Créer un groupe
/groups/:id                 → Détail d'un groupe (dépenses)
/groups/:id/settings        → Paramètres du groupe
/groups/:id/invite          → Inviter des personnes
/invitations/:token         → Page d'acceptation d'invitation
```

---

## Template Email Invitation

```
Sujet: Invitation à rejoindre "[NOM_GROUPE]" sur FairCount

Bonjour,

[NOM_INVITANT] vous invite à rejoindre le groupe "[NOM_GROUPE]" sur FairCount.

FairCount est une application de partage de frais équitable, où chacun·e contribue selon ses moyens.

Cliquez ici pour rejoindre le groupe :
[LIEN]

À bientôt sur FairCount !
```
