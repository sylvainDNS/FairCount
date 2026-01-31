import { useSearchParams } from 'react-router-dom';
import { LinkButton } from '@/shared/components';
import { AuthLayout } from './AuthLayout';

type ErrorCode = 'invalid_token' | 'expired' | 'default';

const ERROR_MESSAGES = {
  invalid_token: {
    title: 'Lien invalide',
    description: 'Ce lien de connexion est invalide ou a déjà été utilisé.',
  },
  expired: {
    title: 'Lien expiré',
    description: 'Ce lien de connexion a expiré. Les liens sont valides pendant 15 minutes.',
  },
  default: {
    title: 'Erreur de connexion',
    description: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
  },
} satisfies Record<ErrorCode, { title: string; description: string }>;

export const AuthErrorPage = () => {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('error') ?? 'default';
  const error = ERROR_MESSAGES[errorCode as ErrorCode] ?? ERROR_MESSAGES.default;

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="mb-4 text-red-500" aria-hidden="true">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{error.title}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error.description}</p>
        <div className="mt-6">
          <LinkButton to="/login">Demander un nouveau lien</LinkButton>
        </div>
      </div>
    </AuthLayout>
  );
};
