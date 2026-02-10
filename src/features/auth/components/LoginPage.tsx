import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/shared/components';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/groups', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" className="text-blue-500" />
        </div>
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
};
