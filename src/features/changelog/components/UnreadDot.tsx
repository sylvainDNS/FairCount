import { twMerge } from 'tailwind-merge';

interface UnreadDotProps {
  readonly className?: string | undefined;
}

// Decorative: the unread state is announced through the parent link's accessible name
export const UnreadDot = ({ className }: UnreadDotProps) => (
  <span
    data-unread-dot=""
    aria-hidden="true"
    className={twMerge(
      'block size-2 shrink-0 rounded-full bg-blue-600 ring-2 ring-white dark:bg-blue-400 dark:ring-slate-900',
      className,
    )}
  />
);
