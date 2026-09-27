# Implementation Plan: Changelog « Nouveautés » in-app

**Branch**: `002-app-changelog` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-app-changelog/spec.md` · Design:
[design-brief.md](./design-brief.md)

## Summary

Annoncer les nouveautés de chaque release dans l'app, en complément du toast de mise à jour.
Approche : un changelog **typé, écrit à la main et embarqué dans le bundle**
(`features/changelog/data/changelog.ts`), dont la tête doit égaler `package.json#version`
(test Vitest = gate CI). Au chargement d'une version plus récente que la dernière vue sur
l'appareil (état `localStorage`), un moteur de décision pur calcule le résumé à afficher dans
un Drawer Ark UI chargé à la demande, monté dans `Layout` (donc jamais sur landing/login/
invitation). Une page lazy `/profile/changelog` liste l'historique ; une pastille sur
l'onglet/lien Profil signale les nouveautés non consultées. Aucun changement serveur.
Décisions : [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x strict (`exactOptionalPropertyTypes: true`)

**Primary Dependencies**: React 19 + Vite 6, React Router 7, Ark UI 5.30 (`Drawer`), Tailwind 4,
CVA + tailwind-merge, vite-plugin-pwa (toast existant inchangé)

**Storage**: `localStorage` navigateur (2 clés) ; aucun D1, aucune migration

**Testing**: Vitest + Testing Library (jsdom) ; moteur, store, versions et digest en fonctions
pures testées d'abord ; tests composant pour la feuille, la page et la pastille

**Target Platform**: PWA mobile-first (Cloudflare Pages) ; aucun impact Worker

**Project Type**: web app (frontend `src/features/*` uniquement)

**Performance Goals**: aucun coût perceptible sur les écrans existants (SC-005) : Drawer + feuille
en chunk lazy chargé seulement si un résumé est dû ; page historique en route lazy

**Constraints**: hors ligne (FR-013, contenu dans le bundle précaché) ; WCAG 2.1 AA (FR-014) ;
UI française inclusive ; storage potentiellement indisponible (navigation privée)

**Scale/Scope**: 1 nouvelle feature (~12 fichiers), 5 fichiers existants modifiés (`Layout`,
`BottomNav`, `ProfilePage`, routes, configs Vite/Vitest + `vite-env.d.ts`), bump
`package.json` → 0.2.0

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Évaluation | Statut |
|----------|------------|--------|
| I. Intégrité des calculs | Aucune logique monétaire touchée. | ✅ N/A |
| II. Test-First | Moteur de décision, comparaison de versions, digest, pluriels, store et gate de cohérence écrits en tests d'abord (red → green). Composants testés sur leurs comportements observables (contrat §4). | ✅ PASS |
| III. Architecture feature-based | Nouvelle feature `src/features/changelog/` avec barrel sélectif (6 exports, cf. contrat §2). `shared/Layout` et `BottomNav` importent `@/features/changelog` (précédent : `Layout` importe déjà `@/features/auth`). État local via `useSyncExternalStore`, pas d'état serveur donc pas de TanStack Query. | ✅ PASS |
| IV. Type safety | Changelog `as const satisfies readonly ChangelogRelease[]` (catégories en union littérale) ; `__APP_VERSION__` déclaré dans `vite-env.d.ts` ; valeurs `localStorage` validées (semver) avant usage, jamais castées. | ✅ PASS |
| V. Edge-first | Pas de Worker ni D1. Feuille + Drawer en `React.lazy` hors chemin critique ; page en route lazy (code splitting par route). | ✅ PASS |
| Contraintes additionnelles | Écriture inclusive, SVG inline `aria-hidden`, Ark UI pour le pattern interactif, Biome. | ✅ PASS |
| Workflow — Releases et changelog | Cette PR est une release annonçable : bump `package.json` 0.1.0 → 0.2.0 (MINOR, contient des Nouveautés) + entrées 0.2.0 et 0.1.0 (« Première version ») ; le gate de cohérence est livré par cette feature. | ✅ PASS |

**Re-check post-Phase 1** : inchangé, aucune violation introduite par le design détaillé. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/002-app-changelog/
├── spec.md
├── design-brief.md          # impeccable shape (confirmé)
├── plan.md                  # ce fichier
├── research.md              # R1–R11
├── data-model.md            # entités, état local, règles de décision
├── contracts/
│   └── changelog-module.md  # format de données, API publique, routes, surfaces UI
├── quickstart.md
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks (à venir)
```

### Source Code (repository root)

```text
src/features/changelog/                 # NEW
├── data/
│   ├── changelog.ts                    # releases, écrit à la main (R1)
│   └── changelog.test.ts               # gate version ↔ changelog (R3)
├── lib/
│   ├── version.ts / version.test.ts    # parseVersion, compareVersions (R4)
│   ├── resolve-changelog-state.ts      # moteur de décision pur (R6)
│   ├── resolve-changelog-state.test.ts
│   ├── format.ts / format.test.ts      # dates fr-FR, pluriels, libellés de version (R11)
│   └── app-version.ts                  # APP_VERSION = __APP_VERSION__ (R2)
├── store/
│   ├── changelog-storage.ts            # localStorage + fallback mémoire + event storage (R5)
│   └── changelog-storage.test.ts
├── hooks/
│   ├── useChangelogState.ts            # useSyncExternalStore + moteur
│   └── useChangelogUnread.ts
├── components/
│   ├── ChangelogSummaryGate.tsx        # monté dans Layout, lazy-load de la feuille (R8)
│   ├── WhatsNewSheet.tsx (+ .test.tsx) # Ark Drawer (R9) — UI via skill impeccable
│   ├── ChangelogPage.tsx (+ .test.tsx) # page historique (R10) — UI via skill impeccable
│   ├── ChangelogEntryRow.tsx           # ligne du profil — UI via skill impeccable
│   └── UnreadDot.tsx                   # pastille partagée par nav/sidebar/ligne
├── types.ts                            # ChangelogRelease, ChangelogChange, ChangelogDigest
└── index.ts                            # barrel sélectif (contrat §2)

src/shared/components/Layout.tsx        # MOD: monte ChangelogSummaryGate ; pastille sidebar
src/shared/components/BottomNav.tsx     # MOD: pastille + nom accessible sur Profil
src/features/auth/components/ProfilePage.tsx  # MOD: ChangelogEntryRow
src/routes/index.tsx                    # MOD: route lazy profile/changelog
vite.config.ts, vitest.config.ts        # MOD: define __APP_VERSION__ (+ alias et defines de test
                                        #      __GIT_SHA__/__BUILD_DATE__ dans vitest.config.ts)
src/vite-env.d.ts                       # MOD: declare __APP_VERSION__
src/test/setup.ts                       # MOD: polyfills jsdom pour Drawer (R9)
src/test/pwa-register-stub.ts           # NEW: stub de virtual:pwa-register/react pour Vitest (R9)
src/shared/components/update-available.ts     # NEW: store « mise à jour en attente » (R9)
src/shared/components/UpdatePrompt.tsx        # MOD: publie needRefresh dans ce store
.github/workflows/deploy.yml            # MOD: étape `pnpm test` avant le build (FR-002a)
package.json                            # MOD: version 0.2.0
```

**Structure Decision**: web app existante, frontend seul. Tout le code nouveau vit dans
`src/features/changelog/` ; les points d'intégration (`Layout`, `BottomNav`, `ProfilePage`,
routes) ne consomment que le barrel public.

## Complexity Tracking

Aucune violation constitutionnelle à justifier.

## Décisions de revue (2026-09-26)

1. **Pas de règle de lancement** (R7) : FR-006 s'applique à tou·tes ; les personnes déjà
   inscrites n'ont ni résumé ni pastille pour la 0.2.0 et trouvent l'historique via le profil.
2. **Historique initial** : deux releases, 0.2.0 (compte commun + page Nouveautés) et 0.1.0
   (« Première version », fonctionnalités de base). Textes : contrat §1.
3. **Date de la 0.2.0** : jour du merge, renseignée dans la PR de release. Date de la 0.1.0 :
   2026-02-09 (premier commit, approximation de la mise en ligne, modifiable).

Aucune question ouverte.
