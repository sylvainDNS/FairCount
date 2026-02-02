# Implémentation de Zod + React Hook Form pour la gestion des formulaires

## Contexte

### État actuel du codebase

Les formulaires du projet utilisent actuellement une approche manuelle avec `useState` pour chaque champ :

- **6 formulaires identifiés** : `LoginForm`, `CreateGroupForm`, `InviteForm`, `ExpenseForm`, `SettlementForm`, `IncomeForm`
- **Gestion d'état manuelle** : chaque champ a son propre `useState`
- **Validation impérative** : conditions `if/else` dans `handleSubmit`
- **Utilitaires de validation basiques** dans `/src/lib/validation.ts` (regex email, UUID)
- **Composant TextInput** avec support `forwardRef` (compatible React Hook Form)

### Problèmes identifiés

1. **Code répétitif** : chaque formulaire redéfinit le pattern `FormState = 'idle' | 'loading' | 'error'`
2. **Validation fragmentée** : logique dispersée dans les handlers, pas de schéma centralisé
3. **Pas de validation temps réel** : erreurs affichées uniquement au submit
4. **Gestion d'erreurs incohérente** : certains formulaires utilisent `error`, d'autres `errorMessage`
5. **Performance** : re-renders à chaque frappe via `onChange` + `setState`
6. **Maintenabilité** : ajout d'un champ = ajout d'un `useState` + modification du handler

Exemple actuel (`CreateGroupForm.tsx`, 6 hooks d'état) :
```typescript
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [currency, setCurrency] = useState('EUR');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');
```

## Objectifs

### Ce que l'amélioration apporte

1. **Schéma de validation déclaratif** : une seule source de vérité avec Zod
2. **Validation temps réel** : feedback utilisateur immédiat (mode `onChange` ou `onBlur`)
3. **Type inference automatique** : types TypeScript générés depuis le schéma Zod
4. **Réduction du boilerplate** : suppression des multiples `useState`
5. **Performance optimisée** : React Hook Form utilise des refs, minimisant les re-renders
6. **Accessibilité améliorée** : intégration native des attributs `aria-invalid`, `aria-describedby`
7. **Réutilisabilité** : schémas Zod partageables entre frontend et backend (validation API)

### Métriques de succès

- Réduction de 40-60% des lignes de code par formulaire
- Zéro re-render sur frappe (vérifiable via React DevTools)
- Couverture de validation à 100% (champs requis, formats, contraintes)
- Messages d'erreur localisés et cohérents

## Solution proposée

### Librairies choisies

| Librairie | Version | Justification |
|-----------|---------|---------------|
| `react-hook-form` | ^7.x | Leader du marché, excellente DX, performance (refs vs state) |
| `zod` | ^3.x | TypeScript-first, inférence de types, écosystème riche |
| `@hookform/resolvers` | ^3.x | Pont entre RHF et Zod, intégration seamless |

**Pourquoi pas Formik ?** Formik utilise `useState` en interne, donc mêmes problèmes de performance.

### Architecture cible

```
src/
├── lib/
│   └── validation.ts          # Existant - à enrichir avec schémas Zod
│   └── schemas/               # NOUVEAU - schémas Zod par domaine
│       ├── auth.schema.ts
│       ├── group.schema.ts
│       ├── expense.schema.ts
│       └── settlement.schema.ts
├── shared/
│   └── components/
│       ├── TextInput.tsx      # Existant - compatible RHF (forwardRef)
│       └── FormField.tsx      # NOUVEAU - wrapper label + input + erreur
├── features/
│   └── {feature}/
│       └── components/
│           └── *Form.tsx      # Migration vers RHF + Zod
```

## Plan d'implémentation

### Étape 1 : Installation des dépendances

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

### Étape 2 : Création des schémas Zod (nouveaux fichiers)

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
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD']),
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

### Étape 3 : Création du composant FormField (nouveau fichier)

**Fichier** : `/src/shared/components/FormField.tsx`

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
          aria-describedby={error ? errorId : undefined}
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

### Étape 4 : Migration des formulaires

**Ordre de migration recommandé** (du plus simple au plus complexe) :

1. `LoginForm.tsx` - 1 champ, validation simple
2. `InviteForm.tsx` - 1 champ, callback `onSuccess`
3. `CreateGroupForm.tsx` - 3 champs, navigation après submit
4. `SettlementForm.tsx` - 3 champs, pré-remplissage depuis suggestion
5. `IncomeForm.tsx` - À analyser
6. `ExpenseForm.tsx` - Complexe (participants dynamiques, montants personnalisés)

## Exemples de code

### Avant : InviteForm.tsx (implémentation actuelle)

```typescript
// 5 hooks useState
const [email, setEmail] = useState('');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');

const handleSubmit = useCallback(
  async (e: React.SubmitEvent) => {
    e.preventDefault();

    // Validation manuelle
    if (!isValidEmail(email)) {
      setFormState('error');
      setErrorMessage('Adresse email invalide');
      return;
    }

    setFormState('loading');
    setErrorMessage('');

    const result = await sendInvitation(email);

    if (result.success) {
      setFormState('success');
      setEmail('');
      onSuccess?.();
      setTimeout(() => setFormState('idle'), 3000);
    } else {
      setFormState('error');
      setErrorMessage(GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
    }
  },
  [email, sendInvitation, onSuccess],
);

// Dans le JSX
<TextInput
  id="invite-email"
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (formState !== 'idle') {
      setFormState('idle');
      setErrorMessage('');
    }
  }}
  placeholder="email@exemple.com"
  required
  disabled={formState === 'loading'}
  aria-describedby={formState === 'error' ? 'invite-error' : formState === 'success' ? 'invite-success' : undefined}
  aria-invalid={formState === 'error'}
/>
```

### Après : InviteForm.tsx (avec Zod + React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { inviteSchema, type InviteFormData } from '@/lib/schemas/group.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { useInvitations } from '../hooks/useInvitations';
import { GROUP_ERROR_MESSAGES, type GroupError } from '../types';

interface InviteFormProps {
  readonly groupId: string;
  readonly onSuccess?: (() => void) | undefined;
}

export const InviteForm = ({ groupId, onSuccess }: InviteFormProps) => {
  const { sendInvitation } = useInvitations(groupId);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    mode: 'onBlur', // Validation au blur pour feedback rapide
  });

  const onSubmit = async (data: InviteFormData) => {
    const result = await sendInvitation(data.email);

    if (result.success) {
      setShowSuccess(true);
      reset();
      onSuccess?.();
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setError('root', {
        message: GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Adresse email"
        type="email"
        placeholder="email@exemple.com"
        disabled={isSubmitting}
        error={errors.email}
        {...register('email')}
      />

      {errors.root && (
        <div role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      {showSuccess && (
        <output className="text-green-600 dark:text-green-400 text-sm">
          Invitation envoyée avec succès
        </output>
      )}

      <Button
        type="submit"
        fullWidth
        loading={isSubmitting}
        loadingText="Envoi en cours..."
      >
        Envoyer l'invitation
      </Button>
    </form>
  );
};
```

### Avant : CreateGroupForm.tsx (implémentation actuelle)

```typescript
// 5 hooks useState pour gérer le formulaire
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [currency, setCurrency] = useState('EUR');
const [formState, setFormState] = useState<FormState>('idle');
const [errorMessage, setErrorMessage] = useState('');

const handleSubmit = useCallback(
  async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormState('error');
      setErrorMessage(GROUP_ERROR_MESSAGES.INVALID_NAME);
      return;
    }

    setFormState('loading');
    setErrorMessage('');

    const result = await createGroup({
      name: name.trim(),
      description: description.trim() || undefined,
      currency,
    });

    if (!result.success) {
      setFormState('error');
      setErrorMessage(GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
      return;
    }

    navigate(`/groups/${result.data.id}`);
  },
  [name, description, currency, createGroup, navigate],
);
```

### Après : CreateGroupForm.tsx (avec Zod + React Hook Form)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { createGroupSchema, type CreateGroupFormData } from '@/lib/schemas/group.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { useGroups } from '../hooks/useGroups';
import { CURRENCIES, GROUP_ERROR_MESSAGES } from '../types';

export const CreateGroupForm = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'EUR',
    },
  });

  const onSubmit = async (data: CreateGroupFormData) => {
    const result = await createGroup({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      currency: data.currency,
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

      <div>
        <label
          htmlFor="currency"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Devise
        </label>
        <select
          id="currency"
          {...register('currency')}
          disabled={isSubmitting}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

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

### Cas complexe : ExpenseForm avec useFieldArray

Pour les formulaires avec listes dynamiques (participants), utiliser `useFieldArray` :

```typescript
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseFormData } from '@/lib/schemas/expense.schema';

export const ExpenseForm = ({ groupId, currency, expense, onSuccess, onCancel }) => {
  const { members } = useMembers(groupId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense ? String(expense.amount / 100) : '',
      description: expense?.description ?? '',
      date: getLocalDateString(),
      paidBy: expense?.paidBy.id ?? '',
      participants: [], // Initialisé via useEffect
    },
  });

  const { fields, update } = useFieldArray({
    control,
    name: 'participants',
  });

  // Watch pour réagir aux changements de participants
  const watchedParticipants = watch('participants');

  // Toggle participant selection
  const handleParticipantToggle = (index: number) => {
    const current = watchedParticipants[index];
    update(index, {
      ...current,
      selected: !current.selected,
      customAmount: '',
      useCustomAmount: false,
    });
  };

  // ... reste du composant
};
```

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Régression fonctionnelle** | Moyen | Migration formulaire par formulaire avec tests manuels |
| **Courbe d'apprentissage** | Faible | Documentation interne + exemples concrets |
| **Bundle size** | Faible | zod (~12KB) + react-hook-form (~9KB) gzipped, acceptable |
| **Formulaires complexes (ExpenseForm)** | Moyen | Migrer en dernier, utiliser `useFieldArray` |
| **Intégration TextInput** | Faible | Composant déjà compatible (`forwardRef`) |

### Stratégie de rollback

1. Chaque formulaire migré sur une branche dédiée
2. Code original conservé commenté pendant la phase de test
3. Feature flag possible si déploiement progressif souhaité

## Estimation de complexité

| Élément | Complexité | Temps estimé |
|---------|------------|--------------|
| Installation + setup schémas | S | 1h |
| Composant FormField | S | 30min |
| LoginForm | S | 30min |
| InviteForm | S | 30min |
| CreateGroupForm | S | 45min |
| SettlementForm | M | 1h |
| IncomeForm | S-M | 45min |
| ExpenseForm | L | 2-3h |
| **Total** | **M** | **7-8h** |

### Dépendances avec autres chantiers

- **Aucune dépendance bloquante** : peut être réalisé indépendamment
- **Synergie potentielle** : les schémas Zod peuvent être réutilisés pour la validation API côté Worker (si migration vers Hono + Zod validator)
