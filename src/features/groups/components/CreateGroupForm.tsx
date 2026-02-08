import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { Select } from '@/shared/components/Select';
import { TextInput } from '@/shared/components/TextInput';
import { useGroups } from '../hooks/useGroups';
import {
  CURRENCIES,
  GROUP_ERROR_MESSAGES,
  INCOME_FREQUENCIES,
  INCOME_FREQUENCY_LABELS,
  type IncomeFrequency,
  isIncomeFrequency,
} from '../types';

type FormState = 'idle' | 'loading' | 'error';

export const CreateGroupForm = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('annual');
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
        incomeFrequency,
      });

      if (!result.success) {
        setFormState('error');
        setErrorMessage(GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR);
        return;
      }

      navigate(`/groups/${result.data.id}`);
    },
    [name, description, currency, incomeFrequency, createGroup, navigate],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Nom du groupe *
        </label>
        <TextInput
          id="name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (formState === 'error') {
              setFormState('idle');
              setErrorMessage('');
            }
          }}
          placeholder="Ex: Colocation, Vacances 2024..."
          required
          disabled={formState === 'loading'}
          aria-describedby={formState === 'error' ? 'form-error' : undefined}
          aria-invalid={formState === 'error'}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez brièvement ce groupe..."
          disabled={formState === 'loading'}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Devise
        </span>
        <Select
          items={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          value={currency}
          onValueChange={setCurrency}
          disabled={formState === 'loading'}
          aria-label="Devise du groupe"
        />
      </div>

      <fieldset disabled={formState === 'loading'}>
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Saisie des revenus
        </span>
        <SegmentedControl
          items={INCOME_FREQUENCIES}
          value={incomeFrequency}
          onValueChange={(v) => {
            if (isIncomeFrequency(v)) setIncomeFrequency(v);
          }}
          aria-label="Fréquence de saisie des revenus"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {INCOME_FREQUENCY_LABELS[incomeFrequency].description}
        </p>
      </fieldset>

      {formState === 'error' && errorMessage && (
        <div id="form-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={!name.trim()}
        loading={formState === 'loading'}
        loadingText="Création en cours..."
      >
        Créer le groupe
      </Button>
    </form>
  );
};
