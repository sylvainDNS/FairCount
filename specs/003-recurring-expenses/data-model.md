# Data Model: Dépenses récurrentes

**Feature**: [spec.md](./spec.md) · **Decisions**: [research.md](./research.md)

One additive migration (`drizzle/migrations/0008_*.sql`): two new tables, two nullable columns
and one partial unique index on `expenses`. No existing row changes.

## New table `recurring_expenses` (Récurrence)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | text PK | no | UUID |
| `group_id` | text FK → `groups.id` ON DELETE CASCADE | no | FR-009, fixed at creation |
| `paid_by` | text FK → `group_members.id` | no | person or joint account |
| `amount` | integer | no | cents, > 0 |
| `description` | text | no | 1–500 chars (same as expenses) |
| `frequency` | text enum `daily\|weekly\|monthly\|yearly` | no | |
| `day_of_week` | integer | yes | 1–7 (ISO, Monday = 1); set iff `weekly` |
| `day_of_month` | integer | yes | 1–31; set iff `monthly` or `yearly` |
| `month` | integer | yes | 1–12; set iff `yearly` (from start date) |
| `start_date` | text `YYYY-MM-DD` | no | ≥ today (Europe/Paris) at creation, FR-008a; immutable |
| `next_due_date` | text `YYYY-MM-DD` | no | next échéance to materialise; job cursor |
| `disabled_at` | integer ms | yes | manual deactivation (« Désactivée ») |
| `deleted_at` | integer ms | yes | soft delete (R8) |
| `created_by` | text FK → `group_members.id` | no | also `createdBy` of generated expenses |
| `created_at` / `updated_at` | integer ms | no | |

Indexes: `idx_recurring_expenses_group` on `(group_id)`; `idx_recurring_expenses_due` on
`(next_due_date)` (job scan).

## New table `recurring_expense_participants`

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | text PK | no | UUID |
| `recurring_expense_id` | text FK → `recurring_expenses.id` ON DELETE CASCADE | no | |
| `member_id` | text FK → `group_members.id` | no | active person at write time (never joint account) |
| `custom_amount` | integer | yes | null = fair share; cents otherwise |

Mirrors `expense_participants` so validation (`validateParticipants`) and share calculation
(`calculateShares`) are reused as is.

## Changes to `expenses` (Dépense générée)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `recurring_expense_id` | text FK → `recurring_expenses.id` | yes | null for manual expenses; kept after the recurrence is soft-deleted |
| `recurrence_due_date` | text `YYYY-MM-DD` | yes | the échéance that produced it; equals `date` at generation, stays even if a member later edits `date` |

`uq_expenses_recurrence_due` UNIQUE `(recurring_expense_id, recurrence_due_date)`
`WHERE recurring_expense_id IS NOT NULL` — guarantees one expense per échéance, including
soft-deleted expenses (FR-012, FR-023).

## Derived values (not stored)

- **Échéance**: computed from rule + `next_due_date` (`src/lib/recurrence.ts`).
- **status** (API): `disabled` if `disabled_at` set; else `paused` if payer `left_at` is set or
  no participant is an active person; else `active`. Deleted rows are never exposed as
  recurrences.
- **pausedReason**: `payer_inactive` | `no_active_participant` (payer check first).

## Validation rules

| Rule | Source | Where |
|------|--------|-------|
| `frequency` ↔ anchors consistency (weekly⇒dayOfWeek; monthly⇒dayOfMonth; yearly⇒dayOfMonth+month from startDate; others null) | FR-002–FR-005 | Zod discriminated union (route + form) |
| `start_date` ≥ today Europe/Paris | FR-008a | Zod refine (form) + service check (`START_DATE_IN_PAST`) |
| payer active member of the group | FR-010 | service (same query as `createExpense`) |
| participants: ≥ 1, active persons, custom total ≤ amount | FR-010, edge case | reuse `validateParticipants` |
| any active member may mutate | FR-021 | membership middleware only, no ownership check |

## State transitions

```text
            create (start ≥ today)
                    │
                    ▼
   ┌──────────►  ACTIVE  ──── payer leaves / no active participant ───►  PAUSED (derived)
   │              │  ▲                                                     │
   │   deactivate │  │ reactivate (next_due = first ≥ today)               │ edit payer/participants
   │              ▼  │                                                     │ (next_due recomputed ≥ today)
   │           DISABLED ◄──────────────── deactivate ──────────────────────┘
   │              │
   └── edit ──────┤ (content editable in every state; edit never changes state by itself,
                  │  except that fixing the cause of a pause makes it ACTIVE again)
                  ▼
   delete (any state, confirmed) ──► DELETED (soft; hidden; generated expenses keep glyph + rule)
```

Job rules per run (`today` = Europe/Paris):

| State of a recurrence with `next_due_date <= today` | Action |
|---|---|
| active, group not archived | generate every due date `<= today` (capped per run), one batch each, then `next_due_date = nextDueDateAfter(last)` |
| paused, or group archived | no expense; `next_due_date = firstDueDateOnOrAfter(rule, today + 1)` |
| disabled / deleted | not selected |

Edits recompute `next_due_date = firstDueDateOnOrAfter(rule, max(today, start_date))`; the
unique index absorbs the case where today's échéance was already generated.

## Invariants

- **INV-R1** At most one expense (deleted or not) per `(recurring_expense_id, recurrence_due_date)`.
- **INV-R2** No generated expense has `recurrence_due_date < recurring_expenses.start_date`.
- **INV-R3** A recurrence never moves a balance; only its generated expenses do, through the
  existing balance engine (group sum stays 0 — Principle I).
- **INV-R4** The joint account is never a participant of a recurrence (inherits feature 001
  INV-4).
