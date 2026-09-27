# Research: Changelog « Nouveautés » in-app

**Feature**: [spec.md](./spec.md) · **Design**: [design-brief.md](./design-brief.md) · **Date**: 2026-09-26

## R1 — Source du changelog

- **Decision**: module TypeScript typé `src/features/changelog/data/changelog.ts`, tableau
  `as const satisfies readonly ChangelogRelease[]`, trié du plus récent au plus ancien. Écrit à
  la main dans la PR de release (constitution, « Releases et changelog »).
- **Rationale**: type-safety de bout en bout (catégories en union littérale, typo = erreur
  `tsc`), zéro parser ni plugin Vite, embarqué dans le bundle donc précaché par le service
  worker (FR-013 hors ligne sans effort). Volume minuscule (quelques Ko sur des années).
- **Alternatives considered**: `CHANGELOG.md` parsé au build (plugin/parser à maintenir, format
  fragile) ; JSON dans `public/` chargé à la demande (fetch = état de chargement/erreur,
  cache SW à gérer, pas de typage) ; génération depuis les commits (rejeté par la spec et la
  constitution : contenu trop technique).

## R2 — Version de l'application à l'exécution

- **Decision**: exposer `package.json#version` via `define: { __APP_VERSION__ }` dans
  `vite.config.ts` **et** `vitest.config.ts`, déclaré dans `src/vite-env.d.ts` à côté de
  `__GIT_SHA__` / `__BUILD_DATE__`. Lecture centralisée dans le module de la feature.
- **Rationale**: même mécanisme que `__GIT_SHA__` (précédent dans le repo) ; la version est
  figée au build, donc cohérente avec le bundle servi par le SW.
- **Alternatives considered**: lire la version depuis la première entrée du changelog (supprime
  la double source mais `package.json` reste la référence semver du projet, et l'égalité est de
  toute façon vérifiée par R3) ; `import.meta.env.VITE_APP_VERSION` via CI (dépend du pipeline,
  absent en dev).

## R3 — Gate de cohérence version ↔ changelog (FR-002a)

- **Decision**: test Vitest `changelog.test.ts` qui échoue si : `changelog[0].version !==
  package.json#version` ; versions non strictement décroissantes ; version non conforme
  `MAJOR.MINOR.PATCH` ; date non ISO `YYYY-MM-DD` ou dates non décroissantes ; doublon de
  version. La CI existante (`ci.yml`, job `pnpm test` sur chaque PR) bloque donc le merge.
- **Rationale**: aucun nouveau workflow ; la règle vit à côté des données ; exécutée aussi en
  local (Test-First).
- **Alternatives considered**: script dédié dans `ci.yml` (duplication, non exécuté en local) ;
  hook pre-commit (contournable, non présent dans le projet).

## R4 — Comparaison de versions

- **Decision**: fonction pure `compareVersions(a, b)` (semver strict `x.y.z`, pas de pré-release)
  + `parseVersion` qui renvoie `null` si invalide. Pas de dépendance.
- **Rationale**: 15 lignes testables ; la constitution impose semver sans pré-release côté
  produit. Une dépendance `semver` (~20 Ko) serait disproportionnée côté frontend.
- **Alternatives considered**: paquet `semver` ; comparaison par dates (les versions portent
  l'ordre, pas les dates, et deux releases peuvent partager une date).

## R5 — État local « dernière version vue / consultée »

- **Decision**: deux clés `localStorage` : `faircount.changelog.lastSeen` et
  `faircount.changelog.lastConsulted` (valeur = numéro de version). Accès via un petit store
  module (`get`/`set`/`subscribe`) consommé par `useSyncExternalStore` ; lectures/écritures dans
  `try/catch` (navigation privée, quotas) avec repli en mémoire ; écoute de l'événement
  `storage` pour synchroniser les onglets.
- **Rationale**: FR-004 (par appareil, sans serveur). `useSyncExternalStore` partage l'état
  entre la barre de navigation, la sidebar, la ligne du profil et la page historique sans
  Context ni TanStack Query (ce n'est pas un état serveur, la constitution III ne s'applique
  pas). Valeur illisible ou invalide = absente.
- **Alternatives considered**: Context React (provider en plus, re-render global) ; TanStack
  Query sur une « query » locale (détourne l'outil) ; une seule clé JSON (moins lisible en
  debug, migration plus pénible).

## R6 — Moteur de décision (pur)

- **Decision**: fonction pure `resolveChangelogState(input)` →
  `{ summary: ChangelogDigest | null, unread: boolean, writes: { lastSeen?, lastConsulted? } }`,
  à partir de `currentVersion`, `lastSeen`, `lastConsulted`, `releases`.
  Toutes les règles de la spec y vivent (FR-005/006/006a/012, rollback, première ouverture) et
  sont couvertes par des tests écrits en premier. Le hook React ne fait qu'appliquer `writes`
  et exposer le résultat. Règles détaillées : [data-model.md](./data-model.md#règles-de-décision).
- **Rationale**: constitution II (TDD) — toute la logique testable sans DOM ni storage.
- **Alternatives considered**: logique dans le hook (tests plus lourds, couplage storage).

## R7 — Utilisateur·rices existant·es au lancement

- **Decision**: aucune règle spéciale. FR-006 s'applique à tou·tes : sans `lastSeen`, c'est une
  première ouverture (pas de résumé, pas de pastille). Les personnes déjà inscrites découvrent
  l'historique via le profil.
- **Rationale**: arbitrage produit (2026-09-26) : pas d'over-engineering pour un effet de
  lancement ponctuel.
- **Alternatives considered**: règle de lancement bornée à 0.2.0 basée sur `user.createdAt`
  (rejetée : complexité et cas particulier permanent dans le moteur).

## R8 — Point de montage et moment d'affichage (FR-005, FR-008)

- **Decision**: un composant `ChangelogSummaryGate` monté dans `Layout` (donc uniquement sous
  `ProtectedRoute`, jamais sur landing / login / `/auth/error` / `/invite/:token`, qui sont hors
  `Layout`). Il évalue `resolveChangelogState` au montage ; si un résumé est dû, il charge
  paresseusement (`React.lazy`) le composant `WhatsNewSheet`. Pas de lien avec `UpdatePrompt` :
  la détection se fait au chargement du nouveau bundle, quel que soit le déclencheur.
- **Rationale**: FR-008 et le cas « invitation » satisfaits par construction ; SC-005 (pas de
  coût pour les écrans existants : le Drawer et la feuille ne sont téléchargés que si besoin) ;
  le toast reste intact (FR-001).
- **Alternatives considered**: montage dans `App.tsx` + filtre sur les routes (fragile) ;
  déclenchement depuis le callback du toast (rate le rechargement manuel, contraire aux edge
  cases).

## R9 — Composant de la feuille

- **Decision**: Ark UI `Drawer` (`@ark-ui/react/drawer`, présent en ^5.30),
  `swipeDirection="down"`, `Drawer.Grabber`, contrôlé (`open`/`onOpenChange`), `unmountOnExit`.
  Toute fermeture (bouton, glisser, fond, Échap) passe par `onOpenChange(false)` → une seule
  écriture `lastSeen`. Composant **local à la feature** (`WhatsNewSheet`) ; extraction en
  composant partagé seulement au deuxième usage.
- **Rationale**: décidé en revue du brief ; a11y dialog native (focus trap, restore focus, Échap)
  pour FR-014. z-index 50 comme `ConfirmDialog` ; le toast (z-70) reste au-dessus (edge case).
- **Alternatives considered**: `Dialog` restylé (rejeté en revue) ; composant partagé
  `BottomSheet` dès maintenant (YAGNI).
- **Risk**: le Drawer (gestes, mesures) peut nécessiter des polyfills jsdom (`matchMedia`,
  `ResizeObserver`, pointer events) dans les tests composant ; à ajouter dans
  `src/test/setup.ts` si nécessaire.
- **Test infrastructure (implémentation)**: polyfills effectivement ajoutés dans
  `src/test/setup.ts` (gardés par `typeof window` pour les tests en environnement node). Le
  barrel `@/shared/components` réexporte `UpdatePrompt`, qui importe le module virtuel
  `virtual:pwa-register/react` inexistant hors build : `vitest.config.ts` l'aliase vers
  `src/test/pwa-register-stub.ts` et définit `__APP_VERSION__` (lu dans `package.json`),
  `__GIT_SHA__` et `__BUILD_DATE__` (valeurs fixes). Alternative écartée : importer les
  composants partagés par chemin direct, contraire à la convention du projet.
- **Toast pendant la feuille (implémentation)**: la feuille modale piège le focus ; quand
  `UpdatePrompt` signale une mise à jour en attente (store `update-available` partagé, sans
  second `useRegisterSW`), `ChangelogSummaryGate` ferme la feuille **sans** écrire `lastSeen`,
  pour que le résumé suivant couvre encore cette version. `WhatsNewSheet` n'appelle `onClose`
  que pour une fermeture initiée par l'utilisateur.
- **Robustesse (revue de code)**: `ChangelogPage` est exposée par le barrel sous forme lazy
  (le barrel est importé statiquement par `Layout`/`BottomNav`) ; échec de chargement du chunk
  de la feuille → résumé ignoré (barrière d'erreur locale), sans écrire `lastSeen`.

## R10 — Page historique et pastille

- **Decision**: route lazy `profile/changelog` sous `Layout`, page `ChangelogPage` exportée par
  `@/features/changelog`. Son montage écrit `lastConsulted = currentVersion` (FR-012). Hook
  public `useChangelogUnread()` consommé par `BottomNav`, la sidebar de `Layout` et la ligne
  `ChangelogEntryRow` de `ProfilePage` ; nom accessible « Profil, nouveautés non lues », point
  `aria-hidden`.
- **Rationale**: brief (page dédiée, retour natif) ; `shared` importe déjà `@/features/auth`
  (précédent pour `Layout`).
- **Alternatives considered**: marquer « consulté » à la fermeture de la page (inutilement
  complexe, un passage suffit).

## R11 — Formatage des dates et libellés

- **Decision**: `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })`
  (« 26 sept. 2026 »), dates stockées en `YYYY-MM-DD` interprétées en date locale (pas d'UTC
  pour éviter le décalage d'un jour). Pluriel « Plus 1 correction. » / « Plus 3 corrections. »
  via une fonction pure testée.
- **Rationale**: cohérent avec les conventions `fr-FR` de DESIGN.md.
- **Alternatives considered**: `new Date('2026-09-26')` (UTC → risque de J-1 en Amérique).
