import { Toast, type ToastOptions } from '@ark-ui/react/toast';
import { cva } from 'class-variance-authority';
import type { ReactElement } from 'react';
import { twMerge } from 'tailwind-merge';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const icons: Record<ToastType, ReactElement> = {
  success: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
    </svg>
  ),
};

const toastContainerVariants = cva(
  'flex items-start gap-3 p-4 rounded-xl border shadow-lg w-[calc(100vw-2rem)] max-w-sm mx-auto',
  {
    variants: {
      type: {
        success: 'bg-green-50 dark:bg-green-950/90 border-green-200 dark:border-green-800',
        error: 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800',
        warning: 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800',
        info: 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700',
      },
    },
    defaultVariants: { type: 'info' },
  },
);

const toastIconVariants = cva('shrink-0', {
  variants: {
    type: {
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-amber-600 dark:text-amber-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
  },
  defaultVariants: { type: 'info' },
});

function resolveType(raw: string | undefined): ToastType {
  if (raw === 'success' || raw === 'error' || raw === 'warning' || raw === 'info') return raw;
  return 'info';
}

interface ToastItemProps {
  readonly toast: ToastOptions;
}

const actionVariants = cva(
  'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-2',
  {
    variants: {
      type: {
        success: 'bg-green-600 text-white hover:bg-green-700',
        error: 'bg-red-600 text-white hover:bg-red-700',
        warning: 'bg-amber-600 text-white hover:bg-amber-700',
        info: 'bg-blue-600 text-white hover:bg-blue-700',
      },
    },
    defaultVariants: { type: 'info' },
  },
);

export const ToastItem = ({ toast }: ToastItemProps) => {
  const type = resolveType(toast.type);

  return (
    <div className={twMerge(toastContainerVariants({ type }))}>
      <div className={twMerge(toastIconVariants({ type }))}>{icons[type]}</div>

      <div className="flex-1 min-w-0">
        <Toast.Title className="font-medium text-sm text-slate-900 dark:text-white">
          {toast.title}
        </Toast.Title>
        {toast.description && (
          <Toast.Description className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {toast.description}
          </Toast.Description>
        )}
        {toast.action && (
          <Toast.ActionTrigger
            className={twMerge(actionVariants({ type }))}
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </Toast.ActionTrigger>
        )}
      </div>

      <Toast.CloseTrigger className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
        <span className="sr-only">Fermer</span>
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </Toast.CloseTrigger>
    </div>
  );
};
