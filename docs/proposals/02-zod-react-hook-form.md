# Implémentation de Zod + React Hook Form pour la gestion des formulaires

## Contexte

### État actuel du codebase

Les formulaires du projet utilisent actuellement une approche manuelle avec `useState` pour chaque champ :

- **6 formulaires identifiés** : `LoginForm`, `CreateGroupForm`, `InviteForm`, `ExpenseForm`, `SettlementForm`, `IncomeForm`
- **Gestion d'état manuelle** : chaque champ a son propre `useState`
- **Validation impérative** : conditions `if/else` dans `handleSubmit`
- **Utilitaires de validation basiques** dans `/src/lib/validation.ts` (regex email, UUID)
- **Composant TextInput** avec support `forwardRef` (compatible React Hook Form)
- **Composants Ark UI** : `Select`, `Checkbox`, `SegmentedControl` utilisés dans plusieurs formulaires (nécessitent `Controller` RHF)
- **Zod déjà installé** en v4 (`^4.3.6`) et utilisé côté backend avec `@hono/zod-validator`

### Patterns d'état actuels (deux variantes)

**Pattern A** — `FormState` enum (LoginForm, InviteForm, CreateGroupForm) :
```typescript
type FormState = 'idle' | 'loading' | 'error' | 'success';
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');
```

**Pattern B** — flags séparés (ExpenseForm, SettlementForm, IncomeForm) :
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

La migration vers RHF unifie ces deux patterns via `formState.isSubmitting` et `formState.errors`.

### Problèmes identifiés

1. **Code répétitif** : chaque formulaire redéfinit son pattern de gestion d'état
2. **Validation fragmentée** : logique dispersée dans les handlers, pas de schéma centralisé
3. **Pas de validation temps réel** : erreurs affichées uniquement au submit
4. **Gestion d'erreurs incohérente** : deux patterns différents (`FormState` vs `isSubmitting`+`error`)
5. **Performance** : re-renders à chaque frappe via `onChange` + `setState`
6. **Maintenabilité** : ajout d'un champ = ajout d'un `useState` + modification du handler

Exemple actuel (`CreateGroupForm.tsx`, 6 hooks d'état) :
```typescript
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [currency, setCurrency] = useState('EUR');
const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('annual');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');
```

### Composants Ark UI dans les formulaires

Plusieurs formulaires utilisent des composants Ark UI qui ne sont pas des `<input>` natifs et ne supportent pas `ref` :

| Composant | Utilisé dans | Interface |
|-----------|-------------|-----------|
| `Select` | CreateGroupForm, ExpenseForm, SettlementForm | `value` + `onValueChange(string)` |
| `Checkbox` | ExpenseForm (participants) | `checked` + `onCheckedChange(boolean)` |
| `SegmentedControl` | CreateGroupForm (incomeFrequency) | `value` + `onValueChange(string)` |

Ces composants nécessitent l'utilisation de **`Controller`** de React Hook Form (au lieu de `register`).

## Objectifs

### Ce que l'amélioration apporte

1. **Schéma de validation déclaratif** : une seule source de vérité avec Zod
2. **Validation temps réel** : feedback utilisateur immédiat (mode `onChange` ou `onBlur`)
3. **Type inference automatique** : types TypeScript générés depuis le schéma Zod
4. **Réduction du boilerplate** : suppression des multiples `useState`
5. **Performance optimisée** : React Hook Form utilise des refs, minimisant les re-renders
6. **Accessibilité améliorée** : intégration native des attributs `aria-invalid`, `aria-describedby`
7. **Unification des patterns** : plus de divergence `FormState` vs `isSubmitting`
8. **Cohérence frontend/backend** : schémas Zod partageables avec les validations backend existantes

### Métriques de succès

- Réduction de 40-60% des lignes de code par formulaire
- Zéro re-render sur frappe (vérifiable via React DevTools)
- Couverture de validation à 100% (champs requis, formats, contraintes)
- Messages d'erreur localisés et cohérents

## Solution proposée

### Librairies choisies

| Librairie | Version | Statut | Justification |
|-----------|---------|--------|---------------|
| `zod` | ^4.3.6 | **Déjà installé** | TypeScript-first, déjà utilisé côté backend |
| `react-hook-form` | ^7.x | À installer | Leader du marché, excellente DX, performance (refs vs state) |
| `@hookform/resolvers` | ^5.x | À installer | Pont entre RHF et Zod, supporte Zod v4 |

> **Note :** `@hookform/resolvers` v5 est nécessaire pour le support de Zod v4. La v3 ne supporte que Zod v3.

### Architecture cible

```
src/
├── lib/
│   └── validation.ts          # Existant - conservé (isValidEmail, isValidUUID)
│   └── schemas/               # NOUVEAU - schémas Zod par domaine
│       ├── auth.schema.ts
│       ├── group.schema.ts
│       ├── expense.schema.ts
│       ├── settlement.schema.ts
│       └── income.schema.ts
├── shared/
│   └── components/
│       ├── TextInput.tsx      # Existant - compatible RHF (forwardRef)
│       ├── Select.tsx         # Existant - Ark UI, nécessite Controller
│       ├── Checkbox.tsx       # Existant - Ark UI, nécessite Controller
│       ├── SegmentedControl.tsx # Existant - Ark UI, nécessite Controller
│       └── FormField.tsx      # NOUVEAU - wrapper label + input + erreur
├── features/
│   └── {feature}/
│       └── components/
│           └── *Form.tsx      # Migration vers RHF + Zod
```

## Plan d'implémentation

### Étape 1 : Installation des dépendances

```bash
pnpm add react-hook-form @hookform/resolvers
```

> `zod` est déjà installé (`^4.3.6`).

### Étape 2 : Création des schémas Zod (nouveaux fichiers)

Les schémas frontend valident les **champs du formulaire** (strings brutes), contrairement aux schémas backend qui valident les **données transformées** envoyées à l'API (nombres en centimes, UUIDs).

**Fichier** : `/src/lib/schemas/auth.schema.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Adresse email requise')
    .email('Adresse email invalide'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

**Fichier** : `/src/lib/schemas/group.schema.ts`

```typescript
import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Nom du groupe requis')
    .max(100, 'Nom trop long (100 caractères max)'),
  description: z
    .string()
    .max(500, 'Description trop longue (500 caractères max)')
    .optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']),
  incomeFrequency: z.enum(['annual', 'monthly']),
});

export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

export const inviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Adresse email requise')
    .email('Adresse email invalide'),
});

export type InviteFormData = z.infer<typeof inviteSchema>;
```

**Fichier** : `/src/lib/schemas/expense.schema.ts`

```typescript
import { z } from 'zod';

const participantSchema = z.object({
  memberId: z.string().uuid(),
  selected: z.boolean(),
  customAmount: z.string().optional(),
  useCustomAmount: z.boolean(),
});

export const expenseSchema = z.object({
  amount: z
    .string()
    .min(1, 'Montant requis')
    .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
      message: 'Veuillez entrer un montant valide',
    }),
  description: z
    .string()
    .min(1, 'Description requise')
    .max(200, 'Description trop longue'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  paidBy: z
    .string()
    .min(1, 'Veuillez sélectionner qui a payé'),
  participants: z
    .array(participantSchema)
    .refine((p) => p.some((x) => x.selected), {
      message: 'Veuillez sélectionner au moins un participant',
    }),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
```

**Fichier** : `/src/lib/schemas/settlement.schema.ts`

```typescript
import { z } from 'zod';

export const settlementSchema = z.object({
  amount: z
    .string()
    .min(1, 'Montant requis')
    .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
      message: 'Veuillez entrer un montant valide',
    }),
  toMember: z
    .string()
    .min(1, 'Veuillez sélectionner un destinataire'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
});

export type SettlementFormData = z.infer<typeof settlementSchema>;
```

**Fichier** : `/src/lib/schemas/income.schema.ts`

```typescript
import { z } from 'zod';

export const incomeSchema = z.object({
  income: z
    .string()
    .min(1, 'Montant requis')
    .refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) >= 0, {
      message: 'Veuillez entrer un montant valide',
    }),
});

export type IncomeFormData = z.infer<typeof incomeSchema>;
```

### Étape 3 : Création du composant FormField (nouveau fichier)

**Fichier** : `/src/shared/components/FormField.tsx`

Ce composant wrape un `TextInput` avec son label et son message d'erreur. Il est compatible `register()` via `forwardRef`.

```typescript
import type { FieldError } from 'react-hook-form';
import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from './TextInput';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: FieldError;
  required?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, required, id, ...props }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${fieldId}-error`;

    return (
      <div>
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && ' *'}
        </label>
        <TextInput
          ref={ref}
          id={fieldId}
          variant={error ? 'error' : 'default'}
          aria-invalid={!!error}
          {...(error ? { 'aria-describedby': errorId } : {})}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
```

> **Note** : `FormField` ne couvre que les `TextInput`. Pour les composants Ark UI (`Select`, `Checkbox`, `SegmentedControl`), on utilise `Controller` directement dans le formulaire, avec le pattern label + erreur inline (comme actuellement).

### Étape 4 : Pattern Controller pour les composants Ark UI

Les composants Ark UI n'exposent pas de `ref` compatible `register()`. On utilise `Controller` de RHF :

```typescript
import { Controller, useForm } from 'react-hook-form';
import { Select } from '@/shared/components/Select';

// Dans un formulaire :
<Controller
  name="currency"
  control={control}
  render={({ field }) => (
    <Select
      items={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
      value={field.value}
      onValueChange={field.onChange}
      disabled={isSubmitting}
      aria-label="Devise du groupe"
    />
  )}
/>
```

Mapping des props Ark UI vers Controller :

| Composant | `field.value` → | `field.onChange` → |
|-----------|----------------|-------------------|
| `Select` | `value` | `onValueChange` |
| `Checkbox` | `checked` | `onCheckedChange` |
| `SegmentedControl` | `value` | `onValueChange` |

### Étape 5 : Migration des formulaires

**Ordre de migration recommandé** (du plus simple au plus complexe) :

| # | Formulaire | Complexité | Spécificités |
|---|-----------|------------|--------------|
| 1 | `LoginForm` | S | 1 champ, `register` uniquement, état `success` avec UI conditionnelle |
| 2 | `InviteForm` | S | 1 champ, `register` uniquement, callback `onSuccess`, état `success` temporaire |
| 3 | `IncomeForm` | S | 1 champ, `register` uniquement, wrappé dans Dialog |
| 4 | `CreateGroupForm` | M | 4 champs, `register` + `Controller` (Select, SegmentedControl) |
| 5 | `SettlementForm` | M | 3 champs, `register` + `Controller` (Select), wrappé dans Dialog, pré-remplissage via `suggestion` |
| 6 | `ExpenseForm` | L | 5 champs + participants dynamiques, `register` + `Controller` (Select, Checkbox), wrappé dans Dialog, mode édition |

## Exemples de code

### Avant : LoginForm.tsx (implémentation actuelle)

```typescript
// 3 hooks useState
const [email, setEmail] = useState('');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState<string>('');

const handleSubmit = useCallback(
  async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setFormState('error');
      setErrorMessage(AUTH_ERROR_MESSAGES.INVALID_EMAIL);
      return;
    }

    setFormState('loading');
    setErrorMessage('');

    const result = await login(email);

    if (result.success) {
      setFormState('success');
    } else {
      setFormState('error');
      setErrorMessage(AUTH_ERROR_MESSAGES[result.error as AuthError] || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  },
  [email, login],
);
```

### Après : LoginForm.tsx (avec Zod + React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERROR_MESSAGES, type AuthError } from '../types';

export const LoginForm = () => {
  const { login } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data.email);

    if (result.success) {
      setShowSuccess(true);
    } else {
      setError('root', {
        message: AUTH_ERROR_MESSAGES[result.error as AuthError] || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
    }
  };

  if (showSuccess) {
    return (
      // ... UI de confirmation email (identique à l'actuelle)
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Adresse email"
        type="email"
        placeholder="vous@exemple.com"
        disabled={isSubmitting}
        error={errors.email}
        {...register('email')}
      />

      {errors.root && (
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isSubmitting}
        loadingText="Envoi en cours..."
      >
        Recevoir le lien de connexion
      </Button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Un lien de connexion vous sera envoyé par email. Aucun mot de passe requis.
      </p>
    </form>
  );
};
```

### Avant : CreateGroupForm.tsx (implémentation actuelle)

```typescript
// 6 hooks useState pour gérer le formulaire
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [currency, setCurrency] = useState('EUR');
const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('annual');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');
```

### Après : CreateGroupForm.tsx (avec Zod + React Hook Form)

```typescript
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { createGroupSchema, type CreateGroupFormData } from '@/lib/schemas/group.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { Select } from '@/shared/components/Select';
import { useGroups } from '../hooks/useGroups';
import {
  CURRENCIES,
  GROUP_ERROR_MESSAGES,
  INCOME_FREQUENCIES,
  INCOME_FREQUENCY_LABELS,
  isIncomeFrequency,
} from '../types';

export const CreateGroupForm = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'EUR',
      incomeFrequency: 'annual',
    },
  });

  const incomeFrequency = watch('incomeFrequency');

  const onSubmit = async (data: CreateGroupFormData) => {
    const result = await createGroup({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      currency: data.currency,
      incomeFrequency: data.incomeFrequency,
    });

    if (!result.success) {
      setError('root', {
        message: GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
      return;
    }

    navigate(`/groups/${result.data.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Nom du groupe"
        type="text"
        placeholder="Ex: Colocation, Vacances 2024..."
        required
        disabled={isSubmitting}
        error={errors.name}
        {...register('name')}
      />

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Décrivez brièvement ce groupe..."
          disabled={isSubmitting}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
        />
        {errors.description && (
          <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Ark UI Select → Controller */}
      <div>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Devise
        </span>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select
              items={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              value={field.value}
              onValueChange={field.onChange}
              disabled={isSubmitting}
              aria-label="Devise du groupe"
            />
          )}
        />
      </div>

      {/* Ark UI SegmentedControl → Controller */}
      <fieldset disabled={isSubmitting}>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Saisie des revenus
        </span>
        <Controller
          name="incomeFrequency"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              items={INCOME_FREQUENCIES}
              value={field.value}
              onValueChange={(v) => {
                if (isIncomeFrequency(v)) field.onChange(v);
              }}
              aria-label="Fréquence de saisie des revenus"
            />
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {INCOME_FREQUENCY_LABELS[incomeFrequency].description}
        </p>
      </fieldset>

      {errors.root && (
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isSubmitting}
        loadingText="Création en cours..."
      >
        Créer le groupe
      </Button>
    </form>
  );
};
```

### Cas complexe : SettlementForm avec Controller + Dialog + pré-remplissage

```typescript
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { settlementSchema, type SettlementFormData } from '@/lib/schemas/settlement.schema';
import { useMembers } from '@/features/members/hooks/useMembers';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Select } from '@/shared/components/Select';
import type { SettlementSuggestion } from '../types';
import { SETTLEMENT_ERROR_MESSAGES } from '../types';

export const SettlementForm = ({ groupId, currency, suggestion, onSuccess, onCancel }) => {
  const { members } = useMembers(groupId);
  const { create } = useSettlement(groupId);

  const currentMember = members.find((m) => m.isCurrentUser);
  const otherMembers = members.filter((m) => !m.isCurrentUser);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      amount: suggestion ? String(suggestion.amount / 100) : '',
      toMember: suggestion?.to.id ?? '',
      date: getLocalDateString(),
    },
  });

  const onSubmit = async (data: SettlementFormData) => {
    const amountInCents = Math.round(Number.parseFloat(data.amount) * 100);
    const result = await create({ toMember: data.toMember, amount: amountInCents, date: data.date });

    if (!result.success) {
      setError('root', { message: SETTLEMENT_ERROR_MESSAGES[result.error] });
      return;
    }
    onSuccess();
  };

  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()}>
      <Portal>
        {/* ... backdrop + positioner ... */}
        <Dialog.Content>
          <Dialog.Title>Enregistrer un remboursement</Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Ark UI Select → Controller */}
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Destinataire
              </span>
              <Controller
                name="toMember"
                control={control}
                render={({ field }) => (
                  <Select
                    items={otherMembers.map((m) => ({ value: m.id, label: m.name }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Sélectionner un membre"
                    disabled={isSubmitting}
                    aria-label="Destinataire"
                    variant={errors.toMember ? 'error' : 'default'}
                  />
                )}
              />
              {errors.toMember && (
                <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.toMember.message}
                </p>
              )}
            </div>

            {/* TextInput → register */}
            <FormField
              label={`Montant (${currency})`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              disabled={isSubmitting}
              error={errors.amount}
              {...register('amount')}
            />

            <FormField
              label="Date"
              type="date"
              disabled={isSubmitting}
              error={errors.date}
              {...register('date')}
            />

            {errors.root && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors.root.message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" loading={isSubmitting} loadingText="Enregistrement..." className="flex-1">
                Enregistrer
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Portal>
    </Dialog.Root>
  );
};
```

### Cas complexe : ExpenseForm avec Controller + useFieldArray

Pour les formulaires avec listes dynamiques (participants), utiliser `useFieldArray` :

```typescript
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseFormData } from '@/lib/schemas/expense.schema';
import { Checkbox } from '@/shared/components/Checkbox';
import { Select } from '@/shared/components/Select';

export const ExpenseForm = ({ groupId, currency, expense, onSuccess, onCancel }) => {
  const { members } = useMembers(groupId);
  const { create, update } = useExpense(groupId, expense?.id);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense ? String(expense.amount / 100) : '',
      description: expense?.description ?? '',
      date: expense?.date ?? getLocalDateString(),
      paidBy: expense?.paidBy.id ?? '',
      participants: [], // Initialized via useEffect
    },
  });

  const { fields, update: updateField } = useFieldArray({
    control,
    name: 'participants',
  });

  const watchedParticipants = watch('participants');

  // Toggle participant selection
  const handleParticipantToggle = (index: number) => {
    const current = watchedParticipants[index];
    updateField(index, {
      ...current,
      selected: !current.selected,
      customAmount: '',
      useCustomAmount: false,
    });
  };

  // Paid by → Ark UI Select via Controller
  <Controller
    name="paidBy"
    control={control}
    render={({ field }) => (
      <Select
        items={members.map((m) => ({
          value: m.id,
          label: m.name + (m.isCurrentUser ? ' (vous)' : ''),
        }))}
        value={field.value}
        onValueChange={field.onChange}
        placeholder="Sélectionner..."
        disabled={isSubmitting}
        aria-label="Payé par"
      />
    )}
  />

  // Participants → Ark UI Checkbox via Controller
  {fields.map((field, index) => (
    <Controller
      key={field.id}
      name={`participants.${index}.selected`}
      control={control}
      render={({ field: checkboxField }) => (
        <Checkbox
          checked={checkboxField.value}
          onCheckedChange={(checked) => {
            checkboxField.onChange(checked);
            if (!checked) {
              // Reset custom amount when unchecked
              updateField(index, {
                ...watchedParticipants[index],
                selected: false,
                customAmount: '',
                useCustomAmount: false,
              });
            }
          }}
          disabled={isSubmitting}
          size="sm"
        >
          {watchedParticipants[index]?.memberName}
        </Checkbox>
      )}
    />
  ))}
};
```

## Schémas backend existants (référence)

Le backend utilise déjà Zod pour la validation API. Ces schémas valident les données **après transformation** (montants en centimes, types numériques) :

| Route | Schéma backend | Schéma frontend (à créer) |
|-------|---------------|--------------------------|
| `POST /api/groups` | `createGroupSchema` (name, description, currency, incomeFrequency) | `createGroupSchema` (même structure) |
| `POST .../expenses` | `createExpenseSchema` (amount: number cents) | `expenseSchema` (amount: string brute) |
| `POST .../settlements` | `createSettlementSchema` (amount: number cents) | `settlementSchema` (amount: string brute) |
| `POST .../invitations/invite` | `sendInvitationSchema` (email) | `inviteSchema` (email) |
| `PATCH .../members/me` | `updateMemberSchema` (income: number cents) | `incomeSchema` (income: string brute) |

> **Pourquoi pas de schéma partagé ?** Les schémas frontend valident des strings (input HTML) tandis que les schémas backend valident des types transformés (nombres en centimes). Le partage n'est pas naturel pour les champs numériques. Pour les schémas simples (email, nom), un futur refactoring de partage reste possible.

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Régression fonctionnelle** | Moyen | Migration formulaire par formulaire avec tests manuels |
| **Intégration Ark UI + Controller** | Moyen | Pattern `Controller` bien documenté, composants existants ont déjà `value`/`onValueChange` |
| **Formulaires dans Dialog** | Faible | Le Dialog wrape le formulaire, pas l'inverse — pas de conflit |
| **Zod v4 + @hookform/resolvers** | Faible | Nécessite `@hookform/resolvers` v5+ qui supporte Zod v4 |
| **Bundle size** | Faible | react-hook-form (~9KB gzipped), zod déjà inclus |
| **ExpenseForm complexe** | Moyen | Migrer en dernier, utiliser `useFieldArray` + `Controller` |

### Stratégie de rollback

1. Chaque formulaire migré dans un commit dédié
2. Tests manuels avant chaque commit
3. Les types existants dans `types.ts` restent inchangés (pas de breaking change sur les API hooks)

## Estimation de complexité

| Élément | Complexité | Notes |
|---------|------------|-------|
| Installation deps | S | `react-hook-form` + `@hookform/resolvers` uniquement |
| Schémas Zod (5 fichiers) | S | Basés sur la validation existante + schémas backend |
| Composant FormField | S | Wrapper simple label + TextInput + erreur |
| LoginForm | S | 1 champ, `register` uniquement |
| InviteForm | S | 1 champ, `register` uniquement |
| IncomeForm | S | 1 champ, `register` uniquement, wrappé dans Dialog |
| CreateGroupForm | M | 4 champs, 2 `Controller` (Select, SegmentedControl) |
| SettlementForm | M | 3 champs, 1 `Controller` (Select), Dialog, pré-remplissage |
| ExpenseForm | L | `useFieldArray` + 2 `Controller` (Select, Checkbox), Dialog, mode édition |

### Dépendances avec autres chantiers

- **Aucune dépendance bloquante** : peut être réalisé indépendamment
- **Synergie potentielle** : les schémas Zod frontend peuvent servir de référence pour aligner les messages d'erreur avec le backend
