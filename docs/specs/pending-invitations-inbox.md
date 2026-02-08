# Spécification : Boîte de réception des invitations

## Problème

Le parcours actuel d'acceptation d'une invitation est fastidieux pour un utilisateur non connecté :

1. Il reçoit un mail d'invitation
2. Il clique sur le lien → page `/invite/:token`
3. La page lui indique qu'il doit se connecter
4. Il génère un magic link de connexion
5. Il reçoit un second mail (connexion)
6. Il clique sur le magic link → redirigé vers `/groups`
7. Il doit retourner dans sa boîte mail pour retrouver le lien d'invitation
8. Il clique enfin sur le lien d'invitation → acceptation

**8 étapes** pour rejoindre un groupe. L'utilisateur perd le contexte entre les deux mails.

## Solution

Afficher les invitations en attente directement sur la page `/groups` (dashboard) une fois l'utilisateur connecté. L'utilisateur peut accepter ou décliner une invitation en un clic, sans repasser par ses mails.

### Parcours simplifié

1. Il reçoit un mail d'invitation
2. Il clique sur le lien → page `/invite/:token`
3. La page lui indique qu'il doit se connecter
4. Il génère un magic link de connexion
5. Il reçoit un second mail (connexion)
6. Il clique sur le magic link → redirigé vers `/groups`
7. **Ses invitations en attente sont affichées en haut de la page → il accepte en un clic**

**7 étapes** au lieu de 8. Surtout, l'étape 7 remplace les étapes 7-8 qui nécessitaient de jongler entre deux mails.

> **Note :** Le parcours via le lien direct `/invite/:token` reste fonctionnel pour les utilisateurs déjà connectés (3 étapes : clic lien → page invite → accepter).

## Périmètre

### Inclus

- Nouvel endpoint API pour lister les invitations en attente de l'utilisateur connecté
- Nouvel endpoint API pour décliner une invitation
- Composant de bannière d'invitations sur la page `/groups`
- Actions : accepter / décliner par invitation

### Exclus

- Notifications push (feature séparée déjà spécifiée dans `src/features/notifications/FEATURE.md`)
- Notifications temps réel (WebSocket/SSE)
- Badge de compteur sur la navigation
- Historique des invitations déclinées

---

## Spécification technique

### 1. Backend

#### 1.1 Nouvel endpoint : Lister mes invitations en attente

```
GET /api/invitations/pending
```

**Authentification :** Requise

**Logique :**
- Rechercher dans `group_invitations` les invitations dont :
  - `email` correspond à l'email de l'utilisateur connecté
  - `acceptedAt` est `null` (pas encore acceptée)
  - `expiresAt` est dans le futur (non expirée)
  - Pas de `declinedAt` (cf. migration ci-dessous)
- Joindre les tables `groups` (nom du groupe) et `users` (nom de l'inviteur via `createdBy`)

**Réponse :**
```typescript
type PendingInvitation = {
  readonly id: string;          // ID de l'invitation
  readonly token: string;       // Token pour accepter
  readonly group: {
    readonly id: string;
    readonly name: string;
  };
  readonly inviterName: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
};

// GET /api/invitations/pending → PendingInvitation[]
```

#### 1.2 Nouvel endpoint : Décliner une invitation

```
POST /api/invitations/:token/decline
```

**Authentification :** Requise

**Logique :**
- Vérifier que l'invitation existe, n'est pas expirée, pas déjà acceptée
- Vérifier que l'email de l'invitation correspond à l'utilisateur connecté
- Mettre à jour `declinedAt` avec le timestamp actuel
- Supprimer le `groupMember` en attente associé (celui avec `userId = null` et le même email)
- Recalculer les coefficients du groupe

**Réponse :**
```typescript
// POST /api/invitations/:token/decline → { success: boolean }
```

**Erreurs possibles :** `INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `FORBIDDEN`

#### 1.3 Migration de base de données

Ajouter une colonne `declinedAt` à la table `group_invitations` :

```sql
ALTER TABLE group_invitations ADD COLUMN declined_at INTEGER;
```

Mise à jour du schéma Drizzle dans `src/db/schema/groups.ts` :
```typescript
declinedAt: integer('declined_at', { mode: 'timestamp_ms' }),
```

#### 1.4 Modification de l'endpoint existant : Accepter une invitation

L'endpoint `POST /api/invitations/:token/accept` doit aussi vérifier que `declinedAt` est `null`. Une invitation déclinée ne peut plus être acceptée (l'inviteur devra renvoyer une nouvelle invitation).

### 2. Frontend

#### 2.1 Types

Ajouter dans `src/features/groups/types.ts` :

```typescript
type PendingInvitation = {
  readonly id: string;
  readonly token: string;
  readonly group: {
    readonly id: string;
    readonly name: string;
  };
  readonly inviterName: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
};
```

#### 2.2 API client

Ajouter dans `src/features/groups/api/invitations.ts` :

```typescript
invitationsApi = {
  // ... existant ...
  listPending: async (): Promise<PendingInvitation[]>,
  decline: async (token: string): Promise<{ success: boolean } | { error: string }>,
};
```

#### 2.3 Hook `usePendingInvitations`

Nouveau hook dans `src/features/groups/hooks/usePendingInvitations.ts` :

```typescript
function usePendingInvitations(): {
  readonly invitations: PendingInvitation[];
  readonly isLoading: boolean;
  readonly accept: (token: string) => Promise<void>;
  readonly decline: (token: string) => Promise<void>;
};
```

- Query key : `queryKeys.invitations.pending`
- Mutation `accept` : appelle `invitationsApi.accept(token)`, invalide les queries groups + pending
- Mutation `decline` : appelle `invitationsApi.decline(token)`, invalide la query pending

#### 2.4 Composant `PendingInvitationsBanner`

Nouveau composant dans `src/features/groups/components/PendingInvitationsBanner.tsx`.

**Emplacement :** Affiché en haut de `GroupsPage`, au-dessus de la liste des groupes.

**Comportement :**
- Ne s'affiche pas si aucune invitation en attente (ni pendant le chargement)
- Affiche une carte par invitation en attente
- Chaque carte contient :
  - Nom du groupe
  - Nom de l'inviteur ("**{inviterName}** vous invite à rejoindre **{groupName}**")
  - Deux boutons d'action : **Accepter** (primaire) et **Décliner** (secondaire/texte)
- État de chargement sur les boutons pendant l'action
- Après acceptation : la carte disparaît, la liste des groupes se met à jour
- Après déclinaison : la carte disparaît

**Maquette simplifiée :**

```
┌─────────────────────────────────────────────────┐
│  📩 Invitations en attente                      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Alice vous invite à rejoindre            │  │
│  │  "Vacances été 2025"                      │  │
│  │                                           │  │
│  │              [Décliner]  [Accepter]       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Bob vous invite à rejoindre              │  │
│  │  "Coloc Septembre"                        │  │
│  │                                           │  │
│  │              [Décliner]  [Accepter]       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Mes groupes                  [Nouveau groupe]  │
│  ...                                            │
```

#### 2.5 Modification de `GroupsPage`

Intégrer `PendingInvitationsBanner` dans `src/features/groups/components/GroupsPage.tsx` :

```tsx
function GroupsPage() {
  return (
    <Layout>
      <PendingInvitationsBanner />
      {/* contenu existant : header + GroupList */}
    </Layout>
  );
}
```

---

## Cas limites

| Cas | Comportement |
|-----|-------------|
| Invitation expirée entre le chargement et le clic | L'API retourne `INVITATION_EXPIRED`, afficher un message d'erreur et retirer la carte |
| Invitation annulée par l'inviteur pendant la consultation | L'API retourne `INVITATION_NOT_FOUND`, retirer la carte |
| Utilisateur accepte via le lien mail ET via le dashboard | Le premier appel réussit, le second retourne `ALREADY_MEMBER` → retirer la carte |
| Aucune invitation en attente | Le composant ne s'affiche pas du tout |
| Utilisateur invité avec un email différent de celui de son compte | L'invitation n'apparaîtra pas dans le dashboard (match par email). Le parcours par lien direct reste la seule option |

---

## Questions ouvertes

1. **Faut-il afficher les invitations sur d'autres pages que `/groups` ?** Par exemple un bandeau global dans le Layout, visible sur toutes les pages. Pour la V1, la page `/groups` semble suffisante car c'est la page d'atterrissage après connexion.

2. **Faut-il permettre de ré-inviter après un déclin ?** Actuellement prévu : oui, l'inviteur peut renvoyer une nouvelle invitation. L'ancienne invitation déclinée est simplement ignorée.
