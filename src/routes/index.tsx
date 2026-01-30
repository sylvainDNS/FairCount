import type { RouteObject } from 'react-router-dom';
import { LoginPage, ProfilePage } from '@/features/auth';
import {
  CreateGroupPage,
  GroupDetailPage,
  GroupSettingsPage,
  GroupsPage,
  InvitePage,
} from '@/features/groups';
import { Layout } from '@/shared/components/Layout';

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
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/invite/:token',
    element: <InvitePage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'groups/new', element: <CreateGroupPage /> },
      { path: 'groups/:id', element: <GroupDetailPage /> },
      { path: 'groups/:id/settings', element: <GroupSettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
] as const;
