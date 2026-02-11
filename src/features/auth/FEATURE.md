# Feature: Authentification (`auth`)

## Description

Gestion de l'authentification des personnes utilisatrices via magic link. Aucun mot de passe n'est requis : un lien de connexion est envoyé par email.

## User Stories

### US-AUTH-01: Inscription
**En tant que** nouvelle personne utilisatrice
**Je veux** créer un compte avec mon email
**Afin de** pouvoir utiliser l'application

#### Critères d'acceptation
- [ ] Formulaire avec champ email uniquement
- [ ] Validation du format email
- [ ] Envoi d'un magic link par email
- [ ] Message de confirmation après envoi
- [ ] Gestion des erreurs (email invalide, erreur d'envoi)

### US-AUTH-02: Connexion
**En tant que** personne utilisatrice existante
**Je veux** me connecter avec mon email
**Afin d'** accéder à mes groupes et dépenses

#### Critères d'acceptation
- [ ] Formulaire avec champ email
- [ ] Envoi d'un magic link
- [ ] Redirection vers le tableau de bord après clic sur le lien
- [ ] Session persistante (cookie sécurisé)
- [ ] Le lien expire après 15 minutes

### US-AUTH-03: Déconnexion
**En tant que** personne connectée
**Je veux** pouvoir me déconnecter
**Afin de** sécuriser mon compte

#### Critères d'acceptation
- [ ] Bouton de déconnexion accessible depuis le menu
- [ ] Suppression de la session
- [ ] Redirection vers la page d'accueil

### US-AUTH-04: Profil
**En tant que** personne connectée
**Je veux** modifier mon nom d'affichage
**Afin de** personnaliser mon identité dans les groupes

#### Critères d'acceptation
- [ ] Page de profil avec nom modifiable
- [ ] Email affiché (non modifiable)
- [ ] Sauvegarde automatique ou bouton de confirmation

---

## Spécifications Techniques

### Dépendances
- `better-auth` pour la gestion de l'authentification
- Proton Mail SMTP pour l'envoi des emails

### Configuration better-auth

```typescript
// Configuration attendue
{
  emailAndPassword: {
    enabled: false // Pas de mot de passe
  },
  magicLink: {
    enabled: true,
    sendMagicLink: async ({ email, url }) => {
      // Envoi via Proton Mail SMTP
    }
  }
}
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/magic-link` | Envoie un magic link |
| GET | `/api/auth/verify` | Vérifie le token et crée la session |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Récupère la personne connectée |
| PATCH | `/api/auth/profile` | Met à jour le profil |

### Schéma de données

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}
```

### Template Email Magic Link

```
Sujet: Votre lien de connexion FairCount

Bonjour,

Cliquez sur le lien ci-dessous pour vous connecter à FairCount :

[LIEN]

Ce lien expire dans 15 minutes.

Si vous n'avez pas demandé ce lien, ignorez cet email.

L'équipe FairCount
```

---

## Composants UI

### `LoginForm`
- Champ email avec validation
- Bouton d'envoi
- État de chargement
- Message de succès/erreur

### `AuthLayout`
- Layout centré pour les pages d'auth
- Logo FairCount
- Fond sobre

### `ProfilePage`
- Affichage et édition du nom
- Email en lecture seule
- Bouton de déconnexion

---

## Gestion des Erreurs

| Code | Message | Cause |
|------|---------|-------|
| `INVALID_EMAIL` | "Adresse email invalide" | Format email incorrect |
| `EMAIL_SEND_FAILED` | "Impossible d'envoyer l'email" | Erreur SMTP |
| `LINK_EXPIRED` | "Ce lien a expiré" | Token expiré |
| `LINK_INVALID` | "Ce lien n'est pas valide" | Token invalide |

---

## Sécurité

- Tokens magic link à usage unique
- Expiration après 15 minutes
- Rate limiting sur l'envoi d'emails (max 3/heure par email)
- Sessions avec expiration (7 jours)
- Cookies HttpOnly, Secure, SameSite=Strict
