# Stratégie de Tests Complète

## Contexte

### État actuel du codebase

L'infrastructure de test existe mais reste sous-utilisée :

- **Framework** : Vitest configuré dans `/vitest.config.ts`
- **Environnement** : jsdom pour la simulation DOM
- **Librairies** : `@testing-library/react` + `@testing-library/user-event`
- **Coverage** : Provider v8

### Tests existants

Seulement **7 tests de composants** dans `/src/shared/components/` :

| Fichier | Couverture |
|---------|-----------|
| `Button.test.tsx` | Variants, sizes, loading, disabled |
| `ErrorBoundary.test.tsx` | Capture d'erreurs |
| `ProtectedRoute.test.tsx` | Redirection auth |
| `LinkButton.test.tsx` | Rendu |
| `Loading.test.tsx` | États |
| `Spinner.test.tsx` | Rendu |
| `EmptyState.test.tsx` | Props |

### Lacunes identifiées

| Type de test | État actuel | Impact |
|--------------|-------------|--------|
| Tests de hooks | ❌ Aucun | Régression non détectée sur `useGroups`, `useExpenses`, etc. |
| Tests d'intégration API | ❌ Aucun | Contrats API non validés |
| Tests du worker | ❌ Aucun | Logique backend non testée |
| Tests E2E | ❌ Aucun | Parcours utilisateur non validés |
| Tests de composants features | ❌ Aucun | Seuls les composants shared sont testés |

## Objectifs

### Métriques cibles

| Phase | Couverture cible | Focus |
|-------|-----------------|-------|
| Phase 1 | 40% | Hooks critiques + API clients |
| Phase 2 | 70% | Worker + composants features |
| Phase 3 | 85% | E2E parcours critiques |

### Critères de succès

- 100% des hooks shared et features testés
- Tous les contrats API validés avec MSW
- CI/CD bloquant si tests échouent
- Temps d'exécution < 60s pour les tests unitaires

## Solution proposée

### Stack de test

| Outil | Usage | Justification |
|-------|-------|---------------|
| **Vitest** | Test runner | Déjà configuré, rapide, compatible Vite |
| **MSW** | Mock API | Interception réseau réaliste, portable |
| **@testing-library/react** | Tests composants | Déjà installé, best practices |
| **Miniflare** | Tests worker | Émulateur Cloudflare Workers local |

### Architecture cible

```
src/
├── test/
│   ├── setup.ts                    # Configuration globale (existant)
│   ├── mocks/
│   │   ├── handlers.ts             # MSW handlers
│   │   ├── server.ts               # MSW server setup
│   │   └── data/                   # Fixtures de test
│   │       ├── groups.ts
│   │       ├── expenses.ts
│   │       └── users.ts
│   └── utils/
│       ├── render.tsx              # Custom render avec providers
│       └── test-utils.ts           # Helpers réutilisables
├── shared/
│   ├── hooks/
│   │   └── useFetch.test.ts        # NOUVEAU
│   └── components/
│       └── *.test.tsx              # Existants
├── features/
│   └── {feature}/
│       ├── hooks/
│       │   └── *.test.ts           # NOUVEAU
│       ├── api/
│       │   └── *.test.ts           # NOUVEAU
│       └── components/
│           └── *.test.tsx          # NOUVEAU
└── workers/
    └── api/
        └── routes/
            └── *.test.ts           # NOUVEAU (avec Miniflare)
```

## Plan d'implémentation

### Phase 1 : Infrastructure MSW + Tests hooks (1-2 jours)

#### Étape 1.1 : Setup MSW

```bash
pnpm add -D msw
```

**Fichiers à créer :**

`/src/test/mocks/handlers.ts`
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Groups
  http.get('/api/groups', () => {
    return HttpResponse.json([
      { id: '1', name: 'Colocation', currency: 'EUR', memberCount: 3 },
      { id: '2', name: 'Vacances', currency: 'EUR', memberCount: 5 },
    ]);
  }),

  http.get('/api/groups/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Colocation',
      description: 'Appartement Paris',
      currency: 'EUR',
      members: [
        { id: 'm1', name: 'Alice', incomeCoefficient: 1.0 },
        { id: 'm2', name: 'Bob', incomeCoefficient: 0.8 },
      ],
    });
  }),

  http.post('/api/groups', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-id', ...body }, { status: 201 });
  }),

  // Expenses
  http.get('/api/groups/:groupId/expenses', () => {
    return HttpResponse.json({
      expenses: [
        {
          id: 'e1',
          description: 'Courses',
          amount: 5000,
          date: '2024-01-15',
          paidBy: { id: 'm1', name: 'Alice' },
        },
      ],
      hasMore: false,
      nextCursor: null,
    });
  }),

  // Auth
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({
      user: { id: 'u1', email: 'test@example.com', name: 'Test User' },
      session: { id: 's1', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
  }),
];
```

`/src/test/mocks/server.ts`
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Mise à jour `/src/test/setup.ts` :**
```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Étape 1.2 : Custom render utility

`/src/test/utils/render.tsx`
```typescript
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

interface WrapperProps {
  readonly children: ReactNode;
}

const AllProviders = ({ children }: WrapperProps) => {
  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

#### Étape 1.3 : Tests useFetch

`/src/shared/hooks/useFetch.test.ts`
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFetch } from './useFetch';

describe('useFetch', () => {
  it('should return loading state initially', () => {
    const { result } = renderHook(() =>
      useFetch(() => Promise.resolve({ data: 'test' })),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return data on successful fetch', async () => {
    const mockData = { id: '1', name: 'Test' };
    const { result } = renderHook(() =>
      useFetch(() => Promise.resolve(mockData)),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should return error on failed fetch', async () => {
    const { result } = renderHook(() =>
      useFetch(() => Promise.resolve({ error: 'NOT_FOUND' })),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('NOT_FOUND');
    expect(result.current.data).toBeNull();
  });

  it('should refetch when deps change', async () => {
    let fetchCount = 0;
    const { result, rerender } = renderHook(
      ({ id }) =>
        useFetch(() => {
          fetchCount++;
          return Promise.resolve({ id });
        }, [id]),
      { initialProps: { id: '1' } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchCount).toBe(1);

    rerender({ id: '2' });

    await waitFor(() => expect(fetchCount).toBe(2));
  });
});
```

### Phase 2 : Tests des hooks features (2-3 jours)

#### Tests useGroups

`/src/features/groups/hooks/useGroups.test.ts`
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useGroups } from './useGroups';

describe('useGroups', () => {
  it('should fetch groups list', async () => {
    const { result } = renderHook(() => useGroups());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.groups[0].name).toBe('Colocation');
  });

  it('should handle API error', async () => {
    server.use(
      http.get('/api/groups', () => {
        return HttpResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      }),
    );

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('UNAUTHORIZED');
    expect(result.current.groups).toEqual([]);
  });

  it('should create a group successfully', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const createResult = await result.current.createGroup({
      name: 'New Group',
      currency: 'EUR',
    });

    expect(createResult.success).toBe(true);
    expect(createResult.data?.id).toBe('new-id');
  });
});
```

#### Tests useExpenses (avec pagination)

`/src/features/expenses/hooks/useExpenses.test.ts`
```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useExpenses } from './useExpenses';

describe('useExpenses', () => {
  const groupId = 'group-1';

  it('should fetch expenses for a group', async () => {
    const { result } = renderHook(() => useExpenses(groupId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.expenses).toHaveLength(1);
    expect(result.current.expenses[0].description).toBe('Courses');
  });

  it('should load more expenses when hasMore is true', async () => {
    server.use(
      http.get('/api/groups/:groupId/expenses', ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');

        if (!cursor) {
          return HttpResponse.json({
            expenses: [{ id: 'e1', description: 'First' }],
            hasMore: true,
            nextCursor: 'cursor-1',
          });
        }

        return HttpResponse.json({
          expenses: [{ id: 'e2', description: 'Second' }],
          hasMore: false,
          nextCursor: null,
        });
      }),
    );

    const { result } = renderHook(() => useExpenses(groupId));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);
    expect(result.current.expenses).toHaveLength(1);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(2);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('should apply filters and refetch', async () => {
    let lastPaidBy: string | null = null;

    server.use(
      http.get('/api/groups/:groupId/expenses', ({ request }) => {
        const url = new URL(request.url);
        lastPaidBy = url.searchParams.get('paidBy');
        return HttpResponse.json({ expenses: [], hasMore: false, nextCursor: null });
      }),
    );

    const { result } = renderHook(() => useExpenses(groupId));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({ paidBy: 'member-1' });
    });

    await waitFor(() => {
      expect(lastPaidBy).toBe('member-1');
    });
  });
});
```

#### Tests useAuth

`/src/features/auth/hooks/useAuth.test.ts`
```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should return authenticated user', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return null user when not authenticated', async () => {
    server.use(
      http.get('/api/auth/get-session', () => {
        return HttpResponse.json(null);
      }),
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

### Phase 3 : Tests d'intégration API (1-2 jours)

`/src/features/groups/api/index.test.ts`
```typescript
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { groupsApi } from './index';

describe('groupsApi', () => {
  describe('list', () => {
    it('should return groups array on success', async () => {
      const result = await groupsApi.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return error object on failure', async () => {
      server.use(
        http.get('/api/groups', () => {
          return HttpResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
        }),
      );

      const result = await groupsApi.list();

      expect('error' in result).toBe(true);
      expect((result as { error: string }).error).toBe('UNAUTHORIZED');
    });
  });

  describe('create', () => {
    it('should create group and return id', async () => {
      const result = await groupsApi.create({
        name: 'Test Group',
        currency: 'EUR',
      });

      expect('id' in result).toBe(true);
      expect((result as { id: string }).id).toBe('new-id');
    });
  });

  describe('get', () => {
    it('should return group details', async () => {
      const result = await groupsApi.get('1');

      expect('name' in result).toBe(true);
      expect((result as { name: string }).name).toBe('Colocation');
    });

    it('should return error for non-existent group', async () => {
      server.use(
        http.get('/api/groups/:id', () => {
          return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        }),
      );

      const result = await groupsApi.get('invalid');

      expect('error' in result).toBe(true);
    });
  });
});
```

### Phase 4 : Tests du Worker (optionnel, 3-5 jours)

Tests avec Miniflare pour le backend Cloudflare Workers.

```bash
pnpm add -D miniflare
```

`/src/workers/api/routes/groups.test.ts`
```typescript
import { Miniflare } from 'miniflare';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('Groups API', () => {
  let mf: Miniflare;

  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      scriptPath: './dist/worker.js',
      d1Databases: ['DB'],
    });
  });

  afterAll(async () => {
    await mf.dispose();
  });

  it('should return 401 for unauthenticated requests', async () => {
    const res = await mf.dispatchFetch('http://localhost/api/groups');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
  });

  // Tests avec authentification mockée...
});
```

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Tests flaky | Moyen | Utiliser `waitFor` systématiquement, éviter les timeouts fixes |
| Divergence mocks/API réelle | Élevé | Générer les types MSW depuis les types API |
| Maintenance lourde | Moyen | Factoriser les fixtures, utiliser des factories |
| Temps d'exécution | Faible | Parallélisation Vitest, cache des dépendances |
| Couverture illusoire | Moyen | Viser les chemins critiques, pas les métriques |

### Stratégie de rollback

- Les tests n'impactent pas le code de production
- Suppression possible sans régression fonctionnelle
- CI configurable pour ne pas bloquer en cas de problème

## Estimation de complexité

| Phase | Complexité | Effort | Priorité |
|-------|------------|--------|----------|
| Phase 1 (MSW + useFetch) | S | 1-2 jours | P0 |
| Phase 2 (Hooks features) | M | 2-3 jours | P0 |
| Phase 3 (API clients) | S | 1-2 jours | P1 |
| Phase 4 (Worker) | L | 3-5 jours | P2 |

**Taille globale : M (Medium)**

**Total estimé : 7-12 jours** (Phase 4 optionnelle)

### Dépendances avec autres chantiers

| Chantier | Relation |
|----------|----------|
| TanStack Query | Les tests devront être adaptés (QueryClientProvider dans render) |
| Zod + React Hook Form | Pas d'impact sur les tests de hooks |
| Hono migration | Phase 4 devra être mise à jour |

### Scripts à ajouter

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```
