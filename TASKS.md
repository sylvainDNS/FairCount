# Tâches de refactoring technique - FairCount

Ce document liste les tâches de développement issues de l'audit technique, organisées par priorité et domaine.

---

## Sprint 1 - Infrastructure partagée (Priorité critique)

### 1. Créer le type Result générique partagé

**Fichiers concernés :**
- `src/shared/types/result.ts` (création)
- `src/features/groups/types.ts` (modification)
- `src/features/members/types.ts` (modification)
- `src/features/expenses/types.ts` (modification)
- `src/features/settlements/types.ts` (modification)

**Description :**
Créer un type `Result<T, E>` générique utilisant une union discriminée pour standardiser la gestion des erreurs dans toute l'application.

```typescript
// src/shared/types/result.ts
export type Result<T, E extends string = string> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export type AsyncResult<T, E extends string = string> = Promise<Result<T, E>>;
```

**Critères de validation :**
- [x] Type `Result<T, E>` créé dans `src/shared/types/result.ts`
- [x] Export depuis `src/shared/types/index.ts`
- [x] Remplacement des 4 types spécifiques (`GroupResult`, `MemberResult`, `ExpenseResult`, `SettlementResult`)
- [x] Typage TypeScript valide sans erreur

---

### 2. Centraliser les messages d'erreur communs

**Fichiers concernés :**
- `src/shared/constants/errors.ts` (création)
- `src/features/auth/types.ts` (modification)
- `src/features/groups/types.ts` (modification)
- `src/features/members/types.ts` (modification)
- `src/features/expenses/types.ts` (modification)
- `src/features/settlements/types.ts` (modification)
- `src/features/balances/types.ts` (modification)

**Description :**
Extraire les messages d'erreur communs (UNKNOWN_ERROR, etc.) dans un fichier partagé. Chaque feature importera les messages communs et définira uniquement ses messages spécifiques.

```typescript
// src/shared/constants/errors.ts
export const COMMON_ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'Une erreur est survenue',
  NETWORK_ERROR: 'Erreur de connexion',
  UNAUTHORIZED: 'Non autorisé',
} as const satisfies Record<string, string>;
```

**Critères de validation :**
- [ ] Fichier `src/shared/constants/errors.ts` créé
- [ ] Messages communs extraits (UNKNOWN_ERROR minimum)
- [ ] Features importent et étendent les messages communs
- [ ] Pattern `as const satisfies` utilisé partout (y compris settlements)

---

### 3. Créer le composant TextInput partagé

**Fichiers concernés :**
- `src/shared/components/TextInput.tsx` (création)
- `src/shared/components/index.ts` (modification)
- `src/features/auth/components/LoginForm.tsx` (modification)
- `src/features/auth/components/ProfilePage.tsx` (modification)
- `src/features/groups/components/CreateGroupForm.tsx` (modification)
- `src/features/groups/components/GroupSettings.tsx` (modification)
- `src/features/groups/components/InviteForm.tsx` (modification)
- `src/features/settlements/components/SettlementForm.tsx` (modification)
- `src/features/expenses/components/ExpenseForm.tsx` (modification)
- `src/features/expenses/components/ExpenseFilters.tsx` (modification)

**Description :**
Créer un composant `TextInput` réutilisable avec CVA pour les variants, remplaçant les 18+ occurrences de styles inline dupliqués.

```typescript
// src/shared/components/TextInput.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-blue-500',
        error: 'border-red-500 focus:ring-red-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

export const TextInput = ({ variant, className, ...props }: TextInputProps) => (
  <input className={cn(inputVariants({ variant }), className)} {...props} />
);
```

**Critères de validation :**
- [ ] Composant `TextInput` créé avec CVA variants
- [ ] Variants `default` et `error` implémentés
- [ ] Export depuis `src/shared/components/index.ts`
- [ ] Remplacement dans les 8+ fichiers de formulaires
- [ ] Suppression des styles inline dupliqués

---

### 4. Créer le hook useFetch générique

**Fichiers concernés :**
- `src/shared/hooks/useFetch.ts` (création)
- `src/shared/hooks/index.ts` (modification)
- `src/features/groups/hooks/useGroups.ts` (modification)
- `src/features/groups/hooks/useGroup.ts` (modification)
- `src/features/members/hooks/useMembers.ts` (modification)
- `src/features/expenses/hooks/useExpenses.ts` (modification)
- `src/features/expenses/hooks/useExpense.ts` (modification)
- `src/features/settlements/hooks/useSettlements.ts` (modification)
- `src/features/settlements/hooks/useSettlement.ts` (modification)
- `src/features/balances/hooks/useBalances.ts` (modification)
- `src/features/balances/hooks/useBalanceDetail.ts` (modification)
- `src/features/balances/hooks/useGroupStats.ts` (modification)

**Description :**
Créer un hook générique `useFetch<T, E>` qui encapsule le pattern répété dans 10 hooks : state management, loading, error handling, et protection contre les race conditions.

```typescript
// src/shared/hooks/useFetch.ts
export function useFetch<T, E extends string>(
  fetcher: () => Promise<{ data: T } | { error: E }>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<E | null>(null);
  const currentRequestRef = useRef(0);

  const fetch = useCallback(async () => {
    const requestId = ++currentRequestRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (requestId !== currentRequestRef.current) return;

      if ('error' in result) {
        setError(result.error);
      } else {
        setData(result.data);
      }
    } catch {
      if (requestId === currentRequestRef.current) {
        setError('UNKNOWN_ERROR' as E);
      }
    } finally {
      if (requestId === currentRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
```

**Critères de validation :**
- [ ] Hook `useFetch` créé avec protection race conditions
- [ ] Typage générique `<T, E>` pour data et error
- [ ] Export depuis `src/shared/hooks/index.ts`
- [ ] Refactoring des 10 hooks de features pour utiliser `useFetch`
- [ ] Suppression du code dupliqué dans chaque hook

---

## Sprint 2 - Backend : Centralisation algorithmique

### 5. Centraliser le calcul des balances

**Fichiers concernés :**
- `src/workers/api/utils/balance-calculation.ts` (création)
- `src/workers/api/routes/balances-handlers.ts` (modification)
- `src/workers/api/routes/settlements-handlers.ts` (modification)

**Description :**
Extraire la logique de calcul des balances (dupliquée entre `balances-handlers.ts` et `settlements-handlers.ts`) dans un utilitaire centralisé.

```typescript
// src/workers/api/utils/balance-calculation.ts
export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export async function calculateGroupBalances(
  ctx: RouteContext
): Promise<Map<string, MemberBalance>> {
  // 1. Récupérer membres actifs avec coefficients
  // 2. Initialiser map des balances
  // 3. Traiter les dépenses et participants
  // 4. Appliquer les règlements
  // 5. Calculer soldes nets
}
```

**Critères de validation :**
- [ ] Fonction `calculateGroupBalances` créée dans `utils/balance-calculation.ts`
- [ ] Interface `MemberBalance` exportée
- [ ] `listBalances` dans balances-handlers.ts utilise l'utilitaire
- [ ] `calculateNetBalances` dans settlements-handlers.ts supprimé et remplacé
- [ ] Aucune duplication de la logique de calcul

---

### 6. Supprimer la duplication de calculateShares

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (modification)

**Description :**
Supprimer la fonction `calculateShares` inline dans `groups.ts` (lignes 48-95) et importer depuis l'utilitaire existant `utils/share-calculation.ts`.

**Critères de validation :**
- [ ] Import de `calculateShares` depuis `@/workers/api/utils/share-calculation`
- [ ] Suppression de la fonction dupliquée (lignes 48-95)
- [ ] Tests manuels de la fonctionnalité de listing des groupes

---

### 7. Créer les helpers SQL réutilisables

**Fichiers concernés :**
- `src/workers/api/utils/sql-helpers.ts` (création)
- `src/workers/api/routes/expenses-handlers.ts` (modification)
- `src/workers/api/routes/balances-handlers.ts` (modification)
- `src/workers/api/routes/settlements-handlers.ts` (modification)

**Description :**
Créer des helpers SQL pour les patterns répétés : clause IN(), condition de pagination cursor, condition membres actifs.

```typescript
// src/workers/api/utils/sql-helpers.ts
import { sql, eq, isNull, and, lt } from 'drizzle-orm';
import * as schema from '@/db/schema';

// Clause IN() pour liste d'IDs
export function sqlInClause<T>(column: T, ids: string[]) {
  return sql`${column} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
}

// Condition de pagination par cursor date
export function buildCursorCondition<T>(column: T, cursor: string | undefined) {
  if (!cursor) return undefined;
  const cursorDate = new Date(cursor);
  if (Number.isNaN(cursorDate.getTime())) return undefined;
  return lt(column, cursorDate);
}

// Condition membres actifs d'un groupe
export function activeGroupMembersCondition(groupId: string) {
  return and(
    eq(schema.groupMembers.groupId, groupId),
    isNull(schema.groupMembers.leftAt)
  );
}
```

**Critères de validation :**
- [ ] Helper `sqlInClause` créé et utilisé (5+ remplacements)
- [ ] Helper `buildCursorCondition` créé et utilisé (2 remplacements)
- [ ] Helper `activeGroupMembersCondition` créé et utilisé (15+ remplacements)
- [ ] Suppression du code dupliqué dans les handlers

---

### 8. Standardiser les codes d'erreur backend

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (modification)
- `src/workers/api/routes/invitations.ts` (modification)
- `src/workers/api/routes/members-handlers.ts` (modification)
- `src/workers/api/routes/expenses-handlers.ts` (modification)
- `src/workers/api/routes/balances-handlers.ts` (modification)
- `src/workers/api/routes/settlements-handlers.ts` (modification)

**Description :**
Remplacer tous les codes d'erreur incohérents par le format SNAKE_CASE standardisé.

**Remplacements à effectuer :**
- `'Not found'` → `'NOT_FOUND'`
- `'Unauthorized'` → `'UNAUTHORIZED'`
- `'Internal server error'` → `'INTERNAL_ERROR'`

**Critères de validation :**
- [ ] Tous les codes d'erreur en SNAKE_CASE
- [ ] Cohérence avec les types d'erreur frontend
- [ ] Aucune phrase ou PascalCase restant

---

## Sprint 3 - Approche fonctionnelle

### 9. Remplacer les accumulateurs let par reduce

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (modification)
- `src/workers/api/routes/balances-handlers.ts` (modification)
- `src/workers/api/utils/share-calculation.ts` (modification)
- `src/workers/api/routes/settlements-handlers.ts` (modification)

**Description :**
Remplacer les patterns `let accumulated = 0; for(...) { accumulated += ... }` par des appels à `reduce()`.

**Exemple de refactoring :**
```typescript
// Avant
let totalPaid = 0;
let totalOwed = 0;
for (const e of expenses) {
  totalPaid += e.amount;
  totalOwed += e.share;
}

// Après
const { totalPaid, totalOwed } = expenses.reduce(
  (acc, e) => ({
    totalPaid: acc.totalPaid + e.amount,
    totalOwed: acc.totalOwed + e.share,
  }),
  { totalPaid: 0, totalOwed: 0 }
);
```

**Critères de validation :**
- [ ] Aucun `let` accumulateur dans une boucle
- [ ] Utilisation de `reduce()` pour les accumulations
- [ ] Code plus déclaratif et lisible

---

### 10. Remplacer les for loops par map/filter/reduce

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (modification - 6 emplacements)
- `src/workers/api/routes/expenses-handlers.ts` (modification)
- `src/workers/api/routes/balances-handlers.ts` (modification)
- `src/workers/api/routes/settlements-handlers.ts` (modification)

**Description :**
Refactorer les 15+ boucles `for` impératives en méthodes fonctionnelles (`map`, `filter`, `reduce`).

**Emplacements prioritaires dans groups.ts :**
- Lignes 144-148 : Construction de Map `membersByGroup`
- Lignes 170-174 : Construction de `participantsByExpense`
- Lignes 362-368 : Construction de `memberStats`
- Lignes 385-392 : Construction de `monthStats`

**Critères de validation :**
- [ ] Boucles for remplacées par méthodes fonctionnelles
- [ ] Code plus déclaratif
- [ ] Même comportement fonctionnel (tests manuels)

---

## Sprint 4 - Accessibilité

### 11. Ajouter aria-labelledby aux dialogs

**Fichiers concernés :**
- `src/shared/components/ConfirmDialog.tsx` (modification)
- `src/features/expenses/components/ExpenseForm.tsx` (modification)
- `src/features/members/components/IncomeForm.tsx` (modification)

**Description :**
Ajouter les attributs `aria-labelledby` sur les `Dialog.Root` pour associer correctement le titre aux lecteurs d'écran.

```tsx
// Pattern à appliquer
<Dialog.Root aria-labelledby="dialog-title-unique-id">
  <Dialog.Content>
    <Dialog.Title id="dialog-title-unique-id">Titre</Dialog.Title>
    {/* ... */}
  </Dialog.Content>
</Dialog.Root>
```

**Critères de validation :**
- [ ] Tous les Dialog.Root ont un `aria-labelledby`
- [ ] Tous les Dialog.Title ont un `id` correspondant
- [ ] IDs uniques par dialog

---

### 12. Ajouter aria-label aux boutons icône

**Fichiers concernés :**
- `src/features/settlements/components/SettlementCard.tsx` (modification)
- Autres boutons icône identifiés

**Description :**
Ajouter des `aria-label` explicites sur tous les boutons ne contenant qu'une icône.

```tsx
// Pattern à appliquer
<button
  aria-label="Supprimer le règlement"
  title="Supprimer"
  onClick={onDelete}
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Critères de validation :**
- [ ] Tous les boutons icône ont un `aria-label`
- [ ] Les icônes SVG ont `aria-hidden="true"`
- [ ] Labels descriptifs en français

---

### 13. Associer les erreurs aux inputs avec aria-describedby

**Fichiers concernés :**
- `src/features/auth/components/LoginForm.tsx` (modification)
- `src/features/settlements/components/SettlementForm.tsx` (modification)
- `src/features/groups/components/CreateGroupForm.tsx` (modification)
- `src/features/groups/components/InviteForm.tsx` (modification)
- `src/features/expenses/components/ExpenseForm.tsx` (modification)
- `src/features/members/components/IncomeForm.tsx` (modification)

**Description :**
Associer les messages d'erreur aux champs de formulaire via `aria-describedby`.

```tsx
// Pattern à appliquer
<input
  id="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && (
  <p id="email-error" role="alert" className="text-red-500 text-sm">
    {error}
  </p>
)}
```

**Critères de validation :**
- [ ] Tous les inputs avec erreur ont `aria-invalid` et `aria-describedby`
- [ ] Messages d'erreur ont `role="alert"`
- [ ] IDs uniques et correspondants

---

### 14. Ajouter la sémantique tabs aux filtres

**Fichiers concernés :**
- `src/features/settlements/components/SettlementHistory.tsx` (modification)
- `src/features/expenses/components/ExpenseFilters.tsx` (modification si applicable)

**Description :**
Transformer les boutons de filtre en tabs accessibles avec les rôles ARIA appropriés.

```tsx
// Pattern à appliquer
<div role="tablist" aria-label="Filtrer les règlements">
  {filters.map((filter) => (
    <button
      key={filter.value}
      role="tab"
      aria-selected={selectedFilter === filter.value}
      aria-controls={`panel-${filter.value}`}
      onClick={() => setSelectedFilter(filter.value)}
    >
      {filter.label}
    </button>
  ))}
</div>
```

**Critères de validation :**
- [ ] Container avec `role="tablist"`
- [ ] Boutons avec `role="tab"` et `aria-selected`
- [ ] Navigation clavier fonctionnelle (flèches)

---

### 15. Ajouter fieldset/legend aux checkboxes groupés

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseForm.tsx` (modification)

**Description :**
Envelopper la section "Participants" dans un `<fieldset>` avec `<legend>` pour une meilleure sémantique.

```tsx
<fieldset>
  <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
    Participants
  </legend>
  {participants.map((p) => (
    <Checkbox key={p.id} ... />
  ))}
</fieldset>
```

**Critères de validation :**
- [ ] Section participants enveloppée dans `<fieldset>`
- [ ] `<legend>` avec texte "Participants"
- [ ] Styling cohérent avec le reste du formulaire

---

## Sprint 5 - Nettoyage et polish

### 16. Utiliser le Spinner partagé

**Fichiers concernés :**
- `src/features/auth/components/LoginPage.tsx` (modification)
- `src/features/auth/components/ProfilePage.tsx` (modification)
- `src/features/groups/components/InvitePage.tsx` (modification)

**Description :**
Remplacer les spinners inline par le composant `<Spinner />` partagé.

```tsx
// Avant
<div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />

// Après
import { Spinner } from '@/shared/components';
<Spinner size="lg" />
```

**Critères de validation :**
- [ ] Import de `Spinner` depuis `@/shared/components`
- [ ] Suppression des spinners inline
- [ ] Tailles appropriées (`sm`, `md`, `lg`)

---

### 17. Importer isValidEmail depuis lib/validation

**Fichiers concernés :**
- `src/features/auth/components/LoginForm.tsx` (modification)

**Description :**
Supprimer la fonction `isValidEmail` dupliquée et importer depuis `@/lib/validation`.

```tsx
// Avant
const isValidEmail = useCallback((value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}, []);

// Après
import { isValidEmail } from '@/lib/validation';
```

**Critères de validation :**
- [ ] Import depuis `@/lib/validation`
- [ ] Suppression de la fonction locale et du `useCallback` associé
- [ ] Fonctionnement identique de la validation

---

### 18. Renommer les types SettlementSummary conflictuels

**Fichiers concernés :**
- `src/features/balances/types.ts` (modification)
- `src/features/settlements/types.ts` (modification)

**Description :**
Renommer les deux types `SettlementSummary` pour éviter la confusion :
- `balances/types.ts` : Renommer en `BalanceSettlement`
- `settlements/types.ts` : Renommer en `SettlementListItem`

**Critères de validation :**
- [ ] Types renommés avec noms explicites
- [ ] Mise à jour des imports dans les composants utilisant ces types
- [ ] Aucune erreur TypeScript

---

### 19. Uniformiser as const satisfies dans settlements

**Fichiers concernés :**
- `src/features/settlements/types.ts` (modification)

**Description :**
Remplacer `Record<SettlementError, string>` par `as const satisfies Record<SettlementError, string>` pour cohérence avec les autres features.

```typescript
// Avant
export const SETTLEMENT_ERROR_MESSAGES: Record<SettlementError, string> = {
  // ...
};

// Après
export const SETTLEMENT_ERROR_MESSAGES = {
  // ...
} as const satisfies Record<SettlementError, string>;
```

**Critères de validation :**
- [ ] Pattern `as const satisfies` utilisé
- [ ] Cohérence avec les autres fichiers types.ts

---

## Récapitulatif par priorité

### Priorité 1 - Critique (Sprint 1-2)
| # | Tâche | Effort estimé |
|---|-------|---------------|
| 1 | Type Result générique | Moyen |
| 2 | Messages d'erreur centralisés | Faible |
| 3 | Composant TextInput | Moyen |
| 4 | Hook useFetch générique | Élevé |
| 5 | Centraliser calcul balances | Élevé |
| 6 | Supprimer calculateShares dupliqué | Faible |

### Priorité 2 - Important (Sprint 3-4)
| # | Tâche | Effort estimé |
|---|-------|---------------|
| 7 | Helpers SQL | Moyen |
| 8 | Codes d'erreur backend | Faible |
| 9-10 | Refactoring fonctionnel | Moyen |
| 11-15 | Accessibilité | Moyen |

### Priorité 3 - Polish (Sprint 5)
| # | Tâche | Effort estimé |
|---|-------|---------------|
| 16 | Spinner partagé | Faible |
| 17 | Import isValidEmail | Faible |
| 18 | Renommer SettlementSummary | Faible |
| 19 | Uniformiser as const satisfies | Faible |

---

*Document généré le 1er février 2026 depuis AUDIT_TECHNIQUE.md*
