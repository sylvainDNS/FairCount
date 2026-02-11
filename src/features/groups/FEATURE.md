# Feature: Gestion des Groupes (`groups`)

## Description

Permet aux personnes utilisatrices de créer et gérer des groupes de partage de frais. Chaque groupe réunit des personnes qui partagent des dépenses communes.

**Philosophie d'horizontalité** : Il n'y a pas de hiérarchie dans un groupe. Toutes les personnes membres ont les mêmes droits et responsabilités. Pas d'admin, pas de rôles spéciaux.

## User Stories

### US-GRP-01: Créer un groupe
**En tant que** personne connectée
**Je veux** créer un nouveau groupe
**Afin de** commencer à partager des frais avec d'autres personnes

#### Critères d'acceptation
- [ ] Formulaire avec nom du groupe (obligatoire)
- [ ] Description optionnelle
- [ ] Choix de la devise (EUR par défaut)
- [ ] Choix de la fréquence de revenu (annuel par défaut, ou mensuel)
- [ ] La personne créatrice est ajoutée au groupe
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
**En tant que** membre d'un groupe
**Je veux** modifier les informations du groupe
**Afin de** corriger ou mettre à jour les détails

#### Critères d'acceptation
- [ ] Modification du nom et de la description
- [ ] Toute personne membre peut modifier
- [ ] Confirmation de la sauvegarde

### US-GRP-04: Inviter des personnes
**En tant que** membre d'un groupe
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
- [ ] Si la personne est la dernière du groupe, le groupe est supprimé (cascade)
- [ ] Historique des dépenses conservé

### US-GRP-07: Archiver un groupe
**En tant que** membre d'un groupe
**Je veux** archiver le groupe
**Afin de** le conserver en lecture seule

#### Critères d'acceptation
- [ ] Confirmation avant archivage
- [ ] Groupe visible mais non modifiable
- [ ] Possibilité de désarchiver

### US-GRP-08: Voir et gérer mes invitations en attente
**En tant que** personne connectée
**Je veux** voir les invitations en attente depuis mon tableau de bord
**Afin de** accepter ou décliner sans retourner dans mes emails

#### Critères d'acceptation
- [ ] Bannière affichée en haut de la page `/groups` si invitations en attente
- [ ] Chaque invitation affiche le nom du groupe et de l'inviteur·euse
- [ ] Bouton "Accepter" (ajout immédiat au groupe)
- [ ] Bouton "Décliner" (invitation marquée comme déclinée)
- [ ] La bannière disparaît si aucune invitation en attente
- [ ] Le parcours via lien direct `/invite/:token` reste fonctionnel

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
| GET | `/api/groups/:id/invitations` | Liste des invitations du groupe |
| POST | `/api/groups/:id/invitations` | Envoyer une invitation par email |
| DELETE | `/api/groups/:id/invitations/:invitationId` | Annuler une invitation |
| GET | `/api/invitations/pending` | Invitations en attente de la personne connectée |
| POST | `/api/invitations/:token/accept` | Accepter l'invitation |
| POST | `/api/invitations/:token/decline` | Décliner l'invitation |
| POST | `/api/groups/:id/leave` | Quitter le groupe |

### Schéma de données

```typescript
interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string; // ISO 4217 (EUR, USD, etc.)
  incomeFrequency: 'annual' | 'monthly'; // Fréquence de déclaration des revenus
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
  declinedAt: Date | null;
  createdAt: Date;
}
```

### Règles métier

1. **Création** : Toute personne connectée peut créer un groupe
2. **Horizontalité** : Toutes les personnes membres ont les mêmes droits
3. **Invitation** : Toute personne membre peut inviter
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

## Navigation

```
/groups                     → Liste des groupes (+ bannière invitations en attente)
/groups/new                 → Créer un groupe
/groups/:id                 → Détail d'un groupe (onglets : dépenses, soldes, membres)
/groups/:id/settings        → Paramètres du groupe
/invite/:token              → Page d'acceptation d'invitation
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
