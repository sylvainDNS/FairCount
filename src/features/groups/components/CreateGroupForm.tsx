import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { CURRENCIES, GROUP_ERROR_MESSAGES, type GroupError } from '../types';

type FormState = 'idle' | 'loading' | 'error';

export const CreateGroupForm = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

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

      if (result.success && result.data?.id) {
        navigate(`/groups/${result.data.id}`);
      } else {
        setFormState('error');
        setErrorMessage(
          GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
        );
      }
    },
    [name, description, currency, createGroup, navigate],
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
        <input
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
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
        <label
          htmlFor="currency"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Devise
        </label>
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
      </div>

      {formState === 'error' && errorMessage && (
        <div id="form-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={formState === 'loading' || !name.trim()}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
      >
        {formState === 'loading' ? 'Création en cours...' : 'Créer le groupe'}
      </button>
    </form>
  );
};
