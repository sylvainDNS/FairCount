# Feature Specification: Correction des fenêtres qui se ferment instantanément

**Feature Branch**: `004-fix-dialog-instant-close`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Il y a un bug quand on veut supprimer ou modifier une dépense. Le dialogue de confirmation se ferme instantanément. Je ne peux pas cliquer dessus. J'ai testé uniquement sur Firefox."

## Contexte

Depuis le détail d'une dépense, deux actions ouvrent une nouvelle fenêtre à la place de la
fenêtre de détail :

- **« Supprimer »** ouvre la fenêtre de confirmation « Supprimer la dépense » ;
- **« Modifier »** ouvre le formulaire de modification de la dépense.

Sur Firefox, cette nouvelle fenêtre apparaît puis se ferme aussitôt, avant que la personne ait
pu cliquer dessus. Résultat : il est impossible de supprimer ou de modifier une dépense sur ce
navigateur. Le même enchaînement « une fenêtre en remplace une autre » existe ailleurs dans
l'écran des dépenses (détail d'une dépense → récurrence associée ; détail d'une récurrence →
modification ou confirmation), ces parcours sont donc susceptibles d'être touchés aussi.

Il s'agit d'un bug bloquant : il empêche de corriger une erreur de saisie, et une dépense
erronée fausse les soldes du groupe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Supprimer une dépense (Priority: P1)

Depuis la liste des dépenses d'un groupe, une personne ouvre le détail d'une dépense, clique sur
« Supprimer », voit la fenêtre de confirmation rester affichée, et confirme ou annule la
suppression.

**Why this priority**: c'est le parcours signalé ; sans lui, une dépense saisie par erreur reste
dans les soldes sans aucun moyen de la retirer sur Firefox.

**Independent Test**: sur Firefox, ouvrir une dépense, cliquer « Supprimer », vérifier que la
confirmation reste affichée, cliquer « Supprimer » dans la confirmation et constater que la
dépense a disparu de la liste et des soldes.

**Acceptance Scenarios**:

1. **Given** le détail d'une dépense ouvert, **When** la personne clique sur « Supprimer »,
   **Then** la fenêtre « Supprimer la dépense » s'affiche et reste affichée jusqu'à une action
   explicite de sa part.
2. **Given** la fenêtre de confirmation affichée, **When** la personne clique sur « Supprimer »,
   **Then** la dépense est supprimée et la fenêtre se ferme.
3. **Given** la fenêtre de confirmation affichée, **When** la personne clique sur « Annuler »,
   appuie sur Échap ou clique en dehors de la fenêtre, **Then** la fenêtre se ferme et la
   dépense est conservée.
4. **Given** le détail d'une dépense générée par une récurrence, **When** la personne clique sur
   « Supprimer », **Then** la confirmation spécifique (« Seule cette dépense est supprimée ; la
   récurrence continue. ») s'affiche et reste affichée.

---

### User Story 2 - Modifier une dépense (Priority: P1)

Depuis le détail d'une dépense, une personne clique sur « Modifier », voit le formulaire de
modification rester affiché, change un champ et enregistre.

**Why this priority**: également signalé et tout aussi bloquant : impossible de corriger un
montant, un·e payeur·se ou une répartition erronés.

**Independent Test**: sur Firefox, ouvrir une dépense, cliquer « Modifier », vérifier que le
formulaire reste affiché, modifier le montant, enregistrer, et constater le nouveau montant dans
la liste.

**Acceptance Scenarios**:

1. **Given** le détail d'une dépense ouvert, **When** la personne clique sur « Modifier »,
   **Then** le formulaire de modification s'affiche, pré-rempli, et reste affiché jusqu'à une
   action explicite de sa part.
2. **Given** le formulaire de modification affiché, **When** la personne enregistre ses
   changements, **Then** la dépense est mise à jour et le formulaire se ferme.
3. **Given** le formulaire de modification affiché, **When** la personne annule, **Then** le
   formulaire se ferme sans rien modifier.

---

### User Story 3 - Autres enchaînements de fenêtres de l'écran des dépenses (Priority: P2)

Les autres parcours où une fenêtre en remplace une autre fonctionnent eux aussi sans fermeture
intempestive : depuis le détail d'une dépense générée, ouvrir la récurrence associée ; depuis le
détail d'une récurrence, la modifier, la désactiver ou la supprimer.

**Why this priority**: même mécanisme que le bug signalé, mais non confirmé par la personne qui
l'a remonté ; on veut éviter de corriger un parcours en laissant les voisins cassés.

**Independent Test**: sur Firefox, depuis une dépense générée, ouvrir sa récurrence, puis
cliquer successivement sur chacune de ses actions, et vérifier que chaque fenêtre ouverte reste
affichée.

**Acceptance Scenarios**:

1. **Given** le détail d'une dépense générée par une récurrence, **When** la personne clique
   sur la récurrence, **Then** le détail de la récurrence s'affiche et reste affiché.
2. **Given** le détail d'une récurrence ouvert, **When** la personne clique sur « Modifier » ou
   sur une action demandant confirmation, **Then** la fenêtre correspondante s'affiche et reste
   affichée jusqu'à une action explicite de sa part.

---

### Edge Cases

- Double-clic rapide sur « Supprimer » ou « Modifier » : la fenêtre suivante s'ouvre une seule
  fois et reste affichée ; la suppression n'est jamais déclenchée sans le clic de confirmation.
- Ouverture au clavier (Entrée ou Espace sur le bouton) : même comportement qu'à la souris.
- Usage tactile (Firefox mobile, PWA installée) : même comportement qu'à la souris.
- Une fois la nouvelle fenêtre affichée, les fermetures volontaires (« Annuler », Échap, clic
  en dehors) fonctionnent toujours.
- Échec de la suppression (erreur réseau ou serveur) : la confirmation reste affichée avec le
  message d'erreur, comme aujourd'hui.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Lorsqu'une action dans une fenêtre ouvre une autre fenêtre à sa place, la nouvelle
  fenêtre MUST rester affichée tant que la personne ne la ferme pas explicitement.
- **FR-002**: Le geste (clic, tap ou touche) qui ouvre une fenêtre MUST NOT être interprété
  comme une demande de fermeture de cette même fenêtre.
- **FR-003**: La fenêtre de confirmation de suppression d'une dépense MUST permettre de
  confirmer ou d'annuler la suppression sur Firefox, Chrome et Safari, en version récente, sur
  ordinateur et sur mobile.
- **FR-004**: Le formulaire de modification d'une dépense ouvert depuis son détail MUST être
  utilisable (saisie, enregistrement, annulation) sur ces mêmes navigateurs.
- **FR-005**: Les enchaînements de fenêtres de l'écran des dépenses (détail d'une dépense →
  récurrence ; détail d'une récurrence → modification ou confirmation) MUST respecter FR-001 et
  FR-002.
- **FR-006**: Les moyens de fermeture volontaire d'une fenêtre (bouton d'annulation ou de
  fermeture, touche Échap, clic en dehors de la fenêtre) MUST continuer de fonctionner.
- **FR-007**: Une dépense MUST NOT être supprimée sans le clic explicite de confirmation.
- **FR-008**: Le correctif MUST être couvert par un test de régression reproduisant la
  fermeture intempestive avant correction.
- **FR-009**: Le correctif étant visible des utilisateur·rices, il MUST être publié dans une
  nouvelle version corrective accompagnée d'une entrée « Correction » dans « Quoi de neuf ».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur Firefox, 100 % des tentatives de suppression d'une dépense aboutissent à une
  fenêtre de confirmation qui reste affichée (au moins 10 essais consécutifs, à la souris, au
  clavier et au toucher).
- **SC-002**: Sur Firefox, 100 % des tentatives de modification d'une dépense aboutissent à un
  formulaire qui reste affiché et permet d'enregistrer la modification.
- **SC-003**: Une personne supprime ou modifie une dépense depuis son détail en moins de
  15 secondes, quel que soit son navigateur.
- **SC-004**: Aucune régression sur Chrome et Safari : les mêmes parcours restent fonctionnels.
- **SC-005**: Les autres enchaînements de fenêtres de l'écran des dépenses (User Story 3)
  passent les mêmes vérifications que SC-001 sur Firefox.

## Assumptions

- Le bug est reproductible sur une version récente de Firefox (ordinateur) ; il n'a pas été
  vérifié sur d'autres navigateurs, mais le correctif doit les couvrir sans régression.
- Le périmètre se limite aux fenêtres de l'écran des dépenses et des récurrences ; les autres
  fenêtres de l'application (membres, remboursements, invitations…) sont hors périmètre sauf si
  la même cause y est constatée lors de l'analyse, auquel cas elles sont corrigées dans la même
  livraison.
- Le comportement attendu de chaque fenêtre (contenus, libellés, textes de confirmation) ne
  change pas : seule la fermeture intempestive est corrigée.
- Le bug est probablement apparu avec une évolution récente de l'affichage des fenêtres de
  dépenses (version 0.3.0) ; l'analyse de la cause relève du plan, pas de cette spécification.
- Version corrective attendue : passage de 0.3.0 à 0.3.1, avec une entrée « Correction » au
  changelog.
