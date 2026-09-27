# Data Model: Changelog « Nouveautés » in-app

Aucune donnée serveur, aucune migration D1. Deux familles de données : le changelog embarqué
(statique, dans le bundle) et l'état local à l'appareil.

## ChangelogRelease (statique)

| Champ | Type | Règles |
|-------|------|--------|
| `version` | `string` | Semver strict `MAJOR.MINOR.PATCH` ; unique ; strictement décroissant dans le tableau. `changelog[0].version === package.json#version` (FR-002a). |
| `date` | `string` | `YYYY-MM-DD` ; non croissant dans le tableau ; interprété en date locale. |
| `changes` | `readonly ChangelogChange[]` | Peut être vide (release non annoncée : jamais listée, ne déclenche rien). |

## ChangelogChange (statique)

| Champ | Type | Règles |
|-------|------|--------|
| `category` | `'feature' \| 'improvement' \| 'fix'` | Libellés UI : Nouveauté / Amélioration / Correction. Ordre d'affichage fixe : feature → improvement → fix. |
| `text` | `string` | Français, non technique, écriture inclusive, une phrase courte, sans point final obligatoire. Non vide. |

**Dérivé** : une release est *annonçable* si elle contient au moins un `feature` ou un
`improvement` (FR-006, FR-012).

## État local (par appareil, `localStorage`)

| Clé | Valeur | Écrit quand |
|-----|--------|-------------|
| `faircount.changelog.lastSeen` | version | Fermeture du résumé (toute voie) ; ou initialisation (première ouverture, rien d'annonçable). Jamais abaissé. |
| `faircount.changelog.lastConsulted` | version | Montage de la page historique (y compris via « Tout l'historique ») ; initialisation à la première ouverture. Jamais abaissé. |

Valeur absente, illisible ou non semver = absente. Stockage indisponible = état en mémoire
pour la session (comportement « première ouverture »). Écriture impossible mais lecture
possible (quota, Safari privé) : la valeur la plus récente entre mémoire et stockage fait foi.

## ChangelogDigest (dérivé, pour le résumé)

| Champ | Type | Contenu |
|-------|------|---------|
| `fromVersion` / `toVersion` | `string` | Plus ancienne / plus récente release concernée (libellé « Version X » ou « Versions X à Y »). |
| `date` | `string` | Date de `toVersion`. |
| `features` | `readonly string[]` | Tous les `feature` des releases concernées, plus récentes d'abord. |
| `improvements` | `readonly string[]` | Idem pour `improvement`. |
| `fixCount` | `number` | Nombre de `fix` (ligne « Plus N correction(s). » si ≥ 1). |

« Releases concernées » = releases avec `lastSeen < version ≤ currentVersion`.

## Règles de décision

Entrées : `currentVersion`, `lastSeen?`, `lastConsulted?`, `releases`.

1. **Base** = `lastSeen` si valide. Sinon : **première ouverture** → pas de résumé, pas de
   pastille, écrire `lastSeen = lastConsulted = currentVersion`.
2. **Rollback / même version** : si `currentVersion ≤ base` → pas de résumé, aucune écriture.
3. **Résumé** : releases concernées = `(base, currentVersion]`. Si au moins une est annonçable →
   `summary` = digest (FR-005, FR-006a). Sinon → pas de résumé, écrire `lastSeen =
   currentVersion` (FR-006).
4. **Fermeture du résumé** (toute voie) → écrire `lastSeen = currentVersion` (FR-007).
5. **Pastille** : `unread` = il existe une release annonçable avec `lastConsulted < version ≤
   currentVersion` (`lastConsulted` absent ou invalide alors que `lastSeen` est valide : réparé en écrivant `lastConsulted = lastSeen`, puis règle appliquée avec cette valeur). S'efface quand la page historique écrit `lastConsulted` (FR-012).

## Transitions (un appareil, versions N < N+1 < N+2)

| Situation | lastSeen | lastConsulted | Résumé | Pastille |
|-----------|----------|---------------|--------|----------|
| Première ouverture sur N | ∅ → N | ∅ → N | non | non |
| Mise à jour N → N+1 (Nouveauté) | N | N | **oui** | oui |
| Fermeture du résumé | → N+1 | N | fermé | **oui** (US3) |
| Ouverture de l'historique | N+1 | → N+1 | — | non |
| Mise à jour → N+2 (Corrections seules) | → N+2 (auto) | N+1 | non | non |
| Rollback vers N+1 | N+2 (inchangé) | N+1 | non | non |
