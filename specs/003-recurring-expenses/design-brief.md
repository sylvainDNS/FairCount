# Design Brief: Dépenses récurrentes

**Source**: impeccable `shape`, 2026-09-27 · **Spec**: [spec.md](./spec.md)
**Visual authority**: DESIGN.md (« The Calm Table ») — established world, no new direction.
**Status**: Confirmed 2026-09-27 (v3: end date removed, désactiver/réactiver/supprimer split,
vocabulary fixed, glyph kept after deletion)

## 0. Vocabulary (binding for all copy)

- **Récurrence** = the model. UI: « récurrence » (« Modifier la récurrence »).
- **Échéance** = a date, never an expense. UI: « Prochaine échéance : 13 oct. ».
- **Dépense générée** = spec term only. UI calls it « dépense »; it is recognised by the repeat
  glyph and the « Récurrentes » filter.
- Never « occurrence » in the UI. Every action label names its object: « Supprimer la
  dépense » vs « Supprimer la récurrence ».

## 1. Job and audience

- **Who**: any personne membre of a group, mostly on a phone. Two moments:
  - **Setting up** (mode *Operate*): right after paying the rent or subscribing to a service,
    they log the expense once and say « ça revient tous les mois, le 1er ». Must stay as fast
    as a normal expense; the repeat option costs nothing to those who ignore it.
  - **Living with it** (mode *Operate*): opening the group's expense list weeks later, they
    see what landed automatically, what is coming next, and fix what drifted (rent went up,
    subscription paused or cancelled, payer left the group).

## 2. Outcome and proof

- Success: nobody re-types a fixed expense; everyone can tell at a glance which expenses were
  added automatically and when the next one lands; a recurrence that needs attention is
  noticed without alarm; nobody deletes the wrong thing.
- Product truth to carry: generated expenses are ordinary expenses (same balances, same fair
  split, computed with the incomes of the day they are generated). The recurrence itself never
  moves a balance — the UI must never make it look like it does.
- Realistic content: Loyer 850 €, Internet 29,99 €, Électricité 74 €, Netflix 13,49 €,
  Virement compte commun 400 €, Assurance habitation 180 €/an. No invented data.

## 3. Selected direction

Confirmed in the shape interview (2026-09-27):

- **Repeat lives inside the existing expense form, as a checkbox.** « Répéter cette dépense »
  sits right under the Date field. Unchecked, the form is exactly today's form. Checked, a
  grouped « Répétition » block unfolds in place and the Date label becomes « À partir du ».
  No sub-screen, no second entry point, no end date.
- **Frequency = segmented control + contextual day.** A 4-item segmented control
  « Jour · Semaine · Mois · An », then a one-line contextual control that reads as a sentence:
  - *Jour*: nothing more.
  - *Semaine*: « Le [lun. mar. mer. jeu. ven. sam. dim.] » — single-select pill row.
  - *Mois*: « Le [ 13 ▾ ] de chaque mois » — select 1er…31.
  - *An*: « Le 27 septembre de chaque année » — derived from « À partir du », no picker.
  The day defaults to the start date's day/weekday and follows it while the person has not
  touched the day control; once touched, it stays.
- **Live rule summary is the focal moment of the form.** At the bottom of the block, a
  repeat glyph + the rule in plain French (« Tous les mois, le 13 ») and the next due date
  (« Prochaine échéance : 13 oct. 2026 »). It is what the person checks before « Ajouter ».
- **The list gets a collapsed « Récurrences » card above the filters.** One row: count + soonest
  échéance; tap to expand the recurrence rows in the same card. Each row opens a recurrence
  detail dialog. Collapsed by default; the expanded state is remembered on the device.
- **Two ways to stop, clearly separated.** « Désactiver » is reversible and immediate (no
  confirmation, the recurrence stays in the card as « Désactivée », « Réactiver » brings it
  back). « Supprimer la récurrence » is definitive and confirmed. Both leave already generated
  expenses untouched and editable.
- **Generated expenses carry a quiet repeat glyph** at the start of their meta line, and a
  « Récurrence » row in their detail that links to the recurrence. Both survive the deletion
  of the recurrence (soft-deleted, kept as history): glyph stays, the row shows the rule +
  « Récurrence supprimée », no link.

## 4. Scope and boundaries

- In scope: repeat block in `ExpenseForm` (create), recurrence edit mode of the same form,
  « Récurrences » card in `ExpenseList`, recurrence detail dialog (modifier, désactiver,
  réactiver, supprimer), delete confirmation, repeat glyph in `ExpenseCard`, « Récurrence » row
  and delete-copy tweak in `ExpenseDetail`, « Récurrentes » filter in `ExpenseFilters`.
- Untouched: the non-recurring form flow and its copy, balances/settlements/stats screens,
  the existing joint-account marker (its green tint is an incumbent deviation from the Money
  Rule, out of scope here — reuse it as is for recurrences paid by the joint account).
- Not supported (no affordance): end date; turning an already saved expense into a recurrence;
  making a generated expense recurring; moving a recurrence to another group; a dedicated
  recurrences screen; skipping or postponing a single échéance.
- Anti-goals: no calendar/timeline visualisation, no countdowns (« dans 3 jours ! »), no
  jargon (« occurrence », « RRULE », « intervalle »), no red for paused or deactivated
  recurrences, no blue for the repeat glyph (information, not action), no second accent hue.

## 5. States and ranges

- **Recurrences per group**: 0 (card hidden) · 1–5 typical · ~15 max. Expanded list shows
  all, no inner scroll. Order: active by next échéance, then « À revoir », then « Désactivée ».
- **Collapsed row copy**: « 1 récurrence » / « 3 récurrences » ; second line « Prochaine
  échéance : Loyer, 1er oct. » (soonest active). If ≥ 1 paused: soft warning badge « 1 à
  revoir ». If none is active: « Aucune échéance prévue ».
- **Active row**: description (truncate) · rule + payer line (« Tous les mois, le 1er · Payé
  par Alex ») · right side amount (600) over next échéance caption (« 1er oct. »; today reads
  « Aujourd'hui »).
- **Paused row (« À revoir »)**: right caption replaced by soft warning badge « À revoir »;
  meta line states why (« Alex a quitté le groupe » / « Plus aucun·e participant·e
  actif·ve »).
- **Deactivated row**: description and amount in Slate Muted, soft neutral badge
  « Désactivée » instead of the date.
- **Rule sentences** (single source for form summary, rows and details):
  « Tous les jours » · « Toutes les semaines, le lundi » · « Tous les mois, le 13 » ·
  « Tous les mois, le 1er » · « Tous les ans, le 27 septembre ».
  Day ≥ 29: caption « Les mois plus courts, le dernier jour du mois. »
  29 février yearly: « Le 28 février les années non bissextiles. »
- **First échéance today**: summary reads « Première échéance : aujourd'hui — la dépense sera
  ajoutée dès l'enregistrement. »
- **Errors**: start date in the past → field error « La répétition commence au plus tôt
  aujourd'hui. Saisissez les dépenses passées une par une. »
- **Generated expense whose recurrence was deleted**: glyph kept, still matched by the
  « Récurrentes » filter; « Récurrence » row reads « Tous les mois, le 13 » + muted caption
  « Récurrence supprimée », plain text (not a button).
- **Loading**: the card renders together with the list (no dedicated skeleton); hidden if its
  own query fails (the expense list must stay usable).
- **Filter active + no match**: existing « Aucun résultat » empty state.

## 6. Interaction and layout

- **Form, repeat block**: shared `Checkbox` « Répéter cette dépense » under Date. When checked,
  a fieldset « Répétition » on Surface Sunken (8px radius, 16px padding), containing in order:
  Fréquence (segmented) → contextual day line → rule summary (`aria-live` polite, repeat
  glyph, Label-weight rule + muted caption with next échéance). Unfold with the existing
  collapsible height/opacity transition (~150–200 ms ease-out; reduced motion → instant).
  Focus stays on the checkbox. Unchecking hides the block but keeps its values until close.
  Submit label stays « Ajouter »; on success a toast « Récurrence enregistrée » with
  description « Prochaine échéance le 13 oct. » (or « Dépense ajoutée, prochaine échéance le
  27 oct. » when the first échéance is today).
- **Form, recurrence edit mode**: title « Modifier la récurrence »; no checkbox (always on);
  « À partir du » replaced by a read-only « Prochaine échéance » line that updates with the
  rule; an info note on Steady Blue Wash above the actions: « Les changements s'appliquent aux
  prochaines échéances. Les dépenses déjà ajoutées ne changent pas. »
- **Form, generated expense edit**: ordinary form, no checkbox, one muted caption under the
  title: « Ajoutée automatiquement par une récurrence. La modifier ne change pas les
  prochaines. »
- **Weekday pills**: 7 items fit a 320px width; visible labels « lun. … dim. », accessible
  names « lundi … dimanche ». Group labelled « Jour de la semaine ».
- **List card**: Ark UI Collapsible in a bordered 12px card between the « Dépenses » header
  and « Filtres ». Trigger row ≥ 44px: repeat glyph (slate-muted, 20px) · two-line text ·
  optional badge · chevron rotating on open. Accessible name includes count and next
  échéance; `aria-expanded` from Collapsible. Expanded rows use the expense-row rhythm (16px
  padding, hairline dividers) inside the same card, below a hairline under the trigger. Not
  affected by filters (it sits above them, on purpose).
- **Recurrence detail dialog**: same shell as `ExpenseDetail`. Header: description, amount,
  rule sentence with glyph, status badge when not active. Info rows: Prochaine échéance (active
  only) · Payé par · Créée par. Répartition block like expenses (shares computed exactly as
  for any expense — no extra note). Paused: a
  calm note on Surface Sunken at the top stating the cause and the fix (« Choisissez une autre
  personne qui paie pour relancer la récurrence. ») — no warning icon.
- **Detail actions** (two tiers so the destructive one is never next to the primary):
  - Main row: « Fermer » (outline) · primary « Modifier » — or primary « Réactiver » when
    deactivated.
  - Secondary row, below a hairline, text buttons: « Désactiver » (ghost, active/paused) or
    « Modifier » (ghost, deactivated) · « Supprimer la récurrence » (ghost-danger).
- **Désactiver / Réactiver**: immediate, no confirmation (reversible); dialog stays open and
  updates its status; toast « Récurrence désactivée » / « Récurrence réactivée — prochaine
  échéance le 13 oct. ».
- **Delete confirmation**: existing `ConfirmDialog`, title « Supprimer la récurrence »,
  description « Aucune nouvelle dépense ne sera ajoutée. Les dépenses déjà ajoutées restent
  dans la liste. », confirm « Supprimer ». Closes the detail on
  success.
- **Expense row glyph**: 14px repeat icon, slate-muted, inline before the date in the meta
  line, `aria-hidden` + sr-only « Dépense récurrente, ». No change to row height.
- **Expense detail (generated)**: new info row « Récurrence » → value is a Steady Blue text
  button « Tous les mois, le 13 › » that swaps the dialog to the recurrence detail (plain text
  + « Récurrence supprimée » caption when the recurrence was deleted). Its
  delete confirmation adds « Seule cette dépense est supprimée ; la récurrence continue. »
- **Filter**: new « Type » field in the filters panel, `SegmentedControl` pill « Toutes ·
  Récurrentes », counted in the active-filter dot and cleared by « Effacer ».
- **Glyph**: one inline stroke SVG (circular arrows), reused everywhere; `aria-hidden`.

## 7. Constraints and open decisions

- Reuse shared components: `Checkbox`, `SegmentedControl` (segmented + pill variants),
  `Select`, `FormField`, `Button`, `Badge` (soft warning « À revoir », soft neutral
  « Désactivée »), `ConfirmDialog`, toaster; Ark UI `Collapsible`, `Dialog`. Planner decides
  whether the rule-sentence formatter and the glyph live in the expenses feature or a new
  `recurring-expenses` feature.
- French inclusive copy; dates `fr-FR` (« 13 oct. 2026 », « 1er » for day one).
- WCAG 2.1 AA; 44px touch targets; full light/dark parity; 16px inputs.
- Builder must not invent: extra copy (taglines, onboarding tips), icons per frequency,
  per-échéance skip/postpone actions, an undo on the delete, or « Ma part » on recurrence
  rows.
