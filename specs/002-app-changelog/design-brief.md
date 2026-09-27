# Design Brief: Changelog « Nouveautés »

**Source**: impeccable `shape`, 2026-09-26 · **Spec**: [spec.md](./spec.md)
**Visual authority**: DESIGN.md (« The Calm Table ») — established world, no new direction.
**Status**: Confirmed 2026-09-26

## 1. Job and audience

- **Who**: any personne membre, right after an update (often mid-task on a phone, possibly
  about to log an expense) or later, curious about a feature.
- **Summary « Quoi de neuf »** — mode *Operate*: understand in < 15 s what changed, then get
  back to the task. Interruption must be light and dismissible in one tap.
- **History « Nouveautés »** — mode *Read*: browse versions calmly, find when something
  shipped, identify the version in use (support).

## 2. Outcome and proof

- Success: the person reads the highlights and closes; nobody feels blocked from logging an
  expense. The unread dot is noticed without being nagging.
- Real content only: entries come from the hand-written changelog (first real entry: compte
  commun). No invented stats, no marketing tone.

## 3. Selected direction

- **Summary = bottom sheet on every viewport (Ark UI Drawer).** The sheet covers only the
  lower part of the screen (content-height, capped ~80 % viewport, scrolls inside if longer),
  keeping the current screen visible under the 50 % backdrop. Full-width on phones; from 640px
  it stays bottom-anchored, horizontally centered, max ~448px wide, 12px top radius, 24px
  padding, Dialog shadow. One component, one behavior across viewports.
- **History = dedicated page under the profile** (route like `/profile/changelog`),
  lazy-loaded, with a back link « ← Retour » (previous screen, `/profile` as fallback) and native back-button behavior.
- **Summary content is hierarchical**: Nouveautés then Améliorations shown in full, merged
  across all skipped versions (no per-version blocks); Corrections collapsed into one muted
  line (« Plus 3 corrections. »). The history is the exhaustive view.
- **Unread dot**: small Steady Blue dot, no count, on the Profil item of the bottom nav and of
  the desktop sidebar, and on the « Nouveautés » row in the profile page.

## 4. Scope and boundaries

- In scope: the summary sheet/dialog, the history page, the « Nouveautés » row in the profile,
  the dot on nav items (bottom nav + sidebar).
- Untouched: the update toast (copy and behavior), the existing profile fields, `AppVersion`
  (SHA + build date) placement in sidebar/profile footer.
- Anti-goals: no confetti, illustrations, emoji, « 🎉 », mascots, carousels or step-by-step
  tours; no red/green; no count badge (« 3 »); no marketing superlatives; no second accent hue.

## 5. States and ranges

- Summary: 1 item (typical) to ~8 items across up to ~4 skipped versions; Corrections line
  shown only when count ≥ 1 (singular/plural: « Plus 1 correction. » / « Plus 3 corrections. »).
- Version line: single version « Version 0.2.0 · 26 sept. 2026 »; several versions
  « Versions 0.2.0 à 0.4.0 ».
- History: 1 version (first release) to dozens; newest first; each version = number, full date,
  entries grouped by category in fixed order Nouveauté → Amélioration → Correction; empty
  categories omitted. A version with zero entries is not listed.
- Current version marked in the history (« Version actuelle » soft info badge on its block) and
  stated in the header (« Vous utilisez la version 0.2.0 »), with the build SHA as muted
  caption for support.
- Offline: identical (content ships with the app). No loading or error state needed.

## 6. Interaction and layout

- **Summary sheet**: native grabber (`Drawer.Grabber`, drag down to dismiss), title « Quoi de neuf » (Title style), version line
  (caption, muted), category sub-headers (Label weight, Ink Soft), entries as short plain
  sentences (Body Small). Footer: primary full-width button « C'est noté » (closes, marks seen)
  and ghost link « Tout l'historique » (closes, marks seen, navigates to history, marks
  consulted). Close also via swipe down, backdrop tap and Escape; every close path marks the summary as
  seen.
- **Focus**: on open, focus moves to the sheet title/container; on close, focus returns to the
  element focused before (or main content). Screen readers get a labelled dialog.
- **Motion**: sheet slides up ~200–250 ms ease-out, backdrop fades; `prefers-reduced-motion` →
  fade only. No bounce.
- **Layering**: the update toast stays above the sheet and remains usable.
- **Timing**: shown on the first authenticated screen after load; never over login, landing or
  invitation acceptance; waits for an invitation flow to finish.
- **History page**: headline « Nouveautés », subline with current version; one bordered card per
  version (12px radius, 16px padding), version header row (number in Label/600 + date muted,
  « Version actuelle » badge on current); category sub-headers; bullet-less rows separated by
  spacing, not dividers. Single column, max 672px like every page.
- **Profile row**: new card between the account card and the logout area: row « Nouveautés »
  with muted secondary line « Version 0.2.0 », trailing chevron, dot before the chevron when
  unread. Whole row is the link (≥ 44px tall).
- **Dot**: ~8px Steady Blue circle at the top-right of the Profil icon (bottom nav) / after the
  label (sidebar); ring in surface color to detach it from the icon; dark-mode twin (blue-400).
  Accessible name of the link becomes « Profil, nouveautés non lues »; the dot itself is
  `aria-hidden`.

## 7. Constraints and open decisions

- Build the sheet on the Ark UI **Drawer** (`@ark-ui/react/drawer`, already available in
  ^5.30): `swipeDirection="down"`, native grabber, drag-to-dismiss, built-in dialog a11y (focus
  trap, Escape, restore focus). Used on all viewports, not the Dialog (decided in review
  2026-09-26). Planner decides whether this becomes a reusable shared `Sheet`/`Drawer`
  component or stays local to the feature.
- French inclusive copy; dates via `fr-FR` (`26 sept. 2026`).
- WCAG 2.1 AA; 44px touch targets; full light/dark parity.
- **Spec impact**: FR-006a updated accordingly (Corrections summarized as a count in the
  summary, listed in full in the history).
- Builder must not invent: extra copy (subtitles, taglines), icons per category, or per-entry
  links to features.
