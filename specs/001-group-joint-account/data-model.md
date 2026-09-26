# Data Model: Compte commun comme payeur tiers d'un groupe

**Date**: 2026-07-16 | **Feature**: [spec.md](./spec.md) | **Décisions**: [research.md](./research.md)

## Vue d'ensemble

Aucune nouvelle table. Une seule évolution de schéma : `group_members` devient polymorphe via
une colonne `kind`. Le compte commun est une ligne de `group_members` ; les tables `expenses`,
`expense_participants`, `settlements`, `groups` sont **inchangées**.

## group_members (modifiée)

| Colonne | Type | Évolution | Notes |
|---------|------|-----------|-------|
| `kind` | `text` NOT NULL DEFAULT `'person'` | **AJOUT** | Union littérale Drizzle `['person', 'joint_account']` |
| autres | — | inchangées | |

Valeurs pour une ligne `kind = 'joint_account'` :

- `userId = null`, `email = null` (jamais lié à un compte utilisateur)
- `name` = nom du compte commun (défaut « Compte commun »), affiché via `memberDisplayName`
  (le coalesce existant retombe sur `group_members.name`)
- `income = 0`, `coefficient = 0` (jamais inclus dans les calculs de coefficients)
- `joinedAt` = date d'activation initiale
- `leftAt` = `null` si actif, timestamp si désactivé (cycle de vie standard des membres)

### Index

```sql
-- Unicité : au plus un compte commun par groupe (actif ou non)
CREATE UNIQUE INDEX uq_group_members_joint_account
  ON group_members (group_id)
  WHERE kind = 'joint_account';
```

### Migration (0007, additive et rétrocompatible)

```sql
ALTER TABLE group_members ADD COLUMN kind text NOT NULL DEFAULT 'person';
CREATE UNIQUE INDEX uq_group_members_joint_account
  ON group_members (group_id) WHERE kind = 'joint_account';
```

Aucune donnée existante à transformer (toutes les lignes actuelles sont des personnes).

## Invariants et règles de validation

| # | Règle | Point d'application |
|---|-------|---------------------|
| INV-1 | Au plus 1 ligne `joint_account` par groupe | index unique partiel + upsert service |
| INV-2 | `paidBy` d'une dépense : membre actif du groupe, `person` **ou** `joint_account` | `createExpense` / `updateExpense` (validation existante conservée) |
| INV-3 | `paidBy` inchangé accepté à l'update même si le compte commun est désactivé | `updateExpense` (comparaison avec la dépense existante) |
| INV-4 | Participants d'une dépense : membres actifs `kind = 'person'` uniquement | `validateParticipants` (le set `activeMemberIds` est construit avec `kind = 'person'`) |
| INV-5 | Settlements `fromMember`/`toMember` : `kind = 'person'` uniquement | `createSettlement` (validation destinataire) ; `fromMember` = membre courant, toujours une personne |
| INV-6 | Le membre virtuel n'apparaît jamais dans : liste membres du groupe, `memberCount`, balances, suggestions de règlement, `byMember` des stats | requêtes filtrées `kind = 'person'` (helper `activePersonMembersCondition`) |
| INV-7 | Somme des soldes du groupe = 0 après toute opération | répartition payeur via `calculateShares` (somme des parts = montant, reste absorbé par le dernier membre) — testé |
| INV-8 | Montants en centimes entiers uniquement | inchangé (aucun nouveau champ monétaire) |

## Sémantique de calcul des soldes

Fonction pure extraite dans `balance-calculation.ts` (consommée par `calculateGroupBalances`
et le `myBalance` de `listGroups`) :

```
applyExpense(expense, participants, coefficients, jointMemberIds, activePersonIds):
  si expense.paidBy ∈ jointMemberIds:
    paidShares = calculateShares(expense.amount,
                                 activePersonIds → fair share (customAmount null),
                                 coefficients)          # somme = amount
  sinon:
    paidShares = { expense.paidBy: expense.amount }
  owedShares = calculateShares(expense.amount, participants, coefficients)  # existant
```

- `totalPaid[m] += paidShares[m]`, `totalOwed[m] += owedShares[m]` — le reste du pipeline
  (settlements, netBalance, tri) est inchangé.
- Dépense compte commun avec bénéficiaires = tous : `paidShares == owedShares` → effet neutre
  (edge case de la spec vérifié par test).
- Stats `byMember` : `totalPaid` par membre calculé avec les mêmes `paidShares`.

## Transitions d'état du compte commun

```
(absent) ──PUT /joint-account──▶ actif (leftAt = null)
  actif ──PUT (name)───────────▶ actif (renommé)
  actif ──DELETE────────────────▶ désactivé (leftAt = now)
  désactivé ──PUT───────────────▶ actif (même ligne, leftAt = null, nom éventuellement mis à jour)
```

- Pas de suppression physique (FK des dépenses historiques).
- Désactivé : exclu des payeurs valides pour les nouvelles dépenses
  (`activeGroupMembersCondition` existante), mais toujours joignable par id pour l'affichage
  de l'historique.

## Types applicatifs dérivés

- `GroupMember` (Drizzle infer) gagne `kind: 'person' | 'joint_account'` automatiquement.
- API `GET /api/groups/:id` : `jointAccount: { memberId: string; name: string; active: boolean } | null`.
- Réponses dépenses (liste, détail, myBalance) : `paidBy.isJointAccount: boolean`
  (dérivé du `kind` déjà joint — aucune requête supplémentaire).
- Frontend `GroupWithMembers.jointAccount`, `ExpenseSummary.paidBy.isJointAccount`,
  `ExpenseDetail.paidBy.isJointAccount` (miroirs, `src/features/*/types.ts`).
