# FairCount - Tâches de Développement

## Vue d'ensemble

Ce document liste toutes les tâches de développement pour le MVP de FairCount, organisées par phases et features.

**Légende :**
- `[INFRA]` Infrastructure / Configuration
- `[API]` Backend / Endpoints
- `[UI]` Composants Frontend
- `[HOOK]` Hooks React
- `[DB]` Base de données

---

## Phase 0 : Setup Projet

### 0.1 [INFRA] Initialiser le projet

**Fichiers concernés :**
- `package.json` (création)
- `pnpm-workspace.yaml` (création)
- `tsconfig.json` (création)
- `biome.json` (création)
- `tailwind.config.ts` (création)
- `vite.config.ts` (création)

**Description :**
Initialiser le monorepo avec pnpm, configurer TypeScript, Biome, Tailwind et Vite.

**Critères de validation :**
- [x] `pnpm install` fonctionne
- [x] `pnpm dev` lance le serveur de développement
- [x] Biome lint et format fonctionnent
- [x] Tailwind compile les styles

---

### 0.2 [INFRA] Configurer Cloudflare

**Fichiers concernés :**
- `wrangler.toml` (création)
- `.dev.vars` (création)

**Description :**
Configurer Wrangler pour Cloudflare Workers, Pages, D1 et R2.

**Critères de validation :**
- [x] `wrangler dev` fonctionne
- [x] Connexion à D1 locale établie
- [x] Variables d'environnement configurées

---

### 0.3 [DB] Créer le schéma de base de données

**Fichiers concernés :**
- `src/db/schema/users.ts` (création)
- `src/db/schema/groups.ts` (création)
- `src/db/schema/members.ts` (création)
- `src/db/schema/expenses.ts` (création)
- `src/db/schema/settlements.ts` (création)
- `src/db/schema/index.ts` (création)
- `drizzle.config.ts` (création)

**Description :**
Définir le schéma Drizzle ORM pour toutes les tables : users, groups, group_members, expenses, expense_participants, settlements.

**Critères de validation :**
- [x] Schéma TypeScript complet
- [x] Relations définies correctement
- [x] Migration générée et appliquée sur D1

---

### 0.4 [INFRA] Configurer le routing et layouts

**Fichiers concernés :**
- `src/App.tsx` (création)
- `src/routes/index.tsx` (création)
- `src/shared/components/Layout.tsx` (création)
- `src/shared/components/BottomNav.tsx` (création)

**Description :**
Mettre en place le routing (React Router ou TanStack Router) et les layouts principaux mobile-first.

**Critères de validation :**
- [x] Navigation entre pages fonctionne
- [x] Layout mobile avec navigation bottom
- [x] Layout desktop responsive

---

## Phase 1 : Authentification (`auth`)

### 1.1 [API] Configurer better-auth

**Fichiers concernés :**
- `src/workers/api/auth.ts` (création)
- `src/lib/auth.ts` (création)

**Description :**
Configurer better-auth avec le provider magic link et l'envoi d'emails via Proton Mail SMTP.

**Critères de validation :**
- [x] Configuration better-auth complète
- [x] Envoi d'email magic link fonctionne
- [x] Session créée après vérification du token

---

### 1.2 [API] Endpoints authentification

**Fichiers concernés :**
- `src/workers/api/routes/auth.ts` (création)
- `src/features/auth/api/index.ts` (création)

**Description :**
Implémenter les endpoints : POST `/api/auth/magic-link`, GET `/api/auth/verify`, POST `/api/auth/logout`, GET `/api/auth/me`, PATCH `/api/auth/profile`.

**Critères de validation :**
- [x] Magic link envoyé par email
- [x] Token vérifié et session créée
- [x] Déconnexion supprime la session
- [x] Profil récupéré et modifiable

---

### 1.3 [HOOK] Hook useAuth

**Fichiers concernés :**
- `src/features/auth/hooks/useAuth.ts` (création)
- `src/features/auth/types.ts` (création)

**Description :**
Créer le hook useAuth pour gérer l'état d'authentification : user, isLoading, isAuthenticated, login, logout, updateProfile.

**Critères de validation :**
- [x] État utilisateur synchronisé
- [x] Fonctions login/logout fonctionnelles
- [x] Mise à jour du profil

---

### 1.4 [UI] Composant LoginForm

**Fichiers concernés :**
- `src/features/auth/components/LoginForm.tsx` (création)

**Description :**
Formulaire de connexion avec champ email, validation, état de chargement et messages de succès/erreur.

**Critères de validation :**
- [x] Validation email côté client
- [x] État de chargement pendant l'envoi
- [x] Message de confirmation après envoi
- [x] Gestion des erreurs

---

### 1.5 [UI] Composant AuthLayout

**Fichiers concernés :**
- `src/features/auth/components/AuthLayout.tsx` (création)

**Description :**
Layout centré pour les pages d'authentification avec logo FairCount.

**Critères de validation :**
- [x] Layout centré responsive
- [x] Logo affiché
- [x] Fond sobre

---

### 1.6 [UI] Page de profil

**Fichiers concernés :**
- `src/features/auth/components/ProfilePage.tsx` (création)

**Description :**
Page de profil permettant de modifier le nom, afficher l'email (lecture seule) et se déconnecter.

**Critères de validation :**
- [x] Nom modifiable
- [x] Email affiché en lecture seule
- [x] Bouton de déconnexion

---

## Phase 2 : Groupes (`groups`)

### 2.1 [API] Endpoints groupes

**Fichiers concernés :**
- `src/workers/api/routes/groups.ts` (création)
- `src/features/groups/api/index.ts` (création)

**Description :**
Implémenter les endpoints : GET/POST `/api/groups`, GET/PATCH/DELETE `/api/groups/:id`, POST `/api/groups/:id/archive`, POST `/api/groups/:id/leave`.

**Critères de validation :**
- [x] CRUD groupes fonctionnel
- [x] Archivage/désarchivage
- [x] Quitter un groupe

---

### 2.2 [API] Endpoints invitations

**Fichiers concernés :**
- `src/workers/api/routes/invitations.ts` (création)
- `src/features/groups/api/invitations.ts` (création)

**Description :**
Implémenter les endpoints d'invitation : POST `/api/groups/:id/invite`, GET `/api/groups/:id/invitations`, DELETE/POST resend, GET/POST `/api/invitations/:token`.

**Critères de validation :**
- [x] Envoi d'invitation par email
- [x] Liste des invitations en attente
- [x] Acceptation d'invitation
- [x] Annulation/renvoi d'invitation

---

### 2.3 [HOOK] Hook useGroups

**Fichiers concernés :**
- `src/features/groups/hooks/useGroups.ts` (création)
- `src/features/groups/types.ts` (création)

**Description :**
Hook pour lister les groupes de l'utilisateur et créer un nouveau groupe.

**Critères de validation :**
- [x] Liste des groupes chargée
- [x] Création de groupe fonctionnelle
- [x] Rafraîchissement après mutation

---

### 2.4 [HOOK] Hook useGroup

**Fichiers concernés :**
- `src/features/groups/hooks/useGroup.ts` (création)

**Description :**
Hook pour un groupe spécifique : détails, membres, modification, archivage, quitter.

**Critères de validation :**
- [x] Détails du groupe chargés
- [x] Liste des membres incluse
- [x] Mutations fonctionnelles

---

### 2.5 [HOOK] Hooks invitations

**Fichiers concernés :**
- `src/features/groups/hooks/useInvitations.ts` (création)
- `src/features/groups/hooks/useAcceptInvitation.ts` (création)

**Description :**
Hooks pour gérer les invitations : envoyer, lister, annuler, renvoyer, accepter.

**Critères de validation :**
- [x] Envoi d'invitation
- [x] Liste des invitations en attente
- [x] Acceptation d'invitation

---

### 2.6 [UI] Composant GroupList

**Fichiers concernés :**
- `src/features/groups/components/GroupList.tsx` (création)
- `src/features/groups/components/GroupCard.tsx` (création)

**Description :**
Liste des groupes avec cards affichant nom, nombre de membres, solde personnel et dernière activité.

**Critères de validation :**
- [x] Affichage des groupes
- [x] Badge pour groupes archivés
- [x] Solde coloré (vert/rouge)

---

### 2.7 [UI] Composant CreateGroupForm

**Fichiers concernés :**
- `src/features/groups/components/CreateGroupForm.tsx` (création)

**Description :**
Formulaire de création de groupe : nom (obligatoire), description (optionnel), devise.

**Critères de validation :**
- [x] Validation des champs
- [x] Sélecteur de devise
- [x] Redirection après création

---

### 2.8 [UI] Composants invitations

**Fichiers concernés :**
- `src/features/groups/components/InviteForm.tsx` (création)
- `src/features/groups/components/PendingInvitations.tsx` (création)
- `src/features/groups/components/InvitePage.tsx` (création)

**Description :**
Composants pour inviter des personnes, voir les invitations en attente, et page d'acceptation.

**Critères de validation :**
- [x] Formulaire d'invitation par email
- [x] Liste des invitations avec actions
- [x] Page d'acceptation fonctionnelle

---

### 2.9 [UI] Composant GroupSettings

**Fichiers concernés :**
- `src/features/groups/components/GroupSettings.tsx` (création)

**Description :**
Page de paramètres du groupe : modification nom/description, archivage, zone danger (quitter/supprimer).

**Critères de validation :**
- [x] Modification des infos
- [x] Archivage/désarchivage
- [x] Quitter le groupe avec confirmation

---

## Phase 3 : Membres (`members`)

### 3.1 [API] Endpoints membres

**Fichiers concernés :**
- `src/workers/api/routes/members.ts` (création)
- `src/features/members/api/index.ts` (création)

**Description :**
Implémenter les endpoints : GET/POST `/api/groups/:id/members`, GET/PATCH/DELETE `/api/groups/:id/members/:memberId`, PATCH `/api/groups/:id/members/me`.

**Critères de validation :**
- [x] Liste des membres
- [x] Ajout de membre non inscrit
- [x] Modification des revenus
- [x] Retrait de membre

---

### 3.2 [HOOK] Hook useMembers

**Fichiers concernés :**
- `src/features/members/hooks/useMembers.ts` (création)
- `src/features/members/types.ts` (création)

**Description :**
Hook pour gérer les membres : liste, ajout, suppression.

**Critères de validation :**
- [x] Liste des membres avec coefficients
- [x] Ajout de membre
- [x] Suppression de membre

---

### 3.3 [HOOK] Hook useMyMembership

**Fichiers concernés :**
- `src/features/members/hooks/useMyMembership.ts` (création)

**Description :**
Hook pour gérer son propre membership : revenus, coefficient.

**Critères de validation :**
- [x] Récupération de mon membership
- [x] Mise à jour des revenus

---

### 3.4 [UI] Composant MemberList

**Fichiers concernés :**
- `src/features/members/components/MemberList.tsx` (création)
- `src/features/members/components/MemberCard.tsx` (création)

**Description :**
Liste des membres avec avatar, nom, revenu, coefficient et menu d'actions.

**Critères de validation :**
- [x] Affichage des membres
- [x] Badge "non inscrit·e"
- [x] Menu d'actions contextuel

---

### 3.5 [UI] Composant IncomeForm

**Fichiers concernés :**
- `src/features/members/components/IncomeForm.tsx` (création)

**Description :**
Formulaire pour renseigner ses revenus avec explication de la transparence et aperçu du coefficient.

**Critères de validation :**
- [x] Saisie du revenu
- [x] Aperçu du coefficient calculé
- [x] Explication de la transparence

---

### 3.6 [UI] Composant AddMemberForm

**Fichiers concernés :**
- `src/features/members/components/AddMemberForm.tsx` (création)

**Description :**
Formulaire pour ajouter une personne non inscrite : nom, email optionnel, revenu.

**Critères de validation :**
- [x] Validation des champs
- [x] Option d'envoi d'invitation
- [x] Ajout du membre

---

## Phase 4 : Dépenses (`expenses`)

### 4.1 [API] Endpoints dépenses

**Fichiers concernés :**
- `src/workers/api/routes/expenses.ts` (création)
- `src/features/expenses/api/index.ts` (création)

**Description :**
Implémenter les endpoints : GET/POST `/api/groups/:id/expenses`, GET/PATCH/DELETE `/api/groups/:id/expenses/:expenseId`.

**Critères de validation :**
- [x] CRUD dépenses
- [x] Soft delete
- [x] Gestion des participants

---

### 4.2 [HOOK] Hook useExpenses

**Fichiers concernés :**
- `src/features/expenses/hooks/useExpenses.ts` (création)
- `src/features/expenses/types.ts` (création)

**Description :**
Hook pour lister les dépenses avec filtres, pagination et recherche.

**Critères de validation :**
- [x] Liste paginée
- [x] Filtres par période/personne
- [x] Recherche par description

---

### 4.3 [HOOK] Hook useExpense

**Fichiers concernés :**
- `src/features/expenses/hooks/useExpense.ts` (création)

**Description :**
Hook pour une dépense spécifique : détails, création, modification, suppression.

**Critères de validation :**
- [x] Détails avec répartition
- [x] Mutations fonctionnelles

---

### 4.4 [UI] Composant ExpenseList

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseList.tsx` (création)
- `src/features/expenses/components/ExpenseCard.tsx` (création)

**Description :**
Liste scrollable des dépenses avec pull-to-refresh et pagination infinie.

**Critères de validation :**
- [x] Affichage des dépenses
- [x] Ma part mise en évidence
- [x] Chargement infini

---

### 4.5 [UI] Composant ExpenseForm

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseForm.tsx` (création)

**Description :**
Formulaire d'ajout/modification de dépense : montant, description, date, payeur, participants.

**Critères de validation :**
- [x] Validation des champs
- [x] Sélection des participants
- [x] Mode montants personnalisés

---

### 4.6 [UI] Composant ExpenseDetail

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseDetail.tsx` (création)

**Description :**
Détail d'une dépense avec tableau de répartition et actions modifier/supprimer.

**Critères de validation :**
- [x] Toutes les informations affichées
- [x] Tableau de répartition
- [x] Actions contextuelles

---

### 4.7 [UI] Composant ExpenseFilters

**Fichiers concernés :**
- `src/features/expenses/components/ExpenseFilters.tsx` (création)

**Description :**
Filtres pour les dépenses : période, personne, recherche.

**Critères de validation :**
- [x] Filtre par période
- [x] Filtre par personne
- [x] Recherche par description

---

## Phase 5 : Soldes (`balances`)

### 5.1 [API] Endpoints soldes

**Fichiers concernés :**
- `src/workers/api/routes/balances.ts` (création)
- `src/features/balances/api/index.ts` (création)

**Description :**
Implémenter les endpoints : GET `/api/groups/:id/balances`, GET `/api/groups/:id/balances/me`, GET `/api/groups/:id/stats`.

**Critères de validation :**
- [x]Calcul des soldes correct
- [x]Détail du solde personnel
- [x]Statistiques du groupe

---

### 5.2 [HOOK] Hook useBalances

**Fichiers concernés :**
- `src/features/balances/hooks/useBalances.ts` (création)
- `src/features/balances/types.ts` (création)

**Description :**
Hook pour les soldes du groupe avec vérification d'intégrité.

**Critères de validation :**
- [x]Liste des soldes
- [x]Mon solde mis en évidence
- [x]Vérification somme = 0

---

### 5.3 [HOOK] Hooks détail et stats

**Fichiers concernés :**
- `src/features/balances/hooks/useBalanceDetail.ts` (création)
- `src/features/balances/hooks/useGroupStats.ts` (création)

**Description :**
Hooks pour le détail du solde personnel et les statistiques du groupe.

**Critères de validation :**
- [x]Décomposition du solde
- [x]Statistiques par période

---

### 5.4 [UI] Composant BalanceSummary

**Fichiers concernés :**
- `src/features/balances/components/BalanceSummary.tsx` (création)

**Description :**
Affichage du solde personnel en grand avec couleur et message contextuel.

**Critères de validation :**
- [x]Solde coloré (vert/rouge/gris)
- [x]Message contextuel
- [x]Action rapide

---

### 5.5 [UI] Composant BalanceList

**Fichiers concernés :**
- `src/features/balances/components/BalanceList.tsx` (création)

**Description :**
Liste de tous les soldes du groupe avec indicateurs visuels.

**Critères de validation :**
- [x]Tous les soldes affichés
- [x]Tri par montant
- [x]Total des dépenses

---

### 5.6 [UI] Composant BalanceDetail

**Fichiers concernés :**
- `src/features/balances/components/BalanceDetail.tsx` (création)

**Description :**
Décomposition du solde : ce que j'ai payé, ce que je dois, remboursements.

**Critères de validation :**
- [x]Sections distinctes
- [x]Liste des dépenses concernées
- [x]Historique des remboursements

---

## Phase 6 : Remboursements (`settlements`)

### 6.1 [API] Endpoints remboursements

**Fichiers concernés :**
- `src/workers/api/routes/settlements.ts` (création)
- `src/features/settlements/api/index.ts` (création)

**Description :**
Implémenter les endpoints : GET `/api/groups/:id/settlements`, GET `/api/groups/:id/settlements/suggested`, POST/DELETE settlements.

**Critères de validation :**
- [ ] Historique des remboursements
- [ ] Suggestions optimisées
- [ ] Enregistrement/annulation

---

### 6.2 [API] Algorithme d'optimisation

**Fichiers concernés :**
- `src/features/settlements/utils/optimize.ts` (création)

**Description :**
Implémenter l'algorithme glouton pour minimiser le nombre de transactions.

**Critères de validation :**
- [ ] Optimisation fonctionnelle
- [ ] Tests unitaires
- [ ] Gestion des cas limites

---

### 6.3 [HOOK] Hook useSettlements

**Fichiers concernés :**
- `src/features/settlements/hooks/useSettlements.ts` (création)
- `src/features/settlements/types.ts` (création)

**Description :**
Hook pour les remboursements : historique, suggestions, enregistrement.

**Critères de validation :**
- [ ] Liste des remboursements
- [ ] Suggestions calculées
- [ ] Mutations fonctionnelles

---

### 6.4 [UI] Composant SettlementSuggestions

**Fichiers concernés :**
- `src/features/settlements/components/SettlementSuggestions.tsx` (création)
- `src/features/settlements/components/SettlementCard.tsx` (création)

**Description :**
Liste des remboursements suggérés avec boutons d'action.

**Critères de validation :**
- [ ] Suggestions affichées
- [ ] Mes remboursements mis en évidence
- [ ] Bouton enregistrer

---

### 6.5 [UI] Composant SettlementForm

**Fichiers concernés :**
- `src/features/settlements/components/SettlementForm.tsx` (création)

**Description :**
Formulaire d'enregistrement de remboursement : montant, destinataire.

**Critères de validation :**
- [ ] Montant pré-rempli modifiable
- [ ] Sélection unique destinataire
- [ ] Aperçu impact sur soldes

---

### 6.6 [UI] Composant SettlementHistory

**Fichiers concernés :**
- `src/features/settlements/components/SettlementHistory.tsx` (création)

**Description :**
Historique des remboursements avec filtres.

**Critères de validation :**
- [ ] Liste chronologique
- [ ] Filtres envoyés/reçus
- [ ] Direction claire (de → à)

---

## Phase 7 : Finalisation MVP

### 7.1 [UI] Page d'accueil et onboarding

**Fichiers concernés :**
- `src/pages/Home.tsx` (création)
- `src/features/shared/components/Onboarding.tsx` (création)

**Description :**
Page d'accueil pour les personnes non connectées et flow d'onboarding pour les nouveaux utilisateurs.

**Critères de validation :**
- [ ] Landing page attrayante
- [ ] Explication du concept
- [ ] Onboarding guidé

---

### 7.2 [UI] États vides et loading

**Fichiers concernés :**
- `src/shared/components/EmptyState.tsx` (création)
- `src/shared/components/Loading.tsx` (création)
- `src/shared/components/ErrorBoundary.tsx` (création)

**Description :**
Composants réutilisables pour les états vides, chargement et erreurs.

**Critères de validation :**
- [ ] Illustrations pour états vides
- [ ] Skeletons de chargement
- [ ] Gestion des erreurs gracieuse

---

### 7.3 [INFRA] PWA et manifest

**Fichiers concernés :**
- `public/manifest.json` (création)
- `src/sw.ts` (création)

**Description :**
Configurer la PWA : manifest, service worker, icônes.

**Critères de validation :**
- [ ] Installable sur mobile
- [ ] Icônes configurées
- [ ] Cache offline basique

---

### 7.4 [INFRA] Tests et CI

**Fichiers concernés :**
- `vitest.config.ts` (création)
- `.github/workflows/ci.yml` (création)

**Description :**
Configurer Vitest pour les tests unitaires et GitHub Actions pour la CI.

**Critères de validation :**
- [ ] Tests unitaires configurés
- [ ] CI lance les tests
- [ ] Lint et format vérifiés

---

### 7.5 [INFRA] Déploiement Cloudflare

**Fichiers concernés :**
- `.github/workflows/deploy.yml` (création)

**Description :**
Configurer le déploiement automatique sur Cloudflare Pages et Workers.

**Critères de validation :**
- [ ] Déploiement automatique sur main
- [ ] Preview deployments sur PR
- [ ] Variables d'environnement configurées

---

## Résumé des Tâches

| Phase | Nombre de tâches |
|-------|------------------|
| Phase 0 : Setup | 4 |
| Phase 1 : Auth | 6 |
| Phase 2 : Groups | 9 |
| Phase 3 : Members | 6 |
| Phase 4 : Expenses | 7 |
| Phase 5 : Balances | 6 |
| Phase 6 : Settlements | 6 |
| Phase 7 : Finalisation | 5 |
| **Total** | **49** |

---

## Dépendances entre Phases

```
Phase 0 (Setup)
    │
    ▼
Phase 1 (Auth)
    │
    ▼
Phase 2 (Groups) ──────────┐
    │                      │
    ▼                      ▼
Phase 3 (Members)    Phase 4 (Expenses)
    │                      │
    └──────────┬───────────┘
               │
               ▼
         Phase 5 (Balances)
               │
               ▼
         Phase 6 (Settlements)
               │
               ▼
         Phase 7 (Finalisation)
```
