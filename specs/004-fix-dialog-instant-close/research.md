# Research: Correction des fenêtres qui se ferment instantanément

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-10-26

## R1 — Pattern commun aux parcours touchés

**Constat** (code) : chaque parcours signalé **remplace** une fenêtre modale par une autre dans
le même commit React, en démontant un `Dialog.Root` Ark UI et en montant un autre :

| Depuis | Action | Mécanisme | Fichier |
|--------|--------|-----------|---------|
| Détail dépense | « Supprimer » | `setExpenseToDelete(id)` + `setSelectedExpense(null)` → `ExpenseDetail` démonté, `ConfirmDialog` ouvert | `src/features/expenses/components/ExpenseList.tsx` |
| Détail dépense | « Modifier » | `setShowEditForm(true)` → `ExpenseDetail` rend `<ExpenseForm>` (autre `Dialog.Root`) à la place de son propre `Dialog.Root` | `src/features/expenses/components/ExpenseDetail.tsx` |
| Détail dépense générée | lien récurrence | `handleOpenRecurrence` → `ExpenseDetail` démonté, `RecurrenceDetail` monté | `ExpenseList.tsx` |
| Détail récurrence | « Modifier » / « Supprimer » | `showEditForm` / `confirmDelete` → `ExpenseForm` / `ConfirmDialog` à la place du `Dialog.Root` | `src/features/expenses/components/RecurrenceDetail.tsx` |

Le remplacement (plutôt que l'empilement) est un **choix délibéré** documenté dans
`RecurrenceDetail.tsx` : « two stacked modals would hide the confirmation from assistive tech ».
Il est conservé.

Hors périmètre, non concernés : `SettlementHistory` (confirmation ouverte depuis une liste, pas
depuis une fenêtre), `MemberList` → `IncomeForm` / `ConfirmDialog` (idem), `WhatsNewSheet`
(Drawer isolé).

## R2 — Cause racine

**Mécanique Zag (vérifiée dans `node_modules`, `@zag-js/*@1.43.3`)** :

1. Fenêtre sortante : à son démontage, `trapFocus` est désactivé avec
   `returnFocusOnDeactivate: true` (`restoreFocus` par défaut). Le retour de focus est différé
   (`setTimeout(0)`, `focus-trap.mjs` `finishDeactivation`) puis vise l'élément focalisé avant
   l'ouverture — typiquement la carte de la dépense dans la liste, **hors** de la nouvelle
   fenêtre. Le garde-fou `isSafeToOverrideFocus()` laisse passer ce retour si le focus est sur
   `body` (cas de la fenêtre entrante pas encore focalisée) ou dans un autre piège à focus.
2. Fenêtre entrante : `trackDismissableElement` écoute `focusin` sur le document **dès le
   commit** (depuis `@zag-js/dismissable@1.43.1` : « handlers now register as soon as the node
   commits », auparavant différé d'une frame). Un `focusin` hors du contenu déclenche
   `onFocusOutside` → `onDismiss` → `onOpenChange({ open: false })` → notre `onCancel` /
   `onClose`.
3. Résultat : le retour de focus de la fenêtre sortante est vu comme une « interaction en
   dehors » par la fenêtre entrante, qui se ferme aussitôt.

**Pourquoi seulement Firefox (hypothèse)** : la course dépend de l'ordre `setTimeout(0)` /
`requestAnimationFrame` (activation différée du nouveau piège et focus initial) et du focus au
clic (sur macOS, Firefox ne focalise pas un `<button>` cliqué, Chrome si), qui changent
l'élément actif au moment du retour de focus. Chrome gagne la course, Firefox la perd.

**Pourquoi maintenant** : la migration pnpm 11/12 du 2026-09-26 (`26a0f38`, `bab0d51`) a
régénéré le lockfile et fait passer `@ark-ui/react` de 5.30.0 à 5.39.2
(`@zag-js/*` 1.31.1 → 1.43.3), embarquant l'enregistrement immédiat des écouteurs (1.43.1). Le
commit `623a9c7` (hauteur des fenêtres) ne touche que la mise en page et n'est pas en cause.

**Hypothèse alternative écartée a priori** : le clic d'ouverture vu comme « pointerdown en
dehors ». Peu probable : l'action est déclenchée sur `click` (après `pointerdown`) et l'écoute
`pointerdown` de la fenêtre entrante est différée d'un `setTimeout(0)`. Elle est néanmoins
discriminée à l'étape de reproduction (cf. R3).

**Decision** : traiter R2 comme cause de travail ; la **première tâche** de l'implémentation la
confirme dans Firefox avant toute correction.

## R3 — Confirmer la cause (reproduction)

**Decision** : reproduire dans Firefox avec une instrumentation temporaire, non commitée :
`onInteractOutside={(e) => console.log(e.type, e.detail.target)}` sur le `Dialog.Root` de
`ConfirmDialog` et d'`ExpenseForm`.

- Journal `focus.outside` + cible = carte de dépense → **R2 confirmée**, appliquer R4.
- Journal `pointerdown.outside` → hypothèse alternative ; R4 ne suffit pas, basculer sur le
  Plan B de R4 **sans attendre de validation** (décision du 2026-10-26), en documentant le
  constat dans ce fichier.
- Aucun journal → la fermeture vient d'ailleurs (état React) ; revenir en recherche.

La reproduction se fait **sur les versions actuelles** (Ark UI 5.39.2), avant la mise à jour
de R6, pour que le constat ne soit pas brouillé par le changement de dépendance.

**Rationale** : Principe II (un bug corrigé commence par sa reproduction) ; évite un correctif
à l'aveugle sur une course dépendante du navigateur.

### R3 — Résultat (2026-10-26, Ark UI 5.39.2 / Zag 1.43.3)

Reproduit à la main dans Firefox (macOS) : après « Supprimer » depuis le détail d'une dépense,
la console affiche `REPRO ConfirmDialog focus.outside <button type="button" class="w-full p-4
flex items-center justify-between …">`, c'est-à-dire le bouton de la carte de dépense de la
liste. **R2 confirmée** : la restitution du focus du détail sortant est vue comme un « focus
extérieur » par la confirmation entrante. On applique R4 tel quel (`onFocusOutside`), le Plan B
n'est pas nécessaire.

L'automatisation via Playwright Firefox (build 1495) n'a pas pu servir : le navigateur se fige
au démarrage sur cette machine (macOS 27, `RenderCompositorSWGL failed mapping default
framebuffer`).

**Après mise à jour (T005, Ark UI 5.39.3 / Zag 1.45.0), sans correctif** : les tests de
régression jsdom (R5), qui reproduisent le bug de façon déterministe, sont **rouges sur 5.39.2
et verts sur 5.39.3** (6 scénarios : `ConfirmDialog`, `ExpenseDetail`, `ExpenseForm`,
`RecurrenceDetail` + sa confirmation). Explication dans les sources : en 1.45.0, le dialog
arme son écoute « interaction extérieure » avec `defer: true` (`whenNode` puis
`trackInteractOutside` différés d'une frame chacun), donc **après** l'activation du piège à
focus (une frame). Le `focusin` capturé du piège, inscrit en premier, intercepte le focus
extérieur (`stopImmediatePropagation`) et le ramène dans la fenêtre avant que le dismissable
ne le voie. En 1.43.3, l'écoute était armée au montage, avant le piège : d'où la fermeture.
Confirmation Firefox réelle : quickstart §2 (T012, T015, T019).

## R4 — Correctif

**Décision révisée (2026-10-26)** : le correctif est **la seule mise à jour d'Ark UI vers
5.39.3** (R6), sans handler maison. Consigne de la personne qui porte le projet : « si la
simple mise à jour suffisait, on n'introduit pas de fix custom ». Preuve que la mise à jour
suffit : R3 — Résultat (tests de régression rouges sur 5.39.2, verts sur 5.39.3 sans autre
changement). Le handler ci-dessous a été implémenté, vu vert sur 5.39.2, puis **retiré** ; il
reste documenté comme repli si la vérification Firefox (quickstart §2) montrait que le bug
persiste malgré la mise à jour.

**Décision initiale (abandonnée)** : les fenêtres modales de l'app **ne se ferment plus sur un focus sorti de leur
contenu** : `onFocusOutside={(event) => event.preventDefault()}` sur leur `Dialog.Root`,
centralisé dans un handler partagé `preventFocusOutsideDismiss` (`src/shared/utils/dialog.ts`).
Appliqué aux fenêtres qui participent à un remplacement : `ConfirmDialog` (partagé),
`ExpenseDetail`, `ExpenseForm`, `RecurrenceDetail`.

**Rationale** :

- Dans une fenêtre **modale**, le piège à focus empêche l'utilisateur·rice de sortir au
  clavier ; un focus hors du contenu est donc toujours **programmatique** (retour de focus d'une
  autre fenêtre, librairie tierce), jamais une intention de fermer.
- Les fermetures volontaires restent intactes (FR-006) : `pointerdown` sur le fond (pointer
  blocking + `onPointerDownOutside`), Échap, boutons « Annuler » / « Fermer ».
- Si le focus a été volé avant l'activation du nouveau piège, celui-ci le replace dans la
  fenêtre à son activation ; s'il est volé après, le piège le ramène via son propre `focusin`.
- Indépendant de l'ordre des timers et donc du navigateur ; quelques lignes, pas de refonte.
- API publique documentée d'Ark UI (`onFocusOutside`, `event.preventDefault()`), pas de patch
  de dépendance.

**Alternatives considered** :

| Alternative | Rejetée parce que |
|-------------|-------------------|
| Se contenter de mettre à jour `@ark-ui/react` → 5.39.3 (`@zag-js` 1.45, fix 1.44 « popups dismissing themselves right after opening ») | Le fix 1.44 vise le contenu gardé monté, pas le retour de focus ; rien ne garantit la correction. La mise à jour est faite **en complément** (R6), pas à la place de R4. |
| `restoreFocus={false}` sur la fenêtre sortante | Valeur lue à la création du piège : impossible de la couper seulement lors d'un passage de relais ; la couper toujours casse le retour de focus à la fermeture simple (régression a11y). |
| `finalFocusEl` pointant vers la fenêtre entrante | Couplage entre composants indépendants (la liste, le détail, la confirmation), fragile. |
| Empiler les fenêtres (confirmation au-dessus du détail) | Contredit le choix a11y documenté dans `RecurrenceDetail.tsx` ; change le comportement d'annulation (retour au détail) que la spec fige. |
| Ouvrir la fenêtre suivante après un délai / `onExitComplete` | Toujours une course avec le `setTimeout(0)` du retour de focus ; délai arbitraire. |

**Plan B (si R3 montre `pointerdown.outside`)** : même approche via
`onPointerDownOutside` filtré sur `event.detail.target` hors de toute fenêtre ouverte, à
préciser alors dans ce document.

## R5 — Tests de régression

**Decision** (révisée : plus de handler, donc plus de `src/shared/utils/dialog.test.ts`) :

1. Helper `src/test/focus-outside.ts` : déplace le focus hors de la fenêtre puis laisse
   passer les frames où Zag traite le `focusin`.
2. `src/shared/components/ConfirmDialog.test.tsx` (nouveau) : fenêtre ouverte, puis
   `focus()` programmatique sur un bouton **hors** de la fenêtre → `onCancel` n'est pas appelé et
   la fenêtre reste dans le DOM ; Échap, « Annuler » et clic sur le fond appellent toujours
   `onCancel` (FR-006).
3. `ExpenseDetail.test.tsx`, `ExpenseForm.test.tsx`, `RecurrenceDetail.test.tsx` (détail et
   confirmation de suppression) : même scénario « focus extérieur ».

Ces tests sont **rouges sur Ark UI 5.39.2** (le correctif = la mise à jour) et verts sur
5.39.3 : ils empêchent un retour en arrière de la dépendance.

**Rationale** : jsdom ne reproduit pas fidèlement la course de timers propre à Firefox, mais le
mécanisme fautif (un `focusin` extérieur ferme la fenêtre) se reproduit de façon déterministe,
ce qui donne un test **rouge avant correctif** (Principe II). La vérification navigateur réelle
est faite via [quickstart.md](./quickstart.md).

**Alternatives considered** : test E2E Firefox (Playwright) — pas d'outillage E2E dans le
projet ; l'ajouter dépasse le périmètre d'un correctif.

## R6 — Mise à jour d'Ark UI (dans la même PR)

**Decision** : `@ark-ui/react` `^5.30.0` → `^5.39.3` (dernière 5.x stable ; `6.0.0-next.*` exclue),
ce qui amène `@zag-js/*` 1.43.3 → 1.45.0. Faite **après** la reproduction (R3) et **avant** les
tests rouges (R5), pour que les tests soient écrits et vus rouges contre la version livrée.

**Rationale** : décision du 2026-10-26 de ne pas reporter la mise à jour dans une PR séparée.
Elle embarque `@zag-js/dismissable` 1.44.0 (« `defer: true` now always waits for the framework
to commit », popups qui se ferment juste après ouverture), proche de notre symptôme. Le
correctif R4 reste appliqué : il ne dépend pas de l'ordre des timers.

**Vérifications liées** :

- Après mise à jour, refaire quickstart §1 dans Firefox **sans** correctif et noter si le bug
  persiste (information pour research.md, ne change pas la décision R4).
- Tous les usages Ark UI de l'app restent verts : `pnpm test` (Checkbox, Select, Tabs,
  SegmentGroup, Drawer, Toast, Dialog) ; contrôle visuel rapide du Drawer « Quoi de neuf » et
  d'un Toast.
- Les tests jsdom de R5 doivent rester **rouges sans R4** sur 5.39.3 ; s'ils deviennent verts
  sans correctif, durcir le scénario (focus extérieur déclenché après activation du piège).

**Alternatives considered** : PR technique séparée — écartée par décision ; passage à Ark UI 6
(pré-version) — hors périmètre.

## R7 — Release

**Decision** : `package.json` 0.3.0 → **0.3.1** (PATCH : uniquement une Correction) et entrée
en tête de `src/features/changelog/data/changelog.ts`, catégorie `fix`, par exemple :
« Les fenêtres de suppression et de modification d'une dépense ne se ferment plus toutes seules
sur Firefox. »

**Rationale** : constitution, section « Releases et changelog » ; `changelog.test.ts` garde la
cohérence version/changelog.
