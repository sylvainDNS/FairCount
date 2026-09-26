# Quickstart: Valider le compte commun de bout en bout

**Feature**: [spec.md](./spec.md) | **Contrats**: [contracts/joint-account-api.md](./contracts/joint-account-api.md)

## Prérequis

```bash
pnpm install
pnpm db:migrate          # applique la migration 0007 (colonne kind + index)
docker compose up -d     # Mailpit (magic links) — UI sur http://localhost:8025
pnpm worker:dev          # terminal 1 (API, port 8787)
pnpm dev                 # terminal 2 (front, port 3000)
```

## Validation automatisée

```bash
pnpm test                # invariants monétaires : répartition payeur, arrondis, somme = 0
pnpm check               # Biome lint + format
```

Tests clés à voir passer (écrits en premier, TDD) :

- `balance-calculation.test.ts` — dépense compte commun : distribution par coefficients,
  reste d'arrondi absorbé, somme des soldes = 0, cas « bénéficiaires = tous » neutre,
  coefficient 0, montants personnalisés côté bénéficiaires.
- `group.schema.test.ts` — validation du nom du compte commun.

## Scénario manuel 1 — Cas nominal (User Story 1)

Groupe à 2 membres avec revenus 3000 €/2000 € (coefficients 60/40).

1. Paramètres du groupe → activer « Compte commun ». Vérifier : l'option apparaît
   immédiatement comme payeur dans le formulaire de dépense.
2. Créer une dépense de 100 €, payeur = Compte commun, bénéficiaire = le membre à 60 %.
3. **Attendu** (onglet Soldes) : membre 60 % → −40,00 € ; membre 40 % → +40,00 € ;
   bandeau d'intégrité OK (somme = 0).
4. Créer une dépense de 60 €, payeur = Compte commun, bénéficiaires = les deux (équitable).
5. **Attendu** : soldes inchangés (effet neutre), dépense visible dans l'historique avec le
   badge compte commun.

Vérification API directe :

```bash
curl -s -b "$COOKIE" http://localhost:8787/api/groups/$GROUP_ID/balances | jq \
  '{isValid, sum: ([.balances[].netBalance] | add)}'
# → { "isValid": true, "sum": 0 }
```

## Scénario manuel 2 — Opt-in sans impact (User Story 2)

1. Créer un second groupe, ne pas activer le compte commun.
2. **Attendu** : formulaire de dépense identique à avant la feature (payeurs = membres
   uniquement), aucun changement dans soldes/historique/stats.
3. Dans le premier groupe : désactiver le compte commun.
4. **Attendu** : les dépenses existantes et les soldes sont intacts ; le compte commun ne
   figure plus dans les payeurs proposés ; la réactivation restaure la même option (même nom).

## Scénario manuel 3 — Lecture (User Story 3)

Après le scénario 1 :

1. Onglet Soldes : seuls les 2 membres apparaissent — jamais le compte commun.
2. Suggestions de remboursement : uniquement entre membres.
3. Statistiques : le total inclut les 160 € ; la répartition par membre attribue les dépenses
   du compte commun au prorata 60/40 ; pas de ligne « Compte commun ».
4. Historique : les 2 dépenses portent le badge compte commun sans ouvrir le détail.

## Garde-fous à vérifier (edge cases)

```bash
# Compte commun comme bénéficiaire → 400 INVALID_PARTICIPANT
curl -s -b "$COOKIE" -X POST http://localhost:8787/api/groups/$GROUP_ID/expenses \
  -H 'Content-Type: application/json' \
  -d "{\"amount\":1000,\"description\":\"test\",\"date\":\"2026-07-16\",
       \"paidBy\":\"$MEMBER_ID\",\"participants\":[{\"memberId\":\"$JOINT_ID\"}]}"

# Settlement vers le compte commun → 400 INVALID_RECIPIENT
curl -s -b "$COOKIE" -X POST http://localhost:8787/api/groups/$GROUP_ID/settlements \
  -H 'Content-Type: application/json' \
  -d "{\"toMember\":\"$JOINT_ID\",\"amount\":1000,\"date\":\"2026-07-16\"}"

# Compte commun désactivé comme payeur d'une NOUVELLE dépense → 400 INVALID_PAYER
# Édition d'une dépense existante payée par le compte commun désactivé (même paidBy) → 200
```

## Critères de sortie

- [ ] `pnpm test` et `pnpm check` verts
- [ ] Scénarios 1–3 validés en local (deux navigateurs / deux comptes magic link via Mailpit)
- [ ] `GET /api/groups/:id/balances` → `isValid: true` après chaque opération
- [ ] Aucune régression visuelle dans un groupe sans compte commun
