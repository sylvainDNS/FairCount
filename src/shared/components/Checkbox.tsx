import { Checkbox as ArkCheckbox } from '@ark-ui/react/checkbox';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const checkboxControlVariants = cva(
  'flex items-center justify-center shrink-0 rounded border-2 transition-colors',
  {
    variants: {
      size: {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

// Separate colors from size to keep CVA simple
const controlColorClasses = [
  'border-slate-300 dark:border-slate-600',
  'data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
  'dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500',
  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
].join(' ');

interface CheckboxProps extends VariantProps<typeof checkboxControlVariants> {
  readonly checked?: boolean | undefined;
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly id?: string | undefined;
  readonly children?: React.ReactNode | undefined;
  readonly className?: string | undefined;
}

export const Checkbox = ({
  checked,
  onCheckedChange,
  disabled,
  id,
  children,
  size,
  className,
}: CheckboxProps) => {
  return (
    <ArkCheckbox.Root
      checked={checked}
      onCheckedChange={(details) => onCheckedChange?.(details.checked === true)}
      disabled={disabled}
      {...(id ? { id } : {})}
      className={twMerge('flex items-center gap-2 cursor-pointer', className)}
    >
      <ArkCheckbox.Control
        className={twMerge(checkboxControlVariants({ size }), controlColorClasses)}
      >
        <ArkCheckbox.Indicator>
          <svg
            viewBox="0 0 14 14"
            fill="none"
            className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'}
            aria-hidden="true"
          >
            <path
              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            />
          </svg>
        </ArkCheckbox.Indicator>
      </ArkCheckbox.Control>
      {children && (
        <ArkCheckbox.Label className="text-sm text-slate-900 dark:text-white cursor-pointer">
          {children}
        </ArkCheckbox.Label>
      )}
      <ArkCheckbox.HiddenInput />
    </ArkCheckbox.Root>
  );
};
