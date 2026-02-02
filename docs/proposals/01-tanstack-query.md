# Refactoring de la couche API avec TanStack Query

## Table des matières

1. [Contexte](#contexte)
2. [Objectifs](#objectifs)
3. [Solution proposée](#solution-proposée)
4. [Configuration initiale](#configuration-initiale)
5. [Query Key Factory Pattern](#query-key-factory-pattern)
6. [Matrice d'invalidation de cache](#matrice-dinvalidation-de-cache)
7. [Migration fichier par fichier](#migration-fichier-par-fichier)
8. [Ordre de migration](#ordre-de-migration)
9. [Risques et mitigations](#risques-et-mitigations)
10. [Estimation de complexité](#estimation-de-complexité)

---

## Contexte

### État actuel du codebase

La couche API repose sur trois piliers :

| Composant | Fichier | Rôle |
|-----------|---------|------|
| Fonctions fetch | `/src/lib/api.ts` | `fetchApi`, `fetchWithAuth` |
| Hook générique | `/src/shared/hooks/useFetch.ts` | Gestion loading/error/data |
| Hooks features | `/src/features/*/hooks/*.ts` | Logique métier par domaine |

**Architecture actuelle :**
```
Composant → useGroups() → useFetch() → groupsApi.list() → fetchWithAuth()
```

### Types de hooks identifiés

| Type | Hooks | Particularités |
|------|-------|----------------|
| **Query simple** | `useGroup`, `useBalances`, `useBalanceDetail`, `useGroupStats` | Utilise `useFetch` directement |
| **Query + mutations** | `useGroups`, `useMembers`, `useExpense`, `useSettlement` | Combine fetch + actions CRUD |
| **Pagination infinie** | `useExpenses`, `useSettlements` | Gestion manuelle du cursor et loadMore |

### Problèmes identifiés

1. **Pas de cache global** : Chaque composant déclenche une nouvelle requête
2. **Gestion manuelle complexe** : `useExpenses` et `useSettlements` font ~100 lignes chacun
3. **Pas de retry automatique** : Erreur réseau = refresh manuel
4. **Invalidation manuelle** : Créer une dépense → penser à rafraîchir les balances
5. **Pas de background refetch** : Données stagnantes si l'utilisateur reste longtemps

---

## Objectifs

### Améliorations attendues

- **Cache intelligent** : Éviter les requêtes réseau redondantes
- **Invalidation automatique** : Mise à jour des données liées après mutation
- **Retry automatique** : Résilience aux erreurs réseau temporaires
- **Optimistic updates** : UX fluide pour les mutations
- **DevTools** : Debugging facilité du cache et des requêtes
- **Code simplifié** : Suppression de ~500 lignes de code boilerplate

### Métriques de succès

- Réduction de 50% des requêtes réseau redondantes
- Suppression du hook `useFetch`
- Temps de réponse perçu amélioré grâce au cache

---

## Solution proposée

### TanStack Query (React Query v5)

**Pourquoi TanStack Query :**
- Standard de facto (10M+ téléchargements/semaine)
- API simple et déclarative
- DevTools intégrés
- Excellent support TypeScript
- Gestion native de la pagination infinie

**Alternatives écartées :**
- **SWR** : Moins de fonctionnalités (pas d'invalidation fine)
- **RTK Query** : Overhead Redux non justifié
- **Apollo Client** : Conçu pour GraphQL

### Architecture cible

```
src/
├── lib/
│   ├── api.ts                    # Inchangé
│   ├── query-client.ts           # Configuration TanStack Query (NEW)
│   ├── query-keys.ts             # Factory de query keys (NEW)
│   ├── query-invalidations.ts    # Fonctions d'invalidation (NEW)
│   └── api-error.ts              # Utilitaires erreurs (NEW)
├── features/
│   └── {feature}/
│       └── hooks/
│           └── use*.ts           # Hooks migrés vers useQuery/useMutation
└── App.tsx                       # QueryClientProvider
```

---

## Configuration initiale

### Installation

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

### Fichier : `/src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetch on window focus (better mobile UX)
      refetchOnWindowFocus: false,
      // Retry once on error
      retry: 1,
      // Data considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache kept for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
```

### Fichier : `/src/lib/api-error.ts`

```typescript
/**
 * Throws if the API result contains an error.
 * Compatible with the existing { error: string } pattern.
 */
export function throwIfError<T>(result: T | { error: string }): T {
  if (result !== null && typeof result === 'object' && 'error' in result) {
    throw new Error((result as { error: string }).error);
  }
  return result as T;
}

/**
 * Extracts error message from a TanStack Query error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'UNKNOWN_ERROR';
}
```

### Modification : `/src/App.tsx`

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@/routes';
import { queryClient } from '@/lib/query-client';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

const router = createBrowserRouter([...routes]);

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
```

---

## Query Key Factory Pattern

### Fichier : `/src/lib/query-keys.ts`

```typescript
/**
 * Query Key Factory - Centralized cache keys for TanStack Query.
 *
 * Naming convention:
 * - Level 1: Feature (groups, expenses, etc.)
 * - Level 2: Scope (all, detail, list)
 * - Level 3+: Parameters (groupId, expenseId, filters)
 */

import type { ExpenseFilters } from '@/features/expenses/types';
import type { SettlementFilter } from '@/features/settlements/types';
import type { StatsPeriod } from '@/features/balances/types';

export const queryKeys = {
  // Groups
  groups: {
    all: ['groups'] as const,
    list: () => [...queryKeys.groups.all, 'list'] as const,
    detail: (groupId: string) => [...queryKeys.groups.all, 'detail', groupId] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    byGroup: (groupId: string) => [...queryKeys.members.all, 'group', groupId] as const,
    list: (groupId: string) => [...queryKeys.members.byGroup(groupId), 'list'] as const,
  },

  // Expenses
  expenses: {
    all: ['expenses'] as const,
    byGroup: (groupId: string) => [...queryKeys.expenses.all, 'group', groupId] as const,
    infinite: (groupId: string, filters?: ExpenseFilters) =>
      [...queryKeys.expenses.byGroup(groupId), 'infinite', filters ?? {}] as const,
    detail: (groupId: string, expenseId: string) =>
      [...queryKeys.expenses.byGroup(groupId), 'detail', expenseId] as const,
  },

  // Balances
  balances: {
    all: ['balances'] as const,
    byGroup: (groupId: string) => [...queryKeys.balances.all, 'group', groupId] as const,
    list: (groupId: string) => [...queryKeys.balances.byGroup(groupId), 'list'] as const,
    myDetail: (groupId: string) => [...queryKeys.balances.byGroup(groupId), 'me'] as const,
    stats: (groupId: string, period?: StatsPeriod) =>
      [...queryKeys.balances.byGroup(groupId), 'stats', period ?? 'all'] as const,
  },

  // Settlements
  settlements: {
    all: ['settlements'] as const,
    byGroup: (groupId: string) => [...queryKeys.settlements.all, 'group', groupId] as const,
    infinite: (groupId: string, filter?: SettlementFilter) =>
      [...queryKeys.settlements.byGroup(groupId), 'infinite', filter ?? 'all'] as const,
    suggestions: (groupId: string) =>
      [...queryKeys.settlements.byGroup(groupId), 'suggestions'] as const,
  },
} as const;
```

### Hiérarchie des Query Keys

```
['groups']
├── ['groups', 'list']
└── ['groups', 'detail', groupId]

['members']
└── ['members', 'group', groupId]
    └── ['members', 'group', groupId, 'list']

['expenses']
└── ['expenses', 'group', groupId]
    ├── ['expenses', 'group', groupId, 'infinite', filters]
    └── ['expenses', 'group', groupId, 'detail', expenseId]

['balances']
└── ['balances', 'group', groupId]
    ├── ['balances', 'group', groupId, 'list']
    ├── ['balances', 'group', groupId, 'me']
    └── ['balances', 'group', groupId, 'stats', period]

['settlements']
└── ['settlements', 'group', groupId]
    ├── ['settlements', 'group', groupId, 'infinite', filter]
    └── ['settlements', 'group', groupId, 'suggestions']
```

---

## Matrice d'invalidation de cache

### Tableau des invalidations

| Mutation | Queries à invalider | Raison |
|----------|---------------------|--------|
| **createGroup** | `groups.list()` | Nouvelle entrée dans la liste |
| **updateGroup** | `groups.detail(id)`, `groups.list()` | Nom/description change |
| **archiveGroup** | `groups.detail(id)`, `groups.list()` | Statut archive change |
| **deleteGroup** | `groups.all` | Groupe supprimé partout |
| **leaveGroup** | `groups.all` | L'utilisateur n'a plus accès |
| **updateMember** | `members.list(gId)`, `balances.byGroup(gId)` | Coefficient change les soldes |
| **removeMember** | `members.list(gId)`, `balances.byGroup(gId)`, `groups.detail(gId)` | Nombre de membres change |
| **createExpense** | `expenses.byGroup(gId)`, `balances.byGroup(gId)`, `groups.list()` | Nouveaux soldes, myBalance |
| **updateExpense** | `expenses.detail(gId, eId)`, `expenses.byGroup(gId)`, `balances.byGroup(gId)` | Montants changés |
| **deleteExpense** | `expenses.byGroup(gId)`, `balances.byGroup(gId)`, `groups.list()` | Soldes recalculés |
| **createSettlement** | `settlements.byGroup(gId)`, `balances.byGroup(gId)`, `groups.list()` | Nouveaux soldes nets |
| **deleteSettlement** | `settlements.byGroup(gId)`, `balances.byGroup(gId)`, `groups.list()` | Soldes nets changés |

### Fichier : `/src/lib/query-invalidations.ts`

```typescript
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Centralized cache invalidation functions for mutations.
 * Ensures cache consistency after each mutation.
 */
export const invalidations = {
  // Groups
  afterGroupCreate: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupUpdate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupArchive: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterGroupDelete: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  },

  afterGroupLeave: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  },

  // Members
  afterMemberUpdate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
  },

  afterMemberRemove: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members.list(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
  },

  // Expenses
  afterExpenseCreate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseUpdate: (queryClient: QueryClient, groupId: string, expenseId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(groupId, expenseId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterExpenseDelete: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  // Settlements
  afterSettlementCreate: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },

  afterSettlementDelete: (queryClient: QueryClient, groupId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settlements.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances.byGroup(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.list() });
  },
};
```

---

## Migration fichier par fichier

### 1. `useGroups.ts` - Query + Mutation

**AVANT (43 lignes)**
```typescript
export const useGroups = (): UseGroupsResult => {
  const { data, isLoading, error, refetch } = useFetch<GroupListItem[], GroupError>(
    () => groupsApi.list(),
    [],
  );

  const createGroup = useCallback(
    async (formData: CreateGroupFormData): Promise<GroupResult<{ id: string }>> => {
      try {
        const result = await groupsApi.create(formData);
        if ('error' in result) {
          return { success: false, error: result.error as GroupError };
        }
        await refetch();
        return { success: true, data: result };
      } catch {
        return { success: false, error: 'UNKNOWN_ERROR' };
      }
    },
    [refetch],
  );

  return { groups: data ?? [], isLoading, error, createGroup, refresh: refetch };
};
```

**APRÈS (35 lignes)**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { invalidations } from '@/lib/query-invalidations';
import { throwIfError, getErrorMessage } from '@/lib/api-error';

export const useGroups = (): UseGroupsResult => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.groups.list(),
    queryFn: async () => throwIfError(await groupsApi.list()),
  });

  const createMutation = useMutation({
    mutationFn: async (formData: CreateGroupFormData) =>
      throwIfError(await groupsApi.create(formData)),
    onSuccess: () => invalidations.afterGroupCreate(queryClient),
  });

  const createGroup = async (formData: CreateGroupFormData): Promise<GroupResult<{ id: string }>> => {
    try {
      const result = await createMutation.mutateAsync(formData);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) as GroupError };
    }
  };

  return {
    groups: data ?? [],
    isLoading,
    error: error ? (getErrorMessage(error) as GroupError) : null,
    createGroup,
    refresh: async () => { await refetch(); },
  };
};
```

### 2. `useExpenses.ts` - Pagination infinie

**AVANT (98 lignes)** - Gestion manuelle avec 7 useState

**APRÈS (45 lignes)**
```typescript
import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { throwIfError, getErrorMessage } from '@/lib/api-error';

export const useExpenses = (groupId: string): UseExpensesResult => {
  const [filters, setFiltersState] = useState<ExpenseFilters>({});

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.expenses.infinite(groupId, filters),
    queryFn: async ({ pageParam }) => {
      const result = await expensesApi.list(groupId, {
        ...filters,
        cursor: pageParam,
        limit: 20,
      });
      return throwIfError(result);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled: !!groupId,
  });

  const expenses = data?.pages.flatMap((page) => page.expenses) ?? [];

  return {
    expenses,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    error: error ? (getErrorMessage(error) as ExpenseError) : null,
    hasMore: hasNextPage ?? false,
    filters,
    setFilters: setFiltersState,
    loadMore: async () => { if (hasNextPage) await fetchNextPage(); },
    refresh: async () => { await refetch(); },
  };
};
```

### 3. `useBalances.ts` - Query simple

**AVANT**
```typescript
export const useBalances = (groupId: string): UseBalancesResult => {
  const { data, isLoading, error, refetch } = useFetch<BalancesResponse, BalanceError>(
    () => balancesApi.list(groupId),
    [groupId],
    { skip: !groupId },
  );
  // ...
};
```

**APRÈS**
```typescript
export const useBalances = (groupId: string): UseBalancesResult => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.balances.list(groupId),
    queryFn: async () => throwIfError(await balancesApi.list(groupId)),
    enabled: !!groupId,
  });
  // ... (reste identique)
};
```

---

## Ordre de migration

### Phase 1 - Infrastructure (0.5 jour)

| Tâche | Fichier |
|-------|---------|
| Installation | `package.json` |
| Configuration | `/src/lib/query-client.ts` |
| Query keys | `/src/lib/query-keys.ts` |
| Invalidations | `/src/lib/query-invalidations.ts` |
| Utilitaires erreurs | `/src/lib/api-error.ts` |
| Provider | `/src/App.tsx` |

### Phase 2 - Hooks simples (0.5 jour)

| Hook | Complexité | Changement |
|------|------------|------------|
| `useBalances.ts` | S | `useFetch` → `useQuery` |
| `useBalanceDetail.ts` | S | `useFetch` → `useQuery` |
| `useGroupStats.ts` | S | `useFetch` → `useQuery` |

### Phase 3 - Hooks avec mutations (1 jour)

| Hook | Complexité | Changement |
|------|------------|------------|
| `useGroups.ts` | M | + `useMutation` |
| `useGroup.ts` | M | 4 mutations (update, archive, leave, delete) |
| `useMembers.ts` | M | 2 mutations (update, remove) |
| `useExpense.ts` | M | 3 mutations (create, update, delete) |
| `useSettlement.ts` | M | 2 mutations (create, delete) |

### Phase 4 - Pagination infinie (0.5 jour)

| Hook | Complexité | Changement |
|------|------------|------------|
| `useExpenses.ts` | L | `useState` × 7 → `useInfiniteQuery` |
| `useSettlements.ts` | L | `useState` × 7 → `useInfiniteQuery` |

### Phase 5 - Nettoyage (0.5 jour)

| Tâche | Fichier |
|-------|---------|
| Supprimer | `/src/shared/hooks/useFetch.ts` |
| Mettre à jour | `/src/shared/hooks/index.ts` |
| Vérifier | Tous les imports |

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Régression fonctionnelle | Moyen | Migration fichier par fichier, tests manuels |
| Courbe d'apprentissage | Faible | TanStack Query bien documenté |
| Taille du bundle | Faible | ~12kB gzippé |
| Comportement de cache inattendu | Moyen | Configuration `staleTime` conservatrice |

### Stratégie de rollback

- Migration feature par feature = rollback indépendant
- Le hook `useFetch` reste disponible jusqu'à la fin
- Git permet de revenir à n'importe quel état

### Points d'attention

- **Gestion des erreurs** : S'assurer que `throwIfError` propage correctement
- **Authentification** : Les erreurs 401 doivent déclencher une déconnexion
- **Tests** : Wrapper les composants avec `QueryClientProvider`

---

## Estimation de complexité

| Critère | Évaluation |
|---------|------------|
| **Taille** | **M** (Medium) |
| **Durée** | 2-3 jours |
| **Fichiers impactés** | ~15 fichiers |
| **Breaking changes** | Aucun (interfaces préservées) |

### Dépendances avec autres chantiers

- **Aucune dépendance bloquante** : Peut être réalisé indépendamment
- **Facilite** : Future migration SSR, prefetching sur navigation
- **Prérequis pour** : Optimistic updates avancés

---

## Résumé des fichiers

### À créer

| Fichier | Description |
|---------|-------------|
| `/src/lib/query-client.ts` | Configuration QueryClient |
| `/src/lib/query-keys.ts` | Factory de query keys |
| `/src/lib/query-invalidations.ts` | Fonctions d'invalidation |
| `/src/lib/api-error.ts` | Utilitaires erreurs |

### À modifier

| Fichier | Changement |
|---------|------------|
| `/src/App.tsx` | Ajout QueryClientProvider |
| `/src/features/groups/hooks/useGroups.ts` | Migration complète |
| `/src/features/groups/hooks/useGroup.ts` | Migration complète |
| `/src/features/members/hooks/useMembers.ts` | Migration complète |
| `/src/features/expenses/hooks/useExpenses.ts` | → useInfiniteQuery |
| `/src/features/expenses/hooks/useExpense.ts` | Migration complète |
| `/src/features/balances/hooks/useBalances.ts` | Migration complète |
| `/src/features/balances/hooks/useBalanceDetail.ts` | Migration complète |
| `/src/features/balances/hooks/useGroupStats.ts` | Migration complète |
| `/src/features/settlements/hooks/useSettlements.ts` | → useInfiniteQuery |
| `/src/features/settlements/hooks/useSettlement.ts` | Migration complète |

### À supprimer

| Fichier | Raison |
|---------|--------|
| `/src/shared/hooks/useFetch.ts` | Remplacé par TanStack Query |
