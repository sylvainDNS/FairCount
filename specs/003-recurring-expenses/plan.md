# Implementation Plan: Dépenses récurrentes

**Branch**: `003-recurring-expenses` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-recurring-expenses/spec.md` · Design brief:
[design-brief.md](./design-brief.md) (impeccable `shape`, confirmed v3)

## Summary

Introduce **récurrences**: a group-scoped model (expense content + unit frequency rule) that
automatically **generates ordinary expenses** at each **échéance**. Approach: two new tables
(`recurring_expenses`, `recurring_expense_participants`) and a nullable back-reference on
`expenses` protected by a partial unique index `(recurring_expense_id, recurrence_due_date)`.
A **daily Cloudflare Cron Trigger with two retries** (`5 23,5,11 * * *` UTC) materialises every échéance ≤ today (Europe/Paris), one
transactional D1 batch per generated expense, idempotent by construction; paused recurrences
and archived groups are skipped without retroactive catch-up. All calendar logic lives in a
pure shared module `src/lib/recurrence.ts` (TDD, reused by the form preview). Generated expenses
go through the existing participant validation and share engine, so balances stay exact
(Principle I). The UI — repeat block in `ExpenseForm`, collapsible « Récurrences » card,
recurrence detail, ↻ glyph, « Récurrentes » filter — follows the confirmed design brief and is
built via the impeccable skill. Decisions: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict (`exactOptionalPropertyTypes: true`)

**Primary Dependencies**: React 19 + Vite, TanStack Query, React Hook Form + Zod 4, Ark UI 5
(Checkbox, SegmentGroup, Select, Collapsible, Dialog, Toast), Hono + `@hono/zod-validator`,
Drizzle ORM (D1 driver, `db.batch`)

**Storage**: Cloudflare D1 (SQLite) — migration Drizzle `drizzle/migrations/0008_*.sql`
(additive); `localStorage` for the card's expanded state

**Testing**: Vitest (`src/**/*.test.{ts,tsx}`) — no D1 harness: calendar maths, rule
formatting, job planning (which dates to generate / skip) and Zod schemas are pure and tested
first; handlers stay thin (pattern of features 001/002). Component tests with Testing Library
for the repeat block and the card.

**Target Platform**: Cloudflare Workers (API + `scheduled` handler) · PWA mobile-first

**Project Type**: web app monorepo (frontend `src/features/*`, backend `src/workers/*`)

**Performance Goals**: no extra query on the expense list hot path (new columns only); the
recurrences list is one query + one chunked participants query; the job handles ≤ 100 due
recurrences per run (3 runs/day), catch-up capped at 31 échéances per recurrence per run

**Constraints**: D1 ≤ 100 bound params/statement (participants inserts and IN clauses via
existing chunking helpers); no mutable global state in the worker; Europe/Paris calendar days;
French inclusive UI copy, English code comments

**Scale/Scope**: 1 migration, 1 new backend service + 1 job module + 1 sub-router, 1 shared
pure module, ~9 frontend files touched/created, 7 new endpoints, 2 additive fields on expense
payloads, 0 breaking change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Évaluation | Statut |
|----------|------------|--------|
| I. Intégrité des calculs | Aucune nouvelle arithmétique monétaire : une dépense générée est une ligne `expenses` + `expense_participants` ordinaire (centimes entiers), répartie par `calculateShares` existant. Les participants sont revalidés par `validateParticipants` au moment de la génération (filtrés aux personnes actives ; les montants personnalisés ne peuvent que diminuer). Test d'invariant « somme des soldes = 0 » ajouté sur un scénario avec dépenses générées. | ✅ PASS |
| II. Test-First | Tests écrits et vus en échec d'abord pour : `recurrence.ts` (fins de mois, bissextile, jours ISO, rattrapage plafonné) ; règles métier des services extraites en fonctions pures (`validateRecurringExpenseInput`, `planRecurrenceRun`, `deriveRecurrenceStatus`) ; orchestration du job via dépendances injectées ; **routes API** testées avec `app.request()` de Hono, services mockés (validation, codes 400/404, garde UUID) ; formateur FR, schémas Zod, composants (bloc Répétition, carte, détail, filtre). Ne restent non testés unitairement que les accès D1 bruts (requêtes/batch), sans logique de décision. | ✅ PASS (après remédiation `/speckit-analyze` K1) |
| III. Architecture feature-based | Tout le frontend dans `features/expenses` (pas de cycle d'import, cf. R9) ; nouveaux query keys sous `queryKeys.expenses.recurring` et `invalidations.afterRecurringExpenseChange` ; barrel `index.ts` étendu sélectivement (types publics uniquement si consommés ailleurs). | ✅ PASS |
| IV. Type safety | Colonnes enum Drizzle (`frequency`), types inférés du schéma ; `RecurrenceRule` = union discriminée Zod partagée route/formulaire ; aucune assertion non justifiée. | ✅ PASS |
| V. Edge-first | Cron Trigger natif, handler `scheduled` sans état global ; lots D1 transactionnels ; IN clauses via `selectByIdsChunked` ; pas de nouvelle route lazy (UI intégrée à la page groupe existante). | ✅ PASS |
| Releases & changelog | Changement visible → 0.2.0 → 0.3.0 + entrée « Nouveauté » en tête de `changelog.ts`, même PR. | ✅ PASS |

**Re-check post-Phase 1**: data model additive, API rétrocompatible (champs ajoutés
uniquement), job idempotent — aucune violation. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/003-recurring-expenses/
├── spec.md
├── design-brief.md       # impeccable shape (confirmed v3)
├── plan.md               # This file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   └── recurring-expenses-api.md
├── checklists/requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
wrangler.toml                                     # + [triggers] crons = ["5 23,5,11 * * *"]
drizzle/migrations/0008_*.sql                     # NEW: 2 tables, 2 columns, partial unique index
src/
├── db/schema/
│   ├── recurring-expenses.ts                     # NEW: recurringExpenses, recurringExpenseParticipants
│   ├── expenses.ts                               # + recurringExpenseId, recurrenceDueDate, unique index
│   └── index.ts                                  # + exports/types
├── lib/
│   ├── recurrence.ts                             # NEW (pure, shared): todayIn, firstDueDateOnOrAfter,
│   │                                             #   nextDueDateAfter, dueDatesThrough
│   ├── recurrence.test.ts                        # NEW (written first)
│   ├── schemas/recurring-expense.schema.ts       # NEW: recurrenceRuleSchema (+ API create/update)
│   ├── schemas/recurring-expense.schema.test.ts  # NEW
│   ├── schemas/expense.schema.test.ts            # NEW/extended (repeat fields)
│   ├── schemas/expense.schema.ts                 # + repeat fields (repeat, frequency, dayOfWeek,
│   │                                             #   dayOfMonth) + refine start ≥ today
│   ├── query-keys.ts                             # + expenses.recurring.{list,detail}
│   └── query-invalidations.ts                    # + afterRecurringExpenseChange
├── workers/
│   ├── index.ts                                  # export { fetch: app.fetch, scheduled }
│   ├── scheduled.ts                              # NEW: scheduled handler → runRecurringExpenses
│   ├── routes/groups/
│   │   ├── index.ts                              # mount /recurring-expenses sub-router
│   │   ├── recurring-expenses.ts                 # NEW: 7 routes + zValidator
│   │   ├── recurring-expenses.test.ts            # NEW (written first): app.request(), services mocked
│   │   ├── expenses.ts                           # + `recurring` query param
│   │   └── expenses.test.ts                      # NEW (written first): `recurring` param passthrough
│   └── services/
│       ├── recurring-expenses.ts                 # NEW: CRUD, status derivation, deactivate/reactivate
│       ├── recurring-expense-generation.ts       # NEW: generateDueExpense (batch), runRecurringExpenses(deps)
│       ├── recurring-expense-generation.test.ts  # NEW (written first): conflict detection, orchestration with fakes
│       ├── recurring-expense-planning.ts         # NEW (pure): validateRecurringExpenseInput, planRecurrenceRun,
│       │                                         #   deriveRecurrenceStatus, buildGeneratedExpense,
│       │                                         #   resolveUpdatedRule, recomputeNextDueDate, toRecurringExpenseView
│       ├── recurring-expense-planning.test.ts    # NEW (written first)
│       └── expenses.ts                           # validateParticipants exported; list filter +
│                                                 #   recurringExpenseId; detail + recurrence block
├── features/expenses/
│   ├── types.ts                                  # RecurrenceRule, RecurringExpense*, ExpenseSummary/Detail
│   │                                             #   additions, new error codes/messages
│   ├── api/index.ts                              # + recurringExpensesApi
│   ├── hooks/useRecurringExpenses.ts             # NEW (list)
│   ├── hooks/useRecurringExpense.ts              # NEW (detail + mutations)
│   ├── hooks/useExpenseForm.ts                   # repeat block state, create routing, edit-recurrence mode
│   ├── utils/format-recurrence-rule.ts           # NEW (pure FR sentence) + test
│   ├── components/RepeatIcon.tsx                 # NEW (inline SVG, aria-hidden)
│   ├── components/RecurrenceFields.tsx           # NEW  ┐
│   ├── components/RecurrenceSection.tsx          # NEW  │ UI tasks → via skill impeccable
│   ├── components/RecurrenceDetail.tsx           # NEW  │ (design-brief.md)
│   ├── components/ExpenseForm.tsx                # + repeat block, recurrence edit mode, captions
│   ├── components/ExpenseList.tsx                # + RecurrenceSection above filters
│   ├── components/ExpenseCard.tsx                # + ↻ glyph
│   ├── components/ExpenseDetail.tsx              # + « Récurrence » row, delete copy
│   ├── components/ExpenseFilters.tsx             # + « Type » pill (Toutes · Récurrentes) ┘
│   ├── components/*.test.tsx                     # RecurrenceFields, RecurrenceSection, RecurrenceDetail,
│   │                                             #   ExpenseForm, ExpenseCard, ExpenseDetail, ExpenseFilters
│   └── store/recurrences-expanded.ts             # NEW: localStorage expanded state (guarded)
└── features/changelog/data/changelog.ts          # + 0.3.0 « Nouveauté »
package.json                                      # version 0.3.0
```

**Structure Decision**: existing dual-runtime web app. Backend gets one resource service, a
generation module split into a pure planner (tested) and a thin D1 executor, and a
`scheduled` entry point next to `fetch`. Calendar logic is the only code shared by worker and
frontend (`src/lib/recurrence.ts`), like `src/lib/schemas`. Frontend stays inside the expenses
feature.

## Design decisions (links)

- **R1** daily Cron Trigger (23:05 UTC = after midnight Paris all year) + 2 retries + synchronous generation when the first échéance is today.
- **R2** Europe/Paris calendar days via `Intl`, shared by preview and job.
- **R3** idempotence: partial unique index + one transactional D1 batch per generation.
- **R4** rule = frequency + ISO anchors; pure date maths with month-end clamping.
- **R5** `disabled_at` stored, `paused` derived; paused/archived échéances skipped, never caught up.
- **R6** participants filtered to active persons at generation; shares via existing engine.
- **R7** sub-router `/recurring-expenses` with explicit deactivate/reactivate.
- **R8** soft delete; generated expenses keep glyph + rule (`isDeleted`).
- **R9** frontend in `features/expenses`; card state in `localStorage`.
- **R10** release 0.3.0 + changelog « Nouveauté ».

## Spec adjustments made during planning

- **FR-013 / US2-3 corrected**: the app recomputes every expense's shares with *current*
  coefficients; generated expenses follow the same rule (no frozen coefficients). Design
  brief's « parts estimées » note removed accordingly.

## Complexity Tracking

No constitutional violation — section intentionally empty.
