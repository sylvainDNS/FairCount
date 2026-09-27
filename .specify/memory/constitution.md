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
  si la logique monétaire est touchée, cohérence entre la version de l'app et la dernière entrée
  du changelog.

### Releases et changelog

Chaque merge sur `main` déploie ; seul un changement de version annonce une release aux
utilisateur·rices.

- Tout changement visible par les utilisateur·rices MUST incrémenter la version de l'app
  (`package.json`, semver) et ajouter, dans la même PR, l'entrée correspondante au changelog
  utilisateur.
- Semver côté produit : MAJOR pour une rupture d'usage ou de données, MINOR si la release contient
  au moins une Nouveauté, PATCH si elle ne contient que des Améliorations ou Corrections.
- Chaque entrée est rédigée en français, en langage non technique et en écriture inclusive, et
  classée en « Nouveauté », « Amélioration » ou « Correction ». Le changelog n'est jamais généré
  depuis les messages de commit.
- Une PR purement technique (refactor, CI, dépendances, tests) MUST NOT changer la version ni le
  changelog.
- La version de l'app et la version la plus récente du changelog MUST être identiques ; une
  incohérence bloque le merge.

Rationale : les utilisateur·rices ne voient que la version et ses nouveautés ; un numéro qui ne
bouge jamais ou un changelog technique rendent les mises à jour invisibles.

## Governance

- Cette constitution prévaut sur toute autre pratique documentée en cas de conflit.
- Amendement : PR modifiant ce fichier, avec rationale, bump de version sémantique
  (MAJOR : retrait/redéfinition incompatible d'un principe ; MINOR : ajout/extension
  matérielle ; PATCH : clarification) et mise à jour du Sync Impact Report.
- Toute revue de code/plan vérifie la conformité aux principes ; toute complexité dérogatoire
  doit être justifiée dans la section « Complexity Tracking » du plan.
- Guidance runtime : `CLAUDE.md` et `SPECS.md` complètent sans contredire.

**Version**: 1.1.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-09-26
