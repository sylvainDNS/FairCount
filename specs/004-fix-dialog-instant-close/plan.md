# Implementation Plan: Correction des fenêtres qui se ferment instantanément

**Branch**: `004-fix-dialog-instant-close` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-fix-dialog-instant-close/spec.md`

## Summary

Sur Firefox, quand une fenêtre modale en **remplace** une autre (détail dépense → confirmation
de suppression ou formulaire de modification ; détail → récurrence ; détail récurrence →
modification / confirmation), la nouvelle fenêtre se ferme aussitôt. Cause de travail
([research.md](./research.md) R2) : à son démontage, la fenêtre sortante rend le focus à
l'élément d'origine (la carte de la liste) ; depuis la mise à jour Ark UI 5.39.2 / Zag 1.43.3
(2026-09-26), la fenêtre entrante écoute `focusin` dès son montage et interprète ce focus
extérieur comme une demande de fermeture. Correctif (R4 révisée) : **mise à jour d'Ark UI vers
5.39.3** (Zag 1.45.0 arme cette écoute après le piège à focus), sans code maison ; les
fermetures volontaires (fond, Échap, boutons) restent inchangées. Cause confirmée dans Firefox
avant correction, tests de régression rouges sur 5.39.2 et verts sur 5.39.3, release 0.3.1.

## Technical Context

**Language/Version**: TypeScript 5.x strict (`exactOptionalPropertyTypes: true`)

**Primary Dependencies**: React 19, `@ark-ui/react` 5.39.2 → **5.39.3** (Dialog →
`@zag-js/dialog`, `dismissable`, `focus-trap` 1.43.3 → 1.45.0), cf. research R6

**Storage**: N/A

**Testing**: Vitest + Testing Library (jsdom) ; vérification manuelle Firefox / Chrome / Safari
via [quickstart.md](./quickstart.md)

**Target Platform**: PWA mobile-first ; Firefox, Chrome, Safari récents, desktop et mobile

**Project Type**: web app (frontend `src/features/*`, `src/shared/*`) — backend non touché

**Performance Goals**: N/A (aucun coût ajouté)

**Constraints**: conserver le pattern « remplacement, pas d'empilement » (choix a11y documenté
dans `RecurrenceDetail.tsx`) ; aucun changement de libellés ni de comportement d'annulation

**Scale/Scope**: 1 mise à jour de dépendance (Ark UI, mineure dans la 5.x), 1 helper de test,
1 nouveau fichier de test composant + 3 fichiers de test complétés, aucun composant modifié,
version + changelog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Évaluation | Statut |
|----------|------------|--------|
| I. Intégrité des calculs | Aucune logique monétaire touchée | ✅ N/A |
| II. Test-First | Reproduction Firefox d'abord (R3), puis tests de régression rouges (R5) avant le correctif ; `ConfirmDialog` (composant partagé) obtient enfin son test | ✅ |
| III. Feature-based | Aucun code applicatif ajouté ; helper de test dans `src/test/` ; aucun nouvel export de feature | ✅ |
| IV. Type safety | Tests typés (`ComponentProps`), pas d'`any` | ✅ |
| V. Edge-first | Frontend uniquement, pas d'impact bundle notable (mise à jour mineure d'Ark UI) | ✅ |
| Contraintes a11y | Fermeture par Échap / fond / boutons conservée ; retour de focus à la fermeture simple conservé (`restoreFocus` inchangé) | ✅ |
| Releases et changelog | Changement visible → 0.3.1 (PATCH) + entrée `fix` dans la même PR | ✅ |

**Post-design re-check** : inchangé, aucune violation → pas de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-dialog-instant-close/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 — cause racine, correctif, tests
├── data-model.md        # Phase 1 — aucun changement de données
├── quickstart.md        # Phase 1 — reproduction + vérification navigateurs
├── contracts/
│   └── dialog-dismissal.md   # Contrat de fermeture des fenêtres modales
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── test/
│   └── focus-outside.ts              # NEW — helper « focus extérieur » des tests
├── shared/components/
│   └── ConfirmDialog.test.tsx        # NEW — régression + fermetures volontaires
└── features/
    ├── expenses/components/
    │   ├── ExpenseDetail.test.tsx    # + bloc « dismissal »
    │   ├── ExpenseForm.test.tsx      # + bloc « dismissal »
    │   └── RecurrenceDetail.test.tsx # + bloc « dismissal » (détail + confirmation)
    └── changelog/data/changelog.ts   # entrée 0.3.1 (fix)
package.json                          # 0.3.0 → 0.3.1 ; @ark-ui/react ^5.39.3
pnpm-lock.yaml                        # @zag-js/* 1.45.0
```

**Structure Decision**: aucun composant modifié, la mise à jour d'Ark UI corrige la cause
(R4 révisée) ; les tests verrouillent le comportement. Les autres fenêtres (`SettlementHistory`,
`IncomeForm`, `MemberList`, `WhatsNewSheet`) ne remplacent jamais une fenêtre par une autre et
restent hors périmètre (spec, Assumptions) ; elles profitent aussi de la mise à jour.

## Implementation Order

1. **Reproduire** dans Firefox, sur Ark UI 5.39.2 (R3) : `focus.outside` sur la carte → R2
   confirmée.
2. **Tests rouges** (R5) sur 5.39.2 : `ConfirmDialog.test.tsx` + blocs « dismissal » de
   `ExpenseDetail`, `ExpenseForm`, `RecurrenceDetail`.
3. **Correctif = mise à jour d'Ark UI** → 5.39.3 (R6) : tests verts sans autre changement ;
   `pnpm test`, `pnpm check`, `tsc -b`.
4. **Vérification navigateurs** (quickstart §2–3) : Firefox (US1–US3), non-régression Chrome et
   Safari, autres composants Ark UI. Si le bug persiste dans Firefox : repli sur le handler de
   R4 (décision initiale).
5. **Release** : 0.3.1 + entrée changelog `fix` (R7).

## Complexity Tracking

Aucune violation.
