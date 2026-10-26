# UI Contract: fermeture des fenêtres modales

S'applique à `ConfirmDialog`, `ExpenseDetail`, `ExpenseForm`, `RecurrenceDetail`.

## Ferment la fenêtre (inchangé)

| Déclencheur | Effet |
|-------------|-------|
| Bouton « Annuler » / « Fermer » | `onCancel` / `onClose` |
| Touche Échap | `onCancel` / `onClose` |
| Pointeur pressé sur le fond (hors contenu) | `onCancel` / `onClose` |
| Action métier aboutie (enregistrer, confirmer la suppression) | callback de succès |

## Ne ferme PAS la fenêtre (nouveau)

| Déclencheur | Effet |
|-------------|-------|
| Focus déplacé hors du contenu par le code (retour de focus d'une fenêtre qui vient de se fermer, script tiers) | ignoré ; le piège à focus ramène le focus dans la fenêtre |
| Geste ayant ouvert la fenêtre (clic, tap, Entrée / Espace) | ignoré |

## Garantie

- Assurée par `@ark-ui/react` **≥ 5.39.3** (`@zag-js/dialog` / `dismissable` 1.45.0) : la
  fenêtre arme son écoute « interaction extérieure » après son piège à focus, qui intercepte
  tout focus extérieur (research R3 — Résultat, R4 révisée). Aucun handler maison.
- Verrouillée par les tests « focus extérieur » (helper `src/test/focus-outside.ts`) de
  `ConfirmDialog`, `ExpenseDetail`, `ExpenseForm` et `RecurrenceDetail`, rouges sur 5.39.2.

## Inchangé

- `restoreFocus` : à la fermeture simple, le focus revient à l'élément d'origine.
- Pas d'empilement : une fenêtre continue de **remplacer** l'autre.
- Libellés, textes de confirmation, ordre des boutons.
