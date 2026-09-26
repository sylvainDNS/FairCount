<!--
Sync Impact Report
- Version change: template → 1.0.0
- Modified principles: n/a (initial adoption)
- Added sections: Core Principles (5), Contraintes additionnelles, Workflow de développement, Governance
- Removed sections: none
- Templates: ✅ .specify/templates/plan-template.md (Constitution Check générique, compatible)
             ✅ spec-template.md / tasks-template.md / checklist-template.md (aucune référence à mettre à jour)
- Deferred TODOs: none
-->

# FairCount Constitution

## Core Principles

### I. Intégrité des calculs d'équité (NON-NEGOTIABLE)

Le cœur du produit est la répartition proportionnelle aux revenus. Règles :

- Tout montant est manipulé en centimes entiers ; aucune arithmétique flottante sur l'argent.
- Invariant : la somme des soldes d'un groupe vaut exactement 0 après chaque opération
  (dépense, remboursement, changement de coefficient).
- Les parts sont dérivées des coefficients de revenus ; les restes d'arrondi sont distribués
  de façon déterministe et documentée.
- Toute modification de la logique de calcul (parts, soldes, settlements) exige des tests
  couvrant les cas d'arrondi et les invariants, avant merge.

Rationale : une erreur d'un centime détruit la confiance dans une app dont la promesse est
l'équité.

### II. Test-First (NON-NEGOTIABLE)

TDD strict : tests écrits → validés en échec (red) → implémentation (green) → refactor.

- Aucune logique métier, helper SQL, route API ou composant partagé sans test écrit d'abord.
- Vitest est le runner unique (`src/**/*.test.{ts,tsx}`) ; les tests doivent passer avant
  tout commit.
- Un bug corrigé commence par un test de régression qui le reproduit.

### III. Architecture feature-based

- Chaque feature vit dans `src/features/{feature}/` (api/, components/, hooks/, types.ts) et
  n'expose que son API publique via son `index.ts` — exports sélectifs, jamais de wildcard.
- Les imports internes à une feature utilisent des chemins relatifs directs ; les imports
  inter-features passent par la racine de la feature (`@/features/x`).
- Le state serveur passe exclusivement par TanStack Query : query keys dans
  `src/lib/query-keys.ts`, invalidations dans `src/lib/query-invalidations.ts`.

Rationale : garder chaque feature compréhensible et remplaçable isolément.

### IV. Type safety de bout en bout

- Les types DB sont inférés du schéma Drizzle (`src/db/schema/index.ts`) et servent de
  contrat API — jamais de types dupliqués à la main.
- Toute entrée externe est validée par Zod : `zValidator` côté Hono, `zodResolver` côté
  formulaires, schémas centralisés dans `src/lib/schemas/`.
- TypeScript strict (dont `exactOptionalPropertyTypes`) ; `any` et assertions non justifiées
  interdits.

### V. Edge-first (Cloudflare)

Le code doit respecter les contraintes de la plateforme cible :

- D1 : max 100 paramètres liés par requête — utiliser les helpers de chunking
  (`selectByIdsChunked`, `src/workers/services/shared/sql-helpers.ts`) pour toute clause IN.
- Workers : pas d'API Node non supportées, pas d'état global mutable entre requêtes,
  requêtes indépendantes parallélisées.
- Frontend : PWA mobile-first, code splitting par route (`React.lazy`), landing seule en eager.

## Contraintes additionnelles

- Langue : UI en français avec écriture inclusive (point médian, cf. SPECS.md) ;
  commentaires de code et identifiants en anglais.
- Accessibilité : SVG décoratifs avec `aria-hidden="true"`, composants Ark UI pour les
  patterns interactifs, pas de lucide-react (SVG inline uniquement).
- Lint/format : Biome (`pnpm check`) doit passer avant commit.
- Secrets : uniquement via `.dev.vars` / secrets Wrangler, jamais commités.

## Workflow de développement

- Commits au format Conventional Commits.
- Une PR/feature = spec → plan → tasks (workflow Spec Kit) pour tout travail non trivial.
- Gates avant merge : tests Vitest verts, `pnpm check` vert, invariants du Principe I vérifiés
  si la logique monétaire est touchée.

## Governance

- Cette constitution prévaut sur toute autre pratique documentée en cas de conflit.
- Amendement : PR modifiant ce fichier, avec rationale, bump de version sémantique
  (MAJOR : retrait/redéfinition incompatible d'un principe ; MINOR : ajout/extension
  matérielle ; PATCH : clarification) et mise à jour du Sync Impact Report.
- Toute revue de code/plan vérifie la conformité aux principes ; toute complexité dérogatoire
  doit être justifiée dans la section « Complexity Tracking » du plan.
- Guidance runtime : `CLAUDE.md` et `SPECS.md` complètent sans contredire.

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16
