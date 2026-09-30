import { twMerge } from 'tailwind-merge';

interface RepeatIconProps {
  readonly className?: string | undefined;
}

// Circular arrows marking recurrences and the expenses they generate.
// Information, not an action: it inherits the surrounding text color.
export const RepeatIcon = ({ className }: RepeatIconProps) => (
  <svg
    className={twMerge('w-4 h-4 shrink-0', className)}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);
