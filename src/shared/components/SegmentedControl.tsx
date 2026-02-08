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
        'data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-700',
        'data-[state=checked]:text-slate-900 dark:data-[state=checked]:text-white',
        'data-[state=checked]:shadow-sm',
      ].join(' '),
    },
  },
  defaultVariants: {
    variant: 'segmented',
  },
});

export interface SegmentedControlItem {
  readonly value: string;
  readonly label: string;
}

interface SegmentedControlProps extends VariantProps<typeof rootVariants> {
  readonly items: readonly SegmentedControlItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly 'aria-label'?: string;
  readonly className?: string;
}

export const SegmentedControl = ({
  items,
  value,
  onValueChange,
  variant,
  'aria-label': ariaLabel,
  className,
}: SegmentedControlProps) => {
  return (
    <SegmentGroup.Root
      value={value}
      onValueChange={(details) => details.value && onValueChange?.(details.value)}
      aria-label={ariaLabel}
      className={twMerge(rootVariants({ variant }), className)}
    >
      {items.map((item) => (
        <SegmentGroup.Item
          key={item.value}
          value={item.value}
          className={itemVariants({ variant })}
        >
          <SegmentGroup.ItemText>{item.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
};
