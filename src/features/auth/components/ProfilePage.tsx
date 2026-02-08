import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner, TextInput } from '@/shared/components';
import { AppVersion } from '@/shared/components/AppVersion';
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
        <Spinner size="lg" className="text-blue-500" />
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
            <TextInput
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
              fullWidth={false}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || name === user.name}
              loading={saveState === 'saving'}
              loadingText="Enregistrement..."
            >
              {saveState === 'saved' ? 'Enregistré' : 'Enregistrer'}
            </Button>
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

      <div className="md:hidden space-y-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Se déconnecter
        </button>
        <div className="text-center">
          <AppVersion />
        </div>
      </div>
    </div>
  );
};
