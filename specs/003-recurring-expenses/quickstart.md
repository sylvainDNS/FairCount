# Quickstart: valider les dépenses récurrentes

**Feature**: [spec.md](./spec.md) · **API**: [contracts/recurring-expenses-api.md](./contracts/recurring-expenses-api.md) · **Data**: [data-model.md](./data-model.md)

## Prérequis

```bash
pnpm install
pnpm db:migrate                 # applique la migration 0008 (tables récurrences + colonnes expenses)
docker compose up -d            # Mailpit pour le magic link (http://localhost:8025)
pnpm dev                        # terminal 1 — frontend :3000
pnpm wrangler dev --test-scheduled   # terminal 2 — worker :8787 avec déclenchement manuel du cron
```

Se connecter, créer un groupe avec au moins deux personnes membres (revenus différents).

Déclencher le job à la main :

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=5+23,5,11+*+*+*"
```

## 1. Tests automatisés (gate)

```bash
pnpm test        # inclut les tests purs de src/lib/recurrence.ts, du formateur de règle,
                 # des schémas Zod et du job (fonctions de planification)
pnpm check
```

Attendu : tout vert, y compris `changelog.test.ts` (version 0.3.0 = tête du changelog).

## 2. Scénarios manuels

| # | Action | Attendu | Réf. |
|---|--------|---------|------|
| 1 | Nouvelle dépense sans cocher « Répéter » | Formulaire identique à avant | US1-4, SC-006 |
| 2 | Cocher « Répéter », Mois, jour 13, début aujourd'hui (≠ 13) | Résumé « Tous les mois, le 13 — Prochaine échéance : 13 <mois> » ; après « Ajouter », carte « 1 récurrence » ; aucune dépense ajoutée | US1-1, FR-007 |
| 3 | Idem avec Jour, début aujourd'hui | Dépense datée d'aujourd'hui ajoutée tout de suite, avec icône ↻ ; carte : prochaine échéance demain | R1 |
| 4 | Jour 31 | Mention « Les mois de 30 jours et en février, la dépense est ajoutée le dernier jour du mois. » | US1-3 |
| 5 | Date de début hier | Erreur de champ, enregistrement bloqué | US1-5, FR-008a |
| 6 | Forcer une échéance passée : en local, `UPDATE recurring_expenses SET next_due_date = date('now','-2 day')` (via `wrangler d1 execute faircount-db --local --command …`), puis déclencher le cron | 3 dépenses générées (J-2, J-1, J), une seule fois ; relancer le cron → rien de plus | US2-2, FR-012 |
| 7 | Supprimer une dépense générée puis relancer le cron | Pas régénérée | FR-023 |
| 8 | Modifier le montant de la récurrence | Dépenses passées inchangées ; prochaine au nouveau montant | US4-1 |
| 9 | Désactiver | Badge « Désactivée », cron ne génère rien ; Réactiver → prochaine échéance ≥ aujourd'hui, pas de rattrapage | US4-2, US4-3 |
| 10 | Supprimer la récurrence | Disparaît de la carte ; ses dépenses gardent ↻ ; détail « Récurrence supprimée », sans lien | US4-4, FR-025 |
| 11 | Payeur·se quitte le groupe | Récurrence « À revoir » ; cron n'ajoute rien et n'accumule pas de retard ; changer de payeur·se → active | Edge, FR-016 |
| 12 | Filtre « Récurrentes » | Seules les dépenses ↻ (y compris récurrence supprimée) | FR-019 |
| 13 | Replier/déplier la carte, recharger | État conservé | FR-020b |
| 14 | Soldes après chaque génération | Somme des soldes = 0 (`GET /api/groups/:id/balances` → `isValid: true`) | SC-003 |
| 15 | Un·e autre membre modifie/désactive/supprime | Accepté | FR-021 |

## 3. Vérifications UI

Clair et sombre, 320 px et ≥ 768 px, navigation clavier et lecteur d'écran sur : bloc
Répétition, carte Récurrences, détail de récurrence, icône ↻ (« Dépense récurrente »). Puis
lancer le détecteur impeccable sur les composants modifiés (cf. design-brief).

## 4. Production

Après déploiement : `wrangler deployments list --env production` puis vérifier dans le dashboard
Workers que le trigger `5 23,5,11 * * *` est présent et que les logs `recurring_expenses.run`
apparaissent à 23:05, 05:05 et 11:05 UTC (la première exécution fait le travail, les deux
autres ne génèrent normalement rien).
