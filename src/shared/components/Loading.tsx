import { twMerge } from 'tailwind-merge';
import { Spinner } from './Spinner';

interface LoadingProps {
  /** Message affiché sous le spinner */
  readonly message?: string;
  /** Affiche en plein écran centré */
  readonly fullPage?: boolean;
  /** Taille du spinner */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Classes CSS additionnelles */
  readonly className?: string;
}

export const Loading = ({ message, fullPage = false, size = 'md', className }: LoadingProps) => {
  const content = (
    <div className={twMerge('flex flex-col items-center justify-center gap-3', className)}>
      <Spinner size={size} className="text-blue-600 dark:text-blue-400" />
      {message && (
        <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <output className="flex min-h-[50vh] items-center justify-center" aria-live="polite">
        {content}
      </output>
    );
  }

  return <output aria-live="polite">{content}</output>;
};

interface SkeletonProps {
  /** Classes CSS pour définir la taille et forme */
  readonly className?: string;
}

/** Skeleton de chargement avec animation pulse */
export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={twMerge('animate-pulse rounded bg-slate-200 dark:bg-slate-700', className)}
    aria-hidden="true"
  />
);
