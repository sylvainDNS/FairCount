import { useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERROR_MESSAGES, type AuthError } from '../types';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export const LoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isValidEmail = useCallback((value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }, []);

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
    [email, isValidEmail, login],
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
        <input
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
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {formState === 'error' && errorMessage && (
        <div className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</div>
      )}

      <button
        type="submit"
        disabled={formState === 'loading' || !email}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
      >
        {formState === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Envoi en cours...
          </span>
        ) : (
          'Recevoir le lien de connexion'
        )}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Un lien de connexion vous sera envoyé par email. Aucun mot de passe requis.
      </p>
    </form>
  );
};
