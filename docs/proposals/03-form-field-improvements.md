# Form Field Improvements (Future)

Améliorations identifiées lors de la code review de l'intégration Ark UI Field/Fieldset.

## 1. Extraire un hook `useExpenseForm` et un sous-composant `ParticipantList`

**Fichier** : `src/features/expenses/components/ExpenseForm.tsx` (388 lignes)

Le composant dépasse les 300 lignes recommandées. La logique suivante peut être extraite :

### Hook `useExpenseForm`
- `useForm` + `useFieldArray` setup
- `useEffect` d'initialisation des participants (lignes 67-105)
- Callbacks `handleParticipantToggle` et `handleCustomAmountToggle`
- `onSubmit` avec la transformation create/update

### Sous-composant `ParticipantList`
- Rendu de la liste de checkboxes avec custom amounts (lignes 292-344)
- Props : `fields`, `watchedParticipants`, `isSubmitting`, `register`, `onToggle`, `onCustomAmountToggle`

## 2. Constantes partagées pour les classes de style Field/Fieldset

**Fichiers concernés** : `FormField.tsx`, `CreateGroupForm.tsx`, `ExpenseForm.tsx`, `SettlementForm.tsx`

Les classes suivantes sont dupliquées dans 4+ fichiers :

```
// Label
"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"

// Error text
"mt-1 text-sm text-red-600 dark:text-red-400"

// Required indicator
"text-red-500 dark:text-red-400 ml-0.5"
```

Options :
- **A)** Constantes exportées depuis `src/shared/components/FormField.tsx` (simple)
- **B)** Wrappers stylés `StyledFieldLabel`, `StyledFieldErrorText` (plus structuré)

## 3. Unifier le style d'erreur Select via `data-[invalid]`

**Fichiers** : `src/shared/components/Select.tsx`, `ExpenseForm.tsx`, `SettlementForm.tsx`

Actuellement, le style d'erreur du Select utilise la prop CVA `variant` :
```tsx
<Select variant={errors.paidBy ? 'error' : 'default'} />
```

Comme le Select est wrappé dans `Field.Root invalid={!!errors.paidBy}`, Ark UI propage automatiquement `data-invalid` sur les éléments internes du Select. On pourrait remplacer la prop `variant` par des sélecteurs Tailwind `data-[invalid]` :

```tsx
// Dans selectTriggerVariants, remplacer le variant 'error' par :
'data-[invalid]:border-red-500 data-[invalid]:focus:ring-red-500'
```

Cela supprimerait le besoin de passer `variant` manuellement sur chaque Select en contexte Field.Root.

## 4. Wrapper le textarea Description dans Field.Root

**Fichier** : `src/features/groups/components/CreateGroupForm.tsx` (lignes 73-93)

Le champ Description utilise un `<label>` et un `<p role="alert">` manuels. Même s'il est optionnel (pas d'astérisque), le wrapper `Field.Root` ajouterait :
- `aria-describedby` automatique entre le textarea et son message d'erreur
- Cohérence avec le reste des champs du formulaire
- `Field.ErrorText` avec `aria-live="polite"` au lieu du `role="alert"` actuel
