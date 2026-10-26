---

description: "Task list for feature 004-fix-dialog-instant-close"
---

# Tasks: Correction des fenêtres qui se ferment instantanément

**Input**: Design documents from `/specs/004-fix-dialog-instant-close/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/dialog-dismissal.md](./contracts/dialog-dismissal.md),
[quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution principle II (Test-First, NON-NEGOTIABLE) and spec FR-008:
every test task must be written first and seen failing (`pnpm test`) before its implementation
task. A fixed bug starts with a reproduction (T001).

**Decisions (2026-10-26, binding)**: work on branch `004-fix-dialog-instant-close`; the Ark UI
upgrade to 5.39.3 ships in this same PR (research R6); if the reproduction shows
`pointerdown.outside` instead of `focus.outside`, switch to research R4 « Plan B » without
asking and document it in research.md.

**Revised decision (2026-10-26, binding)**: the Ark UI 5.39.3 upgrade alone fixes the bug (the
regression tests are red on 5.39.2 and green on 5.39.3 with no other change), so **no custom
fix ships** (« si la simple mise à jour suffisait, on n'introduit pas de fix custom »). The
handler tasks T006, T007, T010, T011, T014, T018 are cancelled; the regression tests were
written and seen red on 5.39.2, then the upgrade (T003) turned them green (research R3 — Résultat,
R4 révisée).

**Organization**: grouped by user story (spec.md: US1 P1, US2 P1, US3 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3
- Frontend only: `src/shared/`, `src/features/expenses/`; backend untouched

### jsdom test recipe « focus outside » (used by T008, T009, T013, T016, T017)

Render the dialog next to an outside element, e.g.
`render(<><button type="button">Dehors</button><Component … /></>)`. Wait until the dialog is
open and its effects are active (`await screen.findByRole('dialog')`, then flush one frame:
`await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))`). Then
`act(() => screen.getByRole('button', { name: 'Dehors' }).focus())`, flush two frames again
(Zag defers the focus-outside handler with `raf`), and assert the close callback (`onCancel` /
`onClose`) was **not** called and the dialog is still in the document. `src/test/setup.ts`
mocks `matchMedia` to `matches: false`, so Zag does not treat jsdom as a touch device and does
register its `focusin` listener. Before the fix, this test MUST fail (callback called once).

---

## Phase 1: Setup — reproduction (research R3)

**Purpose**: confirm the root cause in Firefox on the current Ark UI 5.39.2, before any change.

- [X] T001 Reproduce in Firefox following quickstart.md §1 steps 1–4: temporarily add `onInteractOutside={(e) => console.log(e.type, e.detail.target)}` to the `Dialog.Root` in `src/shared/components/ConfirmDialog.tsx` and `src/features/expenses/components/ExpenseForm.tsx` (needs `pnpm dev` + `pnpm worker:dev` + Mailpit), open an expense, click « Supprimer » then « Modifier », and record the logged event type and target for each
- [X] T002 Revert the T001 instrumentation (`git diff src/` must be empty) and record the outcome in a new « R3 — Résultat » paragraph of `specs/004-fix-dialog-instant-close/research.md`: `focus.outside` on the expense card → R2 confirmed, continue as planned; `pointerdown.outside` → write the concrete Plan B (handler on `onPointerDownOutside`) in research R4, and apply it instead of `onFocusOutside` in T007/T010/T011/T014/T018, adapting the matching tests; nothing logged → stop and go back to research

**Checkpoint**: cause known; working tree clean.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ark UI upgrade (research R6) and the shared handler (contract « Handler partagé »)
that every story uses.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

- [X] T003 Upgrade Ark UI: `pnpm add @ark-ui/react@^5.39.3` (latest stable 5.x, never `6.0.0-next.*`); check `package.json` now has `"@ark-ui/react": "^5.39.3"` and `pnpm-lock.yaml` resolves `@zag-js/dialog`, `@zag-js/dismissable`, `@zag-js/focus-trap` to `1.45.0`
- [X] T004 Run `pnpm test` and `pnpm check` after the upgrade; fix any break caused by the upgrade (Checkbox, Select, Tabs, SegmentGroup, Drawer, Toast, Dialog usages) before going further
- [X] T005 (done with the jsdom regression tests: red on 5.39.2, green on 5.39.3 without fix; Firefox confirmation folded into T012/T015/T019) Re-run quickstart.md §1 step 5 in Firefox **without** any fix (temporary instrumentation again, reverted afterwards) and append to the « R3 — Résultat » paragraph of `specs/004-fix-dialog-instant-close/research.md` whether the bug still reproduces on 5.39.3 (information only: the fix is applied either way)
- [X] T006 ~~[P] Write `src/shared/utils/dialog.test.ts` (must fail: module missing): `preventFocusOutsideDismiss` calls `preventDefault()` exactly once on the given event (pass a `{ preventDefault: vi.fn() }` object cast through the Ark type via a typed helper, no `any`) and returns `undefined`~~ — **cancelled (no custom handler, research R4 révisée)**
- [X] T007 ~~Create `src/shared/utils/dialog.ts` exporting `preventFocusOutsideDismiss = (event: DialogFocusOutsideEvent): void => event.preventDefault()` with `import type { DialogFocusOutsideEvent } from '@ark-ui/react/dialog'`, and an English comment: modal dialogs trap focus, so focus can only leave them programmatically (e.g. another dialog returning focus on unmount) — never treat it as a dismissal; Escape, backdrop and buttons still close. T006 green~~ — **cancelled (no custom handler, research R4 révisée)**

**Checkpoint**: Ark UI 5.39.3 green; shared handler available.

---

## Phase 3: User Story 1 — Supprimer une dépense (Priority: P1) 🎯 MVP

**Goal**: from an expense detail, « Supprimer » opens a confirmation that stays open until an
explicit action.

**Independent Test**: quickstart.md §2 rows 1, 2, 7, 8 in Firefox.

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] (seen red on Ark UI 5.39.2, green on 5.39.3; uses the `src/test/focus-outside.ts` helper) Create `src/shared/components/ConfirmDialog.test.tsx` (first test for this shared component): (a) regression — with `open`, focusing an outside button (recipe above) does NOT call `onCancel` and the dialog stays rendered (must fail before T010); (b) « Annuler » calls `onCancel` once; (c) Escape (`await user.keyboard('{Escape}')`) calls `onCancel` once; (d) « Supprimer » (custom `confirmLabel`) calls `onConfirm` and not `onCancel`; (e) with `isLoading`, `loadingText` is shown. Backdrop-click dismissal is verified in the browser (quickstart §2 row 1), not in jsdom
- [X] T009 [P] [US1] Add a `describe('ExpenseDetail — dismissal')` block to `src/features/expenses/components/ExpenseDetail.test.tsx`: focusing an outside button (recipe above) does NOT call `onClose` and the dialog stays rendered (must fail before T011); « Fermer » still calls `onClose`; « Supprimer » calls `onDeleteRequest('e1')`. Reuse the existing `state`/`base`/`renderDetail` helpers, passing spies for `onClose` and `onDeleteRequest`

### Implementation for User Story 1

- [X] T010 ~~[US1] In `src/shared/components/ConfirmDialog.tsx`, add `onFocusOutside={preventFocusOutsideDismiss}` to `Dialog.Root` (import from `@/shared/utils/dialog`); nothing else changes (labels, `onOpenChange`, buttons). T008 green~~ — **cancelled — T008 is green from the Ark UI 5.39.3 upgrade alone**
- [X] T011 ~~[US1] In `src/features/expenses/components/ExpenseDetail.tsx`, add `onFocusOutside={preventFocusOutsideDismiss}` to `Dialog.Root`; keep `restoreFocus` default (plain close must still return focus to the expense card). T009 green~~ — **cancelled — T009 is green from the Ark UI 5.39.3 upgrade alone**
- [X] T012 [US1] Verify in Firefox (quickstart.md §2 rows 1, 2, 7, 8 — mouse, keyboard, responsive touch, ≥ 10 consecutive tries, SC-001): the confirmation stays open; « Supprimer » deletes; « Annuler », Escape and backdrop click close without deleting; the generated-expense wording « Seule cette dépense est supprimée ; la récurrence continue. » is shown; a failed delete keeps the dialog with its error

**Checkpoint**: deleting an expense works in Firefox — shippable MVP.

---

## Phase 4: User Story 2 — Modifier une dépense (Priority: P1)

**Goal**: from an expense detail, « Modifier » opens a prefilled form that stays open and saves.

**Independent Test**: quickstart.md §2 row 3 in Firefox.

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Add a `describe('ExpenseForm — dismissal')` block to `src/features/expenses/components/ExpenseForm.test.tsx`, reusing that file's existing mocks/render helpers for an edit (`expense` prop) render: focusing an outside button (recipe above) does NOT call `onCancel` and the form dialog stays rendered (must fail before T014); the cancel button still calls `onCancel`

### Implementation for User Story 2

- [X] T014 ~~[US2] In `src/features/expenses/components/ExpenseForm.tsx`, add `onFocusOutside={preventFocusOutsideDismiss}` to `Dialog.Root` (import from `@/shared/utils/dialog`). T013 green~~ — **cancelled — T013 is green from the Ark UI 5.39.3 upgrade alone**
- [X] T015 [US2] Verify in Firefox (quickstart.md §2 row 3, mouse/keyboard/touch, SC-002): « Modifier » shows the prefilled form, it stays open, saving updates the amount in the list, cancelling changes nothing

**Checkpoint**: US1 + US2 — the two reported journeys are fixed.

---

## Phase 5: User Story 3 — Autres enchaînements de fenêtres (Priority: P2)

**Goal**: detail → recurrence, recurrence → edit form / delete confirmation are stable too.
Depends on T010 (ConfirmDialog) and T014 (ExpenseForm) for the incoming dialogs of these paths.

**Independent Test**: quickstart.md §2 rows 4–6 in Firefox.

### Tests for User Story 3 ⚠️

- [X] T016 [P] [US3] Add a `describe('RecurrenceDetail — dismissal')` block to `src/features/expenses/components/RecurrenceDetail.test.tsx` (reuse `state`, `active` and the existing `ExpenseForm` mock): focusing an outside button (recipe above) on the recurrence detail does NOT call `onClose` and the dialog stays rendered (must fail before T018)
- [X] T017 [US3] In the same new block of `src/features/expenses/components/RecurrenceDetail.test.tsx`: click « Supprimer », wait for the « Supprimer la récurrence » confirmation, then focus the outside button (recipe above) → the confirmation is still rendered and `onClose` was not called (guards the detail → confirmation swap; green once T010 is done, must have been seen failing before T010 — write it before T010 if implementing strictly in order, otherwise check it fails by temporarily removing the handler)

### Implementation for User Story 3

- [X] T018 ~~[US3] In `src/features/expenses/components/RecurrenceDetail.tsx`, add `onFocusOutside={preventFocusOutsideDismiss}` to the detail's `Dialog.Root`; leave the swap pattern and its a11y comment (« two stacked modals would hide the confirmation from assistive tech ») unchanged. T016 + T017 green~~ — **cancelled — T016 + T017 are green from the Ark UI 5.39.3 upgrade alone**
- [X] T019 [US3] Verify in Firefox (quickstart.md §2 rows 4–6, SC-005): generated expense → recurrence link shows a stable recurrence detail; recurrence « Modifier » shows a stable, savable form; recurrence « Supprimer » shows a stable confirmation

**Checkpoint**: every dialog swap of the expenses screen is stable (FR-001, FR-002, FR-005).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Bump `package.json` `version` from `0.3.0` to `0.3.1` (PATCH: fix only, research R7)
- [X] T021 [P] Add at the top of the `changelog` array in `src/features/changelog/data/changelog.ts` a release `{ version: '0.3.1', date: '<merge day, YYYY-MM-DD>', changes: [{ category: 'fix', text: 'Les fenêtres de suppression et de modification d’une dépense ne se ferment plus toutes seules sur Firefox' }] }` — French, non-technical, inclusive, consistent with existing entries (no trailing period)
- [X] T022 Run `pnpm test` (incl. `changelog.test.ts` version/changelog consistency) and `pnpm check`; all green
- [ ] T023 Non-regression (quickstart.md §3): Chrome and Safari rows 1, 3, 6; plain close of an expense detail returns focus to its card; members (income, removal) and settlements (deletion) dialogs; other Ark UI components after the upgrade (Drawer « Quoi de neuf », Toast, Select and SegmentedControl in the expense form, Tabs) (SC-004)
- [X] T024 Final review: `git diff main --stat` contains only the files listed in plan.md « Source Code » plus `pnpm-lock.yaml` and `specs/004-fix-dialog-instant-close/`; no leftover `console.log` / `onInteractOutside` instrumentation in `src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: first, on unmodified Ark UI 5.39.2
- **Foundational (T003–T007)**: after Setup; blocks all stories. T003 → T004 → T005; T006 → T007 (T006 can be written while T004 runs)
- **US1 (T008–T012)**: after Foundational
- **US2 (T013–T015)**: after Foundational; independent from US1
- **US3 (T016–T019)**: after Foundational; its end-to-end check T019 also needs T010 (ConfirmDialog) and T014 (ExpenseForm)
- **Polish (T020–T024)**: after the stories to ship (T020/T021 can be done any time)

### Within Each User Story

- Test task first, seen failing, then the matching implementation task (T008→T010, T009→T011, T013→T014, T016→T018, T017 before T010 when strictly ordered)
- Browser verification (T012, T015, T019) last

### Parallel Opportunities

- T006 alongside T004/T005
- T008 and T009 (different files), T013, T016 (then T017, same file) — the test files are distinct and can be written together once Phase 2 is done
- T010, T011, T014, T018 touch distinct files and can be done in parallel after their tests
- T020 and T021

---

## Parallel Example: tests for all stories

```text
Task: "T008 [US1] ConfirmDialog.test.tsx — focus outside keeps the dialog open"
Task: "T009 [US1] ExpenseDetail.test.tsx — dismissal block"
Task: "T013 [US2] ExpenseForm.test.tsx — dismissal block"
Task: "T016 [US3] RecurrenceDetail.test.tsx — dismissal block"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (reproduce) → Phase 2 (upgrade + shared handler)
2. Phase 3 (US1) → **STOP and VALIDATE** in Firefox: deleting an expense works
3. Shippable with T020–T022 if needed

### Incremental Delivery

1. US1 → delete works
2. US2 → edit works (both reported journeys fixed)
3. US3 → neighbouring swaps hardened
4. Polish → 0.3.1 + changelog, non-regression, single PR

---

## Notes

- Never stack dialogs: the replacement pattern is a documented a11y choice (research R1)
- `restoreFocus` stays at its default on every dialog (contract « Inchangé »)
- Commit after each green step via the git-commit agent (Conventional Commits, e.g. `test(shared): …`, `fix(expenses): …`, `chore(deps): …`, `chore(release): 0.3.1`)
