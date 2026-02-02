# Extension de l'utilisation des composants Ark UI

## Contexte

### État actuel du codebase

FairCount utilise déjà `@ark-ui/react` (v5.30.0) pour plusieurs composants headless :

| Composant | Fichiers utilisant |
|-----------|-------------------|
| `Dialog` | `ConfirmDialog.tsx`, `ExpenseForm.tsx`, `ExpenseDetail.tsx`, `IncomeForm.tsx`, `SettlementForm.tsx`, `SettlementHistory.tsx` |
| `Portal` | Tous les fichiers utilisant Dialog |
| `Collapsible` | `ExpenseFilters.tsx`, `MemberCard.tsx` |
| `Tooltip` | `BalanceList.tsx` |

### Problèmes identifiés

1. **Éléments `<select>` natifs** dans 4 fichiers avec du styling inline répété :
   - `ExpenseForm.tsx` : sélection du payeur
   - `ExpenseFilters.tsx` : filtre par payeur
   - `SettlementForm.tsx` : sélection du destinataire
   - `CreateGroupForm.tsx` : sélection de la devise

2. **Checkboxes HTML natives** dans `ExpenseForm.tsx` pour la sélection des participants, sans accessibilité optimale.

3. **Tabs implémentés manuellement** dans `ExpenseFilters.tsx` (lignes 168-194) avec gestion manuelle du clavier (ArrowLeft/Right, Home/End).

4. **Pattern de toggle répété** pour montrer/masquer des sections dans `GroupDetailPage.tsx` (balances, historique des remboursements).

5. **Inputs numériques** utilisant `type="number"` natif sans contrôle précis des valeurs (montants, revenus).

6. **Absence de composant Popover/Menu** pour les actions contextuelles sur les cartes (edit, delete).

## Objectifs

### Bénéfices attendus

- **Accessibilité améliorée** : Ark UI gère automatiquement ARIA, focus management, et navigation clavier
- **Consistance UI** : Un seul pattern de styling via CVA pour chaque type de composant
- **Réduction du code dupliqué** : Centralisation des composants de formulaire
- **Mobile-first amélioré** : Meilleur support tactile natif des composants Ark UI

### Métriques de succès

- Zéro élément `<select>` natif dans le codebase
- Zéro gestion manuelle de navigation clavier pour les tabs
- Tous les composants interactifs utilisant Ark UI
- Tests d'accessibilité passants (axe-core)

## Solution proposée

### Librairie choisie : Ark UI

Ark UI est déjà installé et utilisé dans le projet. L'extension se fait naturellement en ajoutant de nouveaux composants de la même librairie :

**Avantages** :
- Zéro nouvelle dépendance
- API cohérente avec les composants existants
- Composants headless = contrôle total du styling
- Support React 19 et TypeScript natif

### Architecture cible

```
src/shared/components/
├── Button.tsx           # Existant
├── TextInput.tsx        # Existant
├── ConfirmDialog.tsx    # Existant (Ark UI Dialog)
├── Select.tsx           # NOUVEAU - Ark UI Select
├── Checkbox.tsx         # NOUVEAU - Ark UI Checkbox
├── CheckboxGroup.tsx    # NOUVEAU - Ark UI Checkbox.Group
├── NumberInput.tsx      # NOUVEAU - Ark UI NumberInput
├── Tabs.tsx             # NOUVEAU - Ark UI Tabs
├── Switch.tsx           # NOUVEAU - Ark UI Switch
└── Menu.tsx             # NOUVEAU - Ark UI Menu (actions contextuelles)
```

## Plan d'implémentation

### Étape 1 : Composant Select (Priorité haute)

**Impact** : 4 fichiers

1. Créer `src/shared/components/Select.tsx` avec variants CVA
2. Migrer `CreateGroupForm.tsx` (sélection devise)
3. Migrer `ExpenseForm.tsx` (sélection payeur)
4. Migrer `ExpenseFilters.tsx` (filtre payeur)
5. Migrer `SettlementForm.tsx` (sélection destinataire)

### Étape 2 : Composant Checkbox/CheckboxGroup (Priorité haute)

**Impact** : 1 fichier

1. Créer `src/shared/components/Checkbox.tsx`
2. Créer `src/shared/components/CheckboxGroup.tsx`
3. Migrer `ExpenseForm.tsx` (sélection participants)

### Étape 3 : Composant Tabs (Priorité moyenne)

**Impact** : 1 fichier

1. Créer `src/shared/components/Tabs.tsx`
2. Migrer `ExpenseFilters.tsx` (période tabs)

### Étape 4 : Composant NumberInput (Priorité moyenne)

**Impact** : 3 fichiers

1. Créer `src/shared/components/NumberInput.tsx` (optionnel, avec boutons +/-)
2. Migrer `ExpenseForm.tsx` (montant)
3. Migrer `SettlementForm.tsx` (montant)
4. Migrer `IncomeForm.tsx` (revenu)

### Étape 5 : Composant Menu (Priorité basse)

**Impact** : Nouvelles fonctionnalités

1. Créer `src/shared/components/Menu.tsx`
2. Ajouter menu d'actions sur `ExpenseCard.tsx`
3. Ajouter menu d'actions sur `SettlementCard.tsx`

## Exemples de code

### Composant Select - Implémentation

`/src/shared/components/Select.tsx`
```typescript
import { Select as ArkSelect, Portal } from '@ark-ui/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';

const selectTriggerVariants = cva(
  'flex items-center justify-between w-full px-3 py-2 rounded-lg border transition-colors',
  {
    variants: {
      variant: {
        default: [
          'border-slate-300 dark:border-slate-700',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-white',
          'hover:border-slate-400 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        ],
        error: [
          'border-red-500 dark:border-red-400',
          'bg-white dark:bg-slate-800',
          'text-slate-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-red-500',
        ],
      },
      size: {
        sm: 'text-sm h-8',
        md: 'text-base h-10',
        lg: 'text-lg h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends VariantProps<typeof selectTriggerVariants> {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  disabled,
  variant,
  size,
  'aria-label': ariaLabel,
}: SelectProps) => {
  return (
    <ArkSelect.Root
      value={value ? [value] : []}
      onValueChange={(details) => onChange?.(details.value[0])}
      disabled={disabled}
    >
      <ArkSelect.Control>
        <ArkSelect.Trigger
          className={selectTriggerVariants({ variant, size })}
          aria-label={ariaLabel}
        >
          <ArkSelect.ValueText placeholder={placeholder} />
          <ArkSelect.Indicator>
            <ChevronDownIcon className="w-4 h-4 text-slate-400" />
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>

      <Portal>
        <ArkSelect.Positioner>
          <ArkSelect.Content className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[var(--reference-width)]">
            {options.map((option) => (
              <ArkSelect.Item
                key={option.value}
                item={option}
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700"
              >
                <ArkSelect.ItemText>{option.label}</ArkSelect.ItemText>
                <ArkSelect.ItemIndicator>
                  <CheckIcon className="w-4 h-4 text-blue-500" />
                </ArkSelect.ItemIndicator>
              </ArkSelect.Item>
            ))}
          </ArkSelect.Content>
        </ArkSelect.Positioner>
      </Portal>
    </ArkSelect.Root>
  );
};
```

### Migration Select - Avant/Après

**AVANT : `CreateGroupForm.tsx`**
```tsx
<select
  id="currency"
  value={currency}
  onChange={(e) => setCurrency(e.target.value)}
  disabled={formState === 'loading'}
  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
>
  {CURRENCIES.map((c) => (
    <option key={c.code} value={c.code}>
      {c.label}
    </option>
  ))}
</select>
```

**APRÈS : `CreateGroupForm.tsx`**
```tsx
import { Select } from '@/shared/components/Select';

<Select
  value={currency}
  onChange={setCurrency}
  disabled={formState === 'loading'}
  options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
  aria-label="Devise du groupe"
/>
```

### Composant Tabs - Implémentation

`/src/shared/components/Tabs.tsx`
```typescript
import { Tabs as ArkTabs } from '@ark-ui/react';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

const tabTriggerStyles = cva([
  'px-4 py-2 text-sm font-medium transition-colors',
  'text-slate-600 dark:text-slate-400',
  'hover:text-slate-900 dark:hover:text-white',
  'data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400',
  'data-[selected]:border-b-2 data-[selected]:border-blue-600 dark:data-[selected]:border-blue-400',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
]);

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const Tabs = ({ tabs, defaultValue, value, onChange }: TabsProps) => {
  return (
    <ArkTabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={(details) => onChange?.(details.value)}
    >
      <ArkTabs.List className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <ArkTabs.Trigger key={tab.value} value={tab.value} className={tabTriggerStyles()}>
            {tab.label}
          </ArkTabs.Trigger>
        ))}
        <ArkTabs.Indicator className="h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-200" />
      </ArkTabs.List>

      {tabs.map((tab) => (
        <ArkTabs.Content key={tab.value} value={tab.value} className="pt-4">
          {tab.content}
        </ArkTabs.Content>
      ))}
    </ArkTabs.Root>
  );
};
```

### Migration Tabs - Avant/Après

**AVANT : `ExpenseFilters.tsx` (gestion manuelle clavier)**
```tsx
const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');

const handleKeyDown = (e: React.KeyboardEvent, periods: Period[]) => {
  const currentIndex = periods.indexOf(selectedPeriod);
  let newIndex = currentIndex;

  switch (e.key) {
    case 'ArrowRight':
      newIndex = (currentIndex + 1) % periods.length;
      break;
    case 'ArrowLeft':
      newIndex = (currentIndex - 1 + periods.length) % periods.length;
      break;
    case 'Home':
      newIndex = 0;
      break;
    case 'End':
      newIndex = periods.length - 1;
      break;
    default:
      return;
  }

  e.preventDefault();
  setSelectedPeriod(periods[newIndex]);
};

// Dans le JSX
<div role="tablist" className="flex gap-1" onKeyDown={(e) => handleKeyDown(e, periods)}>
  {periods.map((period) => (
    <button
      key={period}
      role="tab"
      aria-selected={selectedPeriod === period}
      tabIndex={selectedPeriod === period ? 0 : -1}
      onClick={() => setSelectedPeriod(period)}
      className={/* classes conditionnelles */}
    >
      {periodLabels[period]}
    </button>
  ))}
</div>
```

**APRÈS : `ExpenseFilters.tsx`**
```tsx
import { Tabs } from '@/shared/components/Tabs';

const periodTabs = [
  { value: 'all', label: 'Tout' },
  { value: 'month', label: 'Ce mois' },
  { value: 'week', label: 'Cette semaine' },
];

<Tabs
  tabs={periodTabs.map((p) => ({
    ...p,
    content: null, // Contenu géré ailleurs
  }))}
  value={selectedPeriod}
  onChange={(value) => setSelectedPeriod(value as Period)}
/>
```

### Composant Checkbox - Implémentation

`/src/shared/components/Checkbox.tsx`
```typescript
import { Checkbox as ArkCheckbox } from '@ark-ui/react';
import { CheckIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

const checkboxControlStyles = cva([
  'flex items-center justify-center w-5 h-5 rounded border-2 transition-colors',
  'border-slate-300 dark:border-slate-600',
  'data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
  'data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:border-blue-600',
  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
]);

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const Checkbox = ({ checked, onChange, disabled, children }: CheckboxProps) => {
  return (
    <ArkCheckbox.Root
      checked={checked}
      onCheckedChange={(details) => onChange?.(details.checked === true)}
      disabled={disabled}
      className="flex items-center gap-2 cursor-pointer"
    >
      <ArkCheckbox.Control className={checkboxControlStyles()}>
        <ArkCheckbox.Indicator>
          <CheckIcon className="w-3 h-3 text-white" />
        </ArkCheckbox.Indicator>
      </ArkCheckbox.Control>
      {children && (
        <ArkCheckbox.Label className="text-sm text-slate-700 dark:text-slate-300">
          {children}
        </ArkCheckbox.Label>
      )}
      <ArkCheckbox.HiddenInput />
    </ArkCheckbox.Root>
  );
};
```

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Breaking changes API Ark UI | Moyen | Encapsuler dans composants shared, mise à jour contrôlée |
| Régression accessibilité | Élevé | Tests automatisés avec axe-core, tests manuels VoiceOver |
| Performance (Portal overhead) | Faible | Utiliser `lazy` pour les menus, profiler si nécessaire |
| Styling inconsistant | Moyen | Review systématique des variants CVA |
| Complexité Select sur mobile | Moyen | Tester sur iOS Safari et Android Chrome |

### Stratégie de rollback

1. Les composants natifs restent fonctionnels pendant la migration
2. Chaque composant peut être rollback indépendamment
3. Feature flag possible pour A/B testing si besoin

## Estimation de complexité

| Étape | Complexité | Effort estimé | Dépendances |
|-------|------------|---------------|-------------|
| 1. Select | M | 1-2 jours | Aucune |
| 2. Checkbox | S | 0.5 jour | Aucune |
| 3. Tabs | S | 0.5 jour | Aucune |
| 4. NumberInput | M | 1 jour | Aucune |
| 5. Menu | M | 1 jour | Aucune |

**Total estimé** : 4-5 jours de développement

**Taille globale** : **M** (Medium)

### Dépendances avec autres chantiers

| Chantier | Relation |
|----------|----------|
| Zod + React Hook Form | Les nouveaux composants doivent supporter `register()` |
| Tests | Ajouter tests d'accessibilité pour chaque composant |
| Toast notifications | Aucune |

### Ordre de priorité

Ce chantier peut être réalisé **en parallèle** des autres. Recommandé :
1. Commencer par Select (impact le plus large)
2. Enchaîner avec Checkbox (même formulaire ExpenseForm)
3. Tabs en dernier (moins prioritaire)
