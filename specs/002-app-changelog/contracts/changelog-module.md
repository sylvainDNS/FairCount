# Contract: module `@/features/changelog`

Pas d'API HTTP. Le contrat porte sur (1) le format de données que les auteur·rices de release
écrivent, (2) l'API publique de la feature consommée par `shared` et `auth`, (3) les routes et
les surfaces UI.

## 1. Format de données (écrit à chaque release)

Fichier : `src/features/changelog/data/changelog.ts`

```ts
export const changelog = [
  {
    version: '0.2.0',
    date: '2026-09-27',
    changes: [
      { category: 'feature', text: "Désignez un compte commun comme payeur d'une dépense" },
      { category: 'feature', text: 'Retrouvez les nouveautés de chaque version depuis votre profil' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-02-09',
    changes: [
      { category: 'feature', text: 'Première version de FairCount' },
      { category: 'feature', text: 'Connexion par lien magique, sans mot de passe' },
      { category: 'feature', text: 'Groupes, invitations par email ou par lien' },
      { category: 'feature', text: 'Répartition des dépenses selon les revenus de chaque personne membre' },
      { category: 'feature', text: 'Soldes recalculés automatiquement et remboursements' },
    ],
  },
] as const satisfies readonly ChangelogRelease[];
```

Règles vérifiées par `changelog.test.ts` (gate CI, FR-002a) : voir
[data-model.md](../data-model.md#changelogrelease-statique). Toute PR qui bumpe `package.json`
sans entrée (ou l'inverse) échoue.

## 2. API publique (barrel `src/features/changelog/index.ts`)

| Export | Nature | Consommateurs |
|--------|--------|---------------|
| `ChangelogSummaryGate` | composant, sans props | `shared/components/Layout.tsx` (monté une fois) |
| `ChangelogPage` | composant page **lazy** (`React.lazy`, à envelopper dans `Suspense`) | `src/routes/index.tsx` |
| `ChangelogEntryRow` | composant, sans props | `features/auth/components/ProfilePage.tsx` |
| `useChangelogUnread` | hook `() => boolean` | `BottomNav`, sidebar de `Layout`, `ChangelogEntryRow` |
| `UnreadDot` | composant `{ className? }`, décoratif (`aria-hidden`) | `BottomNav`, sidebar de `Layout` |
| `CHANGELOG_ROUTE` | constante `'/profile/changelog'` | routes, liens |

Rien d'autre n'est exporté (données, store et moteur restent internes).

## 3. Routes

| Route | Élément | Accès |
|-------|---------|-------|
| `/profile/changelog` | `ChangelogPage` (lazy, `Suspense`) | sous `ProtectedRoute` + `Layout` |

## 4. Surfaces UI (comportements observables)

Forme visuelle : [design-brief.md](../design-brief.md). Ce qui suit est testable.

**Résumé (`WhatsNewSheet`, interne, chargé à la demande)**
- `role="dialog"`, nom accessible = titre « Quoi de neuf ».
- Ligne de version : « Version 0.2.0 · 30 sept. 2026 » ou « Versions 0.2.0 à 0.4.0 ».
- Sections « Nouveautés » puis « Améliorations », omises si vides ; ligne « Plus N correction(s). »
  si `fixCount ≥ 1`.
- Actions : bouton « C'est noté » (ferme) ; lien « Tout l'historique » (ferme + navigue vers
  `CHANGELOG_ROUTE`). Fermeture aussi par glisser, fond, Échap. Toute fermeture écrit `lastSeen`.

**Page historique (`ChangelogPage`)**
- Titre « Nouveautés » ; « Vous utilisez la version X » + SHA court en légende.
- Une section par release non vide, plus récente d'abord ; badge « Version actuelle » sur
  `currentVersion` ; catégories dans l'ordre Nouveauté → Amélioration → Correction.
- Lien « Retour » : écran précédent s'il existe dans l'app, sinon `/profile` (spec US2
  scénario 3). Le montage écrit `lastConsulted`.

**Ligne profil (`ChangelogEntryRow`)**
- Lien vers `CHANGELOG_ROUTE`, libellé « Nouveautés », ligne secondaire « Version X », pastille
  si `useChangelogUnread()`.

**Pastille de navigation**
- Onglet Profil (`BottomNav`) et lien Profil (sidebar) : point `aria-hidden` ; nom accessible
  « Profil, nouveautés non lues » quand non lu, « Profil » sinon.
