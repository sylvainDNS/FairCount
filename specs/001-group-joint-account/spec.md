# Feature Specification: Compte commun comme payeur tiers d'un groupe

**Feature Branch**: `001-group-joint-account`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "il manque aujourd'hui une fonctionnalité. Nous utilisons faircount avec ma copine au quotidien. Mais maintenant nous avons également un compte commun. Lorsque je paie quelque chose pour moi-même (et donc pas pour le foyer) avec la carte de notre compte commun, je ne peux pas saisir une dépense sur faircount, puisqu'au final c'est ma copine et moi qui avons payé pour moi même. À savoir : lorsque l'un de nous fait un virement sur le compte commun, il saisit une dépense faite pour nous deux. Le compte commun est donc vu dans notre paradigme comme un acteur tierce. Nous devons étudier une solution qui puisse s'intégrer élégamment dans l'application, au niveau d'un group, sans pour autant impacter l'ensemble des utilisateurs qui n'utilise pas ce flow"

## Contexte

Dans le paradigme actuel, chaque dépense est payée par un·e membre du groupe. Or certains
foyers disposent d'un compte bancaire commun : chaque membre l'alimente par virement (saisi
aujourd'hui comme une dépense « payée par moi, pour tout le monde », donc répartie selon les
coefficients de revenus). L'argent du pot commun a donc déjà été supporté équitablement par
les membres. Quand ce pot sert à payer un achat **personnel** (dont un·e seul·e membre
bénéficie), il n'existe aucun moyen de le saisir : le payeur réel n'est ni l'un ni l'autre,
mais le collectif. La solution : permettre, par groupe et en opt-in, de déclarer un « compte
commun » utilisable comme payeur d'une dépense, dont le coût est porté par tou·te·s les
membres selon les mêmes règles d'équité que le reste de l'application.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saisir une dépense payée par le compte commun (Priority: P1)

En tant que membre d'un groupe où le compte commun est activé, je saisis une dépense en
choisissant « compte commun » comme payeur et en sélectionnant les bénéficiaires (par exemple
moi seul·e pour un achat personnel réglé avec la carte commune). Les soldes du groupe
reflètent alors le fait que le coût a été porté collectivement, selon les coefficients de
revenus, tandis que seuls les bénéficiaires « consomment » la dépense.

**Why this priority**: c'est le manque fonctionnel exprimé — sans cela, les achats personnels
réglés via le compte commun sont invisibles ou faussent les soldes. C'est la valeur cœur de
la feature.

**Independent Test**: dans un groupe à deux membres (coefficients 60/40) avec compte commun
activé, saisir une dépense de 100 € payée par le compte commun au bénéfice d'un·e seul·e
membre, puis vérifier que le solde du bénéficiaire baisse de la part des autres (40 € si son
coefficient est 60 %) et que la somme des soldes du groupe reste exactement 0.

**Acceptance Scenarios**:

1. **Given** un groupe à deux membres (coefficients 60/40) avec compte commun activé,
   **When** une dépense de 100 € est saisie avec payeur = compte commun et bénéficiaire = le
   membre à 60 %, **Then** le solde de ce membre diminue de 40 €, celui de l'autre augmente
   de 40 €, et la somme des soldes vaut 0.
2. **Given** le même groupe, **When** une dépense payée par le compte commun est saisie au
   bénéfice de tous les membres (répartition équitable), **Then** les soldes de chacun·e
   restent inchangés (effet neutre) et la dépense apparaît dans l'historique.
3. **Given** une dépense payée par le compte commun, **When** un·e membre consulte le détail
   de la dépense, **Then** le payeur affiché est le compte commun (avec son nom), clairement
   distinct d'un·e membre.
4. **Given** une dépense payée par le compte commun avec des montants personnalisés par
   bénéficiaire, **When** elle est enregistrée, **Then** la répartition côté bénéficiaires
   respecte les montants personnalisés et la somme des soldes du groupe reste 0.

---

### User Story 2 - Activer et configurer le compte commun au niveau du groupe (Priority: P2)

En tant que membre d'un groupe, j'active le compte commun depuis les paramètres du groupe et
je peux lui donner un nom (par défaut « Compte commun »). Tant qu'il n'est pas activé, rien
ne change dans l'application : les formulaires de dépense, les soldes et l'historique restent
strictement identiques pour tous les groupes qui n'utilisent pas ce flux.

**Why this priority**: c'est la condition d'intégration « élégante » demandée — la feature
doit être invisible pour les groupes qui ne l'utilisent pas. Sans opt-in propre, on impacte
tous les utilisateur·rice·s.

**Independent Test**: créer deux groupes, activer le compte commun dans un seul, et vérifier
que l'option payeur « compte commun » n'apparaît que dans le groupe activé, et que rien ne
change dans l'autre.

**Acceptance Scenarios**:

1. **Given** un groupe sans compte commun activé, **When** un·e membre ouvre le formulaire de
   dépense, **Then** la liste des payeurs ne contient que les membres du groupe (comportement
   actuel inchangé).
2. **Given** un groupe, **When** un·e membre active le compte commun dans les paramètres du
   groupe et le nomme, **Then** ce nom apparaît comme option de payeur dans le formulaire de
   dépense pour tous les membres du groupe.
3. **Given** un groupe avec compte commun activé et des dépenses déjà saisies avec ce payeur,
   **When** un·e membre désactive le compte commun, **Then** les dépenses existantes et leurs
   effets sur les soldes sont conservés, mais le compte commun n'est plus proposé comme
   payeur pour de nouvelles dépenses.

---

### User Story 3 - Lire les soldes, l'historique et les statistiques avec un compte commun (Priority: P3)

En tant que membre d'un groupe utilisant le compte commun, je consulte les soldes, les
suggestions de remboursement et les statistiques : le compte commun n'y apparaît jamais comme
un·e membre à rembourser — c'est un acteur transparent dont les paiements sont déjà imputés
aux membres.

**Why this priority**: nécessaire à la cohérence de lecture, mais dépend des deux premières
stories ; la valeur principale est déjà rendue par la saisie correcte.

**Independent Test**: après plusieurs dépenses payées par le compte commun, vérifier que
l'écran des soldes et les suggestions de remboursement ne mentionnent que des membres, et que
les statistiques du groupe restent cohérentes (totaux corrects).

**Acceptance Scenarios**:

1. **Given** un groupe avec des dépenses payées par le compte commun, **When** un·e membre
   consulte les soldes, **Then** seuls les membres apparaissent, aucun solde n'est affiché
   pour le compte commun, et aucune suggestion de remboursement ne le concerne.
2. **Given** un groupe avec des dépenses payées par le compte commun, **When** un·e membre
   consulte l'historique, **Then** ces dépenses sont identifiables au premier coup d'œil
   (payeur = nom du compte commun).
3. **Given** un groupe avec des dépenses payées par le compte commun, **When** un·e membre
   consulte les statistiques du groupe, **Then** le total des dépenses inclut ces dépenses et
   la contribution de chaque membre reflète la part du coût qu'il ou elle a réellement portée.

---

### Edge Cases

- Dépense payée par le compte commun au bénéfice de tous les membres : autorisée, effet neutre
  sur les soldes, conservée dans l'historique (utile pour le suivi des dépenses du foyer).
- Répartition du côté payeur avec des restes d'arrondi (ex. 100 € à 3 membres) : les centimes
  restants sont distribués de façon déterministe, et la somme des soldes reste exactement 0.
- Un·e membre a un coefficient de 0 (revenu nul) : sa part du coût côté payeur est de 0 ; il
  ou elle peut néanmoins être bénéficiaire.
- Un·e membre quitte le groupe : la répartition côté payeur des dépenses existantes suit les
  mêmes règles que la répartition actuelle des dépenses entre participants (cohérence avec le
  comportement existant du groupe).
- Désactivation du compte commun alors que des dépenses l'utilisent : historique et soldes
  intacts ; l'édition d'une dépense existante payée par le compte commun reste possible et
  conserve ce payeur.
- Le compte commun ne peut jamais être bénéficiaire d'une dépense ni partie prenante d'un
  remboursement (ni émetteur ni destinataire).
- Groupe à un·e seul·e membre actif·ve : la dépense payée par le compte commun est acceptée
  mais son effet sur les soldes est nul (payeur unique = bénéficiaire unique).
- Le nom du compte commun entre en collision avec le nom d'un·e membre : les deux restent
  distinguables dans l'interface (le compte commun est visuellement identifié comme tel).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Chaque groupe DOIT pouvoir activer, en opt-in, un compte commun unique, depuis
  les paramètres du groupe. Par défaut, un groupe n'a pas de compte commun.
- **FR-002**: Le compte commun DOIT avoir un nom modifiable par les membres du groupe (valeur
  par défaut : « Compte commun »).
- **FR-003**: Dans un groupe où le compte commun est activé, tout·e membre DOIT pouvoir
  sélectionner le compte commun comme payeur lors de la création ou de la modification d'une
  dépense, au même endroit que le choix d'un·e membre payeur·se.
- **FR-004**: Lorsqu'une dépense est payée par le compte commun, son coût DOIT être porté par
  l'ensemble des membres du groupe proportionnellement à leurs coefficients de revenus (mêmes
  règles d'équité et d'arrondi que la répartition des dépenses entre participants).
- **FR-005**: La sélection des bénéficiaires et les montants personnalisés DOIVENT fonctionner
  à l'identique que le payeur soit un·e membre ou le compte commun.
- **FR-006**: Après toute opération impliquant le compte commun (création, modification,
  suppression de dépense), la somme des soldes des membres du groupe DOIT valoir exactement 0.
- **FR-007**: Le compte commun NE DOIT PAS avoir de solde propre : il ne DOIT apparaître ni
  dans les soldes, ni dans les suggestions de remboursement, ni comme partie d'un
  remboursement.
- **FR-008**: Le compte commun NE DOIT PAS pouvoir être bénéficiaire d'une dépense.
- **FR-009**: Dans les groupes où le compte commun n'est pas activé, l'expérience (formulaires,
  soldes, historique, statistiques) DOIT rester strictement inchangée.
- **FR-010**: Les dépenses payées par le compte commun DOIVENT être clairement identifiables
  dans l'historique et le détail d'une dépense (payeur = nom du compte commun, distinct d'un·e
  membre).
- **FR-011**: La désactivation du compte commun DOIT conserver les dépenses existantes et leurs
  effets sur les soldes ; elle DOIT seulement retirer le compte commun des payeurs proposés
  pour les nouvelles dépenses. La réactivation DOIT restaurer l'option avec le même compte.
- **FR-012**: Les statistiques du groupe DOIVENT intégrer les dépenses payées par le compte
  commun : le total du groupe les inclut, et la contribution individuelle de chaque membre
  reflète la part du coût qu'il ou elle a portée.

### Key Entities

- **Compte commun**: acteur virtuel rattaché à un groupe (au plus un par groupe), avec un nom
  et un état actif/inactif. Il peut payer des dépenses mais n'a ni solde, ni revenus, ni
  coefficient, et ne participe jamais aux remboursements.
- **Dépense**: étendue pour accepter deux natures de payeur — un·e membre du groupe (existant)
  ou le compte commun du groupe. Le reste de la dépense (montant, bénéficiaires, montants
  personnalisés, date, description) est inchangé.
- **Groupe**: porte la configuration d'activation et le nom du compte commun.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un·e membre peut saisir une dépense personnelle réglée via le compte commun en
  un seul passage dans le formulaire de dépense habituel, sans saisie compensatoire manuelle
  (aujourd'hui : impossible ou nécessite deux écritures artificielles).
- **SC-002**: Pour 100 % des dépenses payées par le compte commun (y compris les cas
  d'arrondi), la somme des soldes du groupe vaut exactement 0.
- **SC-003**: Les membres de groupes sans compte commun activé ne constatent aucun changement
  dans leurs parcours (aucune nouvelle option, aucun changement de soldes ni d'historique).
- **SC-004**: Pour tout scénario de dépense payée par le compte commun, l'effet sur les soldes
  est identique au calcul de référence « dépense payée par tous les membres selon leurs
  coefficients, consommée par les bénéficiaires » (vérifiable sur cas de test chiffrés).
- **SC-005**: Une dépense payée par le compte commun est identifiable comme telle dans
  l'historique sans ouvrir son détail.

## Assumptions

- **Un seul compte commun par groupe** : le besoin exprimé est celui d'un foyer avec un pot
  commun unique ; la gestion de plusieurs comptes tiers par groupe est hors périmètre.
- **Répartition côté payeur selon les coefficients de revenus** : le pot commun est alimenté
  par des virements saisis comme dépenses réparties selon les coefficients ; son contenu a
  donc déjà été supporté proportionnellement aux revenus. L'application ne suit pas le solde
  réel du compte bancaire et ne propose pas de répartition payeur alternative (50/50 ou au
  prorata des alimentations réelles).
- **La justesse repose sur des alimentations saisies en répartition équitable** : la règle
  « coefficients » côté payeur est exacte au centime tant que les virements vers le compte
  commun sont saisis en répartition équitable (sans montants personnalisés). Si le pot était
  alimenté hors coefficients, l'imputation deviendrait une approximation ; la solution exacte
  serait un suivi de la composition du pot (grand livre du compte commun), identifié comme
  évolution future hors périmètre. L'interface d'activation du compte commun peut rappeler
  cette contrainte d'usage.
- **L'alimentation du compte commun reste hors périmètre** : le flux actuel (virement saisi
  comme dépense « payée par moi pour tout le monde ») couvre déjà ce besoin ; le compte commun
  n'est donc jamais bénéficiaire.
- **Activation ouverte à tou·te·s les membres du groupe** : comme les autres réglages de
  groupe, l'activation/désactivation ne requiert pas de rôle particulier.
- **Pas de rétroactivité automatique** : activer le compte commun ne modifie aucune dépense
  existante ; seules les dépenses saisies ensuite peuvent l'utiliser comme payeur.
- **Suppression du compte commun non proposée** : seule la désactivation existe, afin de
  préserver l'intégrité de l'historique des dépenses qui le référencent.
