---
name: FairCount
description: Shared expenses split by income, calmly and to the cent.
colors:
  steady-blue: "#2563eb"
  steady-blue-deep: "#1d4ed8"
  steady-blue-light: "#60a5fa"
  steady-blue-wash: "#eff6ff"
  owed-green: "#059669"
  owed-green-light: "#34d399"
  owed-green-wash: "#ecfdf5"
  owing-red: "#dc2626"
  owing-red-light: "#f87171"
  owing-red-wash: "#fef2f2"
  caution-amber: "#f59e0b"
  ink: "#0f172a"
  ink-soft: "#334155"
  slate-muted: "#64748b"
  slate-placeholder: "#94a3b8"
  line: "#e2e8f0"
  line-strong: "#cbd5e1"
  canvas: "#f8fafc"
  surface: "#ffffff"
  surface-sunken: "#f1f5f9"
  night-canvas: "#020617"
  night-surface: "#0f172a"
  night-raised: "#1e293b"
  night-line: "#1e293b"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  balance:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.steady-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.steady-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.owing-red}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.steady-blue}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  balance-summary-owed:
    backgroundColor: "{colors.owed-green-wash}"
    textColor: "{colors.owed-green}"
    typography: "{typography.balance}"
    rounded: "{rounded.xl}"
    padding: "24px"
  balance-summary-owing:
    backgroundColor: "{colors.owing-red-wash}"
    textColor: "{colors.owing-red}"
    typography: "{typography.balance}"
    rounded: "{rounded.xl}"
    padding: "24px"
  segmented-track:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.lg}"
    padding: "4px"
  segmented-item-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  badge-soft:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    padding: "2px 10px"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-muted}"
    height: "64px"
---

# Design System: FairCount

## Overview

**Creative North Star: "The Calm Table"**

FairCount is the kitchen table where a household, a flatshare or a group of friends sits down to settle the accounts, without tension. The system is quiet on purpose: cool slate neutrals, white surfaces laid on a barely tinted canvas, thin borders instead of shadows, and a single steady blue that marks where to act. Nothing competes with the numbers. Color is reserved for meaning: blue for action, green for what the group owes you, red for what you owe, and even those appear only where a balance is actually shown.

Density is moderate and mobile-first: one readable column (max 672px) with 16px gutters, cards stacked with calm spacing, a bottom tab bar on phones and a fixed sidebar from 768px up. Dark mode is a first-class twin, not an afterthought: every surface, line and text color has a slate night counterpart.

The system rejects three things explicitly. It is not a cold banking app: no corporate fintech chrome, dense dashboards or jargon. It is not gamified: no confetti, badges or saturated color used to motivate. And red never shames: a debt is information about a balance, not a fault.

**Key Characteristics:**
- Flat, bordered surfaces on a cool slate canvas; shadows only for things that float.
- One action color (Steady Blue); semantic green/red only for balances and destructive actions.
- A single typeface (Inter) carrying the whole hierarchy through size and weight.
- Gently rounded forms: 8px for controls, 12px for cards and dialogs, full circles for avatars.
- Full light/dark parity on every token.

## Colors

A cool, restrained slate palette with one steady blue accent and a meaning-bound green/red pair for money.

### Primary
- **Steady Blue** (`steady-blue`): the only action color. Primary buttons, text links and "Voir le détail →" actions, ghost buttons, focus rings on every control, the selected pill in segmented filters, and the browser/PWA theme color. Hover deepens to **Steady Blue Deep**; on dark surfaces text links lift to **Steady Blue Light**. **Steady Blue Wash** tints informational callouts and highlights the current person's row in balance lists.

### Secondary
- **Owed Green** (`owed-green`): a positive balance, "On vous doit …". Used as text color on amounts and, as **Owed Green Wash** with a green border, as the background of the personal balance summary when it is positive. **Owed Green Light** replaces it on dark surfaces.
- **Owing Red** (`owing-red`): a negative balance, "Vous devez …", plus destructive actions (danger buttons, delete links) and field errors. **Owing Red Wash** backs the negative balance summary and danger hover states. **Owing Red Light** on dark surfaces.

### Tertiary
- **Caution Amber** (`caution-amber`): warning badges only. Rare by design.

### Neutral
- **Ink** (`ink`): primary text, headings, amounts at rest.
- **Ink Soft** (`ink-soft`): form labels, outline button text, secondary headings.
- **Slate Muted** (`slate-muted`): metadata, captions, inactive nav items, the "(vous)" marker, required-field asterisks.
- **Slate Placeholder** (`slate-placeholder`): input placeholders and close icons.
- **Line** (`line`) and **Line Strong** (`line-strong`): card and divider borders; input and outline-button borders.
- **Canvas** (`canvas`): app background behind cards. **Surface** (`surface`): cards, nav, dialogs, inputs. **Surface Sunken** (`surface-sunken`): segmented-control tracks, secondary buttons, soft badges, skeletons.
- **Night Canvas / Night Surface / Night Raised / Night Line**: the dark-mode twins of canvas, surface, sunken/raised surfaces and borders.

### Named Rules
**The One Voice Rule.** Steady Blue is the only accent that means "act here". Do not introduce a second interactive hue. Steady Blue is used directly as Tailwind's `blue-*` scale (600 fill, 700 deep, 400 on dark, 50 wash); there is no separate `primary-*` token scale, and the former teal one has been removed.

**The Money Speaks in Two Colors Rule.** Green and red appear only where a balance or a destructive consequence is shown. Never use them for decoration, category coding or success toasts that are not about money.

**The Informs-Not-Alarms Rule.** Owing Red states a balance; it never comes with warning icons, shaking, bold alerts or guilt copy. A negative balance uses the same calm layout as a positive one.

## Typography

**Display Font:** Inter (with system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Inter (same stack)

**Character:** One humanist sans does everything; hierarchy comes from size and weight (400/500/600/700), never from a second family. Neutral, legible at small sizes on phones, and quietly precise with numbers.

### Hierarchy
- **Headline** (700, 1.5rem, 1.33): page and section titles ("L'équité, pas l'égalité", group names on detail pages).
- **Balance** (700, 1.875rem, 1.2): the personal balance amount in the balance summary. The largest number on any app screen, colored by sign.
- **Title** (600, 1.125rem, 1.55): card titles, dialog titles, list-section headers.
- **Body** (400, 1rem, 1.5): default reading text; inputs are forced to 16px so iOS never zooms.
- **Body Small** (400, 0.875rem, 1.43): the workhorse. Most list content, descriptions, toast bodies, sidebar links.
- **Label** (500, 0.875rem, 1.43): form labels, button text, tab and segmented items, names in lists.
- **Caption** (400, 0.75rem, 1.33): secondary amounts ("Part : …"), dates, bottom-nav labels, badges (small).

### Named Rules
**The Weight Before Size Rule.** Reach for 500/600 before a bigger size. Amounts in lists are 600 at body size, not larger text.

**The Signed Amount Rule.** Positive balances always carry an explicit `+`; negative ones keep the locale minus. Currency is always formatted with `fr-FR` conventions (narrow no-break space before €).

## Layout

Mobile-first single column. Content sits in a centered column capped at 672px with 16px side padding and 24px vertical padding, on the Canvas background. Below 768px a fixed 64px bottom tab bar (plus safe-area inset) holds navigation and the main area reserves 80px of bottom padding; from 768px a fixed 256px white sidebar replaces it and the content shifts right. Safe-area insets (`env(safe-area-inset-*)`) are respected on body and nav for standalone PWA use.

Spacing follows the 4px Tailwind grid, in practice a small set: 4px (tight stacks, badge padding), 8px (icon gaps, field label spacing), 16px (card padding, list-row padding, gutters), 24px (summary and dialog padding, section gaps), 48px (landing sections). Lists are rows inside one bordered card, separated by hairline dividers, rather than separate floating cards.

Breakpoints: `sm` 640px (dialogs stop being full-screen), `md` 768px (sidebar replaces bottom nav), `lg` 1024px (reserved).

## Elevation & Depth

Flat by default. Depth comes from tonal layering (white Surface on slate Canvas) and 1px Line borders, not shadows. Resting cards carry at most a whisper of shadow, and many carry none. Real shadows are reserved for elements that float above the page.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): some resting cards and the selected item in segmented controls and tabs.
- **Popover** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): select dropdowns and tooltips.
- **Dialog** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): centered dialogs from 640px, over a 50% black backdrop.

### Named Rules
**The Floats-Only Rule.** Only popovers, tooltips, toasts and dialogs cast a real shadow. Anything that sits in the page flow is flat and bordered.

## Shapes

Gently rounded, never pill-shaped for containers. Controls (buttons, inputs, selects, segmented tracks, sidebar links) use 8px. Cards, balance summaries, dialogs and callouts use 12px. Badges use 6px, or full pills when they act as filter chips. Avatars and member initials are full circles. Borders are always 1px; skeleton bars use 4px.

Dialogs change shape by viewport: full-bleed sheets with square corners on phones, 12px-rounded centered panels from 640px.

## Components

### Buttons
Calm and confident: flat fills, no gradients, no shadow.
- **Shape:** gently rounded (8px).
- **Primary:** Steady Blue fill, white 500-weight text, 8px × 16px padding (sm: 4px × 12px, 14px text; lg: 12px × 24px, 18px text).
- **Hover / Focus:** hover deepens the fill (Steady Blue Deep) with a color transition; focus shows a 2px ring in the variant's hue with a 2px offset. Disabled drops to 50% opacity. Loading swaps the label for a spinner + loading text and sets `aria-busy`.
- **Secondary:** Surface Sunken fill, Ink text; hover one step darker.
- **Outline:** 1px Line Strong border, Ink Soft text; hover tints to Canvas.
- **Danger:** Owing Red fill, white text. **Ghost:** Steady Blue text, underline on hover. **Ghost-danger:** Owing Red text, Owing Red Wash on hover.

### Chips / Badges
- **Style:** soft by default: Surface Sunken background with Ink Soft text, 6px radius, 500 weight. Semantic variants (success, warning, danger, info) swap in their wash + text pair; solid and outline appearances exist but are rare.
- **Filter pills (SegmentedControl `pill`):** Slate Muted text, sunken hover; selected pill turns Steady Blue Wash with deep blue text.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Surface (Night Surface in dark).
- **Shadow Strategy:** flat, or the hairline lift (see Elevation).
- **Border:** 1px Line (Night Line in dark).
- **Internal Padding:** 16px for list cards, 24px for summaries and forms; list cards often use `overflow-hidden` with rows padded 16px and divided by hairlines.

### Inputs / Fields
- **Style:** 1px Line Strong border, Surface background, 8px radius, 8px × 12px padding, Ink text, Slate Placeholder placeholder, 16px font.
- **Focus:** the border becomes transparent and a 2px Steady Blue ring takes over.
- **Error / Disabled:** error swaps border and ring to Owing Red, with a 14px Owing Red message below; disabled goes to 50% opacity. Labels are 14px/500 Ink Soft with a muted required asterisk.

### Navigation
- **Mobile bottom bar:** white, top hairline border, 64px tall + safe area, max 448px of centered items. Each item stacks a 24px stroke icon over a 12px label; inactive in Slate Muted, active in the accent color.
- **Desktop sidebar:** 256px, white, right hairline border; wordmark block on top, links as 8px-rounded rows (active: accent wash background + accent text, 500 weight; inactive: Ink Soft with sunken hover), logout and version at the bottom.

### Segmented Control / Tabs
The recurring way to switch views inside a group: a Surface Sunken track with 4px padding and 8px radius; items are 14px/500 Slate Muted text; the selected item becomes a white (Night Raised in dark) chip with Ink text and the hairline lift.

### Balance Summary (signature)
The personal balance card at the top of a group. A 12px-rounded panel with 24px padding whose wash, border and amount color follow the sign: Owed Green Wash when positive, Owing Red Wash when negative, Canvas with slate text at zero. It shows a 14px "Mon solde" label with a 24px directional arrow, the amount in the Balance style with an explicit sign, a plain-language sentence ("On vous doit …", "Vous devez …", "Votre compte est équilibré") and a Steady Blue "Voir le détail →" link.

### Member Row
List rows inside a bordered card: 40px circular avatar with white initials on a hue derived from the name, name in Label weight with a muted "(vous)" marker, a muted secondary line ("Payé : …"), and on the right the signed amount in 600 weight colored by sign above a caption ("Part : …"). The current person's row is tinted with Steady Blue Wash at half strength.

### Dialogs
Ark UI dialogs over a 50% black backdrop. Full-screen white sheets on phones; from 640px, centered 12px-rounded panels (max 448–512px) with the Dialog shadow and 24px padding.

### Toasts
Ark UI toasts, full-width on phones (with gap insets). A type-colored icon, a 14px/500 title and a 14px muted description, with an 8px-rounded close button.

## Do's and Don'ts

### Do:
- **Do** use Steady Blue (#2563eb) for every primary action, link and focus ring, and nothing else.
- **Do** build surfaces as white cards with a 1px Line border and 12px radius on the slate Canvas; keep them flat.
- **Do** color amounts by sign (Owed Green / Owing Red / Slate Muted at zero) and prefix positive amounts with `+`.
- **Do** pair every light value with its dark twin (`dark:` slate counterparts); dark mode must stay complete.
- **Do** keep inputs at 16px text and controls at 8px radius; keep 2px focus rings with offset on every interactive element.
- **Do** use inline stroke SVG icons (24px nav, 20–24px elsewhere) with `aria-hidden="true"`.

### Don't:
- **Don't** introduce a second accent hue; the active nav item, filters and links all speak Steady Blue.
- **Don't** use green or red outside balances, errors and destructive actions.
- **Don't** make a negative balance feel alarming: no warning triangles, bold alert banners or guilt copy.
- **Don't** add confetti, badges, streaks or saturated celebratory color.
- **Don't** drift toward a cold banking look: no dense dashboards, dark corporate chrome or financial jargon.
- **Don't** put shadows on in-flow cards beyond the hairline lift; real shadows are for floating layers only.
- **Don't** add a second typeface; the declared JetBrains Mono stack is unused and not loaded.
