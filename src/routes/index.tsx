import type { RouteObject } from 'react-router-dom';
import { Layout } from '@/shared/components';

const HomePage = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenue</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Gérez vos dépenses partagées équitablement
        </p>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-2">
          Commencez par vous connecter
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Créez un compte ou connectez-vous pour accéder à vos groupes.
        </p>
      </section>
    </div>
  );
};

const GroupsPage = () => {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes groupes</h1>
        <button
          type="button"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Nouveau groupe
        </button>
      </header>

      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Aucun groupe pour le moment</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Créez votre premier groupe pour commencer
        </p>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon profil</h1>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <p className="text-slate-600 dark:text-slate-400">Connectez-vous pour voir votre profil</p>
      </section>
    </div>
  );
};

const NotFoundPage = () => {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400">Page non trouvée</p>
    </div>
  );
};

export const routes: readonly RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
] as const;
