# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FairCount is a shared expense management app with income-based fair splitting. Built as a mobile-first PWA with React frontend and Cloudflare Workers backend.

## Development Commands

```bash
# Frontend development (port 3000)
pnpm dev

# Backend/Worker development (port 8787)
pnpm worker:dev

# Lint and format
pnpm lint          # Check with Biome
pnpm lint:fix      # Auto-fix issues
pnpm check         # Lint + format with auto-fix

# Database
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Apply migrations to local D1
pnpm db:studio     # Open Drizzle Studio

# Build and deploy
pnpm build         # Build frontend
pnpm worker:deploy # Deploy to Cloudflare
```

**Development requires running both servers:**
- Terminal 1: `pnpm dev` (Vite dev server)
- Terminal 2: `pnpm worker:dev` (Cloudflare Worker)

**Mail testing:** Start Mailpit with `docker compose up -d`, access UI at http://localhost:8025

## Architecture

### Dual Server Architecture
- **Frontend:** Vite + React (port 3000), proxies `/api/*` to worker
- **Backend:** Cloudflare Worker (port 8787), handles all API routes
- **Database:** Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage:** Cloudflare R2 (not yet implemented)

### Feature-Based Organization
Features are self-contained modules in `src/features/`:
```
src/features/{feature}/
├── api/          # API client functions
├── components/   # React components
├── hooks/        # React hooks
├── types.ts      # TypeScript types
└── index.ts      # Public exports (barrel file)
```

Each feature exports through its `index.ts` barrel file. Import from the feature root:
```typescript
import { LoginPage, useAuth } from '@/features/auth';
```

### Path Aliases
- `@/*` → `./src/*`
- `@/features/*` → `./src/features/*`
- `@/shared/*` → `./src/shared/*`
- `@/db/*` → `./src/db/*`

### Backend Structure (Hono)
- `src/workers/app.ts` - Main Hono app, middleware globaux, montage des routes
- `src/workers/routes/` - Route handlers Hono
  - `groups/index.ts` - Routes groupes + sous-routeurs (members, expenses, balances, settlements, invitations, stats)
  - `auth.ts`, `user.ts`, `health.ts`, `invitations.ts` - Routes top-level
- `src/workers/middleware/` - Middleware Hono (auth, cors, db, error, membership)
- `src/workers/services/` - Logique métier et helpers SQL
- `src/lib/auth.ts` - better-auth server configuration
- `src/lib/auth-client.ts` - better-auth React client
- `src/db/schema/` - Drizzle schema definitions

### Authentication
Uses better-auth with magic link (email-only, no passwords):
- Server: `createAuth()` in `src/lib/auth.ts`
- Client: `authClient` exports from `src/lib/auth-client.ts`
- Session managed via cookies with 7-day expiry

### Database Schema
Located in `src/db/schema/`:
- `users.ts` - Users, sessions, accounts, verifications (better-auth tables)
- `groups.ts` - Groups and invitations
- `members.ts` - Group memberships with income coefficients
- `expenses.ts` - Expenses and participant shares
- `settlements.ts` - Reimbursement records

## Key Patterns

### Imports et Barrel Files
Les seuls barrel files (`index.ts`) autorisés sont ceux à la racine d'une feature. Pour les imports internes à une feature, utilise le chemin relatif direct.

N'exporte jamais tout le contenu d'une feature, seulement le nécessaire (composants page, hooks publics, types partagés) :
```typescript
// ✅ Bon - export sélectif dans src/features/auth/index.ts
export { LoginPage, ProfilePage } from './components';
export { useAuth } from './hooks';
export type { User } from './types';

// ❌ Mauvais - export wildcard
export * from './components';
export * from './hooks';
```

### Routes API (Hono)
Routes use Hono framework with typed middleware context:
```typescript
const groupsRoutes = new Hono<AppEnv>();
groupsRoutes.use('*', authMiddleware);

groupsRoutes.post('/', zValidator('json', createGroupSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const data = c.req.valid('json');
  // ...
  return c.json({ id: groupId }, 201);
});

// Sub-router with membership middleware for /:id routes
const groupRouter = new Hono<AppEnv>();
groupRouter.use('*', membershipMiddleware);
groupsRoutes.route('/:id', groupRouter);
```

### State Management (TanStack Query)
All data fetching uses TanStack Query:
- **Query keys**: Centralized in `src/lib/query-keys.ts` (hierarchy: feature > scope > params)
- **Invalidations**: Centralized in `src/lib/query-invalidations.ts`
- **Client**: Configured in `src/lib/query-client.ts`

### Form Validation (Zod + React Hook Form)
All forms use React Hook Form with Zod schemas:
- **Schemas**: `src/lib/schemas/` (auth, group, expense, income, settlement)
- **Integration**: `zodResolver` from `@hookform/resolvers/zod`
- **Form fields**: `FormField` component wrapping Ark UI Field

### Code Splitting
Route-based lazy loading for optimal bundle size:
- Landing page eagerly loaded
- All other pages use `React.lazy()` + `Suspense`
- Routes configured in `src/routes/index.tsx`

### API Type Safety
Database types are inferred from Drizzle schema and exported from `src/db/schema/index.ts`. Use these types for API contracts.

### Environment Variables
Worker secrets configured in `.dev.vars` (not committed). Required:
- `AUTH_SECRET` - Session encryption key
- `SMTP_*` - Mail server configuration

## Language

- **UI strings:** French (user-facing text, error messages, labels)
- **Code comments:** English
- **Variable/function names:** English
