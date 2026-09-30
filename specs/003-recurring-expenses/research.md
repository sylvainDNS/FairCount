# Research: Dépenses récurrentes

**Feature**: [spec.md](./spec.md) · **Design**: [design-brief.md](./design-brief.md) · **Date**: 2026-09-27

Each decision: Decision / Rationale / Alternatives considered.

## R1 — Generation trigger: Cloudflare Cron Trigger, daily + 2 retries

**Decision**: add a `scheduled` handler to the worker, fired by one Cron Trigger
`5 23,5,11 * * *` (UTC). The 23:05 UTC run does the day's work; 05:05 and 11:05 UTC are
retries that normally find nothing due. Each run materialises every échéance
`<= today (Europe/Paris)` of every active recurrence. Creating (or reactivating) a recurrence
whose first échéance is today also generates the expense synchronously in the same request
(same generation function), so it shows up immediately.

**Rationale**: the business granularity is the calendar day (an échéance is a date), so one
run per day is enough. 23:05 UTC is always after midnight in Paris — 00:05 CET in winter
(UTC+1), 01:05 CEST in summer (UTC+2) — so a single fixed UTC time works across DST.
FR-011 / SC-002 require expenses to appear on the due day "without any member action":
generation cannot depend on someone opening the app. The two morning retries keep SC-002
("le jour même") when the main run fails (error, deploy at the wrong moment, missed
trigger); without them a failure would only be caught up the next night. The job is
idempotent (R3), so extra runs are harmless. Cron Triggers are available on the Workers free
plan and need no extra binding.

**Alternatives considered**:
- *Lazy materialisation on read* (generate due expenses when a group's expenses/balances are
  requested): no infra, but every read path (group list `myBalance`, balances, stats,
  settlements suggestions, expense list) would need the hook, and a group nobody opens would
  show stale balances to the first visitor. Rejected.
- *Hourly cron* (`5 * * * *`): same result with 24 runs/day, 21+ of them useless; the day is
  the real granularity. Rejected (user decision 2026-09-27).
- *Single daily run* (`5 23 * * *`): simplest, but a failed run delays that day's expenses by
  24 h (still caught up with their original date, FR-012). Rejected in favour of 2 cheap
  retries.
- *Durable Object alarms / Workflows per recurrence*: far heavier than needed for ~dozens of
  recurrences. Rejected (Principle V: keep the edge simple).

## R2 — Time zone and "today"

**Decision**: a single constant `RECURRENCE_TIME_ZONE = 'Europe/Paris'`; "today" is computed
with `Intl.DateTimeFormat('en-CA', { timeZone })` → `YYYY-MM-DD`. All rule arithmetic works on
calendar dates (`YYYY-MM-DD` strings / UTC-midnight `Date`), never on instants.

**Rationale**: spec assumption (Europe/Paris reference). `expenses.date` is already a calendar
date string, so generated expenses need no instant at all. `Intl` with IANA zones is supported
in Workers and browsers; the same function feeds the frontend preview (« Prochaine échéance »)
so client and server agree even if the device is in another zone.

**Alternatives considered**: per-group time zone column — out of scope (single-locale product
today); UTC days — would generate the 1st of the month at 01:00/02:00 Paris the previous
evening. Rejected.

## R3 — Idempotence and atomicity of a generation

**Decision**:
- `expenses` gains `recurring_expense_id` (nullable FK) and `recurrence_due_date` (nullable
  `YYYY-MM-DD`), with a **partial unique index** on `(recurring_expense_id, recurrence_due_date)`
  `WHERE recurring_expense_id IS NOT NULL`.
- One generation = one **D1 batch** (`db.batch([...])`, transactional): insert expense, insert
  its participants, advance `recurring_expenses.next_due_date`. If the expense insert hits the
  unique index (échéance already generated — concurrent run, retry, or expense soft-deleted by
  a member), the batch rolls back; the job then only advances `next_due_date`.

**Rationale**: FR-012 (at most one expense per échéance, even with concurrent runs) and FR-023
(a deleted generated expense is never regenerated: soft-deleted rows keep occupying the unique
slot). D1 batches are executed as a single transaction, so an expense can never exist without
its participants or be generated without the pointer moving. The index is partial, so manual
expenses (both columns NULL) are unaffected.

**Alternatives considered**: optimistic `UPDATE … WHERE next_due_date = :current` claim before
inserting — two round trips and still needs a uniqueness guard for "deleted must not come
back". A separate `recurrence_runs` log table — redundant with the expense row itself.
Rejected.

## R4 — Rule model and date arithmetic (pure, shared)

**Decision**: rule = `frequency` ∈ `daily | weekly | monthly | yearly` + anchors:
`dayOfWeek` (1–7, ISO, Monday = 1) for weekly; `dayOfMonth` (1–31) for monthly and yearly;
`month` (1–12) for yearly (taken from the start date, FR-005). Pure functions in
`src/lib/recurrence.ts`, imported by both the worker and the frontend:
- `todayIn(timeZone, now)`;
- `firstDueDateOnOrAfter(rule, date)` — clamps `dayOfMonth` to the month's last day (FR-006;
  29 Feb → 28 Feb on non-leap years);
- `nextDueDateAfter(rule, date)`;
- `dueDatesThrough(rule, from, today, max)` — catch-up list, capped.
The French sentence (« Tous les mois, le 1er ») is a separate pure formatter on the frontend
(`formatRecurrenceRule`), since only the UI needs it.

**Rationale**: Principle II requires tests before logic; putting all calendar edge cases
(month ends, leap years, DST-free date math, weekday computation) in pure functions makes them
exhaustively unit-testable without a D1 harness (same approach as feature 001). Sharing the
module guarantees the preview shown before saving equals what the job will do.

**Alternatives considered**: RRULE (RFC 5545) strings + a library — overkill for 4 unit
frequencies, adds bundle weight; cron expressions — unreadable, no month-end clamping.
Rejected.

## R5 — Recurrence status: stored vs derived

**Decision**:
- Stored: `disabled_at` (manual « Désactiver »), `deleted_at` (soft delete, R8).
- Derived at read time and in the job: **paused « À revoir »** when the payer member has
  `left_at` set (covers a person who left and a disabled joint account) or when none of the
  recurrence's participants is an active person. `pausedReason` ∈ `payer_inactive |
  no_active_participant`.
- Status exposed by the API: `active | paused | disabled` (deleted ones are never listed).

**Rationale**: the pause conditions already live in `group_members.left_at`; deriving avoids
touching every leave/disable code path (members leave, joint-account disable, member removal)
and cannot drift. Manual deactivation is a user decision and must be stored.

**Job behaviour for non-generating states** (prevents retroactive catch-up, FR-008a spirit):
when the job meets a due recurrence that is paused, or whose group is archived, it **advances
`next_due_date` past today without generating**. So re-enabling the joint account or
unarchiving the group never floods the list with old expenses. Disabled and deleted
recurrences are not selected at all; reactivation recomputes `next_due_date` from today.

**Alternatives considered**: storing `paused` and updating it from each member/joint-account
mutation — more writes, easy to miss a path. Rejected.

## R6 — Participants of a generated expense

**Decision**: a generated expense copies the recurrence's participants **filtered to active
persons** at generation time (spec: a departed beneficiary is excluded), with their
`customAmount`. Shares are then computed like any expense — i.e. by the existing
`calculateShares` at read time with current coefficients. `createdBy` = the recurrence's
`created_by` member.

**Rationale**: FR-013/FR-014 — generated expenses are indistinguishable from manual ones. The
app never freezes coefficients (every read recomputes shares with current coefficients), so no
special handling. Reusing the payer/participant validation of `createExpense` keeps invariants
(joint account never a beneficiary, INV-4 of feature 001).

**Edge**: if filtering removes members whose custom amounts made the split valid, the
remaining custom amounts can only decrease, so `CUSTOM_AMOUNTS_EXCEED_TOTAL` cannot newly
trigger. If no active participant remains → paused (R5).

## R7 — API shape

**Decision**: new sub-router `/api/groups/:id/recurring-expenses` (list, create, get, patch,
deactivate, reactivate, delete), mounted under the existing membership middleware. Expense
payloads gain `recurringExpenseId` (summary) and `recurrence` (detail, includes the rule and
`isDeleted`). Expense list gains a `recurring=true` filter. Full contract:
[contracts/recurring-expenses-api.md](./contracts/recurring-expenses-api.md).

**Rationale**: a recurrence is its own resource with its own lifecycle; overloading
`POST /expenses` with an optional `recurrence` block would mix two response shapes. Explicit
`deactivate`/`reactivate` actions match the two-tier UI and keep PATCH purely about content.

## R8 — Deletion = soft delete, glyph kept

**Decision**: `DELETE` sets `recurring_expenses.deleted_at`; generated expenses keep their
`recurring_expense_id`. Expense detail returns the rule with `isDeleted: true`; the recurrence
itself answers 404 on GET/PATCH/actions once deleted and is excluded from the list and the job.

**Rationale**: user decision (2026-09-27): generated expenses keep their indicator and rule
after deletion. Soft delete also keeps the FK valid and the unique slots occupied.

## R9 — Frontend placement

**Decision**: everything stays in `src/features/expenses/` (new `Recurrence*` components,
`useRecurringExpenses`/`useRecurringExpense` hooks, `recurringExpensesApi`). No new feature
folder. Query keys under `queryKeys.expenses.recurring.*`; one invalidation
`afterRecurringExpenseChange` (recurring list/detail + expenses of the group + balances, since
creation or reactivation can generate an expense).

**Rationale**: the repeat block lives in `ExpenseForm`, the section in `ExpenseList`, and the
recurrence edit mode reuses `ExpenseForm` — a separate feature would import expenses and be
imported by it (cycle). Principle III: one cohesive feature.

**Expanded/collapsed state** of the section: `localStorage` key
`faircount:recurrences-expanded` (device-wide, default collapsed), read/write guarded with
try/catch like `changelog-storage`.

## R10 — Release

**Decision**: user-visible → `package.json` 0.2.0 → **0.3.0** (MINOR, contains a Nouveauté) and
a « Nouveauté » entry at the head of `src/features/changelog/data/changelog.ts`, same PR.

**Rationale**: constitution v1.1.0, « Releases et changelog ».

## Verification notes for implementation

- Confirm `triggers.crons` is inherited by `[env.production]` in `wrangler.toml` (inheritable
  key); otherwise duplicate it under `[env.production.triggers]`.
- Local test: `wrangler dev --test-scheduled`, then
  `curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=5+23,5,11+*+*+*"`.
