# API Contract: Dépenses récurrentes

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

All routes are mounted under `/api/groups/:id` (existing `auth` + `membership` middleware — any
active member may act, FR-021, no ownership check). Errors use the existing `{ "error": "CODE" }`
format. Amounts in cents, dates `YYYY-MM-DD`, time zone Europe/Paris.

## Shared shapes

```ts
type RecurrenceRule =
  | { frequency: 'daily' }
  | { frequency: 'weekly'; dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 }   // ISO, 1 = Monday
  | { frequency: 'monthly'; dayOfMonth: number }                   // 1–31
  | { frequency: 'yearly'; dayOfMonth: number; month: number };    // from startDate, 1–12

type RecurrenceStatus = 'active' | 'paused' | 'disabled';
type PausedReason = 'payer_inactive' | 'no_active_participant';
```

`RecurrenceRule` is one Zod discriminated union (`src/lib/schemas/recurring-expense.schema.ts`),
used by the route validator and, through the form schema, by the frontend.

## 1. Recurrences — new sub-router `/recurring-expenses`

### GET /api/groups/:id/recurring-expenses

All non-deleted recurrences of the group, ordered: active by `nextDueDate` ASC, then paused,
then disabled.

**200**

```json
{
  "recurringExpenses": [
    {
      "id": "uuid",
      "description": "Loyer",
      "amount": 85000,
      "rule": { "frequency": "monthly", "dayOfMonth": 1 },
      "startDate": "2026-10-01",
      "nextDueDate": "2026-10-01",
      "status": "active",
      "pausedReason": null,
      "paidBy": { "id": "uuid", "name": "Alex", "isJointAccount": false, "isActive": true }
    }
  ]
}
```

`nextDueDate` is `null` when `status` is `paused` or `disabled` (UI shows no date).

### POST /api/groups/:id/recurring-expenses

Creates a recurrence. If the first échéance is today, the corresponding expense is generated in
the same request.

**Request**

```json
{
  "amount": 85000,
  "description": "Loyer",
  "paidBy": "uuid",
  "participants": [{ "memberId": "uuid", "customAmount": null }],
  "startDate": "2026-10-01",
  "rule": { "frequency": "monthly", "dayOfMonth": 1 }
}
```

Server rules: `rule.month`/`rule.dayOfMonth` of a `yearly` rule MUST equal `startDate`'s month
and day (else `INVALID_RULE`); `startDate` ≥ today (else `START_DATE_IN_PAST`); payer and
participants validated exactly as for `POST /expenses`.

**201**

```json
{ "id": "uuid", "nextDueDate": "2026-11-01", "generatedExpenseId": "uuid-or-null" }
```

`nextDueDate` is the échéance after any expense generated during the request.

**400**: `INVALID_AMOUNT`, `INVALID_DESCRIPTION`, `INVALID_DATE`, `START_DATE_IN_PAST`,
`INVALID_RULE`, `INVALID_PAYER`, `NO_PARTICIPANTS`, `INVALID_PARTICIPANT`,
`CUSTOM_AMOUNTS_EXCEED_TOTAL`.

### GET /api/groups/:id/recurring-expenses/:recurringExpenseId

**200** — list item fields plus:

```json
{
  "createdBy": { "id": "uuid", "name": "Camille", "isCurrentUser": false },
  "participants": [
    {
      "memberId": "uuid",
      "memberName": "Alex",
      "customAmount": null,
      "calculatedShare": 42500,
      "isActive": true,
      "isCurrentUser": true
    }
  ]
}
```

`calculatedShare` = `calculateShares(amount, activeParticipants, currentCoefficients)` — what an
expense generated now would split into. Inactive participants are listed with `isActive:false`
and `calculatedShare: 0` (they will be excluded at generation).

**404** `RECURRING_EXPENSE_NOT_FOUND` (unknown, other group, or soft-deleted).

### PATCH /api/groups/:id/recurring-expenses/:recurringExpenseId

Partial update of content and rule (`startDate` is immutable). Applies to future échéances
only (FR-022): generated expenses are not touched. Recomputes
`nextDueDate = firstDueDateOnOrAfter(rule, max(today, startDate))`. Does not change
`disabled` state.

**Request** (all optional, ≥ 1 field): `amount`, `description`, `paidBy`, `participants`,
`rule` (same shapes as POST; a new `yearly` rule keeps the start date's month/day).

A `paidBy` equal to the stored one is accepted even if that member is now inactive (mirrors
`updateExpense`, lets people edit other fields of a paused recurrence); a changed payer must be
active.

**200** `{ "success": true, "nextDueDate": "2026-11-01" }` · **400** as POST (minus
`START_DATE_IN_PAST`) · **404** `RECURRING_EXPENSE_NOT_FOUND`.

### POST /api/groups/:id/recurring-expenses/:recurringExpenseId/deactivate

Sets `disabled_at`. Idempotent. **200** `{ "success": true }` · **404**.

### POST /api/groups/:id/recurring-expenses/:recurringExpenseId/reactivate

Clears `disabled_at`, sets `nextDueDate = firstDueDateOnOrAfter(rule, max(today, startDate))`.
If that date is today and the recurrence is not paused, generates today's expense in the same
request (unique index prevents a duplicate). Idempotent on an active recurrence.

**200** `{ "success": true, "nextDueDate": "2026-10-13", "generatedExpenseId": null }` · **404**.

### DELETE /api/groups/:id/recurring-expenses/:recurringExpenseId

Soft delete (`deleted_at`). Generated expenses keep `recurringExpenseId` (R8).
**200** `{ "success": true }` · **404**.

## 2. Changes to existing expense endpoints

### GET /api/groups/:id/expenses

- New query param `recurring=true` → only expenses with `recurringExpenseId` not null
  (including those of deleted recurrences). Any other value is ignored.
- Each summary gains `"recurringExpenseId": "uuid" | null`.

### GET /api/groups/:id/expenses/:expenseId

Gains:

```json
"recurrence": {
  "id": "uuid",
  "rule": { "frequency": "monthly", "dayOfMonth": 13 },
  "isDeleted": false
}
```

`null` for manual expenses. Returned even when the recurrence is soft-deleted
(`isDeleted: true`), so the UI can show « Tous les mois, le 13 · Récurrence supprimée ».

### POST / PATCH / DELETE /api/groups/:id/expenses…

Unchanged. A generated expense is edited/deleted like any other (FR-023); its
`recurringExpenseId` and `recurrence_due_date` are not writable through the API.

## 3. Scheduled job (not HTTP)

Worker `scheduled` handler, cron `5 23,5,11 * * *` (UTC; 23:05 = after midnight Paris all year, then 2 retries): see [data-model.md](../data-model.md#state-transitions)
job table. Structured log per run: `{ event: 'recurring_expenses.run', today, selected,
generated, skipped, conflicts, errors }`. A failure on one recurrence is logged and does not
abort the others.

## Frontend error messages (`EXPENSE_ERROR_MESSAGES` additions)

| Code | Message |
|------|---------|
| `RECURRING_EXPENSE_NOT_FOUND` | « Récurrence introuvable » |
| `START_DATE_IN_PAST` | « La répétition commence au plus tôt aujourd'hui. Saisissez les dépenses passées une par une. » |
| `INVALID_RULE` | « La fréquence est invalide » |
