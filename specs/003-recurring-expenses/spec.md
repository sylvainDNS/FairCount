# Feature Specification: Dépenses récurrentes

**Feature Branch**: `003-recurring-expenses`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Je veux créer une nouvelle fonctionnalité. Le principe de cette fonctionnalité est d'introduire la notion de dépenses récurentes. Une dépense récurente est une dépense qui s'ajoute automatiquement à une fréquence choisie par l'utilisateur. L'utilisateur doit pouvoir choisir la fréquence simplement, à savoir : tous les jours, tous les mois, toutes les semaines, tous les ans, le 1er de chaque mois, les 13 du mois et ainsi de suite. Une dépense récurrente doit pouvoir être facilement visualisée dans la liste des dépenses. Une dépense récurrente est attribuée à un et un seul groupe à la fois."

## Contexte

Beaucoup de dépenses partagées reviennent à l'identique : loyer, abonnements (internet,
streaming, électricité), assurance, virement mensuel vers le compte commun, cotisation
annuelle… Aujourd'hui, chaque fois doit être ressaisie à la main, ce qui est fastidieux et
source d'oublis — et un oubli fausse les soldes du groupe. La fonctionnalité introduit la
**récurrence** : on décrit une fois la dépense (montant, payeur·se, bénéficiaires,
répartition) et sa fréquence ; l'application ajoute ensuite automatiquement une dépense à
chaque échéance. Ces dépenses générées se comportent exactement comme les autres (soldes,
remboursements, statistiques) et sont clairement identifiables dans la liste.

## Vocabulaire

Trois termes, utilisés de la même façon dans la spec et dans l'interface :

| Terme | Définition | Dans l'interface |
|-------|------------|------------------|
| **Récurrence** | Le modèle : la dépense à répéter (description, montant, payeur·se, bénéficiaires, répartition) et sa règle de fréquence. N'a aucun effet sur les soldes par elle-même. | « récurrence » (« Modifier la récurrence », « Désactiver la récurrence ») |
| **Échéance** | Une date à laquelle une récurrence ajoute une dépense. C'est toujours une date, jamais une dépense. | « échéance » (« Prochaine échéance : 13 oct. ») |
| **Dépense générée** | Une dépense ordinaire ajoutée automatiquement par une récurrence à une échéance. C'est elle qui compte dans les soldes. | simplement « dépense », repérée par une icône de répétition et le filtre « Récurrentes » |

Le terme « occurrence » n'est pas utilisé. Dans l'interface, une action sur une dépense générée
parle toujours de « la dépense », une action sur le modèle toujours de « la récurrence », pour
qu'on ne confonde jamais « supprimer cette dépense » et « supprimer la récurrence ».

## Clarifications

### Session 2026-09-27

- Q: Au-delà du marquage des dépenses générées, faut-il afficher les récurrences dans la liste
  des dépenses ? → A: Oui, via une section repliable « Récurrences » en tête de liste, sans
  écran de gestion séparé.
- Q: Si la date de début est dans le passé, faut-il créer les dépenses manquées ? → A: Non,
  la date de début ne peut pas être dans le passé ; la régularisation est à la charge des
  membres.
- Q: Qui peut modifier une récurrence ? → A: N'importe quel·le membre du groupe, quelle que
  soit la personne qui l'a créée.
- Q: Faut-il une date de fin ? → A: Non, on reste simple : une récurrence se répète jusqu'à ce
  qu'on la désactive ou la supprime.
- Q: Comment arrêter une récurrence ? → A: Deux actions distinctes. **Désactiver** : plus
  aucune dépense n'est ajoutée, la récurrence reste visible (et peut être réactivée).
  **Supprimer** : la récurrence disparaît de la section. Dans les deux cas, les dépenses déjà
  générées restent dans la liste et restent modifiables et supprimables librement.
- Q: Réactivation et dépenses d'une récurrence supprimée ? → A: Une récurrence désactivée peut
  être réactivée. Après suppression, les dépenses générées gardent leur indicateur de
  récurrence ; la récurrence supprimée est conservée en historique pour les décrire.
- Q: Vocabulaire ? → A: récurrence / échéance / dépense générée (voir « Vocabulaire »).
- Correction (plan, 2026-09-27) : l'application recalcule les parts de toutes les dépenses avec
  les coefficients actuels ; une dépense générée suit la même règle (FR-013), il n'y a pas de
  coefficients « figés » à la date de génération.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Créer une récurrence (Priority: P1)

En tant que membre d'un groupe, je saisis une dépense comme d'habitude (description, montant,
payeur·se, bénéficiaires, répartition) et j'indique qu'elle se répète, en choisissant une
fréquence simple : tous les jours, toutes les semaines, tous les mois, tous les ans. Pour
« tous les mois », je peux préciser le jour du mois (le 1er, le 13, le 28…) ; pour « toutes les
semaines », le jour de la semaine. Avant de valider, je vois en clair la règle choisie et la
prochaine échéance (ex. « Tous les mois, le 13 — prochaine échéance : 13 octobre 2026 »).

**Why this priority**: sans création de récurrence, la fonctionnalité n'existe pas. C'est la
brique minimale, testable seule.

**Independent Test**: créer une récurrence mensuelle le 13 dans un groupe, vérifier que la
règle et la prochaine échéance affichées sont correctes et que la récurrence est enregistrée
dans ce groupe uniquement.

**Acceptance Scenarios**:

1. **Given** un groupe actif, **When** je crée une dépense de 850 € « Loyer » payée par Alex,
   pour tout le monde, répétée « Tous les mois, le 1er », **Then** la récurrence est
   enregistrée dans ce groupe et la prochaine échéance affichée est le 1er du mois suivant
   (ou le jour même si l'on est le 1er).
2. **Given** le formulaire de dépense, **When** je choisis « toutes les semaines » sans
   préciser de jour, **Then** le jour de la semaine proposé par défaut est celui de la date de
   début.
3. **Given** le formulaire de dépense, **When** je choisis « tous les mois » et le jour 31,
   **Then** l'aperçu m'indique que, les mois plus courts, la dépense sera ajoutée le dernier
   jour du mois.
4. **Given** le formulaire de dépense, **When** je ne coche pas l'option de répétition,
   **Then** la saisie reste strictement identique à aujourd'hui (aucune étape supplémentaire).
5. **Given** le formulaire de dépense avec répétition, **When** je choisis une date de début
   antérieure à aujourd'hui, **Then** la saisie est refusée avec un message expliquant que la
   récurrence démarre au plus tôt aujourd'hui et que les dépenses passées se saisissent une par
   une.

---

### User Story 2 - Ajout automatique des dépenses (Priority: P1)

À chaque échéance, sans aucune action de ma part, une dépense est ajoutée au groupe avec la
description, le montant, le ou la payeur·se, les bénéficiaires et la répartition définis dans la
récurrence, datée du jour de l'échéance. Elle impacte les soldes exactement comme n'importe
quelle dépense saisie à la main (mêmes règles de répartition par coefficients).

**Why this priority**: c'est la promesse même de la fonctionnalité (« s'ajoute
automatiquement »). Livré avec la Story 1, il constitue le MVP.

**Independent Test**: créer une récurrence quotidienne, attendre (ou simuler) le passage au
jour suivant, vérifier qu'une et une seule dépense est générée avec les bonnes valeurs et que
les soldes du groupe restent équilibrés (somme nulle).

**Acceptance Scenarios**:

1. **Given** une récurrence « Tous les mois, le 13 », **When** arrive le 13 du mois, **Then**
   une dépense datée du 13 apparaît dans la liste des dépenses du groupe pour tou·te·s les
   membres, sans action de leur part.
2. **Given** une échéance passée alors que le service était momentanément indisponible,
   **When** le service reprend, **Then** la dépense manquante est générée avec la date de
   l'échéance d'origine, une seule fois.
3. **Given** une récurrence avec répartition équitable, **When** une dépense est générée,
   **Then** sa répartition suit exactement les mêmes règles qu'une dépense saisie à la main
   avec les mêmes payeur·se, bénéficiaires et montant (y compris lors d'un changement de
   revenus ultérieur).
4. **Given** une récurrence « Tous les mois, le 31 », **When** on arrive fin février, **Then**
   la dépense générée est datée du dernier jour de février.
5. **Given** une récurrence « Tous les ans » démarrant le 29 février, **When** l'année n'est
   pas bissextile, **Then** la dépense générée est datée du 28 février.

---

### User Story 3 - Repérer les récurrences et leurs dépenses dans la liste (Priority: P2)

Dans la liste des dépenses d'un groupe, je distingue immédiatement les dépenses générées par
une récurrence grâce à un indicateur visuel discret mais explicite (icône de répétition,
restituée aux lecteurs d'écran). En haut de la liste, une section repliable « Récurrences »
présente les récurrences du groupe avec leur prochaine échéance ; il n'existe pas d'écran
séparé. En ouvrant une dépense générée, je vois la règle de la récurrence dont elle provient et
j'accède à la récurrence elle-même.

**Why this priority**: explicitement demandé ; sans ce repère, les dépenses générées se
confondent avec les saisies manuelles et on ne sait pas ce qui tombera automatiquement.

**Independent Test**: avec une récurrence et au moins une dépense générée, ouvrir la liste des
dépenses et vérifier que la dépense générée porte l'indicateur, lisible aussi par un lecteur
d'écran, et que son détail renvoie vers la récurrence.

**Acceptance Scenarios**:

1. **Given** une liste mêlant dépenses saisies à la main et dépenses générées, **When** je la
   parcours, **Then** chaque dépense générée porte l'indicateur et aucune dépense saisie à la
   main ne le porte.
2. **Given** une dépense générée, **When** j'ouvre son détail, **Then** je vois la fréquence
   (ex. « Tous les mois, le 13 ») et un accès à la récurrence associée.
3. **Given** les filtres existants de la liste, **When** je filtre sur « Récurrentes »,
   **Then** seules les dépenses générées par une récurrence sont affichées.
4. **Given** un groupe avec deux récurrences, **When** j'ouvre la liste des dépenses, **Then**
   la section « Récurrences » indique leur nombre et la prochaine échéance et, dépliée, affiche
   pour chacune la description, le montant, la fréquence, la prochaine échéance et le statut ;
   ces lignes sont visuellement distinctes des dépenses et ne comptent pas dans les totaux.
5. **Given** un groupe sans aucune récurrence, **When** j'ouvre la liste des dépenses,
   **Then** la section « Récurrences » n'apparaît pas.
6. **Given** la section dépliée ou repliée, **When** je reviens plus tard sur la liste,
   **Then** elle conserve l'état que j'avais choisi sur cet appareil (repliée par défaut).

---

### User Story 4 - Gérer ses récurrences (Priority: P2)

Depuis la section « Récurrences » de la liste des dépenses (ou depuis le détail d'une dépense
générée), j'ouvre une récurrence. N'importe quel·le membre du groupe peut la modifier (montant,
description, bénéficiaires, répartition, payeur·se, fréquence), la désactiver, la réactiver ou
la supprimer, quelle que soit la personne qui l'a créée. Une modification ne s'applique qu'aux
prochaines échéances ; les dépenses déjà générées restent inchangées et modifiables une à une
comme toute dépense.

**Why this priority**: indispensable dans la durée (hausse de loyer, abonnement résilié), mais
les Stories 1 à 3 apportent déjà de la valeur sans elle pendant un premier cycle.

**Independent Test**: modifier le montant d'une récurrence ayant déjà généré une dépense,
vérifier que la dépense existante garde l'ancien montant et que la suivante prend le nouveau ;
désactiver puis supprimer une récurrence et vérifier qu'aucune dépense n'est plus générée et
que les dépenses passées restent.

**Acceptance Scenarios**:

1. **Given** une récurrence active ayant généré deux dépenses, **When** je passe son montant
   de 850 € à 880 €, **Then** les deux dépenses restent à 850 € et la prochaine sera à 880 €.
2. **Given** une récurrence active, **When** je la désactive, **Then** plus aucune dépense
   n'est générée, les dépenses déjà générées restent dans la liste, et la récurrence reste dans
   la section « Récurrences » avec le statut « Désactivée ».
3. **Given** une récurrence désactivée, **When** je la réactive, **Then** la prochaine échéance
   est calculée à partir d'aujourd'hui et aucune dépense n'est générée pour la période où elle
   était désactivée.
4. **Given** une récurrence (active ou désactivée) ayant généré des dépenses, **When** je la
   supprime après confirmation, **Then** elle disparaît de la section, plus aucune dépense
   n'est générée, et toutes les dépenses déjà générées restent dans la liste, modifiables et
   supprimables, avec leur indicateur de récurrence ; leur détail affiche la règle et la
   mention « Récurrence supprimée », sans accès à la récurrence.
5. **Given** une dépense générée, **When** je la supprime ou la modifie, **Then** seule cette
   dépense est affectée ; la récurrence et les autres dépenses continuent normalement, et la
   dépense supprimée n'est pas générée à nouveau.
6. **Given** une récurrence créée par Alex, **When** Camille, membre du même groupe, la
   modifie, la désactive ou la supprime, **Then** l'action est acceptée comme si Alex l'avait
   faite.

---

### Edge Cases

- **Date de début passée** : refusée avec un message clair ; la date de début est aujourd'hui
  ou plus tard. Les dépenses antérieures sont régularisées par les membres, une par une.
- **Payeur·se qui quitte le groupe** (ou compte commun désactivé) : la récurrence est mise en
  pause automatiquement (aucune dépense générée) et signalée « À revoir » dans la section
  « Récurrences », jusqu'à ce qu'un·e membre choisisse un·e autre payeur·se, la désactive ou la
  supprime.
- **Bénéficiaire qui quitte le groupe** : les dépenses suivantes excluent ce·tte bénéficiaire ;
  si plus aucun·e bénéficiaire actif·ve ne reste, la récurrence est mise en pause et signalée
  « À revoir ».
- **Nouveau·elle membre** : il ou elle n'est pas ajouté·e automatiquement aux bénéficiaires
  d'une récurrence existante ; il faut modifier la récurrence.
- **Répartition en montants personnalisés** : les montants personnalisés sont reproduits à
  l'identique à chaque échéance ; une modification du montant total qui rend la répartition
  incohérente est refusée avec un message clair.
- **Groupe archivé ou supprimé** : aucune dépense n'est générée pour un groupe archivé ; la
  suppression d'un groupe supprime ses récurrences.
- **Jour du mois inexistant** (29, 30, 31) : la dépense est générée le dernier jour du mois.
- **Double génération** : une même échéance ne génère jamais plus d'une dépense, même en cas de
  reprise après incident ou de traitements concurrents.
- **Modification de la fréquence** : la prochaine échéance est recalculée à partir de la
  nouvelle règle, sans générer de dépense pour la période écoulée.
- **Suppression d'une récurrence** : ses dépenses générées gardent l'indicateur de récurrence
  et la règle d'origine, avec la mention « Récurrence supprimée » ; rien d'autre ne change
  (montants, parts, soldes). La récurrence supprimée n'est plus consultable ni modifiable.
- **Fuseau horaire** : le « jour » d'une échéance s'entend dans le fuseau de référence du
  groupe (Europe/Paris par défaut), pas en temps universel.

## Requirements *(mandatory)*

### Functional Requirements

**Création et fréquence**

- **FR-001**: Les membres d'un groupe DOIVENT pouvoir indiquer qu'une dépense se répète au
  moment de sa saisie, depuis le même formulaire que les dépenses ordinaires ; cela crée une
  récurrence.
- **FR-002**: Le système DOIT proposer les fréquences : quotidienne, hebdomadaire, mensuelle,
  annuelle.
- **FR-003**: Pour une fréquence mensuelle, l'utilisateur·rice DOIT pouvoir choisir le jour du
  mois (1 à 31) ; par défaut, le jour de la date de début.
- **FR-004**: Pour une fréquence hebdomadaire, l'utilisateur·rice DOIT pouvoir choisir le jour
  de la semaine ; par défaut, celui de la date de début.
- **FR-005**: Pour une fréquence annuelle, l'échéance DOIT être le jour et le mois de la date
  de début.
- **FR-006**: Lorsqu'un jour d'échéance n'existe pas dans un mois donné (29, 30, 31, ou 29
  février), l'échéance DOIT tomber le dernier jour de ce mois.
- **FR-007**: Le système DOIT afficher, avant validation, un résumé en langage naturel de la
  règle et la date de la prochaine échéance.
- **FR-008**: Une récurrence DOIT avoir une date de début (par défaut aujourd'hui) et n'a pas
  de date de fin : elle se répète jusqu'à ce qu'elle soit désactivée ou supprimée.
- **FR-008a**: La date de début NE DOIT PAS être antérieure à aujourd'hui ; le système ne
  génère jamais de dépense pour une période précédant la création de la récurrence.
- **FR-009**: Une récurrence DOIT appartenir à un et un seul groupe, fixé à sa création et non
  transférable.
- **FR-010**: Une récurrence DOIT reprendre tous les attributs d'une dépense ordinaire :
  description, montant, payeur·se (y compris le compte commun s'il est activé),
  bénéficiaires, mode de répartition (équitable ou montants personnalisés).

**Génération**

- **FR-011**: À chaque échéance d'une récurrence active, le système DOIT générer
  automatiquement une dépense datée de l'échéance, sans action d'un·e membre.
- **FR-012**: Une échéance DOIT générer au plus une dépense ; les échéances manquées suite à
  une indisponibilité DOIVENT être rattrapées avec leur date d'origine.
- **FR-013**: La répartition d'une dépense générée DOIT suivre exactement les règles des
  dépenses saisies à la main (coefficients de revenus, montants personnalisés, arrondis) ; la
  somme des soldes du groupe DOIT rester exactement nulle.
- **FR-014**: Une dépense générée DOIT être indiscernable d'une dépense ordinaire pour le
  calcul des soldes, des remboursements et des statistiques.
- **FR-015**: Le système NE DOIT PAS générer de dépense pour une récurrence désactivée, en
  pause, supprimée, ou appartenant à un groupe archivé.
- **FR-016**: Si le ou la payeur·se n'est plus actif·ve, ou si aucun·e bénéficiaire actif·ve ne
  reste, la récurrence DOIT être mise en pause automatiquement et signalée « À revoir ».

**Visualisation**

- **FR-017**: Dans la liste des dépenses, chaque dépense générée par une récurrence (y compris
  supprimée) DOIT porter un indicateur visuel de récurrence, également restitué aux technologies
  d'assistance.
- **FR-018**: Le détail d'une dépense générée DOIT afficher la règle de la récurrence et donner
  accès à la récurrence d'origine ; si celle-ci a été supprimée, il DOIT afficher la règle et la
  mention « Récurrence supprimée », sans accès.
- **FR-019**: La liste des dépenses DOIT permettre de filtrer les dépenses générées par une
  récurrence.
- **FR-020**: La liste des dépenses DOIT afficher en tête une section repliable « Récurrences »
  listant toutes les récurrences du groupe (actives, en pause « À revoir », désactivées), avec
  description, montant, fréquence, prochaine échéance (pour les actives) et statut ; il n'y a
  pas d'écran de gestion séparé.
- **FR-020a**: Les lignes de cette section DOIVENT être visuellement distinctes des dépenses et
  NE DOIVENT PAS être comptées dans les totaux ni les soldes affichés.
- **FR-020b**: La section NE DOIT PAS s'afficher lorsque le groupe n'a aucune récurrence ; elle
  est repliée par défaut et son état replié ou déplié DOIT être mémorisé par appareil.

**Gestion**

- **FR-021**: N'importe quel·le membre actif·ve du groupe DOIT pouvoir modifier, désactiver,
  réactiver ou supprimer n'importe quelle récurrence du groupe, quel·le que soit son
  auteur·rice.
- **FR-022**: La modification d'une récurrence NE DOIT affecter que les prochaines échéances.
- **FR-023**: Modifier ou supprimer une dépense générée NE DOIT affecter ni la récurrence ni
  les autres dépenses générées ; une dépense générée supprimée NE DOIT PAS être générée à
  nouveau.
- **FR-024**: Désactiver une récurrence DOIT arrêter la génération tout en la conservant dans
  la section « Récurrences » ; la réactiver DOIT reprendre à la prochaine échéance à partir
  d'aujourd'hui, sans rattrapage de la période désactivée.
- **FR-025**: Supprimer une récurrence DOIT demander une confirmation, la retirer
  définitivement de la section et de toute action, et conserver toutes ses dépenses déjà
  générées avec leur indicateur de récurrence. La récurrence supprimée reste conservée en
  historique afin que ses dépenses générées puissent en afficher la règle.
- **FR-026**: Dans les deux cas (désactivation, suppression), les dépenses déjà générées DOIVENT
  rester modifiables et supprimables comme n'importe quelle dépense.

### Key Entities *(include if feature involves data)*

- **Récurrence** : modèle rattaché à un groupe. Attributs : description, montant, payeur·se,
  bénéficiaires et répartition, règle de fréquence (type, jour de semaine ou du mois le cas
  échéant), date de début, statut (active, en pause « À revoir », désactivée, supprimée —
  conservée en historique, invisible dans la section), prochaine échéance, auteur·rice.
- **Échéance** : date calculée à partir de la règle d'une récurrence ; n'est pas une donnée
  saisie.
- **Dépense générée** : dépense ordinaire du groupe, liée à la récurrence qui l'a générée et à
  l'échéance correspondante, y compris après suppression de la récurrence. Ce lien permet l'affichage de
  l'indicateur et garantit l'unicité d'une dépense par échéance.
- **Groupe** (existant) : porte zéro ou plusieurs récurrences.
- **Membre** (existant) : peut être payeur·se ou bénéficiaire d'une récurrence ; le compte
  commun peut en être le payeur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un·e membre crée une récurrence mensuelle en moins d'une minute, soit au plus
  3 interactions de plus qu'une dépense ordinaire.
- **SC-002**: 100 % des échéances d'une récurrence active génèrent exactement une dépense,
  visible par tou·te·s les membres le jour même de l'échéance, sans action de leur part.
- **SC-003**: Après chaque dépense générée, la somme des soldes du groupe vaut exactement 0
  (au centime près).
- **SC-004**: En test utilisateur, au moins 9 personnes sur 10 identifient sans aide quelles
  dépenses d'une liste ont été ajoutées par une récurrence.
- **SC-005**: Les membres n'ont plus à ressaisir manuellement une dépense régulière : zéro
  ressaisie nécessaire pour une dépense à montant fixe sur 12 mois.
- **SC-006**: La saisie d'une dépense non récurrente n'est ni rallongée ni modifiée pour les
  membres qui n'utilisent pas la fonctionnalité.

## Assumptions

- Les fréquences sont à intervalle unitaire (tous les jours / chaque semaine / chaque mois /
  chaque an) ; les intervalles multiples (« toutes les 2 semaines », « tous les 3 mois ») sont
  hors périmètre de cette version.
- « Tous les mois » et « le N de chaque mois » sont une seule et même fréquence mensuelle dont
  le jour vaut par défaut celui de la date de début.
- Pas de date de fin : on arrête une récurrence en la désactivant ou en la supprimant.
- Le montant est fixe ; les dépenses à montant variable (facture d'électricité réelle) restent
  saisies à la main ou corrigées dépense par dépense.
- Aucune notification (e-mail, push) n'est envoyée lors de la génération d'une dépense dans
  cette version.
- Tout·e membre actif·ve du groupe peut créer, modifier, désactiver, réactiver ou supprimer
  n'importe quelle récurrence du groupe, sans notion de propriété (décision produit du
  2026-09-27).
- La régularisation de dépenses antérieures à la création d'une récurrence est à la charge des
  membres, par saisie de dépenses ordinaires.
- Une dépense déjà enregistrée ne peut pas être transformée en récurrence ; une dépense générée
  ne peut pas devenir elle-même une récurrence.
- Le fuseau horaire de référence est Europe/Paris, cohérent avec la base d'utilisateur·rices
  actuelle.
- Une récurrence ne peut pas être déplacée vers un autre groupe ; pour changer de groupe, on la
  supprime et on en recrée une.
- Les récurrences s'appuient sur les règles existantes de répartition, d'arrondi et du compte
  commun (feature 001) sans les modifier.
- Il s'agit d'un changement visible par les utilisateur·rices : il donnera lieu à un bump de
  version MINOR et à une entrée « Nouveauté » dans le changelog.
