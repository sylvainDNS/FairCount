# Quickstart: reproduire et vérifier le correctif

## Prérequis

- Serveurs lancés : `pnpm dev` (port 3000) et `pnpm worker:dev` (port 8787) ; Mailpit
  (`docker compose up -d`, http://localhost:8025) pour le lien de connexion.
- Un groupe contenant au moins une dépense simple et une récurrence ayant déjà généré une
  dépense.
- Firefox récent (desktop), puis Chrome et Safari pour la non-régression.

## 1. Reproduire (avant correctif)

1. Instrumentation temporaire, **non commitée** : sur le `Dialog.Root` de `ConfirmDialog` et
   d'`ExpenseForm`, ajouter
   `onInteractOutside={(e) => console.log(e.type, e.detail.target)}`.
2. Firefox → liste des dépenses → ouvrir une dépense → « Supprimer ».
   **Attendu avant correctif** : la confirmation disparaît aussitôt.
3. Lire la console :
   - `focus.outside` avec pour cible la carte de la dépense → cause confirmée
     ([research.md](./research.md) R2), suivre le plan ;
   - `pointerdown.outside` → Plan B (research R4) ;
   - rien → la cause est ailleurs, revenir en recherche.
4. Même chose avec « Modifier ».
5. Après la mise à jour d'Ark UI 5.39.3 (research R6), refaire les étapes 2 à 4 **sans**
   correctif et noter dans research.md si le bug persiste.

## 2. Vérifier le correctif dans Firefox

Pour chaque parcours, à la souris, au clavier (Tab puis Entrée / Espace) et en vue mobile
tactile (mode responsive des outils de développement), au moins 10 fois de suite (SC-001) :

| # | Parcours | Attendu |
|---|----------|---------|
| 1 | Dépense → « Supprimer » | La confirmation reste affichée ; « Supprimer » supprime, « Annuler » / Échap / clic sur le fond ferment sans supprimer |
| 2 | Dépense générée → « Supprimer » | Confirmation avec « Seule cette dépense est supprimée ; la récurrence continue. », stable |
| 3 | Dépense → « Modifier » | Formulaire pré-rempli, stable ; enregistrer met à jour la liste, annuler ne change rien |
| 4 | Dépense générée → lien récurrence | Détail de la récurrence, stable |
| 5 | Récurrence → « Modifier » | Formulaire stable, enregistrable |
| 6 | Récurrence → « Supprimer » | Confirmation stable |
| 7 | Double-clic rapide sur « Supprimer » | Une seule confirmation, aucune suppression sans confirmation |
| 8 | Suppression en échec (worker arrêté) | La confirmation reste affichée avec le message d'erreur |

## 3. Non-régression

- Chrome et Safari : parcours 1, 3 et 6.
- Fermeture simple d'un détail : le focus revient sur la carte de la dépense dans la liste.
- Autres fenêtres : membres (revenu, retrait), remboursements (suppression).
- Autres composants Ark UI (mise à jour 5.39.3) : Drawer « Quoi de neuf », Toast, Select et
  SegmentedControl du formulaire de dépense, Tabs.

## 4. Automatisé

```bash
pnpm test     # dont ConfirmDialog.test.tsx, dialog.test.ts, ExpenseDetail/RecurrenceDetail tests
pnpm check
```

Les tests de régression doivent avoir été vus **rouges** avant le correctif.
