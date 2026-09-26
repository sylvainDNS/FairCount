# Research: Compte commun comme payeur tiers d'un groupe

**Date**: 2026-07-16 | **Feature**: [spec.md](./spec.md)

Aucun `NEEDS CLARIFICATION` dans le Technical Context (stack connue et imposée par le repo).
Les recherches portent sur les décisions de conception internes.

## R1. Représentation du compte commun : membre virtuel vs payeur polymorphe

**Decision**: le compte commun est une ligne de `group_members` (« membre virtuel ») avec une
colonne discriminante `kind` (`'person'` | `'joint_account'`), `userId` et `email` à `null`,
`income`/`coefficient` à 0.

**Rationale**:
- `expenses.paidBy` est un FK NOT NULL vers `group_members.id`, et **toutes** les requêtes
  d'affichage du payeur font un `innerJoin(groupMembers, eq(expenses.paidBy, groupMembers.id))`
  (`listExpenses`, `getExpense`, `getMyBalance`, `getGroupStats`, `listSettlements`). Un membre
  virtuel les fait fonctionner sans modification : `memberDisplayName` coalesce déjà vers
  `group_members.name` (= nom du compte commun).
- Le filtre `paidBy` de la liste des dépenses et l'édition de dépense fonctionnent tels quels.
- Aucune migration des dépenses existantes, aucun changement du schéma `expenses`.

**Alternatives considered**:
- *Payeur polymorphe* (`paidBy` nullable + `paidByType`, ou table `group_joint_accounts`
  référencée par une seconde colonne) : rejeté — casse le FK NOT NULL, oblige à réécrire tous
  les joins payeur et à dupliquer la logique d'affichage ; blast radius maximal, contraire à
  l'exigence « sans impacter les autres utilisateurs ».
- *Multi-payeur générique* (table `expense_payers`) : rejeté pour cette itération — refonte du
  modèle de dépense (formulaires, soldes, stats) pour un besoin couvert par le cas particulier
  « payé par tous selon les coefficients » ; documenté dans la spec comme évolution future.

## R2. Activation / désactivation

**Decision**: réutiliser `group_members.leftAt` comme état d'activation du membre virtuel.
Activer = insérer la ligne (ou remettre `leftAt` à `null` si elle existe) ; désactiver =
poser `leftAt`. Unicité garantie par un index unique partiel sur
`(group_id) WHERE kind = 'joint_account'`.

**Rationale**:
- `activeGroupMembersCondition` (utilisée par la validation payeur de `createExpense` /
  `updateExpense`) exclut automatiquement un compte commun désactivé des payeurs valides —
  comportement exactement voulu par FR-011, sans code supplémentaire.
- Les dépenses historiques restent affichables (les joins se font par id, pas par état).
- La réactivation restaure la même ligne (même id), donc le même historique (FR-011).

**Alternatives considered**:
- *Colonne dédiée `active` sur une table de config* : rejeté — duplique un concept d'activité
  qui existe déjà (`leftAt`) et oblige à toucher chaque point de validation.
- *Suppression physique à la désactivation* : rejeté — casserait le FK des dépenses existantes.

**Point d'attention** (consigné pour l'implémentation) : `updateExpense` revalide `paidBy`
quand le champ est présent dans le PATCH. Si le compte commun est désactivé et qu'on édite une
dépense existante en renvoyant le même `paidBy`, la validation « membre actif » échouerait.
Règle retenue : un `paidBy` inchangé par rapport à la dépense existante est toujours accepté.

## R3. Répartition côté payeur d'une dépense du compte commun

**Decision**: réutiliser `calculateShares(amount, activeMembers→fair-share, coefficients)`
pour distribuer le `totalPaid` d'une dépense payée par le compte commun entre les membres
actifs réels (pas de `customAmount` côté payeur). Le compte commun lui-même n'apparaît jamais
dans les balances.

**Rationale**:
- Même moteur d'équité et même absorption déterministe des restes d'arrondi (dernier membre)
  que côté bénéficiaires → l'invariant « somme des soldes = 0 » tient par construction :
  la somme des parts payeur vaut exactement `amount`, comme la somme des parts bénéficiaires.
- Cohérent avec l'hypothèse de la spec (pot alimenté proportionnellement aux coefficients).

**Alternatives considered**:
- *Réplication ad hoc de la formule* : rejeté — Principe I de la constitution exige un moteur
  unique et testé pour les arrondis.
- *Suivi de la composition réelle du pot* : hors périmètre (documenté dans la spec).

## R4. Centralisation de l'agrégation des soldes

**Decision**: extraire la logique par-dépense (payeur → totalPaid, parts → totalOwed, avec le
cas compte commun) dans une fonction pure partagée dans
`src/workers/services/shared/balance-calculation.ts`, consommée par `calculateGroupBalances`
**et** par le calcul inline `myBalance` de `listGroups`
(`src/workers/routes/groups/index.ts`).

**Rationale**: la logique de solde existe aujourd'hui à deux endroits (balance-calculation.ts
et listGroups). Introduire le cas « payé par le compte commun » à deux endroits sans facteur
commun garantirait une divergence. Une fonction pure est aussi la seule façon de tester les
invariants sans infra DB de test (le repo n'a pas de harness D1 ; les tests existants ciblent
des fonctions pures).

**Alternatives considered**: dupliquer le branchement dans les deux sites — rejeté (risque de
divergence sur de la logique monétaire, non-négociable par la constitution).

## R5. Surface API

**Decision**:
- `GET /api/groups/:id` : ajoute `jointAccount: { memberId, name, active } | null` ; le
  tableau `members` et `memberCount` excluent le membre virtuel.
- `PUT /api/groups/:id/joint-account` `{ name? }` : crée, renomme ou réactive (upsert
  idempotent).
- `DELETE /api/groups/:id/joint-account` : désactive (pose `leftAt`).
- Dépenses : `paidBy` accepte l'id du membre virtuel (aucun changement de contrat) ; les
  réponses payeur gagnent `isJointAccount: boolean` pour l'affichage distinctif (FR-010).
- Participants : la validation exclut le membre virtuel (`kind = 'person'` requis) → FR-008.
- Settlements : la validation du destinataire exige `kind = 'person'` → FR-007.

**Alternatives considered**: endpoint générique `PATCH /api/groups/:id` étendu avec des champs
compte commun — rejeté : mélange la config du groupe et le cycle de vie d'une entité liée,
et complique la validation Zod (`exactOptionalPropertyTypes`).

## R6. Statistiques

**Decision**: dans `getGroupStats`, les dépenses payées par le compte commun sont
redistribuées dans `byMember` au prorata des coefficients (via la même fonction que R3) ;
`totalExpenses`/`byMonth` les incluent naturellement.

**Rationale**: FR-012 exige que la contribution individuelle reflète la part du coût
réellement portée ; afficher une ligne « Compte commun » dans byMember contredirait FR-007
(pas d'acteur tiers dans les agrégats par membre).

**Alternatives considered**: ligne dédiée « Compte commun » dans byMember — rejeté (lecture
ambiguë : ce montant a déjà été porté par les membres via leurs virements).
