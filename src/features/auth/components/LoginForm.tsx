import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type LoginFormValues, loginSchema } from '@/lib/schemas/auth.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { useAuth } from '../hooks/useAuth';
import { AUTH_ERROR_MESSAGES, type AuthError } from '../types';

export const LoginForm = () => {
  const { login } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data.email);

    if (result.success) {
      setShowSuccess(true);
    } else {
      setError('root', {
        message:
          AUTH_ERROR_MESSAGES[result.error as AuthError] || AUTH_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
    }
  };

  if (showSuccess) {
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField
        label="Adresse email"
        type="email"
        placeholder="vous@exemple.com"
        disabled={isSubmitting}
        error={errors.email}
        {...register('email')}
      />

      {errors.root && (
        <div id="login-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      <Button type="submit" fullWidth loading={isSubmitting} loadingText="Envoi en cours...">
        Recevoir le lien de connexion
      </Button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Un lien de connexion vous sera envoyé par email. Aucun mot de passe requis.
      </p>
    </form>
  );
};
