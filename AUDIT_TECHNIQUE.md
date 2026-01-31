# Audit Technique - FairCount

Ce document présente une analyse complète du code de l'application FairCount, couvrant la pertinence algorithmique, la redondance, les imports, le wording, l'approche fonctionnelle/immutable et l'accessibilité.

---

## Table des matières

1. [Résumé exécutif](#résumé-exécutif)
2. [Pertinence algorithmique](#1-pertinence-algorithmique)
3. [Redondance de code](#2-redondance-de-code)
4. [Imports et organisation](#3-imports-et-organisation)
5. [Wording et conventions](#4-wording-et-conventions)
6. [Approche fonctionnelle et immutable](#5-approche-fonctionnelle-et-immutable)
7. [Accessibilité](#6-accessibilité)
8. [Recommandations prioritaires](#7-recommandations-prioritaires)

---

## Résumé exécutif

| Catégorie | État | Problèmes critiques | Problèmes moyens |
|-----------|------|---------------------|------------------|
| Algorithmique | 🟡 Moyen | 2 | 5 |
| Redondance | 🔴 À améliorer | 5 | 10 |
| Imports | 🟢 Bon | 0 | 2 |
| Wording | 🟢 Bon | 0 | 1 |
| Fonctionnel/Immutable | 🟡 Moyen | 3 | 5 |
| Accessibilité | 🟡 Moyen | 5 | 17 |

---

## 1. Pertinence algorithmique

### 1.1 ❌ CRITIQUE : Duplication du calcul des balances

**Fichiers concernés :**
- `src/workers/api/routes/balances-handlers.ts` (lignes 27-160)
- `src/workers/api/routes/settlements-handlers.ts` (lignes 27-156)

**Problème :** La logique de calcul des balances est implémentée **deux fois** avec un code quasi-identique :
1. Récupération des membres actifs avec coefficients
2. Initialisation des maps de balances
3. Traitement des dépenses et participants
4. Application des règlements
5. Calcul des soldes nets

**Impact :** Risque de désynchronisation, maintenance double, bugs potentiels si une version est modifiée sans l'autre.

**Solution recommandée :**
```typescript
// src/workers/api/utils/balance-calculation.ts
export async function calculateGroupBalances(ctx: RouteContext) {
  // Logique centralisée
}
```

---

### 1.2 ❌ CRITIQUE : Duplication de `calculateShares`

**Fichiers concernés :**
- `src/workers/api/utils/share-calculation.ts` (lignes 5-63) ✅ Version utilitaire
- `src/workers/api/routes/groups.ts` (lignes 48-95) ❌ Version dupliquée

**Problème :** La fonction de calcul des parts est réimplémentée dans `groups.ts` au lieu d'utiliser l'utilitaire existant.

**Solution :** Supprimer la version dans `groups.ts` et importer depuis `utils/share-calculation.ts`.

---

### 1.3 🟡 Pattern de pagination dupliqué

**Fichiers concernés :**
- `src/workers/api/routes/expenses-handlers.ts` (lignes 88-92)
- `src/workers/api/routes/settlements-handlers.ts` (lignes 177-182)

**Code dupliqué :**
```typescript
if (params.cursor) {
  const cursorDate = new Date(params.cursor);
  if (!Number.isNaN(cursorDate.getTime())) {
    conditions.push(lt(schema.expenses.createdAt, cursorDate));
  }
}
```

**Solution :** Extraire dans un utilitaire `buildCursorCondition()`.

---

### 1.4 🟡 Construction de clause SQL IN() répétée

**Fichiers concernés :** 5+ occurrences dans expenses-handlers, balances-handlers, settlements-handlers

**Pattern répété :**
```typescript
sql`${schema.table.column} IN (${sql.join(
  ids.map((id) => sql`${id}`),
  sql`, `,
)})`
```

**Solution :** Créer un helper `sqlInClause(column, ids)`.

---

### 1.5 🟡 Requête "membres actifs" répétée 15+ fois

**Pattern répété dans tous les handlers :**
```typescript
and(eq(schema.groupMembers.groupId, ctx.groupId), isNull(schema.groupMembers.leftAt))
```

**Solution :** Créer un helper `activeGroupMembersCondition(groupId)`.

---

## 2. Redondance de code

### 2.1 ❌ CRITIQUE : Types Result incohérents

**4 implémentations différentes :**

| Feature | Type | Pattern |
|---------|------|---------|
| `groups` | `GroupResult<T>` | Interface avec `error?` optionnel |
| `members` | `MemberResult<T>` | Interface avec `error?` optionnel |
| `expenses` | `ExpenseResult<T>` | Union discriminée |
| `settlements` | `SettlementResult<T>` | Union discriminée |

**Problème :** Incohérence de typage. L'union discriminée est plus type-safe.

**Solution recommandée :**
```typescript
// src/shared/types/result.ts
export type Result<T, E extends string> =
  | { readonly success: true; readonly data?: T }
  | { readonly success: false; readonly error: E };
```

---

### 2.2 ❌ CRITIQUE : Message UNKNOWN_ERROR dupliqué 6 fois

**Fichiers concernés :**
- `src/features/auth/types.ts`
- `src/features/groups/types.ts`
- `src/features/members/types.ts`
- `src/features/expenses/types.ts`
- `src/features/settlements/types.ts`
- `src/features/balances/types.ts`

**Texte identique :**
```typescript
UNKNOWN_ERROR: 'Une erreur est survenue',
```

**Solution :** Centraliser dans `src/shared/constants/errors.ts`.

---

### 2.3 ❌ CRITIQUE : Styles de formulaire dupliqués 18+ fois

**Pattern dupliqué dans 8+ fichiers de composants :**
```typescript
className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600
rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white
placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none
focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
```

**Fichiers concernés :**
- `LoginForm.tsx`, `ProfilePage.tsx`, `CreateGroupForm.tsx`, `GroupSettings.tsx`
- `InviteForm.tsx`, `SettlementForm.tsx`, `ExpenseForm.tsx`, `ExpenseFilters.tsx`

**Solution :** Créer un composant `TextInput` avec CVA variants :
```typescript
// src/shared/components/TextInput.tsx
export const TextInput = ({ className, ...props }) => (
  <input className={cn(inputVariants(), className)} {...props} />
);
```

---

### 2.4 ❌ CRITIQUE : Hooks fetch/state dupliqués (10 hooks)

**Pattern identique dans :**
- `useGroups.ts`, `useGroup.ts`, `useMembers.ts`, `useExpenses.ts`
- `useExpense.ts`, `useSettlements.ts`, `useSettlement.ts`
- `useBalances.ts`, `useBalanceDetail.ts`, `useGroupStats.ts`

**Code dupliqué :**
```typescript
const [data, setData] = useState(...);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

const fetch = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    const result = await api.fetch();
    // ...
  } catch {
    setError('UNKNOWN_ERROR');
  } finally {
    setIsLoading(false);
  }
}, []);

useEffect(() => { fetch(); }, [fetch]);
```

**Solution :** Créer un hook générique :
```typescript
// src/shared/hooks/useFetch.ts
export function useFetch<T, E>(fetcher: () => Promise<T>, deps: unknown[]) {
  // Logique centralisée
  return { data, isLoading, error, refetch };
}
```

---

### 2.5 🟡 Type `SettlementSummary` avec deux définitions différentes

**Fichiers concernés :**
- `src/features/balances/types.ts` (lignes 30-39) - Version légère pour détails de balance
- `src/features/settlements/types.ts` (lignes 10-27) - Version complète pour liste

**Problème :** Même nom, structures différentes, confusion à l'import.

**Solution :** Renommer en `BalanceSettlement` et `SettlementListItem`.

---

### 2.6 🟡 Validation email dupliquée

**Fichiers concernés :**
- `src/lib/validation.ts` ✅ Version centralisée
- `src/features/auth/components/LoginForm.tsx` ❌ Réimplémentation locale

**Solution :** `LoginForm.tsx` doit importer depuis `@/lib/validation`.

---

### 2.7 🟡 Spinners inline au lieu du composant partagé

**Fichiers concernés :**
- `LoginPage.tsx`, `ProfilePage.tsx`, `InvitePage.tsx`

**Pattern dupliqué :**
```typescript
<div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
```

**Solution :** Utiliser `<Spinner />` de `@/shared/components`.

---

### 2.8 🟡 Protection contre les race conditions absente dans certains hooks

**Hooks avec protection :** `useBalanceDetail`, `useBalances`, `useGroupStats`
**Hooks sans protection :** `useExpenses`, `useSettlements`, `useGroup`

**Solution :** Standardiser avec `useRef` pour annuler les requêtes obsolètes.

---

### 2.9 🟡 Sérialisation membre dupliquée

**Fichiers concernés :**
- `src/workers/api/routes/members-handlers.ts` (lignes 54-67)
- `src/workers/api/routes/groups.ts` (lignes 295-303)

**Solution :** Créer un helper `serializeMember()`.

---

## 3. Imports et organisation

### 3.1 ✅ Utilisation correcte des alias `@/`

Les imports utilisent correctement les alias de chemin :
- `@/shared/components/*`
- `@/shared/utils/*`
- `@/lib/*`
- `@/features/*/hooks/*` (cross-feature)

### 3.2 ✅ Imports relatifs corrects dans les features

Les imports internes aux features utilisent des chemins relatifs :
```typescript
import { useMembers } from '../hooks/useMembers';
import { groupsApi } from '../api';
import type { GroupListItem } from '../types';
```

### 3.3 ✅ Barrel files sélectifs

Les `index.ts` exportent uniquement le nécessaire :
```typescript
export { ExpenseCard } from './components/ExpenseCard';
export { useExpenses } from './hooks/useExpenses';
export type { ExpenseDetail as ExpenseDetailType } from './types';
```

### 3.4 🟡 Incohérence : constantes d'erreur avec `as const satisfies`

**Fichiers concernés :**
- `auth`, `groups`, `expenses`, `balances`, `members` : utilisent `as const satisfies` ✅
- `settlements` : utilise `Record<SettlementError, string>` ❌

**Solution :** Uniformiser vers `as const satisfies`.

---

## 4. Wording et conventions

### 4.1 ✅ Conventions respectées

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `GroupCard`, `ExpenseList` |
| Hooks | camelCase + use | `useExpenses`, `useMembers` |
| Types | PascalCase | `GroupListItem`, `ExpenseDetail` |
| Constantes | UPPER_SNAKE_CASE | `CURRENCIES`, `FILTER_LABELS` |
| API objects | camelCase + Api | `groupsApi`, `expensesApi` |
| Erreurs | UPPER_SNAKE_CASE | `INVALID_EMAIL`, `NOT_FOUND` |

### 4.2 🟡 Incohérence dans les codes d'erreur backend

**Patterns mixtes :**
```typescript
{ error: 'INVALID_NAME' }       // SNAKE_CASE ✅
{ error: 'Not found' }          // Phrase ❌
{ error: 'Unauthorized' }       // PascalCase ❌
```

**Solution :** Standardiser vers SNAKE_CASE pour tous les codes d'erreur.

---

## 5. Approche fonctionnelle et immutable

### 5.1 ❌ CRITIQUE : Mutations d'arrays avec `push()` et `shift()`

**Fichier :** `src/workers/api/utils/optimize-settlements.ts` (lignes 89-90)
```typescript
if (creditor.balance <= 0) creditors.shift();  // Mutation
if (debtor.balance <= 0) debtors.shift();      // Mutation
```

**Fichier :** `src/workers/api/routes/expenses-handlers.ts` (lignes 189-191)
```typescript
list.push({ memberId: p.memberId, customAmount: p.customAmount }); // Mutation
```

**Fichiers concernés :** 8+ emplacements (share-calculation.ts, expenses-handlers.ts, balances-handlers.ts, settlements-handlers.ts, groups.ts)

**Solution :**
```typescript
// Au lieu de push :
const newList = [...list, newItem];

// Au lieu de shift dans une boucle :
// Utiliser filter/slice ou itération par index
```

---

### 5.2 ❌ CRITIQUE : Accumulateurs `let` au lieu de `reduce()`

**Fichier :** `src/workers/api/routes/groups.ts` (lignes 86, 189-192, 214)
```typescript
let allocated = 0;
for (let i = 0; i < fairShareParticipants.length; i++) {
  allocated += share;  // Mutation de let
}
```

**Solution :**
```typescript
const allocated = fairShareParticipants.reduce((sum, p) => sum + calculateShare(p), 0);
```

---

### 5.3 🟡 Boucles `for` au lieu de méthodes fonctionnelles

**15+ emplacements** où des `for` loops pourraient être `map`/`filter`/`reduce` :

**Fichier :** `src/workers/api/routes/groups.ts`
- Lignes 144-148 : Construction de Map avec for loop
- Lignes 170-174 : Construction de participantsByExpense
- Lignes 362-368 : Construction de memberStats
- Lignes 385-392 : Construction de monthStats

**Exemple de refactoring :**
```typescript
// Avant
for (const m of allMembers) {
  const groupMap = membersByGroup.get(m.groupId) ?? new Map();
  groupMap.set(m.id, m.coefficient);
  membersByGroup.set(m.groupId, groupMap);
}

// Après
const membersByGroup = allMembers.reduce((acc, m) => {
  const groupMap = acc.get(m.groupId) ?? new Map();
  return acc.set(m.groupId, groupMap.set(m.id, m.coefficient));
}, new Map());
```

---

### 5.4 ✅ Points positifs

- **ErrorBoundary** : Utilisation appropriée de class component (obligatoire pour error boundaries)
- **Hooks React** : Dépendances correctes dans `useCallback`, `useMemo`, `useEffect`
- **State updates** : Pattern immutable avec spread operator dans les composants React
- **useInfiniteLoad** : Excellente implémentation avec cleanup et refs synchronisés

---

## 6. Accessibilité

### 6.1 ❌ CRITIQUE : Dialogs sans `aria-labelledby`

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseForm.tsx` (lignes 220-228)
- `src/shared/components/ConfirmDialog.tsx` (lignes 29-40)
- `src/features/members/components/IncomeForm.tsx` (lignes 50-54)

**Problème :** Les `Dialog.Root` ne référencent pas leur `Dialog.Title`.

**Solution :**
```tsx
<Dialog.Root aria-labelledby="dialog-title">
  <Dialog.Title id="dialog-title">Titre</Dialog.Title>
</Dialog.Root>
```

---

### 6.2 ❌ CRITIQUE : Boutons icône sans `aria-label`

**Fichier :** `src/features/settlements/components/SettlementCard.tsx` (lignes 58-66)

**Problème :** Le bouton de suppression n'a qu'un attribut `title`, insuffisant pour les lecteurs d'écran.

**Solution :**
```tsx
<button aria-label="Supprimer le règlement" title="Supprimer">
  <TrashIcon aria-hidden="true" />
</button>
```

---

### 6.3 ❌ CRITIQUE : Messages d'erreur non associés aux champs

**Fichiers concernés :**
- `src/features/auth/components/LoginForm.tsx` (lignes 99-101)
- `src/features/settlements/components/SettlementForm.tsx` (lignes 195-199)

**Problème :** Les messages d'erreur ne sont pas liés aux inputs via `aria-describedby`.

**Solution :**
```tsx
<input id="email" aria-describedby="email-error" />
{error && <p id="email-error" role="alert">{error}</p>}
```

---

### 6.4 ❌ CRITIQUE : Boutons de filtre sans sémantique tabs

**Fichier :** `src/features/settlements/components/SettlementHistory.tsx` (lignes 61-76)

**Problème :** Les boutons de filtre fonctionnent comme des tabs mais n'ont pas les rôles appropriés.

**Solution :**
```tsx
<div role="tablist">
  <button role="tab" aria-selected={active} aria-controls="panel-id">
    Filtre
  </button>
</div>
```

---

### 6.5 ❌ CRITIQUE : Checkboxes groupés sans fieldset/legend

**Fichier :** `src/features/expenses/components/ExpenseForm.tsx` (lignes 318-376)

**Problème :** La section "Participants" avec checkboxes n'est pas dans un fieldset.

**Solution :**
```tsx
<fieldset>
  <legend>Participants</legend>
  {participants.map(p => <Checkbox key={p.id} ... />)}
</fieldset>
```

---

### 6.6 🟡 Collapsibles sans `aria-expanded`

**Fichiers concernés :**
- `src/features/members/components/MemberCard.tsx` (lignes 16-49)
- `src/features/expenses/components/ExpenseFilters.tsx` (lignes 78-92)

**Problème :** Les triggers de Collapsible ne communiquent pas leur état.

---

### 6.7 🟡 Live regions manquantes ou mal configurées

**Fichiers concernés :**
- `src/shared/components/Loading.tsx` : Utilise `<output>` au lieu de `role="status"`
- `src/features/groups/components/InviteForm.tsx` : Message de succès sans `aria-live`

---

### 6.8 🟡 Contraste des couleurs à vérifier

**Fichiers concernés :**
- `src/shared/components/Button.tsx` : Variant `ghost` (blue-600)
- `src/features/settlements/components/SettlementCard.tsx` : Indicateurs colorés (↑↓→)
- `src/features/balances/components/BalanceCard.tsx` : Status colors (emerald/red/slate)

---

### 6.9 ✅ Bonnes pratiques observées

- SVG décoratifs avec `aria-hidden="true"`
- Labels de formulaires avec `htmlFor`
- Messages d'erreur avec `role="alert"` (partiellement)
- Boutons avec états `aria-busy` et `aria-disabled`
- Focus visible avec `focus:ring-2`

---

## 7. Recommandations prioritaires

### Priorité 1 - Critique (à traiter immédiatement)

| # | Action | Fichiers |
|---|--------|----------|
| 1 | Centraliser le calcul des balances | balances-handlers.ts, settlements-handlers.ts |
| 2 | Supprimer `calculateShares` dupliqué | groups.ts |
| 3 | Créer un type `Result<T, E>` partagé | Tous les types.ts |
| 4 | Créer composant `TextInput` partagé | 8+ fichiers de formulaires |
| 5 | Créer hook `useFetch<T, E>` générique | 10 hooks de features |
| 6 | Ajouter `aria-labelledby` aux dialogs | 3 composants |

### Priorité 2 - Important (semaine suivante)

| # | Action | Fichiers |
|---|--------|----------|
| 7 | Centraliser les messages d'erreur communs | Tous les types.ts |
| 8 | Remplacer mutations array par spread | 8+ emplacements backend |
| 9 | Remplacer `let` accumulateurs par `reduce` | groups.ts, balances-handlers.ts |
| 10 | Ajouter `aria-label` aux boutons icône | SettlementCard.tsx |
| 11 | Associer erreurs aux inputs (`aria-describedby`) | LoginForm.tsx, SettlementForm.tsx |
| 12 | Ajouter rôles tabs aux filtres | SettlementHistory.tsx |

### Priorité 3 - Amélioration (backlog)

| # | Action | Fichiers |
|---|--------|----------|
| 13 | Extraire helpers SQL (IN clause, cursor) | handlers |
| 14 | Créer helper `activeGroupMembersCondition` | Tous handlers |
| 15 | Standardiser codes d'erreur backend | Tous routes |
| 16 | Uniformiser `as const satisfies` | settlements/types.ts |
| 17 | Utiliser `<Spinner />` partagé | 3 fichiers |
| 18 | Ajouter protection race conditions | 3 hooks |
| 19 | Vérifier contraste couleurs WCAG | Composants UI |
| 20 | Remplacer for loops par map/filter/reduce | 15+ emplacements |

---

## Annexe : Fichiers analysés

### Frontend (57 fichiers TSX)
- `src/features/auth/components/` (4 fichiers)
- `src/features/groups/components/` (7 fichiers)
- `src/features/members/components/` (4 fichiers)
- `src/features/expenses/components/` (7 fichiers)
- `src/features/settlements/components/` (6 fichiers)
- `src/features/balances/components/` (4 fichiers)
- `src/shared/components/` (12 fichiers)

### Backend (12 fichiers)
- `src/workers/api/routes/` (6 fichiers)
- `src/workers/api/utils/` (3 fichiers)
- `src/db/schema/` (5 fichiers)

### Hooks (15 fichiers)
- `src/features/*/hooks/` (14 fichiers)
- `src/shared/hooks/` (1 fichier)

---

*Document généré le 1er février 2026*
