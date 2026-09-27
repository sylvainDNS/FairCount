---

description: "Task list for feature 002-app-changelog"
---

# Tasks: Changelog « Nouveautés » in-app

**Input**: Design documents from `/specs/002-app-changelog/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/changelog-module.md](./contracts/changelog-module.md),
[design-brief.md](./design-brief.md), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution principle II (Test-First, NON-NEGOTIABLE): every test task
must be written first and seen failing (`pnpm test`) before its implementation task.

**UI tasks**: tasks tagged **via skill impeccable** MUST be built by invoking the `impeccable`
skill (craft of an established world: DESIGN.md + design-brief.md), not freehand.

**Organization**: grouped by user story (spec.md: US1 P1, US2 P2, US3 P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3
- Base path for the feature: `src/features/changelog/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: expose the app version at runtime and create the feature skeleton.

- [X] T001 Add `__APP_VERSION__: JSON.stringify(version)` to `define` in `vite.config.ts` (read `version` from `./package.json` via `import pkg from './package.json' with { type: 'json' }` or `readFileSync` + `JSON.parse`), and add the same `define` block to `vitest.config.ts` so tests see the constant (R2)
- [X] T002 [P] Declare `declare const __APP_VERSION__: string;` next to `__GIT_SHA__` in `src/vite-env.d.ts`
- [X] T003 [P] Bump `"version"` from `0.1.0` to `0.2.0` in `package.json` (constitution « Releases et changelog »: MINOR, release contains Nouveautés)
- [X] T004 Create `src/features/changelog/lib/app-version.ts` exporting `APP_VERSION = __APP_VERSION__` and `src/features/changelog/constants.ts` exporting `CHANGELOG_ROUTE = '/profile/changelog'` plus storage keys `LAST_SEEN_KEY = 'faircount.changelog.lastSeen'` and `LAST_CONSULTED_KEY = 'faircount.changelog.lastConsulted'`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: types, data, version maths, formatting, local store and the pure decision engine,
shared by all three stories.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Types & data

- [X] T005 Create `src/features/changelog/types.ts`: `ChangelogCategory = 'feature' | 'improvement' | 'fix'`; `ChangelogChange { readonly category: ChangelogCategory; readonly text: string }`; `ChangelogRelease { readonly version: string; readonly date: string; readonly changes: readonly ChangelogChange[] }`; `ChangelogDigest { readonly fromVersion: string; readonly toVersion: string; readonly date: string; readonly features: readonly string[]; readonly improvements: readonly string[]; readonly fixCount: number }`; `ChangelogState { readonly summary: ChangelogDigest | null; readonly unread: boolean; readonly writes: { readonly lastSeen?: string | undefined; readonly lastConsulted?: string | undefined } }` (data-model.md)
- [X] T006 [P] Write failing gate test `src/features/changelog/data/changelog.test.ts` (FR-002a, R3) asserting on the exported `changelog`: `changelog[0].version` equals `version` imported from `package.json`; every `version` is strict semver `MAJOR.MINOR.PATCH` (« Semver strict `MAJOR.MINOR.PATCH` ; unique ; strictement décroissant dans le tableau »); every `date` matches `YYYY-MM-DD` and dates are non-increasing (« non croissant dans le tableau »); every `text` is a non-empty trimmed string; failure messages name the offending version
- [X] T007 Create `src/features/changelog/data/changelog.ts` with the two releases of contracts/changelog-module.md §1, `as const satisfies readonly ChangelogRelease[]`: `0.2.0` (date = merge day, placeholder `2026-09-30` to update in the release PR; 2 `feature` entries: compte commun comme payeur, page Nouveautés dans le profil) and `0.1.0` (`2026-02-09`; 5 `feature` entries « Première version de FairCount », magic link, groupes/invitations, répartition selon les revenus, soldes et remboursements); French inclusive copy; makes T006 pass
- [X] T008 [P] Add a `Test` step running `pnpm test` before the `Build` step in `.github/workflows/deploy.yml`, so a version ↔ changelog mismatch blocks deployment even on a direct push to `main` (FR-002a « détectée avant le déploiement »)

### Version maths & formatting

- [X] T009 [P] Write failing tests `src/features/changelog/lib/version.test.ts` for `parseVersion(v): [number, number, number] | null` (rejects `''`, `'1.2'`, `'1.2.3-beta'`, `'v1.2.3'`, `'01.2.3'`, non-strings) and `compareVersions(a, b): -1 | 0 | 1` (numeric, not lexicographic: `0.10.0 > 0.9.0`) (R4)
- [X] T010 Implement `parseVersion` and `compareVersions` in `src/features/changelog/lib/version.ts`, no dependency (makes T009 pass)
- [X] T011 [P] Write failing tests `src/features/changelog/lib/format.test.ts` (R11): `formatReleaseDate('2026-09-26')` → `'26 sept. 2026'` using local date (no UTC shift: build `new Date(y, m - 1, d)`); `formatVersionRange('0.2.0', '0.2.0')` → `'Version 0.2.0'` and `formatVersionRange('0.2.0', '0.4.0')` → `'Versions 0.2.0 à 0.4.0'`; `formatFixCount(1)` → `'Plus 1 correction.'`, `formatFixCount(3)` → `'Plus 3 corrections.'`, `formatFixCount(0)` → `null`; `CATEGORY_LABELS` = `{ feature: 'Nouveauté', improvement: 'Amélioration', fix: 'Correction' }` and plural section titles `Nouveautés` / `Améliorations` / `Corrections`
- [X] T012 Implement `src/features/changelog/lib/format.ts` with `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })` (makes T011 pass)

### Local store

- [X] T013 [P] Write failing tests `src/features/changelog/store/changelog-storage.test.ts` (R5): `getSnapshot()` returns `{ lastSeen, lastConsulted }` read from `LAST_SEEN_KEY` / `LAST_CONSULTED_KEY`, where « Valeur absente, illisible ou non semver = absente » (→ `undefined`); `setLastSeen(v)` / `setLastConsulted(v)` persist and notify subscribers; values are never lowered (« Jamais abaissé »: setting an older version is a no-op); when `localStorage` throws (mock `getItem`/`setItem` to throw) the store falls back to in-memory values without throwing; a `storage` event on either key notifies subscribers; `getSnapshot()` returns a referentially stable object between changes (required by `useSyncExternalStore`)
- [X] T014 Implement `src/features/changelog/store/changelog-storage.ts` exporting `subscribe`, `getSnapshot`, `setLastSeen`, `setLastConsulted` (+ a `resetForTests` helper), using `parseVersion`/`compareVersions` from T010 (makes T013 pass)

### Decision engine (pure)

- [X] T015 Write failing tests `src/features/changelog/lib/resolve-changelog-state.test.ts` for `resolveChangelogState({ currentVersion, lastSeen, lastConsulted, releases })` covering data-model.md « Règles de décision » verbatim and every row of its « Transitions » table:
  1. « Base = `lastSeen` si valide. Sinon : première ouverture → pas de résumé, pas de pastille, écrire `lastSeen = lastConsulted = currentVersion` »
  2. « Rollback / même version : si `currentVersion ≤ base` → pas de résumé, aucune écriture »
  3. « releases concernées = `(base, currentVersion]`. Si au moins une est annonçable → `summary` = digest. Sinon → pas de résumé, écrire `lastSeen = currentVersion` » (annonçable = at least one `feature` or `improvement`; empty or fix-only releases are not)
  4. digest: `fromVersion`/`toVersion` = oldest/newest concerned release, `date` = date of `toVersion`, `features` / `improvements` = texts of all concerned releases newest first, `fixCount` = number of `fix` across concerned releases (FR-006a; spec US1 scenarios 3 and 5)
  5. « `unread` = il existe une release annonçable avec `lastConsulted < version ≤ currentVersion` (`lastConsulted` absent ou invalide = pas de pastille) »
- [X] T016 Implement `src/features/changelog/lib/resolve-changelog-state.ts` returning `ChangelogState` (writes only, no side effects) (makes T015 pass)

**Checkpoint**: `pnpm test` green on T006–T016; nothing visible yet.

---

## Phase 3: User Story 1 — Découvrir les nouveautés juste après une mise à jour (Priority: P1) 🎯 MVP

**Goal**: on first load of a newer version with Nouveautés/Améliorations, a bottom sheet
« Quoi de neuf » shows the digest once per device; every close path marks it seen.

**Independent Test**: quickstart.md S1, S2, S3 (sheet part), S6, S8, S9, S10, S11, S12.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T017 [P] [US1] Write failing tests `src/features/changelog/components/WhatsNewSheet.test.tsx` (contracts §4 « Résumé »): renders `role="dialog"` named « Quoi de neuf »; version line « Version 0.2.0 · 30 sept. 2026 » (single) and « Versions 0.2.0 à 0.4.0 » (range); sections « Nouveautés » then « Améliorations » omitted when empty; « Plus N correction(s). » only when `fixCount ≥ 1`; clicking « C'est noté » and pressing Escape each call `onClose` exactly once; clicking « Tout l'historique » calls `onClose` and navigates to `CHANGELOG_ROUTE` (wrap in `MemoryRouter`); on open, focus moves inside the dialog; after close, focus returns to the element focused before opening (FR-014)
- [X] T018 [US1] Add jsdom polyfills needed by Ark UI Drawer to `src/test/setup.ts` only if T017 fails for environment reasons (`window.matchMedia`, `ResizeObserver`, `Element.prototype.hasPointerCapture` / `setPointerCapture` / `releasePointerCapture`, `scrollTo`) (R9 risk)
- [X] T019 [P] [US1] Write failing tests `src/features/changelog/components/ChangelogSummaryGate.test.tsx`: with storage `lastSeen = '0.1.0'` and current `0.2.0` the sheet appears; closing it writes `lastSeen = '0.2.0'` and it does not reappear on remount; with empty storage nothing renders and both keys are initialised to the current version; with `lastSeen = '9.9.9'` nothing renders and storage is untouched
- [X] T020 [P] [US1] Write failing tests `src/shared/components/Layout.test.tsx` (mock `useAuth` from `@/features/auth`, wrap in `MemoryRouter`): with storage `lastSeen = '0.1.0'` (current `0.2.0`) rendering `Layout` shows a dialog named « Quoi de neuf »; with `lastSeen = '0.2.0'` no dialog (constitution II: shared component modified by T025)

### Implementation for User Story 1

- [X] T021 [US1] Implement `src/features/changelog/hooks/useChangelogState.ts`: reads the store via `useSyncExternalStore(subscribe, getSnapshot)`, computes `resolveChangelogState` with `APP_VERSION` and `changelog`, applies `writes` once in a `useEffect` (initialisation / fix-only auto-seen), and exposes `{ summary, unread, markSeen: () => setLastSeen(APP_VERSION), markConsulted: () => setLastConsulted(APP_VERSION) }`
- [X] T022 [US1] Build `src/features/changelog/components/WhatsNewSheet.tsx` **via skill impeccable** on `@ark-ui/react/drawer` (R9, design-brief §3/§6): props `{ digest: ChangelogDigest; open: boolean; onClose: () => void }`; `Drawer.Root` controlled with `onOpenChange` → `onClose` on close, `swipeDirection="down"`, `unmountOnExit`; `Portal`; `Drawer.Backdrop` 50 % black `z-50`; `Drawer.Positioner` `z-50` (toast stays above at z-70); `Drawer.Content` full-width on phones, from 640px bottom-anchored, horizontally centered, max ~448px, 12px top radius, 24px padding, Dialog shadow, content-height capped ~80vh with inner scroll; `Drawer.Grabber` + `GrabberIndicator`; `Drawer.Title` « Quoi de neuf »; version line (caption, muted); category sub-headers + entries (Body Small); fix line; footer primary full-width `Button` « C'est noté » (`Drawer.CloseTrigger asChild`) and ghost link « Tout l'historique » (`useNavigate` to `CHANGELOG_ROUTE` then `onClose`); slide-up ~200–250 ms ease-out, fade only under `prefers-reduced-motion`; full dark-mode twins; no emoji/illustration/red-green (makes T017 pass)
- [X] T023 [US1] Implement `src/features/changelog/components/ChangelogSummaryGate.tsx`: uses `useChangelogState`; when `summary` is non-null renders `WhatsNewSheet` loaded with `React.lazy(() => import('./WhatsNewSheet').then(m => ({ default: m.WhatsNewSheet })))` inside `Suspense fallback={null}`; capture the digest in local state on first render (`useState(() => summary)`) and render the sheet from that local copy, with a local `open` state starting `true`; `onClose` → `markSeen()` + `setOpen(false)`; the live `summary` turning `null` after `markSeen()` MUST NOT unmount the sheet before its exit animation (unmount via `onExitComplete` / `unmountOnExit`) (R8, FR-005, FR-007) (makes T019 pass)
- [X] T024 [US1] Create barrel `src/features/changelog/index.ts` exporting only `ChangelogSummaryGate` and `CHANGELOG_ROUTE` for now (selective exports, no wildcard; contract §2)
- [X] T025 [US1] Mount `<ChangelogSummaryGate />` once in `src/shared/components/Layout.tsx` (inside the root `div`, after `<main>`), importing from `@/features/changelog` — Layout is only rendered under `ProtectedRoute`, so landing, `/login`, `/auth/error` and `/invite/:token` never show the sheet (FR-008)

**Checkpoint**: US1 works alone (quickstart S1, S2, S6, S8–S12). « Tout l'historique » lands on
the 404 page until US2 adds the route.

---

## Phase 4: User Story 2 — Consulter l'historique des nouveautés à tout moment (Priority: P2)

**Goal**: a lazy page `/profile/changelog` lists all non-empty releases newest first and marks
the current one; reachable from a « Nouveautés » row on the profile.

**Independent Test**: quickstart.md S5 (without the dot part) and S7; from `/profile`, open
« Nouveautés », see 0.2.0 (badge « Version actuelle ») then 0.1.0, go back to Profil.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T026 [P] [US2] Write failing tests `src/features/changelog/components/ChangelogPage.test.tsx` (contracts §4 « Page historique »): heading « Nouveautés »; « Vous utilisez la version 0.2.0 »; releases rendered newest first and releases with empty `changes` not rendered (« A version with zero entries is not listed »); badge « Version actuelle » only on the current version; categories in order Nouveauté → Amélioration → Correction with empty ones omitted; dates formatted « 9 févr. 2026 »; back link « Retour » goes to the previous screen when there is in-app history and to `/profile` otherwise (spec US2 scenario 3); mounting writes `lastConsulted = APP_VERSION`
- [X] T027 [P] [US2] Write failing tests `src/features/changelog/components/ChangelogEntryRow.test.tsx`: a single link to `CHANGELOG_ROUTE` whose text contains « Nouveautés » and the secondary line « Version 0.2.0 »

### Implementation for User Story 2

- [X] T028 [US2] Build `src/features/changelog/components/ChangelogPage.tsx` **via skill impeccable** (design-brief §3/§5/§6, mode Read): headline « Nouveautés », subline « Vous utilisez la version {APP_VERSION} » with short `__GIT_SHA__` (7 chars) as muted caption (FR-015); one bordered card per non-empty release (12px radius, 16px padding): header row version (600) + formatted date (muted) + soft info `Badge` « Version actuelle » on current; category sub-headers (Label, Ink Soft) and entries (Body Small), rows separated by spacing, no dividers; back link « ← Retour »: `navigate(-1)` when React Router history has a previous in-app entry (`location.key !== 'default'`), otherwise `navigate('/profile')` (spec US2 scenario 3); `useEffect` on mount → `markConsulted()` (FR-010, FR-011, FR-012) (makes T026 pass)
- [X] T029 [US2] Build `src/features/changelog/components/ChangelogEntryRow.tsx` **via skill impeccable** (design-brief §6 « Profile row »): whole-row `Link` to `CHANGELOG_ROUTE`, ≥ 44px tall, label « Nouveautés », muted secondary line « Version {APP_VERSION} », trailing chevron SVG `aria-hidden="true"`; leave a slot for the unread dot (US3) (makes T027 pass)
- [X] T030 [US2] Extend barrel `src/features/changelog/index.ts` with `ChangelogPage` and `ChangelogEntryRow`
- [X] T031 [US2] Add lazy route `profile/changelog` in `src/routes/index.tsx` under the `Layout` children (after `profile`): `const ChangelogPage = lazy(() => import('@/features/changelog').then((m) => ({ default: m.ChangelogPage })))` wrapped in `<Suspense fallback={SuspenseFallback}>`
- [X] T032 [US2] Insert `<ChangelogEntryRow />` in `src/features/auth/components/ProfilePage.tsx` as a new bordered card between the account card (Nom/Email) and the mobile logout area, importing from `@/features/changelog`

**Checkpoint**: US1 + US2 work; « Tout l'historique » now opens the page.

---

## Phase 5: User Story 3 — Savoir d'un coup d'œil qu'il y a du nouveau (Priority: P3)

**Goal**: a Steady Blue dot on the Profil tab (bottom nav), the Profil sidebar link and the
« Nouveautés » row while announceable releases remain unconsulted.

**Independent Test**: quickstart.md S3–S5: close the sheet → dots visible; open the history →
dots gone.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T033 [P] [US3] Write failing tests `src/shared/components/BottomNav.test.tsx`: with storage `lastConsulted = '0.1.0'` (current `0.2.0`) the Profil link has accessible name « Profil, nouveautés non lues » and a dot element with `aria-hidden="true"`; with `lastConsulted = '0.2.0'` the name is « Profil » and no dot
- [X] T034 [P] [US3] Extend `src/features/changelog/components/ChangelogEntryRow.test.tsx`: dot rendered (`aria-hidden`) and link name includes « non lues » when unread; absent otherwise
- [X] T035 [P] [US3] Extend `src/shared/components/Layout.test.tsx`: at desktop layout the sidebar Profil link has accessible name « Profil, nouveautés non lues » and an `aria-hidden` dot when `lastConsulted = '0.1.0'`; name « Profil » and no dot when `lastConsulted = '0.2.0'`

### Implementation for User Story 3

- [X] T036 [US3] Implement `src/features/changelog/hooks/useChangelogUnread.ts` returning `useChangelogState().unread` (FR-012), and export it from `src/features/changelog/index.ts`
- [X] T037 [US3] Build `src/features/changelog/components/UnreadDot.tsx` **via skill impeccable** (design-brief §6 « Dot »): ~8px Steady Blue circle (`bg-blue-600`, dark `bg-blue-400`), ring in surface color (`ring-2 ring-white dark:ring-slate-900`), `aria-hidden="true"`, no count, no animation; prop `className` for positioning; export `UnreadDot` from the barrel
- [X] T038 [US3] In `src/shared/components/BottomNav.tsx`, for the `/profile` item: wrap the icon in a `relative` span and render `<UnreadDot className="absolute -top-0.5 -right-0.5" />` when `useChangelogUnread()`; set `aria-label` to « Profil, nouveautés non lues » when unread (label « Profil » otherwise) (makes T033 pass)
- [X] T039 [US3] In `src/shared/components/Layout.tsx`, extend `SidebarLink` with an optional `unread?: boolean | undefined` prop: render `UnreadDot` after the label (inline, vertically centered) and the same `aria-label` rule; pass `unread={useChangelogUnread()}` for the Profil link only (makes the Layout sidebar test pass)
- [X] T040 [US3] In `src/features/changelog/components/ChangelogEntryRow.tsx`, render `UnreadDot` before the chevron and append « , nouveautés non lues » to the link's accessible name when `useChangelogUnread()` (makes T034 pass)

**Checkpoint**: all three stories work together (quickstart S1–S12).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T041 [P] Run the impeccable detector once on the changed UI files: `impeccable detect --json` (launcher `scripts/impeccable` of the impeccable skill directory, resolved at run time via the skill) src/features/changelog/components src/shared/components/BottomNav.tsx src/shared/components/Layout.tsx src/features/auth/components/ProfilePage.tsx`, fix every finding in one batch
- [X] T042 [P] Document the release routine in `CLAUDE.md` (new « Releases et changelog » paragraph under Key Patterns): bump `package.json#version` + add the entry at the top of `src/features/changelog/data/changelog.ts` in the same PR, categories `feature`/`improvement`/`fix`, French inclusive user-facing copy, gate = `changelog.test.ts`
- [X] T043 [P] Remove the Sync Impact Report HTML comment from the top of `.specify/memory/constitution.md` before committing the amendment (it is review scratch material)
- [X] T044 Run `pnpm check`, `pnpm tsc --noEmit` and `pnpm test`; fix all failures
- [X] T045 Run `pnpm build` and confirm `WhatsNewSheet` / Drawer code lands in a separate lazy chunk, not in the main entry chunk (SC-005)
- [X] T046 Walk through quickstart.md §2 (S1–S12) and §3 (keyboard, screen reader, 375 px / ≥ 640 px, light/dark, reduced motion) on `pnpm dev`; record any deviation as a follow-up task
- [X] T047 Before merge: set the `0.2.0` `date` in `src/features/changelog/data/changelog.ts` to the merge day (`YYYY-MM-DD`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependency. T004 needs T001/T002 for the constant to type-check.
- **Foundational (Phase 2)**: depends on Setup; blocks all stories. T006 needs T003 (version
  0.2.0) and T005; T007 needs T005; T008 is independent (CI only); T014 needs T010; T016 needs
  T005, T010.
- **US1 (Phase 3)**: depends on Phase 2. T018 only after T017 (runs if T017 fails for jsdom
  reasons). T021 → T023 → T025; T022 before T023; T020 (Layout test) before T025.
- **US2 (Phase 4)**: depends on Phase 2 and on T021 (`markConsulted` from `useChangelogState`);
  otherwise independent from US1 UI.
- **US3 (Phase 5)**: depends on Phase 2, T021, T025 (Layout test file exists) and T029 (row to
  decorate).
- **Polish (Phase 6)**: after the desired stories.

### Within Each User Story

- Tests first and failing, then implementation.
- Hooks before components; components before integration points (`Layout`, routes, `ProfilePage`).

### Parallel Opportunities

- Setup: T002, T003 in parallel after T001.
- Foundational: test tasks T006, T009, T011, T013 and the CI task T008 in parallel; then implementations T010, T012
  in parallel; T014 after T010; T015/T016 after T010.
- US1: T017, T019, T020 in parallel; T018 after T017 if needed.
- US2: T026, T027 in parallel; T028 and T029 in parallel (different files).
- US3: T033, T034, T035 in parallel.
- Polish: T041, T042, T043 in parallel.

---

## Parallel Example: Foundational

```bash
Task: "Write failing gate test in src/features/changelog/data/changelog.test.ts"
Task: "Write failing tests in src/features/changelog/lib/version.test.ts"
Task: "Write failing tests in src/features/changelog/lib/format.test.ts"
Task: "Write failing tests in src/features/changelog/store/changelog-storage.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Write failing tests in src/features/changelog/components/ChangelogPage.test.tsx"
Task: "Write failing tests in src/features/changelog/components/ChangelogEntryRow.test.tsx"
# then
Task: "Build ChangelogPage.tsx via skill impeccable"
Task: "Build ChangelogEntryRow.tsx via skill impeccable"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (gate test green in CI from here on)
2. Phase 3 US1 → validate quickstart S1, S2, S6, S8–S12
3. Stop and review; « Tout l'historique » is a known dead link until US2

### Incremental Delivery

1. Setup + Foundational → gate and engine in place
2. + US1 → summary sheet (MVP)
3. + US2 → history page and profile row
4. + US3 → unread dots
5. Polish → detector, docs, build check, full quickstart, set release date

The feature ships as a single release (0.2.0): do not merge before US2 so the sheet's
history link is never dead in production.

---

## Notes

- [P] tasks = different files, no dependency on incomplete tasks
- Commit after each task or logical group (Conventional Commits, via the git-commit agent)
- Verify each test fails before implementing (constitution II)
- Never export data, store or engine from the barrel (contract §2)

---

## Phase 7: Convergence

- [X] T048 Raise the « Build {sha} » caption contrast in `src/features/changelog/components/ChangelogPage.tsx` from `text-xs text-slate-400 dark:text-slate-500` (≈2.5:1 light, ≈4.2:1 dark) to `text-slate-500 dark:text-slate-400` so small text meets 4.5:1 per FR-014 (partial)
- [X] T049 Keep the update toast usable while the summary sheet is open: write a failing test in `src/features/changelog/components/ChangelogSummaryGate.test.tsx` (mock `useRegisterSW` with `needRefresh = true` while the sheet is open → sheet closes and `lastSeen` is written), then in `ChangelogSummaryGate.tsx` close the sheet via the normal close path when an update becomes pending (read `needRefresh` from `virtual:pwa-register/react` or expose it from `UpdatePrompt`), so the modal Drawer no longer traps focus / hides the toast from assistive tech per spec Edge Cases « Résumé et toast simultanés » and FR-014 (partial)
- [X] T050 Document the test-infrastructure additions (`src/test/pwa-register-stub.ts` aliased in `vitest.config.ts`, `__APP_VERSION__` / `__GIT_SHA__` / `__BUILD_DATE__` test defines) in `specs/002-app-changelog/research.md` R9 and in the source tree of `specs/002-app-changelog/plan.md` per plan: project structure (unrequested)
- [X] T051 Align `specs/002-app-changelog/contracts/changelog-module.md` §2 and the Constitution Check III row of `specs/002-app-changelog/plan.md` with the actual barrel (6 exports, adding `UnreadDot` consumed by `BottomNav` and `Layout`) per plan: Constitution Check III (contradicts)
