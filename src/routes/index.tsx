import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
// Landing page - eagerly loaded (static, no auth dependency)
import { LandingPage } from '@/features/landing';
import { Layout } from '@/shared/components/Layout';
import { Loading } from '@/shared/components/Loading';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

// Auth pages chunk
const LoginPage = lazy(() => import('@/features/auth').then((m) => ({ default: m.LoginPage })));
const AuthErrorPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.AuthErrorPage })),
);

// App pages chunk
const GroupsPage = lazy(() => import('@/features/groups').then((m) => ({ default: m.GroupsPage })));
const CreateGroupPage = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.CreateGroupPage })),
);
const GroupDetailPage = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.GroupDetailPage })),
);
const GroupSettingsPage = lazy(() =>
  import('@/features/groups').then((m) => ({ default: m.GroupSettingsPage })),
);
const InvitePage = lazy(() => import('@/features/groups').then((m) => ({ default: m.InvitePage })));
const ProfilePage = lazy(() => import('@/features/auth').then((m) => ({ default: m.ProfilePage })));

const NotFoundPage = () => {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400">Page non trouvée</p>
    </div>
  );
};

const SuspenseFallback = <Loading fullPage message="Chargement..." />;

export const routes = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={SuspenseFallback}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/error',
    element: (
      <Suspense fallback={SuspenseFallback}>
        <AuthErrorPage />
      </Suspense>
    ),
  },
  {
    path: '/invite/:token',
    element: (
      <Suspense fallback={SuspenseFallback}>
        <InvitePage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: 'groups',
            element: (
              <Suspense fallback={SuspenseFallback}>
                <GroupsPage />
              </Suspense>
            ),
          },
          {
            path: 'groups/new',
            element: (
              <Suspense fallback={SuspenseFallback}>
                <CreateGroupPage />
              </Suspense>
            ),
          },
          {
            path: 'groups/:id',
            element: (
              <Suspense fallback={SuspenseFallback}>
                <GroupDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'groups/:id/settings',
            element: (
              <Suspense fallback={SuspenseFallback}>
                <GroupSettingsPage />
              </Suspense>
            ),
          },
          {
            path: 'profile',
            element: (
              <Suspense fallback={SuspenseFallback}>
                <ProfilePage />
              </Suspense>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
] as const satisfies RouteObject[];
