# Tasks: Compte commun comme payeur tiers d'un groupe

**Input**: Design documents from `/specs/001-group-joint-account/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/joint-account-api.md, quickstart.md

**Tests**: INCLUS — la constitution (Principe II, non négociable) impose le TDD strict :
tests écrits → validés en échec (rouge) → implémentation (vert). La logique monétaire vit en
fonctions pures (`services/shared/`), seules unités testables sans harness D1 (pattern repo).

**Organization**: tâches groupées par user story (spec.md) pour livraison incrémentale.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, pas de dépendance sur tâche inachevée)
- **[Story]**: US1 / US2 / US3 (phases user story uniquement)

## Path Conventions

Monorepo double runtime : frontend `src/features/*`, backend `src/workers/*`, schéma DB
`src/db/schema/*`, migrations `drizzle/migrations/*` (cf. plan.md § Project Structure).

---

## Phase 1: Setup (schéma et constantes)

**Purpose**: évolution de schéma additive — préalable à tout le reste

- [x] T001 Ajouter la colonne `kind` (`text` enum `['person','joint_account']`, notNull, default `'person'`) et l'index unique partiel `uq_group_members_joint_account` (`(group_id) WHERE kind = 'joint_account'`) à la table `group_members` dans `src/db/schema/members.ts`
- [x] T002 Générer la migration 0007 (`pnpm db:generate`), vérifier qu'elle contient l'ALTER + l'index partiel (compléter à la main sinon), l'appliquer en local (`pnpm db:migrate`)
- [x] T003 [P] Ajouter le code `JOINT_ACCOUNT_NOT_FOUND` à `API_ERROR_CODES` dans `src/shared/constants/errors.ts`

---

## Phase 2: Foundational (cycle de vie du compte commun — bloquant)

**Purpose**: sans compte commun activable par API, aucune story n'est testable
(« Given un groupe avec compte commun activé »)

**⚠️ CRITICAL**: aucune story ne démarre avant la fin de cette phase

- [x] T004 [P] Écrire les tests (rouge) de `jointAccountSchema` (nom optionnel, 1–100 chars, trim) dans `src/lib/schemas/group.schema.test.ts`
- [x] T005 Créer `jointAccountSchema` dans `src/lib/schemas/group.schema.ts` (vert T004)
- [x] T006 [P] Ajouter le helper `activePersonMembersCondition(groupId)` (= actifs ET `kind = 'person'`) dans `src/workers/services/shared/sql-helpers.ts`
- [x] T007 Créer le service `src/workers/services/joint-account.ts` : `getJointAccount` (y compris désactivé), `upsertJointAccount` (créer / renommer / réactiver — INV-1, transitions de data-model.md), `disableJointAccount` (pose `leftAt`, idempotent, 404 `JOINT_ACCOUNT_NOT_FOUND` si jamais créé)
- [x] T008 Monter `PUT` et `DELETE /api/groups/:id/joint-account` dans `src/workers/routes/groups/index.ts` (zValidator `jointAccountSchema`, contrat § 1)
- [x] T009 Étendre `GET /api/groups/:id` dans `src/workers/routes/groups/index.ts` : champ `jointAccount { memberId, name, active } | null`, tableau `members` et `memberCount` filtrés `kind = 'person'` (INV-6)
- [x] T010 Filtrer le `memberCount` de `listGroups` (`kind = 'person'`) dans `src/workers/routes/groups/index.ts`

**Checkpoint**: compte commun activable/désactivable via API ; écrans existants inchangés

---

## Phase 3: User Story 1 - Saisir une dépense payée par le compte commun (Priority: P1) 🎯 MVP

**Goal**: payeur « compte commun » sélectionnable dans le formulaire de dépense ; soldes
exacts (coût porté au prorata des coefficients, somme = 0)

**Independent Test**: quickstart.md scénario 1 — groupe 60/40, activation par API (Phase 2),
dépense 100 € payeur compte commun bénéficiaire unique → soldes −40/+40, `isValid: true`

### Tests for User Story 1 (TDD — écrire d'abord, valider le rouge)

- [x] T011 [P] [US1] Écrire les tests (rouge) de la fonction pure d'agrégation dans `src/workers/services/shared/balance-calculation.test.ts` : dépense payée par un membre (caractérisation), dépense compte commun 60/40 → ±40, bénéficiaires = tous → effet neutre, restes d'arrondi à 3 membres → somme exactement 0, coefficient 0, `customAmount` côté bénéficiaires, distribution payeur limitée aux membres actifs
- [x] T012 [P] [US1] Écrire les tests de caractérisation de `calculateShares` dans `src/workers/services/shared/share-calculation.test.ts` (comportement d'arrondi existant — filet de sécurité avant réutilisation côté payeur)

### Implementation for User Story 1

- [x] T013 [US1] Extraire la fonction pure d'agrégation par dépense (`paidShares` via `calculateShares` sur membres actifs si payeur joint, sinon payeur unique ; `owedShares` existant — data-model.md § Sémantique) dans `src/workers/services/shared/balance-calculation.ts` (vert T011)
- [x] T014 [US1] Brancher `calculateGroupBalances` sur l'agrégation partagée dans `src/workers/services/shared/balance-calculation.ts` : balances construites sur les membres `person` uniquement (INV-6), distribution payeur joint incluse
- [x] T015 [US1] Brancher le calcul `myBalance` de `listGroups` sur la même agrégation partagée dans `src/workers/routes/groups/index.ts` (supprime la duplication — research R4)
- [x] T016 [US1] Adapter `src/workers/services/expenses.ts` : `activeMemberIds` des participants construit avec `activePersonMembersCondition` (INV-4 → `INVALID_PARTICIPANT` si compte commun bénéficiaire) ; à l'update, `paidBy` identique à l'existant accepté sans revalidation d'activité (INV-3)
- [x] T017 [US1] Ajouter `paidBy.isJointAccount` aux réponses `listExpenses` et `getExpense` (sélection de `kind` via le join payeur existant) dans `src/workers/services/expenses.ts`
- [x] T018 [P] [US1] Types frontend : `jointAccount` sur `GroupWithMembers` dans `src/features/groups/types.ts` ; `isJointAccount` sur `paidBy` de `ExpenseSummary`/`ExpenseDetail` dans `src/features/expenses/types.ts`
- [x] T019 [US1] Ajouter l'option payeur « Compte commun » au Select de `src/features/expenses/components/ExpenseForm.tsx` et `src/features/expenses/hooks/useExpenseForm.ts` : item ajouté quand `group.jointAccount?.active` (source `useGroup`, déjà en cache), libellé distinct, édition d'une dépense existante au payeur joint conservée même si désactivé (spread conditionnel — `exactOptionalPropertyTypes`)
- [x] T020 [US1] Afficher le payeur compte commun dans `src/features/expenses/components/ExpenseDetail.tsx` : badge « Compte commun » via `paidBy.isJointAccount`, jamais de suffixe « (vous) »

**Checkpoint**: US1 testable de bout en bout (activation par curl + saisie UI + soldes exacts)

---

## Phase 4: User Story 2 - Activer et configurer le compte commun (Priority: P2)

**Goal**: opt-in dans les paramètres du groupe (activer / renommer / désactiver) ;
zéro changement pour les groupes qui n'activent pas

**Independent Test**: quickstart.md scénario 2 — deux groupes, un seul activé : l'option
payeur n'apparaît que dans celui-ci ; désactivation → historique/soldes intacts, option retirée

### Implementation for User Story 2

- [x] T021 [P] [US2] Ajouter `jointAccountApi` (`set(groupId, {name?})` → PUT, `disable(groupId)` → DELETE) dans `src/features/groups/api/index.ts`
- [x] T022 [P] [US2] Ajouter `invalidations.afterJointAccountChange(qc, groupId)` (invalide `groups.detail`) dans `src/lib/query-invalidations.ts`
- [x] T023 [US2] Exposer les mutations `setJointAccount` / `disableJointAccount` (pattern `GroupResult`, invalidation T022) dans `src/features/groups/hooks/useGroup.ts`
- [x] T024 [US2] Ajouter la section « Compte commun » à `src/features/groups/components/GroupSettings.tsx` : toggle activation, champ nom (défaut « Compte commun »), état réactivable si `jointAccount.active === false`, texte d'aide rappelant la contrainte d'usage (alimentations saisies en répartition équitable — hypothèse spec), UI en français avec écriture inclusive
- [x] T025 [US2] Vérifier la non-régression opt-out (quickstart.md scénario 2) : groupe sans compte commun → formulaire de dépense, soldes, historique, stats strictement identiques (SC-003)

**Checkpoint**: US1 + US2 fonctionnent indépendamment ; parcours 100 % UI possible

---

## Phase 5: User Story 3 - Lire soldes, historique et statistiques (Priority: P3)

**Goal**: compte commun identifiable dans l'historique, transparent partout ailleurs
(jamais de solde, de suggestion ni de ligne stats à son nom)

**Independent Test**: quickstart.md scénario 3 — après les dépenses du scénario 1 : soldes et
suggestions n'affichent que des membres ; stats redistribuées 60/40 ; badge visible en liste

### Implementation for User Story 3

- [x] T026 [P] [US3] Afficher le badge « Compte commun » sur les lignes d'historique via `paidBy.isJointAccount` dans `src/features/expenses/components/ExpenseCard.tsx` (SC-005)
- [x] T027 [P] [US3] Ajouter `paidBy.isJointAccount` à la liste des dépenses de `getMyBalance` (`isPayer` reste `false` pour un payeur joint) dans `src/workers/services/balances.ts`
- [x] T028 [US3] Redistribuer les dépenses au payeur joint dans `byMember` de `getGroupStats` au prorata des coefficients (réutiliser l'agrégation partagée T013 — mêmes parts que les balances, aucune ligne « compte commun ») dans `src/workers/services/balances.ts` (FR-012)
- [x] T029 [US3] Exiger `kind = 'person'` pour le destinataire de `createSettlement` (`INVALID_RECIPIENT` sinon — INV-5) dans `src/workers/services/settlements.ts`
- [x] T030 [US3] Valider la lecture complète (quickstart.md scénario 3) : soldes/suggestions sans compte commun, stats cohérentes, badges en liste

**Checkpoint**: les trois stories sont indépendamment fonctionnelles

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T031 [P] Dérouler quickstart.md en entier, y compris les garde-fous (participant joint → 400 `INVALID_PARTICIPANT`, settlement vers joint → 400 `INVALID_RECIPIENT`, nouveau payeur joint désactivé → 400 `INVALID_PAYER`, édition avec `paidBy` inchangé → 200)
- [x] T032 Vérifier les gates constitution avant merge : `pnpm test` et `pnpm check` verts, invariant somme des soldes = 0 couvert par les tests d'arrondi (Principe I)
- [x] T033 [P] Mettre à jour la section « Database Schema » de `CLAUDE.md` (colonne `kind` de `members.ts`, concept de membre virtuel compte commun)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: aucune dépendance — T001 → T002 ; T003 parallèle
- **Foundational (Phase 2)**: dépend de Phase 1 — BLOQUE toutes les stories.
  T004 → T005 ; T006 et T007 après T001 ; T008 après T005+T007 ; T009 après T007 ; T010 après T006
- **US1 (Phase 3)**: après Phase 2. T011/T012 (rouge) → T013 (vert) → T014 → T015 ;
  T016 après T006 ; T017 après T001 ; T018 → T019 → T020
- **US2 (Phase 4)**: après Phase 2 uniquement (indépendante de US1 côté code : T021–T024 ne
  touchent aucun fichier de US1 sauf `types.ts` déjà étendu en T018 — si US2 démarre avant
  US1, inclure l'ajout de `jointAccount` au type dans T021)
- **US3 (Phase 5)**: T026 dépend de T017+T018 (badge liste) ; T027/T028 après T013 ;
  T029 indépendante (après Phase 1)
- **Polish (Phase 6)**: après les stories retenues

### User Story Dependencies

- **US1 (P1)**: Foundational seulement — MVP autonome (activation par API)
- **US2 (P2)**: Foundational seulement — testable sans US1 (le toggle et l'apparition de
  l'option payeur suffisent)
- **US3 (P3)**: s'appuie sur les données produites par US1 pour être démontrée, mais chaque
  tâche est vérifiable isolément

### Parallel Opportunities

```text
Phase 1 : T003 ∥ (T001→T002)
Phase 2 : T004 ∥ T006 ∥ T007 (après T001)
Phase 3 : T011 ∥ T012 (tests rouges) ; T017 ∥ T018 ; backend (T013–T017) ∥ types front (T018)
Phase 4 : T021 ∥ T022
Phase 5 : T026 ∥ T027 ∥ T029
Phases 4 et 5 backend (T027–T029) ∥ Phase 4 frontend (T021–T024) — fichiers disjoints
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1 + 2 (schéma, service, endpoints d'activation)
2. Phase 3 (US1) en TDD : rouge (T011/T012) avant tout code de calcul
3. **STOP & VALIDATE** : quickstart scénario 1 (activation via curl, saisie UI, soldes ±40, somme 0)
4. Déployable en l'état : votre couple peut utiliser la feature en activant par API

### Incremental Delivery

1. Phase 4 (US2) → activation 100 % UI dans les paramètres → démo complète du flux réel
2. Phase 5 (US3) → lecture irréprochable (badges, stats, garde-fous settlements)
3. Phase 6 → gates constitution + doc

### Notes

- Commit par tâche ou groupe logique (Conventional Commits)
- Ne jamais implémenter T013 avant d'avoir vu T011 échouer (Principe II)
- Chaque tâche monétaire (T013–T015, T028) doit laisser `verifyBalancesIntegrity` vrai —
  c'est le signal d'alarme du Principe I
