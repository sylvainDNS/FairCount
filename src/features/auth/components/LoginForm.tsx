import { useCallback, useState } from 'react';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/shared/components/Button';
import { TextInput } from '@/shared/components/TextInput';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERROR_MESSAGES, type AuthError } from '../types';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export const LoginForm = () => {
  const { login } = useAuth();
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
        setErrorMessage(
          AUTH_ERROR_MESSAGES[result.error as AuthError] || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR,
        );
      }
    },
    [email, login],
  );

  if (formState === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 text-green-600 dark:text-green-400"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Email envoyé</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Consultez votre boîte de réception et cliquez sur le lien pour vous connecter.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Adresse email
        </label>
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (formState === 'error') {
              setFormState('idle');
              setErrorMessage('');
            }
          }}
          placeholder="vous@exemple.com"
          required
          disabled={formState === 'loading'}
          aria-invalid={formState === 'error'}
          aria-describedby={formState === 'error' ? 'email-error' : undefined}
        />
      </div>

      {formState === 'error' && errorMessage && (
        <div id="email-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={!email}
        loading={formState === 'loading'}
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
