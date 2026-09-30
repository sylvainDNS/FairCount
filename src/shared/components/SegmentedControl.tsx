import { SegmentGroup } from '@ark-ui/react/segment-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const rootVariants = cva('flex', {
  variants: {
    variant: {
      pill: 'flex-wrap gap-2',
      segmented: 'gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg',
    },
  },
  defaultVariants: {
    variant: 'segmented',
  },
});

const itemVariants = cva('text-sm font-medium transition-colors cursor-pointer', {
  variants: {
    variant: {
      pill: [
        'px-3 py-1.5 rounded-full',
        'text-slate-600 dark:text-slate-400',
        'hover:bg-slate-200 dark:hover:bg-slate-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'data-[state=checked]:bg-blue-100 dark:data-[state=checked]:bg-blue-900/30',
        'data-[state=checked]:text-blue-700 dark:data-[state=checked]:text-blue-300',
      ].join(' '),
      segmented: [
        'flex-1 px-3 py-1.5 rounded-md text-center',
        'text-slate-600 dark:text-slate-400',
        'hover:text-slate-900 dark:hover:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'data-disabled:opacity-50 data-disabled:cursor-not-allowed',
        'data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-700',
        'data-[state=checked]:text-slate-900 dark:data-[state=checked]:text-white',
        'data-[state=checked]:shadow-sm',
      ].join(' '),
    },
    // Narrower items so a whole row fits a 320px phone: `sm` trims the padding,
    // `xs` also steps the text down (e.g. 7 weekdays)
    size: {
      md: '',
      sm: 'px-1',
      xs: 'px-0.5 text-xs',
    },
  },
  defaultVariants: {
    variant: 'segmented',
    size: 'md',
  },
});

export interface SegmentedControlItem {
  readonly value: string;
  readonly label: string;
  // Full name read by assistive tech when `label` is abbreviated (e.g. « lun. » → « lundi »)
  readonly accessibleLabel?: string | undefined;
}

interface SegmentedControlProps
  extends VariantProps<typeof rootVariants>,
    Pick<VariantProps<typeof itemVariants>, 'size'> {
  readonly items: readonly SegmentedControlItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly 'aria-label'?: string;
  readonly className?: string;
  readonly disabled?: boolean | undefined;
}

export const SegmentedControl = ({
  items,
  value,
  onValueChange,
  variant,
  size,
  'aria-label': ariaLabel,
  className,
  disabled,
}: SegmentedControlProps) => {
  return (
    <SegmentGroup.Root
      value={value}
      onValueChange={(details) => details.value && onValueChange?.(details.value)}
      aria-label={ariaLabel}
      {...(disabled ? { disabled } : {})}
      className={twMerge(rootVariants({ variant }), className)}
    >
      {items.map((item) => (
        <SegmentGroup.Item
          key={item.value}
          value={item.value}
          className={twMerge(itemVariants({ variant, size }))}
        >
          <SegmentGroup.ItemText>
            {item.accessibleLabel ? (
              <>
                <span aria-hidden="true">{item.label}</span>
                <span className="sr-only">{item.accessibleLabel}</span>
              </>
            ) : (
              item.label
            )}
          </SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
};
