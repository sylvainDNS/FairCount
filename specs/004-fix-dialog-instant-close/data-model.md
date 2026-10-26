# Data Model: Correction des fenêtres qui se ferment instantanément

Aucun changement de données : ni schéma, ni migration, ni payload d'API. Le correctif est
purement côté interface.

## État UI concerné (existant, inchangé)

Le correctif ne modifie aucun état ; il rappelle seulement les transitions qui ne doivent plus
être interrompues.

| Composant | État | Transition « remplacement » |
|-----------|------|------------------------------|
| `ExpenseList` | `selectedExpense`, `expenseToDelete`, `selectedRecurrenceId` | détail → confirmation ; détail → récurrence |
| `ExpenseDetail` | `showEditForm` | détail → formulaire de modification |
| `RecurrenceDetail` | `showEditForm`, `confirmDelete` | détail → formulaire ; détail → confirmation |

Règle (cf. [contracts/dialog-dismissal.md](./contracts/dialog-dismissal.md)) : une fois la
fenêtre entrante montée, seul un geste explicite de l'utilisateur·rice la ferme.
