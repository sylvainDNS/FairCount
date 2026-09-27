# Quickstart: valider le changelog « Nouveautés »

Références : [contracts/changelog-module.md](./contracts/changelog-module.md) ·
[data-model.md](./data-model.md) · [design-brief.md](./design-brief.md)

## Prérequis

- `pnpm install`, `.dev.vars` configuré, Mailpit (`docker compose up -d`) pour se connecter.
- Deux terminaux : `pnpm dev` (port 3000) et `pnpm worker:dev` (port 8787).
- Un compte connecté ; DevTools ouverts sur *Application → Local Storage → localhost:3000*.

## 1. Gates automatiques

```bash
pnpm test      # moteur de décision, store, versions, digest, gate version ↔ changelog
pnpm lint
pnpm tsc --noEmit
```

Attendu : tout vert. Contre-épreuve du gate : changer `package.json#version` en `0.2.1` sans
entrée → `changelog.test.ts` échoue avec un message explicite ; annuler.

## 2. Scénarios manuels

Les versions se simulent en éditant les clés `faircount.changelog.*` puis en rechargeant.

| # | Préparation | Action | Attendu |
|---|-------------|--------|---------|
| S1 | Supprimer les deux clés | Recharger `/groups` | Pas de résumé ni de pastille ; les deux clés valent la version courante (première ouverture). |
| S2 | `lastSeen` = `lastConsulted` = `0.1.0` | Recharger `/groups` | Le résumé monte du bas avec les Nouveautés de 0.2.0. |
| S3 | Suite de S2 | « C'est noté » | Feuille fermée, `lastSeen` = courante ; pastille visible sur Profil (barre du bas et sidebar desktop). |
| S4 | Suite de S3 | Recharger | Pas de résumé ; pastille toujours là. |
| S5 | Suite de S4 | Profil → « Nouveautés » | Page historique, badge « Version actuelle » ; pastilles disparues ; `lastConsulted` = courante. |
| S6 | Comme S2 | Fermer par Échap, par le fond, puis (mobile) par glisser vers le bas | Chaque voie ferme et écrit `lastSeen`. |
| S7 | Comme S2 | « Tout l'historique » | Feuille fermée, page historique affichée, aucune pastille. |
| S8 | Comme S2, ouvrir `/login` déconnecté·e ou `/invite/<token>` | Charger | Aucun résumé sur ces écrans ; il apparaît sur le premier écran authentifié. |
| S9 | `lastSeen` = `9.9.9` | Recharger | Pas de résumé (rollback), `lastSeen` inchangé. |
| S10 | Navigation privée | Se connecter | Pas de résumé ; l'historique reste accessible. |
| S11 | Comme S2, hors ligne (DevTools → Offline) | Recharger | Résumé et historique s'affichent. |
| S12 | Comme S2, avec le toast de mise à jour visible | — | Le toast reste au-dessus de la feuille et cliquable. |

## 3. Accessibilité et rendu

- Clavier seul : focus dans la feuille à l'ouverture, Tab piégé, Échap ferme, focus restauré.
- Lecteur d'écran : dialogue « Quoi de neuf » annoncé ; lien « Profil, nouveautés non lues ».
- Mobile (375 px) et desktop (≥ 640 px : feuille centrée, ~448 px), clair et sombre ;
  `prefers-reduced-motion` → fondu uniquement.
- Détecteur impeccable sur les fichiers UI modifiés (cf. `MANUAL_DETECTOR_REQUIRED`).
