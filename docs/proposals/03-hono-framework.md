# Migration vers Hono Framework

## Contexte

### État actuel du codebase

Le worker Cloudflare actuel (`/src/workers/index.ts`) utilise une approche manuelle pour le routing et la gestion des requêtes :

- **Routing manuel** via parsing d'URL et conditions `if/else` imbriquées
- **Gestion CORS** implémentée manuellement avec des fonctions utilitaires (`getCorsHeaders`, `handleCors`, `addCorsHeaders`)
- **Context passé explicitement** à chaque handler via l'interface `RouteContext: { db: Database; auth: Auth; env: Env }`
- **Parsing de path** répétitif dans chaque fichier de routes (`pathParts.split('/').filter(Boolean)`)
- **Gestion d'erreur** avec try-catch global retournant une erreur 500 générique

### Problèmes identifiés

1. **Verbosité** : ~120 lignes dans `index.ts` juste pour le routing de base, plus ~280 lignes de routing conditionnel dans `groups.ts`
2. **Répétition du code CORS** : Chaque réponse doit être wrappée avec `addCorsHeaders()`
3. **Parsing de path fragile** : Manipulation manuelle des `pathParts[0]`, `pathParts[1]`, etc. sujette aux erreurs
4. **Pas de validation de types sur les paramètres** : Le parsing des query params et body est fait manuellement
5. **Manque de middleware** : L'authentification et la vérification de membership sont répétées dans chaque handler
6. **Testabilité limitée** : La structure monolithique rend les tests unitaires difficiles

## Objectifs

### Ce que l'amélioration apporte

- **Code plus lisible et maintenable** avec un DSL de routing déclaratif
- **CORS automatique** via middleware intégré
- **Typage fort des paramètres** de route, query et body avec Zod
- **Middleware réutilisables** pour l'authentification et l'autorisation
- **Meilleure gestion d'erreur** avec des handlers dédiés
- **Testabilité améliorée** grâce à l'architecture modulaire de Hono

### Métriques de succès

- Réduction du code boilerplate de ~40%
- Temps de développement de nouvelles routes réduit
- 100% des tests existants passent après migration
- Aucune régression fonctionnelle
- Performance équivalente ou meilleure (Hono est optimisé pour les edge workers)

## Solution proposée

### Librairie choisie : Hono

**Hono** est le framework recommandé pour plusieurs raisons :

1. **Conçu pour Cloudflare Workers** : Support natif, performances optimisées pour l'edge
2. **Léger** : ~13KB minifié, aucune dépendance
3. **API moderne** : Routing expressif, middleware chainables, support TypeScript first-class
4. **Validateurs intégrés** : Support Zod natif via `@hono/zod-validator`
5. **Écosystème riche** : Middleware CORS, bearer auth, etc. disponibles

### Architecture cible

```
src/workers/
├── index.ts                    # Point d'entrée Hono
├── app.ts                      # Configuration app Hono + middleware globaux
├── middleware/
│   ├── auth.ts                 # Middleware d'authentification
│   ├── cors.ts                 # Configuration CORS
│   └── db.ts                   # Injection DB dans le contexte
├── routes/
│   ├── index.ts                # Agrégation des routes
│   ├── health.ts               # Route /api/health
│   ├── auth.ts                 # Routes /api/auth/*
│   ├── groups/
│   │   ├── index.ts            # Routes /api/groups
│   │   ├── members.ts          # Routes /api/groups/:id/members
│   │   ├── expenses.ts         # Routes /api/groups/:id/expenses
│   │   ├── balances.ts         # Routes /api/groups/:id/balances
│   │   └── settlements.ts      # Routes /api/groups/:id/settlements
│   └── invitations.ts          # Routes /api/invitations
└── types.ts                    # Types Hono personnalisés
```

## Plan d'implémentation

### Étape 1 : Installation et configuration de base

**Fichiers impactés** : `package.json`, `src/workers/types.ts`

```bash
pnpm add hono @hono/zod-validator
```

Créer les types Hono personnalisés pour le contexte applicatif.

### Étape 2 : Créer l'application Hono avec middleware globaux

**Fichiers impactés** : `src/workers/app.ts` (nouveau), `src/workers/middleware/` (nouveau)

- Configurer CORS
- Créer le middleware d'injection DB/Auth
- Configurer le error handler global

### Étape 3 : Migrer la route health check

**Fichiers impactés** : `src/workers/routes/health.ts` (nouveau)

Point de départ simple pour valider la configuration.

### Étape 4 : Migrer les routes auth

**Fichiers impactés** : `src/workers/routes/auth.ts` (nouveau)

Intégration de better-auth comme handler Hono.

### Étape 5 : Créer le middleware d'authentification

**Fichiers impactés** : `src/workers/middleware/auth.ts` (nouveau)

Middleware réutilisable pour vérifier la session.

### Étape 6 : Migrer les routes groups

**Fichiers impactés** : `src/workers/routes/groups/index.ts` (nouveau)

C'est la partie la plus conséquente. Migration progressive des sous-routes.

### Étape 7 : Migrer les sous-routes groups

**Fichiers impactés** : `src/workers/routes/groups/{members,expenses,balances,settlements}.ts` (nouveaux)

Extraction des handlers existants vers des fichiers Hono dédiés.

### Étape 8 : Migrer les routes invitations

**Fichiers impactés** : `src/workers/routes/invitations.ts` (nouveau)

### Étape 9 : Mettre à jour le point d'entrée

**Fichiers impactés** : `src/workers/index.ts`

Remplacer le code existant par l'export de l'app Hono.

### Étape 10 : Supprimer l'ancien code

**Fichiers supprimés** : `src/workers/api/routes/*.ts`

Nettoyage après validation complète.

## Exemples de code

### Point d'entrée : Avant

```typescript
// src/workers/index.ts (actuel - 122 lignes)
const getCorsHeaders = (request: Request, env: Env): Record<string, string> => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(request, env),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
});

const handleCors = (request: Request, env: Env): Response | null => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(request, env) });
  }
  return null;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;

    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/health') {
        return addCorsHeaders(Response.json({ status: 'ok' }), request, env);
      }

      if (url.pathname.startsWith('/api/auth')) {
        const db = createDb(env.DB);
        const auth = createAuth({ db, env });
        const response = await auth.handler(request);
        return addCorsHeaders(response, request, env);
      }

      if (url.pathname.startsWith('/api/groups')) {
        const db = createDb(env.DB);
        const auth = createAuth({ db, env });
        const response = await handleGroupsRoutes(request, { db, auth, env });
        return addCorsHeaders(response, request, env);
      }
      // ... autres routes
    } catch (error) {
      return addCorsHeaders(Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 }), request, env);
    }
  },
};
```

### Point d'entrée : Après

```typescript
// src/workers/index.ts (Hono - ~15 lignes)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { dbMiddleware } from './middleware/db';
import { errorHandler } from './middleware/error';
import { authRoutes } from './routes/auth';
import { groupsRoutes } from './routes/groups';
import { healthRoute } from './routes/health';
import { invitationsRoutes } from './routes/invitations';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware globaux
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [c.env.APP_URL, 'http://localhost:3000', 'http://localhost:5173'];
    return allowed.includes(origin) ? origin : c.env.APP_URL;
  },
  credentials: true,
}));
app.use('/api/*', dbMiddleware);
app.onError(errorHandler);

// Routes
app.route('/api/health', healthRoute);
app.route('/api/auth', authRoutes);
app.route('/api/groups', groupsRoutes);
app.route('/api/invitations', invitationsRoutes);

export default app;
```

### Route groups : Avant

```typescript
// src/workers/api/routes/groups.ts (actuel - extrait du handler principal)
export async function handleGroupsRoutes(request: Request, ctx: RouteContext): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  const session = await ctx.auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = session.user;
  const pathParts = url.pathname.replace('/api/groups', '').split('/').filter(Boolean);

  // GET /api/groups
  if (method === 'GET' && pathParts.length === 0) {
    return listGroups(ctx, user.id);
  }

  // POST /api/groups
  if (method === 'POST' && pathParts.length === 0) {
    const body = await parseJsonBody<{ name?: string; description?: string }>(request);
    if (!body) {
      return Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }
    return createGroup(ctx, user, body);
  }

  const groupId = pathParts[0];
  if (!groupId || !isValidUUID(groupId)) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const membership = await verifyMembership(ctx.db, groupId, user.id);
  if (!membership) {
    return Response.json({ error: 'NOT_A_MEMBER' }, { status: 403 });
  }

  // GET /api/groups/:id
  if (method === 'GET' && !action) {
    return getGroup(ctx, groupId, user.id);
  }

  // ... 200+ lignes de conditions if/else supplémentaires
}
```

### Route groups : Après

```typescript
// src/workers/routes/groups/index.ts (Hono)
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth';
import { membershipMiddleware } from '../../middleware/membership';
import type { AppEnv } from '../../types';
import { balancesRoutes } from './balances';
import { expensesRoutes } from './expenses';
import { membersRoutes } from './members';
import { settlementsRoutes } from './settlements';

const groups = new Hono<AppEnv>();

// Toutes les routes groups nécessitent une authentification
groups.use('*', authMiddleware);

// GET /api/groups
groups.get('/', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  return c.json(await listGroups(db, user.id));
});

// POST /api/groups
const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().default('EUR'),
});

groups.post('/', zValidator('json', createGroupSchema), async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const data = c.req.valid('json');
  const result = await createGroup(db, user, data);
  return c.json(result, 201);
});

// Routes avec :id - nécessitent vérification membership
const groupById = new Hono<AppEnv>();
groupById.use('*', membershipMiddleware);

// GET /api/groups/:id
groupById.get('/', async (c) => {
  const groupId = c.req.param('id');
  const user = c.get('user');
  const db = c.get('db');
  return c.json(await getGroup(db, groupId, user.id));
});

// PATCH /api/groups/:id
groupById.patch('/', zValidator('json', updateGroupSchema), async (c) => {
  const groupId = c.req.param('id');
  const db = c.get('db');
  const data = c.req.valid('json');
  return c.json(await updateGroup(db, groupId, data));
});

// POST /api/groups/:id/archive
groupById.post('/archive', async (c) => {
  const groupId = c.req.param('id');
  const db = c.get('db');
  return c.json(await toggleArchive(db, groupId));
});

// Sous-routes
groupById.route('/members', membersRoutes);
groupById.route('/expenses', expensesRoutes);
groupById.route('/balances', balancesRoutes);
groupById.route('/settlements', settlementsRoutes);

groups.route('/:id', groupById);

export { groups as groupsRoutes };
```

### Middleware d'authentification : Après

```typescript
// src/workers/middleware/auth.ts (nouveau)
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.get('auth');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    throw new HTTPException(401, { message: 'UNAUTHORIZED' });
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
```

### Middleware de membership : Après

```typescript
// src/workers/middleware/membership.ts (nouveau)
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { and, eq, isNull } from 'drizzle-orm';
import * as schema from '../../db/schema';
import type { AppEnv } from '../types';

export const membershipMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id');

  if (!groupId) {
    throw new HTTPException(404, { message: 'NOT_FOUND' });
  }

  const [member] = await db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, user.id),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!member) {
    throw new HTTPException(403, { message: 'NOT_A_MEMBER' });
  }

  c.set('membership', member);
  await next();
});
```

### Types Hono personnalisés

```typescript
// src/workers/types.ts (mis à jour)
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { Database } from '../db';
import type { Auth } from '../lib/auth';
import type * as schema from '../db/schema';

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  APP_URL: string;
  APP_NAME: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  AUTH_SECRET: string;
}

// Types pour le contexte Hono
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    auth: Auth;
    user: { id: string; name?: string | null; email: string };
    session: { id: string; expiresAt: Date };
    membership: typeof schema.groupMembers.$inferSelect;
  };
};
```

## Risques et mitigations

### Points d'attention

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Régression fonctionnelle | Élevé | Tests end-to-end exhaustifs avant déploiement |
| Incompatibilité better-auth | Moyen | Tester l'intégration dans une branche dédiée d'abord |
| Performance edge | Faible | Hono est optimisé pour Workers, benchmarks si doute |
| Breaking changes API | Élevé | Garder exactement les mêmes formats de réponse |

### Stratégie de rollback

1. **Branche de migration** : Tout le travail sur une branche `feat/hono-migration`
2. **Feature flag** : Possibilité de router entre ancien et nouveau code via variable d'environnement
3. **Déploiement progressif** : Utiliser les preview deployments Cloudflare pour validation
4. **Ancien code conservé** : Ne pas supprimer l'ancien code tant que la migration n'est pas validée en production pendant 1 semaine

### Plan de test

1. Tous les tests unitaires existants doivent passer
2. Tests manuels de chaque endpoint via Postman/Bruno
3. Test de la gestion CORS avec le frontend
4. Test du flow d'authentification complet (magic link)
5. Test de charge basique pour valider les performances

## Estimation de complexité

| Critère | Évaluation |
|---------|------------|
| **Taille** | **M (Medium)** |
| Fichiers impactés | ~15 fichiers |
| Lignes de code à migrer | ~1500 lignes |
| Durée estimée | 2-3 jours |

### Dépendances avec autres chantiers

- **Aucune dépendance bloquante** : La migration peut être faite indépendamment
- **Facilite les futures évolutions** : Ajout de nouvelles routes, validation, documentation OpenAPI

### Ordre de priorité

Cette migration est recommandée **avant** d'ajouter de nouvelles fonctionnalités majeures au backend, car elle facilitera leur implémentation et leur maintenance.

---

## Tâches de développement

### Phase 1 : Infrastructure Hono

#### 1.1 Installation des dépendances Hono

**Fichiers concernés :**
- `package.json` (modification)

**Description :**
Installer Hono et ses packages complémentaires via pnpm.

```bash
pnpm add hono @hono/zod-validator
```

**Critères de validation :**
- [ ] `hono` et `@hono/zod-validator` présents dans `dependencies`
- [ ] `pnpm install` s'exécute sans erreur

---

#### 1.2 Créer les types Hono personnalisés

**Fichiers concernés :**
- `src/workers/types.ts` (modification)

**Description :**
Étendre le fichier `types.ts` existant avec les types `AppEnv` pour le contexte Hono (Variables, Bindings).

**Critères de validation :**
- [ ] Type `AppEnv` exporté avec `Bindings: Env` et `Variables`
- [ ] Variables inclut : `db`, `auth`, `user`, `session`, `membership`
- [ ] Aucune erreur TypeScript

---

#### 1.3 Créer le middleware d'injection DB/Auth

**Fichiers concernés :**
- `src/workers/middleware/db.ts` (création)

**Description :**
Middleware Hono qui instancie `Database` et `Auth` depuis les bindings Cloudflare et les injecte dans le contexte.

**Critères de validation :**
- [ ] Middleware injecte `db` et `auth` dans `c.set()`
- [ ] Utilise `createDb()` et `createAuth()` existants
- [ ] Export nommé `dbMiddleware`

---

#### 1.4 Créer le middleware CORS

**Fichiers concernés :**
- `src/workers/middleware/cors.ts` (création)

**Description :**
Configuration CORS avec le middleware `hono/cors`. Gérer les origines autorisées (`APP_URL`, `localhost:3000`, `localhost:5173`).

**Critères de validation :**
- [ ] Origines dynamiques selon `c.env.APP_URL`
- [ ] `credentials: true` configuré
- [ ] Méthodes `GET, POST, PUT, PATCH, DELETE, OPTIONS` autorisées

---

#### 1.5 Créer le middleware d'authentification

**Fichiers concernés :**
- `src/workers/middleware/auth.ts` (création)

**Description :**
Middleware qui vérifie la session via `better-auth` et injecte `user` et `session` dans le contexte. Throw `HTTPException(401)` si non authentifié.

**Critères de validation :**
- [ ] Appelle `auth.api.getSession()` avec les headers
- [ ] Injecte `user` et `session` dans le contexte si valides
- [ ] Lève `HTTPException(401, { message: 'UNAUTHORIZED' })` sinon
- [ ] Export nommé `authMiddleware`

---

#### 1.6 Créer le middleware de vérification membership

**Fichiers concernés :**
- `src/workers/middleware/membership.ts` (création)

**Description :**
Middleware qui vérifie l'appartenance de l'utilisateur au groupe (`:id` param). Réutilise la logique de `verifyMembership()` de `groups.ts`.

**Critères de validation :**
- [ ] Récupère `groupId` depuis `c.req.param('id')`
- [ ] Vérifie membre actif (`leftAt IS NULL`)
- [ ] Injecte `membership` dans le contexte
- [ ] Lève `HTTPException(403, { message: 'NOT_A_MEMBER' })` si non membre
- [ ] Export nommé `membershipMiddleware`

---

#### 1.7 Créer le error handler global

**Fichiers concernés :**
- `src/workers/middleware/error.ts` (création)

**Description :**
Handler d'erreur Hono pour centraliser les réponses d'erreur. Gérer les `HTTPException` et les erreurs inattendues.

**Critères de validation :**
- [ ] Retourne le message de l'exception HTTP si `HTTPException`
- [ ] Retourne `{ error: 'INTERNAL_ERROR' }` avec status 500 pour les autres erreurs
- [ ] Log l'erreur en console pour le debug
- [ ] Export nommé `errorHandler`

---

### Phase 2 : Migration des routes simples

#### 2.1 Créer l'application Hono principale

**Fichiers concernés :**
- `src/workers/app.ts` (création)

**Description :**
Point d'entrée de l'application Hono avec les middleware globaux (CORS, DB, error handler).

**Critères de validation :**
- [ ] `Hono<{ Bindings: Env }>` instancié
- [ ] CORS appliqué sur `*`
- [ ] `dbMiddleware` appliqué sur `/api/*`
- [ ] `errorHandler` configuré via `app.onError()`
- [ ] Export par défaut de l'app

---

#### 2.2 Migrer la route health check

**Fichiers concernés :**
- `src/workers/routes/health.ts` (création)

**Description :**
Route `GET /api/health` retournant `{ status: 'ok' }`.

**Critères de validation :**
- [ ] Route `GET /` définie
- [ ] Retourne `c.json({ status: 'ok' })`
- [ ] Export nommé `healthRoute`

---

#### 2.3 Migrer les routes auth (better-auth)

**Fichiers concernés :**
- `src/workers/routes/auth.ts` (création)

**Description :**
Intégration de better-auth comme handler Hono sur `/api/auth/*`. Déléguer toutes les requêtes au handler better-auth existant.

**Critères de validation :**
- [ ] Route `all('/*', ...)` pour capturer toutes les méthodes et paths
- [ ] Passe `c.req.raw` au handler better-auth
- [ ] Retourne la réponse de better-auth
- [ ] Export nommé `authRoutes`

---

### Phase 3 : Migration des routes groups

#### 3.1 Créer le router groups principal

**Fichiers concernés :**
- `src/workers/routes/groups/index.ts` (création)

**Description :**
Router Hono pour `/api/groups` avec les routes de premier niveau (list, create) et composition des sous-routers.

**Critères de validation :**
- [ ] Middleware `authMiddleware` appliqué sur `*`
- [ ] `GET /` → liste des groupes de l'utilisateur
- [ ] `POST /` → création de groupe avec validation Zod
- [ ] Sous-router `/:id` avec `membershipMiddleware`
- [ ] Export nommé `groupsRoutes`

---

#### 3.2 Migrer les routes group par ID

**Fichiers concernés :**
- `src/workers/routes/groups/index.ts` (modification)

**Description :**
Routes pour un groupe spécifique : get, update, delete, archive, leave.

**Critères de validation :**
- [ ] `GET /:id` → détails du groupe
- [ ] `PATCH /:id` → mise à jour avec validation Zod
- [ ] `DELETE /:id` → suppression du groupe
- [ ] `POST /:id/archive` → toggle archive
- [ ] `POST /:id/leave` → quitter le groupe
- [ ] Réutilise les handlers de `groups.ts`

---

#### 3.3 Migrer les routes invitations de groupe

**Fichiers concernés :**
- `src/workers/routes/groups/invitations.ts` (création)

**Description :**
Routes pour gérer les invitations depuis un groupe : create, list, cancel, resend.

**Critères de validation :**
- [ ] `POST /:id/invite` → envoyer invitation
- [ ] `GET /:id/invitations` → liste invitations en attente
- [ ] `DELETE /:id/invitations/:invitationId` → annuler invitation
- [ ] `POST /:id/invitations/:invitationId/resend` → renvoyer invitation
- [ ] Réutilise les handlers de `groups.ts` (lignes 340-450)

---

#### 3.4 Migrer les routes members

**Fichiers concernés :**
- `src/workers/routes/groups/members.ts` (création)

**Description :**
Router pour `/api/groups/:id/members`. Extraire la logique de `members-handlers.ts`.

**Critères de validation :**
- [ ] `GET /` → liste des membres
- [ ] `GET /me` → membership de l'utilisateur courant
- [ ] `GET /:memberId` → détails d'un membre
- [ ] `PATCH /me` → mise à jour de son propre membership
- [ ] `PATCH /:memberId` → mise à jour d'un membre
- [ ] `DELETE /:memberId` → retirer un membre
- [ ] Export nommé `membersRoutes`

---

#### 3.5 Migrer les routes expenses

**Fichiers concernés :**
- `src/workers/routes/groups/expenses.ts` (création)

**Description :**
Router pour `/api/groups/:id/expenses`. Fichier le plus complexe (572 lignes de handlers).

**Critères de validation :**
- [ ] `GET /` → liste paginée avec filtres (query params validés par Zod)
- [ ] `POST /` → création dépense avec validation participants
- [ ] `GET /:expenseId` → détails dépense
- [ ] `PATCH /:expenseId` → mise à jour dépense
- [ ] `DELETE /:expenseId` → suppression dépense
- [ ] Réutilise `expenses-handlers.ts` sans modification de logique
- [ ] Export nommé `expensesRoutes`

---

#### 3.6 Migrer les routes balances

**Fichiers concernés :**
- `src/workers/routes/groups/balances.ts` (création)

**Description :**
Router pour `/api/groups/:id/balances`.

**Critères de validation :**
- [ ] `GET /` → toutes les balances du groupe
- [ ] `GET /me` → détail balance de l'utilisateur courant
- [ ] Réutilise `balances-handlers.ts`
- [ ] Export nommé `balancesRoutes`

---

#### 3.7 Migrer les routes settlements

**Fichiers concernés :**
- `src/workers/routes/groups/settlements.ts` (création)

**Description :**
Router pour `/api/groups/:id/settlements`.

**Critères de validation :**
- [ ] `GET /` → liste paginée des règlements
- [ ] `POST /` → création règlement
- [ ] `DELETE /:settlementId` → suppression règlement
- [ ] `GET /suggested` → suggestions optimisées
- [ ] Réutilise `settlements-handlers.ts`
- [ ] Export nommé `settlementsRoutes`

---

#### 3.8 Migrer les routes stats

**Fichiers concernés :**
- `src/workers/routes/groups/stats.ts` (création)

**Description :**
Router pour `/api/groups/:id/stats`.

**Critères de validation :**
- [ ] `GET /` → statistiques du groupe (query param `period`)
- [ ] Réutilise la logique existante de `groups.ts`
- [ ] Export nommé `statsRoutes`

---

### Phase 4 : Migration des routes invitations publiques

#### 4.1 Migrer les routes invitations publiques

**Fichiers concernés :**
- `src/workers/routes/invitations.ts` (création)

**Description :**
Routes publiques pour accepter une invitation via token.

**Critères de validation :**
- [ ] `GET /:token` → détails invitation (sans auth)
- [ ] `POST /:token/accept` → accepter invitation (avec auth)
- [ ] Réutilise `invitations.ts` existant
- [ ] Export nommé `invitationsRoutes`

---

### Phase 5 : Intégration et finalisation

#### 5.1 Assembler toutes les routes dans app.ts

**Fichiers concernés :**
- `src/workers/app.ts` (modification)

**Description :**
Connecter tous les routers créés à l'application principale.

**Critères de validation :**
- [ ] `app.route('/api/health', healthRoute)`
- [ ] `app.route('/api/auth', authRoutes)`
- [ ] `app.route('/api/groups', groupsRoutes)`
- [ ] `app.route('/api/invitations', invitationsRoutes)`

---

#### 5.2 Mettre à jour le point d'entrée worker

**Fichiers concernés :**
- `src/workers/index.ts` (modification)

**Description :**
Remplacer le contenu par un simple export de l'app Hono.

**Critères de validation :**
- [ ] `export default app` depuis `./app`
- [ ] Ancien code supprimé
- [ ] Worker démarre correctement avec `pnpm worker:dev`

---

#### 5.3 Tests de non-régression

**Fichiers concernés :**
- Tous les endpoints

**Description :**
Tester manuellement chaque endpoint pour valider la compatibilité.

**Critères de validation :**
- [ ] `GET /api/health` → `{ status: 'ok' }`
- [ ] Flow auth magic link fonctionnel
- [ ] CRUD groupes opérationnel
- [ ] Gestion membres fonctionnelle
- [ ] CRUD dépenses avec pagination
- [ ] Calcul balances correct
- [ ] CRUD settlements avec suggestions
- [ ] Invitations email + acceptation
- [ ] CORS fonctionne depuis le frontend

---

### Phase 6 : Nettoyage

#### 6.1 Supprimer l'ancien code

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (suppression)
- `src/workers/api/routes/invitations.ts` (suppression)
- `src/workers/api/routes/balances-handlers.ts` (suppression)
- `src/workers/api/routes/expenses-handlers.ts` (suppression)
- `src/workers/api/routes/members-handlers.ts` (suppression)
- `src/workers/api/routes/settlements-handlers.ts` (suppression)

**Description :**
Supprimer les fichiers de routing manuel obsolètes après validation complète.

**Critères de validation :**
- [ ] Dossier `src/workers/api/routes/` supprimé
- [ ] Aucune référence aux anciens fichiers dans le code
- [ ] Application fonctionne toujours

---

#### 6.2 Réorganiser les utilitaires

**Fichiers concernés :**
- `src/workers/api/utils/*` → `src/workers/utils/*` (déplacement)

**Description :**
Déplacer les utilitaires vers la nouvelle structure.

**Critères de validation :**
- [ ] `balance-calculation.ts` déplacé
- [ ] `share-calculation.ts` déplacé
- [ ] `optimize-settlements.ts` déplacé
- [ ] `sql-helpers.ts` déplacé
- [ ] `email.ts` déplacé
- [ ] Imports mis à jour dans les routes
- [ ] Dossier `src/workers/api/` supprimé

---

## Résumé des tâches

| Phase | Tâches | Fichiers créés | Fichiers modifiés | Fichiers supprimés |
|-------|--------|----------------|-------------------|-------------------|
| 1. Infrastructure | 7 | 5 | 1 | 0 |
| 2. Routes simples | 3 | 3 | 0 | 0 |
| 3. Routes groups | 8 | 7 | 1 | 0 |
| 4. Invitations | 1 | 1 | 0 | 0 |
| 5. Intégration | 3 | 0 | 2 | 0 |
| 6. Nettoyage | 2 | 0 | 5 | 8 |
| **Total** | **24** | **16** | **9** | **8** |

### Ordre d'exécution recommandé

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7
                    ↓
              2.1 → 2.2 → 2.3
                    ↓
        3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8
                    ↓
                   4.1
                    ↓
              5.1 → 5.2 → 5.3
                    ↓
              6.1 → 6.2
```

Les tâches 3.3 à 3.8 peuvent être parallélisées une fois 3.1 et 3.2 terminées.
