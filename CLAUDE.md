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

### Backend Structure
- `src/workers/index.ts` - Main worker entry, routing
- `src/workers/api/routes/` - API route handlers
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

### Worker Route Handlers
Routes receive `{ db, auth, env }` context and return `Response`:
```typescript
export async function handleGroupsRoutes(
  request: Request,
  ctx: { db: Database; auth: Auth; env: Env }
): Promise<Response> {
  // Route handling
}
```

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
