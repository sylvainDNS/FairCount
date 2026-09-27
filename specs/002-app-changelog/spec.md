# Feature Specification: Changelog « Nouveautés » in-app

**Feature Branch**: `002-app-changelog`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "En plus du toast de changement de version, intégrer un changelog pour informer l'utilisateur des nouveautés."

## Contexte

Aujourd'hui, quand une nouvelle version de l'application est disponible, un toast « Mise à jour
disponible — Une nouvelle version est disponible. » propose d'actualiser. Après l'actualisation,
rien n'indique à l'utilisateur·rice ce qui a changé : les nouvelles fonctionnalités (ex. le
compte commun comme payeur) passent inaperçues. Cette feature ajoute un changelog lisible,
rédigé pour les utilisateur·rices, présenté au bon moment et consultable à tout moment.

## Clarifications

### Session 2026-09-26

- Q: Comment identifier une « version » annoncée, sachant que chaque merge sur main déclenche un déploiement ? → A: Numéro de version sémantique incrémenté à la main à chaque release annoncée, en même temps que son entrée de changelog ; un déploiement sans nouvelle entrée n'annonce rien. Règle à inscrire dans la constitution (Workflow de développement).
- Q: La dernière version vue est-elle mémorisée par appareil ou par compte ? → A: Par appareil (stockage local), sans synchronisation serveur ni entre appareils.
- Q: Une version ne contenant que des Corrections déclenche-t-elle le résumé automatique ? → A: Non ; seules les Nouveautés et Améliorations le déclenchent. Les Corrections restent listées dans l'historique.
- Q: (design, impeccable shape) Comment le résumé présente-t-il les Corrections ? → A: Résumées par leur nombre sur une ligne ; listées en entier dans l'historique.
- Q: L'indicateur « non lu » apparaît-il aussi sur l'onglet Profil de la barre de navigation du bas ? → A: Oui ; pastille sur l'onglet Profil et indicateur sur l'entrée « Nouveautés », les deux disparaissent à l'ouverture de l'historique.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Découvrir les nouveautés juste après une mise à jour (Priority: P1)

Un·e membre utilise FairCount sur son téléphone. Le toast de mise à jour apparaît, iel appuie
sur « Actualiser ». L'application se recharge et affiche une fois un résumé « Quoi de neuf »
des nouveautés de la version qu'iel vient de recevoir. Iel le parcourt en quelques secondes,
le ferme, et reprend ce qu'iel faisait.

**Why this priority**: c'est le moment où l'attention est disponible et où l'information a le
plus de valeur. Sans ça, le changelog n'existe que pour les personnes qui vont le chercher.

**Independent Test**: publier une version avec au moins une nouveauté, déclencher la mise à
jour depuis une version antérieure, vérifier que le résumé s'affiche une seule fois après le
rechargement et qu'il ne réapparaît plus ensuite.

**Acceptance Scenarios**:

1. **Given** un·e utilisateur·rice sur la version N et une version N+1 avec des nouveautés publiée, **When** iel actualise via le toast, **Then** le résumé des nouveautés de N+1 s'affiche après le rechargement.
2. **Given** le résumé de N+1 affiché, **When** iel le ferme, **Then** il ne s'affiche plus aux ouvertures suivantes de l'application sur cet appareil.
3. **Given** un·e utilisateur·rice passé·e de la version N à N+3 (versions intermédiaires jamais ouvertes), **When** l'application se recharge sur N+3, **Then** le résumé regroupe les nouveautés de N+1, N+2 et N+3, de la plus récente à la plus ancienne.
4. **Given** une version N+1 dont les changements sont uniquement des Corrections, **When** la mise à jour s'applique, **Then** aucun résumé ne s'affiche, et ces Corrections apparaissent dans l'historique.
5. **Given** un passage de N à N+2 où N+1 ne contient que des Corrections et N+2 une Nouveauté, **When** l'application se recharge sur N+2, **Then** le résumé s'affiche avec la Nouveauté de N+2 et mentionne le nombre de Corrections de N+1, listées en entier dans l'historique.
6. **Given** une personne qui ouvre l'application pour la première fois sur un appareil, **When** l'application se charge, **Then** aucun résumé ne s'affiche (rien n'est « nouveau » pour elle).

---

### User Story 2 - Consulter l'historique des nouveautés à tout moment (Priority: P2)

Un·e membre a fermé le résumé trop vite, ou veut savoir depuis quand une fonctionnalité existe.
Depuis son profil, iel ouvre « Nouveautés » et voit l'historique complet des versions, chacune
avec sa date et ses changements.

**Why this priority**: complète le P1 et rend l'information retrouvable, mais n'a pas de valeur
de découverte à lui seul.

**Independent Test**: depuis la page profil, ouvrir « Nouveautés » et vérifier que toutes les
versions publiées avec des nouveautés apparaissent, de la plus récente à la plus ancienne.

**Acceptance Scenarios**:

1. **Given** un·e utilisateur·rice connecté·e, **When** iel ouvre « Nouveautés » depuis son profil, **Then** iel voit la liste des versions (numéro, date de publication, liste des changements), la plus récente en haut.
2. **Given** l'historique affiché, **When** iel le consulte, **Then** la version actuellement utilisée est identifiable.
3. **Given** l'historique affiché, **When** iel le ferme ou revient en arrière, **Then** iel revient à l'écran d'où iel l'a ouvert.

---

### User Story 3 - Savoir d'un coup d'œil qu'il y a du nouveau (Priority: P3)

Un·e membre a fermé le résumé sans le lire. Une pastille discrète sur l'onglet Profil de la
barre de navigation, puis un indicateur sur l'entrée « Nouveautés »,
signale qu'il reste des nouveautés non consultées, jusqu'à ce qu'iel ouvre l'historique.

**Why this priority**: amélioration de confort ; le P1 et le P2 couvrent déjà l'essentiel.

**Independent Test**: après une mise à jour, fermer le résumé immédiatement, vérifier la présence
de l'indicateur, ouvrir l'historique, vérifier sa disparition.

**Acceptance Scenarios**:

1. **Given** une mise à jour avec nouveautés dont le résumé a été fermé, **When** iel regarde la barre de navigation, **Then** l'onglet Profil porte une pastille « non lu ».
2. **Given** la pastille visible, **When** iel ouvre son profil, **Then** l'entrée « Nouveautés » porte un indicateur « non lu ».
3. **Given** les indicateurs visibles, **When** iel ouvre l'historique, **Then** la pastille de l'onglet Profil et l'indicateur de l'entrée disparaissent tous les deux.

---

### Edge Cases

- **Actualisation hors toast** (fermeture/réouverture de l'app, rechargement manuel) : le résumé s'affiche quand même au premier chargement de la nouvelle version, quel que soit le déclencheur.
- **Résumé et toast simultanés** : si une nouvelle version arrive alors que le résumé est ouvert, le toast reste visible et utilisable ; les deux ne se masquent pas.
- **Utilisateur·rice non connecté·e** (landing, login, invitation) : le résumé n'interrompt pas ces parcours ; il est différé au premier écran authentifié.
- **Arrivée par lien d'invitation** juste après une mise à jour : le parcours d'invitation est prioritaire ; le résumé s'affiche ensuite.
- **Retour à une version antérieure** (rollback) : aucun résumé ne s'affiche ; la version vue de référence n'est pas abaissée.
- **Historique très long** : la lecture reste confortable sur mobile (les versions anciennes restent accessibles sans rendre l'écran illisible).
- **Hors ligne** : le résumé et l'historique restent consultables, puisqu'ils font partie de la version installée.
- **Stockage local effacé ou indisponible** (navigation privée) : traité comme une première ouverture, donc aucun résumé automatique ; l'historique reste accessible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST conserver le toast de mise à jour existant et son action « Actualiser » sans changer son comportement.
- **FR-002**: Le système MUST embarquer, avec chaque version publiée, le changelog complet destiné aux utilisateur·rices : pour chaque version, son numéro (semver), sa date de publication et une liste de changements.
- **FR-002a**: Le numéro de version de l'application et la version la plus récente du changelog MUST être identiques ; une incohérence entre les deux MUST être détectée avant le déploiement.
- **FR-002b**: Un déploiement qui ne change pas le numéro de version MUST NOT déclencher de résumé automatique.
- **FR-003**: Chaque changement MUST être rédigé en français, en langage non technique et en écriture inclusive, et classé dans une catégorie : « Nouveauté », « Amélioration » ou « Correction ».
- **FR-004**: Le système MUST mémoriser, par appareil et sans aucun appel au serveur, la dernière version dont les nouveautés ont été présentées.
- **FR-005**: Au premier chargement d'une version plus récente que la version mémorisée, le système MUST afficher automatiquement un résumé des changements de toutes les versions intermédiaires, de la plus récente à la plus ancienne.
- **FR-006**: Le système MUST NOT afficher le résumé automatique à la première ouverture sur un appareil (aucune version mémorisée), ni quand les versions concernées ne contiennent aucune Nouveauté ni Amélioration (changelog vide ou Corrections uniquement) ; dans ces deux cas, la version courante devient la version mémorisée. À la première ouverture sur un appareil, elle devient aussi la dernière version consultée (aucun indicateur « non lu »).
- **FR-006a**: Quand le résumé s'affiche, il MUST lister en entier les Nouveautés et Améliorations des versions concernées, et résumer leurs Corrections par leur nombre (« Plus 3 corrections. ») ; l'historique liste toutes les Corrections.
- **FR-007**: La fermeture du résumé MUST mettre à jour la version mémorisée, pour qu'il ne réapparaisse pas.
- **FR-008**: Le résumé automatique MUST s'afficher uniquement sur un écran authentifié et ne jamais interrompre la connexion, la landing ou l'acceptation d'une invitation.
- **FR-009**: Le résumé MUST pouvoir se fermer en une action, et proposer un accès à l'historique complet.
- **FR-010**: Les utilisateur·rices MUST pouvoir ouvrir l'historique complet « Nouveautés » depuis leur page profil, à tout moment.
- **FR-011**: L'historique MUST lister toutes les versions ayant des changements destinés aux utilisateur·rices, de la plus récente à la plus ancienne, et identifier la version en cours d'utilisation.
- **FR-012**: Le système MUST afficher un indicateur « non lu » sur l'onglet Profil de la barre de navigation et sur l'entrée « Nouveautés » tant que l'historique n'a pas été ouvert depuis la dernière mise à jour contenant au moins une Nouveauté ou Amélioration.
- **FR-013**: Le résumé et l'historique MUST être consultables hors ligne.
- **FR-014**: Le résumé et l'historique MUST respecter WCAG 2.1 AA : navigation clavier, focus géré à l'ouverture et à la fermeture, annonce aux lecteurs d'écran, contraste en mode clair et sombre.
- **FR-015**: La version courante de l'application MUST être visible dans l'historique (utile pour le support).

### Key Entities

- **Version publiée**: une release de l'application. Attributs : numéro de version, date de publication, liste ordonnée de changements (éventuellement vide).
- **Changement**: une entrée du changelog. Attributs : catégorie (Nouveauté / Amélioration / Correction), texte court destiné aux utilisateur·rices.
- **Dernière version vue**: état local à l'appareil ; numéro de la dernière version dont le résumé a été présenté. Sert au résumé automatique (FR-005, FR-007).
- **Dernière version consultée**: état local à l'appareil ; numéro de la version la plus récente au moment de la dernière ouverture de l'historique. Sert à l'indicateur « non lu » (FR-012) : fermer le résumé ne le met pas à jour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des utilisateur·rices qui passent à une version avec nouveautés voient le résumé exactement une fois par appareil.
- **SC-002**: Le résumé se lit et se ferme en moins de 15 secondes pour une version de 5 changements ou moins.
- **SC-003**: L'historique complet est accessible en 2 interactions maximum depuis n'importe quel écran authentifié.
- **SC-004**: Aucun résumé automatique ne s'affiche à la première ouverture ni pour une version sans Nouveauté ni Amélioration (0 faux positif en recette).
- **SC-005**: Le résumé et l'historique n'ajoutent aucun délai perceptible au chargement des écrans existants.
- **SC-006**: Moins d'une question « c'est quoi ce nouveau truc ? » par nouvelle fonctionnalité dans les retours des testeur·ses (qualitatif).

## Assumptions

- **Source du contenu** : le changelog est rédigé à la main pour chaque release (texte orienté utilisateur·rice), et non généré depuis les messages de commit, jugés trop techniques. Une version peut avoir un changelog vide.
- **Numéro de version** : semver incrémenté à la main à chaque release annoncée, en même temps que son entrée de changelog. Tous les merges sur main déploient, mais seuls ceux qui changent la version annoncent quelque chose. La version est aujourd'hui figée à 0.1.0 : il faut adopter cette pratique, et l'inscrire dans la constitution (section Workflow de développement, bump MINOR via `/speckit-constitution`).
- **Mémorisation par appareil** : la dernière version vue est stockée localement, sans synchronisation serveur ni entre appareils. Une même personne sur deux appareils peut donc voir le résumé deux fois, ce qui est acceptable.
- **Pas de contenu riche en v1** : texte seul (pas d'images ni de vidéos, pas de liens profonds vers les fonctionnalités).
- **Pas de ciblage** : tou·tes les utilisateur·rices voient le même changelog, sans segmentation par groupe ou par rôle (cohérent avec le modèle horizontal sans admin).
- **Premier contenu** : le premier changelog publié contient la 0.2.0 (compte commun, rétroactivement, et page Nouveautés) et la 0.1.0 (« Première version »). Aucune règle de lancement : les personnes déjà inscrites n'ont pas de résumé automatique pour la 0.2.0 (première ouverture sur leur appareil) et découvrent l'historique via le profil.
- **Design** : l'interface (forme du résumé, de l'historique, de l'indicateur) est conçue pendant la phase de design avec le skill impeccable, en s'appuyant sur DESIGN.md et PRODUCT.md. Cette spec ne fixe que les comportements ; les choix de forme sont consignés dans [design-brief.md](./design-brief.md).
- **Dépendances** : le mécanisme de mise à jour existant (toast + actualisation) et la page profil existante.
