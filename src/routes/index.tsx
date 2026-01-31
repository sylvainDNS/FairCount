import type { RouteObject } from 'react-router-dom';
import { AuthErrorPage, LoginPage, ProfilePage } from '@/features/auth';
import {
  CreateGroupPage,
  GroupDetailPage,
  GroupSettingsPage,
  GroupsPage,
  InvitePage,
} from '@/features/groups';
import { LandingPage } from '@/features/landing';
import { Layout } from '@/shared/components/Layout';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

const NotFoundPage = () => {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400">Page non trouvée</p>
    </div>
  );
};

export const routes = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/error',
    element: <AuthErrorPage />,
  },
  {
    path: '/invite/:token',
    element: <InvitePage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: 'groups', element: <GroupsPage /> },
          { path: 'groups/new', element: <CreateGroupPage /> },
          { path: 'groups/:id', element: <GroupDetailPage /> },
          { path: 'groups/:id/settings', element: <GroupSettingsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
] as const satisfies RouteObject[];
