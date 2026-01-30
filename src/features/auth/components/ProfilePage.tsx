import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERROR_MESSAGES, type AuthError } from '../types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated, logout, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setSaveState('saving');
    setErrorMessage('');

    const result = await updateProfile({ name: name.trim() });

    if (result.success) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error');
      setErrorMessage(
        AUTH_ERROR_MESSAGES[result.error as AuthError] || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR,
      );
    }
  }, [name, updateProfile]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gérez vos informations personnelles
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Nom
          </label>
          <div className="flex gap-2">
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (saveState !== 'idle') {
                  setSaveState('idle');
                  setErrorMessage('');
                }
              }}
              placeholder="Votre nom"
              disabled={saveState === 'saving'}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving' || !name.trim() || name === user.name}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 dark:disabled:text-slate-400 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {saveState === 'saving'
                ? 'Enregistrement...'
                : saveState === 'saved'
                  ? 'Enregistre'
                  : 'Enregistrer'}
            </button>
          </div>
          {saveState === 'error' && errorMessage && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">{errorMessage}</p>
          )}
        </div>

        <div className="p-4">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </span>
          <p className="text-slate-900 dark:text-white">{user.email}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            L'adresse email ne peut pas être modifiée
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Zone de danger
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Actions irréversibles sur votre compte
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
