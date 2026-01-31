import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

const linkButtonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        secondary:
          'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white focus:ring-slate-500',
        outline:
          'border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white focus:ring-slate-500',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type LinkButtonProps = ComponentProps<typeof Link> &
  VariantProps<typeof linkButtonVariants> & {
    readonly className?: string;
  };

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant, size, className, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={twMerge(linkButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

LinkButton.displayName = 'LinkButton';
