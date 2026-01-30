import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva('inline-flex items-center font-medium', {
  variants: {
    variant: {
      default: '',
      primary: '',
      success: '',
      warning: '',
      danger: '',
      info: '',
    },
    appearance: {
      solid: '',
      outline: 'border bg-transparent',
      soft: '',
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm',
    },
    rounded: {
      default: 'rounded-md',
      pill: 'rounded-full',
    },
  },
  compoundVariants: [
    // Default
    { variant: 'default', appearance: 'solid', className: 'bg-slate-600 text-white' },
    {
      variant: 'default',
      appearance: 'outline',
      className: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
    },
    {
      variant: 'default',
      appearance: 'soft',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    // Primary
    { variant: 'primary', appearance: 'solid', className: 'bg-primary-600 text-white' },
    {
      variant: 'primary',
      appearance: 'outline',
      className: 'border-primary-500 text-primary-700 dark:text-primary-400',
    },
    {
      variant: 'primary',
      appearance: 'soft',
      className: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    },
    // Success
    { variant: 'success', appearance: 'solid', className: 'bg-positive-600 text-white' },
    {
      variant: 'success',
      appearance: 'outline',
      className: 'border-positive-500 text-positive-700 dark:text-positive-400',
    },
    {
      variant: 'success',
      appearance: 'soft',
      className: 'bg-positive-100 text-positive-700 dark:bg-positive-900/30 dark:text-positive-400',
    },
    // Warning
    { variant: 'warning', appearance: 'solid', className: 'bg-amber-500 text-white' },
    {
      variant: 'warning',
      appearance: 'outline',
      className: 'border-amber-500 text-amber-700 dark:text-amber-400',
    },
    {
      variant: 'warning',
      appearance: 'soft',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    // Danger
    { variant: 'danger', appearance: 'solid', className: 'bg-negative-600 text-white' },
    {
      variant: 'danger',
      appearance: 'outline',
      className: 'border-negative-500 text-negative-700 dark:text-negative-400',
    },
    {
      variant: 'danger',
      appearance: 'soft',
      className: 'bg-negative-100 text-negative-700 dark:bg-negative-900/30 dark:text-negative-400',
    },
    // Info
    { variant: 'info', appearance: 'solid', className: 'bg-blue-600 text-white' },
    {
      variant: 'info',
      appearance: 'outline',
      className: 'border-blue-500 text-blue-700 dark:text-blue-400',
    },
    {
      variant: 'info',
      appearance: 'soft',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
  ],
  defaultVariants: {
    variant: 'default',
    appearance: 'soft',
    size: 'md',
    rounded: 'default',
  },
});

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({
  className,
  variant,
  appearance,
  size,
  rounded,
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={twMerge(badgeVariants({ variant, appearance, size, rounded }), className)}
      {...props}
    >
      {children}
    </span>
  );
};
