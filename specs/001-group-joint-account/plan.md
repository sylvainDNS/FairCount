# Implementation Plan: Compte commun comme payeur tiers d'un groupe

**Branch**: `001-group-joint-account` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-group-joint-account/spec.md`

## Summary

Permettre, par groupe et en opt-in, de déclarer un « compte commun » sélectionnable comme
payeur d'une dépense. Approche : le compte commun est un **membre virtuel** de
`group_members` (colonne discriminante `kind`), ce qui préserve le FK `expenses.paidBy` et
tous les joins payeur existants. Côté soldes, une dépense payée par le compte commun est
portée par les membres réels actifs au prorata de leurs coefficients, via le moteur
`calculateShares` existant (arrondis déterministes, somme des soldes = 0 par construction).
L'activation/désactivation réutilise `leftAt`. Détails des décisions : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict (`exactOptionalPropertyTypes: true`)

**Primary Dependencies**: React 18 + Vite, TanStack Query, React Hook Form + Zod, Ark UI,
Hono + `@hono/zod-validator`, Drizzle ORM

**Storage**: Cloudflare D1 (SQLite) — migrations Drizzle (`drizzle/migrations/`)

**Testing**: Vitest (`src/**/*.test.{ts,tsx}`) — pas de harness D1 : la logique métier
testable doit être en fonctions pures (pattern existant : `sql-helpers.test.ts`)

**Target Platform**: Cloudflare Workers (backend) + PWA mobile-first (frontend)

**Project Type**: web app monorepo (frontend `src/features/*`, backend `src/workers/*`)

**Performance Goals**: pas de requête D1 supplémentaire sur les chemins chauds
(liste dépenses, soldes) — le membre virtuel est résolu dans les requêtes existantes

**Constraints**: D1 ≤ 100 paramètres liés/requête ; pas d'état global Workers ;
UI française (écriture inclusive), commentaires code en anglais

**Scale/Scope**: 1 migration additive, ~6 fichiers backend, ~8 fichiers frontend,
2 endpoints nouveaux, 0 breaking change API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Évaluation | Statut |
|----------|------------|--------|
| I. Intégrité des calculs | Logique monétaire touchée (soldes, stats). Mitigation : réutilisation exclusive de `calculateShares` pour la répartition côté payeur ; extraction d'une fonction pure d'agrégation partagée (R4) ; tests d'arrondi + invariant somme=0 exigés avant merge. Montants en centimes entiers partout. | ✅ PASS |
| II. Test-First | TDD strict : les tests des fonctions pures (répartition payeur, agrégation soldes, exclusions) sont écrits et validés en échec avant implémentation. La logique DB reste dans des handlers fins non testés unitairement (pattern existant) — la logique de calcul en est extraite. | ✅ PASS |
| III. Architecture feature-based | Frontend : modifications confinées à `features/groups`, `features/expenses`, `features/balances` (types), `shared` intact ; query keys/invalidations centralisés étendus. Pas de nouveau barrel wildcard. | ✅ PASS |
| IV. Type safety | `kind` typé par union littérale Drizzle (`text({ enum: ['person','joint_account'] })`), types API inférés du schéma ; nouveaux inputs validés par Zod (`zValidator` + schéma partagé). | ✅ PASS |
| V. Edge-first | Aucune nouvelle clause IN (lookups mono-ligne) ; requêtes indépendantes déjà parallélisées non dégradées ; aucun impact bundle (pas de nouvelle route lazy). | ✅ PASS |

**Re-check post-Phase 1** : inchangé, aucune violation introduite par le design détaillé
(data-model additif, contrats rétrocompatibles). ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-group-joint-account/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── joint-account-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── db/schema/
│   └── members.ts                                # + colonne kind + index unique partiel
├── workers/
│   ├── routes/groups/
│   │   ├── index.ts                              # GET /:id (+jointAccount, filtre members),
│   │   │                                         # sous-routeur /joint-account (PUT, DELETE),
│   │   │                                         # listGroups (myBalance via agrégation partagée)
│   │   ├── expenses.ts                           # (inchangé — schémas Zod identiques)
│   │   └── settlements.ts                        # (inchangé)
│   └── services/
│       ├── shared/
│       │   ├── balance-calculation.ts            # agrégation pure extraite + cas payeur virtuel
│       │   ├── share-calculation.ts              # (réutilisé tel quel)
│       │   └── sql-helpers.ts                    # + activePersonMembersCondition (kind='person')
│       ├── expenses.ts                           # validation participants personnes only,
│       │                                         # paidBy inchangé accepté à l'update,
│       │                                         # réponses paidBy.isJointAccount
│       ├── balances.ts                           # getGroupStats : redistribution byMember
│       ├── settlements.ts                        # destinataire kind='person' requis
│       └── joint-account.ts                      # NOUVEAU : upsert/désactivation membre virtuel
├── features/
│   ├── groups/
│   │   ├── api/index.ts                          # + jointAccountApi (PUT/DELETE)
│   │   ├── hooks/useGroup.ts                     # + mutations setJointAccount/disableJointAccount
│   │   ├── components/GroupSettings.tsx          # + section « Compte commun » (toggle + nom)
│   │   └── types.ts                              # GroupWithMembers.jointAccount
│   └── expenses/
│       ├── components/ExpenseForm.tsx            # option payeur « compte commun » dans le Select
│       ├── components/ExpenseCard.tsx            # badge payeur compte commun
│       ├── components/ExpenseDetail.tsx          # badge payeur compte commun
│       ├── hooks/useExpenseForm.ts               # défauts/édition avec payeur virtuel
│       └── types.ts                              # paidBy.isJointAccount
├── lib/
│   ├── schemas/group.schema.ts                   # + jointAccountSchema (nom)
│   └── query-invalidations.ts                    # + afterJointAccountChange
drizzle/migrations/
└── 0007_*.sql                                    # ALTER group_members + index unique partiel

Tests (TDD, écrits d'abord) :
src/workers/services/shared/balance-calculation.test.ts   # NOUVEAU (fonctions pures)
src/workers/services/shared/share-calculation.test.ts     # NOUVEAU (caractérisation existant)
src/lib/schemas/group.schema.test.ts                       # NOUVEAU (jointAccountSchema)
```

**Structure Decision**: web app existante à double runtime (features React + worker Hono).
Aucun nouveau répertoire : un seul nouveau service backend (`joint-account.ts`), un nouveau
sous-routeur monté sous `/:id`, et des extensions localisées dans les features `groups` et
`expenses`. Le calcul monétaire converge vers `services/shared/` (fonctions pures testables).

## Design décisions clés (renvois)

- **R1** membre virtuel `group_members.kind` — préserve FK et joins payeur.
- **R2** activation via `leftAt` + index unique partiel `(group_id) WHERE kind='joint_account'`.
- **R3** répartition payeur = `calculateShares` sur membres réels actifs (fair share, sans custom).
- **R4** agrégation soldes extraite en fonction pure, consommée par `calculateGroupBalances` et `listGroups`.
- **R5** API : `jointAccount` dans GET groupe ; `PUT`/`DELETE /api/groups/:id/joint-account` ; `paidBy.isJointAccount` dans les réponses dépenses.
- **R6** stats : redistribution `byMember` au prorata des coefficients.

## Complexity Tracking

Aucune violation constitutionnelle — section vide.
