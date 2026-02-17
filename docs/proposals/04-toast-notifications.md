# Système de Toast/Notification

> **Statut : Implémenté** — Singleton `createToaster()` dans `src/shared/components/Toast/toaster.ts`, sans Context/Provider. Usage : `toaster.success({ title: '...' })`.

## Contexte

### État actuel du codebase

Le projet FairCount ne dispose actuellement d'aucun système de notification toast. La gestion des feedbacks utilisateur repose sur :

1. **Erreurs inline dans les formulaires** : Chaque formulaire gère son propre état d'erreur avec un pattern répété :
   ```tsx
   // Pattern actuel dans CreateGroupForm.tsx, ExpenseForm.tsx, etc.
   const [error, setError] = useState<string | null>(null);

   {error && (
     <p className="text-sm text-red-600 dark:text-red-400" role="alert">
       {error}
     </p>
   )}
   ```

2. **ErrorBoundary pour les erreurs de rendu** : Capture les erreurs React non gérées (`/src/shared/components/ErrorBoundary.tsx`)

3. **ConfirmDialog pour les actions destructives** : Modal de confirmation existant (`/src/shared/components/ConfirmDialog.tsx`)

### Problèmes identifiés

| Problème | Impact | Exemple |
|----------|--------|---------|
| Aucun feedback de succès | L'utilisateur ne sait pas si son action a réussi | Après modification d'un groupe dans `GroupSettings.tsx`, pas de confirmation visuelle |
| Pas de notification pour les actions asynchrones | Expérience utilisateur dégradée | Création de dépense, envoi d'invitation |
| Pattern de gestion d'erreur dupliqué | Code répétitif, maintenance difficile | `setError`, `setErrorMessage` dans chaque composant |
| Pas de persistance des messages entre navigations | Messages perdus lors des redirections | `CreateGroupForm` redirige sans confirmer le succès |
| Accessibilité incomplète | Les erreurs inline peuvent être manquées | Pas de `aria-live` global pour les annonces |

### Composants concernés

- `/src/features/auth/components/LoginForm.tsx` - Gestion état `success` en inline
- `/src/features/auth/components/ProfilePage.tsx` - Feedback temporaire après sauvegarde
- `/src/features/groups/components/CreateGroupForm.tsx` - Redirection sans feedback
- `/src/features/groups/components/GroupSettings.tsx` - Pas de feedback succès après sauvegarde
- `/src/features/groups/components/InviteForm.tsx` - Erreurs inline uniquement
- `/src/features/expenses/components/ExpenseForm.tsx` - Modal sans feedback externe
- `/src/features/expenses/components/ExpenseDetail.tsx` - Suppression sans confirmation visuelle
- `/src/features/settlements/components/SettlementForm.tsx` - Pas de feedback succès
- `/src/features/members/components/IncomeForm.tsx` - Erreurs inline

## Objectifs

### Ce que l'amélioration apporte

1. **Expérience utilisateur cohérente** : Feedback visuel uniforme pour toutes les actions (succès, erreur, info, warning)
2. **Accessibilité renforcée** : Annonces screen reader via `aria-live` regions
3. **Code maintenable** : API centralisée pour les notifications, suppression du code dupliqué
4. **Persistance inter-navigation** : Messages conservés lors des redirections
5. **Support mobile-first** : Toasts adaptés au design PWA existant

### Métriques de succès

- Zéro duplication du pattern `useState` pour les messages d'erreur dans les nouveaux composants
- 100% des actions CRUD avec feedback visuel
- Accessibilité WCAG 2.1 AA pour les notifications
- Temps de réponse perçu amélioré (feedback immédiat)

## Solution proposée

### Librairie choisie : Implémentation custom avec @ark-ui/react

**Justification :**
- Le projet utilise déjà `@ark-ui/react` pour les composants Dialog/Portal
- Ark UI fournit un composant Toast headless accessible
- Zéro dépendance supplémentaire
- Contrôle total sur le styling Tailwind
- Cohérence avec l'architecture existante

**Alternative évaluée et rejetée :**
- `react-hot-toast` : Légère mais styling pré-défini, moins flexible
- `sonner` : Excellente mais ajoute une dépendance externe non nécessaire

### Architecture cible

```
src/
├── shared/
│   ├── components/
│   │   └── Toast/
│   │       ├── ToastProvider.tsx    # Provider avec Ark UI Toast.Toaster
│   │       ├── ToastItem.tsx        # Composant de rendu d'un toast
│   │       └── index.ts             # Barrel file
│   └── hooks/
│       └── useToast.ts              # Hook d'accès au contexte toast
├── App.tsx                          # Intégration du ToastProvider
```

### Types de notifications

| Type | Couleur | Icône | Durée par défaut | Cas d'usage |
|------|---------|-------|------------------|-------------|
| `success` | Vert (`positive-*`) | Checkmark | 4s | Création, modification, suppression réussie |
| `error` | Rouge (`negative-*`) | X/Alert | 8s | Erreurs API, validations |
| `warning` | Orange (`warning-*`) | Warning | 6s | Actions avec conséquences |
| `info` | Bleu (`primary-*`) | Info | 5s | Informations contextuelles |

### API proposée

```typescript
// useToast hook
interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, 0 = persistant
  action?: {
    label: string;
    onClick: () => void;
  };
}

const { toast, dismiss, dismissAll } = useToast();

// Usage
toast({
  type: 'success',
  title: 'Groupe créé',
  description: 'Vous pouvez maintenant inviter des membres',
});
```

## Plan d'implémentation

### Étape 1 : Infrastructure de base (S)

**Fichiers à créer :**
- `/src/shared/components/Toast/ToastProvider.tsx`
- `/src/shared/components/Toast/ToastItem.tsx`
- `/src/shared/components/Toast/index.ts`
- `/src/shared/hooks/useToast.ts`

**Fichier à modifier :**
- `/src/App.tsx` - Wrapper avec ToastProvider

### Étape 2 : Migration des formulaires avec succès manquant (M)

**Ordre de migration :**

1. `/src/features/groups/components/GroupSettings.tsx`
   - Ajouter toast succès après `updateGroup`, `archiveGroup`

2. `/src/features/groups/components/CreateGroupForm.tsx`
   - Toast succès avant navigation

3. `/src/features/expenses/components/ExpenseForm.tsx`
   - Toast succès après création/modification

4. `/src/features/settlements/components/SettlementForm.tsx`
   - Toast succès après enregistrement

5. `/src/features/groups/components/InviteForm.tsx`
   - Toast succès après envoi d'invitation

6. `/src/features/members/components/IncomeForm.tsx`
   - Toast succès après mise à jour du revenu

### Étape 3 : Migration des erreurs inline (M)

**Pattern de migration :**
- Conserver les erreurs de validation inline (UX formulaire)
- Migrer les erreurs API vers toast
- Supprimer les `useState` d'erreur redondants

**Fichiers concernés :**
- Tous les fichiers de l'étape 2
- `/src/features/auth/components/LoginForm.tsx` (erreurs API uniquement)
- `/src/features/auth/components/ProfilePage.tsx`

### Étape 4 : Tests et accessibilité (S)

**Fichiers à créer :**
- `/src/shared/components/Toast/ToastProvider.test.tsx`
- `/src/shared/components/Toast/ToastItem.test.tsx`

## Exemples de code

### Avant : GroupSettings.tsx (extrait)

```tsx
// Ligne 19
const [errorMessage, setErrorMessage] = useState('');

// Ligne 29-50
const handleSave = useCallback(async () => {
  if (!name.trim()) {
    setErrorMessage(GROUP_ERROR_MESSAGES.INVALID_NAME);
    return;
  }

  setSaving(true);
  setErrorMessage('');

  const result = await updateGroup({
    name: name.trim(),
    description: description.trim() || undefined,
  });

  setSaving(false);

  if (!result.success) {
    setErrorMessage(
      GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
    );
  }
  // Aucun feedback de succès !
}, [name, description, updateGroup]);

// Ligne 123
{errorMessage && <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>}
```

### Après : GroupSettings.tsx (extrait)

```tsx
import { useToast } from '@/shared/hooks/useToast';

// Dans le composant
const { toast } = useToast();

const handleSave = useCallback(async () => {
  if (!name.trim()) {
    toast({
      type: 'error',
      title: 'Nom invalide',
      description: GROUP_ERROR_MESSAGES.INVALID_NAME,
    });
    return;
  }

  setSaving(true);

  const result = await updateGroup({
    name: name.trim(),
    description: description.trim() || undefined,
  });

  setSaving(false);

  if (result.success) {
    toast({
      type: 'success',
      title: 'Groupe mis à jour',
    });
  } else {
    toast({
      type: 'error',
      title: 'Erreur',
      description: GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
}, [name, description, updateGroup, toast]);

// Suppression du rendu conditionnel d'erreur inline
```

### Avant : CreateGroupForm.tsx (extrait)

```tsx
// Ligne 45 - Redirection sans feedback
if (result.success) {
  navigate(`/groups/${result.data.id}`);
}
```

### Après : CreateGroupForm.tsx (extrait)

```tsx
if (result.success) {
  toast({
    type: 'success',
    title: 'Groupe créé',
    description: `"${result.data.name}" est prêt. Invitez vos amis !`,
  });
  navigate(`/groups/${result.data.id}`);
}
```

### Implémentation ToastProvider.tsx

```tsx
import { Toast, createToaster } from '@ark-ui/react/toast';
import { Portal } from '@ark-ui/react/portal';
import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import { ToastItem } from './ToastItem';

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const [Toaster, toastApi] = createToaster({
  placement: 'bottom',
  overlap: true,
  gap: 12,
});

interface ToastProviderProps {
  readonly children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const toast = useCallback((options: ToastOptions) => {
    const defaultDurations = {
      success: 4000,
      error: 8000,
      warning: 6000,
      info: 5000,
    };

    toastApi.create({
      title: options.title,
      description: options.description,
      type: options.type,
      duration: options.duration ?? defaultDurations[options.type],
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    toastApi.dismiss(id);
  }, []);

  const dismissAll = useCallback(() => {
    toastApi.dismiss();
  }, []);

  const value = useMemo(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster>
        {(toast) => (
          <Toast.Root key={toast.id} className="group">
            <ToastItem toast={toast} />
          </Toast.Root>
        )}
      </Toaster>
    </ToastContext.Provider>
  );
};
```

### Implémentation ToastItem.tsx

```tsx
import { Toast } from '@ark-ui/react/toast';

const typeStyles = {
  success: {
    container: 'bg-positive-50 dark:bg-positive-900/20 border-positive-200 dark:border-positive-800',
    icon: 'text-positive-600 dark:text-positive-400',
    title: 'text-positive-900 dark:text-positive-100',
  },
  error: {
    container: 'bg-negative-50 dark:bg-negative-900/20 border-negative-200 dark:border-negative-800',
    icon: 'text-negative-600 dark:text-negative-400',
    title: 'text-negative-900 dark:text-negative-100',
  },
  warning: {
    container: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
    icon: 'text-warning-600 dark:text-warning-400',
    title: 'text-warning-900 dark:text-warning-100',
  },
  info: {
    container: 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
    icon: 'text-primary-600 dark:text-primary-400',
    title: 'text-primary-900 dark:text-primary-100',
  },
};

interface ToastItemProps {
  readonly toast: Toast.Api;
}

export const ToastItem = ({ toast }: ToastItemProps) => {
  const styles = typeStyles[toast.type as keyof typeof typeStyles] || typeStyles.info;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        w-[calc(100vw-2rem)] max-w-sm mx-auto
        animate-in slide-in-from-bottom-4 fade-in duration-200
        ${styles.container}
      `}
    >
      {/* Icon */}
      <div className={`shrink-0 ${styles.icon}`}>
        <ToastIcon type={toast.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Toast.Title className={`font-medium text-sm ${styles.title}`}>
          {toast.title}
        </Toast.Title>
        {toast.description && (
          <Toast.Description className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {toast.description}
          </Toast.Description>
        )}
      </div>

      {/* Close button */}
      <Toast.CloseTrigger className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <span className="sr-only">Fermer</span>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Toast.CloseTrigger>
    </div>
  );
};
```

## Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Conflits z-index avec modals existants | Moyenne | Faible | Utiliser `z-60` pour les toasts (modals = `z-50`) |
| Surcharge visuelle sur mobile | Faible | Moyenne | Limiter à 3 toasts visibles, position bottom pour ne pas cacher la navigation |
| Régression accessibilité | Faible | Élevée | Tests manuels screen reader, implémentation `aria-live="polite"` |
| Performance avec beaucoup de toasts | Faible | Faible | Cleanup automatique, limite de toasts simultanées |
| Breaking change dans Ark UI | Faible | Moyenne | Épingler la version dans package.json |

### Stratégie de rollback

1. Le ToastProvider est un wrapper sans side effect - suppression simple
2. Les appels `toast()` dans les composants peuvent être commentés sans casser le build
3. Revenir aux erreurs inline en 1 commit si nécessaire

## Estimation de complexité

### Taille relative : **M (Medium)**

**Justification :**
- Infrastructure simple (1-2 jours)
- Migration incrémentale possible
- Pas de changement de schéma ou d'API backend
- Pattern bien défini et répétable

### Décomposition

| Tâche | Estimation | Priorité |
|-------|------------|----------|
| Infrastructure Toast (Provider, Item, hook) | 4h | P0 |
| Intégration App.tsx | 0.5h | P0 |
| Migration 2 premiers formulaires (preuve de concept) | 2h | P0 |
| Migration autres formulaires | 4h | P1 |
| Tests unitaires | 2h | P1 |
| Tests accessibilité | 1h | P1 |

**Total estimé : 13-14h de travail**

### Dépendances avec autres chantiers

| Chantier | Relation | Note |
|----------|----------|------|
| Système de theming | Aucune | Utilise déjà les tokens Tailwind existants |
| Gestion d'erreur globale | Complémentaire | Pourrait utiliser les toasts pour les erreurs non-formulaire |
| Offline/PWA | Future | Les toasts pourront notifier la perte de connexion |
| Internationalisation | Future | Les messages toast devront être traduits |

### Ordre recommandé

Ce chantier est **autonome** et peut être réalisé indépendamment. Il est recommandé de le faire **avant** :
- L'ajout de nouvelles features CRUD
- L'implémentation du mode offline
- Tout refactoring majeur des formulaires
