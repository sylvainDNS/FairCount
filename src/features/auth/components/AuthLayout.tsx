import type { ReactNode } from 'react';
import { AppVersion } from '@/shared/components';

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">FairCount</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Partage équitable des dépenses</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          {children}
        </div>
        <p className="text-center mt-6">
          <AppVersion />
        </p>
      </div>
    </div>
  );
};
