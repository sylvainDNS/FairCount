import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@/shared/components';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ??
    searchParams.get('returnTo') ??
    undefined;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo ?? '/groups', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, returnTo]);

  if (isLoading) {
    return (
      <AuthLayout>
        <output className="flex items-center justify-center py-8" aria-label="Chargement">
          <Spinner size="lg" className="text-blue-500" />
        </output>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthLayout>
      <LoginForm callbackURL={returnTo} />
    </AuthLayout>
  );
};
