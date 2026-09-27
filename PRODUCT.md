# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first PWA (installable, `display: standalone`, portrait). Mobile web, not a native app.

## Users

Any group that shares recurring or occasional costs, with no single audience prioritized: couples and households, flatmates, groups of friends. The common thread is members whose incomes differ and who want each person to pay according to their means rather than an equal split.

Typical job: log an expense right after paying (often on a phone), see who owes whom, and settle up without arguing about fairness.

## Product Purpose

FairCount splits shared expenses in proportion to each member's income. Each member's coefficient is their income divided by the group's total income; each expense's fair share follows from those coefficients. Balances recompute automatically, and optimized settlement suggestions reduce the number of transfers.

Success: a group trusts the numbers without having to check them, and nobody feels they pay more than their share relative to what they earn.

## Positioning

"L'équité, pas l'égalité" — "Chacun·e contribue selon ses moyens." Classic expense-splitting apps divide costs equally; FairCount splits by income coefficient. Transparency is the trust mechanism: every member sees everyone's income, so the split is verifiable rather than opaque.

## Operating Context

- Groups are horizontal: no admin role; any member can manage the group.
- Members join by email invitation or shareable link; people without an account can also be listed as members.
- Expenses record who paid, the amount, date, description, and for whom (whole group or specific people).
- Settlements are a separate model from expenses, always one payer to one recipient, with no confirmation step (trust is assumed).
- Optional virtual "joint account" payer per group: it can only pay expenses, never benefits from one or appears in balances; its cost is redistributed across active persons by coefficient.
- Sign-in is passwordless via email magic link.

## Capabilities and Constraints

- Shipped (v1.0): magic-link auth, groups and invitations, members with incomes, expenses, auto-recomputed balances, dedicated settlements. In progress (v1.1): push notifications, data export, joint account. Planned (v2.0): recurring expenses, category budgets, statistics and charts, multi-currency.
- Money is handled in integer cents; group balances always sum to exactly zero; rounding remainders are distributed deterministically. A one-cent error breaks the product's promise.
- Incomes are fully visible to all group members. This is the confirmed product stance. SPECS.md also mentions a "coefficients only" display option and income encryption at rest; neither exists in code today, and whether they ship is undecided.
- Currency defaults to EUR; French only for now, with English and locale-aware money/date formats anticipated.
- Free and open to the public; no monetization planned. Open source under MIT.
- Runs on Cloudflare (Workers, D1, Pages); the frontend must stay light and route-split.
- Terminology (from the SPECS.md glossary): personne membre, groupe, dépense, coefficient, solde, remboursement, part équitable.

## Brand Commitments

- Name: FairCount.
- UI language: French with inclusive writing (point médian: ami·e·s, chacun·e, tou·te·s) and inclusive vocabulary ("personne membre" rather than "membre" or "utilisateur").
- Tone (inferred from existing copy, not yet confirmed): plain, reassuring, non-judgmental about money; fairness is explained, never moralized.

## Evidence on Hand

- Worked example used across docs and the landing page: Alex 3 000 €/mois (50 %), Sam 2 000 €/mois (33 %), Charlie 1 000 €/mois (17 %); a 120 € expense splits into 60 € / 40 € / 20 € (`SPECS.md`, `src/features/landing/components/ConceptSection.tsx`).
- PWA icons in `public/icons/`, manifest in `public/manifest.json`.
- No user counts, testimonials, press, or usage metrics exist. Do not invent any.

## Product Principles

1. **Trust through exact numbers.** Every amount must be correct to the cent and explainable from coefficients; when in doubt, show the calculation.
2. **Fairness is proportional, and visible.** Transparency about incomes is the mechanism, not a risk to hide; present it calmly and matter-of-factly.
3. **Fast capture, on the go.** Logging an expense right after paying, one-handed on a phone, is the core loop and must stay effortless.
4. **Horizontal and trusting.** No admins, no confirmations, no policing between members; the product assumes good faith.
5. **Inclusive by default.** Language, examples, and access work for everyone, whatever their income, situation, or ability.

## Accessibility & Inclusion

WCAG 2.1 AA: full keyboard navigation, sufficient contrast, explicit labels on every field, descriptive error messages, screen-reader support. Interactive patterns use Ark UI; decorative SVGs carry `aria-hidden="true"`. Dark mode supported. Inclusive French writing throughout the UI.
