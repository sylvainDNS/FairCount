# Feature: Remboursements (`settlements`)

## Description

Les remboursements permettent d'équilibrer les soldes entre les personnes du groupe. Un remboursement est une transaction distincte d'une dépense, avec un modèle de données dédié.

**Avantage du modèle séparé** : Un remboursement ne peut concerner qu'une seule personne destinataire, ce qui est garanti par le typage.

## User Stories

### US-SET-01: Voir les remboursements suggérés
**En tant que** membre d'un groupe
**Je veux** voir les remboursements optimaux à effectuer
**Afin de** savoir combien et à qui rembourser

#### Critères d'acceptation
- [ ] Liste des remboursements suggérés (optimisés pour minimiser les transactions)
- [ ] Pour chaque suggestion : de qui, à qui, combien
- [ ] Mise en évidence de mes propres remboursements à faire
- [ ] Bouton pour enregistrer un remboursement

### US-SET-02: Enregistrer un remboursement
**En tant que** personne avec un solde négatif
**Je veux** enregistrer un remboursement effectué
**Afin de** mettre à jour les soldes

#### Critères d'acceptation
- [ ] Formulaire pré-rempli avec le montant suggéré
- [ ] Possibilité de modifier le montant (remboursement partiel)
- [ ] Sélection de la personne destinataire (une seule)
- [ ] Mise à jour immédiate des soldes

### US-SET-03: Voir l'historique des remboursements
**En tant que** membre d'un groupe
**Je veux** voir l'historique des remboursements
**Afin de** garder une trace des transactions

#### Critères d'acceptation
- [ ] Liste chronologique des remboursements
- [ ] Filtres : tous, envoyés par moi, reçus par moi
- [ ] Affichage : date, montant, de qui, à qui

---

## Spécifications Techniques

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/groups/:id/settlements` | Historique des remboursements |
| GET | `/api/groups/:id/settlements/suggested` | Remboursements suggérés |
| POST | `/api/groups/:id/settlements` | Enregistrer un remboursement |
| DELETE | `/api/groups/:id/settlements/:settlementId` | Annuler un remboursement |

### Schéma de données

```typescript
interface Settlement {
  readonly id: string;
  readonly groupId: string;
  readonly fromMember: string;  // Qui rembourse (memberId)
  readonly toMember: string;    // Qui reçoit (memberId) - toujours une seule personne
  readonly amount: number;      // Montant en centimes (toujours positif)
  readonly date: Date;
  readonly createdAt: Date;
}

interface SuggestedSettlement {
  readonly fromMember: GroupMember;
  readonly toMember: GroupMember;
  readonly amount: number;
}
```

### Avantages du Modèle Séparé

| Aspect | Modèle séparé | Dépense négative |
|--------|---------------|------------------|
| **Contrainte "une seule personne"** | Garantie par le type | À valider manuellement |
| **Montant** | Toujours positif | Négatif (risque de confusion) |
| **Requêtes** | Filtrées par table | Filtrées par condition |
| **Sémantique** | Claire et explicite | Implicite |

### Algorithme d'Optimisation

L'objectif est de minimiser le nombre de transactions tout en équilibrant tous les soldes. L'algorithme sépare les créditeurs (solde > 0) et débiteurs (solde < 0), triés par montant décroissant, puis apparie itérativement le plus gros débiteur avec le plus gros créditeur.

### Exemple d'optimisation

**Soldes :**
- Alex : +100€ (créditeur)
- Sam : +50€ (créditeur)
- Charlie : -80€ (débiteur)
- Jordan : -70€ (débiteur)

**Remboursements suggérés (3 transactions au lieu de 4) :**
1. Charlie → Alex : 80€
2. Jordan → Alex : 20€
3. Jordan → Sam : 50€

---

## Composants UI

### `SettlementSuggestions`
- Liste des remboursements suggérés
- Carte pour chaque remboursement avec avatars
- Bouton "Enregistrer" pour chaque suggestion
- Message si aucun remboursement nécessaire

### `SettlementCard`
- Avatars des deux personnes avec flèche directionnelle
- Montant
- Bouton d'action si je suis la personne qui doit payer

### `SettlementForm`
- Montant pré-rempli (modifiable pour remboursement partiel)
- Personne destinataire (sélection unique)
- Bouton de validation
- Aperçu de l'impact sur les soldes

### `SettlementHistory`
- Liste chronologique
- Filtres : tous / envoyés / reçus
- Affichage clair de la direction (de → à)

---

## Workflow

```
┌─────────────────┐
│  Solde négatif  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Voir suggestions│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Effectuer le    │
│ paiement réel   │
│ (hors app)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enregistrer le  │
│ remboursement   │
│ (dans l'app)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Soldes mis à    │
│ jour            │
└─────────────────┘
```

Pas de confirmation nécessaire : la confiance entre membres du groupe est présumée.

---

## Intégration avec les Soldes

Le calcul des soldes prend en compte les remboursements : pour chaque personne, les montants envoyés et reçus via les remboursements sont appliqués au solde brut (payé - dû) pour obtenir le solde net.
