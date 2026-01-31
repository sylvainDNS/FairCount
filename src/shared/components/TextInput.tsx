import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const inputVariants = cva(
  'px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-blue-500',
        error:
          'border-red-500 dark:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-red-500',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      fullWidth: true,
    },
  },
);

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, variant, fullWidth, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={twMerge(inputVariants({ variant, fullWidth }), className)}
        {...props}
      />
    );
  },
);

TextInput.displayName = 'TextInput';
