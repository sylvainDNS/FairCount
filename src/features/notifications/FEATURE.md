# Feature: Notifications (`notifications`)

## Description

Système de notifications push dans le navigateur pour informer les personnes utilisatrices des événements importants : nouvelles dépenses, demandes de remboursement, invitations, etc.

## User Stories

### US-NOT-01: Activer les notifications
**En tant que** personne utilisatrice
**Je veux** activer les notifications push
**Afin d'** être informé·e en temps réel des activités

#### Critères d'acceptation
- [ ] Demande de permission du navigateur
- [ ] Explication des types de notifications
- [ ] Possibilité d'activer/désactiver par type
- [ ] Enregistrement du token push

### US-NOT-02: Recevoir une notification de nouvelle dépense
**En tant que** membre d'un groupe
**Je veux** être notifié·e quand une dépense est ajoutée
**Afin de** suivre les frais en temps réel

#### Critères d'acceptation
- [ ] Notification avec description et montant
- [ ] Ma part affichée dans la notification
- [ ] Clic menant vers la dépense
- [ ] Option de désactiver ce type de notification

### US-NOT-03: Recevoir une notification de remboursement
**En tant que** personne recevant un remboursement
**Je veux** être notifié·e de la demande
**Afin de** confirmer la réception

#### Critères d'acceptation
- [ ] Notification avec montant et expéditeur
- [ ] Action rapide "Confirmer" depuis la notification
- [ ] Clic menant vers les remboursements

### US-NOT-04: Recevoir une notification d'invitation
**En tant que** personne invitée
**Je veux** être notifié·e de l'invitation
**Afin de** rejoindre le groupe rapidement

#### Critères d'acceptation
- [ ] Notification avec nom du groupe
- [ ] Clic menant vers la page d'invitation
- [ ] Envoyée uniquement si déjà inscrit·e

### US-NOT-05: Gérer mes préférences de notifications
**En tant que** personne utilisatrice
**Je veux** personnaliser mes notifications
**Afin de** ne recevoir que celles qui m'intéressent

#### Critères d'acceptation
- [ ] Page de paramètres des notifications
- [ ] Toggle par type de notification
- [ ] Toggle global (tout activer/désactiver)
- [ ] Gestion par groupe (optionnel)

### US-NOT-06: Voir l'historique des notifications
**En tant que** personne utilisatrice
**Je veux** voir mes notifications passées
**Afin de** ne rien manquer

#### Critères d'acceptation
- [ ] Liste des notifications récentes (30 jours)
- [ ] Marquer comme lue/non lue
- [ ] Filtrer par type ou groupe
- [ ] Suppression des notifications

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/notifications/subscribe` | Enregistrer un token push |
| DELETE | `/api/notifications/subscribe` | Désinscrire un token |
| GET | `/api/notifications` | Liste des notifications |
| PATCH | `/api/notifications/:id/read` | Marquer comme lue |
| DELETE | `/api/notifications/:id` | Supprimer une notification |
| GET | `/api/notifications/preferences` | Préférences |
| PATCH | `/api/notifications/preferences` | Modifier préférences |

### Schéma de données

```typescript
interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
  lastUsedAt: Date;
}

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>; // Données contextuelles
  groupId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

type NotificationType =
  | 'expense_added'      // Nouvelle dépense
  | 'expense_updated'    // Dépense modifiée
  | 'expense_deleted'    // Dépense supprimée
  | 'settlement_request' // Demande de remboursement
  | 'settlement_confirm' // Confirmation de remboursement
  | 'group_invitation'   // Invitation à un groupe
  | 'member_joined'      // Nouvelle personne dans le groupe
  | 'member_left'        // Personne ayant quitté le groupe
  | 'reminder';          // Rappel de remboursement

interface NotificationPreferences {
  userId: string;
  enabled: boolean; // Global toggle
  byType: Record<NotificationType, boolean>;
  byGroup: Record<string, boolean>; // groupId -> enabled
  quietHoursStart: string | null; // "22:00"
  quietHoursEnd: string | null;   // "08:00"
}
```

### Web Push avec Cloudflare Workers

#### Configuration

```typescript
// Variables d'environnement requises
interface Env {
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string; // mailto:contact@faircount.app
}
```

#### Envoi de notification

```typescript
import webpush from 'web-push';

async function sendPushNotification(
  subscription: PushSubscription,
  notification: Notification,
  env: Env
): Promise<void> {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      notificationId: notification.id,
      type: notification.type,
      url: getNotificationUrl(notification),
      ...notification.data
    },
    actions: getNotificationActions(notification.type)
  });

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys
    },
    payload
  );
}
```

### Service Worker

```typescript
// sw.js - Service Worker pour les notifications

self.addEventListener('push', (event) => {
  const data = event.data?.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data,
      actions: data.actions,
      tag: data.data?.notificationId, // Évite les doublons
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  // Gérer les actions
  if (event.action === 'confirm') {
    // Confirmer le remboursement via API
    confirmSettlement(event.notification.data.settlementId);
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});
```

---

## Types de Notifications

### Nouvelle dépense (`expense_added`)

```json
{
  "title": "Nouvelle dépense",
  "body": "[Nom] a ajouté \"[Description]\" (XX,XX €). Votre part : XX,XX €",
  "data": {
    "groupId": "...",
    "expenseId": "..."
  }
}
```

### Demande de remboursement (`settlement_request`)

```json
{
  "title": "Remboursement reçu",
  "body": "[Nom] vous a envoyé XX,XX €. Confirmez la réception.",
  "actions": [
    { "action": "confirm", "title": "Confirmer" },
    { "action": "view", "title": "Voir" }
  ],
  "data": {
    "groupId": "...",
    "settlementId": "..."
  }
}
```

### Invitation (`group_invitation`)

```json
{
  "title": "Invitation",
  "body": "[Nom] vous invite à rejoindre le groupe \"[Nom du groupe]\"",
  "data": {
    "invitationToken": "..."
  }
}
```

---

## Composants UI

### `NotificationBell`
- Icône de cloche dans la navigation
- Badge avec nombre de notifications non lues
- Dropdown avec aperçu des notifications récentes

### `NotificationList`
- Liste complète des notifications
- Indicateur lu/non lu
- Actions contextuelles
- Pull-to-refresh

### `NotificationCard`
- Icône selon le type
- Titre et description
- Horodatage relatif ("il y a 5 min")
- Actions rapides si applicable

### `NotificationSettings`
- Toggle global
- Liste des types avec toggles
- Configuration des heures calmes
- Gestion par groupe (accordéon)

### `PushPermissionPrompt`
- Explication des bénéfices
- Bouton "Activer les notifications"
- Lien "Plus tard" ou "Ne plus demander"

---

## États et Hooks

### `useNotifications`
```typescript
interface UseNotifications {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}
```

### `usePushSubscription`
```typescript
interface UsePushSubscription {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}
```

### `useNotificationPreferences`
```typescript
interface UseNotificationPreferences {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  updatePreferences: (data: Partial<NotificationPreferences>) => Promise<void>;
}
```

---

## Permissions et Compatibilité

### Vérification de la compatibilité

```typescript
function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
```

### États de permission

| État | Action |
|------|--------|
| `default` | Afficher le prompt d'activation |
| `granted` | Notifications actives |
| `denied` | Expliquer comment réactiver dans les paramètres du navigateur |

### Navigateurs supportés

- Chrome / Edge (desktop & mobile)
- Firefox (desktop & mobile)
- Safari (macOS 13+ et iOS 16.4+)
- Opera

---

## Heures Calmes

Fonctionnalité permettant de ne pas recevoir de notifications pendant certaines heures :

```typescript
function shouldSendNotification(
  preferences: NotificationPreferences
): boolean {
  if (!preferences.enabled) return false;

  if (preferences.quietHoursStart && preferences.quietHoursEnd) {
    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes()}`;

    if (isTimeBetween(
      currentTime,
      preferences.quietHoursStart,
      preferences.quietHoursEnd
    )) {
      return false;
    }
  }

  return true;
}
```

Les notifications envoyées pendant les heures calmes sont stockées et envoyées au réveil (batch).

---

## Événements Déclencheurs

| Événement | Notification | Destinataires |
|-----------|--------------|---------------|
| Dépense ajoutée | `expense_added` | Tous les membres sauf le créateur |
| Dépense modifiée | `expense_updated` | Tous les membres concernés |
| Dépense supprimée | `expense_deleted` | Tous les membres concernés |
| Remboursement créé | `settlement_request` | Personne qui reçoit |
| Remboursement confirmé | `settlement_confirm` | Personne qui a payé |
| Invitation envoyée | `group_invitation` | Personne invitée (si inscrite) |
| Personne rejoint | `member_joined` | Tous les membres |
| Rappel hebdomadaire | `reminder` | Personnes avec solde négatif |
