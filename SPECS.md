# FairCount - Spécifications Générales

## Vision

**FairCount** est une application web de partage de frais équitable. Contrairement aux applications traditionnelles qui divisent les dépenses de manière égalitaire, FairCount permet à chaque personne de contribuer proportionnellement à ses revenus.

### Public cible

- Couples avec des revenus différents
- Foyers et familles
- Groupes d'ami·e·s
- Colocations
- Tout groupe souhaitant un partage plus juste des dépenses communes

### Philosophie

> "Chacun·e contribue selon ses moyens"

L'équité n'est pas l'égalité. Une personne gagnant 4000€ et une autre gagnant 2000€ ne devraient pas payer la même somme pour des dépenses communes. FairCount calcule automatiquement la contribution de chaque personne en fonction de son coefficient de revenus.

---

## Glossaire

Pour garantir un vocabulaire inclusif et accessible :

| Terme | Définition |
|-------|------------|
| **Personne membre** | Une personne faisant partie d'un groupe |
| **Groupe** | Un ensemble de personnes partageant des frais |
| **Dépense** | Un achat ou paiement effectué pour le groupe |
| **Coefficient** | Le ratio déterminant la part de contribution (basé sur les revenus) |
| **Solde** | La différence entre ce qu'une personne a payé et ce qu'elle devrait |
| **Remboursement** | Un transfert d'argent entre personnes pour équilibrer les soldes |
| **Part équitable** | Le montant que chaque personne devrait payer selon son coefficient |

---

## Fonctionnalités Principales

### 1. Authentification (`auth`)
- Connexion par magic link (lien envoyé par email)
- Pas de mot de passe à retenir
- Session persistante

### 2. Gestion des Groupes (`groups`)
- Création de groupes avec nom et description
- Invitation de personnes par email
- Gestion des personnes membres
- Archivage de groupes

### 3. Gestion des Personnes Membres (`members`)
- Ajout de personnes au groupe
- Définition des revenus (transparence totale)
- Coefficients calculés automatiquement
- Personnes invitées ou non-inscrites

### 4. Gestion des Dépenses (`expenses`)
- Ajout de dépenses avec montant, description, date
- Qui a payé
- Pour qui (tout le groupe ou personnes spécifiques)

### 5. Calcul des Soldes (`balances`)
- Vue en temps réel des soldes de chaque personne
- Historique des contributions
- Graphiques de répartition

### 6. Remboursements (`settlements`)
- Suggestions de remboursements optimisés
- Modèle séparé des dépenses (garantit qu'un remboursement = une seule personne destinataire)
- Pas de confirmation nécessaire (confiance présumée)

### 7. Notifications (`notifications`)
- Notifications push dans le navigateur
- Alertes pour nouvelles dépenses
- Rappels de remboursements

---

## Architecture Technique

### Stack Frontend

| Technologie | Usage |
|-------------|-------|
| **React 18+** | Framework UI |
| **TypeScript** | Typage statique |
| **Tailwind CSS** | Styling utility-first |
| **Ark UI** | Composants accessibles |
| **Biome** | Linting et formatting |

### Stack Backend

| Technologie | Usage |
|-------------|-------|
| **Cloudflare Workers** | Runtime serverless |
| **Cloudflare Pages** | Hébergement frontend |
| **Cloudflare D1** | Base de données SQLite |
| **Cloudflare R2** | Stockage de fichiers (avatars, exports) |
| **Drizzle ORM** | Gestion de la base de données |
| **better-auth** | Authentification magic link |
| **Proton Mail SMTP** | Envoi d'emails |

### Outils de Développement

| Outil | Usage |
|-------|-------|
| **pnpm** | Gestionnaire de paquets |
| **Wrangler** | CLI Cloudflare |
| **Vite** | Build tool |

---

## Architecture Feature-Oriented

```
src/
├── features/
│   ├── auth/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── groups/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── members/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── expenses/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── balances/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   ├── settlements/
│   │   ├── FEATURE.md
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   └── notifications/
│       ├── FEATURE.md
│       ├── components/
│       ├── hooks/
│       ├── api/
│       └── types.ts
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── db/
│   ├── schema/
│   └── migrations/
└── workers/
    └── api/
```

---

## Modèle de Données

### Tables principales

```
users
├── id (uuid)
├── email (unique)
├── name
├── created_at
└── updated_at

groups
├── id (uuid)
├── name
├── description
├── currency (default: EUR)
├── created_by (fk: users)
├── created_at
└── archived_at

group_members
├── id (uuid)
├── group_id (fk: groups)
├── user_id (fk: users, nullable)
├── name (pour personnes non inscrites)
├── email
├── income (visible par tous)
├── coefficient (calculé automatiquement)
├── joined_at
└── left_at

expenses
├── id (uuid)
├── group_id (fk: groups)
├── paid_by (fk: group_members)
├── amount (positif = dépense, négatif = remboursement)
├── description
├── date
├── created_at
├── updated_at
└── deleted_at (soft delete)

expense_participants
├── id (uuid)
├── expense_id (fk: expenses)
├── member_id (fk: group_members)
└── custom_amount (nullable, pour exceptions)

settlements
├── id (uuid)
├── group_id (fk: groups)
├── from_member (fk: group_members)
├── to_member (fk: group_members) -- toujours une seule personne
├── amount (toujours positif)
├── date
└── created_at
```

---

## Calcul de la Part Équitable

### Formule de base

```
Coefficient d'une personne = Revenu de la personne / Somme des revenus du groupe

Part équitable = Montant total × Coefficient
```

### Exemple

Un groupe de 3 personnes :
- Alex : 3000€/mois → coefficient = 3000/6000 = 0.5 (50%)
- Sam : 2000€/mois → coefficient = 2000/6000 = 0.33 (33%)
- Charlie : 1000€/mois → coefficient = 1000/6000 = 0.17 (17%)

Pour une dépense de 120€ :
- Alex devrait payer : 60€
- Sam devrait payer : 40€
- Charlie devrait payer : 20€

### Transparence totale

Tous les revenus sont visibles par les membres du groupe. Les coefficients sont calculés automatiquement. Cette transparence est essentielle pour garantir l'équité et la confiance.

---

## Design Mobile First

L'application est conçue pour une utilisation principalement sur mobile :

- Navigation par onglets en bas d'écran
- Formulaires optimisés pour le tactile
- Mode sombre supporté
- Installation en PWA

### Points de rupture

| Breakpoint | Largeur | Usage |
|------------|---------|-------|
| `sm` | 640px | Téléphones |
| `md` | 768px | Tablettes |
| `lg` | 1024px | Desktop |

---

## Sécurité et Confidentialité

- Les revenus sont chiffrés en base de données
- Option de n'afficher que les coefficients (sans les montants)
- Authentification sans mot de passe (magic link)
- Sessions sécurisées avec expiration
- HTTPS obligatoire
- Conformité RGPD

---

## Accessibilité

L'application respecte les standards WCAG 2.1 niveau AA :

- Navigation au clavier complète
- Composants Ark UI accessibles par défaut
- Contrastes suffisants
- Labels explicites sur tous les champs
- Messages d'erreur descriptifs
- Support des lecteurs d'écran

---

## Internationalisation

Phase initiale : Français uniquement

Préparation pour :
- Anglais
- Formats de devises locaux
- Formats de dates locaux

---

## Roadmap

### v1.0 - MVP ✅
- Authentification magic link
- Création et gestion de groupes (horizontalité, pas d'admin)
- Ajout de personnes membres avec revenus (transparence)
- Ajout de dépenses
- Calcul des soldes (recalcul automatique)
- Remboursements (modèle dédié)

### v1.1 - Améliorations (en cours)
- Notifications push
- Export des données

### v2.0 - Fonctionnalités avancées (planifié)
- Dépenses récurrentes
- Budgets par catégorie
- Statistiques et graphiques
- Multi-devises
