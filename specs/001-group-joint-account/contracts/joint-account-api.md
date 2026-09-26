# API Contract: Compte commun

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

Toutes les routes sont montées sous `/api/groups/:id` (middleware `auth` + `membership`
existants — tout membre actif du groupe peut agir, cf. hypothèse de la spec). Erreurs au
format existant `{ "error": "CODE" }`.

## 1. Gestion du compte commun (nouveau sous-routeur `/joint-account`)

### PUT /api/groups/:id/joint-account

Crée, renomme ou réactive le compte commun du groupe (upsert idempotent).

**Request** (`zValidator('json', jointAccountSchema)`) :

```json
{ "name": "Compte joint" }
```

- `name` : string 1–100, optionnel — défaut `"Compte commun"` à la création,
  inchangé si omis sur un compte existant.

**Response 200** :

```json
{ "jointAccount": { "memberId": "uuid", "name": "Compte joint", "active": true } }
```

**Erreurs** : `400 VALIDATION_ERROR` (Zod), `404 GROUP_NOT_FOUND`.

### DELETE /api/groups/:id/joint-account

Désactive le compte commun (pose `leftAt`). Idempotent.

**Response 200** : `{ "success": true }`

**Erreurs** : `404 JOINT_ACCOUNT_NOT_FOUND` (jamais créé).

## 2. Routes existantes étendues (rétrocompatibles)

### GET /api/groups/:id

Champ ajouté ; `members` et `memberCount` excluent désormais le membre virtuel :

```json
{
  "...": "champs existants inchangés",
  "jointAccount": { "memberId": "uuid", "name": "Compte commun", "active": true }
}
```

- `jointAccount: null` si jamais créé ; `active: false` si désactivé (permet la réactivation
  depuis les paramètres).

### POST /api/groups/:id/expenses & PATCH /api/groups/:id/expenses/:expenseId

Contrat d'entrée **inchangé** (`paidBy: uuid`). Sémantique étendue :

- `paidBy` peut être le `memberId` du compte commun **actif** → `400 INVALID_PAYER` sinon.
- PATCH : un `paidBy` identique à celui déjà enregistré est accepté même si le compte commun
  a été désactivé entre-temps (INV-3).
- `participants[].memberId` : membres actifs `kind='person'` uniquement →
  `400 INVALID_PARTICIPANT` si le compte commun y figure (INV-4).

### GET /api/groups/:id/expenses (liste) & GET .../expenses/:expenseId (détail)

Le bloc payeur gagne un booléen (défaut `false`, jamais absent) :

```json
{ "paidBy": { "id": "uuid", "name": "Compte commun", "isJointAccount": true } }
```

Le détail conserve `paidBy.isCurrentUser` (toujours `false` pour un compte commun).
Le filtre de liste `?paidBy=<jointMemberId>` fonctionne (mécanique existante).

### GET /api/groups/:id/balances & GET /api/groups/:id/balances/me

Shape **inchangée**. Sémantique : les dépenses payées par le compte commun créditent
`totalPaid` de chaque membre actif `person` au prorata des coefficients
([data-model.md](../data-model.md) § Sémantique). Le compte commun n'apparaît jamais dans
`balances`. Dans `/balances/me`, `expenses[].paidBy.isJointAccount` est ajouté et
`isPayer = false` pour ces dépenses.

### GET /api/groups/:id/settlements/suggested & POST /api/groups/:id/settlements

- Suggestions : inchangées (calculées sur les balances, qui excluent déjà le compte commun).
- POST : `toMember` doit être `kind='person'` → `400 INVALID_RECIPIENT` sinon (INV-5).

### GET /api/groups/:id/stats

Shape inchangée. `byMember` redistribue les dépenses payées par le compte commun au prorata
des coefficients (mêmes parts que les balances) ; aucune ligne « compte commun » n'apparaît.
`totalExpenses`, `expenseCount`, `averageExpense`, `byMonth` : inchangés (incluent
naturellement ces dépenses).

### GET /api/groups (liste des groupes)

Shape inchangée. `myBalance` intègre la sémantique compte commun (agrégation partagée,
research R4). `memberCount` exclut le membre virtuel.

## 3. Codes d'erreur

| Code | Statut | Contexte |
|------|--------|----------|
| `INVALID_PAYER` | 400 | `paidBy` inexistant, inactif, ou compte commun désactivé (hors INV-3) |
| `INVALID_PARTICIPANT` | 400 | participant non membre actif `person` (dont compte commun) |
| `INVALID_RECIPIENT` | 400 | `toMember` de settlement non `person` |
| `JOINT_ACCOUNT_NOT_FOUND` | 404 | DELETE sur un groupe sans compte commun |

`JOINT_ACCOUNT_NOT_FOUND` est ajouté à `API_ERROR_CODES` (`src/shared/constants/errors.ts`).

## 4. Frontend (consommation)

- `jointAccountApi` dans `src/features/groups/api/index.ts` : `set(groupId, {name?})`,
  `disable(groupId)`.
- Invalidation : `invalidations.afterJointAccountChange(qc, groupId)` → `groups.detail(groupId)`
  (l'activation seule ne modifie ni soldes ni dépenses).
- `ExpenseForm` : l'option payeur « compte commun » est ajoutée aux items du `Select` quand
  `group.jointAccount?.active === true` (source : `useGroup`, déjà en cache) ; libellé
  distinct (icône + nom). Les participants restent alimentés par `useMembers` (personnes
  uniquement, inchangé).
- `ExpenseCard` / `ExpenseDetail` : badge « compte commun » quand `paidBy.isJointAccount`.
