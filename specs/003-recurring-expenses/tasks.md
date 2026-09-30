---

description: "Task list for feature 003-recurring-expenses"
---

# Tasks: Dépenses récurrentes

**Input**: Design documents from `/specs/003-recurring-expenses/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/recurring-expenses-api.md](./contracts/recurring-expenses-api.md),
[design-brief.md](./design-brief.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution principle II (Test-First, NON-NEGOTIABLE): every test task
must be written first and seen failing (`pnpm test`) before its implementation task.
Principle I: generated expenses must keep the group balance sum at exactly 0.

**UI tasks**: tasks tagged **via skill impeccable** MUST be built by invoking the `impeccable`
skill (established world: DESIGN.md + [design-brief.md](./design-brief.md)), not freehand.

**Vocabulary (binding, spec « Vocabulaire »)**: *récurrence* = the model; *échéance* = a date;
*dépense générée* = spec term only, the UI says « dépense ». Never « occurrence » in UI copy.

**Organization**: grouped by user story (spec.md: US1 P1, US2 P1, US3 P2, US4 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4
- Backend base: `src/workers/`; frontend base: `src/features/expenses/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: cron declaration and worker entry point.

- [X] T001 Add `[triggers]` `crons = ["5 23,5,11 * * *"]` to `wrangler.toml` (R1: 23:05 UTC is after midnight Paris all year, 05:05/11:05 are retries); check in Wrangler docs whether `triggers` is inherited by `[env.production]` — if not, add `[env.production.triggers]` with the same value (research.md « Verification notes »)
- [X] T002 Change `src/workers/index.ts` to `export default { fetch: app.fetch, scheduled }` with `scheduled` imported from a new `src/workers/scheduled.ts` that, for now, exports `async function scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void>` doing nothing (filled in T037); keep `Env` from `src/workers/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: data model, calendar maths, rule schema, shared types. ⚠️ No story work before
this phase is complete.

### Data model

- [X] T003 Create `src/db/schema/recurring-expenses.ts` with `recurringExpenses` (`sqliteTable('recurring_expenses')`): `id` text PK; `groupId` text notNull FK `groups.id` `onDelete: 'cascade'`; `paidBy` text notNull FK `groupMembers.id`; `amount` integer notNull (« cents, > 0 »); `description` text notNull (« 1–500 chars »); `frequency` `text('frequency', { enum: ['daily','weekly','monthly','yearly'] })` notNull; `dayOfWeek` integer nullable (« 1–7 (ISO, Monday = 1); set iff `weekly` »); `dayOfMonth` integer nullable (« 1–31; set iff `monthly` or `yearly` »); `month` integer nullable (« 1–12; set iff `yearly` (from start date) »); `startDate` text notNull (`YYYY-MM-DD`, immutable); `nextDueDate` text notNull; `disabledAt`, `deletedAt` `integer({ mode: 'timestamp_ms' })` nullable; `createdBy` text notNull FK `groupMembers.id`; `createdAt`, `updatedAt` timestamp_ms notNull; indexes `idx_recurring_expenses_group (group_id)` and `idx_recurring_expenses_due (next_due_date)`. Same file: `recurringExpenseParticipants` (`recurring_expense_participants`): `id` PK, `recurringExpenseId` notNull FK `onDelete: 'cascade'`, `memberId` notNull FK `groupMembers.id`, `customAmount` integer nullable (« null = fair share; cents otherwise »). Export `RecurringExpense`, `NewRecurringExpense`, `RecurringExpenseParticipant`, `NewRecurringExpenseParticipant` inferred types (data-model.md)
- [X] T004 In `src/db/schema/expenses.ts` add `recurringExpenseId: text('recurring_expense_id').references(() => recurringExpenses.id)` (nullable, no cascade — kept after soft delete) and `recurrenceDueDate: text('recurrence_due_date')` (nullable `YYYY-MM-DD`), plus `uniqueIndex('uq_expenses_recurrence_due').on(t.recurringExpenseId, t.recurrenceDueDate).where(sql\`${t.recurringExpenseId} IS NOT NULL\`)` (R3; same partial-index style as `uq_group_members_joint_account` in `src/db/schema/members.ts`); export the new schema from `src/db/schema/index.ts`
- [X] T005 Run `pnpm drizzle-kit generate --name recurring_expenses` (produces `drizzle/migrations/0008_recurring_expenses.sql` with a consistent `_journal.json` — no manual rename), check the SQL creates both tables, both indexes, the two nullable `expenses` columns and the partial unique index `WHERE "expenses"."recurring_expense_id" IS NOT NULL`; then `pnpm db:migrate` locally

### Calendar maths (pure, shared worker + frontend — R2, R4)

- [X] T006 [P] Write failing tests in `src/lib/recurrence.test.ts` for: `todayIn('Europe/Paris', now)` (2026-03-28T23:30Z → `2026-03-29`, 2026-10-24T22:30Z → `2026-10-25`, 2026-06-30T21:59Z → `2026-06-30`); `firstDueDateOnOrAfter(rule, date)` for daily (same day), weekly (dayOfWeek 1 from a Wednesday → next Monday; same weekday → same day), monthly (13 from the 27th → 13th next month; 31 in April → 30 April; 31 in Feb 2027 → 28 Feb, Feb 2028 → 29 Feb; 1 across December → 1 January next year), yearly (29/02 on 2027 → 2027-02-28, on 2028 → 2028-02-29; 27/09 from 2026-09-28 → 2027-09-27); `nextDueDateAfter(rule, date)` (strictly after; monthly 31 after 2026-01-31 → 2026-02-28 then → 2026-03-31 — the anchor day is kept, not the clamped one); `dueDatesThrough(rule, from, today, max)` (daily from D-2 → [D-2, D-1, D], `from > today` → [], `max` caps the list); all dates as `YYYY-MM-DD` strings
- [X] T007 Implement `src/lib/recurrence.ts` (no DOM/Node API; `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day })` for `todayIn`; calendar maths on UTC-midnight `Date` only): export `RECURRENCE_TIME_ZONE = 'Europe/Paris'`, type `RecurrenceRule` (discriminated union from contracts « Shared shapes »), `todayIn`, `addDays`, `firstDueDateOnOrAfter`, `nextDueDateAfter`, `dueDatesThrough`, and `MAX_CATCH_UP_PER_RUN = 31` (makes T006 pass)

### Rule schema and status derivation

- [X] T008 [P] Write failing tests in `src/lib/schemas/recurring-expense.schema.test.ts`: `recurrenceRuleSchema` accepts the 4 contract shapes and rejects weekly without `dayOfWeek`, `dayOfWeek` 0/8, monthly `dayOfMonth` 0/32, yearly without `month`, extra anchors on `daily`; `createRecurringExpenseSchema` (API) = `amount` int positive, `description` 1–500, `paidBy` uuid, `participants` ≥ 1 (`memberId` uuid, `customAmount` int ≥ 0 nullable optional), `startDate` `YYYY-MM-DD`, `rule`; `updateRecurringExpenseSchema` = same fields all optional, no `startDate`, at least one field
- [X] T009 Implement `src/lib/schemas/recurring-expense.schema.ts` (Zod 4 `z.discriminatedUnion('frequency', …)`, `.strict()` objects) exporting `recurrenceRuleSchema`, `createRecurringExpenseSchema`, `updateRecurringExpenseSchema` and their inferred types (makes T008 pass)
- [X] T010 [P] Write failing tests in `src/workers/services/recurring-expense-planning.test.ts` for `deriveRecurrenceStatus({ disabledAt, payerActive, activeParticipantCount })` → `{ status: 'disabled' }` when `disabledAt` set (wins over everything), else `{ status: 'paused', pausedReason: 'payer_inactive' }` when payer inactive (checked first), else `paused/no_active_participant` when 0 active participants, else `active`; and `sortRecurrences(list)` → active by `nextDueDate` ASC, then paused, then disabled, ties by `description` (fr collation)
- [X] T011 Implement `deriveRecurrenceStatus` and `sortRecurrences` in `src/workers/services/recurring-expense-planning.ts` (pure, no DB import) (makes T010 pass)
- [X] T012 [P] Export `validateParticipants` from `src/workers/services/expenses.ts` (no behaviour change; it is reused for recurrences) and add `RECURRING_EXPENSE_NOT_FOUND: 'RECURRING_EXPENSE_NOT_FOUND'` to `API_ERROR_CODES` in `src/shared/constants/errors.ts`
- [X] T013 Write failing tests in `src/workers/services/recurring-expense-planning.test.ts` for `validateRecurringExpenseInput({ mode: 'create' | 'update', data, existing?, today, payer, activePersonIds })` → `{ ok: true, rule, nextDueDate } | { ok: false, error }`: `START_DATE_IN_PAST` (create, `startDate < today`); `INVALID_RULE` (yearly `dayOfMonth`/`month` ≠ `startDate`'s); `INVALID_PAYER` (payer missing or not in the group, or *changed* payer inactive; *unchanged* inactive payer accepted in update mode); `NO_PARTICIPANTS` / `INVALID_PARTICIPANT` (non-active person, joint account); `CUSTOM_AMOUNTS_EXCEED_TOTAL` including an update that changes only `amount`, checked against the stored participants (`existing.participants`); `nextDueDate = recomputeNextDueDate(rule, startDate, today)`; plus `resolveUpdatedRule(existingRule, patchRule | undefined, startDate)` (yearly patch → `dayOfMonth`/`month` forced from `startDate`; undefined keeps existing) and `recomputeNextDueDate(rule, startDate, today)` = `firstDueDateOnOrAfter(rule, max(today, startDate))` (constitution II: business logic tested first)
- [X] T014 Implement `resolveUpdatedRule`, `recomputeNextDueDate` and `validateRecurringExpenseInput` in `src/workers/services/recurring-expense-planning.ts` (pure; reuses `validateParticipants` from T012 and `recurrence.ts`; update mode merges `data` over `existing` and uses `resolveUpdatedRule`; `nextDueDate` via `recomputeNextDueDate` — single implementation, reused by reactivation) (makes T013 pass)

### Frontend foundations

- [X] T015 [P] Extend `src/features/expenses/types.ts`: `RecurrenceRule` (re-export the type from `@/lib/recurrence`), `RecurrenceStatus`, `PausedReason`, `RecurringExpenseSummary` and `RecurringExpenseDetail` (contract §1 GET list / GET detail), `CreateRecurringExpenseData`, `UpdateRecurringExpenseData`; add `recurringExpenseId: string | null` to `ExpenseSummary`, `recurrence: { id: string; rule: RecurrenceRule; isDeleted: boolean } | null` to `ExpenseDetail`, `recurring?: boolean | undefined` to `ExpenseFilters`; add error codes `RECURRING_EXPENSE_NOT_FOUND`, `START_DATE_IN_PAST`, `INVALID_RULE` to `ExpenseError`, `EXPENSE_ERROR_MESSAGES` (texts from contract « Frontend error messages ») and `VALID_EXPENSE_ERRORS`
- [X] T016 [P] Add `recurring: { list: (groupId) => [...queryKeys.expenses.byGroup(groupId), 'recurring', 'list'], detail: (groupId, id) => [...queryKeys.expenses.byGroup(groupId), 'recurring', 'detail', id] }` under `queryKeys.expenses` in `src/lib/query-keys.ts`, and `afterRecurringExpenseChange(queryClient, groupId)` in `src/lib/query-invalidations.ts` invalidating `queryKeys.expenses.byGroup(groupId)` (covers recurring list/detail and expenses) and `queryKeys.balances.byGroup(groupId)` (creation/reactivation may generate an expense) (R9)
- [X] T017 [P] Write failing tests in `src/features/expenses/utils/format-recurrence-rule.test.ts` for `formatRecurrenceRule(rule)`: « Tous les jours », « Toutes les semaines, le lundi » (…dimanche), « Tous les mois, le 1er », « Tous les mois, le 13 », « Tous les ans, le 27 septembre », « Tous les ans, le 1er janvier »; and `formatRecurrenceNote(rule)`: « Les mois plus courts, le dernier jour du mois. » for monthly ≥ 29, « Le 28 février les années non bissextiles. » for yearly 29/02, `null` otherwise (design-brief §5)
- [X] T018 Implement `src/features/expenses/utils/format-recurrence-rule.ts` exporting `formatRecurrenceRule`, `formatRecurrenceNote`, `formatDueDate(date, today)` (« Aujourd'hui » when equal, else `fr-FR` `{ day: 'numeric', month: 'short' }` with « 1er » for day one) (makes T017 pass; add `formatDueDate` cases to T017's file)
- [X] T019 [P] Create `src/features/expenses/components/RepeatIcon.tsx` **via skill impeccable** (design-brief §6 « Glyph »): one inline stroke SVG (circular arrows), `aria-hidden="true"`, `className` prop (default `w-4 h-4`), `currentColor`, no color of its own

**Checkpoint**: migration applied, `pnpm test` green on T006–T018.

---

## Phase 3: User Story 1 — Créer une récurrence (Priority: P1) 🎯 MVP

**Goal**: from the normal expense form, check « Répéter cette dépense », pick a frequency and
day, see the rule + next échéance, save a récurrence in this group.

**Independent Test**: create a monthly recurrence on the 13th; the summary and the success
toast show « Tous les mois, le 13 » / next échéance 13 <mois>; a `recurring_expenses` row
exists for this group only (quickstart §2 #1, #2, #4, #5).

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T020 [P] [US1] Extend `src/lib/schemas/expense.schema.test.ts` (create it if absent) for the form schema: `repeat: false` → no recurrence fields required and today's behaviour unchanged; `repeat: true` requires `frequency` ∈ `daily|weekly|monthly|yearly`, `dayOfWeek` 1–7 when weekly, `dayOfMonth` 1–31 when monthly; `date` < `todayIn(RECURRENCE_TIME_ZONE)` with `repeat: true` → error on `date` « La répétition commence au plus tôt aujourd'hui. Saisissez les dépenses passées une par une. »; with `repeat: false` a past date stays valid
- [X] T021 [P] [US1] Write failing tests in `src/features/expenses/components/RecurrenceFields.test.tsx` (Testing Library, inside a minimal RHF form): 4-item segmented control « Jour · Semaine · Mois · An » labelled « Fréquence »; Semaine shows 7 pills with accessible names « lundi … dimanche » in a group « Jour de la semaine »; Mois shows a « Le [select] de chaque mois » select with « 1er … 31 »; An shows « Le 27 septembre de chaque année » derived from the start date; the day defaults to the start date's day/weekday and follows it until the day control is touched; summary (`aria-live="polite"`) shows `formatRecurrenceRule` + « Prochaine échéance : 13 oct. 2026 » (or the « Première échéance : aujourd'hui — la dépense sera ajoutée dès l'enregistrement. » variant); monthly 31 shows the month-end note
- [X] T022 [P] [US1] Write failing tests in `src/features/expenses/components/ExpenseForm.test.tsx`: unchecked « Répéter cette dépense » → no recurrence field in the DOM, Date label « Date », submit calls `expensesApi.create` (US1-4, SC-006); checked → Date label « À partir du », « Répétition » fieldset visible, submit calls `recurringExpensesApi.create` with amount in cents, participants, `startDate` and the rule (yearly: `dayOfMonth`/`month` from the start date) and not `expensesApi.create`; checkbox hidden when editing an existing expense
- [X] T023 [P] [US1] Write failing route tests in `src/workers/routes/groups/recurring-expenses.test.ts` with Hono `app.request()`: mount `recurringExpensesRoutes` under a test `Hono<AppEnv>` whose middleware sets `db`/`user`/`membership` stubs; `vi.mock('../../services/recurring-expenses')`; `POST /` with an invalid body (missing `rule`, weekly without `dayOfWeek`, `amount: 0`, extra `groupId`) → 400 and service not called; valid body → service called with the parsed data and its `Response` returned as is (status 201 passthrough)

### Implementation for User Story 1

- [X] T024 [US1] Implement `createRecurringExpense(ctx, data)` in new `src/workers/services/recurring-expenses.ts` (context shape like `ExpenseContext`), DB access only: load the payer (group member row incl. `left_at`) and active person ids (`activePersonMembersCondition`, never the joint account, INV-R4), then call `validateRecurringExpenseInput({ mode: 'create', … , today: todayIn(RECURRENCE_TIME_ZONE, new Date()) })` and map `{ ok: false, error }` to 400; insert recurrence (`nextDueDate = firstDueDateOnOrAfter(rule, startDate)`, rule columns set per frequency, others null, `createdBy = ctx.currentMemberId`) and its participants in one `ctx.db.batch([...])` (participant rows chunked to stay ≤ 100 bound params); return 201 `{ id, nextDueDate, generatedExpenseId: null }` (generation wired in T038)
- [X] T025 [US1] Create `src/workers/routes/groups/recurring-expenses.ts` (`new Hono<AppEnv>()`) with `POST /` using `zValidator('json', createRecurringExpenseSchema)` → `createRecurringExpense`; mount it with `groupRouter.route('/recurring-expenses', recurringExpensesRoutes)` in `src/workers/routes/groups/index.ts` next to `/expenses` (makes T023 pass)
- [X] T026 [US1] Add `recurringExpensesApi.create(groupId, data)` to `src/features/expenses/api/index.ts` (`fetchWithAuth` POST `/groups/${groupId}/recurring-expenses`, same `{ error }` handling as `expensesApi.create`)
- [X] T027 [US1] Extend `src/lib/schemas/expense.schema.ts` with `repeat: z.boolean()`, `frequency`, `dayOfWeek`, `dayOfMonth` and a `superRefine` implementing T020 (makes T020 pass)
- [X] T028 [US1] Build `src/features/expenses/components/RecurrenceFields.tsx` **via skill impeccable** (design-brief §3, §5, §6 « Form, repeat block », « Weekday pills »): fieldset « Répétition » on Surface Sunken (8px radius, 16px padding); `SegmentedControl` (segmented variant) Fréquence; contextual line per frequency (weekly: pill `SegmentedControl` of 7 days; monthly: shared `Select` 1er…31 inside the sentence « Le … de chaque mois »; yearly: derived sentence; daily: nothing); rule summary with `RepeatIcon`, rule in Label weight, muted caption with next échéance computed by `firstDueDateOnOrAfter` + `formatDueDate`, note from `formatRecurrenceNote`; `aria-live="polite"` on the summary; props `{ control, startDate, disabled }` (makes T021 pass)
- [X] T029 [US1] Integrate the repeat block in `src/features/expenses/components/ExpenseForm.tsx` and `src/features/expenses/hooks/useExpenseForm.ts` **via skill impeccable** (design-brief §6): shared `Checkbox` « Répéter cette dépense » right under Date (create mode only); when checked Date label becomes « À partir du » and `RecurrenceFields` unfolds with the existing collapsible height/opacity transition (~150–200 ms ease-out, instant under `prefers-reduced-motion`); focus stays on the checkbox; unchecking hides but keeps values until close; submit routes to `recurringExpensesApi.create` when checked (build `RecurrenceRule` from form values; yearly from start date) else unchanged `create`; on success call `invalidations.afterRecurringExpenseChange` and show `toaster` success « Récurrence enregistrée » / description « Prochaine échéance le 13 oct. »; map `START_DATE_IN_PAST` / `INVALID_RULE` API errors to messages (makes T022 pass)

**Checkpoint**: US1 works alone — a recurrence is saved and confirmed, nothing is generated yet.

---

## Phase 4: User Story 2 — Ajout automatique des dépenses (Priority: P1) 🎯 MVP

**Goal**: at each échéance, without any member action, an ordinary expense is generated, once,
dated on the échéance; missed échéances are caught up; paused/archived are skipped.

**Independent Test**: daily recurrence; force `next_due_date` to D-2 and trigger the cron →
3 expenses (D-2, D-1, D) with the ↻ data link; trigger again → nothing; balances `isValid:
true` (quickstart §2 #3, #6, #7, #14).

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T030 [P] [US2] Extend `src/workers/services/recurring-expense-planning.test.ts` with `planRecurrenceRun({ rule, nextDueDate, today, status, groupArchived })`: active + not archived → `{ kind: 'generate', dates: dueDatesThrough(rule, nextDueDate, today, MAX_CATCH_UP_PER_RUN), nextDueDate: nextDueDateAfter(rule, lastDate) }` (daily D-2 → 3 dates; cap 31 leaves the cursor on the 32nd date); `nextDueDate > today` → `{ kind: 'none' }`; paused or archived → `{ kind: 'skip', nextDueDate: firstDueDateOnOrAfter(rule, addDays(today, 1)) }` (no retroactive catch-up, R5), including the creation/reactivation case « archived group, échéance today » → `skip` with the next échéance after today (FR-015)
- [X] T031 [US2] Extend the same test file with `buildGeneratedExpense({ recurrence, participants, activePersonIds, dueDate, now, newId })`: expense row `{ groupId, paidBy, amount, description, date: dueDate, recurringExpenseId, recurrenceDueDate: dueDate, createdBy: recurrence.createdBy, createdAt/updatedAt: now }`; participants filtered to `activePersonIds` keeping `customAmount` (R6); and an invariant test: for a 3-person group (coefficients 5000/3333/1667) and several generated rows (fair + custom), `calculateShares` shares sum to `amount` and the balance aggregation in `src/workers/services/shared/balance-calculation.ts` sums to exactly 0 (Principle I)
- [X] T032 [P] [US2] Write failing tests in `src/workers/services/recurring-expense-generation.test.ts` for `isUniqueRecurrenceConflict(error)` → `true` for a D1 error whose message contains `UNIQUE constraint failed: expenses.recurring_expense_id, expenses.recurrence_due_date`, `false` for other errors (R3)
- [X] T033 [US2] Extend `src/workers/services/recurring-expense-generation.test.ts` with `runRecurringExpenses(deps, now)` tested through fakes of `deps = { loadDue, loadParticipants, loadActivePersonIds, generate, skip, log }`: an error thrown for one recurrence does not stop the next ones and increments `errors`; a `skip` plan calls `skip` and never `generate`; a conflict result increments `conflicts`; the single `log` call receives `{ event: 'recurring_expenses.run', today, selected, generated, skipped, conflicts, errors }`; `today` = `todayIn(RECURRENCE_TIME_ZONE, now)`

### Implementation for User Story 2

- [X] T034 [US2] Implement `planRecurrenceRun` and `buildGeneratedExpense` in `src/workers/services/recurring-expense-planning.ts` (makes T030, T031 pass)
- [X] T035 [US2] Implement `src/workers/services/recurring-expense-generation.ts`: `isUniqueRecurrenceConflict` (makes T032 pass); `generateDueExpense(db, recurrence, participants, activePersonIds, dueDate, nextDueDate, now)` = one `db.batch([insert expense, insert participants (chunked under 100 bound params), update recurring_expenses set next_due_date/updated_at])`; on unique conflict run only the `next_due_date` update and return `{ generated: false, conflict: true }`, else `{ generated: true, expenseId }`
- [X] T036 [US2] Implement `runRecurringExpenses(deps, now)` in the same file with injected dependencies (makes T033 pass), plus `createRunDeps(db)` providing the real ones: `loadDue(today)` selects ≤ 100 recurrences with `deleted_at IS NULL AND disabled_at IS NULL AND next_due_date <= today` joined to `groups` (`archived_at`) and the payer member (`left_at`); `loadParticipants(ids)` via `selectByIdsChunked`; `loadActivePersonIds(groupIds)` via `activePersonMembersCondition`; `generate` = `generateDueExpense`; `skip` = `next_due_date` update; `log` = `console.log(JSON.stringify(...))`. Per recurrence: derive status (T011), `planRecurrenceRun`, generate each date sequentially or skip; `try/catch` per recurrence (contract §3)
- [X] T037 [US2] Fill `src/workers/scheduled.ts`: `ctx.waitUntil(runRecurringExpenses(createRunDeps(createDb(env.DB)), new Date(controller.scheduledTime)))` (no global state, Principle V)
- [X] T038 [US2] Wire synchronous generation into `createRecurringExpense` in `src/workers/services/recurring-expenses.ts` through the same decision as the job: after insert, read `groups.archived_at` and the derived status, call `planRecurrenceRun({ rule, nextDueDate, today, status, groupArchived })`; `generate` → `generateDueExpense` for today and return `{ id, nextDueDate: <after today>, generatedExpenseId }`; `skip` → only advance `next_due_date`, `generatedExpenseId: null` (R1, FR-015, contract POST 201)
- [X] T039 [US2] In `src/features/expenses/components/ExpenseForm.tsx`, when the create response has `generatedExpenseId`, show the toast variant « Dépense ajoutée, prochaine échéance le 27 oct. » (design-brief §6); `afterRecurringExpenseChange` already refreshes expenses and balances
- [X] T040 [US2] Validate locally with `pnpm wrangler dev --test-scheduled` and `curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=5+23,5,11+*+*+*"` per quickstart §2 #3, #6, #7, #11, #14; fix deviations

**Checkpoint**: US1 + US2 = MVP — recurrences are created and expenses appear on their own.
(Generated expenses are not yet visually marked: US3.)

---

## Phase 5: User Story 3 — Repérer les récurrences et leurs dépenses dans la liste (Priority: P2)

**Goal**: ↻ glyph on generated expenses, « Récurrentes » filter, « Récurrence » row in the
expense detail, collapsible « Récurrences » card above the filters, read-only recurrence detail.

**Independent Test**: with one recurrence and one generated expense, the expense row shows ↻
(screen reader « Dépense récurrente, »), its detail shows « Tous les mois, le 13 › » opening
the recurrence detail, the filter isolates it, the card shows « 1 récurrence · Prochaine
échéance : … » and remembers its expanded state (quickstart §2 #12, #13).

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T041 [P] [US3] Write failing tests in `src/features/expenses/store/recurrences-expanded.test.ts`: default `false`; `setRecurrencesExpanded(true)` persists under key `faircount:recurrences-expanded` and is read back; a throwing `localStorage` (getItem/setItem) falls back to in-memory state without crashing (pattern of `src/features/changelog/store/changelog-storage.ts`)
- [X] T042 [P] [US3] Write failing tests in `src/features/expenses/components/RecurrenceSection.test.tsx`: hidden with 0 recurrences; collapsed by default showing « 1 récurrence » / « 3 récurrences » and « Prochaine échéance : Loyer, 1er oct. » (soonest active), soft warning badge « 1 à revoir » when paused ones exist, « Aucune échéance prévue » when none active; trigger has `aria-expanded` and an accessible name with count and next échéance; expanded rows: active (description, « Tous les mois, le 1er · Payé par Alex », amount, next date « Aujourd'hui »/« 1er oct. »), paused (badge « À revoir », reason « Alex a quitté le groupe » / « Plus aucun·e participant·e actif·ve »), disabled (badge « Désactivée », muted); clicking a row calls `onSelect(id)`
- [X] T043 [P] [US3] Write failing tests in `src/features/expenses/components/ExpenseCard.test.tsx` (↻ + sr-only « Dépense récurrente, » only when `recurringExpenseId` is set) and `src/features/expenses/components/ExpenseDetail.test.tsx` (« Récurrence » row with a button « Tous les mois, le 13 » when `recurrence` is set and not deleted; plain text + caption « Récurrence supprimée » when `isDeleted`; no row for manual expenses)
- [X] T044 [P] [US3] Extend `src/workers/routes/groups/recurring-expenses.test.ts`: `GET /` calls `listRecurringExpenses`; `GET /:recurringExpenseId` with a non-UUID id → 404 `RECURRING_EXPENSE_NOT_FOUND` and service not called; valid UUID → `getRecurringExpense` called with it
- [X] T045 [P] [US3] Write failing tests in `src/features/expenses/components/RecurrenceDetail.test.tsx` (read-only): header with description, amount, rule sentence; status `Badge` only when not active; « Prochaine échéance » row only when active; paused → note with the cause (« Alex a quitté le groupe ») and « Choisissez une autre personne qui paie pour relancer la récurrence. », no warning icon; footer has only « Fermer »
- [X] T046 [P] [US3] Write failing tests in `src/features/expenses/components/ExpenseFilters.test.tsx`: pill « Toutes · Récurrentes » sets `filters.recurring` to `true` / `undefined` through `onFiltersChange`; the active-filter dot appears when `recurring` is set; « Effacer » resets it

### Implementation for User Story 3

- [X] T047 [P] [US3] Write failing route tests in `src/workers/routes/groups/expenses.test.ts` with Hono `app.request()` (same harness as `recurring-expenses.test.ts`: test `Hono<AppEnv>` with `db`/`user`/`membership` stubs, `vi.mock('../../services/expenses')`): `GET /?recurring=true` → `listExpenses` called with `params.recurring === true`; `?recurring=false`, `?recurring=1` and no param → `recurring === false`; existing params (`startDate`, `paidBy`, `search`) still passed through unchanged (constitution II: route change tested first)
- [X] T048 [US3] Extend `src/workers/services/recurring-expense-planning.test.ts` with `toRecurringExpenseView({ row, payer, participants, coefficients, activePersonIds, currentMemberId })`: `status`/`pausedReason` via `deriveRecurrenceStatus`; `nextDueDate` kept only when active, `null` otherwise; participants flagged `isActive`; `calculatedShare = calculateShares(amount, activeParticipants, coefficients)` for active ones, `0` for inactive; `isCurrentUser` set; rule rebuilt from columns (`frequency` + anchors)
- [X] T049 [US3] Implement `toRecurringExpenseView` in `src/workers/services/recurring-expense-planning.ts` (pure) (makes T048 pass)
- [X] T050 [US3] In `src/workers/services/expenses.ts` `listExpenses`: add param `recurring?: boolean` → `isNotNull(schema.expenses.recurringExpenseId)`; add `recurringExpenseId` to each summary. In `getExpense`: left join `recurring_expenses` on `expenses.recurring_expense_id` (no `deleted_at` filter) and return `recurrence: { id, rule, isDeleted: deletedAt !== null } | null` (rule rebuilt from columns). In `src/workers/routes/groups/expenses.ts` parse `recurring: c.req.query('recurring') === 'true'` (contract §2) (makes T047 pass)
- [X] T051 [US3] Implement `listRecurringExpenses(ctx)` and `getRecurringExpense(ctx, id)` in `src/workers/services/recurring-expenses.ts`: exclude `deleted_at` rows (404 `RECURRING_EXPENSE_NOT_FOUND` on get); DB access only — load rows, payer (`memberDisplayName`, `isJointAccount`, `left_at`), participants via `selectByIdsChunked`, current coefficients and active person ids, then map each with `toRecurringExpenseView` (T049) and order the list with `sortRecurrences`; detail adds `createdBy` (contract §1 GET). Add `GET /` and `GET /:recurringExpenseId` (UUID check like expenses routes) to `src/workers/routes/groups/recurring-expenses.ts` (makes T044 pass)
- [X] T052 [US3] Add `recurringExpensesApi.list(groupId)` and `.get(groupId, id)` and the `recurring` query param in `expensesApi.list` (`src/features/expenses/api/index.ts`); create `src/features/expenses/hooks/useRecurringExpenses.ts` (`useQuery` on `queryKeys.expenses.recurring.list`) and `src/features/expenses/hooks/useRecurringExpense.ts` (`useQuery` on `.detail`, enabled when id set)
- [X] T053 [US3] Implement `src/features/expenses/store/recurrences-expanded.ts` (`useSyncExternalStore`-friendly `getRecurrencesExpanded`/`setRecurrencesExpanded`/`subscribe`, try/catch around storage) (makes T041 pass)
- [X] T054 [US3] Build `src/features/expenses/components/RecurrenceSection.tsx` **via skill impeccable** (design-brief §3, §5, §6 « List card »): Ark UI `Collapsible` in a bordered 12px card; trigger row ≥ 44px with `RepeatIcon` (slate-muted, 20px), two-line text, optional `Badge` soft warning, rotating chevron; expanded rows with the expense-row rhythm (16px padding, hairline dividers); disabled rows muted with soft neutral `Badge` « Désactivée »; renders nothing while loading, on error or with 0 recurrences; props `{ groupId, currency, onSelect }`; state from T053 (makes T042 pass)
- [X] T055 [US3] Build the read-only `src/features/expenses/components/RecurrenceDetail.tsx` **via skill impeccable** (design-brief §6 « Recurrence detail dialog »): same Dialog shell as `ExpenseDetail`; header description, amount, `RepeatIcon` + `formatRecurrenceRule`, status `Badge` when not active; info rows Prochaine échéance (active only) · Payé par · Créée par; Répartition block like expenses (no extra note); paused: calm note on Surface Sunken with the cause and « Choisissez une autre personne qui paie pour relancer la récurrence. » (no warning icon); footer « Fermer » only (actions added in US4) (makes T045 pass)
- [X] T056 [US3] Render `RecurrenceSection` between the « Dépenses » header and `ExpenseFilters` in `src/features/expenses/components/ExpenseList.tsx` **via skill impeccable**; manage `selectedRecurrenceId` state opening `RecurrenceDetail`
- [X] T057 [P] [US3] Add the ↻ glyph to `src/features/expenses/components/ExpenseCard.tsx` **via skill impeccable** (design-brief §6 « Expense row glyph »): 14px `RepeatIcon` slate-muted inline before the date in the meta line + `<span className="sr-only">Dépense récurrente, </span>`, no row-height change (makes T043 card part pass)
- [X] T058 [US3] Add the « Récurrence » info row to `src/features/expenses/components/ExpenseDetail.tsx` **via skill impeccable**: Steady Blue text button « Tous les mois, le 13 › » swapping the dialog to `RecurrenceDetail` (via a new `onOpenRecurrence(id)` prop wired in `ExpenseList`); when `isDeleted`, plain text + muted caption « Récurrence supprimée » (makes T043 detail part pass)
- [X] T059 [US3] Add the « Type » field to `src/features/expenses/components/ExpenseFilters.tsx` **via skill impeccable**: pill `SegmentedControl` « Toutes · Récurrentes » bound to `filters.recurring`, counted in `hasActiveFilters` (dot) and reset by « Effacer »; include `filters.recurring` in the `ExpenseList` empty-state « Aucun résultat » condition (makes T046 pass)

**Checkpoint**: US3 works on top of US1/US2 data (or on seeded rows).

---

## Phase 6: User Story 4 — Gérer ses récurrences (Priority: P2)

**Goal**: any member can edit (future échéances only), deactivate/reactivate and delete a
recurrence; generated expenses stay editable/deletable and keep the ↻ after deletion.

**Independent Test**: raise a recurrence's amount → past generated expenses unchanged, next one
uses the new amount; deactivate → « Désactivée », cron generates nothing; reactivate → next
échéance ≥ today, no catch-up; delete → gone from the card, its expenses keep ↻ and show
« Récurrence supprimée » (quickstart §2 #8, #9, #10, #15).

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T060 [P] [US4] Extend `src/features/expenses/components/RecurrenceDetail.test.tsx` (failing first): active → main row « Fermer » + primary « Modifier », secondary row « Désactiver » + « Supprimer la récurrence »; disabled → primary « Réactiver », secondary « Modifier » + « Supprimer la récurrence »; « Désactiver »/« Réactiver » call the mutation without confirmation; « Supprimer la récurrence » opens a `ConfirmDialog` titled « Supprimer la récurrence » with description « Aucune nouvelle dépense ne sera ajoutée. Les dépenses déjà ajoutées restent dans la liste. » and confirm « Supprimer »
- [X] T061 [P] [US4] Extend `src/features/expenses/components/ExpenseForm.test.tsx`: recurrence edit mode (title « Modifier la récurrence », no checkbox, read-only « Prochaine échéance » line updating with the rule, info note « Les changements s'appliquent aux prochaines échéances. Les dépenses déjà ajoutées ne changent pas. », submit calls `recurringExpensesApi.update` with only changed fields); generated expense edit shows caption « Ajoutée automatiquement par une récurrence. La modifier ne change pas les prochaines. »
- [X] T062 [US4] Extend `src/workers/routes/groups/recurring-expenses.test.ts`: `PATCH` with an empty body → 400; `PATCH` with `startDate` or `groupId` → 400 (strict schema, FR-009); valid `PATCH` → `updateRecurringExpense`; `POST /:id/deactivate`, `POST /:id/reactivate`, `DELETE /:id` call their service; non-UUID id on each → 404 `RECURRING_EXPENSE_NOT_FOUND`

### Implementation for User Story 4

- [X] T063 [US4] Implement in `src/workers/services/recurring-expenses.ts` (DB access only, rules in `validateRecurringExpenseInput` / `planRecurrenceRun`): `updateRecurringExpense` (404 if deleted/unknown; load `existing` with its participants and call `validateRecurringExpenseInput({ mode: 'update', data, existing, … })` — an `amount`-only change is validated against the stored participants; participants replaced when provided (chunked inserts); `nextDueDate` from the validator; never touches `expenses`; one `db.batch`); `deactivateRecurringExpense` (set `disabled_at`, idempotent); `reactivateRecurringExpense` (clear `disabled_at`, `recomputeNextDueDate` from T014, then the same decision as T038: `planRecurrenceRun` with derived status and `groupArchived` — `generate` → today's expense via `generateDueExpense`, unique index prevents duplicates; `skip` → advance only; return `{ success, nextDueDate, generatedExpenseId }`); `deleteRecurringExpense` (set `deleted_at`; generated expenses untouched) (contract §1)
- [X] T064 [US4] Add routes to `src/workers/routes/groups/recurring-expenses.ts`: `PATCH /:recurringExpenseId` (`zValidator('json', updateRecurringExpenseSchema)`), `POST /:recurringExpenseId/deactivate`, `POST /:recurringExpenseId/reactivate`, `DELETE /:recurringExpenseId`; UUID guard → 404 `RECURRING_EXPENSE_NOT_FOUND`; no ownership check (FR-021) (makes T062 pass)
- [X] T065 [US4] Add `recurringExpensesApi.update/deactivate/reactivate/delete` in `src/features/expenses/api/index.ts` and mutations in `src/features/expenses/hooks/useRecurringExpense.ts` calling `invalidations.afterRecurringExpenseChange` on success, with toasts « Récurrence désactivée », « Récurrence réactivée » (+ « Prochaine échéance le … »), « Récurrence supprimée »
- [X] T066 [US4] Add the two-tier actions to `src/features/expenses/components/RecurrenceDetail.tsx` **via skill impeccable** (design-brief §6 « Detail actions », « Désactiver / Réactiver », « Delete confirmation »): main row outline « Fermer » + primary « Modifier » (or « Réactiver » when disabled); secondary row below a hairline with ghost « Désactiver » (or « Modifier » when disabled) and ghost-danger « Supprimer la récurrence »; deactivate/reactivate immediate, dialog stays open and updates; delete through shared `ConfirmDialog`, closes the detail on success (makes T060 pass)
- [X] T067 [US4] Add the recurrence edit mode to `src/features/expenses/components/ExpenseForm.tsx` / `src/features/expenses/hooks/useExpenseForm.ts` **via skill impeccable** (design-brief §6 « Form, recurrence edit mode », « Form, generated expense edit »): prop `recurrence?: RecurringExpenseDetail`; title « Modifier la récurrence »; `RecurrenceFields` always shown without checkbox; « À partir du » replaced by read-only « Prochaine échéance » (`recomputeNextDueDate` preview); info note on Steady Blue Wash above actions; submit → `recurringExpensesApi.update` with changed fields; for an expense with `recurrence` set, muted caption under the title (makes T061 pass); open it from `RecurrenceDetail` « Modifier »
- [X] T068 [US4] In `src/features/expenses/components/ExpenseList.tsx`, when the expense being deleted has `recurringExpenseId`, append « Seule cette dépense est supprimée ; la récurrence continue. » to the existing delete `ConfirmDialog` description (design-brief §6 « Expense detail (generated) »)

**Checkpoint**: all four stories work independently and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T069 [P] Bump `"version"` from `0.2.0` to `0.3.0` in `package.json` and add at the top of `src/features/changelog/data/changelog.ts` `{ version: '0.3.0', date: '<merge day>', changes: [{ category: 'feature', text: "Programmez des dépenses récurrentes : elles s'ajoutent toutes seules au jour prévu" }] }` (French, non-technical, inclusive; `changelog.test.ts` must pass) (R10)
- [X] T070 [P] Document in `CLAUDE.md`: Database Schema → `recurring-expenses.ts` (récurrence model, `expenses.recurring_expense_id` + partial unique index, soft delete keeps the link); Backend Structure → `src/workers/scheduled.ts` + cron `5 23,5,11 * * *` and `recurring-expenses` sub-router; update `src/features/expenses/FEATURE.md` with the recurrence components/hooks
- [X] T071 [P] Run the impeccable detector once on the changed UI files (`impeccable detect --json` via the impeccable skill launcher) on `src/features/expenses/components`; fix every finding in one batch
- [X] T072 Run `pnpm check`, `pnpm tsc --noEmit` and `pnpm test`; fix all failures
- [X] T073 Walk through quickstart.md §2 (#1–#15) and §3 (keyboard, screen reader, 320 px / ≥ 768 px, light/dark, reduced motion) on `pnpm dev` + `pnpm wrangler dev --test-scheduled`; measure SC-001 (a monthly recurrence created in < 1 min with at most 3 interactions more than a plain expense: checkbox, frequency, day); record deviations as follow-up tasks
  - 2026-09-27 — API walkthrough on the real local worker + D1 (§2 #3, #5–#10, #12, #14: catch-up, idempotence, deleted expense not regenerated, paused skip, balances `isValid`, sum 0) and browser pass in Chrome (§2 #1, #2, #13 and §3: 320 px, 375 px, 1280 px, light and dark, accessibility tree names, focus return). Fixes made during the pass: edit no longer announces today's already generated échéance; card trigger shows the date before the description; recurrence meta lines wrap instead of truncating; weekday/frequency segments fit 320 px (`SegmentedControl` sizes `sm`/`xs`); list and card load together (no layout shift).
  - Not covered here: a real screen reader session and `prefers-reduced-motion` (animations are disabled via `motion-reduce:` classes, not observed).
- [ ] T074 After the production deploy, check the `5 23,5,11 * * *` trigger in the Workers dashboard and one `recurring_expenses.run` log line (quickstart §4)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependency.
- **Foundational (Phase 2)**: T003 → T004 → T005 (migration). T006 → T007; T008 → T009 (needs
  T007 for the `RecurrenceRule` type); T010 → T011; T012 → T013 → T014 (T014 needs T007, T009, T012); T017 → T018; T015 needs T007. Blocks all
  stories.
- **US1 (Phase 3)**: after Phase 2. T023 before T025; T024 → T025; T026, T027 in parallel; T028 needs T018,
  T019; T029 needs T026–T028.
- **US2 (Phase 4)**: after Phase 2 and T024 (a recurrence must exist). T034 → T035 → T036 (needs T033) →
  T037; T038 needs T034, T035; T039 needs T038 and T029; T040 last.
- **US3 (Phase 5)**: after Phase 2; needs US1/US2 data to be meaningful (or seeded rows).
  T047 before T050; T048 → T049 → T051; T050, T051 backend in parallel; T052 needs T051; T054 needs T052, T053; T055 needs T052;
  T056 needs T054, T055; T058 needs T055; T059 after T056 (both edit `ExpenseList.tsx`).
- **US4 (Phase 6)**: after US3 (actions live in `RecurrenceDetail`, T055). T063 (needs T014) →
  T064 (needs T062); T065 needs T064; T066 needs T055, T065; T067 needs T029, T065.
- **Polish (Phase 7)**: after the desired stories; T069 in the same PR as the feature.

### Within Each User Story

- Tests first and failing, then implementation (constitution II).
- Pure functions → services → routes → API client/hooks → components → integration.

### Parallel Opportunities

- Foundational: T006, T008, T010, T012, T015, T016, T017, T019 in parallel (different files);
  then T007, T009, T011, T018; then T013 → T014.
- US1: T020, T021, T022, T023 in parallel; T026 and T027 in parallel.
- US2: T030 and T032 in parallel; T031 after T030 (same file), T033 after T032 (same file).
- US3: T041, T042, T043, T044, T045, T046, T047 in parallel; T048 after T030/T031 (same file); T050 and T051 in parallel; T057 in
  parallel with T054–T056.
- US4: T060, T061 in parallel; T062 after T044 (same file).
- Polish: T069, T070, T071 in parallel.

---

## Parallel Example: Foundational

```bash
Task: "Write failing tests in src/lib/recurrence.test.ts"
Task: "Write failing tests in src/lib/schemas/recurring-expense.schema.test.ts"
Task: "Write failing tests in src/workers/services/recurring-expense-planning.test.ts (status, sort)"
Task: "Write failing tests in src/features/expenses/utils/format-recurrence-rule.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Write failing tests in src/features/expenses/store/recurrences-expanded.test.ts"
Task: "Write failing tests in src/features/expenses/components/RecurrenceSection.test.tsx"
Task: "Write failing tests in ExpenseCard.test.tsx and ExpenseDetail.test.tsx"
Task: "Write failing tests in RecurrenceDetail.test.tsx and ExpenseFilters.test.tsx"
# then
Task: "Add recurring filter + recurrence block to expenses service (T050)"
Task: "Implement listRecurringExpenses/getRecurringExpense (T051)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 Setup → Phase 2 Foundational (migration + calendar maths green)
2. Phase 3 US1 → recurrences can be created and confirmed
3. Phase 4 US2 → expenses generated by the cron and at creation when due today
4. Stop and validate quickstart §2 #1–#7, #11, #14

### Incremental Delivery

1. Setup + Foundational → data model and calendar engine
2. + US1 → create (not shippable alone: nothing generated)
3. + US2 → MVP value (automatic expenses)
4. + US3 → visibility (↻, filter, card, read-only detail)
5. + US4 → management (edit, désactiver/réactiver, supprimer)
6. Polish → release 0.3.0, docs, detector, full quickstart

The feature ships as a single release (0.3.0): do not merge before US3 so generated expenses
are never indistinguishable from manual ones in production, and preferably with US4 so a
wrong recurrence can be stopped from the UI.

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Commit after each task or logical group (Conventional Commits, via the git-commit agent)
- Verify each test fails before implementing (constitution II)
- Barrel `src/features/expenses/index.ts`: add exports only if consumed outside the feature
  (none planned)
